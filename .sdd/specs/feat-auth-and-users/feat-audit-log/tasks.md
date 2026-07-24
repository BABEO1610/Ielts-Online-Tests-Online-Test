# Tasks: Audit Log and Change History

**Input**: Design documents from `.sdd/specs/feat-auth-and-users/feat-audit-log/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Tests**: Included because the feature spec defines independent testing and the project constitution requires service/query/API coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm audit feature inputs, contracts, and existing implementation boundaries before story work.

- [x] T001 [P] Review audit design inputs in `.sdd/specs/feat-auth-and-users/feat-audit-log/plan.md`
- [x] T002 [P] Review audit API contract in `.sdd/specs/feat-auth-and-users/feat-audit-log/contracts/api-contract.md`
- [x] T003 [P] Review audit validation scenarios in `.sdd/specs/feat-auth-and-users/feat-audit-log/quickstart.md`
- [x] T004 [P] Confirm audit source ownership in `backend/src/services/audit.service.js`
- [x] T005 [P] Confirm admin audit UI ownership in `frontend/src/pages/admin/AdminActivityLogPage.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared audit schema, query, auth, and envelope requirements that block every story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Verify `audit_logs` base schema, indexes, and UUID defaults in `backend/src/db/migrations/006_create_audit_logs.sql`
- [x] T007 Verify undo columns and `change_reverted` enum support in `backend/src/db/migrations/011_patch_audit_logs_undo.sql`
- [x] T008 Verify security action enum coverage for suspicious events in `backend/src/db/migrations/017_add_security_log_actions.sql`
- [x] T009 [P] Add or update audit query tests for pagination, filters, summaries, and detail lookup in `backend/tests/db/queries/audit.queries.test.js`
- [x] T010 [P] Add or update admin audit controller envelope tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T011 [P] Verify admin-only route protection for audit endpoints in `backend/src/routes/api/v1/admin.routes.js`
- [x] T012 [P] Document React version drift noted by constitution in `.sdd/specs/feat-auth-and-users/feat-audit-log/plan.md`

**Checkpoint**: Audit schema, route protection, and query contracts are ready.

---

## Phase 3: User Story 1 - Ghi lại các hành động nhạy cảm (Priority: P1) MVP

**Goal**: Security/auth/admin actions create durable audit rows with actor, target, timestamp, IP, and old/new values where meaningful.

**Independent Test**: Perform successful login, failed login, role/status change, password change, and session revoke; confirm each action creates an audit row.

### Tests for User Story 1

- [x] T013 [P] [US1] Add failed-login and successful-login audit assertions in `backend/tests/unit/services/auth.login.test.js`
- [x] T014 [P] [US1] Add password-change audit assertions in `backend/tests/unit/services/auth.reset.test.js`
- [x] T015 [P] [US1] Add role/status audit assertions in `backend/tests/unit/services/users.profile.test.js`
- [x] T016 [P] [US1] Add session revoke audit assertions in `backend/tests/unit/db/queries/sessions.queries.test.js`

### Implementation for User Story 1

- [x] T017 [US1] Verify `AuditLogService.logAction` inserts required actor/action/target/old/new/IP fields in `backend/src/services/audit.service.js`
- [x] T018 [US1] Ensure login success, login failure, lockout, reset, and password change call audit logging in `backend/src/services/auth.service.js`
- [x] T019 [US1] Ensure role and status changes include old/new snapshots and `can_undo` where supported in `backend/src/services/users.service.js`
- [x] T020 [US1] Ensure admin session revocation writes audit context in `backend/src/services/sessions.service.js`
- [x] T021 [US1] Ensure audit logging failures propagate for required traceability actions in `backend/src/services/audit.service.js`

**Checkpoint**: US1 is independently testable through backend service/API tests and direct audit table inspection.

---

## Phase 4: User Story 2 - Theo dõi Nhật ký Hoạt động (Priority: P1)

**Goal**: Admin can view activity logs with pagination, suspicious filtering, severity labels, stats, and empty states.

**Independent Test**: Open `/admin/activity`, toggle all/normal/suspicious filters, and verify table rows and counts update correctly.

### Tests for User Story 2

- [x] T022 [P] [US2] Add activity log list contract tests for `/api/v1/admin/audit-logs` in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T023 [P] [US2] Add activity stats contract tests for `/api/v1/admin/audit-logs/stats` in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T024 [P] [US2] Add frontend service tests for `fetchActivityLogs` in `frontend/tests/unit/services/api.test.js`
- [x] T025 [P] [US2] Add page rendering tests for suspicious and empty states in `frontend/tests/pages/AdminActivityLogPage.test.jsx`

### Implementation for User Story 2

- [x] T026 [US2] Verify `listActivityLogs` applies severity filter and formats actor/target/IP/note fields in `backend/src/services/audit.service.js`
- [x] T027 [US2] Verify `getActivityLogStats` returns total, suspicious, and failed-login counts in `backend/src/db/queries/audit.queries.js`
- [x] T028 [US2] Ensure `/activity-logs`, `/activity-logs/stats`, `/audit-logs`, and `/audit-logs/stats` route aliases are consistent in `backend/src/routes/api/v1/admin.routes.js`
- [x] T029 [US2] Ensure activity log table consumes API rows without sample fallback drift in `frontend/src/pages/admin/AdminActivityLogPage.jsx`
- [x] T030 [US2] Ensure `fetchActivityLogs` returns `rows` and `total` from standard envelope meta in `frontend/src/services/adminStats.service.js`

**Checkpoint**: US2 works independently from seeded audit rows without needing change-log undo.

---

## Phase 5: User Story 3 - Xem lại Lịch sử Thay đổi (Priority: P1)

