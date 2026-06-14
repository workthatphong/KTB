from __future__ import annotations

from http import HTTPStatus
from pathlib import Path

from flask import Blueprint, jsonify, send_from_directory

from ....application import dashboard_service
from ....infrastructure.static_files import serve_static_file

web_bp = Blueprint("web", __name__)


def _frontend_dist_dir() -> Path:
    return dashboard_service.PROJECT_ROOT / "frontend" / "dist"


@web_bp.get("/")
def web_index():
    dist_dir = _frontend_dist_dir()
    index_path = dist_dir / "index.html"
    if not index_path.is_file():
        return (
            "Frontend build is missing. Run `npm install` and `npm run build` from the project root.",
            HTTPStatus.SERVICE_UNAVAILABLE,
            {"Content-Type": "text/plain; charset=utf-8"},
        )
    return send_from_directory(dist_dir, "index.html")


@web_bp.get("/<path:filename>")
def web_static(filename: str):
    head_segment = filename.split("/", 1)[0].lower()
    if head_segment == "api":
        return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND

    static_response = serve_static_file(dashboard_service.PROJECT_ROOT, filename)
    if static_response is not None:
        return static_response

    if "." in Path(filename).name:
        return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND

    dist_dir = _frontend_dist_dir()
    index_path = dist_dir / "index.html"
    if not index_path.is_file():
        return jsonify({"error": "Frontend build is missing"}), HTTPStatus.SERVICE_UNAVAILABLE

    return send_from_directory(dist_dir, "index.html")
