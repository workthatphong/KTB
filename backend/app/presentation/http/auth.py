from __future__ import annotations

import hmac
import os
from http import HTTPStatus

from flask import jsonify, request

from ...config.settings import WRITE_TOKEN_ENV_NAME


def configured_write_token() -> str:
    return os.getenv(WRITE_TOKEN_ENV_NAME, "").strip()


def extract_write_token_from_request() -> str:
    authorization = request.headers.get("Authorization", "").strip()
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return (
        request.headers.get("X-Write-Token", "").strip()
        or request.headers.get("X-API-Key", "").strip()
    )


def require_write_auth():
    expected_token = configured_write_token()
    if not expected_token:
        return None

    provided_token = extract_write_token_from_request()
    if provided_token and hmac.compare_digest(provided_token, expected_token):
        return None

    return (
        jsonify(
            {
                "error": (
                    "Unauthorized write request. Provide Authorization: Bearer <token> "
                    "or X-Write-Token header."
                )
            }
        ),
        HTTPStatus.UNAUTHORIZED,
    )
