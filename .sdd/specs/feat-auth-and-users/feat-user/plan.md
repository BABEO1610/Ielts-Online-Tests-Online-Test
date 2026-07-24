# Implementation Plan: User Administration and Authorization

**Branch**: `feat-auth-and-users` | **Date**: 2026-07-24 | **Spec**: `feat-user/spec.md`

**Input**: Feature specification from `.sdd/specs/feat-auth-and-users/feat-user/spec.md`

## Summary

Backfill design for role guards, admin user listing/search/filter/pagination, role/status changes with self-protection, session listing/revocation, and audit trail recording using existing admin routes, authorize middleware, users/sessions services, PostgreSQL queries, and React admin pages.

## Technical Context

**Language/Version**: Node.js 20+, Express 5.2; React + Vite currently installed as React 19.2.6.

**Primary Dependencies**: `pg`, JWT/cookie auth, Express middleware, Axios, React Router, Bootstrap/react-bootstrap.

**Storage**: PostgreSQL `users`, `user_sessions`, `v_active_sessions`, `audit_logs`.

**Testing**: Jest for users/sessions/admin controller; Vitest for ProtectedRoute/AdminUsersPage/SessionsPage.

**Target Platform**: Admin browser UI backed by REST API.

**Project Type**: Full-stack web application.

**Performance Goals**: 95% user searches/filters update under 3 seconds; admin can revoke a session within 10 seconds.

**Constraints**: Admin-only routes; actor id/role from auth middleware; admin cannot change own role/status; status/role changes revoke target sessions; actions recorded to audit trail.

**Scale/Scope**: Student/tutor/admin roles and pending/active/inactive/banned account statuses.

## Constitution Check

- Tech stack: PASS for backend/Postgres/raw `pg`; WATCH for React version drift.
- API protocol: PASS. Admin controller returns standard envelopes.
- Security: PASS. Admin routes use `authenticate` and `authorize('admin')`; mutating endpoints never take actor from body/query.
- Database: PASS. User/session queries are parameterized; session revocation updates `revoked_at` instead of deleting.
- Testing: PASS WITH RISK. Existing user/session tests are present; role guard and self-protection paths should remain covered.

Post-design re-check: PASS WITH NOTED RISK. No new unguarded admin mutation or hard delete is introduced.

## Project Structure

```text
backend/
├── src/middleware/authenticate.js
├── src/middleware/authorize.js
├── src/routes/api/v1/admin.routes.js
├── src/controllers/admin.controller.js
├── src/services/users.service.js
├── src/services/sessions.service.js
├── src/db/queries/users.queries.js
├── src/db/queries/sessions.queries.js
└── tests/

frontend/
├── src/components/auth/ProtectedRoute.jsx
├── src/pages/admin/AdminUsersPage.jsx
├── src/components/admin/UserModals.jsx
├── src/pages/admin/SessionsPage.jsx
├── src/services/adminOps.service.js
└── src/App.jsx
```

**Structure Decision**: Keep authorization enforcement on both layers: frontend route guard for UX, backend middleware as the source of truth. Admin list/mutation behavior stays in admin routes and users/session services.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Existing React 19 package drift from constitution React 18 | Repo already contains React 19.2.6 | Must be explicitly remediated or approved before implementation completion. |
