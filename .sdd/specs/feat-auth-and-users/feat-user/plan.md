# Kế hoạch Triển khai (Implementation Plan): User Administration and Authorization

**Nhánh (Branch)**: `feat-auth-and-users` | **Ngày**: 2026-07-24 | **Đặc tả (Spec)**: `feat-user/spec.md`

**Đầu vào (Input)**: Đặc tả tính năng từ `.sdd/specs/feat-auth-and-users/feat-user/spec.md`

## Tóm tắt (Summary)

Thiết kế backfill cho các chức năng bảo vệ theo vai trò (role guards), xem danh sách/tìm kiếm/lọc/phân trang người dùng cho admin, thay đổi role/status đi kèm tính năng tự bảo vệ không đổi của chính mình (self-protection), xem danh sách/thu hồi session, và ghi nhận nhật ký kiểm toán (audit trail). Việc triển khai tận dụng các admin routes hiện có, middleware authorize, các services users/sessions, các truy vấn PostgreSQL, và trang React dành cho admin.

## Bối cảnh Kỹ thuật (Technical Context)

**Ngôn ngữ/Phiên bản (Language/Version)**: Node.js 20+, Express 5.2; React + Vite hiện đang cài đặt React 19.2.6.

**Các thư viện chính (Primary Dependencies)**: `pg`, xác thực qua JWT/cookie, Express middleware, Axios, React Router, Bootstrap/react-bootstrap.

**Lưu trữ (Storage)**: Các bảng PostgreSQL `users`, `user_sessions`, view `v_active_sessions`, bảng `audit_logs`.

**Kiểm thử (Testing)**: Jest cho users/sessions/admin controller; Vitest cho ProtectedRoute/AdminUsersPage/SessionsPage.

**Nền tảng đích (Target Platform)**: Giao diện Admin (Admin browser UI) được hỗ trợ bởi REST API.

**Loại Dự án (Project Type)**: Full-stack web application.

**Mục tiêu Hiệu suất (Performance Goals)**: 95% thao tác tìm kiếm/lọc người dùng phản hồi dưới 3 giây; admin có thể thu hồi (revoke) một session trong vòng 10 giây.

**Ràng buộc (Constraints)**: Các route chỉ dành cho admin; id/role của người thao tác (actor) lấy từ auth middleware; admin không thể thay đổi role/status của chính mình; thay đổi status/role sẽ thu hồi các phiên đăng nhập (sessions) của mục tiêu; hành động được ghi lại vào nhật ký kiểm toán (audit trail).

**Quy mô/Phạm vi (Scale/Scope)**: Các roles gồm student/tutor/admin và các status tài khoản gồm pending/active/inactive/banned.

## Kiểm tra Hiến pháp (Constitution Check)

- Tech stack: ĐẠT (PASS) cho backend/Postgres/raw `pg`; CHÚ Ý (WATCH) đối với việc lệch phiên bản React (React version drift).
- API protocol: ĐẠT. Các Admin controller luôn trả về standard envelopes.
- Security: ĐẠT. Các Admin routes sử dụng `authenticate` và `authorize('admin')`; các endpoints cập nhật dữ liệu (mutating) không bao giờ nhận định danh người thực hiện (actor) từ body/query.
- Database: ĐẠT. Các queries user/session được tham số hóa (parameterized); thao tác thu hồi session cập nhật `revoked_at` thay vì xóa dữ liệu (deleting).
- Testing: ĐẠT CÓ RỦI RO (PASS WITH RISK). Các bài test hiện tại cho user/session đã có; cần đảm bảo vẫn có đủ độ bao phủ (covered) đối với role guard và tính năng tự bảo vệ (self-protection paths).

Kiểm tra lại sau thiết kế (Post-design re-check): ĐẠT NHƯNG ĐÃ GHI NHẬN RỦI RO. Không giới thiệu thêm endpoint admin thay đổi dữ liệu nào mà không được bảo vệ (unguarded), và không sử dụng thao tác xóa cứng (hard delete).

## Cấu trúc Dự án (Project Structure)

```text
backend/
├── src/middleware/authenticate.js
├── src/middleware/authorize.js
├── src/routes/api/v1/admin.routes.js
├── src/controllers/admin.controller.js
├── src/services/users.service.js
├── src/services/sessions.service.js
├── src/db/queries/users.queries.js
├── src/db/queries/sessions.queries.js
└── tests/

frontend/
├── src/components/auth/ProtectedRoute.jsx
├── src/pages/admin/AdminUsersPage.jsx
├── src/components/admin/UserModals.jsx
├── src/pages/admin/SessionsPage.jsx
├── src/services/adminOps.service.js
└── src/App.jsx
```

**Quyết định Cấu trúc (Structure Decision)**: Duy trì việc thi hành (enforcement) cấp quyền ở cả hai tầng: sử dụng route guard ở frontend nhằm tối ưu UX, dùng middleware backend làm nguồn chân lý (source of truth). Logic danh sách người dùng và thay đổi (mutation) của admin tiếp tục được đặt trong admin routes và các services users/session.

## Theo dõi Độ phức tạp (Complexity Tracking)

| Vi phạm (Violation) | Lý do Cần thiết (Why Needed) | Giải pháp Đơn giản hơn Bị từ chối Vì (Simpler Alternative Rejected Because) |
|-----------|------------|-------------------------------------|
| Sự lệch phiên bản package React 19 hiện tại so với React 18 trong hiến pháp | Repo đã chứa sẵn React 19.2.6 | Phải được khắc phục rõ ràng hoặc phê duyệt trước khi hoàn tất triển khai (implementation completion). |
