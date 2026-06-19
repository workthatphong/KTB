from __future__ import annotations

from .....config.constants.constants_workflow import (
    COMPLETED_STATE,
    PENDING_STATES,
    USER_EDIT_CHANGE_TYPES,
    USER_METADATA_EDIT_CHANGE_TYPES,
)
from ..factory import build_segment
from ..helpers import (
    first_system_evidence,
    has_same_timestamp_reopen_handoff,
    next_status_event_after,
)
from .common import completion_segment_type
from .overlap import overlap_review_actor_segments
from .synthetic import split_synthetic_edit_burst_segments

def _timeout_completion_event(interval: dict, all_events: list[dict]) -> dict | None:
    if not has_same_timestamp_reopen_handoff(all_events, interval["start_event"]):
        return None

    next_status = next_status_event_after(
        all_events,
        interval["end_event"]["order_index"],
    )
    if next_status is None:
        return None
    if (
        next_status["from_status"] != interval["exit_to"]
        or next_status["to_status"] != COMPLETED_STATE
    ):
        return None

    between_events = [
        event
        for event in all_events
        if interval["end_event"]["order_index"] < event["order_index"] < next_status["order_index"]
    ]
    if between_events:
        return None
    return next_status

def in_review_segments(interval: dict, all_events: list[dict]) -> list[dict]:
    overlap_segments = overlap_review_actor_segments(interval)
    if overlap_segments:
        return overlap_segments

    synthetic_burst_segments = split_synthetic_edit_burst_segments(interval, all_events)
    if synthetic_burst_segments:
        return synthetic_burst_segments

    user_edit_count = len(
        [
            event
            for event in interval["inner_events"]
            if event["actor_type"] == "User"
            and event["change_type"] in USER_EDIT_CHANGE_TYPES
        ]
    )
    user_metadata_edit_count = len(
        [
            event
            for event in interval["inner_events"]
            if event["actor_type"] == "User"
            and event["change_type"] in USER_METADATA_EDIT_CHANGE_TYPES
        ]
    )

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] != COMPLETED_STATE
        and user_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_CORRECTION",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] != COMPLETED_STATE
        and user_metadata_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_METADATA_CORRECTION",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_actor_type"] == "System"
        and interval["exit_to"] in PENDING_STATES
    ):
        timeout_completion_event = _timeout_completion_event(interval, all_events)
        if timeout_completion_event is not None:
            return [
                build_segment(
                    interval,
                    completion_segment_type(
                        user_edit_count,
                        user_metadata_edit_count,
                    ),
                    interval["start_event"],
                    timeout_completion_event,
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                )
            ]
        return [
            build_segment(
                interval,
                "USER_REVIEW_AUTO_TIMEOUT",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
                is_auto_timeout=True,
            ),
            build_segment(
                interval,
                "AUTO_TIMEOUT_MARKER",
                interval["end_event"],
                interval["end_event"],
                actor_name="System",
                actor_type="System",
                is_active_work=False,
                is_idle=False,
                is_milestone=True,
                is_auto_timeout=True,
            ),
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_metadata_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_edit_count == 0
        and interval["exit_actor_type"] == "System"
    ):
        first_system = first_system_evidence(
            [*interval["inner_events"], interval["end_event"]]
        )
        if first_system is not None:
            return [
                build_segment(
                    interval,
                    "USER_REVIEW_COMMENT_CHECK",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                ),
                build_segment(
                    interval,
                    "SYSTEM_SCHEDULED_REPROCESSING",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name="System",
                    actor_type="System",
                    is_active_work=True,
                    is_idle=False,
                ),
            ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_edit_count == 0
    ):
        return [
            build_segment(
                interval,
                "USER_COMPLETION_APPROVAL",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] != COMPLETED_STATE
        and not (
            interval["exit_actor_type"] == "System"
            and interval["exit_to"] in PENDING_STATES
        )
        and user_edit_count == 0
    ):
        segments = [
            build_segment(
                interval,
                "USER_REVIEW_COMMENT_CHECK",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

        first_system = first_system_evidence(interval["inner_events"])
        if first_system is not None and first_system["event_time"] < interval["end_time"]:
            segments.append(
                build_segment(
                    interval,
                    "SYSTEM_INTERNAL_TRANSITION",
                    first_system,
                    interval["end_event"],
                    actor_name="System",
                    actor_type="System",
                    is_active_work=True,
                    is_idle=False,
                )
            )
        return segments

    if interval["enter_actor_type"] == "System":
        return [
            build_segment(
                interval,
                "SYSTEM_INTERNAL_TRANSITION",
                interval["start_event"],
                interval["end_event"],
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        ]

    return []
