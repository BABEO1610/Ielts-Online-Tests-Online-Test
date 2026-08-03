# Đặc tả tính năng: Admin Phân công Giảng viên chấm bài

**Ngày tạo**: 2026-07-23
**Trạng thái**: Nền tảng HIỆN CÓ; các cổng phát hành MỤC TIÊU vẫn còn mở
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cho phép Quản trị viên (Admin) quản lý tập trung quá trình phân công Giảng viên (Tutor) phụ trách cho từng bài nộp tự luận Writing và Speaking mà học viên đã nộp với `grader = 'tutor'`. Admin truy cập trang phân công chuyên dụng để xem danh sách bài nộp chờ xử lý, xem danh sách Giảng viên khả dụng, và thực hiện gán hoặc hủy gán chỉ bằng một thao tác chọn Dropdown. Mọi hành động phân công đều được ghi vết tự động vào nhật ký kiểm toán (`audit_logs`) để phục vụ đối soát và theo dõi SLA.

## 2. Phạm vi

- Giao diện trang phân công dành riêng cho Admin (`/admin/tutor-assignments`).
- Lấy danh sách bài nộp tự luận có `grader = 'tutor'` và `status = 'pending'` cùng danh sách Giảng viên khả dụng.
- Phân công hoặc hủy phân công Giảng viên cho toàn bộ nhóm bài nộp (theo `writing_group_id` hoặc `speaking_group_id`).
- Ghi nhật ký kiểm toán (`audit_logs`) tự động với `action = 'tutor_assigned'` cho mọi thao tác phân công.
- Hiển thị nổi bật (cảnh báo) các bài nộp chưa có Giảng viên được gán.

## 3. Ngoài phạm vi

- Quản lý tài khoản và phân quyền người dùng chung — thuộc `feat-user-management`.
- Giao diện chấm bài chi tiết của Giảng viên — thuộc `feat-tutor-grading-workspace`.
- Luồng nộp bài của Học viên — thuộc `feat-writing-test-flow` và `feat-speaking-test-flow`.
- Báo cáo phân tích tải công việc (workload analytics) theo Giảng viên — chưa được phê duyệt phạm vi.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Quản trị viên (Admin) | Xem danh sách bài nộp chờ phân công, phân công hoặc hủy phân công Giảng viên cho bất kỳ bài nộp nào. |
| Giảng viên (Tutor) | Không có quyền truy cập trang phân công; chỉ thấy bài được gán trong hàng đợi chấm của mình. |
| Học viên (Student) | Không có quyền truy cập bất kỳ endpoint phân công nào; mọi request bị từ chối với 403 Forbidden. |
| Khách/chưa đăng nhập | Không có quyền truy cập; bị từ chối với 401 Unauthorized. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Admin xem danh sách bài nộp chờ phân công (Ưu tiên: P1)

Với tư cách Admin, tôi muốn truy cập trang Phân công Giảng viên để xem toàn bộ các bài nộp thi tự luận (Writing & Speaking) đang chờ chấm, cùng danh sách các Giảng viên khả dụng để thực hiện phân công.

**Kiểm thử độc lập**: Đăng nhập tài khoản Admin, mở trang `/admin/tutor-assignments`, kiểm tra API `GET /api/v1/admin/tutor-assignments` trả về danh sách bài nộp `status = 'pending'` và danh sách Giảng viên `role = 'tutor'`. Xác minh người không phải Admin nhận lỗi 403.

**Kịch bản chấp nhận**:

1. **Cho trước** các bài nộp Writing và Speaking của học viên có `grader = 'tutor'`, **Khi** Admin truy cập trang phân công, **Thì** hệ thống hiển thị danh sách bài nộp phân trang, hiển thị tên bài thi, người nộp, mục tiêu band và ô chọn Giảng viên phụ trách.
2. **Cho trước** một bài nộp chưa có Giảng viên gán (`assigned_tutor_id IS NULL`), **Khi** hiển thị trên bảng, **Thì** dòng bài nộp được nổi bật cảnh báo để Admin dễ nhận biết.
3. **Cho trước** người dùng không phải Admin (Học viên hoặc Giảng viên), **Khi** cố tình truy cập API phân công, **Thì** hệ thống từ chối với lỗi 403 Forbidden.

### Câu chuyện 2 — Admin phân công hoặc hủy phân công Giảng viên (Ưu tiên: P1)

