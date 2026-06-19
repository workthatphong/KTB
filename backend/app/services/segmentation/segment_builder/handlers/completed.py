from __future__ import annotations

from .....config.constants.constants_workflow import COMPLETED_STATE
from ..factory import build_segment
from ..helpers import is_system_evidence

def _completed_system_evidence_events(interval: dict) -> list[dict]:
    candidates = [
        event for event in interval["inner_events"] if is_system_evidence(event)
    ]
    if is_system_evidence(interval["end_event"]):
        candidates.append(interval["end_event"])
    return sorted(candidates, key=lambda event: event["order_index"])

def _completed_idle_segment(
    interval: dict, start_event: dict, end_event: dict
) -> dict | None:
    if start_event["event_time"] >= end_event["event_time"]:
        return None
    return build_segment(
        interval,
        "POST_COMPLETED_ELAPSED",
        start_event,
        end_event,
        actor_name=None,
        actor_type="None",
        is_active_work=False,
        is_idle=True,
    )

def completed_segments(interval: dict) -> list[dict]:
    segments = []
    system_events = _completed_system_evidence_events(interval)

    if system_events:
        system_start = interval["start_event"]
        system_end = system_events[-1]

        segments.append(
            build_segment(
                interval,
                "SYSTEM_SCHEDULED_REPROCESSING",
                system_start,
                system_end,
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        )

        after_system = _completed_idle_segment(
            interval, system_end, interval["end_event"]
        )
        if after_system is not None:
            segments.append(after_system)
    else:
        idle_segment = _completed_idle_segment(
            interval, interval["start_event"], interval["end_event"]
        )
        if idle_segment is not None:
            segments.append(idle_segment)

    if (
        interval["exit_from"] == COMPLETED_STATE
        and interval["exit_to"] == "Pending Re-Review by Moodys"
    ):
        segments.append(
            build_segment(
                interval,
                "REOPEN_MARKER",
                interval["end_event"],
                interval["end_event"],
                actor_name=interval["exit_actor"],
                actor_type=interval["exit_actor_type"],
                is_active_work=False,
                is_idle=False,
                is_milestone=True,
            )
        )
    return segments
