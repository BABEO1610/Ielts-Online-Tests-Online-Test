# Danh sách Công việc (Tasks): Audit Log and Change History

**Đầu vào (Input)**: Các tài liệu thiết kế từ `.sdd/specs/feat-auth-and-users/feat-audit-log/`

**Yêu cầu Tiên quyết (Prerequisites)**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Kiểm thử (Tests)**: Bao gồm bởi vì đặc tả tính năng yêu cầu kiểm thử độc lập và hiến pháp dự án yêu cầu bao phủ (coverage) cho service/query/API.

**Cách tổ chức (Organization)**: Các tasks được nhóm theo user story để mỗi story có thể được triển khai và kiểm thử độc lập.

## Giai đoạn 1: Thiết lập (Setup - Shared Infrastructure)

**Mục đích**: Xác nhận các đầu vào của tính năng audit, hợp đồng (contracts), và ranh giới triển khai hiện tại trước khi bắt tay vào story.

- [x] T001 [P] Xem xét các đầu vào thiết kế audit trong `.sdd/specs/feat-auth-and-users/feat-audit-log/plan.md`
- [x] T002 [P] Xem xét API contract của audit trong `.sdd/specs/feat-auth-and-users/feat-audit-log/contracts/api-contract.md`
- [x] T003 [P] Xem xét các kịch bản kiểm thử (validation scenarios) audit trong `.sdd/specs/feat-auth-and-users/feat-audit-log/quickstart.md`
- [x] T004 [P] Xác nhận phần quản lý nguồn (source ownership) audit trong `backend/src/services/audit.service.js`
- [x] T005 [P] Xác nhận phần quản lý giao diện (UI ownership) admin audit trong `frontend/src/pages/admin/AdminActivityLogPage.jsx`

---

## Giai đoạn 2: Nền tảng (Foundational - Blocking Prerequisites)

**Mục đích**: Các yêu cầu chung về audit schema, query, auth, và envelope đóng vai trò chặn (blocks) mọi story.

**ĐẶC BIỆT QUAN TRỌNG (CRITICAL)**: Không thể bắt đầu các user story nếu giai đoạn này chưa hoàn tất.

- [x] T006 Xác minh lược đồ cơ sở (base schema) `audit_logs`, các indexes, và thiết lập mặc định UUID trong `backend/src/db/migrations/006_create_audit_logs.sql`
- [x] T007 Xác minh các cột hỗ trợ undo và enum `change_reverted` trong `backend/src/db/migrations/011_patch_audit_logs_undo.sql`
- [x] T008 Xác minh độ bao phủ của security action enum cho các sự kiện đáng ngờ (suspicious events) trong `backend/src/db/migrations/017_add_security_log_actions.sql`
- [x] T009 [P] Thêm hoặc cập nhật các bài test query của audit cho chức năng phân trang (pagination), bộ lọc (filters), tóm tắt (summaries), và tìm kiếm chi tiết trong `backend/tests/db/queries/audit.queries.test.js`
- [x] T010 [P] Thêm hoặc cập nhật các bài test envelope cho admin audit controller trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T011 [P] Xác minh bảo vệ tuyến đường chỉ dành cho admin (admin-only route protection) cho các audit endpoints trong `backend/src/routes/api/v1/admin.routes.js`
- [x] T012 [P] Ghi chú sự sai lệch phiên bản React được nhắc đến bởi hiến pháp trong `.sdd/specs/feat-auth-and-users/feat-audit-log/plan.md`

**Cột mốc (Checkpoint)**: Lược đồ Audit, bảo vệ tuyến (route protection), và query contracts đã sẵn sàng.

---

## Giai đoạn 3: User Story 1 - Ghi lại các hành động nhạy cảm (Priority: P1) MVP

**Mục tiêu (Goal)**: Đảm bảo các hành động về Security/auth/admin tạo ra các dòng audit bền vững (durable audit rows) với các thông tin actor, target, timestamp, IP, và old/new values khi cần thiết.

**Kiểm thử Độc lập (Independent Test)**: Thực hiện login thành công, login thất bại, thay đổi role/status, đổi mật khẩu, và thu hồi session; xác nhận mỗi hành động đều tạo ra một dòng audit.

### Kiểm thử cho User Story 1

