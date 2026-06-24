from __future__ import annotations

import argparse
import base64
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

from ..infrastructure.db.sqlite_store import init_db
from . import payloads

def json_response(
    handler: SimpleHTTPRequestHandler, payload: dict, status: int = 200
) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)

def read_json_body(handler: SimpleHTTPRequestHandler) -> dict:
    from ..services.segmentation.engine import parse_int
    length = parse_int(handler.headers.get("Content-Length")) or 0
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))

class DashboardHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".jsx": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _handle_api_get(self, parsed) -> bool:
        if parsed.path == "/api/dashboard":
            query = parse_qs(parsed.query or "")
            include_debug = str(query.get("includeDebug", [""])[0]).strip() in {"1", "true", "yes"}
            refresh_snapshot = str(query.get("refreshSnapshot", [""])[0]).strip() in {"1", "true", "yes"}
            json_response(
                self,
                payloads.api_dashboard_payload(
                    include_debug=include_debug,
                    refresh_snapshot=refresh_snapshot,
                ),
            )
            return True

        routes = {
            "/api/health": payloads.build_health_payload,
            "/api/sources": payloads.api_sources_payload,
            "/api/debug": payloads.build_debug_snapshot,
            "/api/user-performance": payloads.compute_user_performance,
            "/api/gsheet/connections": payloads.api_gsheet_connections_payload,
        }
        if parsed.path in routes:
            json_response(self, routes[parsed.path]())
            return True
        return False

    def _handle_api_post(self, parsed) -> bool:
        if parsed.path == "/api/upload":
            try:
                payload = read_json_body(self)
                files = payload.get("files", [])
                ingest_files = []
                for item in files:
                    binary = base64.b64decode(item.get("contentBase64"))
                    ingest_files.append((item.get("name"), binary))
                json_response(self, payloads.api_upload_payload(ingest_files))
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        if parsed.path == "/api/gsheet/connect":
            try:
                payload = read_json_body(self)
                json_response(self, payloads.api_connect_gsheet_payload(payload.get("url", "")))
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        if parsed.path == "/api/gsheet/sync":
            try:
                json_response(self, payloads.api_sync_gsheet_payload())
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        if parsed.path == "/api/settings":
            try:
                payload = read_json_body(self)
                json_response(self, payloads.api_update_settings_payload(payload))
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        return False

    def _handle_api_delete(self, parsed) -> bool:
        if parsed.path.startswith("/api/sources/"):
            source_id = unquote(parsed.path.replace("/api/sources/", "", 1)).strip()
            json_response(self, payloads.api_delete_source_payload(source_id))
            return True
        if parsed.path.startswith("/api/gsheet/"):
            connection_id = unquote(parsed.path.replace("/api/gsheet/", "", 1)).strip()
            json_response(self, payloads.api_delete_gsheet_payload(connection_id))
            return True
        return False

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if not self._handle_api_get(parsed):
                json_response(self, {"error": "Not found"}, status=404)
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if not self._handle_api_post(parsed):
                json_response(self, {"error": "Not found"}, status=404)
            return
        json_response(self, {"error": "Not found"}, status=404)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if not self._handle_api_delete(parsed):
                json_response(self, {"error": "Not found"}, status=404)
            return
        json_response(self, {"error": "Not found"}, status=404)

def run_server(port: int) -> None:
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", port), DashboardHandler)
    print(f"Dashboard server running at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    run_server(args.port)
