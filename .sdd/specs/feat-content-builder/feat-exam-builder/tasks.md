---
description: "Task list template for feature implementation"
---

# Tasks: Exam Builder

**Input**: Design documents from `/specs/feat-content-builder/feat-exam-builder/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Khởi tạo schema cho bảng `mock_tests` (có `audio_url`), `test_passages`, `question_blocks`, `questions`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Viết logic tính toán validation (kiểm tra `missingAnswer` - ném lỗi 400 nếu mảng `questions` có câu nào bị rỗng đáp án đúng và đề chuẩn bị được publish) trong `test.service.js`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Khung Đề thi & Cập nhật nội dung (Priority: P1) 🎯 MVP

**Goal**: Tutor cập nhật đề thi an toàn thông qua Transaction.

**Independent Test**: Gọi `PUT /api/v1/tests/:id`.

### Implementation for User Story 1

- [ ] T003 [P] [US1] Trong `test.service.js`, viết hàm `updateReadingTest`. Thực hiện Hard Delete (`DELETE FROM questions` và `DELETE FROM test_passages`).
- [ ] T004 [US1] Viết vòng lặp lồng nhau thực thi các câu lệnh Raw SQL bulk insert (`INSERT INTO test_passages`, `question_blocks`, `questions`) cập nhật lại cấu trúc mới.
- [ ] T005 [US1] Bọc tất cả vào block `try-catch` với `client.query('BEGIN')`, `COMMIT` và `ROLLBACK`.
- [ ] T006 [US1] Tích hợp `AuditLogService.logAction` để ghi log hành động `test_updated`.
- [ ] T007 [US1] Đấu nối API `PUT /api/v1/tests/:id` trong `tests.js` (không phải `tests.routes.js`).

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Công cụ Soạn thảo Câu hỏi Động (Priority: P1)

**Goal**: Tutor thêm mới đoạn văn và câu hỏi.

**Independent Test**: Gọi `POST /api/v1/tests`.

### Implementation for User Story 2

- [ ] T008 [P] [US2] Trong `test.service.js`, viết hàm `createReadingTest` xử lý lưu đề thi mới kèm `audio_url`. Tự động tính toán lại `question_order` tăng dần đều.
- [ ] T009 [US2] Tích hợp `AuditLogService.logAction` để ghi log hành động `test_created`.
- [ ] T010 [US2] Đấu nối API `POST /api/v1/tests` trong `tests.js`.
- [ ] T011 [US2] Tạo các component React để hiển thị lồng nhau (`SmartModeBlockEditor`, `QuestionBlockEditor`, `ReadingTestPreviewModal`) phục vụ cho các trang `TutorReadingFormPage` và `TutorListeningFormPage`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T012 Tích hợp xóa đề thi (`deleteTest`) và log hành động `test_deleted` thông qua `AuditLogService`.
- [ ] T013 Xử lý logic chuẩn hóa (`normalizePassages`) cho các kỹ năng Listening (parse metadata `start_time`, `end_time`) và Writing (task 1 vs task 2, images).
- [ ] T014 Xử lý logic route cho phép học sinh thi (`getTestForStudent`) ẩn đáp án đúng.

## Phase 5: Test Retrieval & Data Assembly

**Purpose**: Lấy dữ liệu đề thi từ DB và map thành cấu trúc JSON lồng nhau cho Frontend.

- [ ] T015 Viết hàm `getTests` có phân trang, tính toán tổng số câu hỏi (`questions`) và tổng số học sinh đã tham gia (`participant_count` bằng cách `COUNT` từ 3 bảng `test_attempts`, `writing_submissions`, `speaking_submissions`).
- [ ] T016 Viết hàm `getWritingTests` chuyên dụng cho đề Writing, tự động bóc tách `Writing Task 1` và `Writing Task 2`.
- [ ] T017 Viết hàm `getTestById` thực hiện gom nhóm (Group) các rows từ `passages`, `blocks`, `questions` thành cấu trúc JSON lồng nhau (nested). Xử lý metadata cho `listening` (chuyển passages thành `sections`).
- [ ] T018 Đấu nối các API `GET /api/v1/tests`, `GET /api/v1/tests/writing`, `GET /api/v1/tests/:id` và `GET /api/v1/tests/:id/take` vào `tests.js`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion

### Within Each User Story

- Services before endpoints
- Story complete before moving to next priority

## Notes

- Chú ý: `test_id` là khóa ngoại bắt buộc ở cả 3 bảng con (Passages, Blocks, Questions).
- Các lệnh DB sẽ nằm trực tiếp trong `test.service.js` để share kết nối `client.query` transaction.
