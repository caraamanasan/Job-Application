# Research: Personal Job Application Tracker

## Decisions

### React frontend with Vite and TypeScript

- **Decision**: Build a single React interface with Vite and TypeScript. Use plain CSS and the browser's `fetch` API.
- **Rationale**: This meets the requested React stack without adding a UI framework, client state library, or separate frontend service in production.
- **Development/production**: Vite proxies `/api` to Flask while developing. The production Vite build is served by Flask from the same origin.
- **Alternatives considered**: Server-rendered Jinja would be smaller but does not meet the explicit React requirement. A larger SPA framework is unnecessary for this single-user tracker.

### Flask JSON API

- **Decision**: Use Flask 3.x for the application factory, JSON routes, validation boundary, and production static-file serving.
- **Rationale**: Flask is a small Python backend suitable for a single-resource application and leaves persistence in the standard library.
- **Alternatives considered**: FastAPI would add an API-oriented framework without a need for async or a separately deployed service.

### SQLite with the standard library

- **Decision**: Use SQLite through `sqlite3`, with the database stored in the private application instance directory.
- **Rationale**: SQLite is persistent, transactional, easy to back up, and needs no database server for one local user.
- **Alternatives considered**: JSON files have weaker transactional and concurrent-write behavior. A hosted database is outside local-only scope.

### Local-only operation and request protection

- **Decision**: Bind Flask to `127.0.0.1`; serve the production frontend and API from one origin. During development, use Vite's `/api` proxy. Protect state-changing API requests with Flask-WTF CSRF tokens; do not enable wildcard CORS.
- **Rationale**: This keeps the application on the user's machine without claiming multi-user or remote security. Same-origin production requests avoid a separate public API surface.
- **Alternatives considered**: Remote hosting, accounts, and network exposure are not needed for the first version.

### Focused tests

- **Decision**: Use pytest and Flask's test client for backend behavior; use Vitest and React Testing Library for UI behavior.
- **Rationale**: Each tool directly tests its layer. A browser automation stack is not needed as a default dependency for this small interface.

## Resolved Questions

- The interface is React, not server-rendered Jinja.
- The app is local-only, not hosted for cross-device access.
- Company, role, and date applied are required; URL and notes are optional, as defined in the feature spec.
- Status values are Applied, Assessment, Interview, Offer, and Rejected; new applications default to Applied.
