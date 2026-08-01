# Kế hoạch Triển khai (Implementation Plan): Authentication

**Nhánh (Branch)**: `feat-auth-and-users` | **Ngày**: 2026-07-24 | **Đặc tả (Spec)**: `feat-auth/spec.md`

**Đầu vào (Input)**: Đặc tả tính năng từ `.sdd/specs/feat-auth-and-users/feat-auth/spec.md`

## Tóm tắt (Summary)

Thiết kế backfill cho đăng ký, xác thực email, đăng nhập/đăng xuất, xử lý refresh token, khôi phục/đổi mật khẩu, điều hướng dựa trên vai trò (role-aware redirects), giới hạn session, khóa khi đăng nhập sai (failed-login lockout), và Google OAuth bằng cách sử dụng auth service Express hiện tại, các bảng PostgreSQL, JWT cookies, và các trang/context xác thực của React. Bao gồm tính năng bật/tắt hiển thị mật khẩu (password visibility toggle) có thể tái sử dụng để cải thiện UX trên frontend.

## Bối cảnh Kỹ thuật (Technical Context)

**Ngôn ngữ/Phiên bản (Language/Version)**: Node.js 20+, Express 5.2 backend; React + Vite frontend hiện đang cài đặt React 19.2.6.

**Các thư viện chính (Primary Dependencies)**: `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-rate-limit`, `express-validator`, `nodemailer`, `ioredis` (session revocation cache), `pg`, Axios, React Router.

**Lưu trữ (Storage)**: PostgreSQL 16 qua `pg`; `users`, `user_sessions`, `email_verification_tokens`, `password_reset_tokens`, `password_history`, `oauth_accounts`, `audit_logs`.

**Kiểm thử (Testing)**: Unit tests Jest cho auth service/controller/util/query; Component tests Vitest cho auth forms/context.

**Nền tảng đích (Target Platform)**: Ứng dụng trình duyệt (Browser app) và REST API.

**Loại Dự án (Project Type)**: Full-stack web application.

**Mục tiêu Hiệu suất (Performance Goals)**: 95% số lần đăng ký hợp lệ phản hồi trong vòng 5 giây; 95% số lần đăng nhập hợp lệ điều hướng (redirect) trong vòng 3 giây.

**Ràng buộc (Constraints)**: Không được phép dò tìm tài khoản (account enumeration); tối đa 3 sessions hoạt động; reset tokens chỉ dùng một lần và có thời hạn; lịch sử mật khẩu ngăn chặn sử dụng lại 3 mật khẩu gần nhất; các mã bí mật (secrets) chỉ lưu trong env; không bao giờ trả về mật khẩu/tokens dạng raw.

**Quy mô/Phạm vi (Scale/Scope)**: Xác thực bằng Email/mật khẩu và Google cho các roles: student, tutor, admin.

## Kiểm tra Hiến pháp (Constitution Check)

- Tech stack: ĐẠT (PASS) cho Node/Express/Postgres/raw `pg`; CHÚ Ý (WATCH) với React 19.2.6 so với React 18 trong hiến pháp.
- API protocol: ĐẠT. Auth controller bọc các phản hồi trong một envelope chuẩn.
- Security: ĐẠT. Các endpoint yêu cầu xác thực (mutating endpoints) sử dụng middleware; định danh (identity) lấy từ `req.user`; cookies được dùng cho session tokens.
- Database: ĐẠT. Bảng dùng UUID, các parameterized queries, không dùng ORM.
- Testing: ĐẠT CÓ RỦI RO (PASS WITH RISK). Các auth unit tests hiện tại đã có; bất kỳ implementation mới nào cũng phải duy trì 80% độ phủ (coverage) và bổ sung endpoint error cases.

Kiểm tra lại sau thiết kế (Post-design re-check): ĐẠT NHƯNG ĐÃ GHI NHẬN RỦI RO. Kế hoạch không đưa thêm ngoại lệ nào về dependency hay protocol; sự lệch phiên bản React vẫn chưa được giải quyết ở cấp độ dự án.

## Cấu trúc Dự án (Project Structure)

```text
backend/
├── src/routes/api/v1/auth.routes.js
├── src/controllers/auth.controller.js
├── src/services/auth.service.js
├── src/db/queries/users.queries.js
├── src/db/queries/sessions.queries.js
├── src/db/queries/tokens.queries.js
├── src/db/queries/pwd.queries.js
├── src/utils/password.util.js
├── src/utils/token.util.js
└── tests/unit/services/auth.*.test.js

frontend/
├── src/context/AuthContext.jsx
├── src/hooks/usePasswordToggle.js
├── src/components/auth/
├── src/pages/auth/
├── src/components/auth/ProtectedRoute.jsx
└── tests/components/auth/
```

**Quyết định Cấu trúc (Structure Decision)**: Giữ phần điều phối (orchestration) auth trong `auth.service.js`; controllers xử lý validation, cookies, và envelopes; frontend dùng `AuthContext` và `ProtectedRoute` cho state và navigation.

## Theo dõi Độ phức tạp (Complexity Tracking)

| Vi phạm (Violation) | Lý do Cần thiết (Why Needed) | Giải pháp Đơn giản hơn Bị từ chối Vì (Simpler Alternative Rejected Because) |
|-----------|------------|-------------------------------------|
| Sự lệch phiên bản package React 19 hiện tại so với React 18 trong hiến pháp | Repo đã chứa sẵn React 19.2.6 | Phải được khắc phục rõ ràng hoặc phê duyệt trước khi hoàn tất triển khai (implementation completion). |
