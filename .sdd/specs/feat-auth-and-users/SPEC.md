# Phân hệ Tài khoản & Phân quyền (feat-auth-and-users) Spec
# Owner: Huong Duong | Date: 2026-05-25

## 1. Context & Goal
- Feature này tồn tại để cung cấp cơ chế xác thực bảo mật và phân quyền truy cập cho toàn bộ hệ thống e-learning IELTS.
- Giải quyết vấn đề bảo vệ tài nguyên (đề thi, tài liệu thư viện, dashboard chấm điểm) không bị truy cập trái phép, đồng thời lưu trữ thông tin tiến độ học tập cá nhân hóa cho từng Học viên.

## 2. Actors & Roles
- **Guest (Khách vãng lai):** Quyền xem trang chủ, xem danh mục đề thi, đăng ký tài khoản mới và yêu cầu đặt lại mật khẩu.
- **Student (Học viên):** Quyền đăng nhập, cập nhật hồ sơ cá nhân (Target Band Score), làm bài thi và xem lịch sử học tập. Không có quyền truy cập vào chức năng của Tutor/Admin.
- **Tutor (Giáo viên):** Quyền đăng nhập, truy cập dashboard chấm bài tự luận và quản lý thư viện tài liệu. Không có quyền truy cập dashboard Admin.
- **Admin (Quản trị viên):** Quyền tối cao, quản lý danh sách user, kích hoạt/vô hiệu hóa tài khoản và thay đổi Role của các user khác. Admin không thể tự thay đổi Role của chính mình.

> **Lưu ý implementation:** Role được lưu trực tiếp trên bảng `users` dưới dạng enum `user_role ('guest', 'student', 'tutor', 'admin')` — không có bảng `Roles` riêng.

## 3. Functional Requirements (EARS Notation)

- **FR-01 (Đăng ký):** WHEN Guest gửi thông tin Đăng ký gồm Email (chưa tồn tại trong DB), Mật khẩu (tối thiểu 8 ký tự, có ít nhất 1 chữ số và 1 ký tự đặc biệt) và Tên hiển thị, THE Node.js system SHALL băm mật khẩu bằng Bcrypt (Salt Round = 10), lưu user mới vào PostgreSQL với `status = 'pending'` và `role = 'student'`. Backend phải validate lại toàn bộ các điều kiện này độc lập với Frontend.

- **FR-02 (Xác thực Email):** WHEN Guest click vào link xác thực gửi qua email trong vòng 24h, THE system SHALL cập nhật `status = 'active'` và ghi `email_verified_at = NOW()` vào bảng `users`, sau đó điều hướng về trang Đăng nhập. IF link đã hết hạn (quá 24h), THE system SHALL trả về trang thông báo lỗi kèm nút "Gửi lại email xác thực" và đánh dấu token cũ vô hiệu trong bảng `email_verification_tokens`. IF hệ thống gửi email thất bại (lỗi SMTP), THE system SHALL ghi log lỗi và trả về thông báo lỗi cho người dùng, cho phép thử lại sau 60 giây.

- **FR-03 (Đăng nhập):** WHEN User gửi đúng Email và Mật khẩu của tài khoản có `status = 'active'`, THE system SHALL sinh ra Access Token (JWT, hạn 15 phút) và Refresh Token (JWT, hạn 7 ngày), đặt cả hai vào HttpOnly Cookie và trả về thông tin user cùng role.

- **FR-04 (Chặn truy cập trái phép):** WHILE một Request được gửi tới các API yêu cầu quyền student/tutor/admin, THE Node.js Middleware SHALL giải mã JWT. IF JWT hết hạn => trả về HTTP 401. IF JWT không hợp lệ hoặc role không đủ quyền => trả về HTTP 403. Middleware phải kiểm tra thêm `status` của User trong DB tại mỗi request để đảm bảo tài khoản `inactive` hoặc `banned` không thể tiếp tục truy cập dù token còn hạn.

