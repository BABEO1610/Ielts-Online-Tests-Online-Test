# Implementation Plan: Authentication

**Branch**: `feat-auth-and-users` | **Date**: 2026-07-24 | **Spec**: `feat-auth/spec.md`

**Input**: Feature specification from `.sdd/specs/feat-auth-and-users/feat-auth/spec.md`

## Summary

Backfill design for registration, email verification, login/logout, refresh token handling, password recovery/change, role-aware redirects, session limiting, failed-login lockout, and Google OAuth using the existing Express auth service, PostgreSQL tables, JWT cookies, and React auth pages/context.

## Technical Context

**Language/Version**: Node.js 20+, Express 5.2 backend; React + Vite frontend currently installed as React 19.2.6.

**Primary Dependencies**: `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-rate-limit`, `express-validator`, `nodemailer`, `pg`, Axios, React Router.

**Storage**: PostgreSQL 16 via `pg`; `users`, `user_sessions`, `email_verification_tokens`, `password_reset_tokens`, `password_history`, `oauth_accounts`, `audit_logs`.

**Testing**: Jest unit tests for auth service/controller/util/query; Vitest component tests for auth forms/context.

**Target Platform**: Browser app and REST API.

**Project Type**: Full-stack web application.

**Performance Goals**: 95% of valid registrations respond within 5 seconds; 95% of valid logins redirect within 3 seconds.

**Constraints**: No account enumeration; max 3 active sessions; reset tokens one-use and expiring; password history prevents last-three reuse; secrets in env only; passwords/tokens never returned.

**Scale/Scope**: Email/password and Google auth for student/tutor/admin roles.

## Constitution Check

- Tech stack: PASS for Node/Express/Postgres/raw `pg`; WATCH for React 19.2.6 vs constitution React 18.
- API protocol: PASS. Auth controller wraps responses in standard envelope.
- Security: PASS. Mutating authenticated endpoints use middleware; identity comes from `req.user`; cookies are used for session tokens.
- Database: PASS. UUID tables, parameterized queries, no ORM.
- Testing: PASS WITH RISK. Existing auth unit tests are present; any new implementation must maintain 80% coverage and add endpoint error cases.

Post-design re-check: PASS WITH NOTED RISK. The plan introduces no new dependency or protocol exception; React version drift remains unresolved at project level.

## Project Structure

```text
backend/
├── src/routes/api/v1/auth.routes.js
├── src/controllers/auth.controller.js
├── src/services/auth.service.js
├── src/db/queries/users.queries.js
├── src/db/queries/sessions.queries.js
├── src/db/queries/tokens.queries.js
├── src/db/queries/pwd.queries.js
├── src/utils/password.util.js
├── src/utils/token.util.js
└── tests/unit/services/auth.*.test.js

frontend/
├── src/context/AuthContext.jsx
├── src/components/auth/
├── src/pages/auth/
├── src/components/auth/ProtectedRoute.jsx
└── tests/components/auth/
```

**Structure Decision**: Keep auth orchestration in `auth.service.js`; controllers handle validation, cookies, and envelopes; frontend uses `AuthContext` and `ProtectedRoute` for state and navigation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Existing React 19 package drift from constitution React 18 | Repo already contains React 19.2.6 | Must be explicitly remediated or approved before implementation completion. |
