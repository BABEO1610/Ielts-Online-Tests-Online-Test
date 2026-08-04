# Comprehensive Checklist: User Profile

**Purpose**: Kiểm tra chất lượng yêu cầu (Requirements Quality Validation) cho tính năng Hồ sơ Người dùng — bao gồm Profile View/Edit, Avatar Upload, Security Settings, Support History, và Onboarding.
**Created**: 2026-08-03
**Feature**: [spec.md](../spec.md)
**Depth**: Standard (PR review)
**Scope**: Profile View/Edit + Avatar Upload + Security + Support History + Onboarding

---

## Requirement Completeness

- [x] CHK001 Đặc tả có liệt kê đầy đủ tất cả các trường hiển thị trên trang hồ sơ không (`full_name`, `email`, `role`, `status`, `avatar_url`, `target_band_score`, `target_test_date`, `created_at`, `updated_at`, `has_password`)? [Completeness, Spec §FR-001]
- [x] CHK002 Đặc tả có xác định rõ ràng rằng `email` là danh tính tài khoản và KHÔNG thể chỉnh sửa trên trang hồ sơ không? [Completeness, Spec §Giả định]
- [x] CHK003 Đặc tả có xác định cụ thể giới hạn kích thước avatar upload (5MB) và các định dạng được chấp nhận (JPG, PNG, WebP, GIF) không? [Completeness, Spec §FR-005]
- [x] CHK004 Đặc tả có liệt kê cụ thể dải điểm IELTS mục tiêu hợp lệ (0.0–9.0, bước nhảy 0.5) không? [Completeness, Spec §FR-007]
- [x] CHK005 Đặc tả có yêu cầu trường `has_password` trong dữ liệu profile trả về để frontend phân biệt tài khoản local vs Google-only không? [Gap, Production `users.service.js` L25]
- [x] CHK006 Đặc tả có định nghĩa avatar placeholder/fallback khi người dùng chưa có ảnh đại diện không? [Completeness, Spec §Kịch bản 1.2]
- [x] CHK007 Đặc tả có yêu cầu xác thực (validation) `full_name` khi cập nhật — ví dụ: không được rỗng, độ dài tối đa (DB cho phép 100 ký tự) không? [Gap, Production `002_create_users.sql`]

## Requirement Clarity

- [x] CHK008 Thuật ngữ "hình ảnh được hỗ trợ" (Spec §Kịch bản 3) có được định nghĩa cụ thể bằng danh sách MIME types (image/jpeg, image/png, image/webp, image/gif) không? [Clarity, Spec §FR-005]
- [x] CHK009 Yêu cầu "nhắc người dùng lưu thay đổi hồ sơ" sau khi upload avatar (Spec §Kịch bản 3.1) có mô tả rõ luồng 2 bước không (upload → nhận URL → PATCH /me riêng biệt)? [Clarity, Spec §Kịch bản 3]
- [x] CHK010 Yêu cầu "làm mới dữ liệu hồ sơ hiển thị sau khi lưu thành công" (FR-009) có xác định cơ chế kỹ thuật không (gọi lại AuthContext.refreshUser vs re-fetch GET /me)? [Clarity, Spec §FR-009]
- [x] CHK011 Cụm từ "phương pháp tạo mật khẩu thay thế" cho Google-only users (FR-013) có tham chiếu cụ thể đến luồng forgot-password không? [Clarity, Spec §FR-013]
- [x] CHK012 SC-005 ("cập nhật tên, ảnh, điểm mục tiêu và ngày thi trong dưới 2 phút") đo thời gian UX end-to-end (bao gồm upload avatar) hay chỉ form submission? [Clarity, Spec §SC-005]

## Requirement Consistency

- [x] CHK013 FR-005 nói "5MB" và "JPG/PNG/WebP/GIF" nhưng Plan §Constraints cũng nói "5MB" và "JPG, PNG, WebP, GIF". Hai mô tả này đã nhất quán chưa? [Consistency, Spec §FR-005 vs Plan §Constraints]
- [x] CHK014 Production `updateProfile` dùng `COALESCE` nghĩa là nếu truyền `null` thì giữ giá trị cũ, nhưng spec nói "xóa ngày thi mục tiêu" (FR-006). Đặc tả có định nghĩa cách gửi giá trị "xóa" (null explicitly) khác với "không thay đổi" (omit field) không? [Consistency, Spec §FR-006 vs Production]
- [x] CHK015 Spec nói "quản lý hồ sơ áp dụng cho mọi vai trò" nhưng "mục tiêu học tập dành cho student" (Plan §Scale). Đặc tả có phân biệt rõ ràng trường nào áp dụng cho role nào không? [Consistency, Spec §Giả định vs Plan §Scale]
- [x] CHK016 Plan nói React 19.2.6 đang chạy nhưng Constitution yêu cầu React 18. Đặc tả có quyết định rõ ràng xử lý sự lệch này chưa? [Consistency, Plan §Constitution Check]
- [x] CHK017 Production `users.queries.js` L77 vẫn chạy runtime DDL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) nhưng Plan ghi nhận đây là "existing drift" cần thay bằng migration-only. Đặc tả có yêu cầu rõ ràng remediation cho tech debt này không? [Consistency, Plan §Complexity Tracking, Tech Debt]

