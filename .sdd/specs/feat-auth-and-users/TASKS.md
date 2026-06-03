# Danh sách Tasks: Identity & Access Management (feat-auth-and-users)

**Dựa trên:** `SPEC.md`, `PLAN.md`, `AGENTS.md`, `CLAUDE.md` và `constitution.md`.
**Quy định:** Mỗi task ≤ 4 giờ, implement độc lập, format bảng Markdown chi tiết tối đa.

## Phase 1: Database Setup & Migration (Raw SQL `pg`)
*Luật (constitution): Bắt buộc dùng parameterized queries ($1, $2), không dùng ORM.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---|---|---|---|
| **T001** | Khởi tạo Project & Cấu hình DB Pool | `backend/src/config/database.js`<br>`backend/src/db/pool.js` | 1 | None | NFR - Database | Setup package `pg`. Khởi tạo connection pool với max 20 connections. Test `SELECT NOW()` thành công. |
| **T002** | Migration: Enum Types | `backend/src/db/migrations/001_create_enums.sql` | 1 | T001 | SPEC §6 | Tạo các Enum: `user_role`, `account_status`, `password_change_reason`, `log_action`. |
| **T003** | Migration: Bảng `users` | `backend/src/db/migrations/002_create_users.sql` | 1.5 | T002 | SPEC §6 | Bảng `users` (id UUID, password_hash, target_band_score, failed_login_attempts, locked_until). |
| **T004** | Migration: Bảng `user_sessions` | `backend/src/db/migrations/003_create_sessions.sql` | 1 | T003 | SPEC §6 | Bảng `user_sessions` (session_token, ip, user_agent, revoked_at, expires_at). FK tới users. |
| **T005** | Migration: Bảng `password_history` | `backend/src/db/migrations/004_create_pwd_history.sql` | 1 | T003 | SPEC §6 | Bảng `password_history` (hash, reason, changed_from_ip). |
| **T006** | Migration: Token Tables | `backend/src/db/migrations/005_create_tokens.sql` | 1 | T003 | SPEC §6 | Bảng `email_verification_tokens` và `password_reset_tokens` (token_hash, used_at). |
| **T007** | Migration: Bảng `audit_logs` | `backend/src/db/migrations/006_create_audit_logs.sql` | 1 | T003 | SPEC §6 | Bảng `audit_logs` với `old_value`, `new_value` kiểu JSONB, `ip_address` kiểu INET. |
| **T008** | Migration: Procedure `handle_failed_login` | `backend/src/db/migrations/007_create_fail_login.sql` | 1.5 | T003 | SPEC §6 | DB Function cộng dồn attempts, set `status='inactive'` và `locked_until` nếu sai >= 5 lần. |
| **T009** | Migration: Procedure `handle_successful_login` | `backend/src/db/migrations/008_create_succ_login.sql` | 1.5 | T008 | SPEC §6 | DB Function reset `failed_login_attempts` về 0, cập nhật `last_login_at`. |
| **T010** | Viết Queries: Users | `backend/src/db/queries/users.queries.js` | 2 | T009 | PLAN §2.5 | Hàm findUserByEmail, findUserById, createUser, updateProfile, updateRole, updateStatus. |
| **T011** | Viết Queries: Sessions | `backend/src/db/queries/sessions.queries.js` | 2 | T009 | PLAN §2.4 | Hàm createSession, findActiveSession, revokeSession, countActiveSessions, revokeOldestSession. |
| **T012** | Viết Queries: Tokens & History | `backend/src/db/queries/tokens.queries.js`<br>`backend/src/db/queries/pwd.queries.js` | 2 | T009 | PLAN §2.4 | Hàm CRUD cho verification tokens, reset tokens. Hàm lấy 3 password hashes gần nhất. |
| **T013** | Viết Queries: Audit Logs | `backend/src/db/queries/audit.queries.js` | 1.5 | T009 | PLAN §2.5 | Hàm insertAuditLog (lưu JSONB), listAuditLogs (phân trang). |

