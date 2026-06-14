from __future__ import annotations

import json
import os
import sqlite3
import time

from ...config.constants.constants_paths import DB_PATH
from ..supabase_sync import (
    fetch_dashboard_snapshot_state,
    fetch_dashboard_meta_state,
    hydrate_sqlite_from_supabase,
    is_supabase_enabled,
    sync_dashboard_snapshot_to_supabase,
    sync_source_to_supabase,
    sync_sqlite_to_supabase,
)

_SUPABASE_BOOTSTRAPPED = False
_SNAPSHOT_BOOTSTRAPPED = False
_REMOTE_META_SIGNATURE: tuple[str, int, int] | None = None
_LAST_REMOTE_META_CHECK_AT = 0.0


def _supabase_trace_enabled() -> bool:
    return os.getenv("SUPABASE_TRACE_TIMING", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _emit_supabase_trace(message: str) -> None:
    if _supabase_trace_enabled():
        print(f"[SupabaseTrace] {message}")


def _supabase_refresh_interval_seconds() -> float:
    raw = os.getenv("SUPABASE_REFRESH_INTERVAL_SECONDS", "").strip()
    if not raw:
        return 60.0
    try:
        return max(0.0, float(raw))
    except ValueError:
        return 60.0


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def current_unified_rows_signature(
    conn: sqlite3.Connection | None = None,
) -> tuple[int, int]:
    owns_conn = conn is None
    local_conn = conn or get_conn()
    try:
        row = local_conn.execute(
            "SELECT COUNT(*) AS c, COALESCE(MAX(row_id), 0) AS max_row_id FROM unified_rows"
        ).fetchone()
        count = int(row["c"] if row else 0)
        max_row_id = int(row["max_row_id"] if row else 0)
        return count, max_row_id
    finally:
        if owns_conn:
            local_conn.close()


def _has_local_dashboard_snapshot() -> bool:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT 1
            FROM dashboard_snapshots
            WHERE snapshot_key = 'dashboard'
            LIMIT 1
            """
        ).fetchone()
    return row is not None


def _local_dashboard_snapshot_signature() -> tuple[str, int, int] | None:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT updated_at, row_count, source_count
            FROM dashboard_snapshots
            WHERE snapshot_key = 'dashboard'
            LIMIT 1
            """
        ).fetchone()
    if not row:
        return None
    return (
        str(row["updated_at"] or ""),
        int(row["row_count"] or 0),
        int(row["source_count"] or 0),
    )


