# Job Tracker Constitution

## Core Principles

### I. Simplicity and Maintainability
Build only what supports the job-application tracking workflow. Prefer the simplest implementation that is easy to understand and change; add dependencies, abstractions, or infrastructure only when a concrete need justifies their ongoing cost.

### II. Accessibility by Default
Make every user-facing workflow usable with a keyboard and assistive technology. Use semantic structure, programmatic labels, visible focus, sufficient contrast, and clear status and error messages. Accessibility is part of feature completion, not optional polish.

### III. Protect Personal Information
Treat names, contact details, resumes, notes, and application history as personal information. Collect and retain only what the product needs, restrict access to authorized users, use secure handling appropriate to the storage layer, and never expose sensitive values in logs, errors, or unintended interfaces.

### IV. Validate User Input
Validate data at the boundary where it enters the application, including required fields, formats, lengths, and allowed values. Reject invalid or unsafe input with specific, accessible feedback, and do not rely on client-side validation as the only protection.

### V. Test Important Workflows
Cover the behaviors users depend on with focused automated tests. At minimum, protect creating, viewing, editing, and removing application records, plus input validation and any access or privacy controls. Update tests when behavior changes and run the relevant checks before considering work complete.

## Product Constraints
Keep the application focused on tracking job applications and their progress. Prefer clear, predictable interactions and preserve user-entered information during ordinary workflows. Any new collection or use of personal information must have a clear product purpose and follow the data-minimization principle.

## Development Workflow
For each change, identify affected user workflows, accessibility implications, and personal-data impact. Add or update tests for meaningful behavior changes, run the narrow relevant checks and required project checks, and document any verification that could not be completed. Keep changes scoped and avoid introducing infrastructure without a stated need.

## Governance
This constitution guides feature specifications, implementation, and review. When a proposed change conflicts with a principle, resolve the conflict explicitly in the specification and document why the exception is necessary. Amendments must update this document and its version; use a major version for incompatible principle changes, a minor version for new principles or material requirements, and a patch version for clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
