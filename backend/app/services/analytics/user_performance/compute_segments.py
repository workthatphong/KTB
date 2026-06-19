from __future__ import annotations

from collections import defaultdict

from ...segmentation.engine import build_segments_for_document, seconds_between


def _collect_segments_and_transitions(
    grouped_events: dict[str, list[dict]],
) -> tuple[list[dict], dict[str, list[float]]]:
    all_segments: list[dict] = []
    transitions: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])

    for doc_events in grouped_events.values():
        all_segments.extend(build_segments_for_document(doc_events))

        ordered = sorted(
            doc_events,
            key=lambda item: (item["event_time"], -int(item["row_number"])),
        )
        status_events = [
            event for event in ordered if event["is_status_event"] and event["to_status"]
        ]
        for idx in range(len(status_events) - 1):
            current = status_events[idx]
            nxt = status_events[idx + 1]
            transition_key = f"{current['to_status']} -> {nxt['to_status']}"
            duration_seconds = seconds_between(nxt["event_time"], current["event_time"])
            transitions[transition_key][0] += duration_seconds
            transitions[transition_key][1] += 1

    all_segments.sort(
        key=lambda segment: (
            segment["__start_dt"],
            segment["__end_dt"],
            segment["segmentType"],
            segment["documentId"],
        )
    )
    return all_segments, transitions


def _clean_segments(all_segments: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for segment in all_segments:
        rows.append({key: value for key, value in segment.items() if not key.startswith("__")})
    return rows
