from __future__ import annotations

import os
from dataclasses import dataclass

WRITE_TOKEN_ENV_NAME = "DASHBOARD_WRITE_TOKEN"
MAX_UPLOAD_REQUEST_BODY_BYTES = 40 * 1024 * 1024
MAX_UPLOAD_TOTAL_DECODED_BYTES = 25 * 1024 * 1024
MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024
MAX_UPLOAD_FILES = 10


@dataclass(frozen=True)
class UploadLimits:
    max_request_body_bytes: int
    max_total_decoded_bytes: int
    max_file_bytes: int
    max_files: int


def int_env(name: str, default_value: int) -> int:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return default_value
    try:
        parsed = int(raw_value)
    except ValueError:
        return default_value
    return parsed if parsed > 0 else default_value


def build_upload_limits() -> UploadLimits:
    return UploadLimits(
        max_request_body_bytes=int_env(
            "DASHBOARD_MAX_UPLOAD_REQUEST_BODY_BYTES",
            MAX_UPLOAD_REQUEST_BODY_BYTES,
        ),
        max_total_decoded_bytes=int_env(
            "DASHBOARD_MAX_UPLOAD_TOTAL_DECODED_BYTES",
            MAX_UPLOAD_TOTAL_DECODED_BYTES,
        ),
        max_file_bytes=int_env("DASHBOARD_MAX_UPLOAD_FILE_BYTES", MAX_UPLOAD_FILE_BYTES),
        max_files=int_env("DASHBOARD_MAX_UPLOAD_FILES", MAX_UPLOAD_FILES),
    )
