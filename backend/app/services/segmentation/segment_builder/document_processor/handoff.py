from __future__ import annotations

from .....config.constants.constants_workflow import (
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
)

def _same_timestamp_handoff_rank(event: dict) -> int:
    if not event["is_status_event"]:
        return 9
    if (
        event["from_status"] == COMPLETED_STATE
        and event["to_status"] in PENDING_STATES
    ):
        return 0
    if (
        event["from_status"] in PENDING_STATES
        and event["to_status"] == IN_REVIEW_STATE
    ):
        return 1
    return 9

def reorder_same_timestamp_reopen_handoffs(events: list[dict]) -> list[dict]:
    if len(events) < 2:
        return events

    reordered: list[dict] = []
    idx = 0
    while idx < len(events):
        current_time = events[idx]["event_time"]
        group: list[dict] = []
        while idx < len(events) and events[idx]["event_time"] == current_time:
            group.append(events[idx])
            idx += 1

        has_reopen = any(
            event["is_status_event"]
            and event["from_status"] == COMPLETED_STATE
            and event["to_status"] in PENDING_STATES
            for event in group
        )
        has_review_entry = any(
            event["is_status_event"]
            and event["from_status"] in PENDING_STATES
            and event["to_status"] == IN_REVIEW_STATE
            for event in group
        )
        if has_reopen and has_review_entry:
            indexed_group = list(enumerate(group))
            indexed_group.sort(
                key=lambda item: (_same_timestamp_handoff_rank(item[1]), item[0])
            )
            reordered.extend(event for _, event in indexed_group)
            continue

        reordered.extend(group)

    return reordered
