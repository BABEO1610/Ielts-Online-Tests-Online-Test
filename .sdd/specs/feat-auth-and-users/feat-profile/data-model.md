# Mô hình Dữ liệu (Data Model): User Profile

## Hồ sơ (Profile)

Dựa trên bảng `users`.

Các trường được hiển thị (Fields shown):
- `id`, `email`, `full_name`, `avatar_url`.
- `role`, `status`.
- `target_band_score`, `target_test_date`.
- `created_at`, `last_login_at`.

Các trường nhạy cảm bị loại trừ (Sensitive fields excluded):
- `password_hash`.
- token/session secrets.
- dữ liệu về reset/verification token.

Xác thực (Validation):
- User phải được đăng nhập (authenticated).
- Tài khoản (Account) phải tồn tại.
- Cập nhật hồ sơ chấp nhận `full_name`, `avatar_url`, `target_band_score`, `target_test_date`.

## Mục tiêu Học tập (Learning Goal)

Lưu trữ trên bảng `users`.

Các trường:
- `target_band_score` số (numeric) có thể null, từ 0.0 đến 9.0, bước nhảy 0.5.
- `target_test_date` ngày (date) có thể null.

Trạng thái (State):
- Unset (chưa thiết lập) -> set trong quá trình onboarding hoặc sửa hồ sơ.
- Set -> updated (được cập nhật).
- Set -> cleared (bị xóa) bằng cách gửi giá trị null cho ngày nếu được hỗ trợ.

## Ảnh Đại diện (Avatar Image)

Các trường:
- File tải lên (Uploaded file): trường multipart `avatar`.
- Dữ liệu trả về (Returned data): `avatar_url`.

Xác thực:
- MIME type phải là định dạng hình ảnh được hỗ trợ.
- Kích thước file không được vượt quá 5 MB theo chính sách của frontend và backend.

## Cài đặt Bảo mật (Security Setting)

Được suy ra từ trạng thái xác thực (auth state) của tài khoản.

Các trường:
- `has_local_password`: suy ra từ `password_hash` (có thể null).
- Payload đổi mật khẩu (Password change payload) sử dụng mật khẩu cũ/mới.

Quy tắc (Rules):
- Người dùng có local-password phải cung cấp mật khẩu hiện tại chính xác.
- Người dùng chỉ dùng Google (Google-only users) sẽ nhận được hướng dẫn đổi mật khẩu qua email.

## Lịch sử Yêu cầu Hỗ trợ (Support Request History)

Dựa trên truy vấn của tính năng hỗ trợ/liên hệ (support/contact query layer).

Các trường:
- Request id, subject/content, status, created timestamp.
- Ghi chú của Admin (Admin notes) hoặc nội dung trả lời (reply message) nếu có.

Quy tắc: nếu lịch sử trống thì hiển thị trạng thái rỗng (empty state) thay vì trả về lỗi.
