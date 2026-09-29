# Private API Contract

This JSON API is for the React frontend of the local-only application. It is not a public or third-party integration surface. Production serves the frontend and API from the same origin. In development, Vite proxies `/api` to Flask.

## General Rules

- Request and response bodies use JSON unless the endpoint has no body.
- All mutation requests require a valid CSRF token in the `X-CSRFToken` header.
- Do not enable wildcard CORS.
- Validate all request data on the server. Invalid input returns `400` with field-specific errors and makes no partial changes.
- Missing records return `404`; unexpected failures return a generic message without application contents or stack traces.

## Endpoints

### `GET /api/csrf`

Returns a CSRF token and initializes the session used by Flask-WTF.

```json
{"csrf_token":"..."}
```

The frontend sends this token in `X-CSRFToken` for every mutation request. The session cookie is HttpOnly and SameSite=Lax.

### `GET /api/applications`

Returns all applications without including user-entered values in the request URL.

### `POST /api/applications/search`

Read-only search; request filters are sent in the JSON body so company and role search text is not included in access-log URLs. This endpoint is CSRF-exempt because it does not change application data.

Optional body fields:

- `q`: case-insensitive substring search across company and role.
- `status`: one of the supported status values or an empty string for all statuses.

Returns `200` with matching records, ordered by date applied descending and then ID descending.

```json
{"q":"analyst","status":"Interview"}
```

```json
{"applications":[{"id":1,"company":"Example Co","role":"Analyst","job_url":null,"date_applied":"2026-09-29","status":"Applied","notes":null,"created_at":"2026-09-29T12:00:00Z","updated_at":"2026-09-29T12:00:00Z"}]}
```

An empty match returns `{"applications":[]}` with `200`.

### `GET /api/applications/{id}`

Returns `200` and the selected application, or `404` if it does not exist.

### `POST /api/applications`

Creates an application. Required body fields: `company`, `role`, and `date_applied`. Optional fields: `job_url`, `status`, and `notes`. If status is omitted, it defaults to `Applied`.

Returns `201` with the created application. Invalid input returns `400`:

```json
{"error":"Validation failed","fields":{"company":"Company is required."}}
```

### `PUT /api/applications/{id}`

Updates the selected application's editable fields. Returns `200` with the updated record, `400` for invalid input, or `404` when the record does not exist. Failed validation leaves the stored record unchanged.

### `DELETE /api/applications/{id}`

Deletes the selected application after the React UI obtains explicit user confirmation. Returns `204` on success or `404` when it does not exist.

## Status Values

`Applied`, `Assessment`, `Interview`, `Offer`, `Rejected`. Any supported status can be selected at any time; the API does not enforce a transition sequence.
