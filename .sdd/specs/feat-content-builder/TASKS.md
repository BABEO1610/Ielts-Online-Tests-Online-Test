---
description: "Task list for CMS & Exam Builder"
---

# Tasks: CMS & Exam Builder (feat-content-builder)

**Input**: Design documents from `/specs/feat-content-builder/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/` (API, Services, Queries)
- **Frontend**: `frontend/src/` (Pages, Components, Hooks)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T002 [P] Cài đặt thư viện `multer` và `file-type`. Import động `file-type` trong `library.service.js`.
- [x] T003 [P] Tạo cấu hình Multer cho Library tại `backend/src/config/multer.js`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T001 [P] Tạo DB schemas `mock_tests`, `questions`, `library_resources`, `audit_logs`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Kho Tài nguyên & File (Priority: P1) 🎯 MVP

**Goal**: Cung cấp kho lưu trữ file an toàn (PDF, Audio) với validation Magic Bytes làm nguyên liệu cho đề thi.

**Independent Test**: Gọi `POST /api/v1/library` với file hợp lệ → HTTP 201. Gọi với file giả mạo → HTTP 422.

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

### Implementation for User Story 1

- [x] T004 [US1] Tạo file `library.queries.js` với các hàm `getAllResources`, `createResource`.
- [x] T005 [US1] Implement chức năng Magic bytes validation và Supabase upload trong `library.service.js`.
- [x] T006 [US1] Thiết lập routes `library.routes.js` (GET/POST/PUT/DELETE) có tích hợp middleware `authenticate`.
- [x] T007 [P] [US1] Tạo React hook `useLibrary.js` và Component `ResourceUploadModal.jsx`.
- [x] T008 [US1] Xây dựng Frontend pages: `TutorLibraryPage.jsx`, `TutorLibraryCreatePage.jsx`.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Khung Đề thi & Cập nhật nội dung (Priority: P1)

**Goal**: Đảm bảo Tutor sửa và cập nhật lại nội dung đề thi (sử dụng cơ chế Hard Delete & Re-insert).

**Independent Test**: Gọi `PUT /api/v1/tests/:id` → verify dữ liệu cũ bị xóa, dữ liệu mới được chèn.

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

### Implementation for User Story 2

- [ ] T009 [US2] Implement các hàm CRUD cơ bản cho `mock_tests` trong `test.service.js`.
- [ ] T010 [US2] Implement cơ chế `DELETE FROM questions` (Hard Delete) bọc trong Transaction cho hàm `updateReadingTest` trong `test.service.js`.
- [ ] T011 [US2] Cấu hình routes cho tests tại `tests.js`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Công cụ Soạn thảo Câu hỏi Động (Priority: P2)

**Goal**: Tutor có thể soạn hàng loạt câu hỏi (Bulk Insert) qua giao diện linh hoạt.

**Independent Test**: Gọi `POST /api/v1/tests` với JSON 40 câu hỏi → verify tất cả lưu đúng thứ tự.

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

### Implementation for User Story 3

- [ ] T012 [US3] Thiết lập cơ chế Bulk Insert trong `createReadingTest`: loop qua passages → blocks → questions.
- [ ] T013 [US3] Tạo API Endpoint `POST /api/v1/tests` nhận JSON body cấu trúc lồng nhau.
- [ ] T014 [US3] Xây dựng Frontend: `TutorQuestionFormPage.jsx` và các form chuyên biệt cho từng kỹ năng.
- [ ] T015 [US3] Tích hợp giao diện tạo câu hỏi với API backend.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Audit & CMS Dashboard (Priority: P3)

**Goal**: Admin có thể xem log hoạt động và thống kê nội dung trên hệ thống.

**Independent Test**: Xóa đề thi → gọi `GET /admin/audit-logs` → verify bản ghi `test_deleted` xuất hiện.

### Tests for User Story 4 (OPTIONAL - only if tests requested) ⚠️

### Implementation for User Story 4

- [ ] T016 [P] [US4] Tạo API `GET /admin/audit-logs` tại `admin.routes.js`.
- [ ] T017 [US4] Implement hàm `logAction()` trong `audit.service.js`.
- [ ] T018 [US4] Xây dựng Frontend pages: `AdminActivityLogPage.jsx` và `AdminChangeLogPage.jsx`.

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T019 [P] Documentation updates in `docs/`.
- [ ] T020 Code cleanup and refactoring.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - May integrate with US2 but should be independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
