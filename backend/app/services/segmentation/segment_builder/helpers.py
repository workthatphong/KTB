from __future__ import annotations

import datetime as dt

from ....config.constants.constants_workflow import (
    ACTIVITY_GRACE_MINUTES_DEFAULT,
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
    SESSION_TIMEOUT_MINUTES_DEFAULT,
    SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES,
)
from ..engine_utils import seconds_between


def is_system_evidence(event: dict) -> bool:
    if (
        event["actor_type"] == "System"
        and event["change_type"] in SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES
    ):
        return True
    if (
        event["actor_type"] == "System"
        and event["is_status_event"]
        and event["from_status"] in PENDING_STATES
        and event["to_status"] == IN_REVIEW_STATE
    ):
        return True
    if (
        event["actor_type"] == "System"
        and event["is_status_event"]
        and event["from_status"] == IN_REVIEW_STATE
        and event["to_status"] == COMPLETED_STATE
    ):
        return True
    if (
        event["actor_type"] == "System"
        and event["is_status_event"]
        and event["from_status"] == "Processing"
    ):
        return True
    return False


def first_system_evidence(events: list[dict]) -> dict | None:
    for event in sorted(events, key=lambda item: item["order_index"]):
        if is_system_evidence(event):
            return event
    return None


def previous_system_event_before(
    events: list[dict], before_order_index: int
) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] < before_order_index and event["actor_type"] == "System"
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[-1]


def previous_in_review_entry_event(
    events: list[dict], before_order_index: int
) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] < before_order_index
        and event["is_status_event"]
        and event["from_status"] in PENDING_STATES
        and event["to_status"] == IN_REVIEW_STATE
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[-1]


def previous_status_event_before(events: list[dict], before_order_index: int) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] < before_order_index
        and event["is_status_event"]
        and event["to_status"]
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[-1]


def next_status_event_after(events: list[dict], after_order_index: int) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] > after_order_index
        and event["is_status_event"]
        and event["to_status"]
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[0]


def has_same_timestamp_reopen_handoff(
    events: list[dict],
    review_entry_event: dict,
) -> bool:
    if not (
        review_entry_event["is_status_event"]
        and review_entry_event["from_status"] in PENDING_STATES
        and review_entry_event["to_status"] == IN_REVIEW_STATE
    ):
        return False

    for event in events:
        if event["order_index"] == review_entry_event["order_index"]:
            continue
        if event["event_time"] != review_entry_event["event_time"]:
            continue
        if not event["is_status_event"]:
            continue
        if (
            event["from_status"] == COMPLETED_STATE
            and event["to_status"] in PENDING_STATES
        ):
            return True
    return False


def next_system_detail_after(events: list[dict], after_order_index: int) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] > after_order_index
        and event["actor_type"] == "System"
        and event["change_type"] in SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[0]


def last_system_event_after(events: list[dict], after_order_index: int) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] >= after_order_index and event["actor_type"] == "System"
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[-1]


def find_system_reprocess_cycle_end(
    first_system_event: dict, events: list[dict]
) -> dict:
    ordered = sorted(events, key=lambda item: item["order_index"])
    for event in ordered:
        if event["order_index"] < first_system_event["order_index"]:
            continue
        if (
            event["is_status_event"]
            and event["actor_type"] == "System"
            and event["from_status"] == IN_REVIEW_STATE
            and event["to_status"] == COMPLETED_STATE
        ):
            return event
        if (
            event["is_status_event"]
            and event["actor_type"] == "System"
            and event["from_status"] == IN_REVIEW_STATE
            and event["to_status"] in PENDING_STATES
        ):
            if next_system_detail_after(ordered, event["order_index"]) is None:
                return event
        if (
            event["is_status_event"]
            and event["actor_type"] == "User"
            and event["from_status"] in PENDING_STATES
            and event["to_status"] == IN_REVIEW_STATE
        ):
            previous_system = previous_system_event_before(
                ordered, event["order_index"]
            )
            return previous_system or first_system_event
    return (
        last_system_event_after(ordered, first_system_event["order_index"])
        or first_system_event
    )


def calculate_effective_user_duration(interval: dict, is_auto_timeout: bool) -> float:
    if not is_auto_timeout:
        return interval["duration_seconds"]
    user_details = [
        event for event in interval["inner_events"] if event["actor_type"] == "User"
    ]
    if user_details:
        last_user_detail = sorted(user_details, key=lambda item: item["order_index"])[
            -1
        ]
        effective_end = min(
            interval["end_time"],
            last_user_detail["event_time"]
            + dt.timedelta(minutes=ACTIVITY_GRACE_MINUTES_DEFAULT),
        )
    else:
        effective_end = min(
            interval["end_time"],
            interval["start_time"]
            + dt.timedelta(minutes=SESSION_TIMEOUT_MINUTES_DEFAULT),
        )
    return seconds_between(effective_end, interval["start_time"])


def is_same_timestamp_reopen_to_review_handoff(interval: dict) -> bool:
    if interval["duration_seconds"] > 1:
        return False
    transitions = {
        (interval["start_event"]["from_status"], interval["start_event"]["to_status"]),
        (interval["end_event"]["from_status"], interval["end_event"]["to_status"]),
    }
    return ("Completed", "Pending Re-Review by Moodys") in transitions and (
        "Pending Re-Review by Moodys",
        "In Review by Moodys",
    ) in transitions


def segment_events_between(
    events: list[dict], start_event: dict, end_event: dict
) -> list[dict]:
    return [
        event
        for event in events
        if start_event["order_index"]
        <= event["order_index"]
        <= end_event["order_index"]
    ]