**Goal**: Admin can view paginated change logs, search/filter by action, inspect field-level before/after values, and see summary counts.

**Independent Test**: Change a user role/status, open `/admin/change-log`, search by action, open detail, and verify old/new field values.

### Tests for User Story 3

- [x] T031 [P] [US3] Add change-log list and summary tests for `/api/v1/admin/change-logs` in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T032 [P] [US3] Add change-log detail tests for `/api/v1/admin/change-logs/:id` in `backend/tests/services/audit.service.test.js`
- [x] T033 [P] [US3] Add frontend change-log search and pagination tests in `frontend/tests/pages/AdminChangeLogPage.test.jsx`
- [x] T034 [P] [US3] Add diff formatting tests for old/new values in `frontend/tests/unit/utils/adminFormat.test.js`

### Implementation for User Story 3

- [x] T035 [US3] Verify `listChangeLogs` returns `summary`, pagination meta, labels, old_value, and new_value in `backend/src/services/audit.service.js`
- [x] T036 [US3] Verify action/search/status filters are parameterized and bounded in `backend/src/db/queries/audit.queries.js`
- [x] T037 [US3] Ensure change-log detail maps undo actor and target labels correctly in `backend/src/services/audit.service.js`
- [x] T038 [US3] Ensure action search mapping and pagination controls match backend query params in `frontend/src/pages/admin/AdminChangeLogPage.jsx`
- [x] T039 [US3] Ensure frontend normalize function preserves `can_undo`, `undone_at`, and `undo_log_id` in `frontend/src/services/adminOps.service.js`

**Checkpoint**: US3 works independently with existing audit rows and no undo action required.

---

## Phase 6: User Story 4 - Hoàn tác Thay đổi Người dùng Được hỗ trợ (Priority: P2)

**Goal**: Admin can undo supported user role/status changes safely while preserving the source audit row and creating a new undo log.

**Independent Test**: Undo an eligible role/status change, verify target user is restored, source row is marked undone, and unsupported/stale/self undo attempts are rejected.

### Tests for User Story 4

- [x] T040 [P] [US4] Add successful role undo service tests in `backend/tests/services/audit.service.test.js`
- [x] T041 [P] [US4] Add stale, unsupported, already-undone, and self-target undo tests in `backend/tests/services/audit.service.test.js`
- [x] T042 [P] [US4] Add undo endpoint contract tests for `/api/v1/admin/change-logs/:id/undo` in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T043 [P] [US4] Add frontend undo modal behavior tests in `frontend/tests/pages/AdminChangeLogPage.test.jsx`

### Implementation for User Story 4

- [x] T044 [US4] Verify `buildUserUndoPlan` supports only user role/status changes in `backend/src/services/audit.service.js`
- [x] T045 [US4] Verify undo transaction locks source audit row and target user before mutation in `backend/src/services/audit.service.js`
- [x] T046 [US4] Verify undo rejects stale target state before updating `users` in `backend/src/services/audit.service.js`
- [x] T047 [US4] Verify undo inserts `change_reverted` and marks source row with `undone_at`, `undone_by`, and `undo_log_id` in `backend/src/services/audit.service.js`
- [x] T048 [US4] Ensure `revertChange` surfaces API errors instead of silent success in `frontend/src/services/adminOps.service.js`
- [x] T049 [US4] Ensure undo button state and summary counts refresh accurately in `frontend/src/pages/admin/AdminChangeLogPage.jsx`

**Checkpoint**: US4 can be validated without breaking US1-US3 behavior.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Governance, performance, and validation across all audit stories.

- [x] T050 [P] Verify audit-related functions stay under constitution size limits in `backend/src/services/audit.service.js`
- [x] T051 [P] Verify no audit endpoint returns secrets or stack traces in `backend/src/middleware/errorHandler.js`
- [x] T052 [P] Add audit quickstart execution notes to `.sdd/specs/feat-auth-and-users/feat-audit-log/quickstart.md`
- [x] T053 Run backend audit tests and record results in `.sdd/specs/feat-auth-and-users/feat-audit-log/tasks.md`
- [x] T054 Run frontend audit page tests and record results in `.sdd/specs/feat-auth-and-users/feat-audit-log/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1, US2, and US3 are all P1 and may proceed after Phase 2, but US1 is the MVP because every view depends on audit rows existing.
- US4 depends on US3 detail data and US1 audit persistence.
- Phase 7 depends on all selected user stories.

### User Story Dependencies

- US1: no story dependency after foundation.
- US2: depends on foundation; needs audit rows for manual validation.
- US3: depends on foundation; needs change audit rows for manual validation.
- US4: depends on US1 and US3.

### Parallel Opportunities

- T001-T005 can run in parallel.
- T009-T012 can run in parallel after migration review.
- Test tasks inside each user story marked `[P]` can run in parallel.
- US2 and US3 can be worked in parallel after US1 logging behavior is available.

## Parallel Example: User Story 2

```text
Task: "Add activity log list contract tests for /api/v1/admin/audit-logs in backend/tests/unit/controllers/auth.controller.test.js"
Task: "Add frontend service tests for fetchActivityLogs in frontend/tests/unit/services/api.test.js"
Task: "Add page rendering tests for suspicious and empty states in frontend/tests/pages/AdminActivityLogPage.test.jsx"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 so sensitive actions reliably create audit rows.
3. Validate US1 through backend tests and direct audit table checks.

### Incremental Delivery

1. Deliver US1 logging.
2. Deliver US2 activity monitoring.
3. Deliver US3 change-log inspection.
4. Deliver US4 undo after detail and transaction tests pass.

### Notes

- Every task includes a file path and follows checklist format.
- Do not introduce ORM usage.
- Keep audit history append-only; undo must mark source rows instead of deleting them.
