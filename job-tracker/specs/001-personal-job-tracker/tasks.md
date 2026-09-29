# Tasks: Personal Job Application Tracker

**Input**: Design documents from `specs/001-personal-job-tracker/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`

**Tests**: Included for all important workflows, as required by the project constitution. Backend tests use pytest; frontend tests use Vitest and React Testing Library.

**Organization**: Tasks are grouped by setup, shared foundation, then spec user story. A story is independently verifiable after the shared foundation is complete.

## Phase 1: Setup

**Purpose**: Establish the Python backend and React frontend packages in the planned repository layout.

- [X] T001 [P] Create `pyproject.toml` with Flask, Flask-WTF, pytest, and test configuration for Python 3.11+.
- [X] T002 [P] Create `frontend/package.json`, `frontend/tsconfig.json`, and `frontend/vite.config.ts` with React, TypeScript, Vite, Vitest, and React Testing Library dependencies and scripts.
- [X] T003 [P] Create the Python package and frontend source directories defined in `plan.md`.
- [X] T004 [P] Configure Vite to proxy `/api` to the loopback Flask development server and build production assets into `job_tracker/static/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Set up persistence, application configuration, request security, and the React shell before implementing user stories.

- [X] T005 Implement SQLite connection management and schema initialization for the Application entity in `job_tracker/db.py`.
- [X] T006 Implement the Flask app factory in `job_tracker/__init__.py`, using a private instance directory for the database and serving the production React build from the same origin.
- [X] T007 Implement CSRF token initialization and protection for state-changing JSON requests, same-origin policy, and generic API error responses in `job_tracker/api.py`.
- [X] T008 [P] Create the React entry point, application shell, and shared accessible layout in `frontend/src/main.tsx`, `frontend/src/App.tsx`, and `frontend/src/styles.css`.
- [X] T009 [P] Create isolated pytest app/database fixtures in `tests/conftest.py` and configure frontend test setup in `frontend/src/test-setup.ts`.
- [X] T010 Verify the app binds to `127.0.0.1` by default, the database is outside served paths, and local run/test commands in `specs/001-personal-job-tracker/quickstart.md` match the package scripts.

**Checkpoint**: Flask starts with an isolated database, React renders through Vite, and the API is protected for same-origin use. User-story work can now begin.

---

## Phase 3: User Story 1 - Record and maintain applications (Priority: P1)

**Goal**: Create, list, and edit application records with server-side validation and Applied as the default status.

**Independent Test**: Create a valid application, find it in the list with status Applied, edit it, and verify that the same record is updated. Invalid input must be rejected with field-specific messages and must not alter stored data.

### Tests for User Story 1

- [X] T011 [P] [US1] Add pytest coverage for create, list, retrieve, edit, default status, persistence, and invalid-input/no-partial-update behavior in `tests/test_api.py`.
- [X] T012 [P] [US1] Add React Testing Library coverage for the initial empty state, create/edit form, preserved values on validation errors, and accessible field feedback in `frontend/src/App.test.tsx`.

### Implementation for User Story 1

- [X] T013 [US1] Implement server-side validation for company, role, date, optional HTTP(S) URL, notes, and supported statuses in `job_tracker/validation.py`.
- [X] T014 [US1] Implement `GET /api/applications`, `GET /api/applications/{id}`, `POST /api/applications`, and `PUT /api/applications/{id}` with parameterized SQLite queries in `job_tracker/api.py` and `job_tracker/db.py`.
- [X] T015 [US1] Implement the same-origin JSON client, CSRF token handling, and typed Application data in `frontend/src/api.ts`.
- [X] T016 [US1] Implement the application list, initial empty state, add/edit form, and field-associated validation feedback in `frontend/src/App.tsx` and `frontend/src/components/`.
- [X] T017 [US1] Run the US1 pytest and Vitest suites; fix failures before marking the story complete.

**Checkpoint**: The user can create, list, and edit validated records; the new-record status defaults to Applied.

---

## Phase 4: User Story 2 - Track application progress (Priority: P1)

**Goal**: Let the user change an application's status to any supported value and immediately see the saved value.

**Independent Test**: Change an existing application's status through Applied, Assessment, Interview, Offer, and Rejected; verify each persists and can be changed without a forced sequence.

### Tests for User Story 2

- [X] T018 [P] [US2] Add pytest coverage for allowed statuses, invalid status rejection, and persisted status updates in `tests/test_api.py`.
- [X] T019 [P] [US2] Add React Testing Library coverage for keyboard-operable status selection and updated list display in `frontend/src/App.test.tsx`.

### Implementation for User Story 2

- [X] T020 [US2] Implement status updates through `PUT /api/applications/{id}` with server-side allowlist enforcement in `job_tracker/api.py` and `job_tracker/validation.py`.
- [X] T021 [US2] Add a labeled, keyboard-operable status control and accessible update feedback in `frontend/src/components/` and `frontend/src/App.tsx`.
- [X] T022 [US2] Run the US2 pytest and Vitest suites; confirm status updates do not create duplicate records or discard other fields.

**Checkpoint**: Each supported status is selectable and remains saved when the application is revisited.

---

## Phase 5: User Story 3 - Find relevant applications (Priority: P2)

**Goal**: Search by company or role and filter by status, including combined search and filter behavior and useful no-results feedback.

**Independent Test**: Seed records with different companies, roles, and statuses; verify case-insensitive company/role matching and each status filter individually and together.

### Tests for User Story 3

- [X] T023 [P] [US3] Add pytest coverage for trimmed case-insensitive company/role search, status filtering, combined AND behavior, and empty matches in `tests/test_api.py`.
- [X] T024 [P] [US3] Add React Testing Library coverage for search, status filter, clearing controls, no-results state, and keyboard access in `frontend/src/App.test.tsx`.

### Implementation for User Story 3

- [X] T025 [US3] Implement parameterized, case-insensitive search and optional status filtering in the application-list query in `job_tracker/db.py` and `job_tracker/api.py`.
- [X] T026 [US3] Add search and status-filter controls, combined query state, clear actions, and a distinct no-results state in `frontend/src/App.tsx` and `frontend/src/components/`.
- [X] T027 [US3] Run the US3 pytest and Vitest suites; verify clearing filters does not modify saved records.

**Checkpoint**: Search and filtering return only matching records; the user can recover easily from an empty result set.

---

## Phase 6: User Story 4 - Remove an application (Priority: P2)

**Goal**: Remove only the selected record after explicit confirmation, with cancel leaving it intact.

**Independent Test**: Request removal and cancel, then verify the record remains; confirm a second removal and verify only that record is deleted.

### Tests for User Story 4

- [X] T028 [P] [US4] Add pytest coverage for successful deletion, unknown IDs, and unaffected neighboring records in `tests/test_api.py`.
- [X] T029 [P] [US4] Add React Testing Library coverage for confirmation, cancel, confirm, and resulting empty/list states in `frontend/src/App.test.tsx`.

### Implementation for User Story 4

- [X] T030 [US4] Implement CSRF-protected `DELETE /api/applications/{id}` in `job_tracker/api.py` and the selected-record delete query in `job_tracker/db.py`.
- [X] T031 [US4] Implement an accessible removal confirmation flow with explicit cancel and confirm actions in `frontend/src/components/` and `frontend/src/App.tsx`.
- [X] T032 [US4] Run the US4 pytest and Vitest suites; confirm cancellation makes no API request and confirmation removes only the selected record.

**Checkpoint**: Removal requires an explicit decision, and both cancel and confirm paths behave as specified.

---

## Phase 7: Polish and Cross-Cutting Verification

**Purpose**: Verify accessibility, local-only behavior, security, and setup instructions across all user stories.

- [X] T033 [P] Add focused component and API tests for accessible validation associations, keyboard-operable dialogs/controls, and generic non-sensitive error responses in `frontend/src/App.test.tsx` and `tests/test_api.py`.
- [X] T034 Verify production build output is served by Flask on one origin and development API requests use the Vite proxy without wildcard CORS.
- [X] T035 Perform keyboard-only walkthrough of add, edit, status change, search/filter, and confirm/cancel removal; resolve focus, label, and feedback issues.
- [X] T036 Run `pytest`, `npm test`, and `npm run build`; verify the commands and local URLs in `specs/001-personal-job-tracker/quickstart.md`.
- [X] T037 Confirm no database files, secrets, or user-entered application values are committed or written to application logs.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; establishes package and build configuration.
- **Foundational (Phase 2)**: Depends on setup and blocks all user stories because they share the database, app factory, CSRF handling, and React shell.
- **User Stories (Phases 3-6)**: Depend on the foundation. P1 stories (US1 and US2) are the MVP; P2 stories (US3 and US4) follow. Stories may proceed in parallel after the foundation if ownership is split by files.
- **Polish (Phase 7)**: Depends on all selected stories being complete.

### User Story Dependencies

- **US1 (P1)**: First implementation story; supplies application create/read/edit behavior used by later stories.
- **US2 (P1)**: Depends on the shared application model and update API from US1.
- **US3 (P2)**: Depends on the application list endpoint and frontend from US1; adds query behavior.
- **US4 (P2)**: Depends on the shared record model and API client from US1; adds deletion behavior.

### Parallel Opportunities

- Setup tasks T001-T004 can be split across Python packaging, frontend packaging, and Vite configuration, coordinating shared paths.
- After the foundation, backend tests and frontend tests for a story can proceed in parallel when they touch separate files.
- US3 and US4 can proceed in parallel after US1 if separate developers coordinate shared `api.py`, `db.py`, and `App.tsx` changes.

## Implementation Strategy

### MVP First

1. Complete setup and the shared foundation.
2. Complete US1 and US2 to deliver record management and status progression.
3. Run pytest and Vitest, then verify the P1 journeys independently.
4. Add US3 search/filter and US4 removal as separate increments.
5. Complete the local-only and accessibility checks before considering the feature done.

## Notes

- `[P]` marks tasks that can proceed in parallel without editing the same files.
- Story labels map directly to the user stories in `spec.md`.
- Keep all SQLite writes parameterized and validate request data on the Flask backend even when React has client-side validation.
- Keep Flask and Vite bound to loopback; do not add hosted services, team access, job-board integrations, or application automation.

## Phase 8: Convergence

**Purpose**: Close the remaining gaps found by comparing the implementation with the spec and API contract.

- [ ] T038 Implement Unicode-aware case-insensitive company/role search in `job_tracker/db.py` and add accented-case API regression coverage in `tests/test_api.py` per FR-007 (partial).
- [ ] T039 Reject falsey non-string status filters in `job_tracker/api.py` and add API boundary tests in `tests/test_api.py` per FR-011 (partial).
- [ ] T040 Correct the filtered-search response example in `specs/001-personal-job-tracker/contracts/api.md` so its status matches the `Interview` filter (partial).
