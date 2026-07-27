# Bối cảnh — Quản lý Tài khoản và Xác thực (Authentication and User Identity)

Trạng thái: Đang áp dụng — Đây là bối cảnh nghiệp vụ chính thức của tính năng Xác thực người dùng (Auth).

## 1. Vấn đề cần giải quyết

Nền tảng IELTSZone cần một hệ thống quản lý danh tính và quyền truy cập an toàn, đáng tin cậy để:
- Cho phép người dùng đăng ký tài khoản mới và xác thực địa chỉ email.
- Cho phép người dùng đăng nhập bằng mật khẩu (Local) hoặc thông qua tài khoản Google (OAuth2).
- Duy trì trạng thái đăng nhập liên tục mà không bắt người dùng đăng nhập lại liên tục, thông qua cơ chế Refresh Token xoay vòng (rotation).
- Hỗ trợ chức năng lấy lại mật khẩu (quên mật khẩu) an toàn.
- Cải thiện trải nghiệm người dùng với các tiện ích nhỏ như tính năng bật/tắt hiển thị mật khẩu khi nhập liệu.
- Ngăn chặn các cuộc tấn công dò mật khẩu (brute-force) bằng cách khóa tạm thời tài khoản khi đăng nhập sai nhiều lần.

## 2. Kiến thức chuyên ngành

- **JSON Web Token (JWT):** Sử dụng access token có vòng đời ngắn cho các API, và refresh token vòng đời dài được lưu trữ trong HTTP-Only cookie nhằm chống tấn công XSS.
- **Mã hóa (Hashing):** Mật khẩu phải được băm bằng thuật toán an toàn (bcrypt) kết hợp với muối (salt) trước khi lưu vào cơ sở dữ liệu.
- **Giới hạn tốc độ (Rate Limiting) & Lockout:** Theo dõi số lần đăng nhập thất bại liên tiếp và áp dụng khoảng thời gian khóa tài khoản tăng dần để chống dò mật khẩu.
- **Google OAuth2:** Tích hợp quy trình cấp quyền OAuth2 từ Google để người dùng có thể đăng nhập/đăng ký chỉ với 1 thao tác click, không cần tạo mật khẩu cục bộ.

## 3. Các bên liên quan

- **Khách (`guest`):** Người dùng chưa có tài khoản, cần thực hiện quy trình đăng ký, xác thực email, và đăng nhập.
- **Học viên (`student`), Giảng viên (`tutor`), Quản trị viên (`admin`):** Các người dùng đã xác thực, sử dụng token để truy cập vào các không gian làm việc tương ứng.

## 4. Ràng buộc và bảo mật

- **Không trả về mật khẩu:** Bất kể API nào cũng không được trả về `password_hash` hay thông tin bí mật (token secrets) của hệ thống.
- **Bảo mật Cookie:** Refresh token phải được lưu ở cookie có thuộc tính `HttpOnly` và `Secure`.
- **Thu hồi phiên:** Nếu phát hiện các hành vi bất thường, thay đổi mật khẩu, hoặc tài khoản bị vô hiệu hóa, tất cả các phiên đăng nhập (sessions) hiện tại phải bị thu hồi ngay lập tức.
- **Chính sách mật khẩu:** Mật khẩu phải đáp ứng độ dài tối thiểu và được frontend cung cấp tiện ích bật/tắt hiển thị (show/hide toggle).

## 5. Giả định

- Cơ sở dữ liệu PostgreSQL đã được cài đặt và thiết lập sẵn các bảng `users`, `user_sessions`, và `email_verification_tokens`.
- Hệ thống gửi email (như Nodemailer) đã được cấu hình đủ khả năng gửi email xác thực và email đặt lại mật khẩu.
- Ứng dụng đã được đăng ký trên Google Cloud Console để lấy Client ID và Client Secret cho tính năng Google OAuth.

## 6. Quyết định đã chốt

- *Hỏi: Token được lưu trữ ở đâu?*
  → Access token có thể truyền qua Header hoặc Cookie (vòng đời ngắn). Opaque Refresh Token được lưu trong Cookie HttpOnly.
- *Hỏi: Xử lý tài khoản đăng nhập Google như thế nào?*
  → Được lưu trong bảng `users` nhưng không có mật khẩu cục bộ (`password_hash` là null). Hệ thống sẽ có thông báo hướng dẫn khi họ muốn dùng chức năng đổi mật khẩu.
- *Hỏi: Tính năng hiện/ẩn mật khẩu được thực hiện ra sao?*
  → Nằm hoàn toàn ở phía Frontend thông qua toggle icon (bi-eye / bi-eye-slash) nhằm nâng cao UX, không ảnh hưởng đến API Backend.

## 7. Ngoài phạm vi

- Xác thực đa yếu tố (MFA / 2FA) qua SMS hay Authenticator app.
- Tích hợp các nhà cung cấp OAuth khác như Facebook, Apple, Github (hiện tại chỉ giới hạn ở Google).
- Cơ chế quản lý quyền truy cập chi tiết đến từng action (Fine-grained RBAC/ABAC).
