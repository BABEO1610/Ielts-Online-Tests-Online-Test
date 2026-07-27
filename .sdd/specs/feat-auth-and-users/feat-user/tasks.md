# Danh sách Công việc (Tasks): User Administration and Authorization

**Đầu vào (Input)**: Các tài liệu thiết kế từ `.sdd/specs/feat-auth-and-users/feat-user/`

**Yêu cầu Tiên quyết (Prerequisites)**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Kiểm thử (Tests)**: Bao gồm bởi vì đặc tả tính năng yêu cầu kiểm thử độc lập và hiến pháp dự án yêu cầu bao phủ (coverage) cho service/query/API.

**Cách tổ chức (Organization)**: Các tasks được nhóm theo user story để mỗi story có thể được triển khai và kiểm thử độc lập.

## Giai đoạn 1: Thiết lập (Setup - Shared Infrastructure)

**Mục đích**: Xác nhận các đầu vào của tính năng admin/user, quyền quản lý tuyến đường (route ownership), và ranh giới UI.

- [x] T001 [P] Xem xét các đầu vào thiết kế quản trị người dùng (user administration) trong `.sdd/specs/feat-auth-and-users/feat-user/plan.md`
- [x] T002 [P] Xem xét API contract của quản trị người dùng trong `.sdd/specs/feat-auth-and-users/feat-user/contracts/api-contract.md`
- [x] T003 [P] Xem xét các kịch bản kiểm thử quản trị người dùng trong `.sdd/specs/feat-auth-and-users/feat-user/quickstart.md`
- [x] T004 [P] Xác nhận sơ đồ các tuyến đường dành cho admin (admin route map) trong `backend/src/routes/api/v1/admin.routes.js`
- [x] T005 [P] Xác nhận sơ đồ tuyến đường UI dành cho admin trong `frontend/src/App.jsx`

---

## Giai đoạn 2: Nền tảng (Foundational - Blocking Prerequisites)

**Mục đích**: Các yêu cầu chung về schema user/session, serialization an toàn, phân quyền (authorization), và hành vi response của admin.

**ĐẶC BIỆT QUAN TRỌNG (CRITICAL)**: Không thể bắt đầu các user story nếu giai đoạn này chưa hoàn tất.

- [x] T006 Xác minh các enums role và status bao gồm đầy đủ các giá trị được hỗ trợ trong `backend/src/db/migrations/001_create_enums.sql`
- [x] T007 Xác minh schema `users` hỗ trợ danh sách admin (admin list) và các trường cho phép thay đổi dữ liệu (mutation fields) trong `backend/src/db/migrations/002_create_users.sql`
- [x] T008 Xác minh schema gốc của `user_sessions` và view `v_active_sessions` trong `backend/src/db/migrations/003_create_sessions.sql` cũng như bản vá thêm các cột OAuth trong `backend/src/db/migrations/010_patch_sessions_add_oauth.sql`
- [x] T009 [P] Thêm các bài test authenticate middleware cho các session bị thiếu/hết hạn/bị thu hồi trong `backend/tests/unit/middleware/authenticate.test.js`
- [x] T010 [P] Thêm các bài test authorize middleware đối với việc từ chối truy cập không phải admin trong `backend/tests/unit/middleware/authorize.test.js`
- [x] T011 [P] Thêm bài test envelope response của admin trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T012 [P] Xác minh độ lệch phiên bản React được ghi nhận bởi hiến pháp trong `.sdd/specs/feat-auth-and-users/feat-user/plan.md`

**Cột mốc (Checkpoint)**: Phân quyền phía backend và các contract chia sẻ dữ liệu admin đã sẵn sàng.

---

## Giai đoạn 3: User Story 1 - Bảo vệ Các Khu vực Theo Vai trò (Priority: P1) MVP

**Mục tiêu (Goal)**: Student, tutor, và admin chỉ có thể truy cập các khu vực được cấp quyền cho role của họ.

**Kiểm thử Độc lập (Independent Test)**: Đăng nhập lần lượt bằng các role và cố gắng mở các route dành cho student, tutor, và admin; xác minh các route được cấp phép sẽ tải bình thường, còn những route bị cấm sẽ redirect hoặc trả về 403.

### Kiểm thử cho User Story 1

- [x] T013 [P] [US1] Thêm các bài test ủy quyền (authorization) admin phía backend trong `backend/tests/unit/middleware/authorize.test.js`
- [x] T014 [P] [US1] Thêm bài test chuyển hướng của protected route tùy vào role trong `frontend/tests/components/auth/ProtectedRoute.test.jsx`
- [x] T015 [P] [US1] Thêm bài test smoke (smoke tests) cho App route guard trong `frontend/tests/unit/pages/LandingPage.test.jsx`