def ensure_dashboard_snapshot_from_supabase_if_needed() -> bool:
    global _SNAPSHOT_BOOTSTRAPPED, _LAST_REMOTE_META_CHECK_AT, _REMOTE_META_SIGNATURE

    local_signature = _local_dashboard_snapshot_signature()
    if not is_supabase_enabled():
        _SNAPSHOT_BOOTSTRAPPED = True
        return local_signature is not None

    refresh_interval_seconds = _supabase_refresh_interval_seconds()
    now = time.monotonic()
    should_probe_remote = (
        local_signature is None
        or not _SNAPSHOT_BOOTSTRAPPED
        or refresh_interval_seconds <= 0
        or (now - _LAST_REMOTE_META_CHECK_AT) >= refresh_interval_seconds
    )

    if not should_probe_remote:
        return local_signature is not None

    started_at = time.perf_counter()
    try:
        remote_meta = fetch_dashboard_meta_state()
        _LAST_REMOTE_META_CHECK_AT = now
        if not remote_meta:
            return local_signature is not None

        remote_signature = (
            str(remote_meta.get("updated_at") or ""),
            int(remote_meta.get("row_count") or 0),
            int(remote_meta.get("source_count") or 0),
        )
        _REMOTE_META_SIGNATURE = remote_signature

        if local_signature is not None and local_signature == remote_signature:
            _SNAPSHOT_BOOTSTRAPPED = True
            _emit_supabase_trace(
                f"snapshot_refresh_no_change elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
            )
            return True

        remote_state = fetch_dashboard_snapshot_state()
        payload = remote_state.get("payload") if remote_state else None
        if not isinstance(payload, dict):
            return local_signature is not None
        snapshot_meta = payload.get("snapshotMeta")
        if not isinstance(snapshot_meta, dict):
            payload["snapshotMeta"] = {}
            snapshot_meta = payload["snapshotMeta"]
        if not snapshot_meta.get("updatedAt"):
            snapshot_meta["updatedAt"] = str(
                remote_state.get("updated_at") or ""
            )
        if snapshot_meta.get("rowCount") is None:
            snapshot_meta["rowCount"] = int(remote_state.get("row_count") or 0)
        if snapshot_meta.get("sourceCount") is None:
            snapshot_meta["sourceCount"] = int(remote_state.get("source_count") or 0)
        if not snapshot_meta.get("algorithmVersion"):
            snapshot_meta["algorithmVersion"] = str(
                remote_state.get("algorithm_version") or ""
            )

        with get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO dashboard_snapshots (
                    snapshot_key, updated_at, row_count, source_count, algorithm_version, payload_json
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    "dashboard",
                    str(snapshot_meta.get("updatedAt") or ""),
                    int(snapshot_meta.get("rowCount") or 0),
                    int(snapshot_meta.get("sourceCount") or 0),
                    str(snapshot_meta.get("algorithmVersion") or ""),
                    json.dumps(payload, ensure_ascii=False),
                ),
            )
        _REMOTE_META_SIGNATURE = (
            str(snapshot_meta.get("updatedAt") or ""),
            int(snapshot_meta.get("rowCount") or 0),
            int(snapshot_meta.get("sourceCount") or 0),
        )
        _emit_supabase_trace(
            f"snapshot_bootstrap_done elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )
        return True
    except Exception as exc:
        print(f"[Supabase] Snapshot bootstrap skipped: {exc}")
        return local_signature is not None
    finally:
        _SNAPSHOT_BOOTSTRAPPED = True


def ensure_full_raw_state_from_supabase_if_enabled(force: bool = False) -> None:
    global _SUPABASE_BOOTSTRAPPED, _REMOTE_META_SIGNATURE, _LAST_REMOTE_META_CHECK_AT

    if not is_supabase_enabled():
        _SUPABASE_BOOTSTRAPPED = True
        return
    if _SUPABASE_BOOTSTRAPPED and not force:
        return

    started_at = time.perf_counter()
    try:
        hydrate_sqlite_from_supabase(DB_PATH)
        remote_state = fetch_dashboard_meta_state() or {}
        _REMOTE_META_SIGNATURE = (
            str(remote_state.get("updated_at") or ""),
            int(remote_state.get("row_count") or 0),
            int(remote_state.get("source_count") or 0),
        )
        _LAST_REMOTE_META_CHECK_AT = time.monotonic()
        _emit_supabase_trace(
            f"bootstrap_refresh_done elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )
    except Exception as exc:
        print(f"[Supabase] Bootstrap skipped: {exc}")
    finally:
        _SUPABASE_BOOTSTRAPPED = True


def ensure_fresh_from_supabase_if_enabled() -> None:
    global _REMOTE_META_SIGNATURE, _LAST_REMOTE_META_CHECK_AT, _SUPABASE_BOOTSTRAPPED

    if not is_supabase_enabled():
        return

    ensure_full_raw_state_from_supabase_if_enabled()

    refresh_interval_seconds = _supabase_refresh_interval_seconds()
    now = time.monotonic()
    if refresh_interval_seconds > 0 and (now - _LAST_REMOTE_META_CHECK_AT) < refresh_interval_seconds:
        _emit_supabase_trace(
            f"refresh_skipped reason=interval remaining_ms={max(0.0, (refresh_interval_seconds - (now - _LAST_REMOTE_META_CHECK_AT)) * 1000):.1f}"
        )
        return

    started_at = time.perf_counter()
    try:
        remote_state = fetch_dashboard_meta_state()
        _LAST_REMOTE_META_CHECK_AT = now
    except Exception as exc:
        print(f"[Supabase] Metadata read skipped: {exc}")
        return

    if not remote_state:
        _emit_supabase_trace(
            f"refresh_meta_empty elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )
        return

    remote_signature = (
        str(remote_state.get("updated_at") or ""),
        int(remote_state.get("row_count") or 0),
        int(remote_state.get("source_count") or 0),
    )

    if _REMOTE_META_SIGNATURE == remote_signature:
        _emit_supabase_trace(
            f"refresh_no_change elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )
        return

    try:
        hydrate_sqlite_from_supabase(DB_PATH)
    except Exception as exc:
        print(f"[Supabase] Refresh hydrate skipped: {exc}")
        return

    _SUPABASE_BOOTSTRAPPED = True
    _REMOTE_META_SIGNATURE = remote_signature
    _emit_supabase_trace(
        f"refresh_hydrated elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
    )


def _sync_to_supabase_if_enabled(required: bool = False) -> bool:
    global _LAST_REMOTE_META_CHECK_AT

    if not is_supabase_enabled():
        return True
    try:
        ok = bool(sync_sqlite_to_supabase(DB_PATH))
        if ok:
            _LAST_REMOTE_META_CHECK_AT = time.monotonic()
        if required and not ok:
            raise RuntimeError("Supabase sync was not completed.")
        return ok
    except Exception as exc:
        print(f"[Supabase] Sync failed: {exc}")
        if required:
            raise RuntimeError(f"Supabase sync failed: {exc}") from exc
        return False


def _sync_dashboard_snapshot_to_supabase_if_enabled(
    snapshot_payload: dict,
    required: bool = False,
) -> bool:
    global _REMOTE_META_SIGNATURE, _LAST_REMOTE_META_CHECK_AT, _SNAPSHOT_BOOTSTRAPPED

    if not is_supabase_enabled():
        return True
    try:
        ok = bool(sync_dashboard_snapshot_to_supabase(snapshot_payload))
        if ok:
            snapshot_meta = snapshot_payload.get("snapshotMeta") or {}
            _REMOTE_META_SIGNATURE = (
                str(snapshot_meta.get("updatedAt") or ""),
                int(snapshot_meta.get("rowCount") or 0),
                int(snapshot_meta.get("sourceCount") or 0),
            )
            _LAST_REMOTE_META_CHECK_AT = time.monotonic()
            _SNAPSHOT_BOOTSTRAPPED = True
        if required and not ok:
            raise RuntimeError("Supabase dashboard snapshot sync was not completed.")
        return ok
    except Exception as exc:
        print(f"[Supabase] Dashboard snapshot sync failed: {exc}")
        if required:
            raise RuntimeError(f"Supabase dashboard snapshot sync failed: {exc}") from exc
        return False


def _sync_source_to_supabase_if_enabled(
    source_id: str,
    removed_source_id: str | None = None,
    required: bool = False,
) -> bool:
    global _REMOTE_META_SIGNATURE, _LAST_REMOTE_META_CHECK_AT

    if not is_supabase_enabled():
        return True
    try:
        ok = bool(
            sync_source_to_supabase(
                DB_PATH,
                source_id=source_id,
                removed_source_id=removed_source_id,
            )
        )
        if ok:
            remote_state = fetch_dashboard_meta_state() or {}
            _REMOTE_META_SIGNATURE = (
                str(remote_state.get("updated_at") or ""),
                int(remote_state.get("row_count") or 0),
                int(remote_state.get("source_count") or 0),
            )
            _LAST_REMOTE_META_CHECK_AT = time.monotonic()
        if required and not ok:
            raise RuntimeError("Supabase source sync was not completed.")
        return ok
    except Exception as exc:
        print(f"[Supabase] Source sync failed: {exc}")
        if required:
            raise RuntimeError(f"Supabase source sync failed: {exc}") from exc
        return False


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS source_files (
                source_id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL UNIQUE,
                file_ext TEXT,
                uploaded_at TEXT NOT NULL,
                total_rows INTEGER NOT NULL DEFAULT 0,
                total_pages INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS source_pages (
                source_id TEXT NOT NULL,
                page_name TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (source_id, page_name),
                FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS unified_rows (
                row_id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                page_name TEXT NOT NULL,
                row_number INTEGER NOT NULL,
                data_json TEXT NOT NULL,
                ingested_at TEXT NOT NULL,
                FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_unified_file_page ON unified_rows(file_name, page_name);
            CREATE INDEX IF NOT EXISTS idx_unified_source ON unified_rows(source_id);
            CREATE TABLE IF NOT EXISTS connected_sheets (
                connection_id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                spreadsheet_id TEXT NOT NULL,
                label TEXT NOT NULL,
                connected_at TEXT NOT NULL,
                last_sync_at TEXT,
                last_sync_rows INTEGER DEFAULT 0,
                last_sync_pages INTEGER DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS dashboard_snapshots (
                snapshot_key TEXT PRIMARY KEY,
                updated_at TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 0,
                source_count INTEGER NOT NULL DEFAULT 0,
                algorithm_version TEXT NOT NULL DEFAULT '',
                payload_json TEXT NOT NULL
            );
            """
        )
