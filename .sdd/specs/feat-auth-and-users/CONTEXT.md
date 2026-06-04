# CONTEXT.md — Tài khoản & Phân quyền (feat-auth-and-users)
# Người viết: DuongNNH | Ngày: 21/05/2026

## 1. PROBLEM STATEMENT
- Người dùng cần tài khoản cá nhân để lưu trữ tiến độ luyện thi, lịch sử làm bài và nhận kết quả chấm điểm.
- Hệ thống cần phân biệt rõ quyền hạn giữa các đối tượng (Student, Tutor, Admin) để tránh việc học viên truy cập vào giao diện quản lý đề thi hoặc các công cụ chấm bài.
- Bảo mật thông tin đăng nhập và dữ liệu cá nhân là ưu tiên hàng đầu.

## 2. DOMAIN KNOWLEDGE
- **Authentication (Xác thực):** Kiểm tra danh tính thông qua Email/Password trên Node.js server.
- **Authorization (Phân quyền):** Phân chia quyền hạn dựa trên Role (RBAC - Role Based Access Control) lưu trong SQL Server.
- **JWT (JSON Web Token):** Sử dụng để duy trì phiên đăng nhập giữa React (Frontend) và Node.js (Backend).
- **Password Hashing:** Bắt buộc băm mật khẩu bằng Bcrypt trước khi lưu vào SQL Server.

## 3. STAKEHOLDERS
- **Guest:** Người dùng chưa đăng nhập.
- **Student:** Người học, quyền truy cập Dashboard và các tính năng luyện thi.
- **Tutor:** Người dạy, quyền chấm bài và quản lý tài nguyên thư viện.
- **Admin:** Quản trị viên, toàn quyền kiểm soát hệ thống và User.

## 4. CONSTRAINTS
- **Frontend (React):** Tuân thủ cấu trúc Component, sử dụng Axios cho các request API.
- **Backend (Node.js):** Sử dụng Middleware để kiểm tra JWT và quyền hạn Role trước khi truy cập API.
- **Database (SQL Server):** - Các bảng chính: `Users`, `Roles`.
    - Mọi truy vấn phải sử dụng Parameterized Query để chống SQL Injection.
- **Security:** Mật khẩu phải có độ mạnh tối thiểu (8 ký tự, có chữ và số).

## 5. ASSUMPTIONS
- Hệ thống đã có cấu hình SMTP Server để gửi email xác thực.
- Quyền hạn (Role) được định nghĩa cố định trong database, việc thay đổi Role chỉ do Admin thực hiện.

## 6. OPEN QUESTIONS
- Q: Khi tài khoản bị Admin "deactivate" (vô hiệu hóa), làm thế nào để vô hiệu hóa Token của User đó ngay lập tức (Blacklisting tokens)?
- Q: Có cần triển khai cơ chế Refresh Token để tăng trải nghiệm người dùng không, hay chỉ dùng Access Token thời hạn dài?
- Q: Cấu trúc bảng SQL Server cho `Users` cần những trường nào để phục vụ dashboard thống kê của Admin?