Với tư cách Admin, tôi muốn chọn một Giảng viên từ danh sách thả xuống để gán bài nộp cho Giảng viên đó (hoặc chọn "Chưa phân công" để bỏ gán).

**Kiểm thử độc lập**: Tại trang phân công, chọn Giảng viên từ Dropdown cho bài nộp ID `sub-123`, kiểm tra API `PUT /api/v1/admin/tutor-assignments/:submissionId` được gọi, cột `assigned_tutor_id` trong cơ sở dữ liệu được cập nhật và bản ghi `audit_logs` với `action = 'tutor_assigned'` được tạo.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp tự luận chưa có Giảng viên gán, **Khi** Admin chọn Giảng viên A từ Dropdown, **Thì** hệ thống cập nhật `assigned_tutor_id = 'tutor-A'` cho toàn bộ bản ghi liên quan trong nhóm bài nộp đó.
2. **Cho trước** bài nộp đã gán cho Giảng viên A, **Khi** Admin chuyển chọn về "— Chưa phân công —", **Thì** hệ thống cập nhật `assigned_tutor_id = NULL` và bài nộp trở về trạng thái tự do.
3. **Cho trước** thao tác phân công thành công, **Khi** kiểm tra nhật ký hệ thống `audit_logs`, **Thì** hiển thị bản ghi với `action = 'tutor_assigned'`, ghi nhận tên Admin phân công, tên Giảng viên được gán và tên Học viên nộp bài.

## 6. Trường hợp biên

- Admin chọn phân công cho tài khoản không có vai trò `tutor` — hệ thống từ chối với lỗi 404.
- Bài nộp đã được Giảng viên chấm hoàn tất (`status = 'tutor_graded'`) — Admin không thể thay đổi phân công và nhận thông báo phù hợp.
- Gián đoạn kết nối mạng khi gửi request phân công — giao diện giữ nguyên trạng thái cũ và hiển thị thông báo lỗi.
- Admin cố gắng phân công cho `submissionId` không tồn tại — hệ thống trả lỗi 404.
- Hai Admin cùng phân công cùng một bài nộp đồng thời — request cuối cùng thắng (last-write-wins); không có cơ chế lock đặc biệt ở bước này.

## 7. Quy tắc nghiệp vụ

- **BR-ATA-001 [AS-BUILT]**: Chỉ tài khoản có vai trò `admin` mới có thể truy cập và thực thi các endpoint phân công Giảng viên.
- **BR-ATA-002 [AS-BUILT]**: Phân công Giảng viên cập nhật `assigned_tutor_id` cho tất cả bản ghi trong cùng nhóm bài nộp (cùng `writing_group_id` hoặc `speaking_group_id`), không chỉ một bản ghi đơn lẻ.
- **BR-ATA-003 [AS-BUILT]**: Tài khoản được phân công phải có vai trò `role = 'tutor'`; nếu không hệ thống từ chối với lỗi 404.
- **BR-ATA-004 [AS-BUILT]**: Mọi thao tác phân công hoặc hủy phân công (kể cả gán `null`) phải tự động ghi bản ghi vào `audit_logs` với `action = 'tutor_assigned'`, bao gồm `tutor_id`, `tutor_name`, `student_name`, `submission_type` cho cả trạng thái trước và sau.
- **BR-ATA-005 [AS-BUILT]**: Bài nộp đã được Giảng viên chấm hoàn tất (`status = 'tutor_graded'`) không thể thay đổi phân công.
- **BR-ATA-006 [NEEDS CLARIFICATION]**: Khi bài nộp có trạng thái trung gian (ví dụ Giảng viên đang chấm dở) — chính sách có cho phép Admin điều chuyển Giảng viên không, và hệ quả với dữ liệu chấm đang dở là gì?

## 8. Yêu cầu chức năng

