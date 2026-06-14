from __future__ import annotations

from collections import defaultdict

from ....config.constants.constants_runtime import ALGORITHM_VERSION
from ....config.constants.constants_workflow import CORE_USER_SESSION_SEGMENT_TYPES
from ....infrastructure.db.sqlite_store import current_unified_rows_signature, get_conn
from ...segmentation.engine import (
    build_segments_for_document,
    countable_segment_seconds,
    fetch_normalized_events,
    seconds_between,
)
from .cache import get_cached_user_performance, set_cached_user_performance
from .formatting import (
    empty_user_performance_response,
    format_duration,
    format_percent,
)

_EDIT_SEGMENT_TYPES = {
    "USER_EDITING_CORRECTION",
    "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
    "USER_EDITING_METADATA_CORRECTION",
    "USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL",
}


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


def _collect_segments_and_transitions(
    grouped_events: dict[str, list[dict]],
) -> tuple[list[dict], dict[str, list[float]]]:
    all_segments: list[dict] = []
    transitions: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])

    for doc_events in grouped_events.values():
        all_segments.extend(build_segments_for_document(doc_events))

        ordered = sorted(
            doc_events,
            key=lambda item: (item["event_time"], -int(item["row_number"])),
        )
        status_events = [
            event for event in ordered if event["is_status_event"] and event["to_status"]
        ]
        for idx in range(len(status_events) - 1):
            current = status_events[idx]
            nxt = status_events[idx + 1]
            transition_key = f"{current['to_status']} -> {nxt['to_status']}"
            duration_seconds = seconds_between(nxt["event_time"], current["event_time"])
            transitions[transition_key][0] += duration_seconds
            transitions[transition_key][1] += 1

    all_segments.sort(
        key=lambda segment: (
            segment["__start_dt"],
            segment["__end_dt"],
            segment["segmentType"],
            segment["documentId"],
        )
    )
    return all_segments, transitions


def _new_user_stats() -> dict:
    return {
        "review_seconds": 0.0,
        "edit_seconds": 0.0,
        "complete_seconds": 0.0,
        "upload_seconds": 0.0,
        "total_effective_seconds": 0.0,
        "total_observed_seconds": 0.0,
        "sessions": 0,
        "rework_sessions": 0,
        "auto_timeout_sessions": 0,
        "documents": set(),
    }


