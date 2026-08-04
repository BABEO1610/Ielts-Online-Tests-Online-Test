# Comprehensive Checklist: User Administration and Authorization

**Purpose**: Kiểm tra chất lượng yêu cầu (Requirements Quality Validation) cho tính năng Quản trị và Phân quyền Người dùng — bao gồm Role Guards, User List/Search/Filter, Role/Status Mutation, và Session Management.
**Created**: 2026-08-03
**Feature**: [spec.md](../spec.md)
**Depth**: Standard (PR review)
**Scope**: Role Guards + User List + Role/Status Mutation + Session Management

---

## Requirement Completeness

- [x] CHK001 Đặc tả có liệt kê đầy đủ tất cả roles được hỗ trợ (`student`, `tutor`, `admin`) và tất cả statuses (`pending`, `active`, `inactive`, `banned`) không? [Completeness, Spec §Giả định]
- [x] CHK002 Đặc tả có liệt kê đầy đủ các trường hiển thị trong danh sách người dùng (`full_name`, `email`, `role`, `status`, `created_at`) không? [Completeness, Spec §FR-006]
- [x] CHK003 Đặc tả có liệt kê đầy đủ các trường hiển thị trong danh sách session (`user`/`full_name`, `email`, `device`, `ip_address`, `is_oauth`/`oauth_provider`, `last_active_at`, `expires_at`) không? [Completeness, Spec §FR-012]
- [x] CHK004 Đặc tả có xác định rằng admin controller sử dụng Dependency Injection pattern (factory function) không? Production dùng `adminControllerFactory(usersService, AppError, sessionsService, ...)`. [Completeness, Gap, Production]
- [x] CHK005 Đặc tả có yêu cầu rằng `password_hash` phải được loại bỏ khỏi tất cả response user list không? Production `listUsers` dùng `{ password_hash, ...safeUser }` destructuring. [Completeness, Spec §FR-006, Production]
- [x] CHK006 Đặc tả có ghi nhận rằng DB enum `user_role` chứa giá trị `user` (legacy/unused) ngoài 3 roles chính (`student`, `tutor`, `admin`) mà service layer thực sự sử dụng không? [Completeness, Production `001_create_enums.sql`]

## Requirement Clarity

- [x] CHK007 FR-001 nói "kiểm soát truy cập dựa trên vai trò" — đặc tả có phân biệt rõ giữa backend enforcement (middleware `authorize`) và frontend enforcement (ProtectedRoute UX) không? [Clarity, Spec §FR-001, Plan §Structure Decision]
- [x] CHK008 FR-010 nói "chấm dứt các phiên đang kích hoạt khi vai trò thay đổi" — đặc tả có mô tả cơ chế kỹ thuật (`revokeAllSessionsForUser` sets `revoked_at = NOW()`) không? [Clarity, Spec §FR-010]
- [x] CHK009 FR-016 nói "tự động thu hồi (unassign) các bài kiểm tra chưa chấm" — đặc tả có mô tả rõ cơ chế thực hiện (gọi service nào, table nào bị ảnh hưởng) không? [Clarity, Spec §FR-016]
- [x] CHK010 Cụm từ "lỗi quyền truy cập rõ ràng" (FR-015) có xác định cụ thể HTTP status code (403) và error code (`AUTH_PERM_001`) không? [Clarity, Spec §FR-015]
- [x] CHK011 Đặc tả có phân biệt rõ giữa "session revocation do admin chủ động" (FR-013) và "session revocation tự động do thay đổi role/status" (FR-010, FR-011) không? [Clarity, Spec §FR-010/011/013]

## Requirement Consistency

- [x] CHK012 Spec §Giả định liệt kê 3 roles (`student`, `tutor`, `admin`) — đây là đúng với service layer. DB enum có thêm `user` (legacy/unused). Đặc tả có ghi nhận sự khác biệt này để tránh nhầm lẫn không? [Consistency, Spec §Giả định vs Production]
- [x] CHK013 Self-protection check xuất hiện ở cả controller (L74, L107) và service (`changeUserRole` L121, `changeUserStatus` L166). Đặc tả có xác định rõ tầng nào là source-of-truth cho self-protection logic không? [Consistency, Production dual-check]
- [x] CHK014 Plan nói React 19.2.6 đang chạy nhưng Constitution yêu cầu React 18. Đặc tả có quyết định rõ ràng xử lý sự lệch này không? [Consistency, Plan §Constitution Check]
- [x] CHK015 Spec nói "admin quản lý người dùng khác nhưng không trực tiếp tạo người dùng" — đặc tả có xác định rõ ranh giới giữa feat-user và feat-auth (tạo tài khoản thuộc auth) không? [Consistency, Spec §Giả định]

