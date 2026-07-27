# Tasks: User Profile

**Input**: Design documents from `.sdd/specs/feat-auth-and-users/feat-profile/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Tests**: Included because the feature spec defines independent testing and the project constitution requires service/query/API coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm profile inputs, API boundaries, and UI ownership.

- [x] T001 [P] Review profile design inputs in `.sdd/specs/feat-auth-and-users/feat-profile/plan.md`
- [x] T002 [P] Review profile API contract in `.sdd/specs/feat-auth-and-users/feat-profile/contracts/api-contract.md`
- [x] T003 [P] Review profile validation scenarios in `.sdd/specs/feat-auth-and-users/feat-profile/quickstart.md`
- [x] T004 [P] Confirm self-service user route map in `backend/src/routes/api/v1/users.routes.js`
- [x] T005 [P] Confirm profile UI entry points in `frontend/src/pages/student/UserProfilePage.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared profile schema, auth boundary, safe serialization, and upload infrastructure.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Verify profile fields on `users` schema in `backend/src/db/migrations/002_create_users.sql`
- [x] T007 Verify `target_test_date` migration exists and is migration-managed in `backend/src/db/migrations/027_add_target_test_date.sql`
- [x] T008 Remove runtime DDL from profile update query and rely on migrations only in `backend/src/db/queries/users.queries.js`
- [x] T009 [P] Add profile safe-serialization tests in `backend/tests/unit/services/users.profile.test.js`
- [x] T010 [P] Add users controller envelope/auth tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T011 [P] Add avatar middleware size/type tests in `backend/tests/unit/middleware/uploadImage.middleware.test.js`
- [x] T012 [P] Verify React version drift noted by constitution in `.sdd/specs/feat-auth-and-users/feat-profile/plan.md`

**Checkpoint**: Profile reads/writes can be implemented without leaking sensitive auth data or runtime schema mutation.

---

## Phase 3: User Story 1 - Xem Hồ sơ Cá nhân (Priority: P1) MVP

**Goal**: Authenticated users can view identity, role, status, avatar placeholder, learning goal fields, and account timestamps.

**Independent Test**: Log in and open `/profile`; verify profile fields render and unauthenticated users are redirected.

### Tests for User Story 1

- [x] T013 [P] [US1] Add get-profile safe data tests in `backend/tests/unit/services/users.profile.test.js`
- [x] T014 [P] [US1] Add `GET /api/v1/users/me` auth and envelope tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T015 [P] [US1] Add AuthContext refresh profile tests in `frontend/tests/unit/context/AuthContext.test.jsx`
- [x] T016 [P] [US1] Add profile identity and placeholder rendering tests in `frontend/tests/pages/UserProfilePage.test.jsx`

### Implementation for User Story 1

- [x] T017 [US1] Ensure `getProfile` strips `password_hash` and missing sensitive fields in `backend/src/services/users.service.js`
- [x] T018 [US1] Ensure `findUserById` remains parameterized and returns required profile fields in `backend/src/db/queries/users.queries.js`
- [x] T019 [US1] Ensure `getProfile` controller reads user id only from `req.user.id` in `backend/src/controllers/users.controller.js`
- [x] T020 [US1] Ensure `refreshUser` loads `/users/me` and sets authenticated state correctly in `frontend/src/context/AuthContext.jsx`
- [x] T021 [US1] Ensure profile page renders email, role, status, target fields, and fallback avatar in `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T022 [US1] Ensure unauthenticated profile access redirects through route guard in `frontend/src/App.jsx`

**Checkpoint**: US1 can be demonstrated with only an authenticated account.

---

## Phase 4: User Story 2 - Cập nhật Hồ sơ Học tập (Priority: P1)

**Goal**: Users can update full name, avatar URL, target IELTS band, and target test date.

**Independent Test**: Edit profile fields, save, refresh page, and verify values persist.

### Tests for User Story 2

- [x] T023 [P] [US2] Add target band validation tests in `backend/tests/unit/services/users.profile.test.js`
- [x] T024 [P] [US2] Add profile update query tests in `backend/tests/unit/db/queries/users.queries.test.js`
- [x] T025 [P] [US2] Add `PATCH /api/v1/users/me` tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T026 [P] [US2] Add profile edit form persistence tests in `frontend/tests/pages/UserProfilePage.test.jsx`

### Implementation for User Story 2

- [x] T027 [US2] Ensure `updateProfile` validates target band 0.0-9.0 and 0.5 increments in `backend/src/services/users.service.js`
- [x] T028 [US2] Ensure profile update supports setting and clearing `target_test_date` in `backend/src/db/queries/users.queries.js`
- [x] T029 [US2] Ensure profile update endpoint accepts PUT and PATCH consistently in `backend/src/routes/api/v1/users.routes.js`
- [x] T030 [US2] Ensure frontend normalizes band score and submits null date when cleared in `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T031 [US2] Ensure successful save refreshes AuthContext user state in `frontend/src/pages/student/UserProfilePage.jsx`

