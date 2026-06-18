from __future__ import annotations

from ..engine_utils import assign_time_group, seconds_between
from ....config.constants.constants_workflow import (
    USER_EDIT_CHANGE_TYPES,
    USER_METADATA_EDIT_CHANGE_TYPES,
)
from .helpers import calculate_effective_user_duration


def _count_segment_edit_items(
    interval: dict,
    segment_type: str,
    start_event: dict,
    end_event: dict,
    actor_name: str | None,
) -> tuple[int, int]:
    if segment_type not in {
        "USER_EDITING_CORRECTION",
        "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
        "USER_EDITING_METADATA_CORRECTION",
        "USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL",
    }:
        return 0, 0

    start_index = min(
        int(start_event.get("order_index", 0)),
        int(end_event.get("order_index", 0)),
    )
    end_index = max(
        int(start_event.get("order_index", 0)),
        int(end_event.get("order_index", 0)),
    )
    normalized_actor_name = str(actor_name or "").strip().lower()

    edit_data_count = 0
    edit_meta_count = 0
    for event in interval.get("inner_events", []):
        event_index = int(event.get("order_index", -1))
        if event_index < start_index or event_index > end_index:
            continue
        if event.get("actor_type") != "User" or event.get("is_status_event"):
            continue
        event_actor_name = str(event.get("actor_name") or "").strip().lower()
        if normalized_actor_name and event_actor_name != normalized_actor_name:
            continue
        if event.get("change_type") in USER_EDIT_CHANGE_TYPES:
            edit_data_count += 1
        if event.get("change_type") in USER_METADATA_EDIT_CHANGE_TYPES:
            edit_meta_count += 1

    return edit_data_count, edit_meta_count


def build_segment(
    interval: dict,
    segment_type: str,
    start_event: dict,
    end_event: dict,
    *,
    actor_name: str | None,
    actor_type: str,
    is_active_work: bool,
    is_idle: bool,
    is_queue_wait: bool = False,
    is_milestone: bool = False,
    metric_only: bool = False,
    is_auto_timeout: bool = False,
    same_timestamp_handoff: bool = False,
) -> dict:
    start_time = start_event["event_time"]
    end_time = end_event["event_time"]
    duration_seconds = 0.0 if is_milestone else seconds_between(end_time, start_time)

    effective_duration_seconds = duration_seconds
    if is_auto_timeout:
        effective_duration_seconds = calculate_effective_user_duration(interval, True)

    time_group, time_group_rule_id, original_bucket, time_group_countable = (
        assign_time_group(
            segment_type,
            actor_type,
            is_milestone=is_milestone,
            metric_only=metric_only,
            is_queue_wait=is_queue_wait,
        )
    )

    user_name = actor_name or ""
    if not user_name:
        if actor_type == "System":
            user_name = "System"
        elif time_group == "Idle Time":
            user_name = "Idle"
        else:
            user_name = "Unknown User"

    edit_data_item_count, edit_meta_item_count = _count_segment_edit_items(
        interval,
        segment_type,
        start_event,
        end_event,
        actor_name,
    )

    return {
        "id": (
            f"{interval['document_id']}|{segment_type}|"
            f"{start_event['row_number']}->{end_event['row_number']}|"
            f"{start_event['order_index']}->{end_event['order_index']}"
        ),
        "segmentType": segment_type,
        "timeGroup": time_group,
        "timeGroupRuleId": time_group_rule_id,
        "timeGroupCountable": time_group_countable,
        "originalTimeBucket": original_bucket,
        "metricOnly": metric_only,
        "isActiveWork": is_active_work,
        "isIdle": is_idle,
        "isQueueWait": is_queue_wait,
        "isMilestone": is_milestone,
        "sameTimestampHandoff": same_timestamp_handoff,
        "start": start_time.isoformat(),
        "end": end_time.isoformat(),
        "durationSeconds": duration_seconds,
        "effectiveDurationSeconds": effective_duration_seconds,
        "documentId": interval["document_id"],
        "userName": user_name,
        "actorType": actor_type,
        "fileName": start_event["file_name"],
        "pageName": start_event["page_name"],
        "autoTimeout": is_auto_timeout,
        "editDataItemCount": edit_data_item_count,
        "editMetaItemCount": edit_meta_item_count,
        "__start_dt": start_time,
        "__end_dt": end_time,
    }


def countable_segment_seconds(segment: dict) -> float:
    if not segment.get("timeGroupCountable"):
        return 0.0
    if (
        segment.get("timeGroup") == "User"
        and segment.get("segmentType") == "USER_REVIEW_AUTO_TIMEOUT"
    ):
        return max(0.0, float(segment.get("effectiveDurationSeconds") or 0.0))
    return max(0.0, float(segment.get("durationSeconds") or 0.0))
