# Phân hệ Tài khoản & Phân quyền (feat-auth-and-users) Spec

**Version:** 1.1.0 (REVISED) | **Owner:** Thành viên 1 | **Date:** 2026-05-25

---

## 1. Context & Goal
Feature này tồn tại để cung cấp cơ chế xác thực bảo mật và phân quyền truy cập cho toàn bộ hệ thống e-learning IELTS.
Giải quyết vấn đề bảo vệ tài nguyên (đề thi, tài liệu thư viện, dashboard chấm điểm) không bị truy cập trái phép, đồng thời lưu trữ thông tin tiến độ học tập cá nhân hóa cho từng Học viên.

---

## 2. Actors & Roles
* **Guest (Khách vãng lai):** Quyền xem trang chủ, xem danh mục đề thi, đăng ký tài khoản mới và yêu cầu đặt lại mật khẩu.
* **Student (Học viên):** Quyền đăng nhập, cập nhật hồ sơ cá nhân (Target Band Score), làm bài thi và xem lịch sử học tập. Không có quyền truy cập vào chức năng của Tutor/Admin.
* **Tutor (Giáo viên):** Quyền đăng nhập, truy cập dashboard chấm bài tự luận và quản lý thư viện tài liệu. Không có quyền truy cập dashboard Admin.
* **Admin (Quản trị viên):** Quyền tối cao, quản lý danh sách user, kích hoạt/vô hiệu hóa tài khoản và thay đổi Role của các user khác. Admin không thể tự thay đổi Role của chính mình.

---

## 3. Functional Requirements (EARS Notation)
* **FR-01 (Đăng ký):** **WHEN** Guest gửi thông tin Đăng ký gồm Email (chưa tồn tại trong DB), Mật khẩu (tối thiểu 8 ký tự, có ít nhất 1 chữ số và 1 ký tự đặc biệt) và Tên hiển thị, **THEN** Node.js system **SHALL** băm mật khẩu bằng Bcrypt (Salt Round = 10), lưu user mới vào SQL Server với trạng thái `inactive` và Role mặc định là `Student`. Backend phải validate lại toàn bộ các điều kiện này độc lập với Frontend.
* **FR-02 (Xác thực Email):** **WHEN** Guest click vào link xác thực gửi qua email trong vòng 24h, **THEN** system **SHALL** cập nhật trạng thái user thành `active` và điều hướng về trang Đăng nhập. **IF** link đã hết hạn (quá 24h), **THEN** system **SHALL** trả về trang thông báo lỗi kèm nút "Gửi lại email xác thực". **IF** hệ thống gửi email thất bại (lỗi SMTP), **THEN** system **SHALL** ghi log lỗi và trả về thông báo lỗi cho người dùng, cho phép thử lại sau 60 giây.
* **FR-03 (Đăng nhập):** **WHEN** User gửi đúng Email và Mật khẩu của tài khoản `active`, **THEN** system **SHALL** sinh ra 1 cặp Access Token (JWT, hạn 15 phút) và Refresh Token (Opaque Token, hạn 7 ngày, lưu vào bảng `RefreshTokens`), sau đó đặt cả hai vào HttpOnly Cookie và trả về thông tin user cùng Role.
* **FR-04 (Chặn truy cập trái phép):** **WHILE** một Request được gửi tới các API yêu cầu quyền Student/Tutor/Admin, **THEN** Node.js Middleware **SHALL** giải mã JWT. **IF** JWT hết hạn => trả về HTTP 401. **IF** JWT không hợp lệ hoặc không có quyền tương ứng => trả về HTTP 403. Middleware phải kiểm tra thêm trạng thái Status của User trong DB tại mỗi request để đảm bảo tài khoản bị `deactivated` không thể tiếp tục truy cập dù token còn hạn.
* **FR-05 (Refresh Token):** **WHEN** Access Token hết hạn và React gọi API `/api/auth/refresh` với Refresh Token hợp lệ, **THEN** system **SHALL** kiểm tra Refresh Token trong bảng `RefreshTokens` và kiểm tra Status của User. **IF** User đang `active` => cấp Access Token mới **VÀ** thu hồi Refresh Token cũ, tạo Refresh Token mới (rotation). **IF** User không `active` => từ chối, trả về HTTP 401.
* **FR-06 (Admin đổi Role):** **WHEN** Admin thực hiện thay đổi Role của một User khác (không phải chính mình), **THEN** system **SHALL** dùng transaction để:
    1. Cập nhật `RoleID` trong bảng `Users`.
    2. Thu hồi toàn bộ Refresh Token cũ của User đó trong bảng `RefreshTokens`.
    
    **IF** có conflict (hai Admin cùng sửa một User), **THEN** system **SHALL** dùng optimistic locking (kiểm tra `UpdatedAt` timestamp trước khi ghi) và trả về lỗi HTTP 409 Conflict cho request đến sau.
