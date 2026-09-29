from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_wtf.csrf import CSRFError, generate_csrf

from . import csrf, db
from .validation import STATUSES, validate_application


api = Blueprint("api", __name__, url_prefix="/api")


@api.get("/csrf")
def csrf_token():
    return jsonify(csrf_token=generate_csrf())


@api.errorhandler(CSRFError)
def handle_csrf_error(_error: CSRFError):
    return jsonify(error="CSRF validation failed."), 400


@api.errorhandler(Exception)
def handle_unexpected_api_error(_error: Exception):
    return jsonify(error="An unexpected error occurred."), 500


def _json_body() -> dict | None:
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else None


def _validation_response(errors: dict):
    return jsonify(error="Validation failed.", fields=errors), 400


@api.get("/applications")
def list_applications():
    return jsonify(applications=db.list_applications())


@api.post("/applications/search")
@csrf.exempt
def search_applications():
    body = _json_body()
    if body is None:
        return _validation_response({"_form": "Provide search filters as a JSON object."})
    if set(body) - {"q", "status"}:
        return _validation_response({"_form": "The request contains unsupported fields."})

    search = body.get("q", "")
    if not isinstance(search, str):
        return _validation_response({"q": "Search must be text."})
    search = search.strip()
    status = body.get("status") or None
    if status is not None and not isinstance(status, str):
        return _validation_response({"status": "Choose a supported application status."})
    if status is not None:
        status = status.strip() or None
    if status is not None and status not in STATUSES:
        return _validation_response({"status": "Choose a supported application status."})
    return jsonify(applications=db.list_applications(search, status))


@api.get("/applications/<int:application_id>")
def get_application(application_id: int):
    application = db.get_application(application_id)
    if application is None:
        return jsonify(error="Application not found."), 404
    return jsonify(application)


@api.post("/applications")
def create_application():
    body = _json_body()
    if body is None:
        return _validation_response({"_form": "Provide application details as a JSON object."})
    values, errors = validate_application(body)
    if errors:
        return _validation_response(errors)
    return jsonify(db.create_application(values)), 201


@api.put("/applications/<int:application_id>")
def update_application(application_id: int):
    current = db.get_application(application_id)
    if current is None:
        return jsonify(error="Application not found."), 404
    body = _json_body()
    if body is None:
        return _validation_response({"_form": "Provide application details as a JSON object."})
    values, errors = validate_application(body, current)
    if errors:
        return _validation_response(errors)
    return jsonify(db.update_application(application_id, values))


@api.delete("/applications/<int:application_id>")
def remove_application(application_id: int):
    if not db.delete_application(application_id):
        return jsonify(error="Application not found."), 404
    return "", 204