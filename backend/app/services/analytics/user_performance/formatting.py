from __future__ import annotations

from ....config.constants.constants_runtime import ALGORITHM_VERSION


def format_duration(seconds: float) -> str:
    sec = max(0, int(round(seconds)))
    hours, remainder = divmod(sec, 3600)
    minutes, seconds_only = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m {seconds_only}s"
    return f"{seconds_only}s"


def format_percent(value: float) -> str:
    return f"{value * 100:.1f}%"


def empty_user_performance_response() -> dict:
    return {
        "kpis": {
            "activeUserTimeSeconds": 0,
            "activeUserTimeDisplay": "0s",
            "contributingUsers": 0,
            "avgUserSessionSeconds": 0,
            "avgUserSessionDisplay": "0s",
            "idleWaitingSeconds": 0,
            "idleWaitingDisplay": "0s",
            "idleWaitingOccurrences": 0,
            "reworkRate": 0,
            "reworkRateDisplay": "0.0%",
            "autoClosedSessions": 0,
            "scheduledWaitSeconds": 0,
            "scheduledWaitDisplay": "0s",
            "reprocessCycleElapsedSeconds": 0,
            "reprocessCycleElapsedDisplay": "0s",
            "systemTimeSeconds": 0,
            "systemTimeDisplay": "0s",
            "idleTimeSeconds": 0,
            "idleTimeDisplay": "0s",
        },
        "summary": {
            "files": 0,
            "pages": 0,
            "rows": 0,
            "algorithmVersion": ALGORITHM_VERSION,
        },
        "contribution": [],
        "flow": [],
        "matrix": [],
        "segments": [],
    }
