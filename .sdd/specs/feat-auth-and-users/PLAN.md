# Implementation Plan: Identity & Access Management (feat-auth-and-users)

**Status:** DRAFT — Awaiting Tech Lead Review
**Linked Spec:** `.sdd/specs/feat-auth-and-users/SPEC.md` (APPROVED, Risk: High)
**Sprint:** Sprint 1 — Foundation
**Date:** 2026-06-01

---

## 1. ARCHITECTURAL APPROACH

- **Layered Architecture:** Tuân thủ mô hình Route → Controller → Service → DB Query (raw `pg`). Tuyệt đối không dùng ORM.
- **Security & Session Strategy:** Stateless JWT (Access Token 15m, Refresh Token 7d) kết hợp Stateful Session Validation. Tokens lưu trong **HttpOnly + Secure + SameSite=Strict** cookies. Trạng thái session kiểm tra qua Redis (fallback → bảng `user_sessions`).
- **Brute-force Control:** Giao phó hoàn toàn cho DB functions `handle_failed_login()` / `handle_successful_login()` để đảm bảo tính atomic, tránh race condition ở application layer.
- **OAuth-Readiness:** `users.password_hash` cho phép NULL (SPEC §6) để sẵn sàng cho OAuth provider (Google). Google OAuth flow được thiết kế ngay trong Sprint 1, **kích hoạt ở Sprint 2**.
- **Standardized Responses:** Mọi API response tuân thủ format `{ success, data, error, meta }`. Lỗi xử lý tập trung tại `src/backend/middleware/errorHandler.js`.

---

## 2. COMPONENTS & INTERFACE

### 2.1 `HashUtil` — `src/backend/src/utils/password.util.js`

> Utility thuần — không phụ thuộc DB, không phụ thuộc HTTP.

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `hashPassword(plaintext)` | `plaintext: string` | `Promise<string>` (bcrypt hash) | Thuật toán: **bcrypt**, cost factor = **12** (team decision 2026-06-02) |
| `verifyPassword(plaintext, hash)` | `plaintext: string`, `hash: string` | `Promise<boolean>` | Trả `false` nếu hash không hợp lệ, không throw |
| `hashOTP(rawToken)` | `rawToken: string` | `string` (hex) | Thuật toán: **SHA-256** via `crypto.createHash('sha256')`. Dùng cho email verification & password reset tokens |

---

### 2.2 `TokenUtil` — `src/backend/src/utils/token.util.js`

> Utility thuần — sign/verify JWT, không có side effects.

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `generateAccessToken(payload)` | `payload: { sub: string, role: user_role, session_token: string }` | `string` (JWT, exp 15 phút) | Ký bằng `JWT_SECRET` |
| `generateRefreshToken(payload)` | `payload: { sub: string, session_token: string }` | `string` (JWT, exp 7 ngày) | Ký bằng `JWT_REFRESH_SECRET` |
| `verifyAccessToken(token)` | `token: string` | `{ sub, role, session_token, iat, exp } \| null` | Trả `null` nếu invalid/expired, không throw |
| `verifyRefreshToken(token)` | `token: string` | `{ sub, session_token, iat, exp } \| null` | Trả `null` nếu invalid/expired, không throw |
| `generateOpaqueToken()` | _(none)_ | `{ raw: string }` | `raw` = `crypto.randomUUID()`. Caller tự gọi `HashUtil.hashOTP(raw)` để lấy `hashed` trước khi lưu DB |

---

### 2.3 `EmailUtil` — `src/backend/src/utils/email.util.js`

> Wrapper cho SMTP/SendGrid. Bắt buộc `try-catch` — email failure KHÔNG được crash request.

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `sendVerificationEmail(to, rawToken)` | `to: string`, `rawToken: string` | `Promise<void>` | Ném `EmailDeliveryError` nếu SMTP fail sau timeout 5s |
| `sendPasswordResetEmail(to, rawToken)` | `to: string`, `rawToken: string` | `Promise<void>` | Link dạng `FRONTEND_URL/reset-password?token={rawToken}` |
| `sendGoogleWelcomeEmail(to, fullName)` | `to: string`, `fullName: string` | `Promise<void>` | Dùng khi user đăng ký lần đầu qua Google OAuth |

