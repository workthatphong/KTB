from __future__ import annotations

from collections import defaultdict

from ....config.constants.constants_workflow import CORE_USER_SESSION_SEGMENT_TYPES
from ...segmentation.engine import countable_segment_seconds

_EDIT_SEGMENT_TYPES = {
    "USER_EDITING_CORRECTION",
    "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
    "USER_EDITING_METADATA_CORRECTION",
    "USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL",
}


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
