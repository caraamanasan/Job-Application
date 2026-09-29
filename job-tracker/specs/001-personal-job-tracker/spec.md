# Feature Specification: Personal Job Application Tracker

**Feature Branch**: `001-personal-job-tracker`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Build a personal job application tracker. A user can add and edit a job application with company, role, job URL, date applied, current status, and notes. They can view applications in a list, search by company or role, filter by status, and update status as an application progresses and the status is applied by default to Assessment, Interview, Offer/Rejected. Include useful empty states and validation. This is a single-user first version. Do not add job-board integrations, automated applications, or team features."

## User Scenarios & Testing

### User Story 1 - Record and maintain applications (Priority: P1)

As a job seeker, I want to add and edit application details so I can keep an accurate record of opportunities I am pursuing.

**Why this priority**: Creating and maintaining records is the foundation of the tracker and delivers value before any discovery or reporting features.

**Independent Test**: Starting with no records, add a valid application and confirm it appears in the list with status Applied; edit its fields and confirm the same record shows the changes.

**Acceptance Scenarios**:

1. **Given** there are no saved applications, **When** the user opens the tracker, **Then** they see a useful empty state and a clear action to add an application.
2. **Given** the user is adding an application, **When** they provide a company, role, and valid date applied and save, **Then** the application is saved with status Applied by default and appears in the list.
3. **Given** an application exists, **When** the user edits its company, role, URL, date applied, or notes and saves, **Then** the existing application is updated without creating a duplicate.
4. **Given** required information is missing or a supplied URL is invalid, **When** the user attempts to save, **Then** the application is not saved and clear, accessible validation messages identify the fields to correct.

### User Story 2 - Track application progress (Priority: P1)

As a job seeker, I want to update an application's status so I can see where each opportunity stands.

**Why this priority**: Progress tracking is central to distinguishing active applications from outcomes and is necessary for an accurate overview.

**Independent Test**: Add an application, change its status through the available values, and confirm each saved status is shown in the application list and remains after reopening the tracker.

**Acceptance Scenarios**:

1. **Given** an application is newly created, **When** it is saved without a status change, **Then** its status is Applied.
2. **Given** an application exists, **When** the user changes its status, **Then** they can select Applied, Assessment, Interview, Offer, or Rejected and the selected value is saved and displayed.
3. **Given** the user changes an application's status, **When** they later view or edit that application, **Then** the current status is preserved until changed again.

### User Story 3 - Find relevant applications (Priority: P2)

As a job seeker, I want to search and filter my application list so I can quickly find a company, role, or group of applications at a given status.

**Why this priority**: Search and filtering become increasingly useful as the user's list grows, while the core tracker remains usable without them.

**Independent Test**: Seed applications with different companies, roles, and statuses; verify company and role searches and status filters return only matching applications.

**Acceptance Scenarios**:

1. **Given** applications exist, **When** the user searches for text in a company name or role, **Then** the list shows applications matching either field.
2. **Given** applications have different statuses, **When** the user selects a status filter, **Then** only applications with that status are shown.
3. **Given** a search and status filter are both active, **When** results are displayed, **Then** an application must match both conditions to appear.
4. **Given** a search or filter produces no results, **When** the list is displayed, **Then** a useful no-results message is shown and the user can clear the search or filter.

### User Story 4 - Remove an application (Priority: P2)

As a job seeker, I want to remove an application I no longer need so my tracker stays accurate.

**Why this priority**: Removing an accidental or unwanted record keeps the personal list useful and satisfies the project's required record-management workflow.

**Independent Test**: Create an application, request its removal, confirm the action, and verify it no longer appears; cancel a second removal and verify that record remains.

**Acceptance Scenarios**:

1. **Given** an application exists, **When** the user requests its removal, **Then** the tracker asks for confirmation before deleting the record.
2. **Given** a removal confirmation is open, **When** the user cancels, **Then** the application remains unchanged.
3. **Given** a removal confirmation is open, **When** the user confirms, **Then** the application is removed from the tracker and the appropriate empty or list state is shown.

### Edge Cases

