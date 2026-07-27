# Hợp đồng API (API Contract): Authentication

Tất cả các phản hồi JSON đều sử dụng `{ success, data, error, meta }`. Các Auth cookies được thiết lập HttpOnly từ backend.

## POST `/api/v1/auth/register`

Body:

```json
{ "email": "learner@example.com", "password": "secret123", "full_name": "Learner Name" }
```

Thành công (Success): `201`, hướng dẫn đăng ký/xác thực chung (generic registration/verification guidance). Email trùng lặp trả về `400` kèm theo thông báo rõ ràng rằng tài khoản đã tồn tại (tính năng chống dò tìm tài khoản KHÔNG áp dụng ở đây; xem FR-003). Chống dò tìm tài khoản (Anti-enumeration - phản hồi chung chung bất kể tài khoản có tồn tại hay không) chỉ áp dụng cho forgot-password.

## POST `/api/v1/auth/verify-email`

Body:

```json
{ "token": "opaque-token" }
```

Thành công: tài khoản chuyển sang active. Lỗi (Errors): token không hợp lệ (invalid), đã dùng (used), hoặc hết hạn (expired).

## POST `/api/v1/auth/login`

Body:

```json
{ "email": "learner@example.com", "password": "secret123" }
```

Dữ liệu thành công (Success data): trả về đối tượng user an toàn không có `password_hash`; access/refresh cookies được thiết lập. Các lỗi về thông tin sai (bad credentials) hoặc tài khoản bị chặn (blocked status) được hiển thị chung chung.

## POST `/api/v1/auth/refresh-token`

Body: tuỳ chọn (optional) `{ "refreshToken": "..." }`; ưu tiên sử dụng cookie.

Thành công: access token/cookie mới được cấp nếu DB session vẫn active và người dùng vẫn đang active.

## POST `/api/v1/auth/logout`

Xác thực (Auth): mọi người dùng đã đăng nhập.

Thành công: session hiện tại bị thu hồi (revoked) và cookies bị xóa.

## POST `/api/v1/auth/forgot-password`

Body:

```json
{ "email": "learner@example.com" }
```

Thành công: thông báo chung chung dù email có tồn tại hay không.

## POST `/api/v1/auth/reset-password`

Body:

```json
{ "token": "reset-token-or-otp", "password": "newsecret123" }
```

Thành công: password hash được cập nhật, token được đánh dấu đã dùng, thêm bản ghi lịch sử mật khẩu (password history inserted).

## POST `/api/v1/auth/change-password`

Auth: người dùng đã đăng nhập.

Body:

```json
{ "old_password": "oldsecret123", "new_password": "newsecret123" }
```

Lỗi: tài khoản Google-only không có mật khẩu cục bộ, sai old password, mật khẩu quá ngắn.

## GET `/api/v1/auth/google`

Điều hướng (Redirects) tới Google OAuth cùng với state cookie.

## GET `/api/v1/auth/google/callback`

Query: `code`, `state`.

Thành công: kiểm tra (validates) state, trao đổi (exchanges) code, upsert user cục bộ, bắt đầu session, điều hướng về frontend.
