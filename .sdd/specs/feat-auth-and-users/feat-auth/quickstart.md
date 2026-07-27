# Khởi động Nhanh (Quickstart): Authentication

## Yêu cầu Cần thiết (Prerequisites)

- PostgreSQL đã được cấu hình và chạy migration.
- Cài đặt `JWT_SECRET`, các biến môi trường (env vars) database, email, và tuỳ chọn `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- `FRONTEND_URL` trỏ tới Vite dev server.

## Chạy (Run)

```powershell
cd backend
npm install
npm run migrate
npm test -- --runTestsByPath backend/tests/unit/services/auth.reg.test.js backend/tests/unit/services/auth.login.test.js backend/tests/unit/services/auth.refresh.test.js backend/tests/unit/services/auth.reset.test.js
npm run dev
```

```powershell
cd frontend
npm install
npm test -- --run tests/components/auth
npm run dev
```

## Các Kịch bản Xác thực (Validation Scenarios)

1. Đăng ký với tên/email/mật khẩu hợp lệ.
   Kết quả mong đợi: tài khoản ở trạng thái pending, token xác thực (verification token) được tạo, phản hồi thành công chung chung.

2. Xác thực email bằng một token hợp lệ chưa sử dụng.
   Kết quả mong đợi: tài khoản chuyển thành `active`; token được đánh dấu là đã dùng.

3. Đăng nhập với vai trò active student/tutor/admin.
   Kết quả mong đợi: tạo một dòng session, cookie được thiết lập, frontend điều hướng tới workspace phù hợp với vai trò.

4. Đăng nhập liên tục với thông tin sai.
   Kết quả mong đợi: lỗi chung chung, số lần thử sai được theo dõi, khóa tạm thời (temporary lock) khi đạt ngưỡng chính sách.

5. Mở một tuyến (route) được bảo vệ trong khi chưa xác thực.
   Kết quả mong đợi: frontend điều hướng (redirects) về `/login`.

6. Làm mới (Refresh) một session đã xác thực.
   Kết quả mong đợi: `/auth/refresh-token` cấp một JWT access/refresh tokens mới chỉ khi session vẫn đang hoạt động (active).

7. Đăng xuất.
   Kết quả mong đợi: session hiện tại bị thu hồi (revoked) và trạng thái auth trên frontend bị xóa.

8. Quên/Đặt lại mật khẩu.
   Kết quả mong đợi: phản hồi quên mật khẩu không làm lộ việc tài khoản có tồn tại hay không; việc đặt lại thành công một lần với token hợp lệ chưa dùng và từ chối các token đã dùng/hết hạn.

9. Trả về (Callback) khi đăng nhập Google.
   Kết quả mong đợi: người dùng cục bộ được tạo hoặc cập nhật, OAuth session được tạo, và người dùng được điều hướng trở lại frontend.
