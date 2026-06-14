from __future__ import annotations

import gzip

from flask import Flask
from flask import request

from ...application import dashboard_service
from .routes import register_blueprints
from ...config.settings import build_upload_limits


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    dashboard_service.init_db()

    app.config["UPLOAD_LIMITS"] = build_upload_limits()

    @app.after_request
    def optimize_response_headers(response):
        path = request.path or ""

        if path.startswith("/api/") or path == "/" or path.endswith(".html"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        elif (
            path.startswith("/assets/")
            or path.startswith("/fonts/")
            or path.endswith(".svg")
            or path.endswith(".ico")
            or path.endswith(".ttf")
            or path.endswith(".woff")
            or path.endswith(".woff2")
        ):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

        accepted_encodings = request.headers.get("Accept-Encoding", "")
        should_gzip = (
            "gzip" in accepted_encodings.lower()
            and not response.direct_passthrough
            and 200 <= response.status_code < 300
            and "Content-Encoding" not in response.headers
            and response.mimetype in {
                "application/javascript",
                "application/json",
                "text/css",
                "text/html",
                "image/svg+xml",
            }
        )
        if should_gzip:
            raw = response.get_data()
            if len(raw) >= 1024:
                compressed = gzip.compress(raw, compresslevel=6)
                if len(compressed) < len(raw):
                    response.set_data(compressed)
                    response.headers["Content-Encoding"] = "gzip"
                    response.headers["Content-Length"] = str(len(compressed))
                    response.headers["Vary"] = "Accept-Encoding"
        return response

    register_blueprints(app)
    return app


app = create_app()
