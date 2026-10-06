import sqlite3
from datetime import date

from job_tracker import create_app


def application_payload(**overrides):
    payload = {
        "company": "Example Co",
        "role": "Claims Analyst",
        "date_applied": date.today().isoformat(),
    }
    payload.update(overrides)
    return payload


def create_application(client, csrf_headers, **overrides):
    return client.post(
        "/api/applications",
        json=application_payload(**overrides),
        headers=csrf_headers,
    )


def test_create_defaults_to_applied_and_list_returns_saved_record(client, csrf_headers):
    response = create_application(client, csrf_headers)

    assert response.status_code == 201
    saved = response.json
    assert saved["status"] == "Applied"
    assert saved["company"] == "Example Co"

    listed = client.get("/api/applications")
    assert listed.status_code == 200
    assert listed.json["applications"] == [saved]


def test_edit_updates_existing_record_and_preserves_unchanged_fields(client, csrf_headers):
    created = create_application(client, csrf_headers, notes="Initial note")
    application_id = created.json["id"]

    edited = client.put(
        f"/api/applications/{application_id}",
        json={"role": "Senior Claims Analyst"},
        headers=csrf_headers,
    )

    assert edited.status_code == 200
    assert edited.json["id"] == application_id
    assert edited.json["role"] == "Senior Claims Analyst"
    assert edited.json["company"] == "Example Co"
    assert edited.json["notes"] == "Initial note"


def test_invalid_edit_does_not_partially_update_record(client, csrf_headers):
    created = create_application(client, csrf_headers)
    application_id = created.json["id"]

    response = client.put(
        f"/api/applications/{application_id}",
        json={"company": "Changed Co", "job_url": "javascript:bad()"},
        headers=csrf_headers,
    )

    assert response.status_code == 400
    assert "job_url" in response.json["fields"]
    saved = client.get(f"/api/applications/{application_id}").json
    assert saved["company"] == "Example Co"


def test_create_requires_csrf_token(client):
    response = client.post("/api/applications", json=application_payload())

    assert response.status_code == 400
    assert "CSRF" in response.json["error"]


def test_search_and_status_filters_combine(client, csrf_headers):
    create_application(client, csrf_headers, company="Northwind", role="Adjuster")
    create_application(
        client,
        csrf_headers,
        company="Northwind",
        role="Manager",
        status="Interview",
    )
    create_application(
        client,
        csrf_headers,
        company="Contoso",
        role="Adjuster",
        status="Interview",
    )

    response = client.post(
        "/api/applications/search",
        json={"q": "nOrTh", "status": "Interview"},
    )

    assert response.status_code == 200
    assert len(response.json["applications"]) == 1
    assert response.json["applications"][0]["company"] == "Northwind"
    assert response.json["applications"][0]["role"] == "Manager"


def test_search_treats_like_wildcards_as_literal_text(client, csrf_headers):
    create_application(client, csrf_headers, company="100% Careers")
    create_application(client, csrf_headers, company="100X Careers")

    response = client.post("/api/applications/search", json={"q": "100%"})

    assert response.status_code == 200
    assert [item["company"] for item in response.json["applications"]] == [
        "100% Careers"
    ]


def test_invalid_status_filter_is_rejected(client):
    response = client.post(
        "/api/applications/search", json={"status": "Screening"}
    )

    assert response.status_code == 400
    assert "status" in response.json["fields"]


def test_action_dates_and_new_pipeline_stages_persist(client, csrf_headers):
    created = create_application(
        client,
        csrf_headers,
        status="Applied",
        follow_up_date="2026-10-10",
        interview_date="2026-10-12",
        assessment_date="2026-10-13",
        deadline_date="2026-10-14",
    )

    assert created.status_code == 201
    assert created.json["status"] == "Applied"
    assert created.json["follow_up_date"] == "2026-10-10"
    assert created.json["interview_date"] == "2026-10-12"
    assert created.json["assessment_date"] == "2026-10-13"
    assert created.json["deadline_date"] == "2026-10-14"


def test_status_change_persists_without_changing_other_fields(client, csrf_headers):
    created = create_application(client, csrf_headers, notes="Keep these notes").json

    response = client.put(
        f"/api/applications/{created['id']}",
        json={"status": "Interview"},
        headers=csrf_headers,
    )

    assert response.status_code == 200
    assert response.json["status"] == "Interview"
    assert response.json["company"] == "Example Co"
    assert response.json["notes"] == "Keep these notes"
    assert client.get(f"/api/applications/{created['id']}").json["status"] == "Interview"


def test_unexpected_api_error_does_not_expose_exception_details(client, app, monkeypatch):
    from job_tracker import db

    def fail_query(*_args, **_kwargs):
        raise RuntimeError("sensitive application note")

    monkeypatch.setattr(db, "list_applications", fail_query)
    response = client.get("/api/applications")

    assert response.status_code == 500
    assert response.json == {"error": "An unexpected error occurred."}
    assert "sensitive application note" not in response.get_data(as_text=True)


def test_search_with_no_matches_returns_empty_collection(client):
    response = client.post("/api/applications/search", json={"q": "missing"})

    assert response.status_code == 200
    assert response.json["applications"] == []


def test_delete_removes_only_selected_application(client, csrf_headers):
    first = create_application(client, csrf_headers, company="First Co").json
    second = create_application(client, csrf_headers, company="Second Co").json

    response = client.delete(
        f"/api/applications/{first['id']}", headers=csrf_headers
    )

    assert response.status_code == 204
    assert client.get(f"/api/applications/{first['id']}").status_code == 404
    assert client.get(f"/api/applications/{second['id']}").json["company"] == "Second Co"


def test_unknown_application_returns_not_found(client, csrf_headers):
    assert client.get("/api/applications/999").status_code == 404
    assert client.put(
        "/api/applications/999",
        json=application_payload(),
        headers=csrf_headers,
    ).status_code == 404
    assert client.delete("/api/applications/999", headers=csrf_headers).status_code == 404

def test_existing_database_is_migrated_without_losing_applications(tmp_path):
    database_path = tmp_path / "legacy.sqlite3"
    connection = sqlite3.connect(database_path)
    connection.executescript(
        """
        CREATE TABLE applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT NOT NULL,
            role TEXT NOT NULL,
            job_url TEXT,
            date_applied TEXT NOT NULL,
            status TEXT NOT NULL CHECK (
                status IN ('Applied', 'Assessment', 'Interview', 'Offer', 'Rejected')
            ),
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX idx_applications_date_id
            ON applications(date_applied DESC, id DESC);
        CREATE INDEX idx_applications_status ON applications(status);
        INSERT INTO applications
            (company, role, date_applied, status, created_at, updated_at)
        VALUES
            ('Legacy Co', 'Claims Analyst', '2026-09-29', 'Interview',
             '2026-09-29T10:00:00+00:00', '2026-09-29T10:00:00+00:00');
        """
    )
    connection.close()

    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "migration-test-secret",
            "DATABASE": str(database_path),
        }
    )

    with app.test_client() as client:
        response = client.get("/api/applications")

    assert response.status_code == 200
    migrated = response.json["applications"][0]
    assert migrated["company"] == "Legacy Co"
    assert migrated["status"] == "Interview"
    assert migrated["follow_up_date"] is None
    assert migrated["deadline_date"] is None