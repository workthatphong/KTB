from __future__ import annotations
import re
from urllib.parse import parse_qs, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

from ....infrastructure.parsers import tabular_parser
from .gsheet_cache import _read_cached_sheet_tabs, _write_cached_sheet_tabs, _clear_cached_sheet_tabs

def _extract_gsheet_id(url: str) -> str | None:
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    m = re.match(r"^([a-zA-Z0-9_-]{20,})$", url.strip())
    if m:
        return m.group(1)
    return None

def _extract_gsheet_gid(url: str) -> int | None:
    try:
        parsed = urlparse(url)
        query = parse_qs(parsed.query or "")
        if query.get("gid"):
            return int(str(query["gid"][0]).strip())

        fragment = parsed.fragment or ""
        m = re.search(r"(?:^|&)gid=(\d+)", fragment)
        if m:
            return int(m.group(1))
    except Exception:
        return None
    return None

def _fetch_url_bytes(url: str, timeout: int = 60) -> bytes:
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _download_single_gsheet_tab(
    spreadsheet_id: str,
    sheet_name: str,
    gid: int,
) -> tuple[int, str, list[dict]] | None:
    export_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid={gid}"
    try:
        csv_bytes = _fetch_url_bytes(export_url, timeout=120)
        if not csv_bytes or len(csv_bytes) < 5:
            return None
        rows = tabular_parser.parse_csv_bytes(csv_bytes)
        if not rows:
            return None
        return gid, sheet_name, rows
    except Exception:
        return None


def _discover_gsheet_gids(
    spreadsheet_id: str,
    force_refresh: bool = False,
) -> list[tuple[str, int]]:
    cached_tabs = None if force_refresh else _read_cached_sheet_tabs(spreadsheet_id)
    if cached_tabs:
        return cached_tabs

    stale_tabs = None if force_refresh else _read_cached_sheet_tabs(spreadsheet_id, allow_stale=True)
    try:
        html_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit?usp=sharing"
        html_bytes = _fetch_url_bytes(html_url, timeout=30)
        html_text = html_bytes.decode("utf-8", errors="replace")
        sheets: list[tuple[str, int]] = []

        # High-priority pattern: escaped JSON in script tags (modern Google Sheets)
        # Matches [index, 0, \"gid\", [{\"1\":[[0,0,\"name\"]]]
        for m in re.finditer(r'\[\d+,0,\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"([^"]+)\\"\]', html_text):
            sheets.append((m.group(2), int(m.group(1))))
        
        # Variation: \"gid\",[{\"1\":[[0,0,\"name\"
        for m in re.finditer(r'\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"([^"]+)\\"\]', html_text):
            sheets.append((m.group(2), int(m.group(1))))

        # Pattern: [gid, 0, \"name\"] (but only if gid != 0 or it's clearly a long ID)
        for m in re.finditer(r'\[(\d{5,}),0,\\"([^"]+)\\"\]', html_text):
            sheets.append((m.group(2), int(m.group(1))))

        # Pattern: {"title":"...","sheetId":...}
        for m in re.finditer(r'\{[^}]*"title"\s*:\s*"([^"]+)"[^}]*"sheetId"\s*:\s*(\d+)', html_text):
            sheets.append((m.group(1), int(m.group(2))))
        for m in re.finditer(r'\{[^}]*"sheetId"\s*:\s*(\d+)[^}]*"title"\s*:\s*"([^"]+)"', html_text):
            sheets.append((m.group(2), int(m.group(1))))

        # Pattern: {"name":"...","id":...}
        for m in re.finditer(r'\{[^}]*"name"\s*:\s*"([^"]+)"[^}]*"id"\s*:\s*(\d+)', html_text):
            sheets.append((m.group(1), int(m.group(2))))
        for m in re.finditer(r'\{[^}]*"id"\s*:\s*(\d+)[^}]*"name"\s*:\s*"([^"]+)"', html_text):
            sheets.append((m.group(2), int(m.group(1))))

        if sheets:
            seen = set()
            unique = []
            for name, gid in sheets:
                if name.lower() in ["en_us", "en_gb", "true", "false", "null"]: continue
                if gid not in seen:
                    seen.add(gid)
                    unique.append((name, gid))
            if unique:
                _write_cached_sheet_tabs(spreadsheet_id, unique)
                return unique
    except Exception:
        pass
    if stale_tabs:
        return stale_tabs
    return [("Sheet1", 0)]


def _download_gsheet_pages(
    spreadsheet_id: str,
    preferred_gid: int | None = None,
    force_tab_refresh: bool = False,
) -> list[tuple[str, list[dict]]]:
    all_pages: list[tuple[str, list[dict]]] = []
    if force_tab_refresh:
        _clear_cached_sheet_tabs(spreadsheet_id)
    discovered_tabs = _discover_gsheet_gids(
        spreadsheet_id,
        force_refresh=force_tab_refresh,
    )

    gid_to_name: dict[int, str] = {}
    for sheet_name, gid in discovered_tabs:
        if gid not in gid_to_name:
            gid_to_name[gid] = sheet_name

    ordered_tabs: list[tuple[str, int]] = []
    if preferred_gid is not None:
        preferred_name = gid_to_name.get(preferred_gid, f"Sheet {preferred_gid}")
        ordered_tabs.append((preferred_name, preferred_gid))
    ordered_tabs.extend((name, gid) for gid, name in gid_to_name.items())

    seen_gid: set[int] = set()
    unique_tabs: list[tuple[str, int]] = []
    for sheet_name, gid in ordered_tabs:
        if gid in seen_gid:
            continue
        seen_gid.add(gid)
        unique_tabs.append((sheet_name, gid))

    if unique_tabs:
        max_workers = min(8, max(1, len(unique_tabs)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_gid = {
                executor.submit(
                    _download_single_gsheet_tab, spreadsheet_id, sheet_name, gid
                ): gid
                for sheet_name, gid in unique_tabs
            }
            result_by_gid: dict[int, tuple[str, list[dict]]] = {}
            for future in as_completed(future_to_gid):
                result = future.result()
                if not result:
                    continue
                gid, sheet_name, rows = result
                result_by_gid[gid] = (sheet_name, rows)

        for sheet_name, gid in unique_tabs:
            resolved = result_by_gid.get(gid)
            if not resolved:
                continue
            all_pages.append(resolved)

    if all_pages: return all_pages
    fallback_exports = [
        ("Default Tab", f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv"),
        ("Sheet 0", f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid=0"),
    ]
    for sheet_name, export_url in fallback_exports:
        try:
            csv_bytes = _fetch_url_bytes(export_url, timeout=120)
            if not csv_bytes or len(csv_bytes) < 5: continue
            rows = tabular_parser.parse_csv_bytes(csv_bytes)
            if rows:
                all_pages.append((sheet_name, rows))
                break
        except Exception: continue
    return all_pages

