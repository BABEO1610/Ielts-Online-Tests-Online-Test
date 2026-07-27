# Feature Specification: CMS & Exam Builder (feat-content-builder)

**Feature Branch**: `feat-content-builder`

**Created**: 2026-07-23

**Status**: Final

**Input**: User description: "Module 5 (Thành viên 5) - Quản trị Nội dung & Tạo đề"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kho Tài nguyên & File (Priority: P1)

Là một Tutor/Admin, tôi muốn tải các file âm thanh (Audio) và tài liệu đọc (PDF) lên hệ thống một cách an toàn, để có nguyên liệu tạo ra các bài thi Listening/Reading.

**Why this priority**: Bắt buộc phải có file âm thanh hoặc tài liệu gốc trước khi xây dựng nội dung đề thi thực tế.

**Independent Test**: Gọi `POST /api/v1/library` với file hợp lệ → verify HTTP 201 + URL trả về. Gọi lại với file giả mạo extension → verify HTTP 422. Không cần các module khác chạy.

**Acceptance Scenarios**:

1. **Given** một file MP3 hợp lệ, **When** Tutor gọi `POST /api/v1/library`, **Then** hệ thống check MIME type hợp lệ, lưu file lên Supabase và trả về URL.
2. **Given** một file .exe đổi tên thành .pdf, **When** Tutor gọi API upload, **Then** hệ thống phát hiện sai MIME type qua magic bytes và trả về HTTP 422.

---

### User Story 2 - Khung Đề thi & Cập nhật nội dung (Priority: P1)

Là một Tutor, tôi muốn tạo vỏ đề thi (mock_tests) và có khả năng cập nhật lại nội dung đề thi một cách triệt để.

**Why this priority**: Cho phép Tutor linh hoạt sửa đổi toàn bộ cấu trúc của một đề thi đã tạo mà không để lại dữ liệu rác.

**Independent Test**: Gọi `PUT /api/v1/tests/:id` với danh sách câu hỏi mới → verify dữ liệu cũ trong `questions` và `test_passages` bị xóa, dữ liệu mới được chèn vào.

**Acceptance Scenarios**:

1. **Given** một đề thi đang tồn tại, **When** Tutor ấn cập nhật với danh sách câu hỏi mới, **Then** hệ thống thực hiện `DELETE FROM questions` và `DELETE FROM test_passages`, sau đó insert lại toàn bộ dữ liệu mới trong một Database Transaction duy nhất.

---

### User Story 3 - Công cụ Soạn thảo Câu hỏi Động (Priority: P2)

Là một Tutor, tôi muốn thêm/sửa/xóa các đoạn văn (Passages) và hàng loạt câu hỏi (Questions) vào một đề thi thông qua một giao diện linh hoạt.

**Why this priority**: Bắt buộc phải có nội dung câu hỏi sau khi đã có vỏ đề thi.

**Independent Test**: Gọi `POST /api/v1/tests` với JSON chứa 10 câu hỏi → verify tất cả lưu đúng `question_order` trong DB. Không cần Library module chạy.

**Acceptance Scenarios**:

1. **Given** 10 câu hỏi Multiple Choice, **When** Tutor gọi `POST /api/v1/tests`, **Then** hệ thống lưu toàn bộ vào bảng `questions` với đúng `test_id` và `question_order` qua transaction.

---

### User Story 4 - Audit & CMS Dashboard (Priority: P3)

Là một Admin, tôi muốn xem log hoạt động hệ thống và thống kê tổng quan (Dashboard) để kiểm soát chất lượng nội dung.

**Why this priority**: Cần thiết để Admin quản lý và theo dõi.

**Independent Test**: Xóa một đề thi → gọi `GET /admin/audit-logs` → verify bản ghi `test_deleted` xuất hiện kèm `old_value` chứa dữ liệu cũ. Không cần Library module chạy.

**Acceptance Scenarios**:

1. **Given** Tutor xóa một tài liệu, **When** Admin xem trang Audit, **Then** hệ thống hiển thị rõ Tutor nào đã xóa, lúc mấy giờ, và dữ liệu cũ là gì.

---

### Edge Cases

- **File giả mạo (Spoofed extension):** `library.service.js` sử dụng `file-type` đọc magic bytes. File `.exe` đổi thành `.pdf` sẽ bị từ chối (HTTP 422).
- **Mất mạng khi Bulk Update/Insert:** `updateReadingTest` và `createReadingTest` sử dụng PostgreSQL Transaction (BEGIN/COMMIT/ROLLBACK) để rollback dữ liệu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép Tutor/Admin upload file PDF/Audio và MUST kiểm tra MIME type thật sự (Magic bytes).
- **FR-002**: Hệ thống MUST lưu thông tin file vào bảng `library_resources`.
- **FR-003**: Hệ thống MUST cung cấp API CRUD cho `mock_tests`.
- **FR-004**: Hệ thống MUST hỗ trợ cập nhật đề thi bằng phương pháp Hard Delete (xóa bản ghi cũ) và Bulk Insert (chèn bản ghi mới) được bọc trong một Transaction an toàn.
- **FR-005**: Hệ thống MUST cung cấp Bulk Insert qua transaction để lưu hàng loạt câu hỏi (< 2000ms cho 40 câu).
- **FR-006**: Hệ thống MUST ghi log mọi hành động C/U/D vào bảng `audit_logs`.

### Key Entities *(include if feature involves data)*

- **library_resources**: Quản lý meta-data của file upload.
- **mock_tests**: Vỏ đề thi.
- **test_passages**: Đoạn văn (Reading).
- **question_blocks**: Nhóm câu hỏi.
- **questions**: Chi tiết từng câu hỏi.
- **audit_logs**: Nhật ký hệ thống.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% file upload sai MIME type bị hệ thống chặn lại.
- **SC-002**: Bulk Insert & Bulk Update 40 câu hỏi được thực thi dưới 2 giây.
- **SC-003**: Không có dữ liệu mồ côi (orphan records) bị bỏ lại khi thực hiện Update đề thi (nhờ cơ chế DELETE FROM... WHERE test_id).

## Assumptions

- Thông tin bối cảnh hiện trạng (Thành viên 5 phụ trách module CMS & Exam Builder) được thừa nhận làm tiền đề cho bản thiết kế này.
- Quyết định kiến trúc: Lựa chọn cơ chế Hard Delete & Re-insert khi cập nhật đề thi thay vì Deep Clone Versioning nhằm đơn giản hóa cấu trúc CSDL và giảm thiểu dư thừa dữ liệu.
- Sử dụng Supabase Storage cho thư viện Media.
- `req.user` được middleware `authenticate.js` xử lý. Auth middleware `authorize(['tutor','admin'])` áp dụng trên routes.