---

### 2.4 `AuthQueries` — `src/backend/src/db/queries/auth.queries.js`

> Raw SQL với parameterized query ($1, $2). Mọi function nhận `pool` làm tham số đầu tiên.

| Function | Input | Output | SQL target |
|----------|-------|--------|------------|
| `findUserByEmail(pool, email)` | `email: string` | `User \| null` | `SELECT * FROM users WHERE email = $1` |
| `findUserById(pool, userId)` | `userId: string` | `User \| null` | `SELECT * FROM users WHERE id = $1` |
| `createUser(pool, data)` | `{ email, password_hash\|null, full_name }` | `{ id: string }` | `INSERT INTO users ... RETURNING id` |
| `activateUser(pool, userId)` | `userId: string` | `void` | `UPDATE users SET status = 'active' WHERE id = $1` |
| `createVerificationToken(pool, data)` | `{ user_id, token_hash, expires_at }` | `{ id: string }` | `INSERT INTO email_verification_tokens` |
| `findVerificationToken(pool, tokenHash)` | `tokenHash: string` | `{ id, user_id, expires_at, used_at } \| null` | SELECT + check `used_at IS NULL` |
| `markVerificationTokenUsed(pool, tokenId)` | `tokenId: string` | `void` | `UPDATE ... SET used_at = NOW()` |
| `createSession(pool, data)` | `{ user_id, session_token, ip_address, user_agent, expires_at }` | `{ id: string }` | `INSERT INTO user_sessions` |
| `findActiveSession(pool, sessionToken)` | `sessionToken: string` | `Session \| null` | SELECT WHERE `revoked_at IS NULL AND expires_at > NOW()` |
| `revokeSession(pool, sessionToken)` | `sessionToken: string` | `void` | `UPDATE user_sessions SET revoked_at = NOW()` |
| `countActiveSessions(pool, userId)` | `userId: string` | `number` | `SELECT COUNT(*) FROM v_active_sessions WHERE user_id = $1` |
| `revokeOldestSession(pool, userId)` | `userId: string` | `void` | UPDATE session có `last_active_at` nhỏ nhất |
| `createPasswordResetToken(pool, data)` | `{ user_id, token_hash, expires_at }` | `{ id: string }` | `INSERT INTO password_reset_tokens` |
| `findPasswordResetToken(pool, tokenHash)` | `tokenHash: string` | `{ id, user_id, expires_at, used_at } \| null` | SELECT + check `used_at IS NULL AND expires_at > NOW()` |
| `markResetTokenUsed(pool, tokenId)` | `tokenId: string` | `void` | `UPDATE ... SET used_at = NOW()` |
| `updatePasswordHash(pool, data)` | `{ user_id, new_hash, reason: password_change_reason, ip_address }` | `void` | UPDATE `users` + INSERT `password_history` |
| `getLastNPasswordHashes(pool, userId, n)` | `userId: string`, `n: number` | `string[]` | SELECT n hashes gần nhất từ `password_history` |
| `callHandleFailedLogin(pool, userId)` | `userId: string` | `void` | `SELECT handle_failed_login($1)` |
| `callHandleSuccessfulLogin(pool, userId)` | `userId: string` | `void` | `SELECT handle_successful_login($1)` |
| `upsertGoogleUser(pool, data)` | `{ google_id, email, full_name, avatar_url }` | `{ id, is_new: boolean }` | `INSERT ... ON CONFLICT (email) DO UPDATE` |

---

### 2.5 `UserQueries` — `src/backend/src/db/queries/users.queries.js`

| Function | Input | Output | SQL target |
|----------|-------|--------|------------|
| `updateUserProfile(pool, data)` | `{ user_id, full_name?, avatar_url?, target_band_score? }` | `User` | `UPDATE users SET ... WHERE id = $1 RETURNING *` |
| `listUsers(pool, filters)` | `{ page: number, limit: number, role?: user_role, status?: account_status }` | `{ rows: User[], total: number }` | Paginated SELECT với OFFSET/LIMIT |
| `updateUserRole(pool, data)` | `{ target_id, role: user_role }` | `User` | `UPDATE users SET role = $1 WHERE id = $2 RETURNING *` |
| `updateUserStatus(pool, data)` | `{ target_id, status: account_status }` | `User` | `UPDATE users SET status = $1 WHERE id = $2 RETURNING *` |
| `insertAuditLog(pool, data)` | `{ actor_id, target_id, action: log_action, old_value: object, new_value: object }` | `void` | `INSERT INTO audit_logs (old_value::jsonb, new_value::jsonb)` |

