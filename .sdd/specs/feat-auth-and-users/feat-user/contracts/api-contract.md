# Hợp đồng API (API Contract): User Administration and Authorization

## GET `/api/v1/admin/users`

Xác thực (Auth): admin.

Query (Tham số):
- `page` số nguyên (integer) mặc định `1`.
- `limit` số nguyên mặc định `10`.
- `role` tùy chọn (optional): `student`, `tutor`, `admin`.
- `status` tùy chọn: `pending`, `active`, `inactive`, `banned`.
- `search` tùy chọn: tìm chuỗi con (substring) theo name/email.

Dữ liệu thành công (Success data): mảng (array) các người dùng đã loại bỏ thông tin nhạy cảm (safe users).

Meta:

```json
{ "page": 1, "limit": 10, "total": 42 }
```

## PUT `/api/v1/admin/users/:id/role`

Xác thực (Auth): admin.

Body:

```json
{ "role": "tutor" }
```

Thành công: người dùng đã được cập nhật an toàn (updated safe user).

Lỗi (Errors):
- 403 khi thao tác lên chính mình (self-change).
- 404 khi không tìm thấy người dùng (missing user).
- 400 đối với role không hợp lệ.

Hiệu ứng phụ (Side effects):
- Thu hồi (Revoke) các phiên hoạt động (active sessions) của người dùng bị tác động.
- Chèn (Insert) log audit bao gồm các giá trị cũ/mới của role.

## PUT `/api/v1/admin/users/:id/status`

Xác thực (Auth): admin.

Body:

```json
{ "status": "inactive" }
```

Thành công: người dùng đã được cập nhật an toàn.

Lỗi (Errors):
- 403 khi thao tác lên chính mình.
- 404 khi không tìm thấy người dùng.
- 400 đối với status không hợp lệ.

Hiệu ứng phụ (Side effects):
- Thu hồi (Revoke) các phiên hoạt động khi mục tiêu bị chuyển thành `inactive` hoặc `banned`.
- Chèn (Insert) log audit bao gồm các giá trị cũ/mới của status.

## GET `/api/v1/admin/sessions`

Xác thực (Auth): admin.

Dữ liệu thành công (Success data):

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "email": "learner@example.com",
    "full_name": "Learner Name",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0",
    "is_oauth": false,
    "oauth_provider": null,
    "last_active_at": "2026-07-24T00:00:00.000Z",
    "expires_at": "2026-07-31T00:00:00.000Z"
  }
]
```

## DELETE `/api/v1/admin/sessions/:id`

Xác thực (Auth): admin.

Thành công: trường `revoked_at` của session được thiết lập thời gian hiện tại.

Lỗi (Errors):
- 404 hoặc trả về lỗi rõ ràng khi không tìm thấy/đã bị thu hồi từ trước.

Hiệu ứng phụ (Side effects):
- Chèn log audit về thao tác thu hồi session.
