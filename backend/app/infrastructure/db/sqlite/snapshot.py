from __future__ import annotations
from .connection import get_conn

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


