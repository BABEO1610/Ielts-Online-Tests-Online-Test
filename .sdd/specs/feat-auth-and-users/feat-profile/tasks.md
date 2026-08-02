# Danh sách Công việc (Tasks): User Profile

**Đầu vào (Input)**: Các tài liệu thiết kế từ `.sdd/specs/feat-auth-and-users/feat-profile/`

**Yêu cầu Tiên quyết (Prerequisites)**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Kiểm thử (Tests)**: Bao gồm bởi vì đặc tả tính năng yêu cầu kiểm thử độc lập và hiến pháp dự án yêu cầu bao phủ (coverage) cho service/query/API.

**Cách tổ chức (Organization)**: Các tasks được nhóm theo user story để mỗi story có thể được triển khai và kiểm thử độc lập.

## Giai đoạn 1: Thiết lập (Setup - Shared Infrastructure)

**Mục đích**: Xác nhận các đầu vào của profile, ranh giới API, và quyền quản lý UI.

- [x] T001 [P] Xem xét các đầu vào thiết kế profile trong `.sdd/specs/feat-auth-and-users/feat-profile/plan.md`
- [x] T002 [P] Xem xét API contract của profile trong `.sdd/specs/feat-auth-and-users/feat-profile/contracts/api-contract.md`
- [x] T003 [P] Xem xét các kịch bản kiểm thử profile trong `.sdd/specs/feat-auth-and-users/feat-profile/quickstart.md`
- [x] T004 [P] Xác nhận sơ đồ tuyến đường tự phục vụ (self-service user route map) trong `backend/src/routes/api/v1/users.routes.js`
- [x] T005 [P] Xác nhận các điểm vào giao diện (UI entry points) của profile trong `frontend/src/pages/student/UserProfilePage.jsx`

---

## Giai đoạn 2: Nền tảng (Foundational - Blocking Prerequisites)

**Mục đích**: Các yêu cầu dùng chung về profile schema, ranh giới xác thực, serialization an toàn, và hạ tầng upload.

**ĐẶC BIỆT QUAN TRỌNG (CRITICAL)**: Không thể bắt đầu các user story nếu giai đoạn này chưa hoàn tất.

- [x] T006 Xác minh các trường của profile trên lược đồ `users` trong `backend/src/db/migrations/002_create_users.sql`
- [x] T007 Xác minh migration cho `target_test_date` đã tồn tại và được quản lý bằng migration trong `backend/src/db/migrations/027_add_target_test_date.sql`
- [x] T008 Loại bỏ runtime DDL khỏi truy vấn cập nhật profile và chỉ sử dụng migrations trong `backend/src/db/queries/users.queries.js`
- [x] T009 [P] Thêm các bài test serialization an toàn cho profile trong `backend/tests/unit/services/users.profile.test.js`
- [x] T010 [P] Thêm các bài test cho envelope/auth của users controller trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T011 [P] Thêm các bài test kiểm tra loại (JPG, PNG, WebP) và dung lượng (max 2MB) cho avatar middleware trong `backend/tests/unit/middleware/uploadImage.middleware.test.js`
- [x] T012 [P] Xác minh độ lệch phiên bản React được ghi nhận bởi hiến pháp trong `.sdd/specs/feat-auth-and-users/feat-profile/plan.md`

**Cột mốc (Checkpoint)**: Các thao tác đọc/ghi profile có thể được triển khai mà không làm rò rỉ dữ liệu xác thực nhạy cảm hay thay đổi schema lúc thực thi (runtime schema mutation).

---

## Giai đoạn 3: User Story 1 - Xem Hồ sơ Cá nhân (Priority: P1) MVP

**Mục tiêu (Goal)**: Người dùng đã đăng nhập có thể xem định danh, role, status, avatar placeholder, các trường mục tiêu học tập (learning goal), và mốc thời gian của tài khoản.

**Kiểm thử Độc lập (Independent Test)**: Đăng nhập và mở `/profile`; xác minh các trường profile hiển thị chính xác và người dùng chưa đăng nhập sẽ bị điều hướng.

### Kiểm thử cho User Story 1

- [x] T013 [P] [US1] Thêm các bài test trả về dữ liệu an toàn cho get-profile trong `backend/tests/unit/services/users.profile.test.js`
- [x] T014 [P] [US1] Thêm các bài test xác thực (auth) và envelope cho `GET /api/v1/users/me` trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T015 [P] [US1] Thêm các bài test về chức năng làm mới profile cho AuthContext trong `frontend/tests/unit/context/AuthContext.test.jsx`
- [x] T016 [P] [US1] Thêm các bài test hiển thị danh tính profile và ảnh giữ chỗ (placeholder rendering) trong `frontend/tests/pages/UserProfilePage.test.jsx`

### Triển khai cho User Story 1

