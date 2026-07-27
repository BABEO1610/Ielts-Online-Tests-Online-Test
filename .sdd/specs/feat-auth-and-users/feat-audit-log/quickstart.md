# Khởi động Nhanh (Quickstart): Audit Log and Change History

## Yêu cầu Cần thiết (Prerequisites)

- Kết nối PostgreSQL đã được cấu hình trong `backend/.env` hoặc `.env` ở thư mục gốc (root).
- Các migrations đã được áp dụng (applied) thông qua `npm run migrate` trong `backend/`.
- Ít nhất một tài khoản admin đang hoạt động (active admin account).
- Frontend `VITE_API_URL` trỏ tới URL gốc của backend, thường là `http://localhost:3000/api/v1`.

## Chạy (Run)

```powershell
cd backend
npm install
npm run migrate
npm test -- --runTestsByPath backend/tests/services/audit.service.test.js backend/tests/db/queries/audit.queries.test.js
npm run dev
```

```powershell
cd frontend
npm install
npm test -- --run
npm run dev
```

## Các Kịch bản Xác thực (Validation Scenarios)

1. Đăng nhập với tư cách admin và mở `/admin/activity`.
   Kết quả mong đợi: bảng hiển thị thời gian, actor, action, target, IP, severity, và ghi chú từ `/api/v1/admin/audit-logs`.

2. Kích hoạt một lần đăng nhập thất bại.
   Kết quả mong đợi: một dòng audit với `action = login_failed` xuất hiện và được đánh dấu là suspicious.

3. Với tư cách admin, thay đổi vai trò (role) hoặc trạng thái của một người dùng khác từ `/admin/users`.
   Kết quả mong đợi: `/admin/change-log` liệt kê một dòng có chứa các giá trị cũ/mới (old/new values) và số lượng tóm tắt (summary counts).

4. Mở chi tiết của một change-log.
   Kết quả mong đợi: modal hiển thị các giá trị trước/sau (before/after values) ở cấp độ trường (field-level).

5. Hoàn tác (Undo) một thay đổi role/status của user được hỗ trợ.
   Kết quả mong đợi: source log chuyển thành undone, user mục tiêu (target user) trở về giá trị cũ, và một dòng `change_reverted` mới được tạo ra.

6. Cố gắng hoàn tác một thay đổi không được hỗ trợ, đã bị hoàn tác trước đó, đã cũ (stale), hoặc tự nhắm vào chính mình (self-targeting).
   Kết quả mong đợi: API trả về lỗi rõ ràng và dữ liệu mục tiêu (target data) không bị thay đổi.
