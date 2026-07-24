# Đặc tả tính năng: Admin Phân công Giảng viên chấm bài (Admin Tutor Assignment)

**Ngày tạo**: 2026-07-23

**Trạng thái**: Bản nháp

**Đầu vào**: Phân rã từ `feat-subjective-grading`; phục vụ Quản trị viên (Admin) quản lý và phân công Giảng viên phụ trách cho từng bài nộp tự luận (Writing & Speaking).

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Admin xem danh sách bài nộp chờ phân công (Ưu tiên: P1)

Là Admin, tôi muốn truy cập trang Phân công Giảng viên (`/admin/tutor-assignments`) để xem toàn bộ các bài nộp thi tự luận (Writing & Speaking) đang chờ chấm, cùng danh sách các Giảng viên khả dụng để thực hiện phân công.

**Lý do ưu tiên**: Phân công giảng viên là khâu trung gian bắt buộc để đảm bảo bài nộp của học viên được gán đúng giảng viên phù hợp trước khi xuất hiện trong hàng đợi chấm của Giáo viên.

**Kiểm thử độc lập**: Đăng nhập tài khoản Admin, mở trang `/admin/tutor-assignments`, kiểm tra API `GET /api/v1/admin/tutor-assignments` trả về danh sách các bài nộp `status = 'pending'` và danh sách giảng viên `role = 'tutor'`.

**Kịch bản chấp nhận**:

1. **Cho trước** các bài nộp Writing và Speaking của học viên có `grader = 'tutor'`, **khi** Admin truy cập trang phân công, **thì** hệ thống hiển thị danh sách bài nộp phân trang (Pagination), hiển thị tên bài thi, người nộp, mục tiêu band và ô chọn Giảng viên phụ trách.
2. **Cho trước** một bài nộp chưa có giảng viên gán (`assigned_tutor_id IS NULL`), **khi** hiển thị trên bảng, **thì** dòng bài nộp được nổi bật cảnh báo để Admin dễ dàng nhận biết.
3. **Cho trước** người dùng không phải Admin (Học viên hoặc Giáo viên), **khi** cố tình truy cập API phân công, **thì** hệ thống từ chối truy cập với lỗi 403 Forbidden.

---

### Câu chuyện người dùng 2 — Admin phân công hoặc Hủy phân công Giảng viên (Ưu tiên: P1)

Là Admin, tôi muốn chọn một Giảng viên từ danh sách thả xuống để gán bài nộp cho Giảng viên đó (hoặc chọn "Chưa phân công" để bỏ gán).

**Lý do ưu tiên**: Cho phép Admin chủ động phân bổ tải làm việc cho các Giảng viên hoặc điều chuyển bài nộp khi cần thiết.

**Kiểm thử độc lập**: Trên trang Phân công, chọn một Giảng viên từ Dropdown cho bài nộp ID `sub-123`, kiểm tra API `PUT /api/v1/admin/tutor-assignments/:submissionId` được gọi, cột `assigned_tutor_id` trong CSDL được cập nhật và ghi nhật ký `audit_logs` với action `'tutor_assigned'`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp tự luận `sub-123`, **khi** Admin chọn Giảng viên A từ Dropdown, **thì** hệ thống cập nhật `assigned_tutor_id = 'tutor-A'` cho toàn bộ các tasks/parts của group bài nộp đó.
2. **Cho trước** bài nộp đã gán cho Giảng viên A, **khi** Admin chuyển chọn về "— Chưa phân công —", **thì** hệ thống cập nhật `assigned_tutor_id = NULL` và đưa bài nộp về trạng thái tự do.
3. **Cho trước** thao tác phân công thành công, **khi** kiểm tra nhật ký hệ thống `audit_logs`, **thì** hiển thị bản ghi với hành động `tutor_assigned`, ghi nhận tên Admin phân công, tên Giảng viên được gán và tên Học viên nộp bài.

---

### Trường hợp biên

- Admin chọn phân công cho một tài khoản không phải vai trò `tutor` (hệ thống từ chối với lỗi 404/400).
- Bài nộp đã được Giáo viên chấm hoàn tất (`status = 'tutor_graded'`) (Admin không thể thay đổi phân công và nhận được thông báo phù hợp).
- Gián đoạn kết nối mạng khi gửi request phân công (giao diện giữ nguyên trạng thái cũ và hiển thị thông báo lỗi).

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: API Lấy danh sách phân công (`GET /api/v1/admin/tutor-assignments`) PHẢI được bảo vệ bởi middleware `authorize('admin')`.
- **FR-002**: API Phân công PHẢI trả về danh sách toàn bộ người dùng có vai trò `role = 'tutor'` để hiển thị trên Dropdown phân công.
- **FR-003**: API Phân công (`PUT /api/v1/admin/tutor-assignments/:submissionId`) PHẢI cập nhật cột `assigned_tutor_id` cho tất cả các bản ghi liên quan trong nhóm bài nộp (`writing_group_id` hoặc `speaking_group_id`).
- **FR-004**: Việc phân công hoặc hủy phân công PHẢI tự động ghi vết nhật ký `audit_logs` với `action = 'tutor_assigned'`, bao gồm `tutor_name`, `student_name` và `submission_type`.
- **FR-005**: Giáo viên chỉ xem thấy và nhận chấm các bài được phân công trực tiếp cho mình (`assigned_tutor_id = req.user.id`) hoặc bài chưa phân công (`assigned_tutor_id IS NULL`).
- **FR-006**: Mọi API response PHẢI tuân thủ cấu trúc envelope `{ success, data, error, meta }`.

### Thực thể chính

- **Bản ghi Phân công (Tutor Assignment Item)**: Nhóm thông tin gồm `id`, `type`, `task_or_part`, `test_title`, `student`, `target_band`, `tutor_id`, `tutor_name`.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả đo lường được

- **SC-001**: 100% các bài nộp tự luận cần chấm thủ công đều có thể được gán hoặc điều chuyển Giảng viên bởi Admin.
- **SC-002**: 100% thao tác phân công của Admin được ghi nhật ký hệ thống `audit_logs` với action `'tutor_assigned'`.
- **SC-003**: 100% yêu cầu phân công từ người dùng không phải Admin PHẢI bị từ chối với lỗi 403 Forbidden.
- **SC-004**: Thời gian phản hồi API phân công Giảng viên PHẢI dưới 800ms ở điều kiện baseline.

## Giả định và phụ thuộc

- Đã có bảng `writing_submissions`, `speaking_submissions`, `users`, `audit_logs`.
- Middleware `authenticate` và `authorize('admin')` đã sẵn sàng.

## Ngoài phạm vi

- Quản lý tài khoản và phân quyền người dùng chung — thuộc `feat-user-management`.
- Giao diện chấm bài chi tiết của Giáo viên — thuộc `feat-tutor-grading-workspace`.
