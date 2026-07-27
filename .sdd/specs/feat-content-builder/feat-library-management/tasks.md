---
description: "Task list template for feature implementation"
---

# Tasks: Library Management

**Input**: Design documents from `/specs/feat-content-builder/feat-library-management/`

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

- [x] T001 Khởi tạo schema cho bảng `library_resources` trong Database (bổ sung `deleted_at` ở migration `028_harden_library_uploads.sql`).
- [x] T002 Cài đặt các thư viện `multer` và `file-type` vào dự án.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Cấu hình giới hạn file 200MB trong `backend/src/config/multer.js` sử dụng `multer.memoryStorage()`.
- [x] T004 [P] Viết các hàm query vào `backend/src/db/queries/library.queries.js`, gồm catalog approved và danh sách riêng của uploader.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Kho Tài nguyên & File (Priority: P1) 🎯 MVP

**Goal**: Tutor/Admin có thể tải file an toàn lên Supabase.

**Independent Test**: Gọi `POST /api/v1/library` với file hợp lệ → verify HTTP 201 + URL.

### Implementation for User Story 1

- [x] T005 [P] [US1] Định nghĩa hàm `validateFileMagicBytes` sử dụng dynamic import `file-type` tại `backend/src/services/library.service.js`.
- [x] T006 [P] [US1] Xây dựng hàm `uploadFileToSupabase` và `deleteFileFromSupabase` trong service.
- [x] T007 [US1] Xây dựng các hàm C/U/D `createResource`, `updateResource`, `deleteResource`.
  - Chú ý 1: Khi create mặc định gán `is_published = TRUE` và `review_status = 'pending'`.
  - Chú ý 2: Khi Update (có kèm file mới) hoặc Delete thành công, **BẮT BUỘC** gọi `deleteFileFromSupabase` để xóa file cũ khỏi lưu trữ Cloud (dọn dẹp vật lý).
- [x] T008 [US1] Đấu nối endpoints public và protected (`/mine`, `/mine/:id`) trong `backend/src/routes/api/v1/library.routes.js`.
- [x] T009 [US1] Đấu nối form upload với trang Tutor, hiển thị pending và progress upload.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T010 [P] Route fallback đọc file local `GET /api/v1/library/files/:filename` (giữ tương thích legacy).
- [x] T011 Fix validation archive: chỉ nhận signature thực tế, không tin extension giả mạo.
- [x] T012 Map lỗi Multer vượt 200MB thành HTTP 413 theo response contract.
- [x] T013 Dọn object Supabase mới nếu ghi metadata DB thất bại.
- [x] T014 Bổ sung unit/contract tests cho magic bytes, validation, query visibility và multipart fields.
- [x] T015 Giữ trạng thái `storage_cleanup_pending` để DELETE có thể retry khi Supabase tạm lỗi.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Lưu ý từ Codebase: Hàm `getResourcesByUploader` đã được định nghĩa trong query nhưng hiện tại ĐANG BỊ BỎ QUÊN (Unused) ở layer Service. Do đó Tutor không có API để xem danh sách tài liệu `pending` của riêng mình.
