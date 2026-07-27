# Khởi động Nhanh (Quickstart): User Administration and Authorization

## Yêu cầu Cần thiết (Prerequisites)

- PostgreSQL database đã chạy migration.
- Các tài khoản admin, tutor, và student đang hoạt động (active).
- Backend và frontend đã được cấu hình với cookie credentials.

## Chạy (Run)

```powershell
cd backend
npm test -- --runTestsByPath backend/tests/unit/controllers/users.controller.test.js backend/tests/unit/db/queries/users.queries.test.js backend/tests/unit/db/queries/sessions.queries.test.js
npm run dev
```

```powershell
cd frontend
npm test -- --run tests/components/auth/ProtectedRoute.test.jsx
npm run dev
```

## Các Kịch bản Xác thực (Validation Scenarios)

1. Đăng nhập bằng tài khoản student và mở `/admin`.
   Kết quả mong đợi: frontend điều hướng đi chỗ khác (redirects away); việc gọi trực tiếp `/api/v1/admin/users` trả về lỗi không có quyền (authorization error).

2. Đăng nhập bằng tài khoản tutor và mở không gian làm việc của tutor (tutor workspace).
   Kết quả mong đợi: tuyến đường (route) hiển thị bình thường cho tutor; các tuyến đường chỉ dành cho admin (admin-only routes) vẫn bị chặn.

3. Đăng nhập bằng tài khoản admin và mở `/admin/users`.
   Kết quả mong đợi: bảng có phân trang tải danh sách người dùng kèm theo tên, email, role, status, và ngày tạo.

4. Tìm kiếm bằng email/tên và lọc bằng role/status.
   Kết quả mong đợi: backend trả về đúng trang kết quả và tổng số meta; kết quả rỗng sẽ hiển thị trạng thái rỗng (empty state).

5. Thay đổi role của người dùng khác.
   Kết quả mong đợi: role được lưu lại, các phiên đang hoạt động của người dùng đó (target active sessions) bị thu hồi, tạo ra dòng log audit.

6. Thay đổi status của người dùng khác thành `inactive` hoặc `banned`.
   Kết quả mong đợi: status được lưu lại, các phiên đang hoạt động của người dùng đó bị thu hồi, tạo ra dòng log audit.

7. Cố gắng thay đổi role/status của chính mình bằng tài khoản admin.
   Kết quả mong đợi: API từ chối và UI hiển thị lỗi.

8. Mở `/admin/sessions`, sử dụng bộ lọc/tìm kiếm tại phía giao diện, và thu hồi (revoke) một session.
   Kết quả mong đợi: session biến mất khỏi danh sách và không thể refresh/xác thực lại được nữa.
