# Tasks: Authentication

**Input**: Design documents from `.sdd/specs/feat-auth-and-users/feat-auth/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Tests**: Included because the feature spec defines independent testing and the project constitution requires service/query/API coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm auth feature inputs, environment needs, and implementation boundaries.

- [x] T001 [P] Review authentication design inputs in `.sdd/specs/feat-auth-and-users/feat-auth/plan.md`
- [x] T002 [P] Review authentication API contract in `.sdd/specs/feat-auth-and-users/feat-auth/contracts/api-contract.md`
- [x] T003 [P] Review authentication validation scenarios in `.sdd/specs/feat-auth-and-users/feat-auth/quickstart.md`
- [x] T004 [P] Confirm backend auth route map in `backend/src/routes/api/v1/auth.routes.js`
- [x] T005 [P] Confirm frontend auth entry points in `frontend/src/pages/auth/Login.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared account, token, session, validation, and response behavior used by all auth stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Verify user role/status enums and auth columns in `backend/src/db/migrations/001_create_enums.sql`
- [x] T007 Verify account schema and target security fields in `backend/src/db/migrations/002_create_users.sql`
- [x] T008 Verify session schema, active-session view, and OAuth session columns in `backend/src/db/migrations/003_create_sessions.sql`
- [x] T009 Verify verification/reset token schema in `backend/src/db/migrations/005_create_tokens.sql`
- [x] T010 Verify password history schema and indexes in `backend/src/db/migrations/004_create_pwd_history.sql`
- [x] T011 [P] Add auth response envelope tests in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T012 [P] Add token utility expiry/claim tests in `backend/tests/unit/utils/token.util.test.js`
- [x] T013 [P] Add password hash/verify/history helper tests in `backend/tests/unit/utils/password.util.test.js`
- [x] T014 [P] Verify React version drift noted by constitution in `.sdd/specs/feat-auth-and-users/feat-auth/plan.md`

**Checkpoint**: Auth data model, validation primitives, and shared response protocol are ready.

---

## Phase 3: User Story 1 - Đăng ký và Xác thực Tài khoản (Priority: P1) MVP

**Goal**: Guests can register with email/password/full name and activate accounts through a valid verification token.

**Independent Test**: Register a new email, verify the generated token, and confirm the account changes from `pending` to `active`.

### Tests for User Story 1

- [x] T015 [P] [US1] Add registration happy-path and duplicate-email tests in `backend/tests/unit/services/auth.reg.test.js`
- [x] T016 [P] [US1] Add verification token valid/used/expired tests in `backend/tests/unit/services/auth.verify.test.js`
- [x] T017 [P] [US1] Add register controller validation tests in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T018 [P] [US1] Add register form validation tests in `frontend/tests/components/auth/RegisterForm.test.jsx`
- [x] T019 [P] [US1] Add verify email page tests in `frontend/tests/components/auth/VerifyEmailPage.test.jsx`

### Implementation for User Story 1

- [x] T020 [US1] Ensure `register` uses generic duplicate-account messaging and creates pending student accounts in `backend/src/services/auth.service.js`
- [x] T021 [US1] Ensure verification tokens are hashed, expiring, and marked used in `backend/src/db/queries/tokens.queries.js`
- [x] T022 [US1] Ensure registration and verification validators enforce email/password/name rules in `backend/src/controllers/auth.controller.js`
- [x] T023 [US1] Ensure verification email sending is non-secret and environment-based in `backend/src/utils/email.util.js`
- [x] T024 [US1] Ensure register form blocks password confirmation mismatch in `frontend/src/components/auth/RegisterForm.jsx`
- [x] T025 [US1] Ensure verify email page handles success, expired, and invalid token states in `frontend/src/pages/auth/VerifyEmailPage.jsx`

**Checkpoint**: US1 supports independent account creation and activation.

---

## Phase 4: User Story 2 - Đăng nhập và Đi tới đúng Không gian làm việc (Priority: P1)

**Goal**: Active users can log in safely, sessions are created, and frontend redirects users by role.

**Independent Test**: Log in as student, tutor, and admin; confirm each user reaches the correct workspace and bad credentials do not reveal account existence.

