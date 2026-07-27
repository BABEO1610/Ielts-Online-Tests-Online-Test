# Danh sách Công việc (Tasks): Authentication

**Đầu vào (Input)**: Các tài liệu thiết kế từ `.sdd/specs/feat-auth-and-users/feat-auth/`

**Yêu cầu Tiên quyết (Prerequisites)**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Kiểm thử (Tests)**: Bao gồm bởi vì đặc tả tính năng yêu cầu kiểm thử độc lập và hiến pháp dự án yêu cầu bao phủ (coverage) cho service/query/API.

**Cách tổ chức (Organization)**: Các tasks được nhóm theo user story (câu chuyện người dùng) để mỗi story có thể được triển khai và kiểm thử độc lập.

## Giai đoạn 1: Thiết lập (Setup - Shared Infrastructure)

**Mục đích**: Xác nhận các đầu vào của tính năng auth, các yêu cầu môi trường, và ranh giới triển khai.

- [x] T001 [P] Xem xét các đầu vào thiết kế authentication trong `.sdd/specs/feat-auth-and-users/feat-auth/plan.md`
- [x] T002 [P] Xem xét API contract của authentication trong `.sdd/specs/feat-auth-and-users/feat-auth/contracts/api-contract.md`
- [x] T003 [P] Xem xét các kịch bản kiểm thử (validation scenarios) authentication trong `.sdd/specs/feat-auth-and-users/feat-auth/quickstart.md`
- [x] T004 [P] Xác nhận sơ đồ tuyến (route map) auth backend trong `backend/src/routes/api/v1/auth.routes.js`
- [x] T005 [P] Xác nhận các điểm vào (entry points) auth frontend trong `frontend/src/pages/auth/Login.jsx`

---

## Giai đoạn 2: Nền tảng (Foundational - Blocking Prerequisites)

**Mục đích**: Chứa các hành vi dùng chung về account, token, session, validation, và phản hồi (response) cho tất cả các auth stories.

**ĐẶC BIỆT QUAN TRỌNG (CRITICAL)**: Không thể bắt đầu các user story nếu giai đoạn này chưa hoàn tất.

- [x] T006 Xác minh các enums user role/status và auth columns trong `backend/src/db/migrations/001_create_enums.sql`
- [x] T007 Xác minh lược đồ account và các trường bảo mật mục tiêu trong `backend/src/db/migrations/002_create_users.sql`
- [x] T008 Xác minh lược đồ session, view active-session, và các cột OAuth session trong `backend/src/db/migrations/003_create_sessions.sql`
- [x] T009 Xác minh lược đồ verification/reset token trong `backend/src/db/migrations/005_create_tokens.sql`
- [x] T010 Xác minh lược đồ password history và các indexes trong `backend/src/db/migrations/004_create_pwd_history.sql`
- [x] T011 [P] Thêm các bài test cho auth response envelope trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T012 [P] Thêm các bài test cho token utility expiry/claim trong `backend/tests/unit/utils/token.util.test.js`
- [x] T013 [P] Thêm các bài test trợ giúp hash/verify/history mật khẩu trong `backend/tests/unit/utils/password.util.test.js`
- [x] T014 [P] Xác minh độ lệch phiên bản React được ghi chú bởi hiến pháp trong `.sdd/specs/feat-auth-and-users/feat-auth/plan.md`

**Cột mốc (Checkpoint)**: Data model, các khối validation cơ bản, và giao thức phản hồi chung đã sẵn sàng.

---

## Giai đoạn 3: User Story 1 - Đăng ký và Xác thực Tài khoản (Priority: P1) MVP

**Mục tiêu (Goal)**: Khách có thể đăng ký bằng email/mật khẩu/họ tên và kích hoạt (activate) tài khoản qua một verification token hợp lệ.

**Kiểm thử Độc lập (Independent Test)**: Đăng ký một email mới, xác thực token được tạo, và xác nhận account chuyển trạng thái từ `pending` sang `active`.

### Kiểm thử cho User Story 1 (Tests for User Story 1)

- [x] T015 [P] [US1] Thêm các bài test happy-path và duplicate-email cho quá trình đăng ký trong `backend/tests/unit/services/auth.reg.test.js`
- [x] T016 [P] [US1] Thêm các bài test cho verification token hợp lệ/đã dùng/hết hạn trong `backend/tests/unit/services/auth.verify.test.js`
- [x] T017 [P] [US1] Thêm các bài test cho register controller validation trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T018 [P] [US1] Thêm các bài test cho register form validation trong `frontend/tests/components/auth/RegisterForm.test.jsx`
- [x] T019 [P] [US1] Thêm các bài test cho trang verify email trong `frontend/tests/components/auth/VerifyEmailPage.test.jsx`

### Triển khai cho User Story 1 (Implementation for User Story 1)

