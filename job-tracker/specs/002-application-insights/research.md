# Research: Application Insights

## Decisions

### Application collection and summary calculation

- **Decision**: Reuse `GET /api/applications` to load the complete application collection and derive the all-time status counts and rolling-window daily counts in frontend pure functions.
- **Rationale**: The existing route already returns all records without list filters. The dataset is private and single-user, while the graph covers only a bounded date window. This avoids redundant server aggregation, a new API contract, and persisted derived data.
- **Alternatives considered**: Add a dedicated aggregate endpoint; rejected because it duplicates simple counts and introduces an unnecessary API contract. Derive status counts from the filtered list request; rejected because search and status filters would make the supposedly all-time overview inaccurate.

### State refresh after application changes

- **Decision**: Keep the insights collection separate from the search-filtered list state and refresh it after successful create, edit, status update, and removal operations.
- **Rationale**: The all-time summary must not inherit list filters, and status/date changes must move an application between aggregates immediately after persistence succeeds.
- **Alternatives considered**: Calculate insights from the visible list; rejected because list filtering excludes records. Add server-side summary caching; rejected because persisted or cached values can become stale after edits and deletion.

### Status graph representation

- **Decision**: Use a five-category horizontal bar distribution with a stable color per status, visible labels/counts, and a focusable detail surface that exposes count and share on hover or keyboard focus.
- **Rationale**: Horizontal bars preserve legible category labels and remain usable when one or more statuses have zero applications. Text values remain available independently of hue.
- **Alternatives considered**: A donut chart; rejected for the initial version because small or zero-valued slices make labels and keyboard interaction less direct. A third-party chart package; rejected because the required chart interactions are limited and the project has no charting dependency.

### Rolling 12-month calendar semantics

- **Decision**: Generate daily cells from the local calendar date one calendar year before today through today, inclusive, clamping to the last day of the prior month if that date does not exist. Group application date strings by exact `YYYY-MM-DD` without parsing them as UTC instants.
- **Rationale**: Calendar arithmetic matches the clarified rolling-12-month request; date-only parsing avoids shifts caused by timezone conversion. The interval handles leap years and month-end dates deterministically.
- **Alternatives considered**: A fixed January-to-December year; rejected by clarification. A UTC-based rolling interval; rejected because date-applied values are calendar dates, not timestamps.

### Accessible activity graph interaction

- **Decision**: Render the daily cells as a labeled grid with roving keyboard focus, arrow-key movement, visible focus, and a shared date/count detail on pointer hover and keyboard focus. Keep readable date/count information available to assistive technology.
- **Rationale**: A rolling year has hundreds of cells; roving focus avoids requiring users to tab through every day while preserving keyboard access to any date. Text and labels make counts understandable without color.
- **Alternatives considered**: One tab stop per day; rejected because it creates excessive sequential keyboard navigation. Hover-only browser titles; rejected because they do not provide equivalent keyboard or screen-reader feedback.

### Dependencies and deployment

- **Decision**: Use React, TypeScript, and CSS/SVG primitives already supported by the project; add no runtime dependency and no database migration.
- **Rationale**: The current client stack and build/test scripts support the feature, and local derivation keeps application history inside the existing app boundary.
- **Alternatives considered**: Introduce a charting library; deferred unless implementation uncovers a concrete accessibility or maintainability gap that native primitives cannot meet.

## Resolved Unknowns

- The active implementation uses Python 3.11+, Flask 3.1, SQLite, TypeScript 5.7, React 19, Vitest, Testing Library, and pytest.
- The existing API exposes an unfiltered application collection and filtered search separately.
- The feature introduces no new persisted entity, input field, external service, or user-selected date range.