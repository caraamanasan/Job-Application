from __future__ import annotations

from datetime import date
from urllib.parse import urlsplit


STATUSES = ("Applied", "Assessment", "Interview", "Offer", "Rejected")
EDITABLE_FIELDS = {"company", "role", "job_url", "date_applied", "status", "notes"}


def validate_application(data: object, existing: dict | None = None) -> tuple[dict, dict]:
    if not isinstance(data, dict):
        return {}, {"_form": "Provide application details as a JSON object."}

    unexpected = set(data) - EDITABLE_FIELDS
    if unexpected:
        return {}, {"_form": "The request contains unsupported fields."}

    values = dict(existing or {})
    values.update(data)
    errors: dict[str, str] = {}

    for field, label in (("company", "Company"), ("role", "Role")):
        raw_value = values.get(field)
        if not isinstance(raw_value, str) or not raw_value.strip():
            errors[field] = f"{label} is required."
        elif len(raw_value.strip()) > 200:
            errors[field] = f"{label} must be 200 characters or fewer."
        else:
            values[field] = raw_value.strip()

    raw_date = values.get("date_applied")
    if not isinstance(raw_date, str) or not raw_date.strip():
        errors["date_applied"] = "Date applied is required."
    else:
        try:
            parsed_date = date.fromisoformat(raw_date)
        except ValueError:
            errors["date_applied"] = "Enter a valid date."
        else:
            if parsed_date.isoformat() != raw_date:
                errors["date_applied"] = "Enter a valid date."
            elif parsed_date > date.today():
                errors["date_applied"] = "Date applied cannot be in the future."

    raw_url = values.get("job_url")
    if raw_url is None or raw_url == "":
        values["job_url"] = None
    elif not isinstance(raw_url, str):
        errors["job_url"] = "Enter a valid HTTP or HTTPS URL."
    else:
        candidate = raw_url.strip()
        if len(candidate) > 2048:
            errors["job_url"] = "Enter a valid HTTP or HTTPS URL."
        else:
            try:
                parsed_url = urlsplit(candidate)
                valid_url = (
                    parsed_url.scheme.lower() in {"http", "https"}
                    and bool(parsed_url.hostname)
                    and not any(character.isspace() for character in candidate)
                )
            except ValueError:
                valid_url = False
            if not valid_url:
                errors["job_url"] = "Enter a valid HTTP or HTTPS URL."
            else:
                values["job_url"] = candidate

    raw_status = values.get("status", "Applied")
    if raw_status not in STATUSES:
        errors["status"] = "Choose a supported application status."
    else:
        values["status"] = raw_status

    raw_notes = values.get("notes")
    if raw_notes is None or raw_notes == "":
        values["notes"] = None
    elif not isinstance(raw_notes, str):
        errors["notes"] = "Notes must be text."
    elif len(raw_notes) > 5000:
        errors["notes"] = "Notes must be 5000 characters or fewer."

    clean_values = {field: values.get(field) for field in EDITABLE_FIELDS}
    return clean_values, errors