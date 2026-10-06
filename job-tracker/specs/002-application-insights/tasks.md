---
description: "Implementation tasks for Application Insights"
---

# Tasks: Application Insights

**Input**: Design documents in `specs/002-application-insights/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/application-insights-ui.md`, and `quickstart.md`

**Tests**: Focused automated tests are included to satisfy the project constitution's requirement to test important workflows.

**Organization**: Tasks are grouped by the two P1 user stories. Shared data-access work is foundational; each story has an independent test criterion.

## Phase 1: Setup

**Purpose**: Confirm existing project setup is sufficient.

No setup task is needed: React, TypeScript, Vite, Vitest, Testing Library, Flask, and the existing application API are already configured. No dependency or database migration is planned.

## Phase 2: Foundational

**Purpose**: Provide an unfiltered source of saved applications for both summaries without coupling insights to list search or status filters.

- [X] T001 Add `getAllApplications()` using `GET /api/applications` in `frontend/src/api.ts` and verify it returns the unfiltered application collection.
- [X] T002 Add independent insights application state in `frontend/src/App.tsx`; load it separately from list results and refresh it after successful create, edit, status update, and removal operations.

**Checkpoint**: The insights state contains the full saved collection regardless of current list filters and refreshes after each persisted mutation.

## Phase 3: User Story 1 - Review application outcomes (Priority: P1) - MVP

**Goal**: Show the all-time total and accessible status distribution for Applied, Assessment, Interview, Offer, and Rejected.

**Independent Test**: Seed records in all five statuses and with active list filters; open Insights and verify the total, each status count (including zero-count statuses), count sum, and text details on hover and keyboard focus. Verify an empty collection shows zero values and that a saved status change or removal updates the summary.

### Tests for User Story 1

- [X] T003 [P] [US1] Add failing status aggregation tests for the five supported statuses, zero-count statuses, total, and zero-total shares in `frontend/src/application-insights.test.ts`.
- [X] T004 [P] [US1] Add failing Insights navigation and status-summary interaction tests, including independence from list filters and refresh after status change/removal, in `frontend/src/App.test.tsx`.

### Implementation for User Story 1

- [X] T005 [US1] Implement pure all-time total, status count, and status share helpers in `frontend/src/application-insights.ts`; include every status (Applied, Assessment, Interview, Offer, Rejected) and make every share zero when the total is zero.
- [X] T006 [US1] Implement the colored status distribution and total in `frontend/src/ApplicationInsights.tsx`; expose each status name, exact count, and share as readable text on pointer hover and keyboard focus, including zero-count categories.
- [X] T007 [US1] Add Applications/Insights section navigation and render the insights view from `frontend/src/App.tsx` while preserving the existing list search and status-filter workflow.

**Checkpoint**: User Story 1 can be demonstrated with saved records and with an empty collection without implementing the activity graph.

## Phase 4: User Story 2 - Explore daily application activity (Priority: P1)

**Goal**: Show exact per-day application counts for a rolling 12-month window ending on the current local date, with green intensity and accessible hover/focus details.

**Independent Test**: Supply applications inside and outside the window, including duplicate dates, leap/month-end boundaries, and dates at each window edge; verify only in-window records affect daily cells, while all-time status totals remain unchanged. Navigate the grid by keyboard and verify the focused date and exact count are announced.

### Tests for User Story 2

- [X] T008 [P] [US2] Add failing daily aggregation tests for duplicate dates, zero-activity dates, inclusive rolling-window boundaries, leap/month-end clamping, future exclusion, and date-only timezone safety in `frontend/src/application-insights.test.ts`.
- [X] T009 [P] [US2] Add failing activity-grid tests for exact date/count details on hover and focus, arrow-key movement with roving focus, zero-activity appearance, and a no-activity period in `frontend/src/ApplicationActivityGrid.test.tsx`.
- [X] T010 [US2] Add failing Insights integration tests in `frontend/src/App.test.tsx` proving applied-date edits and removals update daily activity and that records older than the window remain in all-time totals only.

