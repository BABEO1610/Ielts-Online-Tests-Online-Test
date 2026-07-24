# Quickstart: Authentication

## Prerequisites

- PostgreSQL configured and migrated.
- `JWT_SECRET`, database env vars, email env vars, and optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` set.
- `FRONTEND_URL` points to Vite dev server.

## Run

```powershell
cd backend
npm install
npm run migrate
npm test -- --runTestsByPath backend/tests/unit/services/auth.reg.test.js backend/tests/unit/services/auth.login.test.js backend/tests/unit/services/auth.refresh.test.js backend/tests/unit/services/auth.reset.test.js
npm run dev
```

```powershell
cd frontend
npm install
npm test -- --run tests/components/auth
npm run dev
```

## Validation Scenarios

1. Register with valid name/email/password.
   Expected: pending account, verification token created, generic success response.

2. Verify email with a valid unused token.
   Expected: account becomes `active`; token is marked used.

3. Login as active student/tutor/admin.
   Expected: session row created, cookies set, frontend routes to role-appropriate workspace.

4. Login with bad credentials repeatedly.
   Expected: generic error, failed attempts tracked, temporary lock at policy threshold.

5. Open a protected route while unauthenticated.
   Expected: frontend redirects to `/login`.

6. Refresh an authenticated session.
   Expected: `/auth/refresh-token` issues a new access token only if session remains active.

7. Logout.
   Expected: current session revoked and frontend auth state cleared.

8. Forgot/reset password.
   Expected: forgot response does not reveal account existence; reset succeeds once with a valid unused token and rejects reuse/expired tokens.

9. Google login callback.
   Expected: local user is created or updated, OAuth session is created, and user is redirected back to frontend.