* **FR-07 (Reset Mật khẩu):** **WHEN** Guest yêu cầu đặt lại mật khẩu bằng Email, **THEN** system **SHALL** tạo một Reset Token (hết hạn sau 1 giờ), lưu vào bảng `PasswordResetTokens` và gửi link đến Email. **WHEN** Guest submit mật khẩu mới qua link hợp lệ, **THEN** system **SHALL** cập nhật `PasswordHash`, thu hồi toàn bộ Refresh Token hiện có của User đó, và nếu Status đang là `locked` thì tự động chuyển về `active`.

---

## 4. Non-functional Requirements
* **Security:** Mật khẩu bắt buộc băm bằng Bcrypt, Salt Round = 10. Tuyệt đối không lưu plain-text. API đăng ký không được tiết lộ liệu email đã tồn tại hay chưa trong thông báo lỗi công khai (xem ER-01).
* **Performance:** Response time của API Đăng nhập và JWT Middleware phải dưới 200ms trong điều kiện mạng bình thường.
* **Token Storage:** Access Token và Refresh Token lưu trong HttpOnly Cookie với thuộc tính `Secure` và `SameSite=Strict` để chống XSS/CSRF.
* **Rate Limiting:** Tất cả các endpoint xác thực (đăng nhập, refresh, reset mật khẩu) phải áp dụng rate limiting theo IP: tối đa 20 request/phút. Vượt ngưỡng trả về HTTP 429 Too Many Requests.

---

## 5. Data (SQL Server Schema Tóm tắt)

### Table Roles
* `RoleID` (INT, PK, Identity): 1 - Student, 2 - Tutor, 3 - Admin.
* `RoleName` (VARCHAR(50), NOT NULL).

### Table Users
* `UserID` (UNIQUEIDENTIFIER, PK, Default: `NEWID()`).
* `Email` (VARCHAR(255), UNIQUE, NOT NULL).
* `PasswordHash` (VARCHAR(255), NOT NULL).
* `FullName` (NVARCHAR(100), NOT NULL).
* `AvatarUrl` (VARCHAR(500), NULL).
* `TargetBandScore` (DECIMAL(2,1), NULL) — *CHECK: giá trị hợp lệ từ 0.0 đến 9.0, bước nhảy 0.5.*
* `Status` (VARCHAR(20), NOT NULL) — *CHECK constraint: chỉ nhận inactive, active, deactivated, locked.*
* `RoleID` (INT, FK references Roles(RoleID)).
* `CreatedAt` (DATETIME, Default: `GETDATE()`).
* `UpdatedAt` (DATETIME, Default: `GETDATE()`) — *cập nhật mỗi khi row thay đổi, dùng cho optimistic locking.*
* `FailedLoginCount` (INT, Default: 0) — *đếm số lần nhập sai mật khẩu liên tiếp.*
* `FailedLoginWindowStart` (DATETIME, NULL) — *thời điểm bắt đầu cửa sổ đếm 15 phút.*

### Table RefreshTokens
* `TokenID` (UNIQUEIDENTIFIER, PK, Default: `NEWID()`).
* `UserID` (UNIQUEIDENTIFIER, FK references Users(UserID)).
* `TokenHash` (VARCHAR(255), NOT NULL) — *lưu hash của token, không lưu plain-text.*
* `ExpiresAt` (DATETIME, NOT NULL).
* `RevokedAt` (DATETIME, NULL) — *NULL nghĩa là còn hiệu lực.*
* `CreatedAt` (DATETIME, Default: `GETDATE()`).

