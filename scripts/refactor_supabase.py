import os

filepath = '/workspaces/KTB/backend/app/infrastructure/supabase_sync.py'
with open(filepath, 'r') as f:
    content = f.read()

def extract_block(text, start_str, end_str=None):
    start = text.find(start_str)
    if start == -1:
        return ""
    if end_str is None:
        return text[start:]
    end = text.find(end_str, start)
    if end == -1:
        return text[start:]
    return text[start:end]

base_dir = '/workspaces/KTB/backend/app/infrastructure/supabase'
os.makedirs(base_dir, exist_ok=True)

with open(os.path.join(base_dir, '__init__.py'), 'w') as f:
    f.write("")

# 1. Constants
constants_content = """from __future__ import annotations

_TABLES = {
    "source_files": "source_files",
    "source_pages": "source_pages",
    "unified_rows": "unified_rows",
    "connected_sheets": "connected_sheets",
}

_TABLE_DELETE_FILTERS = {
    "source_files": ("source_id", "not.is.null"),
    "source_pages": ("source_id", "not.is.null"),
    "unified_rows": ("row_id", "not.is.null"),
    "connected_sheets": ("connection_id", "not.is.null"),
}
"""
with open(os.path.join(base_dir, 'constants.py'), 'w') as f:
    f.write(constants_content)


# 2. Client
client_part1 = extract_block(content, "_client_config: dict[str, Any] | None = None", "def _fetch_table_rows(")

client_content = """from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

""" + client_part1

with open(os.path.join(base_dir, 'client.py'), 'w') as f:
    f.write(client_content)


# 3. Utils (chunk, fetch_table_rows)
utils_part1 = extract_block(content, "def _fetch_table_rows(", "def _fetch_all_rows(")

utils_content = """from __future__ import annotations

import sqlite3
from typing import Any

""" + utils_part1

with open(os.path.join(base_dir, 'utils.py'), 'w') as f:
    f.write(utils_content)


# 4. Hydrate
hydrate_part1 = extract_block(content, "def _fetch_all_rows(", "def fetch_dashboard_meta_state(")
hydrate_part2 = extract_block(content, "def _create_empty_schema(", None)

hydrate_content = """from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Any

from .client import (
    _emit_supabase_trace,
    _get_client,
    _set_last_error,
    _clear_last_error,
    _supabase_request,
)
from .constants import _TABLES

""" + hydrate_part1 + hydrate_part2

with open(os.path.join(base_dir, 'hydrate.py'), 'w') as f:
    f.write(hydrate_content)


# 5. Dashboard
dashboard_part1 = extract_block(content, "def fetch_dashboard_meta_state(", "def sync_sqlite_to_supabase(")

dashboard_content = """from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any

from ...config.constants.constants_runtime import ALGORITHM_VERSION
from .client import (
    _emit_supabase_trace,
    _get_client,
    _is_missing_column_error,
    _mark_sync_failure,
    _set_last_error,
    _clear_last_error,
    _supabase_request,
)

""" + dashboard_part1

with open(os.path.join(base_dir, 'dashboard.py'), 'w') as f:
    f.write(dashboard_content)


# 6. Sync
sync_part1 = extract_block(content, "def sync_sqlite_to_supabase(", "def _create_empty_schema(")

sync_content = """from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .client import (
    _get_client,
    _mark_sync_failure,
    _set_last_error,
    _clear_last_error,
    _supabase_request,
)
from .constants import _TABLES, _TABLE_DELETE_FILTERS
from .utils import _chunk, _fetch_table_rows

""" + sync_part1

with open(os.path.join(base_dir, 'sync.py'), 'w') as f:
    f.write(sync_content)


# 7. Rewrite original file
proxy_content = """from __future__ import annotations

from .supabase.client import is_supabase_enabled, get_supabase_status
from .supabase.dashboard import (
    fetch_dashboard_meta_state,
    fetch_dashboard_snapshot_state,
    sync_dashboard_snapshot_to_supabase,
)
from .supabase.sync import sync_sqlite_to_supabase, sync_source_to_supabase
from .supabase.hydrate import hydrate_sqlite_from_supabase

__all__ = [
    "is_supabase_enabled",
    "get_supabase_status",
    "fetch_dashboard_meta_state",
    "fetch_dashboard_snapshot_state",
    "sync_dashboard_snapshot_to_supabase",
    "sync_sqlite_to_supabase",
    "sync_source_to_supabase",
    "hydrate_sqlite_from_supabase",
]
"""

with open(filepath, 'w') as f:
    f.write(proxy_content)

print("Backend supabase refactor complete.")
