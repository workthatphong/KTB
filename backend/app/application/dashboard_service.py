from __future__ import annotations

import argparse
import base64
import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

from ..config.constants.constants_paths import DB_PATH, PROJECT_ROOT
from ..config.constants.constants_runtime import APP_VERSION, SERVER_STARTED_AT
from ..infrastructure.db.sqlite_store import (
    ensure_dashboard_snapshot_from_supabase_if_needed,
    ensure_fresh_from_supabase_if_enabled,
    ensure_full_raw_state_from_supabase_if_enabled,
    init_db,
)
from ..infrastructure.parsers import tabular_parser
from ..services.analytics import user_performance as analytics_service
from ..services import dashboard_snapshot as dashboard_snapshot_service
from ..services.segmentation import engine as segmentation_engine
from ..services.sync import data_manager

# Re-export key functions from modularized services for backward compatibility
# and use by DashboardHandler / api.py.
utc_now_iso = data_manager.utc_now_iso
invalidate_runtime_caches = data_manager.invalidate_runtime_caches
ingest_file = data_manager.ingest_file
list_sources = data_manager.list_sources
delete_source = data_manager.delete_source
connect_gsheet = data_manager.connect_gsheet
sync_all_gsheets = data_manager.sync_all_gsheets
disconnect_gsheet = data_manager.disconnect_gsheet
list_gsheet_connections = data_manager.list_gsheet_connections

# Legacy alias
import_google_sheet = connect_gsheet

# Segmentation engine exports
build_canonical_map = segmentation_engine.build_canonical_map
pick_field = segmentation_engine.pick_field
assign_time_group = segmentation_engine.assign_time_group
fetch_normalized_events = segmentation_engine.fetch_normalized_events
build_segments_for_document = segmentation_engine.build_segments_for_document
countable_segment_seconds = segmentation_engine.countable_segment_seconds
normalize_text = segmentation_engine.normalize_text

def refresh_runtime_data() -> None:
    ensure_fresh_from_supabase_if_enabled()


def refresh_dashboard_snapshot_data() -> None:
    ensure_dashboard_snapshot_from_supabase_if_needed()


# Analytics service exports
def compute_user_performance() -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    refresh_runtime_data()
    return analytics_service.compute_user_performance()


def build_debug_snapshot() -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    refresh_runtime_data()
    return analytics_service.build_debug_snapshot()


def build_health_payload() -> dict:
    return analytics_service.build_health_payload()

# Response payload helpers
def api_sources_payload() -> dict:
    payload = api_dashboard_payload(include_debug=False)
    return {"sources": payload.get("sources", [])}

def api_gsheet_connections_payload() -> dict:
    payload = api_dashboard_payload(include_debug=False)
    return {"connections": payload.get("connections", [])}

def api_dashboard_payload(
    include_debug: bool = False,
    refresh_snapshot: bool = False,
) -> dict:
    payload = None
    if refresh_snapshot:
        ensure_full_raw_state_from_supabase_if_enabled()
        refresh_runtime_data()
        payload = dashboard_snapshot_service.rebuild_dashboard_snapshot(sync_remote=True)
    else:
        payload = dashboard_snapshot_service.get_dashboard_snapshot_payload()
    if payload is None:
        refresh_dashboard_snapshot_data()
        payload = dashboard_snapshot_service.get_dashboard_snapshot_payload()
    if payload is None:
        ensure_full_raw_state_from_supabase_if_enabled()
        refresh_runtime_data()
        payload = dashboard_snapshot_service.rebuild_dashboard_snapshot(sync_remote=True)

    payload = {
        **payload,
        "healthInfo": analytics_service.build_health_payload(),
    }
    if include_debug:
        payload["debugInfo"] = build_debug_snapshot()
    return payload

def api_upload_payload(files: list[tuple[str, bytes]]) -> dict:
    uploaded = [ingest_file(name, binary) for name, binary in files]
    return {"uploaded": uploaded}

def api_connect_gsheet_payload(url: str) -> dict:
    result = connect_gsheet(url)
    return {
        "connected": result,
        **api_gsheet_connections_payload(),
        **api_sources_payload(),
    }

def api_sync_gsheet_payload() -> dict:
    results = sync_all_gsheets()
    return {
        "synced": results,
        **api_sources_payload(),
        **api_gsheet_connections_payload(),
    }

def api_delete_source_payload(source_id: str) -> dict:
    delete_source(source_id)
    return {"ok": True, **api_sources_payload()}

def api_delete_gsheet_payload(connection_id: str) -> dict:
    disconnect_gsheet(connection_id)
    return {
        "ok": True,
        **api_gsheet_connections_payload(),
        **api_sources_payload(),
    }

def api_update_settings_payload(new_settings: dict) -> dict:
    updated = dashboard_snapshot_service.update_dashboard_settings(new_settings)
    return {"settings": updated}

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
                api_dashboard_payload(
                    include_debug=include_debug,
                    refresh_snapshot=refresh_snapshot,
                ),
            )
            return True

        routes = {
            "/api/health": build_health_payload,
            "/api/sources": api_sources_payload,
            "/api/debug": build_debug_snapshot,
            "/api/user-performance": compute_user_performance,
            "/api/gsheet/connections": api_gsheet_connections_payload,
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
                json_response(self, api_upload_payload(ingest_files))
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        if parsed.path == "/api/gsheet/connect":
            try:
                payload = read_json_body(self)
                json_response(self, api_connect_gsheet_payload(payload.get("url", "")))
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        if parsed.path == "/api/gsheet/sync":
            try:
                json_response(self, api_sync_gsheet_payload())
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        if parsed.path == "/api/settings":
            try:
                payload = read_json_body(self)
                json_response(self, api_update_settings_payload(payload))
                return True
            except Exception as exc:
                json_response(self, {"error": str(exc)}, status=400)
                return True

        return False

    def _handle_api_delete(self, parsed) -> bool:
        if parsed.path.startswith("/api/sources/"):
            source_id = unquote(parsed.path.replace("/api/sources/", "", 1)).strip()
            json_response(self, api_delete_source_payload(source_id))
            return True
        if parsed.path.startswith("/api/gsheet/"):
            connection_id = unquote(parsed.path.replace("/api/gsheet/", "", 1)).strip()
            json_response(self, api_delete_gsheet_payload(connection_id))
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

if __name__ == "__main__":
    main()