### Triển khai cho User Story 1

- [x] T016 [US1] Đảm bảo các admin routes yêu cầu cả `authenticate` và `authorize('admin')` trong `backend/src/routes/api/v1/admin.routes.js`
- [x] T017 [US1] Đảm bảo `authorize` trả về lỗi 403 rõ ràng khi không đủ thẩm quyền (insufficient role) trong `backend/src/middleware/authorize.js`
- [x] T018 [US1] Đảm bảo `authenticate` từ chối các phiên bị thu hồi/hết hạn và các tài khoản inactive trong `backend/src/middleware/authenticate.js`
- [x] T019 [US1] Đảm bảo ProtectedRoute điều hướng các roles không đủ quyền về không gian làm việc (workspace) thích hợp trong `frontend/src/components/auth/ProtectedRoute.jsx`
- [x] T020 [US1] Đảm bảo khai báo route cho admin, tutor, và student đều sử dụng ProtectedRoute nhất quán trong `frontend/src/App.jsx`

**Cột mốc**: US1 thực thi nghiêm ngặt các ranh giới vai trò (role boundaries) mà không phụ thuộc vào chức năng xem danh sách admin (admin list).

---

## Giai đoạn 4: User Story 2 - Tìm kiếm và Lọc Người dùng (Priority: P1)

**Mục tiêu**: Admin có thể duyệt, tìm kiếm, lọc, và phân trang danh sách người dùng.

**Kiểm thử Độc lập**: Mở `/admin/users`, áp dụng bộ lọc search/role/status, chuyển trang, và xác minh sự thay đổi trên bảng/thống kê meta/hiển thị trạng thái rỗng.

### Kiểm thử cho User Story 2

- [x] T021 [P] [US2] Thêm các bài test list user query bao gồm search, role, status, và phân trang trong `backend/tests/unit/db/queries/users.queries.test.js`
- [x] T022 [P] [US2] Thêm các bài test list users controller dành cho admin trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T023 [P] [US2] Thêm các bài test lọc và phân trang của trang AdminUsersPage trong `frontend/tests/pages/AdminUsersPage.test.jsx`
- [x] T024 [P] [US2] Thêm các bài test hiển thị định dạng role/status/date của admin trong `frontend/tests/unit/utils/adminFormat.test.js`

### Triển khai cho User Story 2

- [x] T025 [US2] Đảm bảo query `listUsers` sử dụng các tham số (parameterized) cho bộ lọc role/status/search và trả về tổng số bản ghi (count) trong `backend/src/db/queries/users.queries.js`
- [x] T026 [US2] Đảm bảo `usersService.listUsers` loại bỏ `password_hash` trên từng bản ghi trả về trong `backend/src/services/users.service.js`
- [x] T027 [US2] Đảm bảo admin controller phân tích an toàn các tham số page/limit và trả về meta total trong `backend/src/controllers/admin.controller.js`
- [x] T028 [US2] Đảm bảo AdminUsersPage gửi đúng các tham số search/role/status/page/limit đến `/admin/users` trong `frontend/src/pages/admin/AdminUsersPage.jsx`
- [x] T029 [US2] Đảm bảo AdminUsersPage xử lý đúng và hiển thị các trạng thái loading, empty, error, và phân trang trong `frontend/src/pages/admin/AdminUsersPage.jsx`

**Cột mốc**: US2 có thể được xác thực mà chưa cần có chức năng thay đổi (mutation) role/status.

---

## Giai đoạn 5: User Story 3 - Thay đổi Vai trò hoặc Trạng thái Người dùng (Priority: P1)

**Mục tiêu**: Admin có thể thay đổi role/status của người khác, nhưng không thể đổi của chính mình, và các sessions của mục tiêu sẽ bị thu hồi nếu cần.

**Kiểm thử Độc lập**: Đổi role/status của user khác, tải lại danh sách, xác minh các phiên cũ bị thu hồi, và đảm bảo thao tác tự đổi của chính mình bị chặn.

### Kiểm thử cho User Story 3