### Tests for User Story 2

- [x] T026 [P] [US2] Add valid/invalid/status-blocked login tests in `backend/tests/unit/services/auth.login.test.js`
- [x] T027 [P] [US2] Add failed-attempt lockout tests in `backend/tests/unit/services/auth.verifyLogin.test.js`
- [x] T028 [P] [US2] Add session limit and oldest-session revoke tests in `backend/tests/unit/services/auth.login.test.js`
- [x] T029 [P] [US2] Add login controller cookie/envelope tests in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T030 [P] [US2] Add role redirect tests in `frontend/tests/components/auth/LoginForm.test.jsx`
- [x] T031 [P] [US2] Add protected route redirect tests in `frontend/tests/components/auth/ProtectedRoute.test.jsx`

### Implementation for User Story 2

- [x] T032 [US2] Ensure login verifies active status, lockout state, and generic error messaging in `backend/src/services/auth.service.js`
- [x] T033 [US2] Ensure failed login tracking and successful login reset run through parameterized queries in `backend/src/db/queries/users.queries.js`
- [x] T034 [US2] Ensure max-three-session enforcement revokes oldest active session in `backend/src/db/queries/sessions.queries.js`
- [x] T035 [US2] Ensure login controller sets secure cookies and returns safe user data only in `backend/src/controllers/auth.controller.js`
- [x] T036 [US2] Ensure AuthContext stores safe user state and exposes login/logout/refreshUser in `frontend/src/context/AuthContext.jsx`
- [x] T037 [US2] Ensure LoginForm redirects student/tutor/admin to correct workspace paths in `frontend/src/components/auth/LoginForm.jsx`
- [x] T038 [US2] Ensure ProtectedRoute redirects unauthorized roles without rendering protected content in `frontend/src/components/auth/ProtectedRoute.jsx`

**Checkpoint**: US2 supports authenticated access and role-aware navigation independently.

---

## Phase 5: User Story 3 - Khôi phục hoặc Đổi Mật khẩu (Priority: P2)

**Goal**: Users can recover access through email reset and change passwords while authenticated.

**Independent Test**: Request reset for any email, reset with a valid token, reject reused/expired tokens, and change password with correct current password.

### Tests for User Story 3

- [x] T039 [P] [US3] Add forgot-password anti-enumeration tests in `backend/tests/unit/services/auth.forgot-pwd.test.js`
- [x] T040 [P] [US3] Add reset token valid/expired/used tests in `backend/tests/unit/services/auth.reset.test.js`
- [x] T041 [P] [US3] Add password history reuse tests in `backend/tests/db/queries/pwd.queries.test.js`
- [x] T042 [P] [US3] Add change-password local and Google-only tests in `backend/tests/unit/services/auth.reset.test.js`
- [x] T043 [P] [US3] Add forgot/reset/change password form tests in `frontend/tests/components/auth/ForgotPwdForm.test.jsx`
- [x] T044 [P] [US3] Add reset password form tests in `frontend/tests/components/auth/ResetPwdForm.test.jsx`

### Implementation for User Story 3

- [x] T045 [US3] Ensure forgot-password always returns generic response and hashes reset token in `backend/src/services/auth.service.js`
- [x] T046 [US3] Ensure reset-password rejects invalid, expired, used, and recent-password reuse cases in `backend/src/services/auth.service.js`
- [x] T047 [US3] Ensure password updates and history inserts occur atomically where required in `backend/src/db/queries/pwd.queries.js`
- [x] T048 [US3] Ensure change-password rejects Google-only accounts and wrong current passwords in `backend/src/services/auth.service.js`
- [x] T049 [US3] Ensure reset/change validators enforce minimum password length in `backend/src/controllers/auth.controller.js`
- [x] T050 [US3] Ensure frontend forgot/reset forms show generic/specific messages according to contract in `frontend/src/components/auth/ForgotPwdForm.jsx`
- [x] T051 [US3] Ensure ChangePwdModal handles mismatch, short password, success, and API error states in `frontend/src/components/profile/ChangePwdModal.jsx`

**Checkpoint**: US3 can be validated without Google OAuth.

---