- [x] T017 [US1] Đảm bảo `getProfile` loại bỏ `password_hash` và các trường nhạy cảm khác bị thiếu trong `backend/src/services/users.service.js`
- [x] T018 [US1] Đảm bảo `findUserById` vẫn được tham số hóa và trả về các trường profile yêu cầu trong `backend/src/db/queries/users.queries.js`
- [x] T019 [US1] Đảm bảo controller của `getProfile` chỉ đọc user id từ `req.user.id` trong `backend/src/controllers/users.controller.js`
- [x] T020 [US1] Đảm bảo `refreshUser` gọi endpoint `/users/me` và thiết lập state đã xác thực chính xác trong `frontend/src/context/AuthContext.jsx`
- [x] T021 [US1] Đảm bảo trang profile hiển thị email, role, status, các trường mục tiêu, và avatar fallback trong `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T022 [US1] Đảm bảo truy cập profile khi chưa đăng nhập bị điều hướng qua cơ chế route guard trong `frontend/src/App.jsx`

**Cột mốc**: US1 có thể được trình diễn (demonstrated) chỉ cần một tài khoản đã xác thực.

---

## Giai đoạn 4: User Story 2 - Cập nhật Hồ sơ Học tập (Priority: P1)

**Mục tiêu**: Người dùng có thể cập nhật họ tên, avatar URL, điểm mục tiêu IELTS, và ngày thi mục tiêu.

**Kiểm thử Độc lập**: Sửa các trường profile, lưu, làm mới trang, và xác minh các giá trị được lưu lại.

### Kiểm thử cho User Story 2

- [x] T023 [P] [US2] Thêm các bài test cho xác thực điểm mục tiêu (target band validation) trong `backend/tests/unit/services/users.profile.test.js`
- [x] T024 [P] [US2] Thêm các bài test cho truy vấn update profile trong `backend/tests/unit/db/queries/users.queries.test.js`
- [x] T025 [P] [US2] Thêm các bài test cho `PATCH /api/v1/users/me` trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T026 [P] [US2] Thêm các bài test về tính lưu giữ (persistence) của form sửa profile trong `frontend/tests/pages/UserProfilePage.test.jsx`

### Triển khai cho User Story 2

- [x] T027 [US2] Đảm bảo `updateProfile` xác thực điểm target band từ 0.0-9.0 và bước nhảy 0.5 trong `backend/src/services/users.service.js`
- [x] T028 [US2] Đảm bảo thao tác cập nhật profile hỗ trợ cả việc thiết lập (setting) và xóa (clearing) `target_test_date` trong `backend/src/db/queries/users.queries.js`
- [x] T029 [US2] Đảm bảo endpoint cập nhật profile chấp nhận cả PUT và PATCH một cách nhất quán trong `backend/src/routes/api/v1/users.routes.js`
- [x] T030 [US2] Đảm bảo frontend chuẩn hóa điểm số band và gửi ngày null khi giá trị bị xóa trong `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T031 [US2] Đảm bảo thao tác lưu thành công sẽ làm mới user state của AuthContext trong `frontend/src/pages/student/UserProfilePage.jsx`

**Cột mốc**: US2 lưu giữ các trường của hồ sơ học tập độc lập với việc tải lên avatar.

---

## Giai đoạn 5: User Story 3 - Tải lên Ảnh đại diện (Priority: P2)

**Mục tiêu**: Người dùng có thể tải lên một ảnh avatar được hỗ trợ, nhận về một avatar URL, và lưu nó vào profile.

**Kiểm thử Độc lập**: Tải lên một ảnh hợp lệ với kích thước dưới giới hạn, lưu profile, tải lại trang, và xác minh avatar hiển thị; các file không hợp lệ sẽ bị từ chối.

### Kiểm thử cho User Story 3

- [x] T032 [P] [US3] Thêm các bài test thành công/thất bại của controller avatar upload trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T033 [P] [US3] Thêm các bài test cho avatar storage adapter trong `backend/tests/unit/storage/objectStorage.adapter.test.js`
- [x] T034 [P] [US3] Thêm các bài test kích thước/loại file tải lên trong `backend/tests/unit/middleware/uploadImage.middleware.test.js`
- [x] T035 [P] [US3] Thêm các bài test frontend avatar upload trong `frontend/tests/pages/UserProfilePage.test.jsx`

### Triển khai cho User Story 3

