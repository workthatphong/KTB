from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from ...infrastructure.db.sqlite_store import init_db
from .routes import register_routers
from ...config.settings import build_upload_limits

class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path or ""

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

        return response

def create_app() -> FastAPI:
    app = FastAPI(
        title="Dashboard API",
        description="API documentation for the KTB Dashboard",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    init_db()

    # We can attach upload limits to app.state
    app.state.UPLOAD_LIMITS = build_upload_limits()

    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(CacheControlMiddleware)

    register_routers(app)
    return app

app = create_app()