---

### 2.6 `AuthService` — `src/backend/src/services/auth.service.js`

> Business logic thuần — không có `req`/`res`. Throw `AppError` khi gặp lỗi.

| Method | Input | Output | Logic tóm tắt |
|--------|-------|--------|----------------|
| `register(data)` | `{ email, password, full_name }` | `{ message: string }` | Check email exists → hash → createUser (status=pending) → tạo token → sendVerificationEmail. Nếu email đã tồn tại: **silent return** (chống enumeration) |
| `verifyEmail(rawToken)` | `rawToken: string` | `{ message: string }` | SHA-256(raw) → findVerificationToken → check expiry → activateUser → markTokenUsed |
| `login(credentials, meta)` | `{ email, password }`, `{ ip, userAgent }` | `{ accessToken, refreshToken, user: SafeUser }` | findUser → check status/locked → verifyPassword → DB functions → session limit → createSession → generateTokens |
| `logout(sessionToken)` | `sessionToken: string` | `void` | revokeSession + xóa Redis key |
| `refreshToken(rawRefreshJwt)` | `rawRefreshJwt: string` | `{ accessToken: string }` | verifyRefreshToken → findActiveSession → check user.status=active → generateAccessToken |
| `forgotPassword(email)` | `email: string` | `{ message: string }` | findUser → nếu không tồn tại: **silent return 200** → tạo reset token (1h) → sendPasswordResetEmail |
| `resetPassword(data)` | `{ rawToken, newPassword, ip }` | `{ message: string }` | findResetToken → check expiry → check 3 password history → hash → updatePasswordHash → nếu status=inactive: activateUser → markTokenUsed |
| `loginWithGoogle(googleProfile)` | `{ google_id, email, full_name, avatar_url }` | `{ accessToken, refreshToken, user: SafeUser, is_new: boolean }` | upsertGoogleUser (password_hash=NULL) → createSession → generateTokens |
| `handleGoogleCallback(code, meta)` | `{ code: string }`, `{ ip, userAgent }` | _(gọi nội bộ loginWithGoogle)_ | Exchange code → fetch Google profile → loginWithGoogle |

> **SafeUser** = `User` object đã loại bỏ: `password_hash`, `failed_login_attempts`, `locked_until`.

---

### 2.7 `UserService` — `src/backend/src/services/users.service.js`

| Method | Input | Output | Logic tóm tắt |
|--------|-------|--------|----------------|
| `getProfile(userId)` | `userId: string` | `SafeUser` | findUserById → strip sensitive fields |
| `updateProfile(userId, data)` | `userId: string`, `{ full_name?, avatar_url?, target_band_score? }` | `SafeUser` | Validate `target_band_score` ∈ [0.0, 9.0] bội số 0.5 → updateUserProfile |
| `listUsers(actorRole, filters)` | `actorRole: user_role`, `{ page, limit, role?, status? }` | `{ users: SafeUser[], total, page, limit }` | Guard actorRole=admin → listUsers query |
| `changeUserRole(actorId, targetId, role)` | `actorId: string`, `targetId: string`, `role: user_role` | `SafeUser` | Guard `actorId !== targetId` → updateUserRole → insertAuditLog |
| `changeUserStatus(actorId, targetId, status)` | `actorId: string`, `targetId: string`, `status: account_status` | `SafeUser` | Guard `actorId !== targetId` → updateUserStatus → insertAuditLog |

---

### 2.8 `AuthMiddleware` — `src/backend/src/middleware/authenticate.js`

