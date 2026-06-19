from __future__ import annotations
import time
import threading

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
