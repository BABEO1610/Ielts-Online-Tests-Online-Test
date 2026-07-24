# Quickstart: User Administration and Authorization

## Prerequisites

- Migrated PostgreSQL database.
- Active admin, tutor, and student accounts.
- Backend and frontend configured with cookie credentials.

## Run

```powershell
cd backend
npm test -- --runTestsByPath backend/tests/unit/controllers/users.controller.test.js backend/tests/unit/db/queries/users.queries.test.js backend/tests/unit/db/queries/sessions.queries.test.js
npm run dev
```

```powershell
cd frontend
npm test -- --run tests/components/auth/ProtectedRoute.test.jsx
npm run dev
```

## Validation Scenarios

1. Log in as student and open `/admin`.
   Expected: frontend redirects away; direct `/api/v1/admin/users` returns authorization error.

2. Log in as tutor and open tutor workspace.
   Expected: route renders for tutor; admin-only routes remain blocked.

3. Log in as admin and open `/admin/users`.
   Expected: paginated table loads users with name, email, role, status, created date.

4. Search by email/name and filter by role/status.
   Expected: backend returns matching page and meta total; empty results show empty state.

5. Change another user's role.
   Expected: role persists, target active sessions revoked, audit row created.

6. Change another user's status to `inactive` or `banned`.
   Expected: status persists, target active sessions revoked, audit row created.

7. Attempt to change own role/status as admin.
   Expected: API rejects and UI shows error.

8. Open `/admin/sessions`, filter/search locally, and revoke a session.
   Expected: session disappears and cannot refresh/authenticate again.
