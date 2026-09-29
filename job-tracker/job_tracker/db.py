from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app, g


SCHEMA = """
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL CHECK (length(trim(company)) BETWEEN 1 AND 200),
    role TEXT NOT NULL CHECK (length(trim(role)) BETWEEN 1 AND 200),
    job_url TEXT CHECK (job_url IS NULL OR length(job_url) <= 2048),
    date_applied TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Applied'
        CHECK (status IN ('Applied', 'Assessment', 'Interview', 'Offer', 'Rejected')),
    notes TEXT CHECK (notes IS NULL OR length(notes) <= 5000),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_date_id
    ON applications(date_applied DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_applications_status
    ON applications(status);
"""


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        database_path = current_app.config["DATABASE"]
        if database_path != ":memory:":
            Path(database_path).parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        g.db = connection
    return g.db


def close_db(_error: BaseException | None = None) -> None:
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def init_db() -> None:
    get_db().executescript(SCHEMA)
    get_db().commit()


def init_app(app) -> None:
    app.teardown_appcontext(close_db)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _as_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None


def list_applications(search: str = "", status: str | None = None) -> list[dict]:
    clauses: list[str] = []
    parameters: list[str] = []
    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        clauses.append(
            "(company LIKE ? ESCAPE '\\' COLLATE NOCASE "
            "OR role LIKE ? ESCAPE '\\' COLLATE NOCASE)"
        )
        pattern = f"%{escaped}%"
        parameters.extend((pattern, pattern))
    if status:
        clauses.append("status = ?")
        parameters.append(status)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = get_db().execute(
        f"SELECT * FROM applications {where} ORDER BY date_applied DESC, id DESC",
        parameters,
    ).fetchall()
    return [dict(row) for row in rows]


def get_application(application_id: int) -> dict | None:
    row = get_db().execute(
        "SELECT * FROM applications WHERE id = ?", (application_id,)
    ).fetchone()
    return _as_dict(row)


def create_application(values: dict) -> dict:
    timestamp = _now()
    cursor = get_db().execute(
        """INSERT INTO applications
           (company, role, job_url, date_applied, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            values["company"],
            values["role"],
            values["job_url"],
            values["date_applied"],
            values["status"],
            values["notes"],
            timestamp,
            timestamp,
        ),
    )
    get_db().commit()
    return get_application(cursor.lastrowid)


def update_application(application_id: int, values: dict) -> dict | None:
    current = get_application(application_id)
    if current is None:
        return None
    get_db().execute(
        """UPDATE applications
           SET company = ?, role = ?, job_url = ?, date_applied = ?, status = ?,
               notes = ?, updated_at = ?
           WHERE id = ?""",
        (
            values["company"],
            values["role"],
            values["job_url"],
            values["date_applied"],
            values["status"],
            values["notes"],
            _now(),
            application_id,
        ),
    )
    get_db().commit()
    return get_application(application_id)


def delete_application(application_id: int) -> bool:
    cursor = get_db().execute(
        "DELETE FROM applications WHERE id = ?", (application_id,)
    )
    get_db().commit()
    return cursor.rowcount == 1