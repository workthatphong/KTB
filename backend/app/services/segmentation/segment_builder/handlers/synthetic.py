from __future__ import annotations

from .....config.constants.constants_workflow import (
    ACTIVITY_GRACE_MINUTES_DEFAULT,
    SESSION_TIMEOUT_MINUTES_DEFAULT,
    USER_EDIT_CHANGE_TYPES,
    USER_METADATA_EDIT_CHANGE_TYPES,
)
from ...engine_utils import seconds_between
from ..factory import build_segment
from ..helpers import (
    is_system_evidence,
    next_status_event_after,
)

def _edit_burst_segment_type(edit_count: int, metadata_edit_count: int) -> str:
    if edit_count > 0:
        return "USER_EDITING_CORRECTION"
    if metadata_edit_count > 0:
        return "USER_EDITING_METADATA_CORRECTION"
    return ""

def _synthetic_edit_split_gap_seconds() -> float:
    return max(
        float(ACTIVITY_GRACE_MINUTES_DEFAULT * 60),
        float((SESSION_TIMEOUT_MINUTES_DEFAULT - ACTIVITY_GRACE_MINUTES_DEFAULT) * 60),
    )

def _pending_idle_segment_type_for_synthetic_split(interval: dict) -> str:
    pending_state = (
        interval["start_event"].get("from_status")
        or interval["end_event"].get("to_status")
        or ""
    )
    if pending_state == "Pending Review by Moodys":
        return "IDLE_WAITING_FOR_REVIEW"
    return "IDLE_WAITING_FOR_REREVIEW"

def _resolve_synthetic_split_burst_end_event(
    interval: dict,
    all_events: list[dict],
    burst_index: int,
    burst_count: int,
    burst: list[dict],
) -> dict:
    if burst_index != burst_count - 1:
        return burst[-1]

    if not interval["end_event"].get("synthetic_status_event"):
        return interval["end_event"]

    next_status = next_status_event_after(
        all_events,
        interval["end_event"]["order_index"],
    )
    if next_status is None:
        return interval["end_event"]
    if next_status["from_status"] != interval["end_event"]["to_status"]:
        return interval["end_event"]
    if next_status["actor_type"] != "User":
        return interval["end_event"]

    return next_status

def split_synthetic_edit_burst_segments(
    interval: dict,
    all_events: list[dict],
) -> list[dict]:
    if not (
        interval["start_event"].get("synthetic_status_event")
        or interval["end_event"].get("synthetic_status_event")
    ):
        return []

    if any(is_system_evidence(event) for event in interval["inner_events"]):
        return []

    user_detail_events = [
        event
        for event in interval["inner_events"]
        if event["actor_type"] == "User"
        and not event["is_status_event"]
        and event["actor_name"] != "User0"
    ]
    if len(user_detail_events) < 2:
        return []

    gap_threshold_seconds = _synthetic_edit_split_gap_seconds()
    bursts: list[list[dict]] = [[user_detail_events[0]]]
    for event in user_detail_events[1:]:
        previous_event = bursts[-1][-1]
        gap_seconds = seconds_between(event["event_time"], previous_event["event_time"])
        if gap_seconds > gap_threshold_seconds:
            bursts.append([event])
            continue
        bursts[-1].append(event)

    if len(bursts) < 2:
        return []

    segments: list[dict] = []
    idle_segment_type = _pending_idle_segment_type_for_synthetic_split(interval)
    for burst_index, burst in enumerate(bursts):
        edit_count = len(
            [
                event
                for event in burst
                if event["change_type"] in USER_EDIT_CHANGE_TYPES
            ]
        )
        metadata_edit_count = len(
            [
                event
                for event in burst
                if event["change_type"] in USER_METADATA_EDIT_CHANGE_TYPES
            ]
        )
        segment_type = _edit_burst_segment_type(edit_count, metadata_edit_count)
        if not segment_type:
            return []

        start_event = interval["start_event"] if burst_index == 0 else burst[0]
        end_event = _resolve_synthetic_split_burst_end_event(
            interval,
            all_events,
            burst_index,
            len(bursts),
            burst,
        )
        actor_name = burst[0]["actor_name"]
        segments.append(
            build_segment(
                interval,
                segment_type,
                start_event,
                end_event,
                actor_name=actor_name,
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        )

        if burst_index == len(bursts) - 1:
            continue

        idle_start_event = burst[-1]
        idle_end_event = bursts[burst_index + 1][0]
        if idle_start_event["event_time"] >= idle_end_event["event_time"]:
            continue
        segments.append(
            build_segment(
                interval,
                idle_segment_type,
                idle_start_event,
                idle_end_event,
                actor_name=None,
                actor_type="None",
                is_active_work=False,
                is_idle=True,
            )
        )

    return segments
