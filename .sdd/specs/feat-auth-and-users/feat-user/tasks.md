# Tasks: User Administration and Authorization

**Input**: Design documents from `.sdd/specs/feat-auth-and-users/feat-user/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Tests**: Included because the feature spec defines independent testing and the project constitution requires service/query/API coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm admin/user feature inputs, route ownership, and UI boundaries.

- [x] T001 [P] Review user administration design inputs in `.sdd/specs/feat-auth-and-users/feat-user/plan.md`
- [x] T002 [P] Review user administration API contract in `.sdd/specs/feat-auth-and-users/feat-user/contracts/api-contract.md`
- [x] T003 [P] Review user administration validation scenarios in `.sdd/specs/feat-auth-and-users/feat-user/quickstart.md`
- [x] T004 [P] Confirm admin route map in `backend/src/routes/api/v1/admin.routes.js`
- [x] T005 [P] Confirm admin UI route map in `frontend/src/App.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared authorization, user/session schema, safe serialization, and admin response behavior.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Verify role and status enums include supported values in `backend/src/db/migrations/001_create_enums.sql`
- [x] T007 Verify `users` schema supports admin list and mutation fields in `backend/src/db/migrations/002_create_users.sql`
- [x] T008 Verify `user_sessions` and `v_active_sessions` support admin session listing in `backend/src/db/migrations/010_patch_sessions_add_oauth.sql`
- [x] T009 [P] Add authenticate middleware tests for missing/expired/revoked sessions in `backend/tests/unit/middleware/authenticate.test.js`
- [x] T010 [P] Add authorize middleware tests for non-admin access denial in `backend/tests/unit/middleware/authorize.test.js`
- [x] T011 [P] Add admin response envelope tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T012 [P] Verify React version drift noted by constitution in `.sdd/specs/feat-auth-and-users/feat-user/plan.md`

**Checkpoint**: Backend authorization and shared admin data contracts are ready.

---

## Phase 3: User Story 1 - Bảo vệ Các Khu vực Theo Vai trò (Priority: P1) MVP

**Goal**: Student, tutor, and admin users can only access areas allowed for their roles.

**Independent Test**: Log in as each role and attempt to open student, tutor, and admin routes; verify allowed routes render and disallowed routes redirect or return 403.

### Tests for User Story 1

- [x] T013 [P] [US1] Add backend admin authorization tests in `backend/tests/unit/middleware/authorize.test.js`
- [x] T014 [P] [US1] Add protected route role redirect tests in `frontend/tests/components/auth/ProtectedRoute.test.jsx`
- [x] T015 [P] [US1] Add App route guard smoke tests in `frontend/tests/unit/pages/LandingPage.test.jsx`

### Implementation for User Story 1

- [x] T016 [US1] Ensure admin routes require `authenticate` and `authorize('admin')` in `backend/src/routes/api/v1/admin.routes.js`
- [x] T017 [US1] Ensure `authorize` returns clear 403 errors for insufficient role in `backend/src/middleware/authorize.js`
- [x] T018 [US1] Ensure `authenticate` denies revoked/expired sessions and inactive users in `backend/src/middleware/authenticate.js`
- [x] T019 [US1] Ensure ProtectedRoute redirects unauthorized roles to correct workspace in `frontend/src/components/auth/ProtectedRoute.jsx`
- [x] T020 [US1] Ensure admin, tutor, and student route declarations use ProtectedRoute consistently in `frontend/src/App.jsx`

**Checkpoint**: US1 enforces role boundaries without any admin list dependency.

---

## Phase 4: User Story 2 - Tìm kiếm và Lọc Người dùng (Priority: P1)

**Goal**: Admin can browse, search, filter, and paginate users.

**Independent Test**: Open `/admin/users`, apply search/role/status filters, move pages, and verify table/meta/empty state.

### Tests for User Story 2

- [x] T021 [P] [US2] Add list user query tests for search, role, status, and pagination in `backend/tests/unit/db/queries/users.queries.test.js`
- [x] T022 [P] [US2] Add admin list users controller tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T023 [P] [US2] Add AdminUsersPage filter and pagination tests in `frontend/tests/pages/AdminUsersPage.test.jsx`
- [x] T024 [P] [US2] Add admin format tests for role/status/date display in `frontend/tests/unit/utils/adminFormat.test.js`

### Implementation for User Story 2

- [x] T025 [US2] Ensure `listUsers` query uses parameterized role/status/search filters and returns count in `backend/src/db/queries/users.queries.js`
- [x] T026 [US2] Ensure `usersService.listUsers` strips `password_hash` from every row in `backend/src/services/users.service.js`
- [x] T027 [US2] Ensure admin controller parses page/limit safely and returns meta total in `backend/src/controllers/admin.controller.js`
- [x] T028 [US2] Ensure AdminUsersPage sends search/role/status/page/limit params to `/admin/users` in `frontend/src/pages/admin/AdminUsersPage.jsx`
- [x] T029 [US2] Ensure AdminUsersPage renders loading, empty, error, and pagination states in `frontend/src/pages/admin/AdminUsersPage.jsx`

**Checkpoint**: US2 can be validated without role/status mutation.

---

## Phase 5: User Story 3 - Thay đổi Vai trò hoặc Trạng thái Người dùng (Priority: P1)

**Goal**: Admin can change another user's role/status, cannot self-change, and affected sessions are revoked where required.

**Independent Test**: Change another user's role/status, reload list, verify old sessions are revoked, and confirm self-change is rejected.

### Tests for User Story 3

