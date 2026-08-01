# Mô hình Dữ liệu (Data Model): User Administration and Authorization

## Tài khoản Người dùng (User Account)

Dựa trên bảng `users`.

Các trường hiển thị trong danh sách của Admin (Admin list fields):
- `id`, `full_name`, `email`, `role`, `status`, `created_at`.

Các trường cho phép Admin thay đổi (Admin mutation fields):
- `role`: `student`, `tutor`, `admin`.
- `status`: `active`, `inactive`, `pending`, `banned`.

Quy tắc (Rules):
- Chỉ có admins mới có thể xem danh sách hoặc thay đổi người dùng khác.
- Admin không thể tự thay đổi `role` hoặc `status` của chính mình.
- Mật khẩu/thông tin xác thực (Password/auth secrets) bị loại bỏ khỏi API response.

## Vai trò (Role)

Enum: `student`, `tutor`, `admin` cùng với giá trị cũ `user` tồn tại trong database enum.

Quy tắc:
- Ở phía frontend, `ProtectedRoute` điều hướng (redirects) những người dùng đã đăng nhập ra khỏi các không gian không thuộc thẩm quyền của họ.
- Ở phía backend, middleware `authorize('admin')` bảo vệ các admin endpoints.

## Trạng thái Tài khoản (Account Status)

Enum: `pending`, `active`, `inactive`, `banned`.

Hiệu ứng trạng thái (State effects):
- `active` có thể đăng nhập bình thường.
- `pending`, `inactive`, và `banned` không thể hoàn tất quá trình đăng nhập bình thường.
- Thay đổi thành `inactive` hoặc `banned` sẽ thu hồi các phiên đăng nhập đang hoạt động (revokes active sessions).

## Hành động của Admin (Admin Action)

Dựa trên bảng `audit_logs`.

Các trường:
- id của admin thực hiện (actor admin id).
- id của người dùng/phiên bị tác động (target user/session id).
- hành động (action): `role_changed`, `user_updated`, `user_deactivated`, hoặc hành động liên quan đến session.
- các giá trị cũ/mới (old/new values).
- IP và timestamp.

## Phiên Hoạt động (Active Session)

Dựa trên view `v_active_sessions`.

Các trường:
- `id`, `user_id`, `email`, `full_name`.
- `ip_address`, `user_agent`.
- `is_oauth`, `oauth_provider`.
- `last_active_at`, `expires_at`, `created_at`.

Trạng thái (State):
- Được coi là đang hoạt động (Active) khi `revoked_at IS NULL` và `expires_at > NOW()`.
- Bị thu hồi (Revoked) bằng cách cập nhật `revoked_at = NOW()`.