- **FR-05 (Refresh Token):** WHEN Access Token hết hạn và React gọi API `/api/auth/refresh` với Refresh Token hợp lệ, THE system SHALL kiểm tra `status` của User. IF `status = 'active'` => cấp Access Token mới. IF `status` khác `active` => từ chối, trả về HTTP 401 và buộc đăng nhập lại.

- **FR-06 (Admin đổi Role):** WHEN Admin thực hiện thay đổi role của một User khác (không phải chính mình), THE system SHALL dùng transaction để cập nhật trường `role` trong bảng `users` và ghi vào `audit_logs` với `action = 'role_changed'`, `old_value`, `new_value`. IF có conflict (hai Admin cùng sửa một User), THE system SHALL dùng optimistic locking (kiểm tra `updated_at` timestamp trước khi ghi) và trả về HTTP 409 Conflict cho request đến sau.

- **FR-07 (Reset Mật khẩu):** WHEN Guest yêu cầu đặt lại mật khẩu bằng Email, THE system SHALL tạo một Reset Token (hết hạn sau 1 giờ), lưu vào bảng `password_reset_tokens` và gửi link đến Email. WHEN Guest submit mật khẩu mới qua link hợp lệ, THE system SHALL cập nhật `password_hash` trong bảng `users`, đánh dấu `used_at = NOW()` trên token, và nếu `status = 'inactive'` (khóa do brute-force) thì tự động chuyển về `active`.

- **FR-08 (Admin vô hiệu hóa tài khoản):** WHEN Admin vô hiệu hóa một User, THE system SHALL cập nhật `status = 'inactive'` trong bảng `users` và ghi vào `audit_logs` với `action = 'user_deactivated'`. Request tiếp theo của User đó sẽ bị Middleware từ chối tại bước kiểm tra `status`.

## 4. Non-functional Requirements

- **Security:** Mật khẩu bắt buộc băm bằng Bcrypt, Salt Round = 10. Tuyệt đối không lưu plain-text. API đăng ký không được xác nhận email đã tồn tại trong thông báo lỗi công khai để tránh email enumeration attack (xem ER-01).
- **Performance:** Response time của API Đăng nhập và JWT Middleware phải dưới 200ms trong điều kiện mạng bình thường.
- **Token Storage:** Access Token và Refresh Token lưu trong HttpOnly Cookie với thuộc tính `Secure` và `SameSite=Strict` để chống XSS/CSRF.
- **Rate Limiting:** Tất cả các endpoint xác thực (đăng nhập, refresh, reset mật khẩu) phải áp dụng rate limiting theo IP: tối đa 20 request/phút. Vượt ngưỡng trả về HTTP 429 Too Many Requests.
- **Database:** PostgreSQL với extension `pgcrypto` (gen_random_uuid()). Toàn bộ timestamp dùng `TIMESTAMPTZ` và `NOW()`.

## 5. Data (PostgreSQL Schema)

### Enum Types (liên quan đến auth)

```sql
CREATE TYPE user_role      AS ENUM ('guest', 'student', 'tutor', 'admin');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'inactive', 'banned');
```

> **Mapping trạng thái:**
> - `pending` — mới đăng ký, chưa xác thực email
> - `active` — tài khoản hoạt động bình thường
> - `inactive` — bị khóa tạm thời (brute-force) hoặc Admin khóa thủ công
> - `banned` — bị cấm vĩnh viễn bởi Admin

### Table `users`

```sql
CREATE TABLE users (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255)    NOT NULL UNIQUE,
    password_hash       TEXT            NOT NULL,
    role                user_role       NOT NULL DEFAULT 'student',
    status              account_status  NOT NULL DEFAULT 'pending',
    full_name           VARCHAR(255),
    avatar_url          TEXT,
    target_band_score   NUMERIC(3,1)    CHECK (target_band_score BETWEEN 0 AND 9),
    email_verified_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
```

> **Lưu ý:** Validation bước nhảy 0.5 của `target_band_score` thực hiện ở tầng application (Backend), không phải CHECK constraint DB.

> **Lưu ý:** Brute-force counter (`failed_login_count`, `failed_login_window_start`) chưa có trong schema hiện tại — **cần bổ sung migration** trước khi implement FR-07/ER-02.

### Table `email_verification_tokens`

