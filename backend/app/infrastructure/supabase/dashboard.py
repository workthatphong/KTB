from __future__ import annotations

import base64
import gzip
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

def fetch_dashboard_meta_state() -> dict[str, Any] | None:
    client = _get_client()
    if client is None:
        return None

    started_at = time.perf_counter()
    try:
        rows = _supabase_request(
            "GET",
            "dashboard_meta_state",
            query={
                "select": "updated_at,row_count,source_count",
                "id": "eq.state",
                "limit": "1",
            },
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise
    finally:
        _emit_supabase_trace(
            f"fetch_dashboard_meta_state elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )

    if not rows:
        return None

    payload = rows[0] if isinstance(rows, list) else {}
    return {
        "updated_at": str(payload.get("updated_at") or ""),
        "row_count": int(payload.get("row_count") or 0),
        "source_count": int(payload.get("source_count") or 0),
    }


def fetch_dashboard_snapshot_state() -> dict[str, Any] | None:
    client = _get_client()
    if client is None:
        return None

    started_at = time.perf_counter()
    try:
        try:
            rows = _supabase_request(
                "GET",
                "dashboard_meta_state",
                query={
                    "select": "updated_at,row_count,source_count,algorithm_version,payload_json",
                    "id": "eq.state",
                    "limit": "1",
                },
            )
        except Exception as exc:
            if not _is_missing_column_error(exc, "algorithm_version"):
                raise
            rows = _supabase_request(
                "GET",
                "dashboard_meta_state",
                query={
                    "select": "updated_at,row_count,source_count,payload_json",
                    "id": "eq.state",
                    "limit": "1",
                },
            )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise
    finally:
        _emit_supabase_trace(
            f"fetch_dashboard_snapshot_state elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )

    if not rows:
        return None

    payload = rows[0] if isinstance(rows, list) else {}
    raw_snapshot = payload.get("payload_json")
    snapshot_payload: dict[str, Any] | None = None

    if isinstance(raw_snapshot, dict):
        snapshot_payload = raw_snapshot
    elif isinstance(raw_snapshot, str) and raw_snapshot.strip():
        try:
            # Check if it's base64-gzipped (starts with standard gzip magic bytes in base64)
            if raw_snapshot.startswith("H4sI"):
                try:
                    raw_snapshot = gzip.decompress(base64.b64decode(raw_snapshot)).decode("utf-8")
                except Exception as exc:
                    print(f"Warning: Failed to decompress payload: {exc}")
            
            decoded = json.loads(raw_snapshot)
            if isinstance(decoded, dict):
                snapshot_payload = decoded
        except json.JSONDecodeError:
            snapshot_payload = None

    return {
        "updated_at": str(payload.get("updated_at") or ""),
        "row_count": int(payload.get("row_count") or 0),
        "source_count": int(payload.get("source_count") or 0),
        "algorithm_version": str(payload.get("algorithm_version") or ""),
        "payload": snapshot_payload,
    }


def sync_dashboard_snapshot_to_supabase(snapshot_payload: dict[str, Any]) -> bool:
    client = _get_client()
    if client is None:
        error_message = _last_error or "Supabase client is not ready"
        _mark_sync_failure(error_message)
        return False

    snapshot_meta = snapshot_payload.get("snapshotMeta") or {}
    try:
        _supabase_request(
            "POST",
            "dashboard_meta_state",
            payload=[
                {
                    "id": "state",
                    "updated_at": str(
                        snapshot_meta.get("updatedAt")
                        or datetime.now(timezone.utc).isoformat()
                    ),
                    "row_count": int(snapshot_meta.get("rowCount") or 0),
                    "source_count": int(snapshot_meta.get("sourceCount") or 0),
                    "algorithm_version": str(
                        snapshot_meta.get("algorithmVersion") or ALGORITHM_VERSION
                    ),
                    "payload_json": base64.b64encode(
                        gzip.compress(json.dumps(snapshot_payload, ensure_ascii=False).encode("utf-8"))
                    ).decode("ascii"),
                }
            ],
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    _clear_last_error()
    return True


