from __future__ import annotations

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