- [x] T020 [US1] Đảm bảo `register` sử dụng thông báo duplicate-account chung và tạo tài khoản student dạng pending trong `backend/src/services/auth.service.js`
- [x] T021 [US1] Đảm bảo các verification tokens được băm (hashed), có hết hạn, và đánh dấu là đã dùng (used) trong `backend/src/db/queries/tokens.queries.js`
- [x] T022 [US1] Đảm bảo các validators của đăng ký và xác thực tuân thủ quy tắc email/mật khẩu/tên trong `backend/src/controllers/auth.controller.js`
- [x] T023 [US1] Đảm bảo gửi email xác thực không chứa mật khẩu/bí mật và dựa trên cấu hình môi trường trong `backend/src/utils/email.util.js`
- [x] T024 [US1] Đảm bảo form register chặn nếu xác nhận mật khẩu (password confirmation) không khớp trong `frontend/src/components/auth/RegisterForm.jsx`
- [x] T025 [US1] Đảm bảo trang verify email xử lý các trạng thái thành công, hết hạn và invalid token trong `frontend/src/pages/auth/VerifyEmailPage.jsx`

**Cột mốc**: US1 hỗ trợ việc tạo và kích hoạt tài khoản một cách độc lập.

---

## Giai đoạn 4: User Story 2 - Đăng nhập và Đi tới đúng Không gian làm việc (Priority: P1)

**Mục tiêu**: Active users có thể đăng nhập an toàn, sessions được tạo ra, và frontend điều hướng người dùng đúng theo role.

**Kiểm thử Độc lập**: Đăng nhập dưới tư cách student, tutor, và admin; xác nhận mỗi người dùng truy cập đúng workspace và thông tin sai (bad credentials) không làm lộ việc account có tồn tại hay không.

### Kiểm thử cho User Story 2

- [x] T026 [P] [US2] Thêm các bài test cho login hợp lệ/không hợp lệ/bị khóa trong `backend/tests/unit/services/auth.login.test.js`
- [x] T027 [P] [US2] Thêm các bài test khóa (lockout) khi thử sai nhiều lần trong `backend/tests/unit/services/auth.verifyLogin.test.js`
- [x] T028 [P] [US2] Thêm các bài test cho giới hạn session và thu hồi (revoke) session cũ nhất trong `backend/tests/unit/services/auth.login.test.js`
- [x] T029 [P] [US2] Thêm các bài test cookie/envelope của login controller trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T030 [P] [US2] Thêm các bài test về role redirect trong `frontend/tests/components/auth/LoginForm.test.jsx`
- [x] T031 [P] [US2] Thêm các bài test về protected route redirect trong `frontend/tests/components/auth/ProtectedRoute.test.jsx`

### Triển khai cho User Story 2

- [x] T032 [US2] Đảm bảo login xác minh trạng thái active, trạng thái khóa, và các lỗi đăng nhập chung trong `backend/src/services/auth.service.js`
- [x] T033 [US2] Đảm bảo theo dõi các lần đăng nhập thất bại (failed login) và khôi phục về không khi login thành công qua parameterized queries trong `backend/src/db/queries/users.queries.js`
- [x] T034 [US2] Đảm bảo áp đặt tối đa 3 sessions (max-three-session) sẽ thu hồi session đang hoạt động cũ nhất trong `backend/src/db/queries/sessions.queries.js`
- [x] T035 [US2] Đảm bảo login controller thiết lập các secure cookies và chỉ trả về safe user data (không chứa mật khẩu) trong `backend/src/controllers/auth.controller.js`
- [x] T036 [US2] Đảm bảo AuthContext lưu trữ user state an toàn và cung cấp các phương thức login/logout/refreshUser trong `frontend/src/context/AuthContext.jsx`
- [x] T037 [US2] Đảm bảo LoginForm điều hướng (redirects) student/tutor/admin tới đúng workspace paths trong `frontend/src/components/auth/LoginForm.jsx`
- [x] T038 [US2] Đảm bảo ProtectedRoute điều hướng các roles không được uỷ quyền (unauthorized) mà không render nội dung được bảo vệ trong `frontend/src/components/auth/ProtectedRoute.jsx`

**Cột mốc**: US2 hỗ trợ truy cập có xác thực và điều hướng theo vai trò một cách độc lập.

---

## Giai đoạn 5: User Story 3 - Khôi phục hoặc Đổi Mật khẩu (Priority: P2)

**Mục tiêu**: Người dùng có thể khôi phục quyền truy cập qua reset email và đổi mật khẩu khi đang đăng nhập (authenticated).

**Kiểm thử Độc lập**: Yêu cầu khôi phục (reset) với bất kỳ email nào, khôi phục thành công với một token hợp lệ, từ chối token đã dùng/hết hạn, và đổi mật khẩu với mật khẩu hiện tại chính xác.