- [x] T030 [P] [US3] Thêm các bài test thay đổi role ở service, bao gồm việc từ chối tự thay đổi (self-change rejection) trong `backend/tests/unit/services/users.profile.test.js`
- [x] T031 [P] [US3] Thêm các bài test thay đổi status ở service, bao gồm thu hồi session cho các trường hợp inactive/banned trong `backend/tests/unit/services/users.profile.test.js`
- [x] T032 [P] [US3] Thêm các bài test admin role/status endpoint trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T033 [P] [US3] Thêm các bài test về save/error của UserModals trong `frontend/tests/components/admin/UserModals.test.jsx`

### Triển khai cho User Story 3

- [x] T034 [US3] Đảm bảo `changeUserRole` chặn hành động tự thay đổi và khi không tìm thấy mục tiêu (missing targets) trong `backend/src/services/users.service.js`
- [x] T035 [US3] Đảm bảo `changeUserRole` thu hồi các sessions của user mục tiêu sau khi đổi role thành công trong `backend/src/services/users.service.js`
- [x] T036 [US3] Đảm bảo `changeUserStatus` chặn hành động tự thay đổi và khi không tìm thấy mục tiêu trong `backend/src/services/users.service.js`
- [x] T037 [US3] Đảm bảo `changeUserStatus` thu hồi các sessions khi status đổi thành inactive hoặc banned trong `backend/src/services/users.service.js`
- [x] T038 [US3] Đảm bảo các role/status endpoints validate dữ liệu từ request body trong `backend/src/controllers/admin.controller.js`
- [x] T039 [US3] Đảm bảo UserModals vô hiệu hóa nút tự quản lý (self-management) và hiển thị API errors trong `frontend/src/components/admin/UserModals.jsx`
- [x] T040 [US3] Đảm bảo AdminUsersPage làm mới (refreshes) danh sách sau khi update role/status trong `frontend/src/pages/admin/AdminUsersPage.jsx`

**Cột mốc**: US3 đảm bảo cung cấp chức năng quản trị an toàn (safe user mutation) mà không đòi hỏi phải có UI danh sách session.

---

## Giai đoạn 6: User Story 4 - Quản lý Các Phiên Hoạt động (Priority: P2)

**Mục tiêu**: Admin có thể xem danh sách session đang hoạt động, lọc/tìm kiếm ở frontend theo người dùng hoặc loại hình đăng nhập, và thu hồi các session có dấu hiệu khả nghi.

**Kiểm thử Độc lập**: Mở `/admin/sessions`, sử dụng bộ lọc (filter) các password/OAuth sessions, thu hồi một session, và xác nhận session đó không thể sử dụng lại nữa.

### Kiểm thử cho User Story 4

- [x] T041 [P] [US4] Thêm các bài test query lấy danh sách active session trong `backend/tests/unit/db/queries/sessions.queries.test.js`
- [x] T042 [P] [US4] Thêm bài test revoke session by id trong `backend/tests/unit/db/queries/sessions.queries.test.js`
- [x] T043 [P] [US4] Thêm các bài test cho admin sessions controller trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T044 [P] [US4] Thêm các bài test lọc (filter) và thu hồi (revoke) của SessionsPage trong `frontend/tests/pages/SessionsPage.test.jsx`

### Triển khai cho User Story 4

- [x] T045 [US4] Đảm bảo `listAllActiveSessions` chỉ đọc các dòng active từ view `v_active_sessions` trong `backend/src/db/queries/sessions.queries.js`
- [x] T046 [US4] Đảm bảo `getAllActiveSessions` định dạng các thông tin user, email, device, IP, login type, lần hoạt động cuối, và thời hạn (expiry) trong `backend/src/services/sessions.service.js`
- [x] T047 [US4] Đảm bảo `revokeSessionById` trả về lỗi rõ ràng khi không tìm thấy (missing) hoặc session đã bị thu hồi trước đó trong `backend/src/services/sessions.service.js`
- [x] T048 [US4] Đảm bảo các admin session routes được bảo vệ bởi middleware admin authorization trong `backend/src/routes/api/v1/admin.routes.js`
- [x] T049 [US4] Đảm bảo `fetchSessions` và `revokeSession` sử dụng và hiển thị đúng các lỗi API thay vì bắt lỗi im lặng (silent fallback) ở `frontend/src/services/adminOps.service.js`
- [x] T050 [US4] Đảm bảo các state của SessionsPage (search/filter/revoke) cập nhật lại danh sách dữ liệu sau khi thực hiện thu hồi thành công trong `frontend/src/pages/admin/SessionsPage.jsx`

**Cột mốc**: US4 có thể được xác thực một cách độc lập ngay khi có chức năng cấp quyền admin (admin auth).

---

