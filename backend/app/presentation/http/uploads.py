from __future__ import annotations

import base64
import binascii
from pathlib import Path

UPLOAD_ALLOWED_EXTENSIONS = {".csv", ".xlsx"}


class RequestLimitError(ValueError):
    """Raised when request size exceeds configured limits."""


def validate_upload_payload(
    payload: object,
    *,
    max_files: int,
    max_file_bytes: int,
    max_total_bytes: int,
) -> list[tuple[str, bytes]]:
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")

    files = payload.get("files")
    if not isinstance(files, list) or not files:
        raise ValueError("Request must include files[].")
    if len(files) > max_files:
        raise RequestLimitError(f"Too many files. Maximum is {max_files}.")

    decoded_files: list[tuple[str, bytes]] = []
    total_decoded_bytes = 0
    for index, item in enumerate(files):
        if not isinstance(item, dict):
            raise ValueError(f"files[{index}] must be an object.")

        name = str(item.get("name", "")).strip()
        content_base64 = item.get("contentBase64")
        if not name or not isinstance(content_base64, str) or not content_base64.strip():
            raise ValueError(f"files[{index}] must include 'name' and 'contentBase64'.")

        suffix = Path(name).suffix.lower()
        if suffix not in UPLOAD_ALLOWED_EXTENSIONS:
            allowed_suffixes = ", ".join(sorted(UPLOAD_ALLOWED_EXTENSIONS))
            raise ValueError(
                f"files[{index}] has unsupported extension '{suffix}'. Allowed: {allowed_suffixes}."
            )

        try:
            binary = base64.b64decode(content_base64, validate=True)
        except (binascii.Error, ValueError):
            raise ValueError(f"files[{index}] has invalid base64 content.") from None

        if not binary:
            raise ValueError(f"files[{index}] is empty after decode.")
        if len(binary) > max_file_bytes:
            raise RequestLimitError(
                f"files[{index}] exceeds max file size ({max_file_bytes} bytes)."
            )

        total_decoded_bytes += len(binary)
        if total_decoded_bytes > max_total_bytes:
            raise RequestLimitError(
                f"Decoded payload exceeds max total size ({max_total_bytes} bytes)."
            )

        decoded_files.append((name, binary))

    return decoded_files