## Acceptance Criteria Quality

- [x] CHK018 SC-001 ("95% profile loads trong dưới 3 giây") đo thời gian API response hay end-to-end bao gồm cả rendering frontend? [Measurability, Spec §SC-001]
- [x] CHK019 SC-002 ("95% cập nhật phản ánh sau refresh trong dưới 5 giây") — "refresh" nghĩa là full page reload hay chỉ re-fetch từ AuthContext? [Measurability, Spec §SC-002]
- [x] CHK020 SC-004 ("100% upload vượt kích thước bị từ chối kèm thông báo rõ ràng") có định nghĩa "thông báo rõ ràng" cụ thể nội dung gì không? Production trả về "File too large (Max 5MB)." [Measurability, Spec §SC-004]
- [x] CHK021 SC-006 ("100% nỗ lực đổi mật khẩu không khớp bị chặn") có tính cả client-side validation (ChangePwdModal) hay chỉ tính server-side? [Measurability, Spec §SC-006]
- [x] CHK022 Có acceptance criteria nào đo lường thời gian avatar upload (latency từ chọn file → nhận URL) không? [Gap, Spec §SC]

## Scenario Coverage — Profile View & Edit

- [x] CHK023 Đặc tả có định nghĩa hành vi khi user truy cập profile nhưng tài khoản đã bị `banned`/`inactive` giữa chừng session không? [Coverage, Edge Case, Spec §Edge Cases]
- [x] CHK024 Đặc tả có xác định hành vi khi `updateProfile` được gọi nhưng không truyền trường nào — API có từ chối hay no-op không? [Coverage, Edge Case, Gap]
- [x] CHK025 Đặc tả có xác định hành vi khi frontend gửi `target_test_date` ở quá khứ — có được phép không? [Coverage, Edge Case, Gap]
- [x] CHK026 Đặc tả có xác định rằng controller chỉ đọc user id từ `req.user.id` (middleware) và KHÔNG chấp nhận user id từ request body/query không? [Coverage, Security, Spec §Edge Cases]

## Scenario Coverage — Avatar Upload

- [x] CHK027 Đặc tả có định nghĩa hành vi khi avatar upload thành công nhưng user KHÔNG gọi PATCH /me để lưu URL mới — avatar cũ được giữ nguyên không? [Coverage, Spec §Kịch bản 3]
- [x] CHK028 Đặc tả có xác định hành vi khi Supabase Storage không khả dụng — trả lỗi 500 hay có fallback? [Coverage, Exception Flow, Gap]
- [x] CHK029 Đặc tả có yêu cầu xóa avatar cũ trên storage khi upload avatar mới thành công không? Production có hàm `deleteImage` nhưng không gọi tự động. [Coverage, Gap, Production `avatarStorage.service.js`]
- [x] CHK030 Đặc tả có xác định rằng field name trong multipart form phải là `avatar` không? Production middleware dùng `uploadAvatarImage.single('avatar')`. [Completeness, Gap]

## Scenario Coverage — Security Settings

- [x] CHK031 Đặc tả có xác định rằng đổi mật khẩu từ profile REUSE auth change-password endpoint (không tạo endpoint mới) không? [Coverage, Plan §Structure Decision]
- [x] CHK032 Đặc tả có xác định hành vi khi mật khẩu mới trùng với 3 mật khẩu gần nhất (password history check) trong luồng change-password từ profile không? [Coverage, Spec §FR-011, Cross-feature]
- [x] CHK033 Đặc tả có yêu cầu password confirmation (nhập lại mật khẩu mới) trước khi gửi request không? [Completeness, Spec §FR-012]

## Scenario Coverage — Support History

- [x] CHK034 Đặc tả có xác định rằng support history lọc theo `email` (không phải user_id) không? Production `support.queries.js` dùng `WHERE email = $1`. [Completeness, Gap, Production]
- [x] CHK035 Đặc tả có liệt kê đầy đủ các trường hiển thị cho mỗi support request không (`subject`, `message`, `status`, `reply_message`, `created_at`, `resolved_at`)? [Completeness, Spec §FR-014]
- [x] CHK036 Đặc tả có xác định danh sách các trạng thái (status) hợp lệ của support request (ví dụ: pending, replied, resolved) không? [Gap, Spec §FR-014]
- [x] CHK037 Đặc tả có yêu cầu phân trang (pagination) cho lịch sử hỗ trợ khi số lượng lớn không? [Gap, Spec §FR-014]