### Table PasswordResetTokens
* `TokenID` (UNIQUEIDENTIFIER, PK, Default: `NEWID()`).
* `UserID` (UNIQUEIDENTIFIER, FK references Users(UserID)).
* `TokenHash` (VARCHAR(255), NOT NULL).
* `ExpiresAt` (DATETIME, NOT NULL).
* `UsedAt` (DATETIME, NULL) — *NULL nghĩa là chưa dùng.*
* `CreatedAt` (DATETIME, Default: `GETDATE()`).

---

## 6. Error Handling
* **ER-01 (Email trùng):** **WHERE** Guest đăng ký bằng Email đã tồn tại, **THEN** system **SHALL** trả về HTTP 400 với message chung chung: *"Đăng ký không thành công, vui lòng kiểm tra lại thông tin."* — không được xác nhận email đã tồn tại để tránh email enumeration attack.
* **ER-02 (Brute-force đăng nhập):** **WHERE** User nhập sai mật khẩu 5 lần liên tiếp trong cửa sổ 15 phút (tính theo `FailedLoginWindowStart`), **THEN** system **SHALL** chuyển Status thành `locked` (phân biệt với `deactivated` do Admin), reset `FailedLoginCount = 0`, và gửi email hướng dẫn reset mật khẩu. Sau khi reset mật khẩu thành công, Status tự động chuyển về `active`.
* **ER-03 (Token hết hạn):** **WHERE** Access Token hết hạn, **THEN** system **SHALL** trả về HTTP 401. React tự động gọi `/api/auth/refresh`. Nếu Refresh Token cũng hết hạn hoặc bị thu hồi, hệ thống trả về HTTP 401 và buộc User đăng nhập lại.
* **ER-04 (Link xác thực hết hạn):** **WHERE** Guest click link xác thực email đã quá 24h, **THEN** system **SHALL** trả về trang lỗi với thông báo rõ ràng và nút "Gửi lại email xác thực". Token cũ bị xóa khỏi DB hoặc đánh dấu vô hiệu.

---

## 7. Acceptance Criteria (Testable Checklist)
- [ ] Guest đăng ký thành công => DB có bản ghi Status = 'inactive', mật khẩu đã được hash.
- [ ] Dùng tài khoản `inactive` hoặc `locked` đăng nhập => HTTP 401, không cấp JWT.
- [ ] Student truy cập URL của trang Admin => React Router chặn, đẩy về `/403`.
- [ ] Admin vô hiệu hóa một Tutor => Status = 'deactivated' trong DB; request tiếp theo của Tutor đó bị từ chối dù Access Token chưa hết 15 phút (Middleware kiểm tra Status).
- [ ] Nhập mật khẩu không đủ điều kiện khi đăng ký => Frontend báo lỗi ngay; nếu bypass Frontend, Backend cũng từ chối với HTTP 400.
- [ ] Nhập sai mật khẩu 5 lần trong 15 phút => Status = 'locked', email hướng dẫn được gửi đi.
- [ ] Reset mật khẩu thành công khi đang `locked` => Status chuyển về `active`, toàn bộ Refresh Token cũ bị thu hồi.
- [ ] Gọi `/api/auth/refresh` với Refresh Token hợp lệ => cấp Access Token mới, Refresh Token cũ bị thu hồi (rotation), Refresh Token mới được tạo.
- [ ] Admin thay đổi Role của User => `RoleID` được cập nhật, toàn bộ Refresh Token cũ của User đó bị thu hồi trong cùng một transaction.
- [ ] Admin thử tự đổi Role của chính mình => HTTP 403, không có thay đổi nào trong DB.
- [ ] TargetBandScore nhập giá trị ngoài khoảng 0.0–9.0 hoặc không phải bước 0.5 => HTTP 400.

---

## 8. Out of Scope
* KHÔNG làm Đăng nhập/Đăng ký bằng Google, Facebook hoặc Apple ID trong sprint này.
* KHÔNG làm xác thực 2 lớp (2FA).
* KHÔNG lưu vết Audit Log lịch sử IP đăng nhập.
