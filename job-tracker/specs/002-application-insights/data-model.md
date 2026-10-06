# Data Model: Application Insights

## Existing Entity: Application

The feature reads existing application records without changing their persisted shape.

| Field | Source type | Use in insights |
|---|---|---|
| `id` | Integer | Stable record identity; not needed for aggregation |
| `date_applied` | ISO calendar date string (`YYYY-MM-DD`) | Assigns the record to one local calendar day in the rolling activity graph |
| `status` | One of Applied, Assessment, Interview, Offer, Rejected | Assigns the record to exactly one all-time status count |
| Other application fields | Existing application fields | Not collected or displayed by insights |

Existing identity rules and input validation remain unchanged. No new persistence, migration, or lifecycle transition is introduced.

## Derived View: Application Activity Summary

This view is calculated from the complete application collection and is not stored.

| Value | Definition |
|---|---|
| `total` | Number of all saved application records |
| `statusCounts` | Count for each supported status, including zero-count statuses; values sum to `total` |
| `statusShares` | Each status count divided by `total`; zero when `total` is zero |
| `dailyCounts` | Count of records by exact `date_applied` for each date in the active rolling 12-month range |
| `windowStart` | Local calendar date one year before today, clamped to the last valid date in that month |
| `windowEnd` | Current local calendar date |

### Aggregation Rules

- Each application contributes once to the all-time total and once to its current status count.
- Each application within the activity window contributes once to the day matching its `date_applied` value.
- Applications older than `windowStart` remain in the all-time status totals and do not contribute to daily activity.
- The window includes both `windowStart` and `windowEnd`; it never includes a future date.
- Date-only values are grouped as strings or constructed as local calendar dates; they are not interpreted as UTC timestamps.
- A status with no records has a count and share of zero. When the overall total is zero, all shares are zero.
- A day without applications has a count of zero and the lowest activity appearance.

## Relationships

`Application Activity Summary` is a transient aggregation over many `Application` records. It has no independent identity and does not own or modify application records.