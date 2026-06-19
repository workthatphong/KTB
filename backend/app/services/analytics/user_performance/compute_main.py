from __future__ import annotations

from ....config.constants.constants_runtime import ALGORITHM_VERSION
from ....infrastructure.db.sqlite_store import current_unified_rows_signature
from ...segmentation.engine import fetch_normalized_events
from .cache import get_cached_user_performance, set_cached_user_performance
from .formatting import (
    empty_user_performance_response,
    format_duration,
    format_percent,
)
from .compute_queries import _source_summary, _group_events_by_document
from .compute_segments import _collect_segments_and_transitions, _clean_segments
from .compute_metrics import _collect_user_metrics
from .compute_rows import _build_contribution_rows, _build_flow_rows, _build_matrix_rows


def compute_user_performance() -> dict:
    signature = current_unified_rows_signature()
    cache_signature = (signature[0], signature[1], ALGORITHM_VERSION)
    cached = get_cached_user_performance(cache_signature)
    if cached is not None:
        return cached

    events, invalid_counts = fetch_normalized_events(signature=signature)
    if not events:
        empty = empty_user_performance_response()
        empty["invalidSheetCounts"] = invalid_counts
        set_cached_user_performance(cache_signature, empty)
        return empty

    source_summary = _source_summary()
    grouped_events = _group_events_by_document(events)
    all_segments, transitions = _collect_segments_and_transitions(grouped_events)
    user_stats, totals, users_involved = _collect_user_metrics(all_segments)

    total_user_sessions = int(totals["total_user_sessions"])
    total_active_user_seconds = float(totals["active_user_seconds"])

    avg_user_session_seconds = (
        total_active_user_seconds / total_user_sessions if total_user_sessions > 0 else 0.0
    )
    time_based_edit_rate = (
        sum(stats["edit_seconds"] for stats in user_stats.values())
        / total_active_user_seconds
        if total_active_user_seconds > 0
        else 0.0
    )

    result = {
        "kpis": {
            "activeUserTimeSeconds": total_active_user_seconds,
            "activeUserTimeDisplay": format_duration(total_active_user_seconds),
            "contributingUsers": len(users_involved),
            "avgUserSessionSeconds": avg_user_session_seconds,
            "avgUserSessionDisplay": format_duration(avg_user_session_seconds),
            "idleWaitingSeconds": float(totals["idle_waiting_seconds"]),
            "idleWaitingDisplay": format_duration(float(totals["idle_waiting_seconds"])),
            "idleWaitingOccurrences": int(totals["idle_waiting_occurrences"]),
            "reworkRate": time_based_edit_rate,
            "reworkRateDisplay": format_percent(time_based_edit_rate),
            "autoClosedSessions": int(totals["auto_timeout_count"]),
            "scheduledWaitSeconds": float(totals["scheduled_wait_seconds"]),
            "scheduledWaitDisplay": format_duration(float(totals["scheduled_wait_seconds"])),
            "reprocessCycleElapsedSeconds": float(
                totals["reprocess_cycle_elapsed_seconds"]
            ),
            "reprocessCycleElapsedDisplay": format_duration(
                float(totals["reprocess_cycle_elapsed_seconds"])
            ),
            "systemTimeSeconds": float(totals["system_seconds"]),
            "systemTimeDisplay": format_duration(float(totals["system_seconds"])),
            "idleTimeSeconds": float(totals["idle_waiting_seconds"]),
            "idleTimeDisplay": format_duration(float(totals["idle_waiting_seconds"])),
        },
        "summary": source_summary,
        "contribution": _build_contribution_rows(user_stats),
        "flow": _build_flow_rows(transitions)[:12],
        "matrix": _build_matrix_rows(user_stats),
        "segments": _clean_segments(all_segments),
        "invalidSheetCounts": invalid_counts,
    }
    set_cached_user_performance(cache_signature, result)
    return result
