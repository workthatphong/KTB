from __future__ import annotations

from pathlib import Path, PurePosixPath

from flask import send_from_directory

ROOT_STATIC_ALLOWLIST = {"favicon.ico", "robots.txt", "manifest.webmanifest"}
FRONTEND_DIST_PREFIX = "assets/"


def normalize_relative_url_path(url_path: str) -> str | None:
    if not isinstance(url_path, str):
        return None

    normalized = PurePosixPath(url_path.strip().lstrip("/")).as_posix()
    if not normalized:
        return None

    path_parts = PurePosixPath(normalized).parts
    if any(part in ("", ".", "..") for part in path_parts):
        return None
    if "\\" in normalized or ":" in normalized:
        return None

    return normalized


def is_allowed_static_path(normalized_path: str) -> bool:
    if normalized_path in ROOT_STATIC_ALLOWLIST:
        return True
    if normalized_path.startswith(FRONTEND_DIST_PREFIX):
        return True
    return False


def resolve_static_file(project_root: Path, url_path: str) -> Path | None:
    normalized_path = normalize_relative_url_path(url_path)
    if not normalized_path:
        return None

    dist_root = project_root / "frontend" / "dist"
    public_root = project_root / "frontend" / "public"

    if is_allowed_static_path(normalized_path):
        candidate = (dist_root / normalized_path).resolve()
        try:
            candidate.relative_to(dist_root)
            if candidate.is_file():
                return candidate
        except ValueError:
            pass

    public_candidate = (public_root / normalized_path).resolve()
    try:
        public_candidate.relative_to(public_root)
        if public_candidate.is_file():
            return public_candidate
    except ValueError:
        pass

    dist_candidate = (dist_root / normalized_path).resolve()
    try:
        dist_candidate.relative_to(dist_root)
        if dist_candidate.is_file():
            return dist_candidate
    except ValueError:
        pass

    return None


def serve_static_file(project_root: Path, url_path: str):
    static_file = resolve_static_file(project_root, url_path)
    if static_file is None:
        return None

    mimetype = "application/javascript" if static_file.suffix.lower() in {".js", ".mjs"} else None
    return send_from_directory(static_file.parent, static_file.name, mimetype=mimetype)