def _collect_user_metrics(
    all_segments: list[dict],
) -> tuple[dict[str, dict], dict[str, float | int], set[str]]:
    totals: dict[str, float | int] = {
        "active_user_seconds": 0.0,
        "idle_waiting_seconds": 0.0,
        "system_seconds": 0.0,
        "scheduled_wait_seconds": 0.0,
        "reprocess_cycle_elapsed_seconds": 0.0,
        "idle_waiting_occurrences": 0,
        "auto_timeout_count": 0,
        "total_user_sessions": 0,
        "total_rework_sessions": 0,
    }
    users_involved: set[str] = set()
    user_stats: dict[str, dict] = defaultdict(_new_user_stats)

    for segment in all_segments:
        counted_seconds = countable_segment_seconds(segment)
        segment_type = str(segment.get("segmentType") or "")
        time_group = str(segment.get("timeGroup") or "")
        user_name = str(segment.get("userName") or "").strip()
        is_user_segment = segment_type.startswith("USER_")
        is_system_actor = (
            user_name.lower() == "system" or segment.get("actorType") == "System"
        )

        if time_group == "User" and is_user_segment:
            totals["active_user_seconds"] += counted_seconds
            if user_name and not is_system_actor and user_name.lower() != "unknown user":
                users_involved.add(user_name)
        elif time_group == "System":
            totals["system_seconds"] += counted_seconds
        elif time_group == "Idle Time":
            totals["idle_waiting_seconds"] += counted_seconds
            if segment.get("timeGroupCountable"):
                totals["idle_waiting_occurrences"] += 1

        if segment_type == "IDLE_WAITING_FOR_SCHEDULED_REPROCESS":
            totals["scheduled_wait_seconds"] += counted_seconds
        if segment_type == "SYSTEM_SCHEDULED_REPROCESSING":
            totals["reprocess_cycle_elapsed_seconds"] += counted_seconds
        if segment_type == "USER_REVIEW_AUTO_TIMEOUT":
            totals["auto_timeout_count"] += 1

        if not is_user_segment or is_system_actor:
            continue

        stats = user_stats[user_name or "Unknown User"]
        stats["total_effective_seconds"] += counted_seconds
        stats["total_observed_seconds"] += max(
            0.0, float(segment.get("durationSeconds") or 0.0)
        )
        stats["documents"].add(
            segment.get("documentId")
            or f"{segment.get('fileName', '')}::{segment.get('pageName', '')}"
        )

        if segment_type == "USER_UPLOADING":
            stats["upload_seconds"] += counted_seconds
            continue

        if segment_type in CORE_USER_SESSION_SEGMENT_TYPES:
            stats["sessions"] += 1
            totals["total_user_sessions"] += 1

        if segment_type in _EDIT_SEGMENT_TYPES:
            stats["edit_seconds"] += counted_seconds
            stats["rework_sessions"] += 1
            totals["total_rework_sessions"] += 1
        elif segment_type == "USER_COMPLETION_APPROVAL":
            stats["complete_seconds"] += counted_seconds
        else:
            stats["review_seconds"] += counted_seconds

        if segment.get("autoTimeout") or segment_type == "USER_REVIEW_AUTO_TIMEOUT":
            stats["auto_timeout_sessions"] += 1

    return user_stats, totals, users_involved


def _build_contribution_rows(user_stats: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for user_name, stats in user_stats.items():
        sessions = stats["sessions"] or 1
        active_time = stats["review_seconds"] + stats["edit_seconds"]
        rows.append(
            {
                "user": user_name,
                "reviewSeconds": stats["review_seconds"],
                "editSeconds": stats["edit_seconds"],
                "completeSeconds": stats["complete_seconds"],
                "uploadSeconds": stats["upload_seconds"],
                "totalSeconds": stats["total_effective_seconds"],
                "sessionCount": stats["sessions"],
                "reworkRate": (
                    stats["edit_seconds"] / active_time if active_time > 0 else 0.0
                ),
                "autoClosedRate": stats["auto_timeout_sessions"] / sessions,
                "documents": len(stats["documents"]),
            }
        )
    rows.sort(key=lambda item: item["totalSeconds"], reverse=True)
    return rows


def _build_flow_rows(transitions: dict[str, list[float]]) -> list[dict]:
    rows: list[dict] = []
    for transition, (duration_sum, count) in transitions.items():
        if count <= 0:
            continue
        rows.append(
            {
                "transition": transition,
                "avgSeconds": duration_sum / count,
                "count": int(count),
            }
        )
    rows.sort(key=lambda item: item["avgSeconds"], reverse=True)
    return rows


def _build_matrix_rows(user_stats: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for user_name, stats in user_stats.items():
        sessions = stats["sessions"] or 1
        docs_count = len(stats["documents"]) or 1
        active_time = stats["review_seconds"] + stats["edit_seconds"]
        rows.append(
            {
                "user": user_name,
                "avgTimePerDocSeconds": stats["total_effective_seconds"] / docs_count,
                "reworkRate": (
                    stats["edit_seconds"] / active_time if active_time > 0 else 0.0
                ),
                "autoClosedRate": stats["auto_timeout_sessions"] / sessions,
                "totalActiveSeconds": stats["total_effective_seconds"],
                "documents": len(stats["documents"]),
                "sessionCount": stats["sessions"],
            }
        )
    rows.sort(key=lambda item: item["totalActiveSeconds"], reverse=True)
    return rows


def _clean_segments(all_segments: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for segment in all_segments:
        rows.append({key: value for key, value in segment.items() if not key.startswith("__")})
    return rows


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
