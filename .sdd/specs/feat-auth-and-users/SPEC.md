# Feature: Identity & Access Management (feat-auth-and-users) — FULL SPECIFICATION

Status: **APPROVED** | Locked
Author: Tech Lead Nguyen Ba Quang Minh | Tech Lead Approval: Nguyen Ba Quang Minh | Date: 2026-06-01
Risk Level: **High** (Security Core)
Related Specs: `.sdd/global/constitution.md`, `.sdd/shared_context.md`

## 1. Business Context & Goals

This feature acts as the core "Security Gateway" and "Identity Registry" for the entire IELTS e-learning platform.
Goals:

* Provide robust authentication, registration, and password recovery mechanisms.
* Protect the system against brute-force attacks and data breaches.
* Manage multi-device user sessions effectively.
* Provide comprehensive audit trails for all permission and account status changes.

## 2. Stakeholders & User Personas

* **User:** Unauthenticated user (Registration, Email Verification, Password Reset).
* **Student:** Authenticated learner (Session management, Profile & Target Band Score updates).
* **Tutor:** Content creator/grader (Login to Tutor workspace).
* **Admin:** System administrator (Manage user lists, RBAC assignments, Lock/Unlock accounts, View Audit Logs).

## 3. User Stories (all paths)

* **USER-03:** As a Guest, I want to register a new account using Email/Password.
* **USER-04:** As a Guest, I want to receive an email verification link after registration.
* **USER-05:** As a Student/Tutor/Admin, I want to log in with Email/Password to access my dashboard.
* **USER-06:** As a Guest, I want to reset my password via email.
* **USER-09:** As a Student, I want to view and update my profile (Name, Avatar, Target Band Score).
* **ADM-02:** As an Admin, I want to view and filter the list of all users.
* **ADM-03:** As an Admin, I want to update and change roles of user accounts.
* **ADM-04:** As an Admin, I want to activate, deactivate, or delete users.
* **ADM-06:** As an Admin, I want to view system activity logs for sensitive actions.

## 4. Acceptance Criteria (EARS — exhaustive)

**Ubiquitous (Always true)**

* THE system SHALL hash all new passwords using the Argon2id algorithm; storing plain-text passwords is STRICTLY PROHIBITED.
* THE system SHALL log all account state modifications (creation, role changes, deactivation) into the `audit_logs` table.

**Event-driven (Triggered by events)**

* WHEN a Guest submits a Registration form (Email does not exist), THE system SHALL create a new user (`status = 'pending'`, `role = 'student'`), generate a token in `email_verification_tokens`, and send a verification email.
* WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update `status = 'active'`, record `used_at = NOW()`, and redirect to the Login page.
* WHEN a User submits valid credentials and the account is `active`, THE system SHALL call the DB function `handle_successful_login()`, create a new record in `user_sessions`, generate an Access Token & Refresh Token (linked to `session_token`), set them in HttpOnly Cookies, and return the user profile.
* WHEN a User calls the Logout API, THE system SHALL update `revoked_at = NOW()` for the corresponding `user_sessions` record.
* WHEN an Access Token expires and the Client calls the Refresh API with a valid Refresh Token, THE system SHALL check the user's `status`; if `active`, issue a new Access Token. Otherwise, reject with HTTP 401.
* WHEN an Admin changes the Role or Status of another User, THE system SHALL update the `users` record and log the action into `audit_logs` (`old_value`, `new_value`).
* WHEN a Guest requests a password reset, THE system SHALL create a Reset Token (expires in 1 hour) in `password_reset_tokens` and email the link.
* WHEN a Guest submits a new password via a valid reset link, THE system SHALL update `password_hash` and set `used_at = NOW()`. If the user is `inactive` (due to brute-force), automatically switch `status` back to `active`.
* WHEN a User requests a Profile update (`full_name`, `avatar_url`, `target_band_score`), THE system SHALL validate the input, update the `users` table, set `updated_at = NOW()`, and return the updated user object.

