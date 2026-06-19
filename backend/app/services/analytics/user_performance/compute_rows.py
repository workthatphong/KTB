from __future__ import annotations


def _build_contribution_rows(user_stats: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for user_name, stats in user_stats.items():
        sessions = stats["sessions"] or 1
        active_time = stats["review_seconds"] + stats["edit_seconds"]
        rows.append(
            {
                "user": user_name,
                "reviewSeconds": stats["review_seconds"],
                "editSeconds": stats["edit_seconds"],
                "completeSeconds": stats["complete_seconds"],
                "uploadSeconds": stats["upload_seconds"],
                "totalSeconds": stats["total_effective_seconds"],
                "sessionCount": stats["sessions"],
                "reworkRate": (
                    stats["edit_seconds"] / active_time if active_time > 0 else 0.0
                ),
                "autoClosedRate": stats["auto_timeout_sessions"] / sessions,
                "documents": len(stats["documents"]),
            }
        )
    rows.sort(key=lambda item: item["totalSeconds"], reverse=True)
    return rows


def _build_flow_rows(transitions: dict[str, list[float]]) -> list[dict]:
    rows: list[dict] = []
    for transition, (duration_sum, count) in transitions.items():
        if count <= 0:
            continue
        rows.append(
            {
                "transition": transition,
                "avgSeconds": duration_sum / count,
                "count": int(count),
            }
        )
    rows.sort(key=lambda item: item["avgSeconds"], reverse=True)
    return rows


def _build_matrix_rows(user_stats: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for user_name, stats in user_stats.items():
        sessions = stats["sessions"] or 1
        docs_count = len(stats["documents"]) or 1
        active_time = stats["review_seconds"] + stats["edit_seconds"]
        rows.append(
            {
                "user": user_name,
                "avgTimePerDocSeconds": stats["total_effective_seconds"] / docs_count,
                "reworkRate": (
                    stats["edit_seconds"] / active_time if active_time > 0 else 0.0
                ),
                "autoClosedRate": stats["auto_timeout_sessions"] / sessions,
                "totalActiveSeconds": stats["total_effective_seconds"],
                "documents": len(stats["documents"]),
                "sessionCount": stats["sessions"],
            }
        )
    rows.sort(key=lambda item: item["totalActiveSeconds"], reverse=True)
    return rows