- [x] T030 [P] [US3] Add role change service tests including self-change rejection in `backend/tests/unit/services/users.profile.test.js`
- [x] T031 [P] [US3] Add status change service tests including inactive/banned session revoke in `backend/tests/unit/services/users.profile.test.js`
- [x] T032 [P] [US3] Add admin role/status endpoint tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T033 [P] [US3] Add UserModals save/error tests in `frontend/tests/components/admin/UserModals.test.jsx`

### Implementation for User Story 3

- [x] T034 [US3] Ensure `changeUserRole` rejects self-change and missing targets in `backend/src/services/users.service.js`
- [x] T035 [US3] Ensure `changeUserRole` revokes target sessions after successful role update in `backend/src/services/users.service.js`
- [x] T036 [US3] Ensure `changeUserStatus` rejects self-change and missing targets in `backend/src/services/users.service.js`
- [x] T037 [US3] Ensure `changeUserStatus` revokes target sessions when status becomes inactive or banned in `backend/src/services/users.service.js`
- [x] T038 [US3] Ensure role/status endpoints validate request body values in `backend/src/controllers/admin.controller.js`
- [x] T039 [US3] Ensure UserModals disables self-management and shows API errors in `frontend/src/components/admin/UserModals.jsx`
- [x] T040 [US3] Ensure AdminUsersPage refreshes list after role/status update in `frontend/src/pages/admin/AdminUsersPage.jsx`

**Checkpoint**: US3 provides safe user mutation without requiring session list UI.

---

## Phase 6: User Story 4 - Quản lý Các Phiên Hoạt động (Priority: P2)

**Goal**: Admin can view active sessions, filter/search locally by user or login type, and revoke suspicious sessions.

**Independent Test**: Open `/admin/sessions`, filter password/OAuth sessions, revoke one session, and verify it cannot be used again.

### Tests for User Story 4

- [x] T041 [P] [US4] Add active session list query tests in `backend/tests/unit/db/queries/sessions.queries.test.js`
- [x] T042 [P] [US4] Add revoke session by id tests in `backend/tests/unit/db/queries/sessions.queries.test.js`
- [x] T043 [P] [US4] Add admin sessions controller tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T044 [P] [US4] Add SessionsPage filter/revoke tests in `frontend/tests/pages/SessionsPage.test.jsx`

### Implementation for User Story 4

- [x] T045 [US4] Ensure `listAllActiveSessions` reads only active rows from `v_active_sessions` in `backend/src/db/queries/sessions.queries.js`
- [x] T046 [US4] Ensure `getAllActiveSessions` formats user, email, device, IP, login type, last active, and expiry in `backend/src/services/sessions.service.js`
- [x] T047 [US4] Ensure `revokeSessionById` returns clear error for missing or already revoked sessions in `backend/src/services/sessions.service.js`
- [x] T048 [US4] Ensure admin session routes require admin authorization in `backend/src/routes/api/v1/admin.routes.js`
- [x] T049 [US4] Ensure `fetchSessions` and `revokeSession` use real API errors instead of silent fallback success in `frontend/src/services/adminOps.service.js`
- [x] T050 [US4] Ensure SessionsPage search/filter/revoke states update rows after successful revocation in `frontend/src/pages/admin/SessionsPage.jsx`

**Checkpoint**: US4 can be validated independently once admin auth exists.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Audit integration, security hardening, and full validation across user administration stories.

- [x] T051 [P] Verify role/status/session admin actions insert audit logs in `backend/src/services/users.service.js`
- [x] T052 [P] Verify session revoke admin action inserts audit logs in `backend/src/services/sessions.service.js`
- [x] T053 [P] Verify no admin user/session response exposes auth secrets in `backend/src/controllers/admin.controller.js`
- [x] T054 [P] Verify admin pages do not rely on sample data when API is available in `frontend/src/services/adminOps.service.js`
- [x] T055 Run backend user administration tests and record results in `.sdd/specs/feat-auth-and-users/feat-user/tasks.md`
- [x] T056 Run frontend user administration tests and record results in `.sdd/specs/feat-auth-and-users/feat-user/tasks.md`
- [x] T057 Execute quickstart scenarios and update findings in `.sdd/specs/feat-auth-and-users/feat-user/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1, US2, and US3 are P1; US1 is the MVP security boundary.
- US4 depends on backend admin authorization from US1.
- Phase 7 depends on all selected user stories.

### User Story Dependencies

- US1: no story dependency after foundation.
- US2: depends on US1 for admin-only access.
- US3: depends on US2 for selecting target users, but backend service tests can start after foundation.
- US4: depends on US1 for admin-only access and session schema foundation.

### Parallel Opportunities

- T001-T005 can run in parallel.
- T009-T012 can run in parallel after schema review.
- Tests inside each story marked `[P]` can run in parallel.
- US2 and US4 frontend work can proceed in parallel after US1 route guard behavior is stable.

## Parallel Example: User Story 2

```text
Task: "Add list user query tests for search, role, status, and pagination in backend/tests/unit/db/queries/users.queries.test.js"
Task: "Add admin list users controller tests in backend/tests/unit/controllers/users.controller.test.js"
Task: "Add AdminUsersPage filter and pagination tests in frontend/tests/pages/AdminUsersPage.test.jsx"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 role protection.
3. Validate direct API and frontend route access by role.

### Incremental Delivery

1. Deliver US1 role boundaries.
2. Deliver US2 user list/search/filter.
3. Deliver US3 role/status mutations.
4. Deliver US4 session management.

### Notes

- Every task includes a file path and follows checklist format.
- Backend authorization is source of truth; frontend guards are UX support.
- Do not hard-delete sessions; revocation sets `revoked_at`.
