from __future__ import annotations

import os
import secrets
from pathlib import Path

from flask import Flask, abort, jsonify, send_from_directory
from flask_wtf.csrf import CSRFProtect

from . import db


csrf = CSRFProtect()


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("JOB_TRACKER_SECRET") or secrets.token_hex(32),
        DATABASE=str(Path(app.instance_path) / "applications.sqlite3"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        WTF_CSRF_HEADERS=["X-CSRFToken"],
    )
    if test_config:
        app.config.update(test_config)

    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    db.init_app(app)
    csrf.init_app(app)

    from .api import api

    app.register_blueprint(api)

    with app.app_context():
        db.init_db()

    @app.after_request
    def add_private_response_headers(response):
        response.headers.setdefault("Cache-Control", "private, no-store")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        return response

    @app.get("/")
    def frontend():
        index_file = Path(app.static_folder or "") / "index.html"
        if not index_file.is_file():
            return jsonify(error="Frontend build not found. Run npm run build."), 503
        return send_from_directory(app.static_folder, "index.html")

    @app.get("/<path:asset_path>")
    def frontend_route(asset_path: str):
        if asset_path.startswith("api/"):
            abort(404)
        static_file = Path(app.static_folder or "") / asset_path
        if static_file.is_file():
            return send_from_directory(app.static_folder, asset_path)
        index_file = Path(app.static_folder or "") / "index.html"
        if index_file.is_file():
            return send_from_directory(app.static_folder, "index.html")
        abort(404)

    return app