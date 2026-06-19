from __future__ import annotations
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

def ensure_dashboard_snapshot_from_supabase_if_needed() -> bool:
    

    local_signature = _local_dashboard_snapshot_signature()
    if not is_supabase_enabled():
        state.SNAPSHOT_BOOTSTRAPPED = True
        return local_signature is not None

    refresh_interval_seconds = _supabase_refresh_interval_seconds()
    now = time.monotonic()
    should_probe_remote = (
        local_signature is None
        or not state.SNAPSHOT_BOOTSTRAPPED
        or refresh_interval_seconds <= 0
        or (now - state.LAST_REMOTE_META_CHECK_AT) >= refresh_interval_seconds
    )

    if not should_probe_remote:
        return local_signature is not None

    started_at = time.perf_counter()
    try:
        remote_meta = fetch_dashboard_meta_state()
        state.LAST_REMOTE_META_CHECK_AT = now
        if not remote_meta:
            return local_signature is not None

        remote_signature = (
            str(remote_meta.get("updated_at") or ""),
            int(remote_meta.get("row_count") or 0),
            int(remote_meta.get("source_count") or 0),
        )
        state.REMOTE_META_SIGNATURE = remote_signature

        if local_signature is not None and local_signature == remote_signature:
            state.SNAPSHOT_BOOTSTRAPPED = True
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
        state.REMOTE_META_SIGNATURE = (
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
        state.SNAPSHOT_BOOTSTRAPPED = True


def ensure_full_raw_state_from_supabase_if_enabled(force: bool = False) -> None:
    

    if not is_supabase_enabled():
        state.SUPABASE_BOOTSTRAPPED = True
        return
    if state.SUPABASE_BOOTSTRAPPED and not force:
        return

    started_at = time.perf_counter()
    try:
        hydrate_sqlite_from_supabase(DB_PATH)
        remote_state = fetch_dashboard_meta_state() or {}
        state.REMOTE_META_SIGNATURE = (
            str(remote_state.get("updated_at") or ""),
            int(remote_state.get("row_count") or 0),
            int(remote_state.get("source_count") or 0),
        )
        state.LAST_REMOTE_META_CHECK_AT = time.monotonic()
        _emit_supabase_trace(
            f"bootstrap_refresh_done elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )
    except Exception as exc:
        print(f"[Supabase] Bootstrap skipped: {exc}")
    finally:
        state.SUPABASE_BOOTSTRAPPED = True


def ensure_fresh_from_supabase_if_enabled() -> None:
    

    if not is_supabase_enabled():
        return

    ensure_full_raw_state_from_supabase_if_enabled()

    refresh_interval_seconds = _supabase_refresh_interval_seconds()
    now = time.monotonic()
    if refresh_interval_seconds > 0 and (now - state.LAST_REMOTE_META_CHECK_AT) < refresh_interval_seconds:
        _emit_supabase_trace(
            f"refresh_skipped reason=interval remaining_ms={max(0.0, (refresh_interval_seconds - (now - state.LAST_REMOTE_META_CHECK_AT)) * 1000):.1f}"
        )
        return

    started_at = time.perf_counter()
    try:
        remote_state = fetch_dashboard_meta_state()
        state.LAST_REMOTE_META_CHECK_AT = now
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

    if state.REMOTE_META_SIGNATURE == remote_signature:
        _emit_supabase_trace(
            f"refresh_no_change elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )
        return

    try:
        hydrate_sqlite_from_supabase(DB_PATH)
    except Exception as exc:
        print(f"[Supabase] Refresh hydrate skipped: {exc}")
        return

    state.SUPABASE_BOOTSTRAPPED = True
    state.REMOTE_META_SIGNATURE = remote_signature
    _emit_supabase_trace(
        f"refresh_hydrated elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
    )


def _sync_to_supabase_if_enabled(required: bool = False) -> bool:
    

    if not is_supabase_enabled():
        return True
    try:
        ok = bool(sync_sqlite_to_supabase(DB_PATH))
        if ok:
            state.LAST_REMOTE_META_CHECK_AT = time.monotonic()
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
    

    if not is_supabase_enabled():
        return True
    try:
        ok = bool(sync_dashboard_snapshot_to_supabase(snapshot_payload))
        if ok:
            snapshot_meta = snapshot_payload.get("snapshotMeta") or {}
            state.REMOTE_META_SIGNATURE = (
                str(snapshot_meta.get("updatedAt") or ""),
                int(snapshot_meta.get("rowCount") or 0),
                int(snapshot_meta.get("sourceCount") or 0),
            )
            state.LAST_REMOTE_META_CHECK_AT = time.monotonic()
            state.SNAPSHOT_BOOTSTRAPPED = True
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
            state.REMOTE_META_SIGNATURE = (
                str(remote_state.get("updated_at") or ""),
                int(remote_state.get("row_count") or 0),
                int(remote_state.get("source_count") or 0),
            )
            state.LAST_REMOTE_META_CHECK_AT = time.monotonic()
        if required and not ok:
            raise RuntimeError("Supabase source sync was not completed.")
        return ok
    except Exception as exc:
        print(f"[Supabase] Source sync failed: {exc}")
        if required:
            raise RuntimeError(f"Supabase source sync failed: {exc}") from exc
        return False