- [x] T013 [P] [US1] Thêm các assertions cho audit của đăng nhập thất bại và thành công trong `backend/tests/unit/services/auth.login.test.js`
- [x] T014 [P] [US1] Thêm các assertions cho audit của đổi mật khẩu trong `backend/tests/unit/services/auth.reset.test.js`
- [x] T015 [P] [US1] Thêm các assertions cho audit của thao tác thay đổi role/status trong `backend/tests/unit/services/users.profile.test.js`
- [x] T016 [P] [US1] Thêm các assertions cho audit của thu hồi session trong `backend/tests/unit/db/queries/sessions.queries.test.js`

### Triển khai cho User Story 1

- [x] T017 [US1] Xác minh `AuditLogService.logAction` chèn đầy đủ các trường bắt buộc actor/action/target/old/new/IP trong `backend/src/services/audit.service.js`
- [x] T018 [US1] Đảm bảo các tác vụ login thành công, login thất bại, khóa tài khoản (lockout), khôi phục (reset), và đổi mật khẩu có gọi hàm ghi log audit trong `backend/src/services/auth.service.js`
- [x] T019 [US1] Đảm bảo thay đổi role và status bao gồm ảnh chụp trạng thái (snapshots) old/new và cờ `can_undo` đối với các thao tác được hỗ trợ trong `backend/src/services/users.service.js`
- [x] T020 [US1] Đảm bảo thao tác thu hồi session bởi admin ghi lại ngữ cảnh (context) vào audit trong `backend/src/services/sessions.service.js`
- [x] T021 [US1] Đảm bảo lan truyền các lỗi khi ghi log audit đối với các hành động yêu cầu tính truy xuất nguồn gốc (traceability actions) trong `backend/src/services/audit.service.js`

**Cột mốc**: US1 có thể được kiểm thử độc lập thông qua backend service/API tests và kiểm tra trực tiếp trên bảng audit.

---

## Giai đoạn 4: User Story 2 - Theo dõi Nhật ký Hoạt động (Priority: P1)

**Mục tiêu**: Admin có thể xem danh sách activity logs có phân trang, có bộ lọc suspicious, nhãn severity, số liệu thống kê, và trạng thái rỗng (empty states).

**Kiểm thử Độc lập**: Mở `/admin/activity`, bật tắt các bộ lọc all/normal/suspicious, và xác minh các dòng trong bảng cùng số đếm được cập nhật chính xác.

### Kiểm thử cho User Story 2

- [x] T022 [P] [US2] Thêm các bài test contract cho danh sách activity log của `/api/v1/admin/audit-logs` trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T023 [P] [US2] Thêm các bài test contract cho thống kê activity của `/api/v1/admin/audit-logs/stats` trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T024 [P] [US2] Thêm các bài test frontend service cho `fetchActivityLogs` trong `frontend/tests/unit/services/api.test.js`
- [x] T025 [P] [US2] Thêm các bài test render trang cho trạng thái suspicious và rỗng trong `frontend/tests/pages/AdminActivityLogPage.test.jsx`

### Triển khai cho User Story 2

- [x] T026 [US2] Xác minh `listActivityLogs` áp dụng đúng bộ lọc severity và định dạng các trường actor/target/IP/note trong `backend/src/services/audit.service.js`
- [x] T027 [US2] Xác minh `getActivityLogStats` trả về tổng số lượng, số lượng suspicious, và failed-login trong `backend/src/db/queries/audit.queries.js`
- [x] T028 [US2] Đảm bảo các bí danh tuyến đường (route aliases) `/activity-logs`, `/activity-logs/stats`, `/audit-logs`, và `/audit-logs/stats` nhất quán trong `backend/src/routes/api/v1/admin.routes.js`
- [x] T029 [US2] Đảm bảo bảng activity log tiêu thụ các hàng từ API thay vì chuyển sang dữ liệu mẫu fallback trong `frontend/src/pages/admin/AdminActivityLogPage.jsx`
- [x] T030 [US2] Đảm bảo `fetchActivityLogs` trả về `rows` và `total` từ meta chuẩn của envelope trong `frontend/src/services/adminStats.service.js`

**Cột mốc**: US2 hoạt động độc lập thông qua việc sử dụng dữ liệu audit đã có sẵn (seeded audit rows) mà không cần có tính năng undo của change-log.

---

## Giai đoạn 5: User Story 3 - Xem lại Lịch sử Thay đổi (Priority: P1)

**Mục tiêu**: Admin có thể xem danh sách change logs được phân trang, tìm kiếm/lọc theo hành động, kiểm tra giá trị trước/sau ở cấp độ trường, và xem số lượng thống kê.

