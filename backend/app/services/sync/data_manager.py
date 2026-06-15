from __future__ import annotations

import base64
import json
import sqlite3
import uuid
import re
import time
import threading
from pathlib import Path
import datetime as dt
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import parse_qs, urlparse

from ...infrastructure.db.sqlite_store import (
    _sync_dashboard_snapshot_to_supabase_if_enabled,
    _sync_source_to_supabase_if_enabled,
    _sync_to_supabase_if_enabled,
    ensure_full_raw_state_from_supabase_if_enabled,
    get_conn,
)
from ..segmentation import engine as segmentation_engine
from ..analytics import user_performance as analytics_service
from ..dashboard_snapshot import clear_local_dashboard_snapshot, rebuild_dashboard_snapshot
from ...infrastructure.parsers import tabular_parser

_GSHEET_TAB_CACHE_TTL_SECONDS = 15 * 60
_GSHEET_TAB_CACHE: dict[str, tuple[float, list[tuple[str, int]]]] = {}
_GSHEET_TAB_CACHE_LOCK = threading.Lock()


def _read_cached_sheet_tabs(
    spreadsheet_id: str,
    allow_stale: bool = False,
) -> list[tuple[str, int]] | None:
    now = time.time()
    with _GSHEET_TAB_CACHE_LOCK:
        cached = _GSHEET_TAB_CACHE.get(spreadsheet_id)
    if not cached:
        return None

    expires_at, tabs = cached
    if allow_stale or expires_at > now:
        return list(tabs)
    return None


def _write_cached_sheet_tabs(
    spreadsheet_id: str,
    tabs: list[tuple[str, int]],
) -> None:
    with _GSHEET_TAB_CACHE_LOCK:
        _GSHEET_TAB_CACHE[spreadsheet_id] = (
            time.time() + _GSHEET_TAB_CACHE_TTL_SECONDS,
            list(tabs),
        )


def _clear_cached_sheet_tabs(spreadsheet_id: str) -> None:
    with _GSHEET_TAB_CACHE_LOCK:
        _GSHEET_TAB_CACHE.pop(spreadsheet_id, None)


def utc_now_iso() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def invalidate_runtime_caches() -> None:
    segmentation_engine.clear_normalized_events_cache()
    analytics_service.clear_user_performance_cache()
    clear_local_dashboard_snapshot()

def clear_source_by_file_name(conn: sqlite3.Connection, file_name: str) -> str | None:
    row = conn.execute(
        "SELECT source_id FROM source_files WHERE file_name = ?",
        (file_name,),
    ).fetchone()
    if not row:
        return None
    source_id = row["source_id"]
    conn.execute("DELETE FROM unified_rows WHERE source_id = ?", (source_id,))
    conn.execute("DELETE FROM source_pages WHERE source_id = ?", (source_id,))
    conn.execute("DELETE FROM source_files WHERE source_id = ?", (source_id,))
    return str(source_id)

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

def _ingest_gsheet_pages(spreadsheet_id: str, all_pages: list[tuple[str, list[dict]]]) -> dict:
    file_name = f"gsheet_{spreadsheet_id[:12]}.csv"
    now = utc_now_iso()
    source_id = uuid.uuid4().hex
    total_rows = 0
    with get_conn() as conn:
        clear_source_by_file_name(conn, file_name)
        conn.execute(
            "INSERT INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages) VALUES (?, ?, ?, ?, 0, 0)",
            (source_id, file_name, ".gsheet", now),
        )
        for page_name, rows in all_pages:
            conn.execute("INSERT INTO source_pages (source_id, page_name, row_count) VALUES (?, ?, ?)", (source_id, page_name, len(rows)))
            for idx, row in enumerate(rows, start=1):
                row_number = segmentation_engine.parse_int(row.get("__sheet_row_number")) or idx
                data_json = json.dumps(row, ensure_ascii=False)
                conn.execute(
                    "INSERT INTO unified_rows (source_id, file_name, page_name, row_number, data_json, ingested_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (source_id, file_name, page_name, row_number, data_json, now),
                )
            total_rows += len(rows)
        conn.execute("UPDATE source_files SET total_rows = ?, total_pages = ? WHERE source_id = ?", (total_rows, len(all_pages), source_id))
    invalidate_runtime_caches()
    return {"total_rows": total_rows, "total_pages": len(all_pages)}

def connect_gsheet(url: str) -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    spreadsheet_id = _extract_gsheet_id(url)
    if not spreadsheet_id:
        raise ValueError("Invalid Google Sheet URL.")
    with get_conn() as conn:
        existing = conn.execute("SELECT connection_id FROM connected_sheets WHERE spreadsheet_id = ? AND is_active = 1", (spreadsheet_id,)).fetchone()
        if existing: raise ValueError("This Google Sheet is already connected.")
    preferred_gid = _extract_gsheet_gid(url)
    all_pages = _download_gsheet_pages(spreadsheet_id, preferred_gid=preferred_gid)
    if not all_pages: raise ValueError("Could not download any data.")
    result = _ingest_gsheet_pages(spreadsheet_id, all_pages)
    connection_id = uuid.uuid4().hex
    now = utc_now_iso()
    label = f"Google Sheet ({spreadsheet_id[:8]}...)"
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO connected_sheets (connection_id, url, spreadsheet_id, label, connected_at, last_sync_at, last_sync_rows, last_sync_pages, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
            (connection_id, url, spreadsheet_id, label, now, now, result["total_rows"], result["total_pages"]),
        )
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_to_supabase_if_enabled(required=True)
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
    return {"connection_id": connection_id, "spreadsheet_id": spreadsheet_id, "label": label, "total_rows": result["total_rows"], "total_pages": result["total_pages"], "connected_at": now}