## Phase 2: Utilities & Core Services
*Luật: Dùng bcrypt (cost factor = 12) cho mật khẩu, SHA-256 cho OTP. Error throw qua AppError, Không parse HTTP Request ở tầng này.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---|---|---|---|
| **T014** | Cấu hình Redis Client | `backend/src/config/redis.js` | 1.5 | None | PLAN §4 | Kết nối Redis. Thêm fallback error handling (nếu Redis down vẫn chạy DB trực tiếp). |
| **T015** | Implement HashUtil | `backend/src/utils/password.util.js` | 1.5 | None | Ubiquitous | Cài đặt `bcrypt`. Viết hàm `hashPassword(pwd)` (cost=12) và `verifyPassword`. Viết hàm `hashOTP(otp)` bằng SHA-256. |
| **T016** | Implement TokenUtil | `backend/src/utils/token.util.js` | 1.5 | None | PLAN §2.2 | Viết sign/verify JWT cho Access (15m) & Refresh (7d). Hàm gen opaque token random. |
| **T017** | Implement EmailUtil | `backend/src/utils/email.util.js` | 2 | None | PLAN §2.3 | Cấu hình `nodemailer` SMTP. Set timeout 5s. Gửi mail async kèm try-catch. |
| **T017b**| Implement AuditLogService | `backend/src/services/audit.service.js`| 1.5 | T013 | Ubiquitous | Hàm `logAction(actor_id, action, target_table, target_id, old_value, new_value, ip_address)`. Chỉ thực hiện insert DB (bảng audit_logs). |
| **T018** | Service Auth: Register | `backend/src/services/auth.service.js` | 2.5 | T010, T012, T015-T017 | Event-driven | Chống enumerate. Hash password (bcrypt), lưu DB `pending`, gửi verification email. |
| **T019** | Service Auth: Verify Email | `backend/src/services/auth.service.js` | 1.5 | T012, T016 | Event-driven | Check hash token trong DB, kiểm tra `expires_at`. Activate user và mark token as used. |
| **T020** | Service Auth: Login (Verify) | `backend/src/services/auth.service.js` | 2.5 | T010, T015 | Unwanted | Find user, verify bcrypt hash. Gọi DB proc `handle_failed_login` / `handle_successful_login`. Check khóa account. |
| **T021** | Service Auth: Login (Sessions)| `backend/src/services/auth.service.js` | 2 | T011, T016 | Event-driven | Max 3 sessions: auto-revoke oldest. Tạo JWT tokens. Trả về `SafeUser` (xóa cột hash). |
| **T022** | Service Auth: Logout | `backend/src/services/auth.service.js` | 1 | T011, T014 | Event-driven | Gọi DB revokeSession, xóa Redis session key. |
| **T023** | Service Auth: Refresh Token | `backend/src/services/auth.service.js` | 2 | T010, T011, T016 | Event-driven | Verify refresh token, check session DB, sinh Access Token mới. |
| **T024** | Service Auth: Forgot Password | `backend/src/services/auth.service.js` | 1.5 | T010, T012, T015, T017 | Event-driven | Chống enumerate. Sinh OTP 6 số, hash bằng SHA-256 lưu DB. Gửi OTP thô qua email. |
| **T025** | Service Auth: Reset Password | `backend/src/services/auth.service.js` | 2.5 | T010, T012, T015, T017b| Unwanted | Verify OTP 6 số. Check 3 bcrypt hashes cũ -> chặn trùng. Update pass, ghi `password_history`. Gọi AuditLogService. |
| **T026** | Service Auth: Google OAuth | `backend/src/services/auth.service.js` | 2.5 | T010, T011, T016 | PLAN §3 | Upsert user (Google Profile) cho phép `password_hash = NULL`. Sinh Session & Tokens. |
| **T027** | Service User: Profile | `backend/src/services/users.service.js` | 1.5 | T010 | Event-driven | getProfile() và updateProfile(). Validate `target_band_score` chuẩn bước 0.5. |
| **T028** | Service User: Admin List | `backend/src/services/users.service.js` | 1.5 | T010 | Event-driven | listUsers() hỗ trợ pagination (page/limit). |
| **T029** | Service User: Admin Role/Status| `backend/src/services/users.service.js` | 2.5 | T010, T011, T017b| Event-driven | Cập nhật role/status. Check `actor_id != target_id`. Tự động revoke toàn bộ sessions của User bị đổi quyền. Gọi AuditLogService. |

