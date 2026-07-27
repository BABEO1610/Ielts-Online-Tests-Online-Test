# Implementation Checklist: CMS & Exam Builder (feat-content-builder)

**Purpose**: Đảm bảo tất cả yêu cầu kỹ thuật và nghiệp vụ được thực hiện đầy đủ.
**Created**: 2026-07-24
**Feature**: [SPEC.md](./SPEC.md) | [PLAN.md](./PLAN.md) | [TASKS.md](./TASKS.md)

## 1. Môi trường & Cơ sở dữ liệu (Phase 1)

- [ ] CHK001 Tạo DB schema `mock_tests`, `test_passages`, `question_blocks`, `questions`.
- [ ] CHK002 Tạo DB schema `library_resources` và `audit_logs`.
- [ ] CHK003 Cấu hình Supabase Storage (`supabase.storage.from('ieltszone_library')`).
- [ ] CHK004 Cài đặt package `multer` và `file-type`.

## 2. Kho Tài nguyên & File (User Story 1)

- [ ] CHK005 `library.service.js:validateFileMagicBytes()` check magic bytes bằng `file-type` (dynamic import). Không chỉ check đuôi file.
- [ ] CHK006 Multer config giới hạn kích thước file.
- [ ] CHK007 `library.service.js` MIME_TO_RESOURCE_TYPE whitelist chỉ cho phép pdf, audio, video, image, archive. File ngoài danh sách bị từ chối (HTTP 422).
- [ ] CHK008 `library.queries.js:createResource()` lưu URL vào bảng `library_resources` với `file_url`, `file_size_bytes`, `resource_type`.
- [ ] CHK009 Frontend `TutorLibraryManagementPage.jsx` hiển thị danh sách file. `TutorLibraryPage.jsx` có filter/search.

## 3. Khung Đề thi & Cập nhật nội dung (User Story 2)

- [ ] CHK010 Cung cấp API CRUD cho `mock_tests`: `POST /tests` (create), `PUT /tests/:id` (update), `DELETE /tests/:id` (delete), `GET /tests` (list).
- [ ] CHK011 **Cập nhật nội dung**: Sửa đề thi sử dụng cơ chế `DELETE FROM questions/test_passages` (Hard Delete) kết hợp với Bulk Insert các câu hỏi mới. Toàn bộ quá trình phải được bọc trong Database Transaction.
- [ ] CHK012 Xóa đề thi (Hard Delete): Dùng `DELETE FROM mock_tests` kết hợp ON DELETE CASCADE cho các bảng con.

## 4. Công cụ Soạn thảo Câu hỏi Động (User Story 3)

- [ ] CHK013 `test.service.js:createReadingTest()` nhận JSON lớn (passages → blocks → questions) và insert qua transaction.
- [ ] CHK014 Frontend forms (`TutorReadingFormPage.jsx`, `TutorListeningFormPage.jsx`, `TutorQuestionFormPage.jsx`) cho phép tạo câu hỏi trên giao diện.
- [ ] CHK015 `question_order` phải được tự động tăng chính xác trong vòng lặp.
- [ ] CHK016 Listening tests liên kết `audio_url` từ field input. Reading tests có `test_passages.content` chứa nội dung đoạn văn.

## 5. Audit & CMS Dashboard (User Story 4)

- [ ] CHK017 `AuditLogService.logAction()` được gọi khi: `test_created`, `test_updated`, `test_deleted` (trong `test.service.js`), `test_reviewed`, `resource_reviewed` (trong `content.service.js`).
- [ ] CHK018 Frontend `AdminActivityLogPage.jsx` hiển thị log với filter severity (normal/suspicious), search, pagination.
- [ ] CHK019 Frontend `AdminChangeLogPage.jsx` hiển thị chi tiết old_value/new_value, có nút Undo cho reversible actions.

## 6. Bảo mật & Tối ưu (Cross-Cutting)

- [ ] CHK020 `req.user.id` lấy từ `authenticate.js` middleware.
- [ ] CHK021 `authorize(['tutor', 'admin'])` chặn role khác (HTTP 403).
- [ ] CHK022 `library.service.js:createResource()` validate magic bytes TRƯỚC khi upload Supabase.
- [ ] CHK023 Quyết định thiết kế (Ponytail): Ưu tiên sử dụng Hard Delete thay vì Soft Delete hoặc Versioning phức tạp nhằm giữ hệ thống tinh gọn, bảo trì dễ dàng.

## Notes

- `[x]` = Đã đạt
- `[ ]` = Chưa đạt — cần implement
- Tổng: 0/23 items đã hoàn thành.