| Function | Input | Output | Logic |
|----------|-------|--------|-------|
| `authenticate` (Express middleware) | `req, res, next` | `void` | 1. Đọc `access_token` cookie → 2. `verifyAccessToken()` → 3. Redis HGET `session:{token}` → 4. DB fallback `findActiveSession()` → 5. Check `must_change_password` → 6. Gán `req.user = { id, role, session_token }` |
| `authorize(requiredRole)` | `requiredRole: user_role \| user_role[]` | Express middleware | So sánh `req.user.role` với `requiredRole`. Throw HTTP 403 `AUTH_PERM_001` nếu không đủ quyền |

---

### 2.9 `AuthController` — `src/backend/src/controllers/auth.controller.js`

> Chỉ parse HTTP, gọi Service, set Cookie, format response. Không có business logic.

| Handler | Method & Path | Cookie Action | Response |
|---------|--------------|---------------|----------|
| `register` | `POST /api/v1/auth/register` | — | `201 { message }` |
| `verifyEmail` | `POST /api/v1/auth/verify-email` | — | `200 { message }` |
| `login` | `POST /api/v1/auth/login` | Set `access_token` (15m) + `refresh_token` (7d) | `200 { user: SafeUser }` |
| `logout` | `POST /api/v1/auth/logout` | Clear cả 2 cookies | `204` |
| `refresh` | `POST /api/v1/auth/refresh` | Set mới `access_token` (15m) | `200 {}` |
| `forgotPassword` | `POST /api/v1/auth/forgot-password` | — | `200 { message }` |
| `resetPassword` | `PUT /api/v1/auth/reset-password` | — | `200 { message }` |
| `googleRedirect` | `GET /api/v1/auth/google` | — | Redirect tới Google OAuth URL |
| `googleCallback` | `GET /api/v1/auth/google/callback` | Set `access_token` + `refresh_token` | Redirect tới Frontend dashboard |

**Cookie config chuẩn (bắt buộc):**

```
httpOnly: true  |  secure: true  |  sameSite: 'strict'
access_token:  maxAge = 15 * 60 * 1000              (15 phút)
refresh_token: maxAge = 7 * 24 * 60 * 60 * 1000     (7 ngày)
```

---

### 2.10 Frontend Components

| Component | Interface (Props / Context) | Trách nhiệm |
|-----------|----------------------------|-------------|
| `AuthContext` | `{ user, isLoading, login(), logout(), refreshUser() }` | Global auth state, expose qua `useAuth()` hook |
| `AxiosInstance` | config: `withCredentials: true`, interceptor on 401 | Auto-retry với `/refresh` khi nhận 401 |
| `LoginForm` | props: `onSuccess: (user) => void` | Form email/password, hiển thị lỗi `AUTH_LOG_001`/`AUTH_LOG_002` |
| `RegisterForm` | props: `onSuccess: () => void` | Form đăng ký, hiển thị thông báo "check email" |
| `ForgotPasswordForm` | props: none | Input email, luôn hiển thị success (chống enumeration phía UI) |
| `ResetPasswordForm` | props: `token: string` (from URL) | Input mật khẩu mới, validate real-time |
| `GoogleOAuthButton` | props: `label?: string` | Redirect tới `/api/v1/auth/google` |
| `UserProfilePage` | props: `userId: string` | Form cập nhật profile, validate `target_band_score` |
| `AdminUsersDashboard` | props: none | Bảng user có filter + pagination, action buttons |

---

## 3. DATA FLOW (Luồng dữ liệu)

### Flow 1: Registration & Email Verification

```
Client  POST /register  { email, password, full_name }
  → RateLimit (10 req/min per IP)
  → AuthController.register()
  → AuthService.register()
      ├─ findUserByEmail()
      │   └─ EXISTS → silent return 200  (không throw — chống email enumeration)
      ├─ hashPassword()  →  Argon2id hash
      ├─ createUser()    →  status='pending', role='student'
      ├─ generateOpaqueToken()  →  { raw, hashed }
      ├─ createVerificationToken(hashed, expires_at = NOW() + 24h)
      └─ sendVerificationEmail(email, raw)  →  [SMTP]
  ← Response: 201 { message: "Kiểm tra email để xác thực tài khoản" }

Client click link  →  POST /verify-email  { token: raw }
  → AuthService.verifyEmail(raw)
      ├─ SHA-256(raw)  →  tokenHash
      ├─ findVerificationToken(tokenHash)
      │   ├─ used_at IS NOT NULL  →  HTTP 400
      │   └─ expires_at < NOW()   →  HTTP 400
      ├─ activateUser(user_id)    →  status='active'
      └─ markVerificationTokenUsed(tokenId)
  ← Response: 200 { message: "Tài khoản đã được xác thực" }
```

