from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, PlainTextResponse

from ....config.constants.constants_paths import PROJECT_ROOT
from ....infrastructure.static_files import serve_static_file

web_router = APIRouter()


def _frontend_dist_dir() -> Path:
    return PROJECT_ROOT / "frontend" / "dist"


@web_router.get("/")
def web_index():
    dist_dir = _frontend_dist_dir()
    index_path = dist_dir / "index.html"
    if not index_path.is_file():
        return PlainTextResponse(
            "Frontend build is missing. Run `npm install` and `npm run build` from the project root.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return FileResponse(index_path)


@web_router.get("/{filename:path}")
def web_static(filename: str):
    head_segment = filename.split("/", 1)[0].lower()
    if head_segment == "api":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    static_response = serve_static_file(PROJECT_ROOT, filename)
    if static_response is not None:
        return static_response

    if "." in Path(filename).name:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    dist_dir = _frontend_dist_dir()
    index_path = dist_dir / "index.html"
    if not index_path.is_file():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Frontend build is missing")

    return FileResponse(index_path)