## Acceptance Criteria Quality

- [x] CHK016 SC-002 ("tìm thấy user trong dưới 30 giây") — đo từ khi admin bắt đầu gõ search hay từ khi submit query? [Measurability, Spec §SC-002]
- [x] CHK017 SC-003 ("95% search/filter dưới 3 giây") đo thời gian API response hay end-to-end bao gồm frontend render? [Measurability, Spec §SC-003]
- [x] CHK018 SC-005 ("100% inactive/banned ngăn truy cập") — đặc tả có xác định cơ chế enforcement (authenticate middleware kiểm tra user status) không? [Measurability, Spec §SC-005]
- [x] CHK019 SC-007 ("thu hồi session trong dưới 10 giây") — đo UX end-to-end (click → confirm → refresh list) hay chỉ API latency? [Measurability, Spec §SC-007]

## Scenario Coverage — Role Guards

- [x] CHK020 Đặc tả có xác định hành vi khi user có role không xác định (ví dụ `user` thay vì `student`) cố truy cập protected area không? [Coverage, Edge Case, Gap]
- [x] CHK021 Đặc tả có xác định rằng authorize middleware hỗ trợ array of roles (ví dụ `authorize(['admin', 'tutor'])`) cho các route dùng chung không? Production: `const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]`. [Coverage, Gap, Production]
- [x] CHK022 Đặc tả có xác định rằng authenticate middleware cũng kiểm tra user status (active/inactive/banned) ngoài session validity không? [Coverage, Spec §Edge Cases]

## Scenario Coverage — User List/Search/Filter

- [x] CHK023 Đặc tả có xác định default pagination params (`page = 1`, `limit = 10`) không? Production controller dùng defaults này. [Completeness, Gap, Production]
- [x] CHK024 Đặc tả có xác định rằng search dùng `ILIKE` (case-insensitive) trên cả `full_name` và `email` không? Production: `WHERE full_name ILIKE $N OR email ILIKE $N`. [Completeness, Gap, Production]
- [x] CHK025 Đặc tả có xác định rằng response meta phải bao gồm `{ page, limit, total }` để frontend render pagination không? [Completeness, Spec §FR-003]
- [x] CHK026 Đặc tả có xác định hành vi khi admin request page vượt quá tổng số trang — trả mảng rỗng hay lỗi? [Coverage, Edge Case, Gap]

## Scenario Coverage — Role/Status Mutation

- [x] CHK027 Đặc tả có xác định danh sách role hợp lệ mà admin có thể gán không (chỉ `student`/`tutor`/`admin`, hay bao gồm cả `user`)? [Completeness, Gap]
- [x] CHK028 Đặc tả có xác định danh sách status hợp lệ mà admin có thể gán không (chỉ `active`/`inactive`/`banned`, hay bao gồm cả `pending`)? [Completeness, Gap]
- [x] CHK029 Đặc tả có xác định rằng thay đổi role/status PHẢI ghi audit log với `old_data` và `new_data` không? Production `changeUserRole` ghi `{ role: oldUser.role }` → `{ role: updatedUser.role }`. [Completeness, Spec §FR-014, Production]
- [x] CHK030 Đặc tả có xác định hành vi khi admin cố gán cùng role/status hiện tại cho user (no-op hay vẫn update/log)? [Coverage, Edge Case, Gap]
- [x] CHK031 Đặc tả có xác định rằng role change endpoint sử dụng PUT `/admin/users/:id/role` (không phải PATCH) không? [Completeness, Gap, Production]

## Scenario Coverage — Session Management

- [x] CHK032 Đặc tả có xác định rằng admin list sessions đọc từ view `v_active_sessions` (JOIN users) thay vì table trực tiếp không? [Completeness, Gap, Production]
- [x] CHK033 Đặc tả có xác định rằng session revoke sử dụng `revoked_at = NOW()` (soft-delete) thay vì DELETE (hard-delete) không? [Completeness, Plan §Notes, Production]
- [x] CHK034 Đặc tả có xác định rằng session revoke endpoint là DELETE `/admin/sessions/:id` (RESTful convention) không? [Completeness, Gap, Production]
- [x] CHK035 Đặc tả có xác định rằng `revokeSessionById` trả 404 khi session không tồn tại hoặc đã bị revoke trước đó không? Production: error code `SES_ADM_001`. [Completeness, Spec §Edge Cases, Production]
- [x] CHK036 Đặc tả có xác định rằng session revocation bởi admin cũng ghi audit log không? Production ghi action `logout` vào `audit_logs`. [Completeness, Spec §FR-014, Production]
- [x] CHK037 Đặc tả có xác định rằng device info trong session list được parse từ `user_agent` text (ví dụ "Chrome · Windows") không? Production `parseDevice()`. [Completeness, Gap, Production]