---

### Flow 2: Email/Password Login & Session Control

```
Client  POST /login  { email, password }
  → RateLimit (20 req/min per IP)
  → AuthController.login()
  → AuthService.login({ email, password }, { ip, userAgent })
      ├─ findUserByEmail()
      │   └─ NOT FOUND  →  HTTP 401  AUTH_LOG_001  (generic message)
      ├─ check user.status: 'pending' | 'banned'  →  HTTP 401
      ├─ check locked_until > NOW()  →  HTTP 429  AUTH_LOG_002
      ├─ verifyPassword(input, user.password_hash)
      │   ├─ [FAIL]  callHandleFailedLogin(userId)
      │   │           ├─ failed_attempts >= 5  →  HTTP 429  AUTH_LOG_002
      │   │           └─ ngược lại            →  HTTP 401  AUTH_LOG_001
      │   └─ [SUCCESS]  callHandleSuccessfulLogin(userId)
      ├─ countActiveSessions() >= 3  →  revokeOldestSession()
      ├─ createSession({ session_token = UUID, ip, userAgent, expires_at = +7d })
      ├─ generateAccessToken({ sub, role, session_token })
      └─ generateRefreshToken({ sub, session_token })
  → AuthController:  Set-Cookie access_token (15m) + refresh_token (7d)
  ← Response: 200 { data: { user: SafeUser } }
```

---

### Flow 3: Token Refresh

```
Client  POST /refresh  [Cookie: refresh_token]
  → AuthService.refreshToken(refreshJwt)
      ├─ verifyRefreshToken()  →  null  →  HTTP 401  AUTH_SES_001
      ├─ findActiveSession(session_token)  →  null / revoked  →  HTTP 401
      ├─ findUserById(sub)  →  status !== 'active'  →  HTTP 401
      └─ generateAccessToken({ sub, role, session_token })
  → Set-Cookie: access_token (15m)
  ← Response: 200 {}
```

---

### Flow 4: Protected Route Authorization

```
Client  [bất kỳ request có auth]  + Cookie: access_token
  → authenticate middleware
      ├─ verifyAccessToken(token)  →  null  →  HTTP 401
      ├─ Redis HGET "session:{session_token}:revoked"
      │   ├─ [HIT = true]  →  HTTP 401
      │   └─ [MISS]  →  findActiveSession() từ PostgreSQL
      │       ├─ revoked_at IS NOT NULL  →  HTTP 401  (cache vào Redis)
      │       ├─ expires_at < NOW()      →  HTTP 401
      │       └─ user.status !== 'active'→  HTTP 403
      ├─ must_change_password === true
      │   └─ block mọi route ngoại trừ /change-password  →  HTTP 403
      └─ req.user = { id, role, session_token }  →  next()
  → authorize('admin') middleware  [chỉ với admin routes]
      └─ req.user.role !== 'admin'  →  HTTP 403  AUTH_PERM_001
```

---

### Flow 5: OTP Password Reset (Email Token)

