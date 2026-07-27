# Hợp đồng API (API Contract): User Profile

## GET `/api/v1/users/me`

Xác thực (Auth): logged-in user.

Dữ liệu thành công (Success data):

```json
{
  "id": "uuid",
  "email": "learner@example.com",
  "full_name": "Learner Name",
  "avatar_url": "https://example.com/avatar.png",
  "role": "student",
  "status": "active",
  "target_band_score": 7.0,
  "target_test_date": "2026-12-01",
  "created_at": "2026-07-24T00:00:00.000Z",
  "last_login_at": "2026-07-24T00:00:00.000Z"
}
```

Không được bao gồm (Must not include) `password_hash` hay các token secrets.

## PUT/PATCH `/api/v1/users/me`

Xác thực (Auth): logged-in user.

Body:

```json
{
  "full_name": "New Name",
  "avatar_url": "https://example.com/avatar.png",
  "target_band_score": 7.5,
  "target_test_date": "2026-12-01"
}
```

Thành công: trả về đối tượng hồ sơ an toàn sau khi cập nhật (safe updated profile object).

Các lỗi xác thực (Validation errors):
- invalid target band score.
- missing/nonexistent user (người dùng không tồn tại/thiếu dữ liệu).

## POST `/api/v1/users/me/avatar`

Xác thực (Auth): logged-in user.

Yêu cầu (Request): `multipart/form-data` với trường file là `avatar`.

Dữ liệu thành công (Success data):

```json
{ "avatar_url": "https://storage.example.com/avatars/user-id/file.webp" }
```

Lỗi (Errors):
- không có file (no file).
- định dạng không được hỗ trợ (unsupported type).
- dung lượng vượt quá chính sách (size exceeds policy).
- lỗi lưu trữ (storage failure).

## POST `/api/v1/auth/change-password`

Xác thực (Auth): logged-in user.

Body:

```json
{ "old_password": "oldsecret123", "new_password": "newsecret123" }
```

Được sử dụng bởi phần cài đặt bảo mật của profile. Xem `feat-auth/contracts/api-contract.md`.

## GET `/api/v1/users/me/support-history`

Xác thực (Auth): logged-in user.

Dữ liệu thành công: trả về mảng (array) các dòng yêu cầu hỗ trợ được sắp xếp theo `created_at DESC`:

```json
[
  {
    "id": "uuid",
    "subject": "Cannot access test",
    "message": "I tried to open the test but got an error.",
    "status": "resolved",
    "reply_message": "We have fixed the issue.",
    "created_at": "2026-07-24T00:00:00.000Z",
    "resolved_at": "2026-07-25T00:00:00.000Z"
  }
]
```

Trả về mảng rỗng `[]` khi người dùng không có yêu cầu hỗ trợ nào (điều này không phải là lỗi).

Lỗi (Errors):
- 401 nếu chưa được xác thực (unauthenticated).
- 404 nếu tài khoản người dùng không tồn tại (user account does not exist).