### Implementation for User Story 2

- [X] T011 [US2] Implement local-date window generation and per-day counts in `frontend/src/application-insights.ts`, from the local date one calendar year before today through today inclusive, clamping an unavailable day to that month's last day and grouping `date_applied` as `YYYY-MM-DD` without UTC timestamp conversion.
- [X] T012 [US2] Implement the daily activity grid in `frontend/src/ApplicationActivityGrid.tsx` with a cell for every date in the rolling window, increasing green intensity, readable date/count details, visible focus, and roving arrow-key navigation.
- [X] T013 [US2] Integrate the activity grid into `frontend/src/ApplicationInsights.tsx` while keeping the total and status distribution independent of the rolling activity window.

**Checkpoint**: Both P1 stories are usable together; daily activity updates from saved records without affecting all-time status totals.

## Phase 5: Polish and Cross-Cutting Concerns

**Purpose**: Validate accessibility, responsive behavior, and the end-to-end workflows across both stories.

- [X] T014 Add responsive chart layout, distinct status/activity colors, visible keyboard focus, and reduced-motion-safe styling in `frontend/src/styles.css`.
- [ ] T015 Run the automated and manual scenarios in `specs/002-application-insights/quickstart.md`; fix any failures in the corresponding frontend files and record any changed validation steps in that quickstart.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code changes; existing project configuration is sufficient.
- **Foundational (Phase 2)**: T001 precedes T002; both must finish before the user stories because both graphs require the complete, current application collection.
- **User Story 1 (Phase 3)**: Begins after Phase 2; establishes the Insights section and status summary.
- **User Story 2 (Phase 4)**: Begins after Phase 2. The date aggregation and grid tests/components can be developed independently of the status-specific code, but integrating the grid into the shared Insights view (T013) depends on User Story 1's view (T006-T007).
- **Polish (Phase 5)**: T014 can proceed once the graph markup exists; T015 runs after both stories and styling are integrated.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on the foundational unfiltered application state; it is the MVP and can ship without the activity graph.
- **User Story 2 (P1)**: Uses the same foundational collection. Its aggregation and grid can be tested independently, but final integration depends on the Insights container introduced by User Story 1.

### Parallel Opportunities

- Within User Story 1, T003 and T004 are parallel test-writing tasks in different files; implementation tasks follow their corresponding tests.
- Within User Story 2, T008, T009, and T010 are parallel test-writing tasks in separate test files/concerns; aggregation and grid implementation can then proceed in separate source files, with T013 waiting for both and the existing Insights container.
- T014 is isolated to CSS after graph markup is available; T015 is final verification and depends on all feature and style work.

## Parallel Example: User Story 1

```text
T003: Add status aggregation tests in frontend/src/application-insights.test.ts
T004: Add Insights navigation and status interaction tests in frontend/src/App.test.tsx
```

## Parallel Example: User Story 2

```text
T008: Add daily aggregation tests in frontend/src/application-insights.test.ts
T009: Add activity grid keyboard/tooltip tests in frontend/src/ApplicationActivityGrid.test.tsx
T010: Add saved-date refresh integration tests in frontend/src/App.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete the foundational full-collection fetch and refresh behavior.
2. Implement and independently test the all-time total and five-status distribution.
3. Add Insights navigation and validate list-filter independence, keyboard/pointer details, empty data, and updates after mutations.
4. Stop at the User Story 1 checkpoint for an MVP demonstration.

### Incremental Delivery

1. Deliver User Story 1 as the first usable Insights increment.
2. Add rolling date aggregation and the keyboard-operable activity grid for User Story 2.
3. Complete responsive styling and run the full quickstart validation.

## Notes

- Every task uses the required unchecked checkbox, sequential task ID, a parallel marker only where appropriate, a required story label in story phases, and an explicit file path.
- Run each listed test task before its paired implementation task and confirm the test fails for the missing behavior before making it pass.
- No backend endpoint, database schema, application field, or package dependency changes are planned.
- Task list checkboxes are implementation work; they are not marked complete during generation.