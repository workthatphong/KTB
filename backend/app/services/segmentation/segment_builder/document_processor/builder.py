from __future__ import annotations

from ...engine_utils import seconds_between
from ..intervals import build_interval_segments
from .noise import remove_placeholder_pending_exit_noise
from .synthetic import inject_synthetic_status_events
from .handoff import reorder_same_timestamp_reopen_handoffs
from .overlap import resolve_overlaps

def build_segments_for_document(doc_events: list[dict]) -> list[dict]:
    if not doc_events:
        return []

    ordered = reorder_same_timestamp_reopen_handoffs(sorted(
        doc_events, key=lambda item: (item["event_time"], -int(item["row_number"]))
    ))
    ordered = remove_placeholder_pending_exit_noise(ordered)
    ordered = inject_synthetic_status_events(ordered)
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