## Phase 6: User Story 4 - Tiếp tục với Google (Priority: P3)

**Goal**: Guests can authenticate through Google, get a local account/session, and receive clear errors on provider failures.

**Independent Test**: Start Google login, complete callback with valid provider profile, and confirm local user/session creation and role-aware redirect.

### Tests for User Story 4

- [x] T052 [P] [US4] Add Google redirect state cookie tests in `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T053 [P] [US4] Add Google callback success/failure tests in `backend/tests/unit/services/auth.oauth.test.js`
- [x] T054 [P] [US4] Add OAuth account upsert tests in `backend/tests/unit/db/queries/users.queries.test.js`
- [x] T055 [P] [US4] Add Google button rendering/navigation tests in `frontend/tests/components/auth/LoginForm.test.jsx`

### Implementation for User Story 4

- [x] T056 [US4] Ensure Google redirect builds URL from env config and sets state cookie in `backend/src/controllers/auth.controller.js`
- [x] T057 [US4] Ensure Google callback validates state before exchanging code in `backend/src/controllers/auth.controller.js`
- [x] T058 [US4] Ensure Google profile upsert creates or updates active student accounts and oauth links in `backend/src/db/queries/users.queries.js`
- [x] T059 [US4] Ensure OAuth login creates sessions with `is_oauth` and `oauth_provider` in `backend/src/services/auth.service.js`
- [x] T060 [US4] Ensure Google callback redirects success/error states to frontend routes in `backend/src/controllers/auth.controller.js`
- [x] T061 [US4] Ensure Google login button uses `/api/v1/auth/google` and displays retry-friendly errors in `frontend/src/components/auth/GoogleLoginButton.jsx`

**Checkpoint**: US4 adds OAuth without changing email/password auth behavior.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Governance, security hardening, and full validation across auth stories.

- [x] T062 [P] Verify no auth response exposes `password_hash`, reset tokens, verification tokens, or session secrets in `backend/src/controllers/auth.controller.js`
- [x] T063 [P] Verify auth errors pass through centralized handler without stack traces in `backend/src/middleware/errorHandler.js`
- [x] T064 [P] Verify auth rate limiters are applied to login, register, and forgot password in `backend/src/routes/api/v1/auth.routes.js`
- [x] T065 Run backend auth tests and record results in `.sdd/specs/feat-auth-and-users/feat-auth/tasks.md`
- [x] T066 Run frontend auth tests and record results in `.sdd/specs/feat-auth-and-users/feat-auth/tasks.md`
- [x] T067 Execute quickstart scenarios and update findings in `.sdd/specs/feat-auth-and-users/feat-auth/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are both P1; US1 is the MVP account-entry path.
- US3 depends on foundational token/password infrastructure.
- US4 depends on foundational session infrastructure.
- Phase 7 depends on all selected user stories.

### User Story Dependencies

- US1: no story dependency after foundation.
- US2: no story dependency after foundation, but manual login requires an active account from US1 or seeded data.
- US3: no story dependency after foundation, but manual reset requires a user account.
- US4: no story dependency after foundation, but uses same session creation path as US2.

### Parallel Opportunities

- T001-T005 can run in parallel.
- T011-T014 can run in parallel after schema review.
- Test tasks within each story marked `[P]` can run in parallel.
- US3 and US4 can proceed in parallel after US1/US2 are stable enough for shared auth/session behavior.

## Parallel Example: User Story 1

```text
Task: "Add registration happy-path and duplicate-email tests in backend/tests/unit/services/auth.reg.test.js"
Task: "Add verification token valid/used/expired tests in backend/tests/unit/services/auth.verify.test.js"
Task: "Add register form validation tests in frontend/tests/components/auth/RegisterForm.test.jsx"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 registration/verification.
3. Validate account activation independently.

### Incremental Delivery

1. Deliver US1 account creation.
2. Deliver US2 login/session/role navigation.
3. Deliver US3 password recovery/change.
4. Deliver US4 Google login.

### Notes

- Every task includes a file path and follows checklist format.
- Do not return secrets or raw token values in API responses.
- Do not add ORM usage; keep `pg` parameterized SQL.
