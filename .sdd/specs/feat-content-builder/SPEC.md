# Feature Specification: CMS & Exam Builder (feat-content-builder)

**Feature Branch**: `feat-content-builder`

**Created**: 2026-07-23

**Status**: Draft

**Input**: Module 5 (Thành viên 5) - Quản trị Nội dung & Tạo đề

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kho Tài nguyên & File (Priority: P1)

Là một Tutor/Admin, tôi muốn tải các file âm thanh (Audio) và tài liệu đọc (PDF) lên hệ thống một cách an toàn, để có nguyên liệu tạo ra các bài thi Listening/Reading.

**Why this priority**: Bắt buộc phải có file âm thanh hoặc tài liệu gốc trước khi xây dựng nội dung đề thi thực tế. Nếu không, các đề thi Listening sẽ không có file để phát.

**Independent Test**: Có thể test độc lập bằng cách gọi API upload. File phải được lưu trữ thành công, bảng `library_resources` được thêm bản ghi, và các file giả mạo extension phải bị từ chối (HTTP 400/415).

**Acceptance Scenarios**:

1. **Given** một file MP3 hợp lệ, **When** Tutor gọi API upload, **Then** hệ thống check MIME type hợp lệ, lưu file và trả về URL.
2. **Given** một file .exe đổi tên thành .pdf, **When** Tutor gọi API upload, **Then** hệ thống phát hiện sai MIME type và trả về HTTP 400.

---

### User Story 2 - Khung Đề thi & Lõi Versioning (Priority: P1)

Là một Tutor, tôi muốn tạo vỏ đề thi (mock_tests) và chỉnh sửa chúng mà không làm hỏng lịch sử điểm của các học sinh đã thi trước đó.

**Why this priority**: Đây là cấu trúc cốt lõi của bài thi. Mọi câu hỏi đều phải thuộc về một `mock_test`. Data versioning đảm bảo Data Integrity cho hệ thống.

**Independent Test**: Có thể test bằng cách gọi API tạo vỏ đề thi, sau đó gọi API sửa đề thi đã Publish. Hệ thống phải sinh ra bản ghi `mock_tests` mới thay vì ghi đè.

**Acceptance Scenarios**:

1. **Given** một đề thi chưa publish, **When** Tutor sửa tiêu đề, **Then** hệ thống ghi đè bản ghi hiện tại (không tăng version).
2. **Given** một đề thi đã publish và có người thi, **When** Tutor sửa tiêu đề hoặc nội dung, **Then** hệ thống tự động clone toàn bộ bản ghi cũ thành bản ghi mới (Version 2), và set `is_published = false` cho bản ghi cũ.

---

### User Story 3 - Công cụ Soạn thảo Câu hỏi Động (Priority: P2)

Là một Tutor, tôi muốn thêm/sửa/xóa các đoạn văn (Passages) và hàng loạt câu hỏi (Questions) vào một đề thi thông qua một giao diện linh hoạt.

**Why this priority**: Mang lại công cụ làm việc thực tế cho người ra đề. Tuy nhiên, nó phụ thuộc vào Khung Đề Thi (US2).

**Independent Test**: Có thể test độc lập bằng cách gửi một mảng JSON các câu hỏi qua API Bulk Insert. Hệ thống phải chia đúng thành các block và lưu vào DB.

**Acceptance Scenarios**:

1. **Given** 10 câu hỏi Multiple Choice, **When** Tutor gọi API Bulk Insert, **Then** hệ thống lưu toàn bộ vào bảng `questions` với đúng `test_id` và `question_order`.

---

### User Story 4 - Audit & CMS Dashboard (Priority: P3)

Là một Admin, tôi muốn xem log hoạt động hệ thống và thống kê tổng quan (Dashboard) để kiểm soát chất lượng nội dung.

**Why this priority**: Tính năng quản trị giúp minh bạch hóa các hoạt động, cực kỳ quan trọng cho mô hình Enterprise nhưng không chặn luồng (block) việc tạo đề.

**Independent Test**: Xóa một đề thi -> Kiểm tra bảng `audit_logs` có ghi nhận hành động xóa.

**Acceptance Scenarios**:

1. **Given** Tutor xóa một tài liệu, **When** Admin xem trang Audit, **Then** hệ thống hiển thị rõ Tutor nào đã xóa, lúc mấy giờ, và dữ liệu cũ là gì.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép Tutor/Admin upload file PDF/Audio và MUST kiểm tra MIME type thật sự (Magic bytes) thay vì chỉ kiểm tra đuôi file.
- **FR-002**: Hệ thống MUST lưu thông tin file vào bảng `library_resources`.
- **FR-003**: Hệ thống MUST cung cấp API CRUD cho `mock_tests` (Khung đề thi).
- **FR-004**: Hệ thống MUST tự động tạo Version mới (Deep Clone `mock_tests`, `test_passages`, `question_blocks`, và `questions` liên quan) NẾU Tutor thực hiện sửa đổi trên một đề thi đã có `is_published = TRUE` và đã có học viên thi. 
- **FR-005**: Hệ thống MUST cung cấp API Bulk Insert để lưu hàng loạt câu hỏi một cách tối ưu.
- **FR-006**: Hệ thống MUST ghi log mọi hành động C/U/D đối với `library_resources` và `mock_tests` vào bảng `audit_logs`.

### Key Entities 

- **library_resources**: Quản lý meta-data của file upload (âm thanh, PDF).
- **mock_tests**: Vỏ đề thi, chứa cấu hình (thời gian, kỹ năng, độ khó, version).
- **test_passages**: Đoạn văn (dành cho kỹ năng Reading).
- **question_blocks**: Nhóm câu hỏi (vd: từ câu 1-5 là dạng Multiple Choice).
- **questions**: Chi tiết từng câu hỏi (chứa cấu hình đáp án đúng).
- **audit_logs**: Nhật ký hệ thống ghi vết.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% file upload sai MIME type (vd: mã độc đổi đuôi) bị hệ thống chặn lại và không ghi vào ổ cứng/cloud.
- **SC-002**: Khi update một đề thi đã publish, lịch sử điểm (submissions) của học viên thi đề cũ KHÔNG BỊ mất kết nối (vẫn giữ nguyên liên kết foreign key với Version cũ).
- **SC-003**: Giao diện tạo câu hỏi động có thể xử lý việc lưu cùng lúc 40 câu hỏi (chuẩn IELTS) trong dưới 2 giây.

## Assumptions

- Sử dụng Supabase Storage hoặc Local File System (`/uploads/`) cho thư viện Media, tùy cấu hình môi trường.
- `req.user` đã được middleware xác thực xử lý. Chỉ những user có role `tutor` hoặc `admin` mới được truy cập các tính năng quản trị này.
- UI Frontend ưu tiên dùng thẻ `<input type="number">` cho việc đánh số thứ tự `question_order` thay vì dùng Drag & Drop để giảm rủi ro kỹ thuật cho Thành viên 5.
