# Quickstart: Audit Log and Change History

## Prerequisites

- PostgreSQL connection configured in `backend/.env` or root `.env`.
- Migrations applied through `npm run migrate` in `backend/`.
- At least one active admin account.
- Frontend `VITE_API_URL` points to the backend base URL, usually `http://localhost:3000/api/v1`.

## Run

```powershell
cd backend
npm install
npm run migrate
npm test -- --runTestsByPath backend/tests/services/audit.service.test.js backend/tests/db/queries/audit.queries.test.js
npm run dev
```

```powershell
cd frontend
npm install
npm test -- --run
npm run dev
```

## Validation Scenarios

1. Log in as admin and open `/admin/activity`.
   Expected: table shows time, actor, action, target, IP, severity, and note from `/api/v1/admin/audit-logs`.

2. Trigger a failed login.
   Expected: an audit row with `action = login_failed` appears and is marked suspicious.

3. As admin, change another user's role or status from `/admin/users`.
   Expected: `/admin/change-log` lists a row with old/new values and summary counts.

4. Open a change-log detail.
   Expected: modal shows field-level before/after values.

5. Undo a supported user role/status change.
   Expected: source log becomes undone, target user returns to old value, and a new `change_reverted` row is created.

6. Try to undo an unsupported, already-undone, stale, or self-targeting change.
   Expected: API returns a clear error and target data is unchanged.
