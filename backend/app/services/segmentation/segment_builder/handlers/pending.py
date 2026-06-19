from __future__ import annotations

from .....config.constants.constants_workflow import (
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
)
from ..factory import build_segment
from ..helpers import (
    find_system_reprocess_cycle_end,
    first_system_evidence,
    has_same_timestamp_reopen_handoff,
    previous_in_review_entry_event,
    previous_status_event_before,
)

def _system_reprocess_start_event(
    interval: dict, all_events: list[dict], first_system: dict
) -> dict:
    if not (
        interval["enter_actor_type"] == "User"
        and interval["enter_from"] == IN_REVIEW_STATE
        and interval["enter_to"] in PENDING_STATES
        and interval["exit_actor_type"] == "System"
        and interval["exit_from"] == IN_REVIEW_STATE
        and interval["exit_to"] == COMPLETED_STATE
    ):
        return first_system

    previous_review_entry = previous_in_review_entry_event(
        all_events,
        interval["start_event"]["order_index"],
    )
    return previous_review_entry or first_system

def pending_segments(interval: dict, all_events: list[dict]) -> list[dict]:
    previous_status = previous_status_event_before(
        all_events,
        interval["start_event"]["order_index"],
    )
    if (
        interval["enter_actor_type"] == "System"
        and interval["enter_from"] == IN_REVIEW_STATE
        and interval["exit_to"] == COMPLETED_STATE
        and not interval["inner_events"]
        and previous_status is not None
        and has_same_timestamp_reopen_handoff(all_events, previous_status)
    ):
        return []

    first_system = first_system_evidence(
        [*interval["inner_events"], interval["end_event"]]
    )
    if first_system is not None:
        segments: list[dict] = []
        cycle_end = find_system_reprocess_cycle_end(first_system, all_events)
        system_start = _system_reprocess_start_event(
            interval,
            all_events,
            first_system,
        )

        if system_start["event_time"] > interval["start_time"]:
            segments.append(
                build_segment(
                    interval,
                    "IDLE_WAITING_FOR_SCHEDULED_REPROCESS",
                    interval["start_event"],
                    system_start,
                    actor_name=None,
                    actor_type="None",
                    is_active_work=False,
                    is_idle=True,
                    is_queue_wait=True,
                )
            )

        segments.append(
            build_segment(
                interval,
                "SYSTEM_SCHEDULED_REPROCESSING",
                system_start,
                cycle_end,
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        )

        if (
            cycle_end["event_time"] < interval["end_time"]
            and interval["exit_actor_type"] == "User"
            and interval["exit_to"] == IN_REVIEW_STATE
        ):
            segments.append(
                build_segment(
                    interval,
                    "IDLE_AFTER_SYSTEM_REPROCESS",
                    cycle_end,
                    interval["end_event"],
                    actor_name=None,
                    actor_type="None",
                    is_active_work=False,
                    is_idle=True,
                )
            )
        return segments

    idle_segment_type = (
        "IDLE_WAITING_FOR_REVIEW"
        if interval["state"] == "Pending Review by Moodys"
        else "IDLE_WAITING_FOR_REREVIEW"
    )
    return [
        build_segment(
            interval,
            idle_segment_type,
            interval["start_event"],
            interval["end_event"],
            actor_name=None,
            actor_type="None",
            is_active_work=False,
            is_idle=True,
        )
    ]
