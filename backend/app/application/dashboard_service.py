from __future__ import annotations

# Re-export key constants
from ..config.constants.constants_paths import DB_PATH, PROJECT_ROOT
from ..config.constants.constants_runtime import APP_VERSION, SERVER_STARTED_AT
from ..infrastructure.db.sqlite_store import init_db

# Re-export from segmentation_engine
from ..services.segmentation import engine as segmentation_engine
build_canonical_map = segmentation_engine.build_canonical_map
pick_field = segmentation_engine.pick_field
assign_time_group = segmentation_engine.assign_time_group
fetch_normalized_events = segmentation_engine.fetch_normalized_events
build_segments_for_document = segmentation_engine.build_segments_for_document
countable_segment_seconds = segmentation_engine.countable_segment_seconds
normalize_text = segmentation_engine.normalize_text

# Re-export from data_manager
from ..services.sync import data_manager
utc_now_iso = data_manager.utc_now_iso
invalidate_runtime_caches = data_manager.invalidate_runtime_caches
ingest_file = data_manager.ingest_file
list_sources = data_manager.list_sources
delete_source = data_manager.delete_source
connect_gsheet = data_manager.connect_gsheet
sync_all_gsheets = data_manager.sync_all_gsheets
disconnect_gsheet = data_manager.disconnect_gsheet
list_gsheet_connections = data_manager.list_gsheet_connections
import_google_sheet = connect_gsheet  # Legacy alias

# Re-export from payloads
from .payloads import (
    refresh_runtime_data,
    refresh_dashboard_snapshot_data,
    compute_user_performance,
    build_debug_snapshot,
    build_health_payload,
    api_sources_payload,
    api_gsheet_connections_payload,
    api_dashboard_payload,
    api_upload_payload,
    api_connect_gsheet_payload,
    api_sync_gsheet_payload,
    api_delete_source_payload,
    api_delete_gsheet_payload,
    api_update_settings_payload,
)

# Re-export from legacy_server
from .legacy_server import (
    json_response,
    read_json_body,
    DashboardHandler,
    run_server,
    main,
)

if __name__ == "__main__":
    main()
