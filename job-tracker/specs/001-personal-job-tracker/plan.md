# Implementation Plan: Personal Job Application Tracker

**Branch**: `001-personal-job-tracker` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-personal-job-tracker/spec.md`

## Summary

Build a private, local-only tracker for recording, updating, searching, filtering, and removing job applications. Use a Python Flask JSON API, a React single-page interface built with Vite and TypeScript, and a local SQLite database accessed through Python's standard `sqlite3` module. During development, Vite proxies API requests to Flask; for normal use, Flask serves the compiled React assets and API from the same loopback origin. This keeps deployment to one local process and avoids external services and an ORM.

## Technical Context

**Language/Version**: Python 3.11+; TypeScript 5.x and React 19; Node.js LTS for frontend development and builds

**Primary Dependencies**: Flask 3.x and Flask-WTF for API CSRF protection; React and React DOM; Vite; pytest, Vitest, and React Testing Library. Use native `fetch` for API requests and plain CSS; do not add a UI component framework or client state-management library.

**Storage**: SQLite via Python's standard library. Store the database in the app's private instance directory, not in static files or source control.

**Testing**: pytest with Flask's test client and a fresh temporary SQLite database per test; Vitest and React Testing Library for UI behavior. Cover API validation and persistence, create/edit/status/remove workflows, search/filter behavior, empty states, and accessible form feedback.

**Target Platform**: Local single-user web application, accessed in a current desktop or mobile browser. Bind Flask to `127.0.0.1` by default and do not expose a network-accessible deployment.

**Project Type**: Local web application with a React frontend and private Python API.

**Performance Goals**: For a personal-sized list of up to a few thousand applications, list, search, and status filtering should complete within 1 second on a typical desktop.

**Constraints**: Local-only; no public API, user accounts, collaboration, job-board integrations, or automated applications. Validate all writes on the server. Do not log application field values. Require CSRF tokens for state-changing API requests, use same-origin requests in production, and do not enable wildcard CORS. Keep the local database outside web-served directories and restrict access through normal local file permissions.

**Scale/Scope**: One local user, one application record type, a small React interface, and no external services.

## Constitution Check

*Gate: Pass before research and after design.*

- **Simplicity and maintainability**: Pass. The React/Vite frontend is included because React is an explicit product choice; keep it in one package, use Flask for the API and static build serving, and avoid extra services, ORM, UI framework, or state-management dependency.
- **Accessibility**: Pass if React controls use semantic HTML, associated labels, visible focus, keyboard-operable interactions, and field-associated errors; verify with component tests and keyboard navigation.
- **Personal information**: Pass for the local-only first version. Bind to loopback, keep the database private and out of static paths, avoid logging user-entered values, disallow wildcard CORS, and protect writes with CSRF tokens. Do not claim remote multi-user security.
- **Input validation**: Pass. Validate required text, dates, URLs, and status allowlists on the server, regardless of browser validation.
- **Workflow tests**: Pass. Cover create, list, edit, status change, search/filter, validation, empty states, and confirm/cancel removal with backend and frontend tests.

## Project Structure

### Documentation

```text
specs/001-personal-job-tracker/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── spec.md
```

The API contract documents the private same-origin interface used only by this frontend; it is not a public or third-party integration surface.

### Source Code

```text
job_tracker/
├── __init__.py          # Flask app factory, local binding, and static build serving
├── api.py               # JSON endpoints, CSRF protection, and API error responses
├── db.py                # SQLite connection, schema initialization, and queries
├── validation.py        # Server-side application field validation
└── static/              # Vite production build output; not hand-maintained

frontend/
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api.ts            # Same-origin API client and CSRF header
│   ├── components/
│   └── styles.css
├── vite.config.ts       # Dev proxy and production output path
├── tsconfig.json
└── package.json

tests/
├── conftest.py          # Flask app fixture and isolated temporary database
├── test_validation.py
└── test_api.py

frontend/src/**/*.test.tsx
pyproject.toml           # Python package metadata and pytest configuration
```

**Structure Decision**: Keep the Flask backend in one Python package and the React source in one `frontend/` package. The Vite development server proxies `/api` to Flask; the production build is served by Flask so normal use has a single local origin. Keep persistence, validation, and API handling in small focused modules, and avoid additional frontend abstractions unless the feature requires them.

## Complexity Tracking

No constitution violations or additional infrastructure are proposed.