**Checkpoint**: US2 persists learning profile fields independently of avatar upload.

---

## Phase 5: User Story 3 - Tải lên Ảnh đại diện (Priority: P2)

**Goal**: Users can upload a supported avatar image, receive an avatar URL, and save it to their profile.

**Independent Test**: Upload a valid image under size limit, save profile, reload, and verify the avatar renders; invalid files are rejected.

### Tests for User Story 3

- [x] T032 [P] [US3] Add avatar upload controller success/failure tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T033 [P] [US3] Add avatar storage adapter tests in `backend/tests/unit/storage/objectStorage.adapter.test.js`
- [x] T034 [P] [US3] Add upload file size/type tests in `backend/tests/unit/middleware/uploadImage.middleware.test.js`
- [x] T035 [P] [US3] Add frontend avatar upload tests in `frontend/tests/pages/UserProfilePage.test.jsx`

### Implementation for User Story 3

- [x] T036 [US3] Ensure upload middleware rejects unsupported MIME types and files over policy limit in `backend/src/middleware/uploadImage.middleware.js`
- [x] T037 [US3] Ensure `uploadAvatar` requires an uploaded file and user id from auth middleware in `backend/src/controllers/users.controller.js`
- [x] T038 [US3] Ensure avatar storage returns stable public `avatar_url` values in `backend/src/services/avatarStorage.service.js`
- [x] T039 [US3] Ensure frontend upload fills `avatar_url` and requires save confirmation in `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T040 [US3] Ensure avatar upload errors are visible and do not mutate saved profile state in `frontend/src/pages/student/UserProfilePage.jsx`

**Checkpoint**: US3 can be validated without changing password or support history.

---

## Phase 6: User Story 4 - Quản lý Cài đặt Bảo mật (Priority: P2)

**Goal**: Logged-in users with local passwords can change passwords; Google-only users get clear guidance.

**Independent Test**: Change password with valid current password and reject mismatched/short/wrong-current cases.

### Tests for User Story 4

- [x] T041 [P] [US4] Add change-password local account tests in `backend/tests/unit/services/auth.reset.test.js`
- [x] T042 [P] [US4] Add Google-only password guidance tests in `backend/tests/unit/services/auth.reset.test.js`
- [x] T043 [P] [US4] Add profile security UI tests in `frontend/tests/pages/UserProfilePage.test.jsx`
- [x] T044 [P] [US4] Add ChangePwdModal validation tests in `frontend/tests/components/profile/ChangePwdModal.test.jsx`

### Implementation for User Story 4

- [x] T045 [US4] Ensure password change endpoint remains authenticated in `backend/src/routes/api/v1/auth.routes.js`
- [x] T046 [US4] Ensure `changePassword` validates current password and rejects Google-only accounts in `backend/src/services/auth.service.js`
- [x] T047 [US4] Ensure security settings page opens password modal from profile navigation in `frontend/src/pages/student/SecuritySettingsPage.jsx`
- [x] T048 [US4] Ensure ChangePwdModal blocks mismatched or short passwords before request in `frontend/src/components/profile/ChangePwdModal.jsx`
- [x] T049 [US4] Ensure ChangePwdModal surfaces API success and error states in `frontend/src/components/profile/ChangePwdModal.jsx`

**Checkpoint**: US4 reuses auth password behavior without duplicating backend logic.

---

## Phase 7: User Story 5 - Xem Lịch sử Hỗ trợ (Priority: P3)

**Goal**: Users can view previous support requests and admin replies, including an empty state.

**Independent Test**: Open support history with and without requests; verify status, timestamps, content, and admin reply render.

### Tests for User Story 5

- [x] T050 [P] [US5] Add support history query tests in `backend/tests/unit/db/queries/support.queries.test.js`
- [x] T051 [P] [US5] Add support history service/controller tests in `backend/tests/unit/controllers/users.controller.test.js`
- [x] T052 [P] [US5] Add contact history modal rendering tests in `frontend/tests/components/profile/ContactHistoryModal.test.jsx`

### Implementation for User Story 5

- [x] T053 [US5] Ensure support history query filters by authenticated user id in `backend/src/db/queries/support.queries.js`
- [x] T054 [US5] Ensure any support history endpoint returns standard envelope and no other users' data in `backend/src/controllers/users.controller.js`
- [x] T055 [US5] Ensure ContactHistoryModal renders request content, status, created time, and admin reply in `frontend/src/components/profile/ContactHistoryModal.jsx`
- [x] T056 [US5] Ensure empty support history renders a usable empty state in `frontend/src/components/profile/ContactHistoryModal.jsx`

**Checkpoint**: US5 can be validated independently from profile editing.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Governance, security hardening, and full validation across profile stories.

- [x] T057 [P] Verify no profile response exposes auth secrets in `backend/src/services/users.service.js`
- [x] T058 [P] Verify all profile queries use parameterized SQL in `backend/src/db/queries/users.queries.js`
- [x] T059 [P] Verify profile UI handles loading, success, error, and empty states in `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T060 Run backend profile tests and record results in `.sdd/specs/feat-auth-and-users/feat-profile/tasks.md`
- [x] T061 Run frontend profile tests and record results in `.sdd/specs/feat-auth-and-users/feat-profile/tasks.md`
- [x] T062 Execute quickstart scenarios and update findings in `.sdd/specs/feat-auth-and-users/feat-profile/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- US1 and US2 are P1 and form the MVP profile surface.
- US3 and US4 depend on authenticated profile access from US1.
- US5 depends on authenticated profile access from US1.
- Phase 8 depends on all selected user stories.

### User Story Dependencies

- US1: no story dependency after foundation.
- US2: depends on US1 profile read for refresh validation.
- US3: depends on US1 authenticated access and optionally US2 save flow.
- US4: depends on auth password endpoint and US1 profile navigation.
- US5: depends on US1 authenticated access.

### Parallel Opportunities

- T001-T005 can run in parallel.
- T009-T012 can run in parallel after schema review.
- Tests inside each user story marked `[P]` can run in parallel.
- US3, US4, and US5 can proceed in parallel after US1 is stable.

## Parallel Example: User Story 3

```text
Task: "Add avatar upload controller success/failure tests in backend/tests/unit/controllers/users.controller.test.js"
Task: "Add avatar storage adapter tests in backend/tests/unit/storage/objectStorage.adapter.test.js"
Task: "Add frontend avatar upload tests in frontend/tests/pages/UserProfilePage.test.jsx"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 profile read and US2 profile update.
3. Validate `/profile` view/edit independently.

### Incremental Delivery

1. Deliver US1 profile viewing.
2. Deliver US2 learning profile updates.
3. Deliver US3 avatar upload.
4. Deliver US4 password settings.
5. Deliver US5 support history.

### Notes

- Every task includes a file path and follows checklist format.
- Keep identity from `req.user.id`; never accept profile user id from body/query.
- Replace runtime schema mutation with migrations-only behavior before implementation completion.
