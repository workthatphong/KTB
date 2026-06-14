from __future__ import annotations

from http import HTTPStatus

from flask import Blueprint, current_app, jsonify, request

from ....application import dashboard_service
from ..auth import require_write_auth
from ....config.settings import UploadLimits
from ..uploads import RequestLimitError, validate_upload_payload

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.get("/health")
def api_health():
    return jsonify(dashboard_service.build_health_payload())


@api_bp.get("/sources")
def api_sources():
    return jsonify(dashboard_service.api_sources_payload())


@api_bp.get("/debug")
def api_debug():
    return jsonify(dashboard_service.build_debug_snapshot())


@api_bp.get("/user-performance")
def api_user_performance():
    return jsonify(dashboard_service.compute_user_performance())


@api_bp.get("/gsheet/connections")
def api_gsheet_connections():
    return jsonify(dashboard_service.api_gsheet_connections_payload())

@api_bp.get("/dashboard")
def api_dashboard():
    include_debug = str(request.args.get("includeDebug", "")).strip().lower() in {
        "1",
        "true",
        "yes",
    }
    return jsonify(dashboard_service.api_dashboard_payload(include_debug=include_debug))


@api_bp.post("/upload")
def api_upload():
    auth_error = require_write_auth()
    if auth_error is not None:
        return auth_error

    try:
        limits: UploadLimits = current_app.config["UPLOAD_LIMITS"]
        content_length = request.content_length or 0
        if content_length > limits.max_request_body_bytes:
            raise RequestLimitError(
                f"Request body exceeds limit ({limits.max_request_body_bytes} bytes)."
            )

        payload = request.get_json(silent=True)
        files = validate_upload_payload(
            payload,
            max_files=limits.max_files,
            max_file_bytes=limits.max_file_bytes,
            max_total_bytes=limits.max_total_decoded_bytes,
        )

        return jsonify(dashboard_service.api_upload_payload(files))
    except RequestLimitError as exc:
        return jsonify({"error": str(exc)}), HTTPStatus.REQUEST_ENTITY_TOO_LARGE
    except Exception as exc:  # pragma: no cover - runtime path
        return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST


@api_bp.post("/gsheet/connect")
def api_gsheet_connect():
    auth_error = require_write_auth()
    if auth_error is not None:
        return auth_error

    try:
        payload = request.get_json(silent=True) or {}
        url = str(payload.get("url", "")).strip()
        if not url:
            raise ValueError("Request must include a 'url' field with the Google Sheet URL.")
        return jsonify(dashboard_service.api_connect_gsheet_payload(url))
    except Exception as exc:  # pragma: no cover - runtime path
        return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST


@api_bp.post("/gsheet/sync")
def api_gsheet_sync():
    auth_error = require_write_auth()
    if auth_error is not None:
        return auth_error

    try:
        return jsonify(dashboard_service.api_sync_gsheet_payload())
    except Exception as exc:  # pragma: no cover - runtime path
        return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST


@api_bp.delete("/sources/<path:source_id>")
def api_source_delete(source_id: str):
    auth_error = require_write_auth()
    if auth_error is not None:
        return auth_error

    source_id = source_id.strip()
    if not source_id:
        return jsonify({"error": "Missing source id"}), HTTPStatus.BAD_REQUEST
    return jsonify(dashboard_service.api_delete_source_payload(source_id))


@api_bp.delete("/gsheet/<path:connection_id>")
def api_gsheet_delete(connection_id: str):
    auth_error = require_write_auth()
    if auth_error is not None:
        return auth_error

    connection_id = connection_id.strip()
    if not connection_id:
        return jsonify({"error": "Missing connection id"}), HTTPStatus.BAD_REQUEST
    return jsonify(dashboard_service.api_delete_gsheet_payload(connection_id))