- Opening the tracker with no records shows an initial empty state; a search or filter with no matches shows a distinct no-results state.
- Company and role values containing only whitespace are invalid; surrounding whitespace is ignored when validating required values.
- A supplied job URL must be an absolute HTTP or HTTPS URL; a blank URL is allowed.
- Company and role are limited to 200 characters, URLs to 2048 characters, and notes to 5000 characters.
- A date that is not a valid calendar date, or is later than the current date, is rejected with an accessible field-level message.
- Applications with the same company and role are allowed because they may represent separate opportunities.
- Search and status filters can be cleared without changing saved application data.
- Notes may be blank; validation errors do not discard other values already entered in the form.
- Canceling a removal confirmation leaves the application intact; confirming removes only the selected application.

## Requirements

### Functional Requirements

- **FR-001**: The user MUST be able to create an application with company, role, job URL, date applied, status, and notes fields.
- **FR-002**: Company, role, and date applied MUST be required; job URL and notes MAY be blank.
- **FR-003**: A newly created application MUST default to status Applied.
- **FR-004**: The supported statuses MUST be Applied, Assessment, Interview, Offer, and Rejected. The user MUST be able to update an application's status to any supported value without a forced transition sequence.
- **FR-005**: The user MUST be able to edit a saved application's fields, and an edit MUST update the selected record rather than create another record.
- **FR-006**: The user MUST be able to view saved applications in a list with their company, role, job URL, date applied, current status, and notes.
- **FR-007**: The user MUST be able to search the list by company or role. Search matching MUST be case-insensitive and MUST ignore leading and trailing whitespace in the search term.
- **FR-008**: The user MUST be able to filter the list by one status at a time. When search and status filtering are both active, both conditions MUST apply.
- **FR-009**: The tracker MUST show an actionable empty state when there are no applications and a distinct no-results state when search or filtering finds no applications.
- **FR-010**: The tracker MUST validate required fields, date validity, and any supplied job URL before saving. Invalid values MUST be explained with clear, field-specific feedback that is programmatically associated with the relevant field.
- **FR-011**: Validation MUST occur wherever application data enters the system; client-side validation alone MUST NOT be treated as sufficient.
- **FR-012**: Successfully saved applications and edits MUST remain available when the user returns to the tracker.
- **FR-013**: Application data MUST be accessible only to the single user of this tracker and MUST NOT be exposed through unintended interfaces or logs.
- **FR-014**: All controls and feedback for these workflows MUST be operable and understandable using a keyboard and assistive technology, including visible focus and programmatic labels.
- **FR-015**: The user MUST be able to remove an application after an explicit confirmation; canceling the confirmation MUST leave the application unchanged.
- **FR-016**: The system MUST enforce maximum lengths of 200 characters for company and role, 2048 characters for a job URL, and 5000 characters for notes, with field-specific feedback for invalid input.

### Key Entities

- **Application**: A single job opportunity tracked by the user, containing company, role, optional job URL, date applied, one supported current status, and optional notes. Separate applications may share a company and role.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can save a valid application and find it in the list with all entered values and the default Applied status.
- **SC-002**: A user can edit an application and change its status without creating a duplicate or losing unchanged fields.
- **SC-003**: Company search, role search, and each status filter return only records matching the specified criteria, including when search and filtering are combined.
- **SC-004**: Every invalid required field, date, or supplied URL is rejected before saving and has an understandable, field-specific message.
- **SC-005**: The initial empty state and no-results state each provide clear context and a relevant next action.
- **SC-006**: All add, edit, search, filter, and status-update workflows can be completed with a keyboard, with their labels, focus, and feedback available to assistive technology.
- **SC-007**: A user can confirm removal of one application or cancel removal without changing the saved record.

## Assumptions

- This is a private tracker for one user; accounts, multiple users, sharing, and team features are outside this feature's scope.
- Company, role, and date applied are required. Job URL and notes are optional.
- Status is initially Applied. The five supported statuses are selectable without enforcing a particular sequence.
- A job URL, when supplied, must use HTTP or HTTPS. A date applied cannot be in the future.
- The implementation may choose an appropriate persistence approach, but saved records must be available when the user returns.
- Job-board integrations, automated applications, and team features are not part of this feature.