## Scenario Coverage — Onboarding

- [x] CHK038 Đặc tả có xác định chính xác luồng onboarding (FR-010) — user bị chặn ở đâu, được redirect đến form nào, và điều kiện hoàn thành là gì? [Clarity, Spec §FR-010]
- [x] CHK039 Đặc tả có xác định rằng onboarding chỉ áp dụng cho student hay cho tất cả roles không? [Gap, Spec §FR-010]
- [x] CHK040 Đặc tả có xác định onboarding có bắt buộc (blocking) hay tùy chọn (skippable) không? [Gap, Spec §FR-010]

## Non-Functional Requirements — Security

- [x] CHK041 Đặc tả có yêu cầu rõ ràng rằng `password_hash` và các auth secrets KHÔNG BAO GIỜ được trả về trong response profile không? [Security, Spec §FR-002]
- [x] CHK042 Đặc tả có yêu cầu tất cả profile endpoints phải qua middleware `authenticate` không? [Security, Plan §Constitution Check]
- [x] CHK043 Đặc tả có yêu cầu rằng tất cả SQL queries trong profile module phải sử dụng parameterized queries ($1, $2) không? [Security, Plan §Constitution Check]
- [x] CHK044 Đặc tả có yêu cầu MIME type validation cho avatar upload (cả multer filter VÀ service layer double-check) không? [Security, Production double validation]
- [x] CHK045 Đặc tả có yêu cầu rằng avatar upload file name phải được sanitize/randomize để tránh path traversal không? Production dùng `crypto.randomBytes(16).toString('hex')`. [Security, Gap]

## Non-Functional Requirements — Data Integrity

- [x] CHK046 Đặc tả có yêu cầu rằng `target_band_score` phải được validate ở CÙNG LÚC cả frontend (form) và backend (service) không? [Data Integrity, Spec §FR-007, §FR-008]
- [x] CHK047 Đặc tả có yêu cầu rằng `target_test_date` được lưu dưới dạng DATE (không phải TIMESTAMP) để tránh lệch timezone không? Production dùng `.toISOString().split('T')[0]`. [Data Integrity, Gap]
- [x] CHK048 Đặc tả có xác định hành vi khi cập nhật profile cho user không tồn tại — trả 404 hay lỗi khác? Production trả 404 với code `NOT_FOUND`. [Data Integrity, Spec §Edge Cases]

## Non-Functional Requirements — UX

- [x] CHK049 Đặc tả có định nghĩa yêu cầu về trạng thái loading/success/error cho tất cả các form profile không? [UX, Gap]
- [x] CHK050 Đặc tả có xác định rằng avatar upload cần hiển thị preview trước khi lưu không? [UX, Gap]
- [x] CHK051 Đặc tả có xác định responsive design cho trang profile không? [UX, Gap]
- [x] CHK052 Đặc tả có yêu cầu empty state thân thiện khi lịch sử hỗ trợ trống không? [UX, Spec §SC-007]

## Non-Functional Requirements — API Contract

- [x] CHK053 Đặc tả có xác định rõ ràng rằng tất cả API response profile tuân theo format `{ success, data, error, meta }` không? [API Contract, Plan §Constitution Check]
- [x] CHK054 Đặc tả có xác định HTTP status codes cụ thể cho từng endpoint profile không (GET /me → 200, PATCH /me → 200, POST /me/avatar → 200, errors → 400/404/413) không? [API Contract, Gap]
- [x] CHK055 Đặc tả có xác định rõ endpoint PATCH /me chấp nhận cả PUT và PATCH method không? Tasks nói "chấp nhận cả PUT và PATCH" (T029). [API Contract, Tasks §T029]

## Dependencies & Assumptions

- [x] CHK056 Đặc tả có xác định dependency rõ ràng với Supabase Storage cho avatar upload không — bao gồm fallback khi storage unavailable? [Dependency, Gap]
- [x] CHK057 Đặc tả có xác định dependency giữa feat-profile và feat-auth (reuse change-password endpoint, AuthContext refresh) không? [Dependency, Plan §Structure Decision]
- [x] CHK058 Đặc tả có xác định dependency với `contact_submissions` table cho support history không? [Dependency, Gap]
- [x] CHK059 Giả định "việc tạo yêu cầu hỗ trợ thuộc về chức năng hỗ trợ" có được tham chiếu tới một đặc tả tính năng khác cụ thể không? [Assumption, Spec §Giả định]

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