**Kiểm thử Độc lập**: Thay đổi user role/status, mở `/admin/change-log`, tìm kiếm theo action, mở chi tiết (detail), và xác minh các trường giá trị cũ/mới.

### Kiểm thử cho User Story 3

- [x] T031 [P] [US3] Thêm các bài test danh sách change-log và tóm tắt (summary) cho `/api/v1/admin/change-logs` trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T032 [P] [US3] Thêm các bài test chi tiết change-log cho `/api/v1/admin/change-logs/:id` trong `backend/tests/services/audit.service.test.js`
- [x] T033 [P] [US3] Thêm các bài test frontend cho tìm kiếm và phân trang change-log trong `frontend/tests/pages/AdminChangeLogPage.test.jsx`
- [x] T034 [P] [US3] Thêm các bài test định dạng diff cho các giá trị old/new trong `frontend/tests/unit/utils/adminFormat.test.js`

### Triển khai cho User Story 3

- [x] T035 [US3] Xác minh `listChangeLogs` trả về `summary`, pagination meta, nhãn (labels), old_value, và new_value trong `backend/src/services/audit.service.js`
- [x] T036 [US3] Xác minh các bộ lọc action/search/status được tham số hóa (parameterized) và bị giới hạn trong `backend/src/db/queries/audit.queries.js`
- [x] T037 [US3] Đảm bảo chi tiết change-log ánh xạ các nhãn actor và target của undo chính xác trong `backend/src/services/audit.service.js`
- [x] T038 [US3] Đảm bảo bộ ánh xạ hành động tìm kiếm (action search mapping) và các nút điều khiển phân trang khớp với query params của backend trong `frontend/src/pages/admin/AdminChangeLogPage.jsx`
- [x] T039 [US3] Đảm bảo hàm chuẩn hóa (normalize function) của frontend bảo tồn được `can_undo`, `undone_at`, và `undo_log_id` trong `frontend/src/services/adminOps.service.js`

**Cột mốc**: US3 hoạt động độc lập bằng cách sử dụng các dòng audit hiện có mà không cần thao tác undo.

---

## Giai đoạn 6: User Story 4 - Hoàn tác Thay đổi Người dùng Được hỗ trợ (Priority: P2)

**Mục tiêu**: Admin có thể hoàn tác một cách an toàn những thay đổi về role/status của user được hỗ trợ, đồng thời bảo tồn dòng audit gốc và tạo ra một dòng undo log mới.

**Kiểm thử Độc lập**: Undo một thay đổi role/status hợp lệ, xác minh user mục tiêu đã được khôi phục, dòng gốc được đánh dấu là undone, và các nỗ lực undo đối với thay đổi không được hỗ trợ/đã cũ/tự nhắm vào chính mình bị từ chối.

### Kiểm thử cho User Story 4

- [x] T040 [P] [US4] Thêm bài test service cho role undo thành công trong `backend/tests/services/audit.service.test.js`
- [x] T041 [P] [US4] Thêm các bài test undo đối với lỗi dữ liệu đã cũ (stale), không hỗ trợ (unsupported), đã undone, và tự nhắm vào mình (self-target) trong `backend/tests/services/audit.service.test.js`
- [x] T042 [P] [US4] Thêm bài test hợp đồng undo endpoint cho `/api/v1/admin/change-logs/:id/undo` trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T043 [P] [US4] Thêm bài test về hành vi của modal undo bên frontend trong `frontend/tests/pages/AdminChangeLogPage.test.jsx`

### Triển khai cho User Story 4

- [x] T044 [US4] Xác minh `buildUserUndoPlan` chỉ hỗ trợ thao tác thay đổi role/status của người dùng trong `backend/src/services/audit.service.js`
- [x] T045 [US4] Xác minh undo transaction khóa dòng audit gốc và người dùng mục tiêu (target user) trước khi sửa đổi dữ liệu (mutation) trong `backend/src/services/audit.service.js`
- [x] T046 [US4] Xác minh undo từ chối trạng thái mục tiêu đã cũ (stale target state) trước khi cập nhật `users` trong `backend/src/services/audit.service.js`
- [x] T047 [US4] Xác minh undo chèn `change_reverted` và đánh dấu dòng gốc bằng `undone_at`, `undone_by`, và `undo_log_id` trong `backend/src/services/audit.service.js`
- [x] T048 [US4] Đảm bảo `revertChange` hiển thị đúng các lỗi API thay vì thành công im lặng (silent success) trong `frontend/src/services/adminOps.service.js`
- [x] T049 [US4] Đảm bảo trạng thái nút undo và các số lượng trong bảng tóm tắt làm mới một cách chính xác trong `frontend/src/pages/admin/AdminChangeLogPage.jsx`