### Kiểm thử cho User Story 3

- [x] T039 [P] [US3] Thêm các bài test chống dò tìm account cho forgot-password trong `backend/tests/unit/services/auth.forgot-pwd.test.js`
- [x] T040 [P] [US3] Thêm các bài test reset token hợp lệ/hết hạn/đã dùng trong `backend/tests/unit/services/auth.reset.test.js`
- [x] T041 [P] [US3] Thêm các bài test việc sử dụng lại lịch sử mật khẩu trong `backend/tests/db/queries/pwd.queries.test.js`
- [x] T042 [P] [US3] Thêm các bài test change-password local và Google-only trong `backend/tests/unit/services/auth.reset.test.js`
- [x] T043 [P] [US3] Thêm các bài test form forgot/reset/change password trong `frontend/tests/components/auth/ForgotPwdForm.test.jsx`
- [x] T044 [P] [US3] Thêm các bài test reset password form trong `frontend/tests/components/auth/ResetPwdForm.test.jsx`

### Triển khai cho User Story 3

- [x] T045 [US3] Đảm bảo forgot-password luôn trả về phản hồi chung chung (generic response) và băm reset token trong `backend/src/services/auth.service.js`
- [x] T046 [US3] Đảm bảo reset-password từ chối các trường hợp token invalid, expired, used, và sử dụng lại mật khẩu gần đây trong `backend/src/services/auth.service.js`
- [x] T047 [US3] Đảm bảo việc cập nhật mật khẩu và chèn lịch sử (history) được thực hiện độc lập (atomically) khi yêu cầu trong `backend/src/db/queries/pwd.queries.js`
- [x] T048 [US3] Đảm bảo change-password từ chối tài khoản Google-only và các trường hợp nhập sai mật khẩu hiện tại trong `backend/src/services/auth.service.js`
- [x] T049 [US3] Đảm bảo reset/change validators yêu cầu chiều dài tối thiểu của mật khẩu trong `backend/src/controllers/auth.controller.js`
- [x] T050 [US3] Đảm bảo frontend forgot/reset forms hiển thị thông báo generic/specific đúng theo API contract trong `frontend/src/components/auth/ForgotPwdForm.jsx`
- [x] T051 [US3] Đảm bảo ChangePwdModal xử lý mismatch, mật khẩu quá ngắn, trạng thái thành công và các lỗi API trong `frontend/src/components/profile/ChangePwdModal.jsx`

**Cột mốc**: US3 có thể được kiểm thử độc lập mà không cần Google OAuth.

---

## Giai đoạn 6: User Story 4 - Tiếp tục với Google (Priority: P3)

**Mục tiêu**: Khách có thể xác thực thông qua Google, nhận được tài khoản/session cục bộ, và nhận lỗi rõ ràng khi provider xác thực không thành công.

**Kiểm thử Độc lập**: Bắt đầu đăng nhập Google, hoàn thành callback với thông tin provider hợp lệ, xác nhận đã tạo user/session cục bộ, và điều hướng theo vai trò (role-aware redirect).

### Kiểm thử cho User Story 4

- [x] T052 [P] [US4] Thêm các bài test Google redirect state cookie trong `backend/tests/unit/controllers/auth.controller.test.js`
- [x] T053 [P] [US4] Thêm các bài test Google callback success/failure trong `backend/tests/unit/services/auth.oauth.test.js`
- [x] T054 [P] [US4] Thêm các bài test OAuth account upsert trong `backend/tests/unit/db/queries/users.queries.test.js`
- [x] T055 [P] [US4] Thêm các bài test Google button rendering/navigation trong `frontend/tests/components/auth/LoginForm.test.jsx`

### Triển khai cho User Story 4

- [x] T056 [US4] Đảm bảo Google redirect xây dựng URL từ env config và thiết lập state cookie trong `backend/src/controllers/auth.controller.js`
- [x] T057 [US4] Đảm bảo Google callback kiểm tra (validates) state trước khi trao đổi code (exchanging code) trong `backend/src/controllers/auth.controller.js`
- [x] T058 [US4] Đảm bảo Google profile upsert tạo hoặc cập nhật các student accounts ở trạng thái active và link OAuth trong `backend/src/db/queries/users.queries.js`
- [x] T059 [US4] Đảm bảo OAuth login tạo các sessions với trường `is_oauth` và `oauth_provider` trong `backend/src/services/auth.service.js`
- [x] T060 [US4] Đảm bảo Google callback điều hướng (redirects) các trạng thái success/error về các tuyến (routes) trên frontend trong `backend/src/controllers/auth.controller.js`
- [x] T061 [US4] Đảm bảo nút Google login sử dụng `/api/v1/auth/google` và hiển thị các lỗi dễ dàng thử lại (retry-friendly errors) trong `frontend/src/components/auth/GoogleLoginButton.jsx`

