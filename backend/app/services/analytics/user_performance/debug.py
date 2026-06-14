from __future__ import annotations

import json
import os
from collections import Counter

from ....config.constants.constants_parsing import FIELD_ALIASES
from ....config.constants.constants_paths import DB_PATH
from ....config.constants.constants_runtime import APP_VERSION, SERVER_STARTED_AT
from ....infrastructure.db.sqlite_store import get_conn
from ...segmentation.engine import (
    build_canonical_map,
    fetch_normalized_events,
    looks_like_workflow_status,
    normalize_text,
    parse_datetime,
    pick_field,
)


def _counter_to_rows(counter: Counter, limit: int = 10) -> list[dict]:
    return [
        {"value": str(key), "count": int(count)}
        for key, count in counter.most_common(limit)
    ]


def build_debug_snapshot() -> dict:
    with get_conn() as conn:
        source_row = conn.execute(
            "SELECT COUNT(*) AS files, COALESCE(SUM(total_pages),0) AS pages, COALESCE(SUM(total_rows),0) AS rows FROM source_files"
        ).fetchone()
        unified_count_row = conn.execute("SELECT COUNT(*) AS c FROM unified_rows").fetchone()
        raw_rows = conn.execute(
            """
            SELECT file_name, page_name, row_number, data_json
            FROM unified_rows
            ORDER BY row_id ASC
            """
        ).fetchall()

    parse_stats = {
        "rawRows": int(unified_count_row["c"] if unified_count_row else 0),
        "jsonDecodeErrors": 0,
        "rowsWithEventTime": 0,
        "rowsWithWorkflowStatusTo": 0,
        "rowsWithWorkflowStatusFrom": 0,
        "rowsWithSpreadStatusChangeType": 0,
    }
    action_counter: Counter = Counter()
    to_status_counter: Counter = Counter()
    from_status_counter: Counter = Counter()
    sample_keys: list[dict] = []

    for idx, row in enumerate(raw_rows):
        try:
            raw = json.loads(row["data_json"])
        except json.JSONDecodeError:
            parse_stats["jsonDecodeErrors"] += 1
            continue

        canonical = build_canonical_map(raw)

        if idx < 3:
            sample_keys.append(
                {
                    "fileName": row["file_name"],
                    "pageName": row["page_name"],
                    "rowNumber": row["row_number"],
                    "keys": list(raw.keys())[:30],
                }
            )

        event_time_raw = pick_field(raw, FIELD_ALIASES["event_time"], canonical)
        if parse_datetime(event_time_raw):
            parse_stats["rowsWithEventTime"] += 1

        action_type = str(
            pick_field(raw, FIELD_ALIASES["action_type"], canonical) or ""
        ).strip()
        if action_type:
            action_counter[action_type] += 1
        if "status" in normalize_text(action_type):
            parse_stats["rowsWithSpreadStatusChangeType"] += 1

        from_status = str(
            pick_field(raw, FIELD_ALIASES["from_status"], canonical) or ""
        ).strip()
        to_status = str(
            pick_field(raw, FIELD_ALIASES["to_status"], canonical) or ""
        ).strip()

        if from_status:
            from_status_counter[from_status] += 1
            if looks_like_workflow_status(from_status):
                parse_stats["rowsWithWorkflowStatusFrom"] += 1
        if to_status:
            to_status_counter[to_status] += 1
            if looks_like_workflow_status(to_status):
                parse_stats["rowsWithWorkflowStatusTo"] += 1

    events, _ = fetch_normalized_events()
    events_with_to_status = sum(1 for event in events if event.get("to_status"))
    files = int(source_row["files"] if source_row else 0)
    pages = int(source_row["pages"] if source_row else 0)
    rows = int(source_row["rows"] if source_row else 0)

    return {
        "version": APP_VERSION,
        "serverStartedAt": SERVER_STARTED_AT,
        "processId": os.getpid(),
        "dbPath": str(DB_PATH),
        "dbSummary": {
            "files": files,
            "pages": pages,
            "rows": rows,
            "unifiedRows": parse_stats["rawRows"],
        },
        "parseStats": {
            **parse_stats,
            "normalizedEvents": len(events),
            "normalizedEventsWithToStatus": int(events_with_to_status),
        },
        "topActionTypes": _counter_to_rows(action_counter, 12),
        "topFromStatus": _counter_to_rows(from_status_counter, 12),
        "topToStatus": _counter_to_rows(to_status_counter, 12),
        "sampleRowKeys": sample_keys,
    }
