# Kế hoạch Triển khai (Implementation Plan): User Profile

**Nhánh (Branch)**: `feat-auth-and-users` | **Ngày**: 2026-07-24 | **Đặc tả (Spec)**: `feat-profile/spec.md`

**Đầu vào (Input)**: Đặc tả tính năng từ `.sdd/specs/feat-auth-and-users/feat-profile/spec.md`

## Tóm tắt (Summary)

Thiết kế backfill cho tính năng xem/sửa hồ sơ (profile) có xác thực (authenticated), tải lên avatar, cập nhật các trường mục tiêu học tập (learning goal), thu thập mục tiêu trong quá trình onboarding, cài đặt bảo mật (security settings)/đổi mật khẩu, và lịch sử hỗ trợ cá nhân. Việc triển khai sử dụng các `users` profile endpoints hiện có, avatar storage service, auth password endpoint, support queries, và các trang React phục vụ hiển thị profile.

## Bối cảnh Kỹ thuật (Technical Context)

**Ngôn ngữ/Phiên bản (Language/Version)**: Node.js 20+, Express 5.2; React + Vite hiện đang cài đặt React 19.2.6.

**Các thư viện chính (Primary Dependencies)**: `pg`, `multer`, các object storage adapters, Axios, React Router, Bootstrap/react-bootstrap.

**Lưu trữ (Storage)**: Bảng PostgreSQL `users` dành cho hồ sơ (profile) và mục tiêu học tập; phương thức object storage/local upload cho avatar; các bảng support thông qua `support.queries.js`.

**Kiểm thử (Testing)**: Jest cho users service/controller và avatar storage; Vitest cho `UserProfilePage`, onboarding, và profile components.

**Nền tảng đích (Target Platform)**: Workspace về hồ sơ (profile) trên trình duyệt, có REST API backend hỗ trợ.

**Loại Dự án (Project Type)**: Full-stack web application.

**Mục tiêu Hiệu suất (Performance Goals)**: 95% profile loads hoàn thành dưới 3 giây; 95% thay đổi cập nhật hiển thị lên (sau khi refresh) mất dưới 5 giây.

**Ràng buộc (Constraints)**: Bắt buộc xác thực (Auth); `password_hash` và các thông tin bảo mật auth (auth secrets) không bao giờ được trả về; target band score phải nằm trong khoảng 0.0-9.0 với bước nhảy 0.5; kích thước avatar tối đa 5 MB và phải thuộc các định dạng hình ảnh cho phép (allowed image MIME types).

**Quy mô/Phạm vi (Scale/Scope)**: Tính năng quản lý hồ sơ áp dụng cho tất cả các role được xác thực (authenticated roles), với các mục tiêu học tập (learning goals) dành cho student.

## Kiểm tra Hiến pháp (Constitution Check)

- Tech stack: ĐẠT (PASS) cho backend và raw `pg`; CHÚ Ý (WATCH) đối với việc lệch phiên bản React (React version drift).
- API protocol: ĐẠT. Các Users controller luôn trả về standard envelopes.
- Security: ĐẠT. Endpoint `/users/me` và avatar upload sử dụng middleware `authenticate`; user id được truyền từ middleware này.
- Database: ĐẠT CÓ RỦI RO (PASS WITH RISK). Các Profile queries sử dụng parameterized SQL; thao tác chạy DDL lúc thực thi (runtime `ALTER TABLE`) trong `updateProfile` là lỗi hiện hữu (existing drift) và nên được thay thế bằng schema management chỉ sử dụng migration trong phần việc implementation.
- Testing: ĐẠT CÓ RỦI RO (PASS WITH RISK). Các bài test profile hiện tại đã có; các tính năng về upload avatar và support history cần giữ cho phạm vi kiểm thử được bao phủ đầy đủ.

Kiểm tra lại sau thiết kế (Post-design re-check): ĐẠT NHƯNG ĐÃ GHI NHẬN RỦI RO. Không giới thiệu ngoại lệ nào về bảo mật; React drift và runtime DDL vẫn được ghi nhận là các mục cần phải khắc phục (remediation items).

## Cấu trúc Dự án (Project Structure)

```text
backend/
├── src/routes/api/v1/users.routes.js
├── src/controllers/users.controller.js
├── src/services/users.service.js
├── src/services/avatarStorage.service.js
├── src/middleware/uploadImage.middleware.js
├── src/db/queries/users.queries.js
├── src/db/queries/support.queries.js
└── tests/unit/services/users.profile.test.js

frontend/
├── src/pages/student/UserProfilePage.jsx
├── src/pages/student/SecuritySettingsPage.jsx
├── src/pages/student/StudyPlanPage.jsx
├── src/components/profile/ChangePwdModal.jsx
├── src/components/profile/ContactHistoryModal.jsx
└── tests/pages/UserProfilePage.test.jsx
```

**Quyết định Cấu trúc (Structure Decision)**: Đặt tất cả các tác vụ ghi/cập nhật tự phục vụ cho hồ sơ (self-service profile writes) đằng sau endpoint `/api/v1/users/me`; sử dụng lại (reuse) auth change-password endpoint cho tính năng security settings; cấu trúc các trang profile theo vai trò (role-specific profile pages) như là những thành phần hiển thị bọc (thin wrappers) cung cấp dữ liệu chung của người dùng (shared user data).

## Theo dõi Độ phức tạp (Complexity Tracking)

| Vi phạm (Violation) | Lý do Cần thiết (Why Needed) | Giải pháp Đơn giản hơn Bị từ chối Vì (Simpler Alternative Rejected Because) |
|-----------|------------|-------------------------------------|
| Sự lệch phiên bản package React 19 hiện tại so với React 18 trong hiến pháp | Repo đã chứa sẵn React 19.2.6 | Phải được khắc phục rõ ràng hoặc phê duyệt trước khi hoàn tất triển khai (implementation completion). |
| Chạy DDL lúc thực thi (Runtime DDL) trong `users.queries.updateProfile` | Bản vá tương thích đã có sẵn (Existing compatibility patch) | Những thay đổi trong tương lai chỉ được phép sử dụng migrations nhằm bảo toàn các hành vi hoạt động dự đoán được của Database. |