```sql
CREATE TABLE email_verification_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table `audit_logs` (liên quan đến auth)

```sql
CREATE TABLE audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
    action          log_action  NOT NULL,  -- 'role_changed', 'user_deactivated', 'login', 'logout'
    target_table    VARCHAR(100),
    target_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Migration cần bổ sung (chưa có trong schema hiện tại)

```sql
-- Phục vụ ER-02 (brute-force protection)
ALTER TABLE users
    ADD COLUMN failed_login_count        INT         NOT NULL DEFAULT 0,
    ADD COLUMN failed_login_window_start TIMESTAMPTZ;
```

## 6. Error Handling

- **ER-01 (Email trùng):** WHERE Guest đăng ký bằng Email đã tồn tại, THE system SHALL trả về HTTP 400 với message chung: "Đăng ký không thành công, vui lòng kiểm tra lại thông tin." — không được xác nhận email đã tồn tại để tránh enumeration attack.

- **ER-02 (Brute-force đăng nhập):** WHERE User nhập sai mật khẩu 5 lần liên tiếp trong cửa sổ 15 phút (tính theo `failed_login_window_start`), THE system SHALL cập nhật `status = 'inactive'`, reset `failed_login_count = 0`, ghi `audit_logs` và gửi email hướng dẫn reset mật khẩu. Sau khi reset mật khẩu thành công, `status` tự động chuyển về `active`.

- **ER-03 (Token hết hạn):** WHERE Access Token hết hạn, THE system SHALL trả về HTTP 401. React tự động gọi `/api/auth/refresh`. Nếu Refresh Token cũng hết hạn, hệ thống trả về HTTP 401 và buộc User đăng nhập lại.

- **ER-04 (Link xác thực hết hạn):** WHERE Guest click link xác thực email đã quá 24h, THE system SHALL trả về trang lỗi với thông báo rõ ràng và nút "Gửi lại email xác thực". Ghi `used_at = NOW()` để vô hiệu hóa token cũ trong bảng `email_verification_tokens`.

## 7. Acceptance Criteria (Testable Checklist)

- [ ] Guest đăng ký thành công => DB có bản ghi `status = 'pending'`, `email_verified_at = NULL`, `password_hash` đã được hash.
- [ ] Guest click link xác thực hợp lệ => `status = 'active'`, `email_verified_at` được ghi giá trị timestamp.
- [ ] Dùng tài khoản `pending` hoặc `inactive` đăng nhập => HTTP 401, không cấp JWT.
- [ ] Student truy cập URL của trang Admin => React Router chặn, đẩy về `/403`.
- [ ] Admin vô hiệu hóa một Tutor => `status = 'inactive'` trong DB, `audit_logs` có bản ghi `action = 'user_deactivated'`; request tiếp theo của Tutor đó bị Middleware từ chối dù Access Token chưa hết hạn.
- [ ] Nhập mật khẩu không đủ điều kiện khi đăng ký => Frontend báo lỗi ngay; nếu bypass Frontend, Backend cũng từ chối với HTTP 400.
- [ ] Nhập sai mật khẩu 5 lần trong 15 phút => `status = 'inactive'`, email hướng dẫn được gửi đi.
- [ ] Reset mật khẩu thành công khi đang `inactive` (do brute-force) => `status` chuyển về `active`, `used_at` được ghi trên token reset.
- [ ] Admin thay đổi role của User => trường `role` được cập nhật, `audit_logs` có bản ghi `action = 'role_changed'` với `old_value` và `new_value`.
- [ ] Admin thử tự đổi role của chính mình => HTTP 403, không có thay đổi nào trong DB.
- [ ] `target_band_score` nhập giá trị ngoài khoảng 0–9 hoặc không phải bước 0.5 => HTTP 400.
- [ ] Link xác thực email click lần 2 sau khi đã dùng => HTTP 400, `used_at` đã có giá trị.

## 8. Out of Scope

- KHÔNG làm Đăng nhập/Đăng ký bằng Google, Facebook hoặc Apple ID trong sprint này.
- KHÔNG làm xác thực 2 lớp (2FA).