**State-driven (Continuous conditions)**

* WHILE a request passes through the Authenticated Middleware, THE system SHALL decode the JWT and match the `session_token` against `user_sessions`. If `revoked_at IS NOT NULL` OR `expires_at < NOW()` OR user `status != 'active'`, deny access (HTTP 401/403).
* WHILE a user has `must_change_password = TRUE` in the DB, THE system SHALL block all business API requests and force-redirect the user to the Change Password endpoint.

**Unwanted (Error handling)**

* WHERE a Guest registers with an already existing Email, THE system SHALL return HTTP 400 with a generic message "Registration failed" (Prevent Email Enumeration).
* WHERE a User inputs an incorrect password, THE system SHALL call the DB function `handle_failed_login()`.
* WHERE a User has `failed_login_attempts >= 5`, THE system SHALL lock the login flow for 15 minutes (based on `locked_until`) and return HTTP 429 Too Many Requests.
* WHERE a User changes their password to one that matches their last 3 hashes in `password_history`, THE system SHALL return HTTP 400 "Password has been used recently".
* WHERE a User submits a `target_band_score` outside [0.0, 9.0] or not divisible by 0.5, THE system SHALL return HTTP 400.
* WHERE a User successfully logs in but already has >= 3 active sessions, THE system SHALL automatically set `revoked_at = NOW()` for the oldest session (based on `last_active_at`) before creating a new session.

## 5. API Contracts (full OpenAPI schema)

* `POST /api/v1/auth/register` (Body: email, password, full_name) -> 201 Created
* `POST /api/v1/auth/verify-email` (Body: token) -> 200 OK
* `POST /api/v1/auth/login` (Body: email, password) -> 200 OK (Set-Cookie)
* `POST /api/v1/auth/logout` -> 204 No Content
* `POST /api/v1/auth/refresh` -> 200 OK
* `POST /api/v1/auth/forgot-password` (Body: email) -> 200 OK
* `PUT /api/v1/auth/reset-password` (Body: token, new_password) -> 200 OK
* `PATCH /api/v1/users/me` (Body: full_name, avatar_url, target_band_score) -> 200 OK
* `GET /api/v1/admin/users` (Query: page, limit, role, status) -> 200 OK (Requires Admin Role)
* `PATCH /api/v1/admin/users/:id/role` (Body: role) -> 200 OK (Requires Admin Role)
* `PATCH /api/v1/admin/users/:id/status` (Body: status) -> 200 OK (Requires Admin Role)

## 6. Data Models & DB Schema Changes

The system utilizes the existing PostgreSQL v2 schema. AI Agents MUST strictly adhere to these data types and constraints:

**Enum Types (Mandatory):**

* `user_role`: 'user', 'student', 'tutor', 'admin'
* `account_status`: 'pending', 'active', 'inactive', 'banned'
* `password_change_reason`: 'user_initiated', 'reset_via_email', 'forced_default', 'admin_reset'
* `log_action`: Includes security actions ('user_created', 'role_changed', 'login', 'login_failed', 'password_changed', etc.)

**Core Tables (Auth & Identity):**

* `users`: Core identity table. Note: `password_hash` allows NULL (for OAuth readiness). Contains security control fields: `failed_login_attempts`, `locked_until`, `last_login_at`, and `must_change_password`.
* `user_sessions`: Multi-device session management. Stores `session_token`, device info (`ip_address`, `user_agent`). Controls token lifecycle via `revoked_at` and `expires_at`.
* `password_history`: Tracks old password hashes with `reason` and `changed_from_ip` (INET type) to prevent password reuse.
* `email_verification_tokens` & `password_reset_tokens`: Manages email token lifecycles via the `used_at` field.
* `audit_logs`: Append-only traceability table. Stores `old_value` and `new_value` as JSONB.

**Database Functions & Triggers (Brute-force logic):**

