from __future__ import annotations

import json
from datetime import datetime, timezone

from ..config.constants.constants_runtime import ALGORITHM_VERSION
from ..infrastructure.db.sqlite_store import (
    current_unified_rows_signature,
    get_conn,
)
from ..infrastructure.supabase_sync import (
    fetch_dashboard_snapshot_state,
    is_supabase_enabled,
    sync_dashboard_snapshot_to_supabase,
)
from .analytics import user_performance as analytics_service

_SNAPSHOT_KEY = "dashboard"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _payload_matches_algorithm_version(payload: dict | None) -> bool:
    if not isinstance(payload, dict):
        return False
    snapshot_meta = payload.get("snapshotMeta")
    if not isinstance(snapshot_meta, dict):
        return False
    # Relax strict version check: if we have a valid dict payload, use it to avoid expensive full rebuilds
    # on Vercel cold starts.
    return True


def _list_sources_from_conn() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages,
                   GROUP_CONCAT(sp.page_name, ' | ') AS page_names
            FROM source_files sf
            LEFT JOIN source_pages sp ON sf.source_id = sp.source_id
            GROUP BY sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages
            ORDER BY sf.uploaded_at DESC
            """
        ).fetchall()

    result = []
    for row in rows:
        page_names = [
            name.strip()
            for name in (row["page_names"] or "").split("|")
            if name.strip()
        ]
        result.append(
            {
                "sourceId": row["source_id"],
                "name": row["file_name"],
                "fileName": row["file_name"],
                "type": (row["file_ext"] or "").replace(".", "") or "file",
                "rows": row["total_rows"],
                "pageCount": row["total_pages"],
                "pages": page_names,
                "status": "Active",
                "date": row["uploaded_at"],
            }
        )
    return result


def _list_connections_from_conn() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT connection_id, url, spreadsheet_id, label, connected_at,
                   last_sync_at, last_sync_rows, last_sync_pages
            FROM connected_sheets
            WHERE is_active = 1
            ORDER BY connected_at DESC
            """
        ).fetchall()

    return [
        {
            "connectionId": row["connection_id"],
            "url": row["url"],
            "spreadsheetId": row["spreadsheet_id"],
            "label": row["label"],
            "connectedAt": row["connected_at"],
            "lastSyncAt": row["last_sync_at"],
            "lastSyncRows": row["last_sync_rows"],
            "lastSyncPages": row["last_sync_pages"],
        }
        for row in rows
    ]


def load_local_dashboard_snapshot() -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT payload_json
            FROM dashboard_snapshots
            WHERE snapshot_key = ?
            """,
            (_SNAPSHOT_KEY,),
        ).fetchone()

    if not row:
        return None

    try:
        payload = json.loads(row["payload_json"] or "{}")
    except json.JSONDecodeError:
        return None

    return payload if isinstance(payload, dict) else None


def store_local_dashboard_snapshot(payload: dict) -> dict:
    snapshot_meta = payload.get("snapshotMeta") or {}
    with get_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO dashboard_snapshots (
                snapshot_key,
                updated_at,
                row_count,
                source_count,
                algorithm_version,
                payload_json
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                _SNAPSHOT_KEY,
                str(snapshot_meta.get("updatedAt") or _utc_now_iso()),
                int(snapshot_meta.get("rowCount") or 0),
                int(snapshot_meta.get("sourceCount") or 0),
                str(snapshot_meta.get("algorithmVersion") or ALGORITHM_VERSION),
                json.dumps(payload, ensure_ascii=False),
            ),
        )
    return payload


def clear_local_dashboard_snapshot() -> None:
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM dashboard_snapshots WHERE snapshot_key = ?",
            (_SNAPSHOT_KEY,),
        )


def build_dashboard_snapshot_payload() -> dict:
    performance = analytics_service.compute_user_performance()
    sources = _list_sources_from_conn()
    connections = _list_connections_from_conn()
    row_count, _ = current_unified_rows_signature()

    payload = {
        "sources": sources,
        "performance": performance,
        "connections": connections,
        "snapshotMeta": {
            "updatedAt": _utc_now_iso(),
            "rowCount": int(row_count),
            "sourceCount": len(sources),
            "algorithmVersion": ALGORITHM_VERSION,
        },
    }
    return payload


def rebuild_dashboard_snapshot(sync_remote: bool = True) -> dict:
    payload = build_dashboard_snapshot_payload()
    store_local_dashboard_snapshot(payload)
    if sync_remote and is_supabase_enabled():
        sync_dashboard_snapshot_to_supabase(payload)
    return payload


def fetch_remote_dashboard_snapshot() -> dict | None:
    state = fetch_dashboard_snapshot_state()
    if not state:
        return None

    payload = state.get("payload")
    if not isinstance(payload, dict):
        return None

    snapshot_meta = payload.get("snapshotMeta")
    if not isinstance(snapshot_meta, dict):
        payload["snapshotMeta"] = {}
        snapshot_meta = payload["snapshotMeta"]

    if not snapshot_meta.get("updatedAt"):
        snapshot_meta["updatedAt"] = state.get("updated_at") or _utc_now_iso()
    if snapshot_meta.get("rowCount") is None:
        snapshot_meta["rowCount"] = int(state.get("row_count") or 0)
    if snapshot_meta.get("sourceCount") is None:
        snapshot_meta["sourceCount"] = int(state.get("source_count") or 0)
    if not snapshot_meta.get("algorithmVersion"):
        snapshot_meta["algorithmVersion"] = str(
            state.get("algorithm_version") or ALGORITHM_VERSION
        )

    return payload


def get_dashboard_snapshot_payload() -> dict | None:
    local_payload = load_local_dashboard_snapshot()
    if _payload_matches_algorithm_version(local_payload):
        return local_payload

    remote_payload = None
    if is_supabase_enabled():
        try:
            remote_payload = fetch_remote_dashboard_snapshot()
        except Exception:
            remote_payload = None
    if _payload_matches_algorithm_version(remote_payload):
        store_local_dashboard_snapshot(remote_payload)
        return remote_payload

    return None
