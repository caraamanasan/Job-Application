from datetime import date, timedelta

from job_tracker.validation import STATUSES, validate_application


def valid_values(**overrides):
    values = {
        "company": "Example Co",
        "role": "Claims Analyst",
        "date_applied": date.today().isoformat(),
    }
    values.update(overrides)
    return values


def test_required_fields_are_trimmed_and_default_status_is_applied():
    values, errors = validate_application(
        valid_values(company=" Example Co ", role=" Claims Analyst ")
    )

    assert errors == {}
    assert values["company"] == "Example Co"
    assert values["role"] == "Claims Analyst"
    assert values["status"] == "Applied"
    assert values["job_url"] is None
    assert values["notes"] is None


def test_blank_required_fields_are_rejected():
    _values, errors = validate_application(valid_values(company=" ", role=""))

    assert "company" in errors
    assert "role" in errors


def test_invalid_and_future_dates_are_rejected():
    _, invalid_errors = validate_application(valid_values(date_applied="2026-02-31"))
    _, future_errors = validate_application(
        valid_values(date_applied=(date.today() + timedelta(days=1)).isoformat())
    )

    assert "date_applied" in invalid_errors
    assert "future" in future_errors["date_applied"]


def test_job_url_must_be_absolute_http_or_https():
    _, errors = validate_application(valid_values(job_url="javascript:alert(1)"))

    assert "job_url" in errors


def test_malformed_url_and_overlong_fields_are_rejected():
    _, malformed_url_errors = validate_application(valid_values(job_url="https://["))
    _, long_company_errors = validate_application(valid_values(company="C" * 201))
    _, long_notes_errors = validate_application(valid_values(notes="N" * 5001))

    assert "job_url" in malformed_url_errors
    assert "company" in long_company_errors
    assert "notes" in long_notes_errors


def test_valid_optional_fields_and_all_statuses_are_accepted():
    for status in STATUSES:
        values, errors = validate_application(
            valid_values(
                job_url="https://jobs.example.test/role",
                notes="Follow up next week",
                status=status,
            )
        )
        assert errors == {}
        assert values["status"] == status
        assert values["job_url"] == "https://jobs.example.test/role"


def test_action_dates_are_optional_and_validated():
    values, errors = validate_application(
        valid_values(
            follow_up_date="2026-10-10",
            interview_date="2026-10-12",
            assessment_date="2026-10-13",
            deadline_date="2026-10-14",
        )
    )

    assert errors == {}
    assert values["follow_up_date"] == "2026-10-10"
    assert values["deadline_date"] == "2026-10-14"

    _, invalid_errors = validate_application(valid_values(interview_date="2026-02-31"))
    assert "interview_date" in invalid_errors


def test_unsupported_fields_and_status_are_rejected():
    _, field_errors = validate_application(valid_values(admin=True))
    _, status_errors = validate_application(valid_values(status="Screening"))

    assert "_form" in field_errors
    assert "status" in status_errors