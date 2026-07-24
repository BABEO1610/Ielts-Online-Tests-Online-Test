---
description: "Task list for CMS & Exam Builder"
---

# Tasks: CMS & Exam Builder (feat-content-builder)

**Input**: Design documents from `SPEC.md` and `PLAN.md`

**Prerequisites**: DB Schema `mock_tests` (từ file `009`), `library_resources` (từ file `012`)

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup & Foundational (Shared Infrastructure)

**⚠️ CRITICAL**: Phải hoàn thành Phase 1 trước khi code các User Story.

- [ ] T001 Review lại toàn bộ DB schemas (`mock_tests`, `questions`, `library_resources`) để đảm bảo các fields đủ điều kiện cho thuật toán Versioning.
- [ ] T002 Cài đặt thư viện `multer` và `file-type` vào `backend/package.json`.
- [ ] T003 Setup file middleware `backend/src/middleware/upload.middleware.js` cấu hình Multer và validation Magic Bytes.

---

## Phase 2: User Story 1 - Kho Tài nguyên & File (Priority: P1)

- [ ] T004 [US1] Tạo file `backend/src/db/queries/library.queries.js` (Insert, Get, Delete cho `library_resources`).
- [ ] T005 [US1] Tạo file `backend/src/services/library.service.js`. Xử lý business logic check giới hạn size và dọn file rác nếu DB insert lỗi.
- [ ] T006 [US1] Tạo file `backend/src/api/library.routes.js` và bind controller tương ứng. Đảm bảo có Auth middleware.
- [ ] T007 [P] [US1] Tạo React hook `frontend/src/hooks/useLibrary.js`.
- [ ] T008 [US1] Xây dựng giao diện `MediaLibraryPage.jsx` và component upload `MediaUploader.jsx`.

---

## Phase 3: User Story 2 - Khung Đề thi & Lõi Versioning (Priority: P1)

- [ ] T009 [US2] Tạo file `backend/src/db/queries/examBuilder.queries.js` (CRUD cơ bản cho `mock_tests`).
- [ ] T010 [US2] Implement hàm SQL/Query `cloneExamData(oldTestId)` để copy `mock_tests`, `test_passages`, `question_blocks` và `questions`.
- [ ] T011 [US2] Cập nhật `examBuilder.service.js` với thuật toán Versioning: Nếu `is_published == true` và có người thi -> Gọi `cloneExamData` -> Đổi ID tham chiếu mới -> Set `is_published = false` cho bản cũ.
- [ ] T012 [US2] Tạo file `backend/src/api/examBuilder.routes.js` cho việc quản lý cấu trúc vỏ đề thi.

---

## Phase 4: User Story 3 - Công cụ Soạn thảo Câu hỏi Động (Priority: P2)

- [ ] T013 [US3] Thêm hàm Bulk Insert vào `examBuilder.queries.js` để lưu cùng lúc nhiều `test_passages` và `questions`.
- [ ] T014 [US3] Viết API Endpoint `POST /mock-tests/:id/questions/bulk` nhận mảng JSON câu hỏi và lưu xuống DB.
- [ ] T015 [US3] Xây dựng UI Frontend `DynamicQuestionForm.jsx`. (Đây là component cực kỳ phức tạp: dùng React State để quản lý mảng câu hỏi, thêm/xóa/sửa câu hỏi động trên giao diện).
- [ ] T016 [US3] Tích hợp UI Form với API Bulk Insert.

---

## Phase 5: User Story 4 - Audit & CMS Dashboard (Priority: P3)

- [ ] T017 [P] [US4] Viết API `GET /audit-logs` để lấy danh sách lịch sử thao tác.
- [ ] T018 [US4] Cập nhật `library.service.js` và `examBuilder.service.js` để tự động chèn log vào bảng `audit_logs` mỗi khi Create/Update/Delete.
- [ ] T019 [US4] Xây dựng UI `AuditDashboardPage.jsx` để Admin xem log và thống kê tổng số đề thi/tài liệu đang có trên hệ thống.
