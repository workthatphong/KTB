import os
import shutil

filepath = '/workspaces/KTB/backend/app/services/sync/data_manager.py'
base_dir = '/workspaces/KTB/backend/app/services/sync/data_manager_impl'
os.makedirs(base_dir, exist_ok=True)

with open(filepath, 'r') as f:
    content = f.read()

def extract_block(text, start_str, end_str=None):
    start = text.find(start_str)
    if start == -1: return ""
    if end_str is None: return text[start:]
    end = text.find(end_str, start)
    if end == -1: return text[start:]
    return text[start:end]

# 1. utils.py
utils_content = """from __future__ import annotations
import datetime as dt

from ...segmentation import engine as segmentation_engine
from ...analytics import user_performance as analytics_service
from ...dashboard_snapshot import clear_local_dashboard_snapshot

def utc_now_iso() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def invalidate_runtime_caches() -> None:
    segmentation_engine.clear_normalized_events_cache()
    analytics_service.clear_user_performance_cache()
    clear_local_dashboard_snapshot()
"""
with open(os.path.join(base_dir, 'utils.py'), 'w') as f:
    f.write(utils_content)


# 2. db_ops.py
db_ops_content = """from __future__ import annotations
import sqlite3

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
"""
with open(os.path.join(base_dir, 'db_ops.py'), 'w') as f:
    f.write(db_ops_content)


# 3. gsheet_cache.py
gsheet_cache_content = """from __future__ import annotations
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
"""
with open(os.path.join(base_dir, 'gsheet_cache.py'), 'w') as f:
    f.write(gsheet_cache_content)


# 4. gsheet_fetcher.py
fetcher_part1 = extract_block(content, "def _extract_gsheet_id(url: str) -> str | None:", "def _ingest_gsheet_pages(spreadsheet_id: str, all_pages: list[tuple[str, list[dict]]]) -> dict:")

fetcher_content = """from __future__ import annotations
import re
from urllib.parse import parse_qs, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

from ....infrastructure.parsers import tabular_parser
from .gsheet_cache import _read_cached_sheet_tabs, _write_cached_sheet_tabs, _clear_cached_sheet_tabs

""" + fetcher_part1
with open(os.path.join(base_dir, 'gsheet_fetcher.py'), 'w') as f:
    f.write(fetcher_content)


# 5. gsheet_manager.py
manager_part = extract_block(content, "def _ingest_gsheet_pages(spreadsheet_id: str, all_pages: list[tuple[str, list[dict]]]) -> dict:", "def ingest_file(file_name: str, payload: bytes) -> dict:")
manager_content = """from __future__ import annotations
import uuid
import json

from ....infrastructure.db.sqlite_store import (
    _sync_dashboard_snapshot_to_supabase_if_enabled,
    _sync_to_supabase_if_enabled,
    ensure_full_raw_state_from_supabase_if_enabled,
    get_conn,
)
from ...segmentation import engine as segmentation_engine
from ...dashboard_snapshot import rebuild_dashboard_snapshot
from .utils import utc_now_iso, invalidate_runtime_caches
from .db_ops import clear_source_by_file_name
from .gsheet_fetcher import _extract_gsheet_id, _extract_gsheet_gid, _download_gsheet_pages

""" + manager_part
with open(os.path.join(base_dir, 'gsheet_manager.py'), 'w') as f:
    f.write(manager_content)


# 6. file_manager.py
file_part = extract_block(content, "def ingest_file(file_name: str, payload: bytes) -> dict:", None)
file_content = """from __future__ import annotations
import uuid
import json
from pathlib import Path

from ....infrastructure.db.sqlite_store import (
    _sync_dashboard_snapshot_to_supabase_if_enabled,
    _sync_source_to_supabase_if_enabled,
    ensure_full_raw_state_from_supabase_if_enabled,
    get_conn,
)
from ...segmentation import engine as segmentation_engine
from ...dashboard_snapshot import rebuild_dashboard_snapshot
from ....infrastructure.parsers import tabular_parser
from .utils import utc_now_iso, invalidate_runtime_caches
from .db_ops import clear_source_by_file_name

""" + file_part
with open(os.path.join(base_dir, 'file_manager.py'), 'w') as f:
    f.write(file_content)


# __init__.py inside data_manager_impl
with open(os.path.join(base_dir, '__init__.py'), 'w') as f:
    f.write("")

# proxy file
proxy_content = """from __future__ import annotations

from .data_manager_impl.utils import invalidate_runtime_caches
from .data_manager_impl.gsheet_manager import (
    connect_gsheet,
    sync_all_gsheets,
    disconnect_gsheet,
    list_gsheet_connections,
)
from .data_manager_impl.file_manager import (
    ingest_file,
    list_sources,
    delete_source,
)

__all__ = [
    "connect_gsheet",
    "sync_all_gsheets",
    "disconnect_gsheet",
    "list_gsheet_connections",
    "ingest_file",
    "list_sources",
    "delete_source",
    "invalidate_runtime_caches",
]
"""
with open(filepath, 'w') as f:
    f.write(proxy_content)

print("Data manager refactor complete.")