```
Client  POST /forgot-password  { email }
  → RateLimit (5 req/min per IP)
  → AuthService.forgotPassword(email)
      ├─ findUserByEmail()
      │   └─ NOT FOUND  →  silent return 200  (chống email enumeration)
      ├─ generateOpaqueToken()  →  { raw, hashed }
      ├─ createPasswordResetToken(hashed, expires_at = NOW() + 1h)
      └─ sendPasswordResetEmail(email, raw)  →  [SMTP]
  ← Response: 200 { message: "Nếu email tồn tại, link reset đã được gửi" }

Client click link  →  Frontend form  →  PUT /reset-password  { token: raw, new_password }
  → AuthService.resetPassword({ rawToken, newPassword, ip })
      ├─ SHA-256(raw)  →  tokenHash
      ├─ findPasswordResetToken(tokenHash)
      │   ├─ used_at IS NOT NULL  →  HTTP 400
      │   └─ expires_at < NOW()   →  HTTP 400
      ├─ getLastNPasswordHashes(userId, 3)
      │   └─ loop verifyPassword(newPassword, oldHash)
      │       └─ MATCH  →  HTTP 400  AUTH_PWD_001
      ├─ hashPassword(newPassword)  →  newHash
      ├─ updatePasswordHash({ user_id, newHash, reason='reset_via_email', ip })
      │   (INSERT password_history  +  UPDATE users.password_hash)
      ├─ user.status === 'inactive'  →  activateUser()  [brute-force recovery]
      └─ markResetTokenUsed(tokenId)
  ← Response: 200 { message: "Mật khẩu đã được cập nhật" }
```

---

### Flow 6: Google OAuth Callback

> **Scope:** Thiết kế trong Sprint 1, route **disabled** cho đến Sprint 2.
> Hook: SPEC §6 — `password_hash` allows NULL "for OAuth readiness".

```
Client click "Đăng nhập với Google"
  →  GET /api/v1/auth/google
  →  AuthController.googleRedirect()
      └─ Redirect → Google OAuth URL  (scopes: email, profile; state: CSRF token)

Google redirect  →  GET /api/v1/auth/google/callback?code=...&state=...
  →  AuthController.googleCallback()
  →  AuthService.handleGoogleCallback(code, { ip, userAgent })
      ├─ Verify CSRF state token
      ├─ Exchange code → Google access_token  [Google OAuth2 API]
      ├─ Fetch Google profile: { google_id, email, full_name, avatar_url }
      └─  AuthService.loginWithGoogle(googleProfile)
          ├─ upsertGoogleUser({ email, full_name, avatar_url, password_hash = NULL })
          │   └─ INSERT ... ON CONFLICT (email) DO UPDATE
          │       →  trả về { id, is_new }
          ├─ is_new === true  →  sendGoogleWelcomeEmail()
          ├─ createSession({ session_token, ip, userAgent })
          ├─ generateAccessToken()  +  generateRefreshToken()
          └─ Set-Cookie access_token + refresh_token
  ← Redirect → Frontend /dashboard  (hoặc /onboarding nếu is_new)
```

---

## 4. IMPLEMENTATION DEPENDENCIES

**Thứ tự triển khai (phụ thuộc thứ tự):**

| Bước | Nội dung | Phụ thuộc |
|------|----------|-----------|
| 1 | Utilities: `HashUtil`, `TokenUtil`, `EmailUtil` | _(none)_ |
| 2 | Cấu hình Redis client + pool | _(none)_ |
| 3 | `AuthQueries` + `UserQueries` — raw SQL, xác nhận DB functions tồn tại | DB Schema v2 |
| 4 | `AuthService` (register, verifyEmail, login, logout, refresh) | Bước 1, 3 |
| 5 | `AuthMiddleware` (authenticate + authorize) + `RateLimitMiddleware` | Bước 2, 4 |
| 6 | `forgotPassword` + `resetPassword` flows | Bước 3, 4 |
| 7 | `UserService` (listUsers, changeRole, changeStatus) + AuditLog | Bước 3 |
| 8 | `AuthController` + Routes (mount vào Express app) | Bước 4, 5, 7 |
| 9 | Google OAuth handler *(code viết, route disabled)* | Bước 4 |
| 10 | Frontend: `AuthContext`, `AxiosInstance`, Pages/Forms | Bước 8 |

**External Dependencies:**

| Package | Mục đích |
|---------|----------|
| `bcrypt` | Password hashing — **bcrypt cost=12** (team decision 2026-06-02) |
| `jsonwebtoken` | JWT sign/verify |
| `cookie-parser` | Parse HttpOnly cookies trong Express |
| `express-rate-limit` | Rate limiting per route |
| `nodemailer` | SMTP email |
| `ioredis` | Session cache & revocation |
| `passport` + `passport-google-oauth20` | Google OAuth *(Sprint 2)* |
| `crypto` *(Node built-in)* | SHA-256 hash cho opaque tokens, CSRF state |