def sync_all_gsheets() -> list[dict]:
    ensure_full_raw_state_from_supabase_if_enabled()
    with get_conn() as conn:
        rows = conn.execute("SELECT connection_id, url, spreadsheet_id, label FROM connected_sheets WHERE is_active = 1").fetchall()
    if not rows: return []
    results = []
    for row in rows:
        spreadsheet_id = row["spreadsheet_id"]
        connection_id = row["connection_id"]
        try:
            preferred_gid = _extract_gsheet_gid(str(row["url"] or ""))
            all_pages = _download_gsheet_pages(
                spreadsheet_id,
                preferred_gid=preferred_gid,
                force_tab_refresh=True,
            )
            if not all_pages:
                results.append({"connection_id": connection_id, "status": "no_data"})
                continue
            result = _ingest_gsheet_pages(spreadsheet_id, all_pages)
            now = utc_now_iso()
            with get_conn() as conn:
                conn.execute("UPDATE connected_sheets SET last_sync_at = ?, last_sync_rows = ?, last_sync_pages = ? WHERE connection_id = ?", (now, result["total_rows"], result["total_pages"], connection_id))
            results.append({"connection_id": connection_id, "status": "ok", "total_rows": result["total_rows"], "synced_at": now})
        except Exception as exc:
            results.append({"connection_id": connection_id, "status": "error", "error": str(exc)})
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_to_supabase_if_enabled(required=True)
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
    return results

def disconnect_gsheet(connection_id: str) -> None:
    ensure_full_raw_state_from_supabase_if_enabled()
    with get_conn() as conn:
        row = conn.execute("SELECT spreadsheet_id FROM connected_sheets WHERE connection_id = ?", (connection_id,)).fetchone()
        if row:
            file_name = f"gsheet_{row['spreadsheet_id'][:12]}.csv"
            clear_source_by_file_name(conn, file_name)
        conn.execute("DELETE FROM connected_sheets WHERE connection_id = ?", (connection_id,))
    invalidate_runtime_caches()
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_to_supabase_if_enabled(required=True)
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)

def list_gsheet_connections() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT connection_id, url, spreadsheet_id, label, connected_at, last_sync_at, last_sync_rows, last_sync_pages FROM connected_sheets WHERE is_active = 1 ORDER BY connected_at DESC").fetchall()
    return [{"connectionId": r["connection_id"], "url": r["url"], "spreadsheetId": r["spreadsheet_id"], "label": r["label"], "connectedAt": r["connected_at"], "lastSyncAt": r["last_sync_at"], "lastSyncRows": r["last_sync_rows"], "lastSyncPages": r["last_sync_pages"]} for r in rows]

def ingest_file(file_name: str, payload: bytes) -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    pages = tabular_parser.parse_uploaded_file(file_name, payload)
    now = utc_now_iso()
    source_id = uuid.uuid4().hex
    file_ext = Path(file_name).suffix.lower()
    total_rows = 0
    removed_source_id: str | None = None
    with get_conn() as conn:
        removed_source_id = clear_source_by_file_name(conn, file_name)
        conn.execute("INSERT INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages) VALUES (?, ?, ?, ?, 0, 0)", (source_id, file_name, file_ext, now))
        for page_name, rows in pages:
            conn.execute("INSERT INTO source_pages (source_id, page_name, row_count) VALUES (?, ?, ?)", (source_id, page_name, len(rows)))
            for idx, row in enumerate(rows, start=1):
                row_number = segmentation_engine.parse_int(row.get("__sheet_row_number")) or idx
                data_json = json.dumps(row, ensure_ascii=False)
                conn.execute("INSERT INTO unified_rows (source_id, file_name, page_name, row_number, data_json, ingested_at) VALUES (?, ?, ?, ?, ?, ?)", (source_id, file_name, page_name, row_number, data_json, now))
            total_rows += len(rows)
        conn.execute("UPDATE source_files SET total_rows = ?, total_pages = ? WHERE source_id = ?", (total_rows, len(pages), source_id))
    invalidate_runtime_caches()
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_source_to_supabase_if_enabled(
        source_id=source_id,
        removed_source_id=removed_source_id,
        required=True,
    )
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
    return {"source_id": source_id, "file_name": file_name, "total_rows": total_rows, "total_pages": len(pages), "pages": [name for name, _ in pages], "uploaded_at": now}

def list_sources() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages,
                   GROUP_CONCAT(sp.page_name, ' | ') AS page_names
            FROM source_files sf
            LEFT JOIN source_pages sp ON sf.source_id = sp.source_id
            GROUP BY sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages
            ORDER BY sf.uploaded_at DESC
        """).fetchall()
    result = []
    for row in rows:
        page_names = [name.strip() for name in (row["page_names"] or "").split("|") if name.strip()]
        result.append({"sourceId": row["source_id"], "name": row["file_name"], "fileName": row["file_name"], "type": (row["file_ext"] or "").replace(".", "") or "file", "rows": row["total_rows"], "pageCount": row["total_pages"], "pages": page_names, "status": "Active", "date": row["uploaded_at"]})
    return result

def delete_source(source_id: str) -> None:
    ensure_full_raw_state_from_supabase_if_enabled()
    with get_conn() as conn:
        conn.execute("DELETE FROM unified_rows WHERE source_id = ?", (source_id,))
        conn.execute("DELETE FROM source_pages WHERE source_id = ?", (source_id,))
        conn.execute("DELETE FROM source_files WHERE source_id = ?", (source_id,))
    invalidate_runtime_caches()
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_to_supabase_if_enabled(required=True)
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
