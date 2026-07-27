# Mô hình Dữ liệu (Data Model): Authentication

## Tài khoản (Account)

Dựa trên bảng `users`.

Các trường (Fields):
- `id` UUID.
- `email` chuỗi (string) duy nhất.
- `password_hash` chuỗi có thể null; null đối với người dùng chỉ dùng Google.
- `full_name`, `avatar_url`.
- `role`: `student`, `tutor`, `admin` cộng với `user` (legacy).
- `status`: `pending`, `active`, `inactive`, `banned`.
- `failed_login_attempts`, `locked_until`, `last_login_at`, `must_change_password`.
- `target_band_score`, `target_test_date`.
- `created_at`, `updated_at`.

Xác thực (Validation):
- Email duy nhất và hợp lệ về cú pháp.
- Mật khẩu tối thiểu 8 ký tự.
- Trạng thái active là bắt buộc đối với đăng nhập thông thường.

## Phiên làm việc (Session)

Dựa trên bảng `user_sessions` và `v_active_sessions`.

Các trường:
- `id`, `user_id`, `session_token`.
- `ip_address`, `user_agent`.
- `is_oauth`, `oauth_provider`.
- `last_active_at`, `expires_at`, `revoked_at`.
- `created_at`, `updated_at`.

Chuyển đổi trạng thái (State transitions):
- Được tạo khi đăng nhập/OAuth thành công.
- Bị thu hồi (revoked) khi đăng xuất, admin thu hồi, thay đổi vai trò (role), trạng thái inactive/banned, hoặc thực thi giới hạn số phiên tối đa.
- Chỉ hoạt động (active) khi chưa bị thu hồi và chưa hết hạn.

## Chứng chỉ Xác thực (Verification Credential)

Dựa trên bảng `email_verification_tokens`.

Các trường: `id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`.

Trạng thái: chưa sử dụng -> đã sử dụng; các token hết hạn sẽ bị từ chối.

## Chứng chỉ Đặt lại Mật khẩu (Password Reset Credential)

Dựa trên bảng `password_reset_tokens`.

Các trường: `id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`.

Trạng thái: chưa sử dụng -> đã sử dụng; các token hết hạn/đã dùng/bị thiếu sẽ bị từ chối.

## Mục Lịch sử Mật khẩu (Password History Entry)

Dựa trên bảng `password_history`.

Các trường: `id`, `user_id`, `hash`, `reason`, `changed_from_ip`, `created_at`.

Xác thực: mật khẩu mới không được trùng với 3 mã băm (hashes) gần nhất.

## Tài khoản Đăng nhập Ngoài (External Login Account)

Dựa trên bảng `oauth_accounts`.

Các trường được suy ra từ truy vấn (query): `user_id`, `provider`, `provider_user_id`, `provider_email`, `linked_at`, `updated_at`.

Mối quan hệ (Relationship): một tài khoản cục bộ có thể có một liên kết cung cấp Google (Google provider link).