## Non-Functional Requirements — Security

- [x] CHK038 Đặc tả có yêu cầu rõ ràng rằng MỌI admin route phải qua CÙNG LÚC cả `authenticate` VÀ `authorize('admin')` middleware không? [Security, Plan §Constitution Check]
- [x] CHK039 Đặc tả có yêu cầu rằng actor ID (admin thực hiện) LUÔN lấy từ `req.user.id` (auth middleware) và KHÔNG BAO GIỜ từ request body/params không? [Security, Plan §Constraints]
- [x] CHK040 Đặc tả có yêu cầu rằng tất cả SQL queries trong admin module phải sử dụng parameterized queries ($1, $2) không? [Security, Plan §Constitution Check]
- [x] CHK041 Đặc tả có yêu cầu rằng `password_hash` không được lộ trong admin user list response không? [Security, Gap]
- [x] CHK042 Đặc tả có ghi nhận rằng `session_token` xuất hiện trong `revokeSessionById` RETURNING nhưng không gây rủi ro bảo mật vì token đã bị revoke (không còn giá trị sử dụng) không? [Security, Accepted Risk]

## Non-Functional Requirements — Data Integrity

- [x] CHK043 Đặc tả có yêu cầu rằng thay đổi role/status phải kiểm tra user tồn tại trước khi update không? Production: `findUserById(targetId)` trước khi update. [Data Integrity, Gap]
- [x] CHK044 Đặc tả có xác định rằng `AuditLogService.logAction` ghi nhận `old_data`/`new_data` cho role/status changes (param cuối cùng là boolean cho scope visibility, không phải `is_sensitive` column) không? [Data Integrity, Production]

## Non-Functional Requirements — API Contract

- [x] CHK045 Đặc tả có xác định rõ ràng rằng tất cả admin API responses tuân theo format `{ success, data, error, meta }` không? [API Contract, Plan §Constitution Check]
- [x] CHK046 Đặc tả có xác định HTTP status codes cụ thể cho admin endpoints không (200 success, 403 self-protection/permission denied, 404 user/session not found)? [API Contract, Gap]
- [x] CHK047 Đặc tả có xác định rằng list endpoints trả meta `{ page, limit, total }` (users) hoặc `{ total }` (sessions) không? [API Contract, Gap, Production]

## Dependencies & Assumptions

- [x] CHK048 Đặc tả có xác định dependency rõ ràng với feat-auth (authenticate middleware, session schema) không? [Dependency, Gap]
- [x] CHK049 Đặc tả có xác định dependency rõ ràng với feat-audit-log (AuditLogService.logAction) cho việc ghi log không? [Dependency, Spec §FR-014, Spec §Giả định]
- [x] CHK050 Đặc tả có xác định dependency với bảng/logic tutor assignment cho FR-016 (unassign bài chấm khi Tutor bị giáng quyền) không? [Dependency, Spec §FR-016, Gap]
- [x] CHK051 Giả định "admin không trực tiếp tạo người dùng" có được tham chiếu tới đặc tả feat-auth cụ thể không? [Assumption, Spec §Giả định]

---

## Notes

- Đánh dấu hoàn thành: `[x]`
- Thêm comments hoặc findings inline khi cần
- Items marked `[Gap]` indicate missing requirements cần được address
- Items marked `[Ambiguity]` hoặc `[Conflict]` cần clarification trước khi implementation
- Items marked `[Tech Debt]` là existing issues cần được track và resolve

## References

- [spec.md](../spec.md) — Feature specification
- [plan.md](../plan.md) — Technical implementation plan
- [tasks.md](../tasks.md) — Detailed task breakdown

## Summary Statistics

- **Total Checklist Items**: 51
- **Requirement Completeness**: 6 items
- **Requirement Clarity**: 5 items
- **Requirement Consistency**: 4 items
- **Acceptance Criteria Quality**: 4 items
- **Scenario Coverage — Role Guards**: 3 items
- **Scenario Coverage — User List**: 4 items
- **Scenario Coverage — Role/Status Mutation**: 5 items
- **Scenario Coverage — Session Management**: 6 items
- **Security**: 5 items
- **Data Integrity**: 2 items
- **API Contract**: 3 items
- **Dependencies & Assumptions**: 4 items