- **FR-ATA-001 [AS-BUILT]**: API Lấy danh sách phân công (`GET /api/v1/admin/tutor-assignments`) PHẢI được bảo vệ bởi middleware `authorize('admin')` và hỗ trợ phân trang (`page`, `limit`).
- **FR-ATA-002 [AS-BUILT]**: API PHẢI trả về danh sách toàn bộ người dùng có vai trò `role = 'tutor'` để hiển thị trên Dropdown phân công.
- **FR-ATA-003 [AS-BUILT]**: API Phân công (`PUT /api/v1/admin/tutor-assignments/:submissionId`) PHẢI cập nhật cột `assigned_tutor_id` cho tất cả bản ghi liên quan trong nhóm bài nộp (`writing_group_id` hoặc `speaking_group_id`).
- **FR-ATA-004 [AS-BUILT]**: Việc phân công hoặc hủy phân công PHẢI tự động ghi vết nhật ký `audit_logs` với `action = 'tutor_assigned'`, bao gồm `tutor_name`, `student_name` và `submission_type`, ghi nhận cả trạng thái trước và sau.
- **FR-ATA-005 [AS-BUILT]**: Giảng viên chỉ xem thấy và nhận chấm các bài được phân công trực tiếp cho mình (`assigned_tutor_id = req.user.id`) hoặc bài chưa phân công (`assigned_tutor_id IS NULL`) trong hàng đợi Giảng viên.
- **FR-ATA-006 [AS-BUILT]**: Mọi API response PHẢI tuân thủ cấu trúc envelope `{ success, data, error, meta }`.
- **FR-ATA-007 [TARGET]**: Giao diện phân công PHẢI hiển thị số lượng bài đang chấm hiện tại của mỗi Giảng viên trong Dropdown để Admin ra quyết định phân bổ hợp lý.

## 9. Yêu cầu phi chức năng

- **NFR-ATA-001 [AS-BUILT]**: Mọi đọc/ghi endpoint phân công phải thực thi phạm vi `admin` và trả về 403 cho vai trò không được phép.
- **NFR-ATA-002 [TARGET]**: Thời gian phản hồi API phân công Giảng viên PHẢI dưới 800ms ở điều kiện baseline; bằng chứng đo lường chưa có.
- **NFR-ATA-003 [AS-BUILT]**: Nhật ký kiểm toán phải ghi đủ thông tin để xác định ai phân công ai cho bài nào, vào lúc nào.

## 10. Thực thể chính

- **Bài nộp Writing (writing_submissions)**: Chứa `assigned_tutor_id`, `status`, `writing_group_id`, `student_name`, `tutor_name`, `target_band`.
- **Bài nộp Speaking (speaking_submissions)**: Chứa `assigned_tutor_id`, `status`, `speaking_group_id`, `student_name`, `tutor_name`, `target_band`.
- **Người dùng (users)**: Chứa `role` phân biệt `tutor` và `admin`.
- **Nhật ký kiểm toán (audit_logs)**: Lưu bản ghi hành động `tutor_assigned` với dữ liệu trước và sau.

## 11. Tiêu chí thành công

- **SC-ATA-001 [AS-BUILT]**: 100% bài nộp tự luận cần chấm thủ công đều có thể được gán hoặc điều chuyển Giảng viên bởi Admin.
- **SC-ATA-002 [AS-BUILT]**: 100% thao tác phân công của Admin được ghi nhật ký hệ thống `audit_logs` với `action = 'tutor_assigned'`.
- **SC-ATA-003 [AS-BUILT]**: 100% yêu cầu phân công từ người dùng không phải Admin bị từ chối với lỗi 403 Forbidden.
- **SC-ATA-004 [TARGET]**: Thời gian phản hồi API phân công Giảng viên dưới 800ms ở điều kiện baseline.

## 12. Giả định

- Bảng `writing_submissions`, `speaking_submissions`, `users`, `audit_logs` đã tồn tại trong cơ sở dữ liệu với cột `assigned_tutor_id`.
- Middleware `authenticate` và `authorize('admin')` đã hoạt động và sẵn sàng.
- `AuditLogService.logAction` đã được triển khai và có thể ghi nhận trạng thái trước/sau.

## 13. Phụ thuộc

- `AuditLogService` (`audit.service.js`) — phải hoạt động trước khi kiểm thử phân công.
- Schema PostgreSQL cho `audit_logs` với cột `action`, `before_state`, `after_state`.
- Middleware RBAC `authorize('admin')`.

## 14. Câu hỏi mở

1. **BR-ATA-006**: Khi Giảng viên đang chấm dở một bài nộp, Admin có được phép điều chuyển sang Giảng viên khác không? Nếu có, dữ liệu chấm đang dở của Giảng viên cũ xử lý thế nào?
2. Có cần gửi thông báo (email/socket) đến Giảng viên khi họ được gán hoặc bị hủy gán bài nộp không?
3. Phân tích tải (workload analytics) — tính năng hiển thị số bài đang chấm hiện tại của mỗi Giảng viên trong Dropdown có nằm trong phạm vi Sprint hiện tại không?