## Giai đoạn 7: Trau chuốt (Polish) & Các Vấn đề Cắt ngang (Cross-Cutting Concerns)

**Mục đích**: Tích hợp Audit log, bảo mật chặt chẽ hơn, và kiểm thử toàn diện tất cả các tính năng quản trị người dùng.

- [x] T051 [P] Xác minh các hành động admin đổi role/status/session ghi log thành công vào hệ thống trong `backend/src/services/users.service.js`
- [x] T052 [P] Xác minh hành động thu hồi session (session revoke admin action) cũng ghi log audit trong `backend/src/services/sessions.service.js`
- [x] T053 [P] Xác minh không có dữ liệu admin user/session response nào làm lộ các auth secrets trong `backend/src/controllers/admin.controller.js`
- [x] T054 [P] Xác minh các trang admin không sử dụng dữ liệu mẫu (sample data) khi API đang sẵn sàng phục vụ trong `frontend/src/services/adminOps.service.js`
- [x] T055 Chạy tất cả bài test user administration của backend và ghi lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-user/tasks.md`
- [x] T056 Chạy tất cả bài test user administration của frontend và ghi lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-user/tasks.md`
- [x] T057 Thực thi các kịch bản quickstart và cập nhật kết quả trong `.sdd/specs/feat-auth-and-users/feat-user/quickstart.md`

---

## Phụ thuộc & Thứ tự Thực thi (Dependencies & Execution Order)

### Phụ thuộc theo Giai đoạn (Phase Dependencies)

- Giai đoạn 1 không có sự phụ thuộc nào.
- Giai đoạn 2 phụ thuộc vào Giai đoạn 1 và đóng vai trò chặn (blocks) tất cả các user stories.
- US1, US2, và US3 là P1; US1 đóng vai trò là hàng rào bảo mật cơ bản nhất (MVP security boundary).
- US4 phụ thuộc vào chức năng xác thực admin (admin authorization) từ US1.
- Giai đoạn 7 phụ thuộc vào tất cả các user stories đã chọn.

### Phụ thuộc theo User Story (User Story Dependencies)

- US1: không phụ thuộc vào story khác sau giai đoạn foundation.
- US2: phụ thuộc vào quyền truy cập admin-only từ US1.
- US3: phụ thuộc vào US2 để chọn người dùng muốn thay đổi (target users), nhưng phần service tests ở backend có thể bắt đầu sau giai đoạn foundation.
- US4: phụ thuộc vào quyền admin-only từ US1 và các nền tảng về session schema.

### Các Cơ hội Thực thi Song song (Parallel Opportunities)

- T001-T005 có thể chạy song song.
- T009-T012 có thể chạy song song sau khi xem xét lược đồ (schema review).
- Các task test bên trong mỗi story có nhãn `[P]` có thể chạy song song.
- Các công việc Frontend của US2 và US4 có thể được tiến hành song song sau khi tính năng route guard của US1 chạy ổn định.

## Ví dụ Song song (Parallel Example): User Story 2

```text
Task: "Add list user query tests for search, role, status, and pagination in backend/tests/unit/db/queries/users.queries.test.js"
Task: "Add admin list users controller tests in backend/tests/unit/controllers/users.controller.test.js"
Task: "Add AdminUsersPage filter and pagination tests in frontend/tests/pages/AdminUsersPage.test.jsx"
```

## Chiến lược Triển khai (Implementation Strategy)

### Theo Cấp độ Cơ bản Nhất (MVP First)

1. Hoàn tất Giai đoạn 1 và Giai đoạn 2.
2. Hoàn tất việc bảo vệ route thông qua quyền (role protection) của US1.
3. Xác thực quyền truy cập API trực tiếp cũng như frontend route bằng từng role.

### Giao hàng Theo đợt (Incremental Delivery)

1. Bàn giao hàng rào bảo vệ (role boundaries) của US1.
2. Bàn giao chức năng duyệt danh sách/tìm kiếm/lọc người dùng US2.
3. Bàn giao chức năng thay đổi (mutations) role/status US3.
4. Bàn giao chức năng quản lý session US4.

### Ghi chú (Notes)

- Mọi task đều kèm theo đường dẫn file (file path) và tuân theo định dạng checklist format.
- Backend authorization đóng vai trò là nguồn dữ liệu gốc (source of truth); frontend guards chỉ dùng hỗ trợ cho UX.
- Không sử dụng xóa cứng (hard-delete) cho session; việc thu hồi sẽ cài đặt lại giá trị `revoked_at`.
