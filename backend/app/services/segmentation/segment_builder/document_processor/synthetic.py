from __future__ import annotations

import datetime as dt

from .....config.constants.constants_workflow import (
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
)
from .helpers import is_user_detail_event
from .handoff import reorder_same_timestamp_reopen_handoffs

def _build_synthetic_status_event(
    anchor_event: dict,
    from_status: str,
    to_status: str,
    offset_microseconds: int,
    suffix: str,
) -> dict:
    synthetic_time = anchor_event["event_time"] + dt.timedelta(
        microseconds=offset_microseconds
    )
    return {
        **anchor_event,
        "event_id": f"{anchor_event['event_id']}::{suffix}",
        "event_time": synthetic_time,
        "change_type": "Spread Status",
        "statement_type": "N/A",
        "changed_value": "Status",
        "from_value": from_status,
        "to_value": to_status,
        "from_status": from_status,
        "to_status": to_status,
        "from_status_raw": from_status,
        "to_status_raw": to_status,
        "action_type": "Spread Status",
        "submitted_for_reanalysis": False,
        "auto_closed": False,
        "is_status_event": True,
        "is_detail_event": False,
        "order_index": -1,
        "synthetic_status_event": True,
    }

def inject_synthetic_status_events(events: list[dict]) -> list[dict]:
    status_events = [event for event in events if event["is_status_event"] and event["to_status"]]
    if not status_events:
        return events

    current_state = ""
    pending_state_context = ""
    in_review_fallback_state = ""
    last_user_detail_in_review: dict | None = None
    synthetic_events: list[dict] = []

    for event in events:
        if event["is_status_event"]:
            if (
                current_state == IN_REVIEW_STATE
                and last_user_detail_in_review is not None
                and event["from_status"] != IN_REVIEW_STATE
            ):
                if (
                    event["from_status"] in PENDING_STATES
                    and event["to_status"] == COMPLETED_STATE
                ):
                    last_user_detail_in_review = None
                    current_state = event["to_status"] or current_state
                    continue
                close_to_state = event["from_status"] or in_review_fallback_state
                if close_to_state and close_to_state != IN_REVIEW_STATE:
                    synthetic_events.append(
                        _build_synthetic_status_event(
                            last_user_detail_in_review,
                            IN_REVIEW_STATE,
                            close_to_state,
                            1,
                            "synthetic-in-review-exit",
                        )
                    )
                last_user_detail_in_review = None

            current_state = event["to_status"] or current_state
            if current_state in PENDING_STATES:
                pending_state_context = current_state
                in_review_fallback_state = current_state
            elif (
                current_state == IN_REVIEW_STATE
                and event["from_status"] in PENDING_STATES
            ):
                pending_state_context = event["from_status"]
                in_review_fallback_state = event["from_status"]
            continue

        if not is_user_detail_event(event):
            continue

        if current_state in PENDING_STATES:
            synthetic_events.append(
                _build_synthetic_status_event(
                    event,
                    current_state,
                    IN_REVIEW_STATE,
                    -1,
                    "synthetic-in-review-enter",
                )
            )
            in_review_fallback_state = current_state
            current_state = IN_REVIEW_STATE
            last_user_detail_in_review = event
            continue

        if current_state == IN_REVIEW_STATE:
            if not in_review_fallback_state:
                in_review_fallback_state = pending_state_context
            last_user_detail_in_review = event

    if (
        current_state == IN_REVIEW_STATE
        and last_user_detail_in_review is not None
        and in_review_fallback_state
    ):
        synthetic_events.append(
            _build_synthetic_status_event(
                last_user_detail_in_review,
                IN_REVIEW_STATE,
                in_review_fallback_state,
                1,
                "synthetic-in-review-exit-tail",
            )
        )

    if not synthetic_events:
        return events

    return reorder_same_timestamp_reopen_handoffs(sorted(
        [*events, *synthetic_events],
        key=lambda item: (item["event_time"], -int(item["row_number"])),
    ))
