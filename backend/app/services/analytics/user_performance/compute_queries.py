from __future__ import annotations

from collections import defaultdict

from ....config.constants.constants_runtime import ALGORITHM_VERSION
from ....infrastructure.db.sqlite_store import get_conn


def _source_summary() -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS files, COALESCE(SUM(total_pages),0) AS pages, COALESCE(SUM(total_rows),0) AS rows FROM source_files"
        ).fetchone()
    return {
        "files": int(row["files"] if row else 0),
        "pages": int(row["pages"] if row else 0),
        "rows": int(row["rows"] if row else 0),
        "algorithmVersion": ALGORITHM_VERSION,
    }


def _group_events_by_document(events: list[dict]) -> dict[str, list[dict]]:
    grouped_events: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        grouped_events[event["document_id"]].append(event)
    return grouped_events
