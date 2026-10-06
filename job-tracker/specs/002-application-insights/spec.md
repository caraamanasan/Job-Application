# Feature Specification: Application Insights

**Feature Branch**: `002-application-insights`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "I'd like to introduce another section to the app: job tracker where it shows user a quick overview of the total jobs they have applied with break done of number of applications they got rejected, assessment stage, interview stage, or they got offer. I'm more looking for a interactive graph with different colors and hover over options. beside this graph I'd like to also have another graph same as what is on the github where user can see number of applications they have applied every day in a calender with color changing from light green to dark green based on the number of applications."

## Clarifications

### Session 2026-10-06

- Q: Should the daily activity graph show a calendar year, like January through December, or a rolling 12-month window like GitHub's contribution graph? → A: Show the most recent 12 months in one continuous graph.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review application outcomes (Priority: P1)

As a job seeker, I want a visual breakdown of my applications by current status so I can quickly understand how my search is progressing.

**Why this priority**: The status overview is the core of the requested section and gives the user an at-a-glance summary of their existing records.

**Independent Test**: Create applications across all supported statuses, open the insights section, and verify the total and each status count against the records.

**Acceptance Scenarios**:

1. **Given** saved applications exist in multiple statuses, **When** the user opens application insights, **Then** a colored status graph and a total application count are shown, and the status counts sum to the total.
2. **Given** the user points to or keyboard-focuses a status in the graph, **When** its details are revealed, **Then** the status name, count, and share of all applications are available as text.
3. **Given** an application's status is changed or the application is removed, **When** the user views the insights again, **Then** the total and status counts reflect the saved records.
4. **Given** no applications have been saved, **When** the user opens application insights, **Then** the status graph communicates that there is no activity and the total is zero.

---

### User Story 2 - Explore daily application activity (Priority: P1)

As a job seeker, I want a calendar-style activity graph so I can see which days I applied and how my activity varied over time.

**Why this priority**: The daily activity graph is the other primary view explicitly requested and complements current outcomes with a view of application habits.

**Independent Test**: Create applications with different applied dates inside and outside the most recent 12 months, open the activity graph, and verify that in-window daily counts and activity intensities appear while older dates are excluded.

**Acceptance Scenarios**:

1. **Given** applications have dates in the most recent 12 months, **When** the user views the activity calendar, **Then** every date in the rolling window ending today is represented and each date’s intensity corresponds to its application count.
2. **Given** the user points to or keyboard-focuses a date, **When** its details are revealed, **Then** the calendar date and exact number of applications are available as text.
3. **Given** the user views daily activity, **When** they inspect the graph, **Then** it shows the most recent 12 months continuously and keeps the all-time status summary unchanged.
4. **Given** an application is added, edited to change its applied date, or removed, **When** the user views the rolling activity window, **Then** the affected daily count and intensity reflect the saved records.
5. **Given** no applications fall within the rolling window, **When** the user views daily activity, **Then** the calendar remains understandable and indicates that no applications were recorded in that period.

### Edge Cases

- With no saved applications, the total is zero, all status counts are zero, and the activity calendar communicates its empty state without implying missing data.
- A supported status with no applications still appears with a zero count so the graph’s categories remain consistent.
- Applications on the same date are counted together; the day’s count and intensity reflect all of them.
- Leap days and calendar boundaries are represented correctly when they fall within the rolling window.
- Applications older than the rolling 12-month window are excluded from the activity graph but remain part of the all-time status summary.
- A date with zero applications is distinguishable from dates with activity, and counts remain understandable without relying on color alone.
- If a status or applied date changes, or an application is deleted, both graphs reflect the current saved record set and do not double-count it.
- The activity view always covers the 12 months ending on the current date; its date range advances automatically and does not include future dates.
- On narrow screens, both graphs remain readable and operable without content or controls overlapping.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a distinct insights section that summarizes the user's saved applications.
- **FR-002**: The insights section MUST show the total number of saved applications and a visual breakdown by Applied, Assessment, Interview, Offer, and Rejected status.
- **FR-003**: The status breakdown MUST include all supported statuses, including statuses with zero applications, and its counts MUST sum to the displayed total.
- **FR-004**: The status graph MUST use distinguishable colors and provide each status's name, count, and share of the total as readable text when the user hovers over or keyboard-focuses that status.
- **FR-005**: When there are no applications, the insights section MUST show a total of zero and a clear empty state for the status graph.
- **FR-006**: The insights section MUST show a calendar-style graph with one activity cell for each date in the most recent 12 months, ending on the current date.
- **FR-007**: Each activity cell MUST represent the number of applications whose applied date is that date, using increasing green intensity for higher counts and a distinct appearance for dates with no applications.
- **FR-008**: When the user hovers over or keyboard-focuses an activity cell, the exact date and application count MUST be available as readable text.
- **FR-009**: The activity calendar MUST advance its 12-month date range as the current date advances and MUST NOT include future dates.
- **FR-010**: The all-time total and status breakdown MUST remain independent of the rolling 12-month window shown for daily activity.
- **FR-011**: Both graphs MUST reflect the current saved application records, including after an application is added, its status or applied date is edited, or it is removed.
- **FR-012**: Graph categories, values, and date details MUST be understandable without color alone and operable with a keyboard and assistive technology, with visible focus and programmatic labels.
- **FR-013**: The insights section MUST remain usable on narrow and wide screens, with graph content and controls remaining readable and non-overlapping.
- **FR-014**: Insights MUST use only the existing user's application records and MUST NOT expose their application history to another user or unintended audience.

### Key Entities *(include if feature involves data)*

- **Application**: An existing saved job opportunity with an applied date and a current status; its date contributes to one calendar day, and its current status contributes to one status count.
- **Application Activity Summary**: A derived view of the saved applications, comprising an all-time total and status counts, plus per-date counts for the rolling 12-month window ending on the current date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any set of saved applications, the displayed all-time total equals the number of records and the five status counts sum exactly to that total.
- **SC-002**: For every date in the rolling 12-month window ending on the current date, the displayed count equals the number of saved applications with that applied date; dates with no applications show zero activity.
- **SC-003**: After a record is added, has its status or applied date changed, or is removed, both summaries show the updated counts when next viewed, with no duplicate contribution from that record.
- **SC-004**: In a usability check, at least 9 out of 10 users can identify the total, the count for a selected status, and the daily count for a selected date within 10 seconds without assistance.
- **SC-005**: All status and date counts are available as text on hover and keyboard focus, and users can navigate both graphs without a pointer.
- **SC-006**: At desktop and narrow-screen widths, users can view and operate both summaries without overlapping content or losing count and date information.

## Assumptions

- The feature is a new section of the existing single-user job tracker and uses its saved application records; it does not introduce new application fields or collect additional personal information.
- The status graph summarizes all saved applications regardless of the rolling activity window.
- The activity calendar shows the most recent 12 months continuously, ending on the current date, following the GitHub-style rolling activity graph selected during clarification.
- Activity is grouped by the saved date applied, not by the date the record was entered or last updated.
- Hover details are also available on keyboard focus to support touch, keyboard, and assistive technology users.
- The green activity scale communicates relative daily volume; the exact count and date remain available as text.
- Existing application statuses are Applied, Assessment, Interview, Offer, and Rejected.