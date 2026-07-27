# Mô hình Dữ liệu (Data Model): Audit Log and Change History

## Mục Nhật ký Kiểm toán (Audit Log Entry)

Dựa trên bảng `audit_logs`.

Các trường (Fields):
- `id` UUID khóa chính (primary key).
- `actor_id` UUID có thể null tham chiếu (reference) tới `users.id`; null có nghĩa là hành động của hệ thống (system action).
- `action` `log_action` enum.
- `target_table` chuỗi (string).
- `target_id` UUID có thể null là id của bản ghi mục tiêu (target record id).
- `old_value` JSONB có thể null lưu ảnh chụp trạng thái trước (before-state snapshot).
- `new_value` JSONB có thể null lưu ảnh chụp trạng thái sau (after-state snapshot).
- `ip_address` INET có thể null.
- `can_undo` boolean.
- `undone_at` timestamp có thể null.
- `undone_by` UUID có thể null tham chiếu tới `users.id`.
- `undo_log_id` UUID có thể null tham chiếu tới một `audit_logs.id` khác.
- `created_at` timestamp.

Mối quan hệ (Relationships):
- Actor nối (joins) với `users` đóng vai trò là admin/user thực hiện hành động.
- Target nối với `users` khi `target_table = 'users'`.
- Undo actor nối với `users` thông qua `undone_by`.
- Undo log trỏ tới dòng `change_reverted` được tạo ra.

Quy tắc xác thực (Validation rules):
- `action` phải có mặt trong `log_action`.
- Undo yêu cầu `can_undo = true`, `undone_at IS NULL`, target table là `users`, và có hỗ trợ trường old/new.
- Undo từ chối các hành động admin tự nhắm vào chính mình (self-targeting admin actions).

## View Nhật ký Hoạt động (Activity Log View)

Là hình chiếu (Projection) của `audit_logs` được định dạng bởi `AuditLogService.listActivityLogs`.

Các trường:
- `id`, `created_at`, `action` (chuỗi action nguyên gốc; frontend sẽ ánh xạ (maps) thành nhãn (label)).
- `actor` display label (chuỗi).
- `target` display label (chuỗi).
- `ip` chuỗi IP đã được chuẩn hóa (normalized IP string).
- `severity`: `normal` hoặc `suspicious`.
- `reason` chuỗi ghi chú thân thiện với người đọc (human-readable note string).

Lưu ý: `action_label` KHÔNG có mặt trong phản hồi (response) của activity log. Frontend tự suy ra (derives) nhãn từ `action` thông qua hàm helper ánh xạ (mapping helper) của riêng nó. `action_label` chỉ khả dụng trong Change Log View.

## View Nhật ký Thay đổi (Change Log View)

Là hình chiếu của `audit_logs` được định dạng bởi `AuditLogService.listChangeLogs`.

Các trường:
- `id`, `created_at`, `action`, `action_label`.
- `actor`, `target_table`, `target_id`, `target_label`.
- `old_value`, `new_value`.
- `status`: `applied` hoặc `undone`.
- `can_undo`, `undone_at`, `undo_log_id`.

## Bản ghi Hoàn tác (Undo Record)

Một dòng `audit_logs` với `action = 'change_reverted'`.

Chuyển đổi trạng thái (State transition):
- Source log: `applied` -> `undone`.
- Target user role/status: giá trị hiện tại phải khớp với `new_value` của source; sau đó khôi phục (restore) về `old_value` của source.
- Dòng undo log mới được chèn vào; source log lưu `undone_at`, `undone_by`, `undo_log_id`.

## Phân loại Mức độ Nghiêm trọng (Severity Classification)

Được suy ra từ action:
- Đáng ngờ (Suspicious): `login_failed`, `account_locked`, `user_deactivated`, `role_changed`, `password_changed_by_admin`, `permission_denied`.
- Bình thường (Normal): tất cả các actions khác trừ khi logic của service mở rộng danh sách này.