## Phase 3: Middleware, Controllers & API Routes
*Luật: Controller xử lý Response format: `{ success, data, error, meta }`. Không dùng console.log.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---|---|---|---|
| **T030** | Cấu hình Centralized Error Handler | `backend/src/middleware/errorHandler.js` | 2 | None | CLAUDE.md | Middleware bắt lỗi tập trung (winston/pino). Map HTTP Status (400,401,403,404,429,500). Ẩn stack trace. |
| **T031** | Middleware: Authenticate | `backend/src/middleware/authenticate.js` | 2.5 | T014, T016 | State-driven | Đọc JWT từ Cookie. Check Redis cache. Fallback query `v_active_sessions`. Chặn nếu `must_change_password`. |
| **T032** | Middleware: Authorize | `backend/src/middleware/authorize.js` | 1 | T031 | State-driven | Factory `authorize('admin')`. Trả 403 `AUTH_PERM_001` nếu sai role. |
| **T033** | Middleware: Rate Limit | `backend/src/middleware/rateLimit.js` | 1.5 | None | NFR | Limit 20 req/min cho `/login` per IP. Trả HTTP 429 khi vi phạm. |
| **T034** | Controller Auth: Reg & Verify | `backend/src/controllers/auth.controller.js` | 1.5 | T018, T019, T030 | API Contracts | Wrap services, parse body (express-validator). Trả 201 và 200. |
| **T035** | Controller Auth: Login/Out/Refresh | `backend/src/controllers/auth.controller.js` | 2.5 | T020-T023 | API Contracts | Set HttpOnly + Secure cookies cho access (15m) & refresh (7d). Clear cookies khi logout. |
| **T036** | Controller Auth: Forgot/Reset | `backend/src/controllers/auth.controller.js` | 1.5 | T024, T025 | API Contracts | Nhận body. Trả format `{ success: true, message: "..." }`. |
| **T037** | Controller Auth: Google OAuth | `backend/src/controllers/auth.controller.js` | 1.5 | T026 | PLAN §3 | Redirect URL Google và Callback endpoint để set Cookies. |
| **T038** | Controller User: Profile | `backend/src/controllers/users.controller.js` | 1.5 | T027 | API Contracts | Đọc `req.user.id`, trả JSON. |
| **T039** | Controller Admin: Users Mgmt | `backend/src/controllers/admin.controller.js` | 2.5 | T028, T029 | API Contracts | Lấy filters từ query params. Pass xuống Service. Trả JSON kèm `meta` pagination. |
| **T040** | Khởi tạo & Đăng ký API Routes | `backend/src/routes/*.js` | 2.5 | T031-T039 | API Contracts | Tạo Router express. Gắn middlewares `rateLimit`, `authenticate`, `authorize` đúng các endpoints. |

