# Implementation Plan: Audit Log and Change History

**Branch**: `feat-auth-and-users` | **Date**: 2026-07-24 | **Spec**: `feat-audit-log/spec.md`

**Input**: Feature specification from `.sdd/specs/feat-auth-and-users/feat-audit-log/spec.md`

## Summary

Backfill design for the existing audit trail capability: sensitive auth/admin events are persisted to PostgreSQL `audit_logs`, exposed through admin-only Express endpoints, and rendered in React admin activity/change-log pages with pagination, severity labeling, detail diffing, undo eligibility, and undo execution for supported user role/status changes.

## Technical Context

**Language/Version**: Node.js 20+, CommonJS backend; React + Vite frontend currently installed as React 19.2.6.

**Primary Dependencies**: Express 5.2, `pg`, `express-validator`, JWT/cookie auth, React Router, Axios, Bootstrap/react-bootstrap.

**Storage**: PostgreSQL 16 via raw `pg` queries; no ORM. Audit data lives in `audit_logs` plus joined `users`.

**Testing**: Backend Jest/Supertest; frontend Vitest/Testing Library.

**Target Platform**: Web application with REST API backend and browser admin UI.

**Project Type**: Full-stack web application (`backend/` + `frontend/`).

**Performance Goals**: Activity/change-log list queries complete under 3 seconds for normal operational volume; suspicious and failed-login stats visible within 10 seconds.

**Constraints**: Admin-only access; mutating undo endpoint requires auth middleware; parameterized SQL; append-only audit history; no secrets in API responses.

**Scale/Scope**: Auth/security/admin audit events for users, sessions, grading/content actions, with paginated read paths capped by backend query limits.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Tech stack: PASS for Node 20, Express 5, PostgreSQL, raw `pg`; WATCH because frontend package currently uses React 19.2.6 while constitution states React 18.
- Database rules: PASS. `audit.queries.js` uses parameterized SQL and UUID primary keys. Audit rows are append-only; undo marks source rows instead of deletion.
- API protocol: PASS. Admin controllers return `{ success, data, error, meta }`.
- Security: PASS. `/api/v1/admin/activity-logs`, `/change-logs`, and undo routes use `authenticate` + `authorize('admin')`; actor comes from middleware.
- Code quality/testing: PASS WITH RISK. Existing tests cover audit service/query areas, but implementation tasks must keep new functions within size limits and maintain 80% coverage.

Post-design re-check: PASS WITH NOTED RISK. No new ORM, secrets, unguarded mutating endpoint, or hard delete is introduced by this plan. React version drift remains a project-level remediation item.

## Project Structure

### Documentation (this feature)

```text
.sdd/specs/feat-auth-and-users/feat-audit-log/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-contract.md
└── spec.md
```

### Source Code (repository root)

```text
backend/
├── src/controllers/admin.controller.js
├── src/services/audit.service.js
├── src/db/queries/audit.queries.js
├── src/db/migrations/006_create_audit_logs.sql
├── src/db/migrations/011_patch_audit_logs_undo.sql
├── src/db/migrations/012_backfill_audit_logs_can_undo.sql
├── src/db/migrations/017_add_security_log_actions.sql
└── tests/

frontend/
├── src/pages/admin/AdminActivityLogPage.jsx
├── src/pages/admin/AdminChangeLogPage.jsx
├── src/services/adminStats.service.js
├── src/services/adminOps.service.js
└── tests/
```

**Structure Decision**: Use existing full-stack layout. Backend owns persistence, security, formatting, and undo transactions; frontend owns admin display, filters, detail modal, and optimistic refresh behavior.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Existing React 19 package drift from constitution React 18 | Repo already contains React 19.2.6 | Silent mismatch would hide a governance issue; implementation should either align dependency or amend constitution. |
