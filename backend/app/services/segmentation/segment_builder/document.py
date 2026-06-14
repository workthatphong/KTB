from __future__ import annotations

import datetime as dt

from ....config.constants.constants_workflow import (
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
)
from ..engine_utils import seconds_between
from .intervals import build_interval_segments


def _is_user_detail_event(event: dict) -> bool:
    return event["actor_type"] == "User" and not event["is_status_event"]


def _previous_non_placeholder_user_actor(
    events: list[dict], event_index: int
) -> str | None:
    for idx in range(event_index - 1, -1, -1):
        candidate = events[idx]
        if candidate["actor_type"] != "User" or candidate["actor_name"] == "User0":
            continue
        return candidate["actor_name"]
    return None


def _next_non_placeholder_user_detail_actor_before_next_status(
    events: list[dict], event_index: int
) -> set[str]:
    actors: set[str] = set()
    for idx in range(event_index + 1, len(events)):
        candidate = events[idx]
        if candidate["is_status_event"]:
            return actors
        if _is_user_detail_event(candidate) and candidate["actor_name"] != "User0":
            actors.add(candidate["actor_name"])
    return actors


def _is_placeholder_pending_exit_noise(events: list[dict], event_index: int) -> bool:
    event = events[event_index]
    if not (
        event["is_status_event"]
        and event["actor_name"] == "User0"
        and event["from_status"] == IN_REVIEW_STATE
        and event["to_status"] == "Pending Re-Review by Moodys"
    ):
        return False

    previous_user_actor = _previous_non_placeholder_user_actor(events, event_index)
    next_user_actors = _next_non_placeholder_user_detail_actor_before_next_status(
        events, event_index
    )
    if previous_user_actor is None or not next_user_actors:
        return False
    if next_user_actors != {previous_user_actor}:
        return False

    for idx in range(event_index - 1, -1, -1):
        candidate = events[idx]
        if candidate["is_status_event"]:
            return any(
                _is_user_detail_event(inner)
                for inner in events[idx + 1 : event_index]
            )

    return False


def _remove_placeholder_pending_exit_noise(events: list[dict]) -> list[dict]:
    filtered: list[dict] = []
    for idx, event in enumerate(events):
        if _is_placeholder_pending_exit_noise(events, idx):
            continue
        filtered.append(event)
    return filtered


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


def _reorder_same_timestamp_reopen_handoffs(events: list[dict]) -> list[dict]:
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


def _inject_synthetic_status_events(events: list[dict]) -> list[dict]:
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

        if not _is_user_detail_event(event):
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

    return _reorder_same_timestamp_reopen_handoffs(sorted(
        [*events, *synthetic_events],
        key=lambda item: (item["event_time"], -int(item["row_number"])),
    ))


def resolve_overlaps(segments: list[dict]) -> list[dict]:
    if not segments:
        return []

    sorted_segments = sorted(
        segments,
        key=lambda segment: (
            segment["__start_dt"],
            segment["__end_dt"],
            segment["segmentType"],
        ),
    )
    resolved: list[dict] = []
    reprocess_windows: list[tuple[dt.datetime, dt.datetime]] = []
    active_user_windows: list[tuple[dt.datetime, dt.datetime]] = []

    for segment in sorted_segments:
        if segment["segmentType"] == "SYSTEM_SCHEDULED_REPROCESSING":
            reprocess_windows.append((segment["__start_dt"], segment["__end_dt"]))
            resolved.append(segment)
            continue

        if (
            segment.get("actorType") == "User"
            and not segment.get("isIdle")
            and not segment.get("isMilestone")
        ):
            active_user_windows.append((segment["__start_dt"], segment["__end_dt"]))
            resolved.append(segment)
            continue

        if segment["segmentType"] == "SYSTEM_INTERNAL_TRANSITION":
            fully_covered = False
            for start_dt, end_dt in reprocess_windows:
                if start_dt <= segment["__start_dt"] and segment["__end_dt"] <= end_dt:
                    fully_covered = True
                    break
            if fully_covered:
                continue

        if segment.get("isIdle"):
            fully_covered = False
            for start_dt, end_dt in active_user_windows:
                if start_dt <= segment["__start_dt"] and segment["__end_dt"] <= end_dt:
                    fully_covered = True
                    break
            if fully_covered:
                continue

        resolved.append(segment)

    return sorted(
        resolved,
        key=lambda segment: (
            segment["__start_dt"],
            segment["__end_dt"],
            segment["segmentType"],
        ),
    )


def build_segments_for_document(doc_events: list[dict]) -> list[dict]:
    if not doc_events:
        return []

    ordered = _reorder_same_timestamp_reopen_handoffs(sorted(
        doc_events, key=lambda item: (item["event_time"], -int(item["row_number"]))
    ))
    ordered = _remove_placeholder_pending_exit_noise(ordered)
    ordered = _inject_synthetic_status_events(ordered)
    for idx, event in enumerate(ordered):
        event["order_index"] = idx

    status_events = [
        event for event in ordered if event["is_status_event"] and event["to_status"]
    ]
    if len(status_events) < 2:
        return []

    intervals: list[dict] = []

    first_status_event = status_events[0]
    if first_status_event["from_status"] == "Processing":
        first_pre_status_event = next(
            (
                event
                for event in ordered
                if event["order_index"] < first_status_event["order_index"]
            ),
            None,
        )
        if (
            first_pre_status_event is not None
            and first_pre_status_event["event_time"] < first_status_event["event_time"]
        ):
            bootstrap_inner = [
                event
                for event in ordered
                if first_pre_status_event["order_index"]
                < event["order_index"]
                < first_status_event["order_index"]
            ]
            intervals.append(
                {
                    "document_id": first_status_event["document_id"],
                    "start_event": first_pre_status_event,
                    "end_event": first_status_event,
                    "inner_events": bootstrap_inner,
                    "start_time": first_pre_status_event["event_time"],
                    "end_time": first_status_event["event_time"],
                    "duration_seconds": seconds_between(
                        first_status_event["event_time"],
                        first_pre_status_event["event_time"],
                    ),
                    "state": "Processing",
                    "enter_from": "Processing",
                    "enter_to": "Processing",
                    "enter_actor": first_pre_status_event["actor_name"],
                    "enter_actor_type": first_pre_status_event["actor_type"],
                    "exit_from": first_status_event["from_status"],
                    "exit_to": first_status_event["to_status"],
                    "exit_actor": first_status_event["actor_name"],
                    "exit_actor_type": first_status_event["actor_type"],
                }
            )

    for idx in range(len(status_events) - 1):
        current = status_events[idx]
        nxt = status_events[idx + 1]
        inner = [
            event
            for event in ordered
            if current["order_index"] < event["order_index"] < nxt["order_index"]
        ]
        intervals.append(
            {
                "document_id": current["document_id"],
                "start_event": current,
                "end_event": nxt,
                "inner_events": inner,
                "start_time": current["event_time"],
                "end_time": nxt["event_time"],
                "duration_seconds": seconds_between(
                    nxt["event_time"], current["event_time"]
                ),
                "state": current["to_status"],
                "enter_from": current["from_status"],
                "enter_to": current["to_status"],
                "enter_actor": current["actor_name"],
                "enter_actor_type": current["actor_type"],
                "exit_from": nxt["from_status"],
                "exit_to": nxt["to_status"],
                "exit_actor": nxt["actor_name"],
                "exit_actor_type": nxt["actor_type"],
            }
        )

    segments: list[dict] = []
    for interval in intervals:
        segments.extend(build_interval_segments(interval, ordered))
    return resolve_overlaps(segments)