---

## 5. TECHNICAL RISKS & MITIGATION

| # | Risk | Xác suất | Impact | Mitigation |
|---|------|----------|--------|------------|
| 1 | **Redis Downtime** — Auth Middleware không validate được session | Low | High | Graceful fallback về PostgreSQL. Redis unavailable ≠ Auth down. Log alert Critical |
| 2 | **Email Service Chậm/Down** — request đăng ký/reset bị treo | Medium | Medium | Timeout 5s cho SMTP. Catch `EmailDeliveryError` → HTTP 503. Token vẫn lưu DB để user retry |
| 3 | **Admin Self-Lock** — Admin tự xóa quyền của chính mình | Low | High | Guard `actorId !== targetId` ở cả Service layer VÀ Controller. Double-check |
| 4 | **Argon2id Quá Chậm** — Login vượt 200ms p95 (NFR §7) | Medium | Medium | Benchmark config trước khi chốt. Nếu > 100ms: giảm `memoryCost` từ 65536 → 32768 |
| 5 | **Token Enumeration** — Brute-force email token | Very Low | High | Raw token = UUID v4 (122 bits entropy). UNIQUE constraint trên `token_hash` column |
| 6 | **Google OAuth CSRF** — State parameter forgery | Medium | High | `state` = `crypto.randomBytes(16).toString('hex')`, lưu server-side, verify tại callback |

---

## 6. OPEN QUESTIONS

| # | Câu hỏi | Owner | Priority | Status |
|---|---------|-------|----------|--------|
| **Q1** | ~~[Session Limit]~~ Max 3 sessions, oldest auto-revoked | Tech Lead | — | **RESOLVED** |
| **Q2** | **[Redis Setup]** Internal container hay Managed Service (ElastiCache)? Ảnh hưởng `REDIS_URL` config | Backend Team | HIGH | Open |
| **Q3** | **[Admin Force Logout]** Khi Admin ban/deactivate user, có nên tự động revoke ALL sessions của user đó ngay lập tức? | Tech Lead | HIGH | Open |
| **Q4** | **[Dev Email]** Môi trường Local/Dev dùng Mailtrap hay in token ra console? | Team | Medium | Open |
| **Q5** | **[Token TTL]** Access Token 15 phút, Refresh Token 7 ngày — confirm hay điều chỉnh? | Tech Lead | Medium | Open |
| **Q6** | **[Google OAuth Sprint]** Google OAuth route bao giờ được enable — Sprint 2 hay sau MVP? | Product | Medium | Open |
| **Q7** | **[Avatar Upload]** `PATCH /users/me` nhận `avatar_url` (URL string) hay sẽ có endpoint upload file riêng? | Product | Medium | Open |

---

## 7. DEFINITION OF DONE

Feature `feat-auth-and-users` được coi là **DONE** khi toàn bộ các điều kiện sau được thỏa mãn:

- [ ] 11 API endpoints hoạt động đúng theo contract SPEC §5
- [ ] Test coverage Auth module ≥ **85%** (SPEC §11)
- [ ] Test coverage Service layer ≥ **80%** (AGENTS.md)
- [ ] Tất cả 6 Data Flows (§3) có integration test pass
- [ ] Không có SQL template literal — chỉ `$1, $2` parameterized queries
- [ ] **bcrypt (cost=12)** dùng cho mọi password hash — thư viện `bcrypt`. SHA-256 chỉ dùng cho OTP/email tokens qua `crypto` built-in
- [ ] Audit logs ghi đúng `old_value`/`new_value` JSONB cho mọi admin action
- [ ] Rate Limiting verified bằng integration test (login 21 lần → HTTP 429)
- [ ] Session limit (max 3) hoạt động, oldest session bị revoke
- [ ] Error codes `AUTH_REG_001`...`AUTH_PROF_001` trả về đúng theo Error Matrix SPEC §8
- [ ] Không có `console.log` hay stack trace trong production response
- [ ] Google OAuth handler tồn tại nhưng route `GET /auth/google` **disabled** đến Sprint 2
- [ ] Code review bởi ít nhất 1 member khác trước khi merge vào `main`