import os
import shutil

filepath = '/workspaces/KTB/backend/app/infrastructure/db/sqlite_store.py'
base_dir = '/workspaces/KTB/backend/app/infrastructure/db/sqlite'
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

# 1. state.py
state_content = """from __future__ import annotations

class SyncState:
    SUPABASE_BOOTSTRAPPED = False
    SNAPSHOT_BOOTSTRAPPED = False
    REMOTE_META_SIGNATURE: tuple[str, int, int] | None = None
    LAST_REMOTE_META_CHECK_AT = 0.0

state = SyncState()
"""
with open(os.path.join(base_dir, 'state.py'), 'w') as f:
    f.write(state_content)

# 2. tracing.py
tracing_part = extract_block(content, "def _supabase_trace_enabled() -> bool:", "def get_conn() -> sqlite3.Connection:")
tracing_content = """from __future__ import annotations
import os

""" + tracing_part
with open(os.path.join(base_dir, 'tracing.py'), 'w') as f:
    f.write(tracing_content)

# 3. connection.py
conn_part1 = extract_block(content, "def get_conn() -> sqlite3.Connection:", "def _has_local_dashboard_snapshot() -> bool:")
conn_part2 = extract_block(content, "def init_db() -> None:", None)
conn_content = """from __future__ import annotations
import sqlite3
from ....config.constants.constants_paths import DB_PATH

""" + conn_part1 + conn_part2
with open(os.path.join(base_dir, 'connection.py'), 'w') as f:
    f.write(conn_content)

# 4. snapshot.py
snapshot_part = extract_block(content, "def _has_local_dashboard_snapshot() -> bool:", "def ensure_dashboard_snapshot_from_supabase_if_needed() -> bool:")
snapshot_content = """from __future__ import annotations
from .connection import get_conn

""" + snapshot_part
with open(os.path.join(base_dir, 'snapshot.py'), 'w') as f:
    f.write(snapshot_content)

# 5. sync.py
sync_part = extract_block(content, "def ensure_dashboard_snapshot_from_supabase_if_needed() -> bool:", "def init_db() -> None:")

# replace globals
sync_part = sync_part.replace("global _SNAPSHOT_BOOTSTRAPPED, _LAST_REMOTE_META_CHECK_AT, _REMOTE_META_SIGNATURE", "")
sync_part = sync_part.replace("global _SUPABASE_BOOTSTRAPPED, _REMOTE_META_SIGNATURE, _LAST_REMOTE_META_CHECK_AT", "")
sync_part = sync_part.replace("global _REMOTE_META_SIGNATURE, _LAST_REMOTE_META_CHECK_AT, _SUPABASE_BOOTSTRAPPED", "")
sync_part = sync_part.replace("global _LAST_REMOTE_META_CHECK_AT", "")
sync_part = sync_part.replace("global _REMOTE_META_SIGNATURE, _LAST_REMOTE_META_CHECK_AT, _SNAPSHOT_BOOTSTRAPPED", "")

sync_part = sync_part.replace("_SNAPSHOT_BOOTSTRAPPED", "state.SNAPSHOT_BOOTSTRAPPED")
sync_part = sync_part.replace("_SUPABASE_BOOTSTRAPPED", "state.SUPABASE_BOOTSTRAPPED")
sync_part = sync_part.replace("_REMOTE_META_SIGNATURE", "state.REMOTE_META_SIGNATURE")
sync_part = sync_part.replace("_LAST_REMOTE_META_CHECK_AT", "state.LAST_REMOTE_META_CHECK_AT")

sync_content = """from __future__ import annotations
import json
import time

from ....config.constants.constants_paths import DB_PATH
from ...supabase_sync import (
    fetch_dashboard_snapshot_state,
    fetch_dashboard_meta_state,
    hydrate_sqlite_from_supabase,
    is_supabase_enabled,
    sync_dashboard_snapshot_to_supabase,
    sync_source_to_supabase,
    sync_sqlite_to_supabase,
)
from .connection import get_conn
from .snapshot import _local_dashboard_snapshot_signature
from .tracing import _emit_supabase_trace, _supabase_refresh_interval_seconds
from .state import state

""" + sync_part
with open(os.path.join(base_dir, 'sync.py'), 'w') as f:
    f.write(sync_content)

# __init__.py inside sqlite
with open(os.path.join(base_dir, '__init__.py'), 'w') as f:
    f.write("")

# proxy file
proxy_content = """from __future__ import annotations

from .sqlite.connection import get_conn, current_unified_rows_signature, init_db
from .sqlite.sync import (
    ensure_dashboard_snapshot_from_supabase_if_needed,
    ensure_full_raw_state_from_supabase_if_enabled,
    ensure_fresh_from_supabase_if_enabled,
    _sync_to_supabase_if_enabled,
    _sync_dashboard_snapshot_to_supabase_if_enabled,
    _sync_source_to_supabase_if_enabled,
)
from .sqlite.snapshot import (
    _has_local_dashboard_snapshot,
    _local_dashboard_snapshot_signature,
)
from .sqlite.tracing import (
    _supabase_trace_enabled,
    _emit_supabase_trace,
    _supabase_refresh_interval_seconds,
)

__all__ = [
    "get_conn",
    "current_unified_rows_signature",
    "init_db",
    "ensure_dashboard_snapshot_from_supabase_if_needed",
    "ensure_full_raw_state_from_supabase_if_enabled",
    "ensure_fresh_from_supabase_if_enabled",
    "_sync_to_supabase_if_enabled",
    "_sync_dashboard_snapshot_to_supabase_if_enabled",
    "_sync_source_to_supabase_if_enabled",
    "_has_local_dashboard_snapshot",
    "_local_dashboard_snapshot_signature",
    "_supabase_trace_enabled",
    "_emit_supabase_trace",
    "_supabase_refresh_interval_seconds",
]
"""
with open(filepath, 'w') as f:
    f.write(proxy_content)

print("Sqlite refactor complete.")
