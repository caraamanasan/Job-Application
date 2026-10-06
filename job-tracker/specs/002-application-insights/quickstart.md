# Quickstart: Application Insights Validation

## Prerequisites

- Python 3.11 or newer and the project virtual environment/dependencies installed.
- Node.js and the frontend dependencies installed in `frontend/`.
- The Flask app and Vite frontend can run locally; Vite proxies `/api` to Flask on `127.0.0.1:5000`.

## Automated Validation

From the repository root, run the backend suite:

```powershell
python -m pytest
```

From `frontend/`, run the frontend tests and production type/build check:

```powershell
npm test
npm run build
```

Expected result: existing application CRUD/search tests remain green; new aggregation tests cover status totals, zero statuses, duplicate dates, rolling-window boundaries, leap/month-end dates, and date-only timezone safety; UI tests cover section navigation, hover/focus details, updates after mutations, empty/error states, and keyboard grid movement. The production build completes without TypeScript errors.

## Manual End-to-End Scenarios

1. Start the Flask service from the repository root with `flask --app job_tracker run`; in a second terminal from `frontend/`, run `npm run dev`.
2. Open the local Vite URL and create records distributed across Applied, Assessment, Interview, Offer, and Rejected.
3. Open Insights and verify the total, all five status counts, and that counts sum to the total. Hover and keyboard-focus statuses to confirm equivalent text details.
4. Create multiple records for the same date and records on the first and last dates of the rolling window. Verify exact daily counts and increasing activity intensity. Verify the date one day before the window is excluded from the activity graph but remains in the all-time total and status count.
5. Navigate dates in the activity grid using the keyboard and verify each focused date exposes its date and exact count.
6. Change an application's status and applied date, then remove a record. Verify the status and daily summaries update while list search/status filters do not alter the insights totals.
7. Test a new workspace with no records, a failed application load, and a narrow viewport. Confirm empty and error states are distinct and both graphs remain readable and operable.