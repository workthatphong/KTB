from __future__ import annotations

from fastapi import APIRouter, Request, Depends, HTTPException, status

from ....application import use_cases
from ..auth import require_write_auth
from ....config.settings import UploadLimits, build_upload_limits
from ..uploads import RequestLimitError, validate_upload_payload

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
def api_health():
    return use_cases.build_health_payload()


@api_router.get("/sources")
def api_sources():
    return use_cases.api_sources_payload()


@api_router.get("/debug")
def api_debug():
    return use_cases.build_debug_snapshot()


@api_router.get("/user-performance")
def api_user_performance():
    return use_cases.compute_user_performance()


@api_router.get("/gsheet/connections")
def api_gsheet_connections():
    return use_cases.api_gsheet_connections_payload()


@api_router.get("/dashboard")
def api_dashboard(includeDebug: str = "", refreshSnapshot: str = ""):
    include_debug = includeDebug.strip().lower() in {"1", "true", "yes"}
    refresh_snapshot = refreshSnapshot.strip().lower() in {"1", "true", "yes"}
    return use_cases.api_dashboard_payload(
        include_debug=include_debug,
        refresh_snapshot=refresh_snapshot,
    )


@api_router.post("/upload", dependencies=[Depends(require_write_auth)])
async def api_upload(request: Request):
    try:
        limits = build_upload_limits()
        content_length = int(request.headers.get("content-length", 0))
        if content_length > limits.max_request_body_bytes:
            raise RequestLimitError(
                f"Request body exceeds limit ({limits.max_request_body_bytes} bytes)."
            )

        payload = await request.json()
        files = validate_upload_payload(
            payload,
            max_files=limits.max_files,
            max_file_bytes=limits.max_file_bytes,
            max_total_bytes=limits.max_total_decoded_bytes,
        )

        return use_cases.api_upload_payload(files)
    except RequestLimitError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@api_router.post("/gsheet/connect", dependencies=[Depends(require_write_auth)])
async def api_gsheet_connect(request: Request):
    try:
        payload = await request.json()
        url = str(payload.get("url", "")).strip()
        if not url:
            raise ValueError("Request must include a 'url' field with the Google Sheet URL.")
        return use_cases.api_connect_gsheet_payload(url)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@api_router.post("/gsheet/sync", dependencies=[Depends(require_write_auth)])
def api_gsheet_sync():
    try:
        return use_cases.api_sync_gsheet_payload()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@api_router.post("/settings", dependencies=[Depends(require_write_auth)])
async def api_update_settings(request: Request):
    try:
        payload = await request.json()
        return use_cases.api_update_settings_payload(payload)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@api_router.delete("/sources/{source_id:path}", dependencies=[Depends(require_write_auth)])
def api_source_delete(source_id: str):
    source_id = source_id.strip()
    if not source_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing source id")
    return use_cases.api_delete_source_payload(source_id)


@api_router.delete("/gsheet/{connection_id:path}", dependencies=[Depends(require_write_auth)])
def api_gsheet_delete(connection_id: str):
    connection_id = connection_id.strip()
    if not connection_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing connection id")
    return use_cases.api_delete_gsheet_payload(connection_id)