## Phase 4: Frontend Implementation (React + Vite)
*Luật: Components viết bằng PascalCase. Style dùng Bootstrap 5.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---|---|---|---|
| **T041** | Setup Axios Interceptors | `frontend/src/services/api.js` | 2 | T035 | Unwanted | Cấu hình `withCredentials: true`. Bắt lỗi 401 tự động call API `/refresh` rồi retry. |
| **T042** | Auth Context & Hooks | `frontend/src/context/AuthContext.jsx` | 2.5 | T041 | State-driven | Global context `user`, `isAuthenticated`. Các hàm login/logout cập nhật context. |
| **T043** | Layout: Auth Wrapper | `frontend/src/components/layout/AuthLayout.jsx` | 1 | None | N/A | Component căn giữa màn hình cho các trang đăng nhập/đăng ký. |
| **T043b** | Page: Landing Page (UI Only) | `frontend/src/pages/LandingPage.jsx` | 2 | None | USER-01/07 | Xây dựng giao diện giới thiệu nền tảng IELTS (Không gọi API). Bắt buộc có nút Call-to-Action (CTA) điều hướng rõ ràng sang /login và /register. |
| **T044** | Component: Login Form | `frontend/src/components/auth/LoginForm.jsx` | 2.5 | T042, T043 | USER-05 | UI đăng nhập. Hiển thị thông báo khi dính lỗi `AUTH_LOG_002` (khóa tài khoản). |
| **T045** | Component: Register Form | `frontend/src/components/auth/RegisterForm.jsx` | 2 | T042, T043 | USER-03 | Form có validate re-type password. Báo alert success khi gửi mail xong. |
| **T046** | Component: Forgot Pwd Form | `frontend/src/components/auth/ForgotPwdForm.jsx` | 1.5 | T042, T043 | USER-06 | Gửi yêu cầu reset. Báo thành công giả (chống enumerate). |
| **T047** | Component: Reset Pwd Form | `frontend/src/components/auth/ResetPwdForm.jsx` | 2.5 | T042, T043 | USER-06 | Parsing query params `?token=`. Validate độ mạnh pass mới. Redirect login sau khi xong. |
| **T048** | Page: User Profile | `frontend/src/pages/UserProfilePage.jsx` | 2.5 | T042 | USER-09 | Form hiển thị info. Cập nhật `target_band_score` với Select option bước 0.5. |
| **T049** | Page: Admin Dashboard UI | `frontend/src/pages/AdminDashboard.jsx` | 3 | T042 | ADM-02 | Bảng danh sách Users kèm Pagination (trang trí bằng Bootstrap Table). |
| **T050** | Component: Admin Action Modals | `frontend/src/components/admin/UserModals.jsx` | 2.5 | T049 | ADM-03/04 | Modal Dialog đổi Role/Status. Submit thay đổi gọi API. Chặn hiển thị nút với dòng của chính admin. |

## Phase 5: Testing & Quality Assurance
*Luật: Coverage ≥ 85%. Không gọi real SMTP/Anthropic trong test.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---|---|---|---|
| **T051** | Unit Test: Utils | `tests/unit/utils/*.test.js` | 2 | T015-T017 | N/A | Test hash password đúng định dạng bcrypt. Test token generator. Mock email transporter. |
| **T052** | Unit Test: Service Auth (1) | `tests/unit/services/auth.reg.test.js` | 2.5 | T018-T019 | Event-driven | Mock DB query. Giả lập đăng ký trùng email (trả 200). Đăng ký thành công gọi util gửi mail. |
| **T053** | Unit Test: Service Auth (2) | `tests/unit/services/auth.login.test.js` | 3 | T020-T023 | Event-driven | Happy path login sinh Token. Test revoke oldest session khi devices >= 3. |
| **T054** | Unit Test: Service Admin | `tests/unit/services/users.test.js` | 2 | T027-T029 | Event-driven | Chặn đổi role cho user không tồn tại, chặn tự khóa account bản thân. Test audit log insert args. |
| **T055** | Integration Test: Registration | `tests/integration/auth.reg.test.js` | 3 | T040 | Event-driven | Gọi route API thật, chạy với test DB. Flow từ Register tới Verify Token -> account `active`. |
| **T056** | Integration Test: Brute-Force | `tests/integration/auth.lock.test.js` | 3 | T040 | Unwanted | Submit sai 5 lần liên tiếp. Đảm bảo API thứ 6 nhận HTTP 429 và user ở trạng thái khóa. |
| **T057** | Integration Test: Auth Middlewares| `tests/integration/auth.mid.test.js` | 2 | T040 | State-driven | Gửi request API bằng JWT rỗng/hết hạn. Truy cập route Admin với role student. |
| **T058** | Test Coverage Check | `package.json` | 1 | T051-T057 | NFR | Chạy command check coverage đạt ≥ 85% toàn bộ Auth module. |