**Cột mốc**: US4 có thể được xác thực mà không làm hỏng các hành vi của US1-US3.

---

## Giai đoạn 7: Trau chuốt (Polish) & Các Vấn đề Cắt ngang (Cross-Cutting Concerns)

**Mục đích**: Tính quản trị (Governance), tối ưu hiệu suất, và validation đầy đủ cho tất cả các audit stories.

- [x] T050 [P] Xác minh các functions liên quan đến audit đều nằm dưới giới hạn kích thước của hiến pháp trong `backend/src/services/audit.service.js`
- [x] T051 [P] Xác minh không có audit endpoint nào trả về thông tin bí mật (secrets) hay stack traces trong `backend/src/middleware/errorHandler.js`
- [x] T052 [P] Thêm hướng dẫn thực thi (execution notes) quickstart của audit vào `.sdd/specs/feat-auth-and-users/feat-audit-log/quickstart.md`
- [x] T053 Chạy các bài test audit backend và ghi lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-audit-log/tasks.md`
- [x] T054 Chạy các bài test audit frontend page và ghi lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-audit-log/tasks.md`

---

## Phụ thuộc & Thứ tự Thực thi (Dependencies & Execution Order)

### Phụ thuộc theo Giai đoạn (Phase Dependencies)

- Giai đoạn 1 không có sự phụ thuộc nào.
- Giai đoạn 2 phụ thuộc vào Giai đoạn 1 và đóng vai trò chặn (blocks) tất cả các user stories.
- US1, US2, và US3 đều là P1 và có thể tiếp tục sau Giai đoạn 2, nhưng US1 là MVP bởi vì mọi view đều phụ thuộc vào sự tồn tại của các dòng audit.
- US4 phụ thuộc vào dữ liệu chi tiết của US3 và phần lưu trữ audit của US1.
- Giai đoạn 7 phụ thuộc vào tất cả các user stories đã chọn.

### Phụ thuộc theo User Story (User Story Dependencies)

- US1: không phụ thuộc vào story khác sau giai đoạn foundation.
- US2: phụ thuộc foundation; cần có các dòng audit để xác thực bằng tay.
- US3: phụ thuộc foundation; cần có các dòng audit (change logs) để xác thực bằng tay.
- US4: phụ thuộc vào US1 và US3.

### Các Cơ hội Thực thi Song song (Parallel Opportunities)

- T001-T005 có thể chạy song song.
- T009-T012 có thể chạy song song sau khi xem xét migration.
- Các task test bên trong mỗi user story có nhãn `[P]` có thể chạy song song.
- US2 và US3 có thể được tiến hành song song sau khi hành vi ghi log của US1 khả dụng.

## Ví dụ Song song (Parallel Example): User Story 2

```text
Task: "Add activity log list contract tests for /api/v1/admin/audit-logs in backend/tests/unit/controllers/auth.controller.test.js"
Task: "Add frontend service tests for fetchActivityLogs in frontend/tests/unit/services/api.test.js"
Task: "Add page rendering tests for suspicious and empty states in frontend/tests/pages/AdminActivityLogPage.test.jsx"
```

## Chiến lược Triển khai (Implementation Strategy)

### Theo Cấp độ Cơ bản Nhất (MVP First)

1. Hoàn tất Giai đoạn 1 và Giai đoạn 2.
2. Hoàn tất US1 để các hành động nhạy cảm ghi nhận các dòng audit một cách đáng tin cậy.
3. Xác thực (Validate) US1 thông qua các bài test backend và kiểm tra trực tiếp vào bảng audit.

### Giao hàng Theo đợt (Incremental Delivery)

1. Bàn giao chức năng ghi log US1.
2. Bàn giao chức năng giám sát hoạt động US2.
3. Bàn giao chức năng thanh tra (inspection) change-log US3.
4. Bàn giao chức năng undo US4 sau khi các bài test giao dịch (transaction) và chi tiết (detail) vượt qua.

### Ghi chú (Notes)

- Mọi task đều kèm theo đường dẫn file (file path) và tuân theo định dạng checklist format.
- Không giới thiệu việc sử dụng ORM.
- Giữ lịch sử audit ở trạng thái chỉ ghi thêm (append-only); undo phải đánh dấu trên các dòng gốc (source rows) thay vì xóa chúng.
