# Kế hoạch Triển khai (Implementation Plan): Audit Log and Change History

**Nhánh (Branch)**: `feat-auth-and-users` | **Ngày**: 2026-07-24 | **Đặc tả (Spec)**: `feat-audit-log/spec.md`

**Đầu vào (Input)**: Đặc tả tính năng từ `.sdd/specs/feat-auth-and-users/feat-audit-log/spec.md`

## Tóm tắt (Summary)

Thiết kế backfill cho khả năng lưu vết kiểm toán (audit trail) hiện có: các sự kiện auth/admin nhạy cảm được lưu trữ vào PostgreSQL bảng `audit_logs`, được cung cấp ra ngoài thông qua các Express endpoints chỉ dành cho admin, và hiển thị trên các trang admin activity/change-log bằng React với tính năng phân trang (pagination), dán nhãn mức độ nghiêm trọng (severity labeling), hiển thị khác biệt chi tiết (detail diffing), kiểm tra điều kiện undo (undo eligibility), và thực thi undo đối với những thay đổi về role/status của user được hỗ trợ.

## Bối cảnh Kỹ thuật (Technical Context)

**Ngôn ngữ/Phiên bản (Language/Version)**: Node.js 20+, CommonJS backend; React + Vite frontend hiện đang cài đặt React 19.2.6.

**Các thư viện chính (Primary Dependencies)**: Express 5.2, `pg`, `express-validator`, JWT/cookie auth, React Router, Axios, Bootstrap/react-bootstrap.

**Lưu trữ (Storage)**: PostgreSQL 16 qua raw `pg` queries; không dùng ORM. Dữ liệu Audit nằm trong bảng `audit_logs` cùng với phần nối (joined) bảng `users`.

**Kiểm thử (Testing)**: Backend dùng Jest/Supertest; frontend dùng Vitest/Testing Library.

**Nền tảng đích (Target Platform)**: Ứng dụng Web với REST API backend và trình duyệt admin UI.

**Loại Dự án (Project Type)**: Full-stack web application (`backend/` + `frontend/`).

**Mục tiêu Hiệu suất (Performance Goals)**: Các truy vấn lấy danh sách activity/change-log hoàn thành dưới 3 giây đối với khối lượng hoạt động bình thường; số liệu thống kê suspicious và failed-login hiển thị trong vòng 10 giây.

**Ràng buộc (Constraints)**: Chỉ dành cho Admin (Admin-only access); endpoint undo có thay đổi dữ liệu (mutating undo endpoint) yêu cầu middleware auth; sử dụng parameterized SQL; lịch sử audit chỉ ghi thêm (append-only); không chứa bí mật (no secrets) trong API responses.

**Quy mô/Phạm vi (Scale/Scope)**: Các sự kiện audit về Auth/security/admin dành cho người dùng, sessions, các hành động liên quan đến chấm điểm/nội dung (grading/content actions), với các đường dẫn đọc (read paths) phân trang bị giới hạn (capped) bởi các giới hạn query phía backend.

## Kiểm tra Hiến pháp (Constitution Check)

*CỔNG (GATE): Phải vượt qua trước Phase 0 research. Kiểm tra lại sau Phase 1 design.*

- Tech stack: ĐẠT (PASS) cho Node 20, Express 5, PostgreSQL, raw `pg`; CHÚ Ý (WATCH) bởi vì frontend package hiện đang dùng React 19.2.6 trong khi hiến pháp lại ghi React 18.
- Database rules: ĐẠT. `audit.queries.js` sử dụng parameterized SQL và UUID primary keys. Các dòng Audit là dạng ghi thêm (append-only); undo đánh dấu lên các dòng gốc (source rows) thay vì xóa (deletion).
- API protocol: ĐẠT. Các Admin controllers trả về `{ success, data, error, meta }`.
- Security: ĐẠT. Các tuyến `/api/v1/admin/activity-logs`, `/change-logs`, và undo sử dụng `authenticate` + `authorize('admin')`; actor được lấy từ middleware.
- Code quality/testing: ĐẠT CÓ RỦI RO (PASS WITH RISK). Các bài test hiện tại đã bao phủ các khu vực audit service/query, nhưng các tasks triển khai phải giữ các functions mới trong giới hạn kích thước và duy trì 80% độ phủ (coverage).

Kiểm tra lại sau thiết kế (Post-design re-check): ĐẠT NHƯNG ĐÃ GHI NHẬN RỦI RO. Kế hoạch không thêm ORM mới, bí mật (secrets), endpoint thay đổi dữ liệu không được bảo vệ (unguarded mutating endpoint), hoặc xóa cứng (hard delete). Sự lệch phiên bản React vẫn là một vấn đề cần khắc phục ở cấp độ dự án.

## Cấu trúc Dự án (Project Structure)

### Tài liệu (tính năng này - Documentation)

```text
.sdd/specs/feat-auth-and-users/feat-audit-log/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-contract.md
└── spec.md
```

### Mã nguồn (thư mục gốc repo - Source Code)

```text
backend/
├── src/controllers/admin.controller.js
├── src/services/audit.service.js
├── src/db/queries/audit.queries.js
├── src/db/migrations/006_create_audit_logs.sql
├── src/db/migrations/011_patch_audit_logs_undo.sql
├── src/db/migrations/012_backfill_audit_logs_can_undo.sql
├── src/db/migrations/017_add_security_log_actions.sql
└── tests/

frontend/
├── src/pages/admin/AdminActivityLogPage.jsx
├── src/pages/admin/AdminChangeLogPage.jsx
├── src/services/adminStats.service.js
├── src/services/adminOps.service.js
└── tests/
```

**Quyết định Cấu trúc (Structure Decision)**: Sử dụng cấu trúc full-stack hiện có. Backend sở hữu (owns) việc lưu trữ (persistence), bảo mật (security), định dạng (formatting), và undo transactions; frontend sở hữu phần hiển thị admin, bộ lọc (filters), modal chi tiết, và hành vi cập nhật làm mới lạc quan (optimistic refresh behavior).

## Theo dõi Độ phức tạp (Complexity Tracking)

| Vi phạm (Violation) | Lý do Cần thiết (Why Needed) | Giải pháp Đơn giản hơn Bị từ chối Vì (Simpler Alternative Rejected Because) |
|-----------|------------|-------------------------------------|
| Sự lệch phiên bản package React 19 hiện tại so với React 18 trong hiến pháp | Repo đã chứa sẵn React 19.2.6 | Sự sai lệch âm thầm (Silent mismatch) sẽ che giấu một vấn đề về quản trị (governance issue); việc triển khai nên điều chỉnh lại dependency hoặc sửa đổi hiến pháp. |
