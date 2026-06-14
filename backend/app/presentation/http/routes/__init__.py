from __future__ import annotations

from flask import Flask

from .api import api_bp
from .web import web_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(api_bp)
    app.register_blueprint(web_bp)
