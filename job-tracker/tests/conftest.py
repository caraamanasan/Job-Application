from __future__ import annotations

import pytest

from job_tracker import create_app


@pytest.fixture
def app(tmp_path):
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret-key",
            "DATABASE": str(tmp_path / "applications.sqlite3"),
        }
    )


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def csrf_headers(client):
    response = client.get("/api/csrf")
    assert response.status_code == 200
    return {"X-CSRFToken": response.json["csrf_token"]}