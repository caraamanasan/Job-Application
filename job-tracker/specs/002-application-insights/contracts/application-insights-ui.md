# Application Insights UI Contract

## Entry and Navigation

- The application exposes Applications and Insights as peer sections in the existing private workspace.
- Selecting Insights shows the summary without changing list search or status filters.
- Selecting Applications returns to the existing list workflow.

## Data Contract

- Insights consume the complete collection returned by the existing `GET /api/applications` endpoint.
- The all-time total and status distribution include every saved record, regardless of the currently visible list filters.
- Daily activity groups by `date_applied` in the rolling 12-month range ending on the current local date.
- No new endpoint, request payload, persisted summary, or application field is introduced.
- After a successful create, edit, status change, or removal, displayed insights reflect the saved record set.

## Status Distribution

- Display a total and all five supported statuses, including zero-count statuses.
- Counts must sum to the total. The status label, exact count, and share are readable text.
- Pointer hover and keyboard focus expose equivalent details. Color is supplemental and is not the only status cue.

## Daily Activity Grid

- Include every date from the local date one calendar year before today through today, inclusive, clamping an unavailable day to the prior month's last day.
- Use increasing green intensity as daily count increases; zero-activity dates have a distinct baseline appearance.
- Pointer hover and keyboard focus expose the exact date and count as text.
- Keyboard users can move among dates without tabbing through every cell; focus remains visible.
- On narrow screens, the grid remains readable and usable without overlapping the status view or controls.

## Empty and Error States

- With no saved applications, show total zero, zero counts for each status, and a clear no-activity calendar state.
- If the complete application collection cannot be loaded, show a clear non-sensitive error and allow retry; do not present a failed load as a valid zero-count result.