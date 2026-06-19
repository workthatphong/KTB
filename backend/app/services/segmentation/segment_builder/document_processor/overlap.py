from __future__ import annotations

import datetime as dt

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