**Cột mốc**: US4 thêm tính năng OAuth mà không làm thay đổi luồng hoạt động của đăng nhập email/mật khẩu.

---

## Giai đoạn 7: Trau chuốt (Polish) & Các Vấn đề Cắt ngang (Cross-Cutting Concerns)

**Mục đích**: Tính quản trị (Governance), tăng cường bảo mật, và validation đầy đủ cho tất cả các auth stories.

- [x] T062 [P] Xác minh không phản hồi auth nào làm lộ `password_hash`, reset tokens, verification tokens, hoặc session secrets trong `backend/src/controllers/auth.controller.js`
- [x] T063 [P] Xác minh các lỗi auth được đưa qua centralized handler mà không bị rò rỉ stack traces trong `backend/src/middleware/errorHandler.js`
- [x] T064 [P] Xác minh auth rate limiters được áp dụng lên login, register, và forgot password trong `backend/src/routes/api/v1/auth.routes.js`
- [x] T065 Chạy các backend auth tests và lưu lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-auth/tasks.md`
- [x] T066 Chạy các frontend auth tests và lưu lại kết quả vào `.sdd/specs/feat-auth-and-users/feat-auth/tasks.md`
- [x] T067 Thực thi các kịch bản quickstart và cập nhật kết quả trong `.sdd/specs/feat-auth-and-users/feat-auth/quickstart.md`
- [x] T068 [P] Triển khai tính năng ẩn/hiện mật khẩu (password visibility toggle hook) tái sử dụng trong `frontend/src/hooks/usePasswordToggle.js` và áp dụng cho toàn bộ auth forms

---

## Phụ thuộc & Thứ tự Thực thi (Dependencies & Execution Order)

### Phụ thuộc theo Giai đoạn (Phase Dependencies)

- Giai đoạn 1 không có sự phụ thuộc nào.
- Giai đoạn 2 phụ thuộc vào Giai đoạn 1 và đóng vai trò chặn (blocks) tất cả các user stories.
- US1 và US2 đều là P1; US1 là luồng (path) MVP đưa người dùng vào nền tảng.
- US3 phụ thuộc vào hạ tầng nền tảng (foundational token/password infrastructure).
- US4 phụ thuộc vào hạ tầng nền tảng (foundational session infrastructure).
- Giai đoạn 7 phụ thuộc vào tất cả các user stories đã chọn.

### Phụ thuộc theo User Story (User Story Dependencies)

- US1: không phụ thuộc vào story khác sau giai đoạn foundation.
- US2: không phụ thuộc vào story khác sau foundation, nhưng để login bằng tay yêu cầu một account đã được tạo (active) từ US1 hoặc từ dữ liệu mồi (seeded data).
- US3: không phụ thuộc vào story khác sau foundation, nhưng reset bằng tay yêu cầu cần có user account.
- US4: không phụ thuộc vào story khác sau foundation, nhưng sử dụng chung luồng session creation của US2.

### Các Cơ hội Thực thi Song song (Parallel Opportunities)

- T001-T005 có thể chạy song song.
- T011-T014 có thể chạy song song sau khi xem xét lược đồ (schema review).
- Các task test bên trong mỗi story có nhãn `[P]` có thể chạy song song.
- US3 và US4 có thể được triển khai song song sau khi US1/US2 đủ ổn định (cung cấp chung nền tảng auth/session).

## Ví dụ Song song (Parallel Example): User Story 1

```text
Task: "Add registration happy-path and duplicate-email tests in backend/tests/unit/services/auth.reg.test.js"
Task: "Add verification token valid/used/expired tests in backend/tests/unit/services/auth.verify.test.js"
Task: "Add register form validation tests in frontend/tests/components/auth/RegisterForm.test.jsx"
```

## Chiến lược Triển khai (Implementation Strategy)

### Theo Cấp độ Cơ bản Nhất (MVP First)

1. Hoàn tất Giai đoạn 1 và Giai đoạn 2.
2. Hoàn tất đăng ký (registration)/xác thực (verification) của US1.
3. Kiểm tra tính năng kích hoạt account độc lập.

### Giao hàng Theo đợt (Incremental Delivery)

1. Bàn giao tính năng tạo account US1.
2. Bàn giao tính năng đăng nhập/phiên (login/session/role navigation) US2.
3. Bàn giao tính năng khôi phục/đổi mật khẩu US3.
4. Bàn giao tính năng Google login US4.

### Ghi chú (Notes)

- Mọi task đều kèm theo đường dẫn file (file path) và tuân theo định dạng checklist format.
- Không trả về secrets hoặc raw token values qua API responses.
- Không sử dụng ORM; chỉ sử dụng `pg` parameterized SQL.
