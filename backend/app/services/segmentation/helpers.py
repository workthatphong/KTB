from __future__ import annotations

import datetime as dt
import re

from ...config.constants.constants_workflow import (
    ACTIVITY_GRACE_MINUTES_DEFAULT,
    COMPLETED_STATE,
    COMPLETED_STATUSES,
    IN_REVIEW_STATE,
    IN_REVIEW_STATUSES,
    PENDING_REREVIEW_STATUSES,
    PENDING_REVIEW_STATUSES,
    PENDING_STATES,
    SESSION_TIMEOUT_MINUTES_DEFAULT,
    SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES,
)

def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").strip().lower())


def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def canonicalize_workflow_state(value: str | None) -> str:
    token = normalize_text(value)
    if not token:
        return ""
    if "upload" in token:
        return "Uploading"
    if "process" in token:
        return "Processing"
    if token in PENDING_REREVIEW_STATUSES or "pendingrereview" in token:
        return "Pending Re-Review by Moodys"
    if token in PENDING_REVIEW_STATUSES or "pendingreview" in token:
        return "Pending Review by Moodys"
    if token in IN_REVIEW_STATUSES or "inreview" in token:
        return "In Review by Moodys"
    if token in COMPLETED_STATUSES or "complete" in token:
        return "Completed"
    return str(value).strip() if value is not None else ""


def status_bucket(status: str | None) -> str:
    canonical = canonicalize_workflow_state(status)
    token = normalize_text(canonical)
    if token == normalize_text("Pending Re-Review by Moodys"):
        return "pending_rereview"
    if token == normalize_text("Pending Review by Moodys"):
        return "pending_review"
    if token == normalize_text("In Review by Moodys"):
        return "in_review"
    if token == normalize_text("Completed"):
        return "completed"
    if token == normalize_text("Uploading"):
        return "uploading"
    if token == normalize_text("Processing"):
        return "processing"
    return "other"


def infer_actor_type(actor_type: str | None, actor_name: str | None) -> str:
    joined = f"{actor_type or ''} {actor_name or ''}".lower()
    if "system" in joined or "ai " in joined or joined.startswith("ai"):
        return "System"
    if "user" in joined or "cognize" in joined or "moodys" in joined:
        return "User"
    return "User"


def seconds_between(end_time: dt.datetime, start_time: dt.datetime) -> float:
    return max(0.0, (end_time - start_time).total_seconds())


def parse_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    token = str(value).strip().lower()
    return token in {"1", "true", "yes", "y", "t", "on"}


def parse_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def excel_serial_to_datetime(serial: float) -> dt.datetime:
    epoch = dt.datetime(1899, 12, 30)
    return epoch + dt.timedelta(days=serial)


def parse_datetime(value) -> dt.datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, dt.datetime):
        return value
    if isinstance(value, dt.date):
        return dt.datetime.combine(value, dt.time())
    if isinstance(value, (int, float)):
        try:
            if 1.0 <= float(value) <= 100000.0:
                return excel_serial_to_datetime(float(value))
        except (ValueError, TypeError):
            pass

    text = str(value).strip()
    if not text:
        return None

    if text.replace(".", "", 1).isdigit():
        try:
            num = float(text)
            if 1.0 <= num <= 100000.0:
                return excel_serial_to_datetime(num)
        except (ValueError, TypeError):
            pass

    if text.endswith("Z"):
        text = text[:-1]
    text = text.replace("T", " ")

    datetime_formats = [
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%d/%m/%Y %I:%M:%S %p",
        "%d/%m/%Y %I:%M %p",
    ]

    result = None
    for fmt in datetime_formats:
        try:
            result = dt.datetime.strptime(text, fmt)
            break
        except ValueError:
            continue

    if result and result.year > 2400:
        try:
            result = result.replace(year=result.year - 543)
        except ValueError:
            pass

    return result


def build_canonical_map(row: dict) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in row.items():
        result[normalize_key(str(key))] = value
    return result


def pick_field(
    row: dict, aliases: set[str], canonical: dict[str, object] | None = None
):
    canonical_row = canonical if canonical is not None else build_canonical_map(row)
    for alias in aliases:
        if alias in canonical_row:
            return canonical_row[alias]
    return None


def calculate_effective_user_duration(interval: dict, is_auto_timeout: bool) -> float:
    if not is_auto_timeout:
        return interval["duration_seconds"]
    user_details = [
        event for event in interval["inner_events"] if event["actor_type"] == "User"
    ]
    if user_details:
        last_user_detail = sorted(user_details, key=lambda item: item["order_index"])[-1]
        effective_end = min(
            interval["end_time"],
            last_user_detail["event_time"] + dt.timedelta(minutes=ACTIVITY_GRACE_MINUTES_DEFAULT),
        )
    else:
        effective_end = min(
            interval["end_time"],
            interval["start_time"] + dt.timedelta(minutes=SESSION_TIMEOUT_MINUTES_DEFAULT),
        )
    return seconds_between(effective_end, interval["start_time"])


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
            # Check if next system detail after
            candidates = [
                ev for ev in ordered
                if ev["order_index"] > event["order_index"]
                and ev["actor_type"] == "System"
                and ev["change_type"] in SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES
            ]
            if not candidates:
                return event
        if (
            event["is_status_event"]
            and event["actor_type"] == "User"
            and event["from_status"] in PENDING_STATES
            and event["to_status"] == IN_REVIEW_STATE
        ):
            candidates = [
                ev for ev in ordered
                if ev["order_index"] < event["order_index"] and ev["actor_type"] == "System"
            ]
            previous_system = sorted(candidates, key=lambda item: item["order_index"])[-1] if candidates else None
            return previous_system or first_system_event

    candidates = [
        ev for ev in ordered
        if ev["order_index"] >= first_system_event["order_index"] and ev["actor_type"] == "System"
    ]
    return sorted(candidates, key=lambda item: item["order_index"])[-1] if candidates else first_system_event
