# Feature Specification: Library Management (feat-library-management)

**Feature Branch**: `feat-library-management`

**Created**: 2026-07-27

**Status**: Final

**Input**: User description: "Tutor/Admin upload file audio/pdf an toàn làm nguyên liệu tạo đề thi"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kho Tài nguyên & File (Priority: P1)

Là một Tutor/Admin, tôi muốn tải các file âm thanh (Audio), tài liệu đọc (PDF) hoặc file nén (Zip/Rar) lên hệ thống một cách an toàn, để có nguyên liệu tạo ra các bài thi Listening/Reading.

**Why this priority**: Bắt buộc phải có file âm thanh hoặc tài liệu gốc trước khi xây dựng nội dung đề thi thực tế.

**Independent Test**: Gọi `POST /api/v1/library` với file hợp lệ → verify HTTP 201 + URL trả về. Gọi lại với file giả mạo extension → verify HTTP 422. Không cần các module khác chạy.

**Acceptance Scenarios**:

1. **Given** một file MP3 hợp lệ, **When** Tutor gọi `POST /api/v1/library`, **Then** hệ thống check MIME type hợp lệ, lưu file lên Supabase và trả về URL.
2. **Given** một file nén (.zip/.rar/.7z) hợp lệ, **When** Tutor gọi API upload, **Then** hệ thống nhận diện signature của file nén và upload thành công. Không được tin extension để bypass kiểm tra.
3. **Given** một file .exe đổi tên thành .pdf, **When** Tutor gọi API upload, **Then** hệ thống phát hiện sai MIME type qua magic bytes và trả về HTTP 422.
4. **Given** Tutor vừa upload thành công (file đang `pending`), **When** Tutor gọi `GET /api/v1/library/mine`, **Then** file đó xuất hiện cùng trạng thái chờ duyệt; file đó vẫn KHÔNG xuất hiện trong `GET /api/v1/library` cho đến khi được phê duyệt.

### Edge Cases

- Băng thông giới hạn, kết nối mạng chập chờn khi upload file to (VD: 200MB).
- Thư viện `file-type` (v19) là ESM module, cần lưu ý khi import trong môi trường CommonJS.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST xác thực (authenticate) và phân quyền (authorize) người dùng phải là `tutor` hoặc `admin` đối với các thao tác Upload, Sửa, Xóa. Các API Xem danh sách và Xem chi tiết là Public.
- **FR-002**: Hệ thống MUST kiểm tra định dạng file bằng Magic Bytes (dùng thư viện `file-type`) trước khi upload, bao gồm cả file nén; không được bypass bằng extension hoặc MIME do trình duyệt khai báo.
- **FR-003**: Hệ thống MUST giới hạn dung lượng tải lên ở mức 200MB để đảm bảo hệ thống không bị crash khi lưu memory buffer.
- **FR-004**: Hệ thống MUST lưu thông tin file (tên, URL, size, type, category, người upload) vào bảng `library_resources`.
- **FR-005**: Tài liệu mới upload mặc định sẽ ở trạng thái chờ duyệt (`review_status = 'pending'`, `is_published = TRUE`) và chỉ xuất hiện trong danh mục thư viện chung (kể cả với chính Tutor upload) sau khi được phê duyệt (`review_status = 'approved'`).
- **FR-006**: Hệ thống MUST cung cấp endpoint được bảo vệ `GET /api/v1/library/mine` và `GET /api/v1/library/mine/:id` để Tutor xem và chỉnh sửa tài liệu của chính mình ở mọi trạng thái duyệt.

### Key Entities

- **library_resources**: Bảng lưu trữ meta-data của các file đã upload (id, file_url, file_size_bytes, resource_type, category, uploaded_by, is_published, review_status).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% file upload sai MIME type bị hệ thống chặn lại và trả về mã lỗi HTTP 422 (trừ file nén).
- **SC-002**: Thời gian phản hồi (upload file < 5MB) phải hoàn thành dưới 3 giây.
- **SC-003**: Khi xóa tài liệu (DELETE), file vật lý trên Supabase bucket phải được xóa sạch theo để tiết kiệm dung lượng.
- **SC-004**: Sau HTTP 201, Tutor có thể nhìn thấy tài liệu mới và trạng thái `pending` trong giao diện quản lý mà không cần Admin duyệt trước.

## Assumptions

- Việc cấu hình bucket Supabase (`ieltszone_library`) đã được Admin thực hiện sẵn sàng trên cloud.
- Môi trường Node.js hỗ trợ `dynamic import()` để gọi được thư viện ESM.