* The Application Layer (Node.js/Backend) MUST NOT calculate failed login increments manually.
* WHERE a User inputs an incorrect password, Backend MUST call DB Function: `handle_failed_login(p_user_id)`.
* WHERE a User logs in successfully, Backend MUST call DB Function: `handle_successful_login(p_user_id)` to reset counters and update `last_login_at`.
* The `set_updated_at()` trigger is already attached to the `users` table; Backend does not need to manually update the `updated_at` field.

**Supporting Views:**

* `v_active_sessions`: API can query this view to fetch currently valid sessions (`revoked_at IS NULL` and `expires_at > NOW()`) for the "View active devices" feature.

## 7. Non-Functional Requirements

* **Performance:** Login API response time must be < 200ms (p95).
* **Security:** Tokens MUST be stored in HttpOnly, Secure, SameSite=Strict cookies. All Auth endpoints MUST enforce Rate Limiting (Max 20 req/min for Login).
* **Scalability:** The JWT Middleware requires Redis Caching for session state (`revoked_at`) verification to prevent hitting PostgreSQL `user_sessions` on every request.

## 8. Error Handling Matrix

| Error Code | HTTP Status | Message (Client) | Retry Behavior |
| --- | --- | --- | --- |
| `AUTH_REG_001` | 400 | "Registration failed. Please try again." | Allow retry with different email. |
| `AUTH_LOG_001` | 401 | "Incorrect email or password." | Allow retry. |
| `AUTH_LOG_002` | 429 | "Account temporarily locked due to multiple failed attempts. Try again in 15 minutes." | Retry after `locked_until` expires. |
| `AUTH_SES_001` | 401 | "Session expired." | Client calls Refresh API. |
| `AUTH_PWD_001` | 400 | "This password has been used recently." | Force new password input. |
| `AUTH_PERM_001` | 403 | "You do not have permission to perform this action." | Do not retry. |
| `AUTH_PROF_001` | 400 | "Target Band Score must be between 0 and 9, in 0.5 increments." | Retry with valid input. |

## 9. Edge Cases & Corner Cases

* **Admin Self-Locking Prevention:** Backend logic MUST explicitly check `actor_id != target_id` during role/status update APIs. Return HTTP 403 if an Admin attempts to modify their own role/status.
* **Concurrent Logins (Max Sessions):** Max 3 active devices per user. A 4th successful login MUST auto-revoke the oldest session (based on `last_active_at`) before creating the new session.
* **Email Enumeration Mitigation:** Intentionally submitting an already existing Email to the Forgot Password API MUST still return 200 OK without actually sending an email (or sending a notice email indicating the account exists).

## 10. Dependencies & Integration Points

* **Email Service (SMTP/SendGrid/SES):** External dependency for token delivery. Requires Timeout and Fallback mechanisms (e.g., if SMTP is down, API must catch the error, log it, and prompt the user gracefully).
* **Redis (Cache Layer):** Middleware integration point. Valid session lookups should hit Redis first before falling back to PostgreSQL.

## 11. Testing Requirements

* **Unit Tests:** Password hashing utilities, JWT generation/decoding, Role-check Middleware.
* **Integration Tests:** - Mock Email Service for the Register -> Verify flow.
* Intentional 5x wrong password inputs -> Verify HTTP 429 and `locked_until` DB field update.
* Session limit test: Create 3 mock sessions -> call login -> verify session 1 is revoked.


* **Coverage Target:** >= 85% for the Auth module.

## 12. Rollout Plan

* Greenfield deployment directly to Staging/Production using the v2 SQL schema.
* No legacy data migration required.

## 13. Open Questions (must resolve before implementation)
* **Q1: [Session Limit]** — Owner: Tech Lead — Due: Resolved. Decision: Max 3 active Sessions/User. Oldest session auto-revoked upon limit breach. (Incorporated into Sections 4 & 9).
* **Q2: [Redis Setup]** — Owner: Backend Team — Due: Pre-Coding Phase. Will the Redis Cache system run on an internal container or utilize a Managed Cache service (e.g., ElastiCache)?