- [x] T036 [US3] Đảm bảo upload middleware từ chối các định dạng MIME không hỗ trợ (chỉ cho phép JPG, PNG, WebP) và file vượt quá giới hạn 2MB trong `backend/src/middleware/uploadImage.middleware.js`
- [x] T037 [US3] Đảm bảo `uploadAvatar` yêu cầu có file tải lên và user id từ middleware xác thực trong `backend/src/controllers/users.controller.js`
- [x] T038 [US3] Đảm bảo avatar storage trả về các giá trị `avatar_url` ổn định và công khai trong `backend/src/services/avatarStorage.service.js`
- [x] T039 [US3] Đảm bảo upload phía frontend điền đầy đủ `avatar_url` và yêu cầu xác nhận lưu (save confirmation) trong `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T040 [US3] Đảm bảo các lỗi tải lên avatar hiển thị rõ ràng và không làm thay đổi state profile đã lưu trong `frontend/src/pages/student/UserProfilePage.jsx`

**Cột mốc**: US3 có thể được kiểm thử mà không cần đổi mật khẩu hay có lịch sử hỗ trợ.

---

## Giai đoạn 6: User Story 4 - Quản lý Cài đặt Bảo mật (Priority: P2)

**Mục tiêu**: Người dùng đăng nhập bằng mật khẩu cục bộ (local passwords) có thể đổi mật khẩu; Người dùng Google-only nhận được các hướng dẫn rõ ràng.

**Kiểm thử Độc lập**: Đổi mật khẩu với mật khẩu hiện tại đúng, và từ chối nếu không khớp/mật khẩu ngắn/sai mật khẩu hiện tại.

### Kiểm thử cho User Story 4

- [x] T041 [P] [US4] Thêm các bài test đổi mật khẩu của tài khoản cục bộ trong `backend/tests/unit/services/auth.reset.test.js`
- [x] T042 [P] [US4] Thêm các bài test hiển thị hướng dẫn đổi mật khẩu đối với tài khoản Google-only trong `backend/tests/unit/services/auth.reset.test.js`
- [x] T043 [P] [US4] Thêm các bài test về giao diện cài đặt bảo mật trong `frontend/tests/pages/UserProfilePage.test.jsx`
- [x] T044 [P] [US4] Thêm các bài test xác thực của ChangePwdModal trong `frontend/tests/components/profile/ChangePwdModal.test.jsx`

### Triển khai cho User Story 4

- [x] T045 [US4] Đảm bảo endpoint đổi mật khẩu vẫn cần xác thực (authenticated) trong `backend/src/routes/api/v1/auth.routes.js`
- [x] T046 [US4] Đảm bảo `changePassword` xác thực mật khẩu hiện tại và từ chối các tài khoản Google-only trong `backend/src/services/auth.service.js`
- [x] T047 [US4] Đảm bảo trang cài đặt bảo mật mở modal mật khẩu khi điều hướng từ profile trong `frontend/src/pages/student/SecuritySettingsPage.jsx`
- [x] T048 [US4] Đảm bảo ChangePwdModal chặn việc mật khẩu không khớp hoặc quá ngắn trước khi gửi request đi trong `frontend/src/components/profile/ChangePwdModal.jsx`
- [x] T049 [US4] Đảm bảo ChangePwdModal hiển thị được trạng thái báo lỗi hay thành công từ API trong `frontend/src/components/profile/ChangePwdModal.jsx`

**Cột mốc**: US4 tận dụng lại logic mật khẩu của phần auth mà không bị lặp lại ở phía backend.

---

## Giai đoạn 7: User Story 5 - Xem Lịch sử Hỗ trợ (Priority: P3)

**Mục tiêu**: Người dùng có thể xem lại các yêu cầu hỗ trợ cũ cùng phản hồi của admin, bao gồm cả hiển thị rỗng (empty state).

**Kiểm thử Độc lập**: Mở trang lịch sử hỗ trợ trong các trạng thái có và không có các yêu cầu (requests); xác minh status, timestamps, content, và admin reply render chính xác.

### Kiểm thử cho User Story 5

- [x] T050 [P] [US5] Thêm bài test query lấy lịch sử hỗ trợ trong `backend/tests/unit/db/queries/support.queries.test.js`
- [x] T051 [P] [US5] Thêm bài test service/controller cho lịch sử hỗ trợ trong `backend/tests/unit/controllers/users.controller.test.js`
- [x] T052 [P] [US5] Thêm bài test render của contact history modal trong `frontend/tests/components/profile/ContactHistoryModal.test.jsx`

### Triển khai cho User Story 5

- [x] T053 [US5] Đảm bảo truy vấn lấy lịch sử hỗ trợ sử dụng bộ lọc (filter) theo id người dùng đã xác thực trong `backend/src/db/queries/support.queries.js`
- [x] T054 [US5] Đảm bảo bất kỳ endpoint lịch sử hỗ trợ nào đều trả về standard envelope và không chứa dữ liệu của người dùng khác trong `backend/src/controllers/users.controller.js`
- [x] T055 [US5] Đảm bảo ContactHistoryModal hiển thị nội dung yêu cầu, trạng thái, thời gian tạo, và phản hồi của admin trong `frontend/src/components/profile/ContactHistoryModal.jsx`
- [x] T056 [US5] Đảm bảo khi lịch sử hỗ trợ trống (empty) thì hiển thị trạng thái rỗng thân thiện cho người dùng trong `frontend/src/components/profile/ContactHistoryModal.jsx`

**Cột mốc**: US5 có thể được xác thực một cách độc lập không liên quan đến việc sửa profile.

---

## Giai đoạn 8: Trau chuốt (Polish) & Các Vấn đề Cắt ngang (Cross-Cutting Concerns)

**Mục đích**: Tính quản trị (Governance), bảo mật chặt chẽ hơn, và validation đầy đủ cho tất cả các profile stories.

- [x] T057 [P] Xác minh không có response của profile nào làm lộ các auth secrets trong `backend/src/services/users.service.js`
- [x] T058 [P] Xác minh toàn bộ profile queries đều dùng parameterized SQL trong `backend/src/db/queries/users.queries.js`
- [x] T059 [P] Xác minh UI profile xử lý đúng các trạng thái loading, success, error, và empty trong `frontend/src/pages/student/UserProfilePage.jsx`
- [x] T060 Chạy các bài test profile phía backend và ghi lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-profile/tasks.md`
- [x] T061 Chạy các bài test profile phía frontend và ghi lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-profile/tasks.md`
- [x] T062 Thực thi các kịch bản quickstart và cập nhật kết quả trong `.sdd/specs/feat-auth-and-users/feat-profile/quickstart.md`

---

## Phụ thuộc & Thứ tự Thực thi (Dependencies & Execution Order)

### Phụ thuộc theo Giai đoạn (Phase Dependencies)

- Giai đoạn 1 không có sự phụ thuộc nào.
- Giai đoạn 2 phụ thuộc vào Giai đoạn 1 và đóng vai trò chặn (blocks) tất cả các user stories.
- US1 và US2 là P1 và tạo thành phần cốt lõi (MVP profile surface) của profile.
- US3 và US4 phụ thuộc vào quyền truy cập vào profile (authenticated profile access) của US1.
- US5 phụ thuộc vào truy cập profile có xác thực (authenticated profile access) của US1.
- Giai đoạn 8 phụ thuộc vào tất cả các user stories đã chọn.

### Phụ thuộc theo User Story (User Story Dependencies)

- US1: không phụ thuộc vào story khác sau giai đoạn foundation.
- US2: phụ thuộc vào hàm lấy profile của US1 để validation việc làm mới (refresh).
- US3: phụ thuộc truy cập có xác thực từ US1 và tuỳ chọn vào quy trình lưu dữ liệu (save flow) của US2.
- US4: phụ thuộc vào auth password endpoint và điều hướng profile từ US1.
- US5: phụ thuộc truy cập có xác thực từ US1.

### Các Cơ hội Thực thi Song song (Parallel Opportunities)

- T001-T005 có thể chạy song song.
- T009-T012 có thể chạy song song sau khi xem xét lược đồ (schema review).
- Các task test bên trong mỗi user story có nhãn `[P]` có thể chạy song song.
- US3, US4, và US5 có thể tiến hành song song sau khi US1 đã ổn định.

## Ví dụ Song song (Parallel Example): User Story 3

```text
Task: "Add avatar upload controller success/failure tests in backend/tests/unit/controllers/users.controller.test.js"
Task: "Add avatar storage adapter tests in backend/tests/unit/storage/objectStorage.adapter.test.js"
Task: "Add frontend avatar upload tests in frontend/tests/pages/UserProfilePage.test.jsx"
```

## Chiến lược Triển khai (Implementation Strategy)

### Theo Cấp độ Cơ bản Nhất (MVP First)

1. Hoàn tất Giai đoạn 1 và Giai đoạn 2.
2. Hoàn tất chức năng xem (read) của US1 và cập nhật (update) của US2.
3. Xác thực khả năng xem/sửa tại `/profile` một cách độc lập.

### Giao hàng Theo đợt (Incremental Delivery)

1. Bàn giao chức năng xem profile US1.
2. Bàn giao chức năng cập nhật mục tiêu học tập US2.
3. Bàn giao chức năng tải lên avatar US3.
4. Bàn giao phần cài đặt mật khẩu US4.
5. Bàn giao lịch sử hỗ trợ US5.

### Ghi chú (Notes)

- Mọi task đều kèm theo đường dẫn file (file path) và tuân theo định dạng checklist format.
- Lấy định danh từ `req.user.id`; không bao giờ chấp nhận cung cấp user id vào profile từ body/query.
- Thay thế các đoạn code can thiệp (mutation) lược đồ lúc chạy (runtime schema mutation) bằng các thao tác quản lý dạng migrations-only trước khi hoàn thiện phần triển khai.
