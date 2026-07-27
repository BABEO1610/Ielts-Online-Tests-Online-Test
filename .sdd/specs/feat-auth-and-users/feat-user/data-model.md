# Data Model: User Administration and Authorization

## User Account

Backed by `users`.

Admin list fields:
- `id`, `full_name`, `email`, `role`, `status`, `created_at`.

Admin mutation fields:
- `role`: `student`, `tutor`, `admin`.
- `status`: `active`, `inactive`, `pending`, `banned`.

Rules:
- Only admins can list or mutate other users.
- Admin cannot change own `role` or `status`.
- Password/auth secrets are omitted from API response.

## Role

Enum: `student`, `tutor`, `admin` with legacy `user` present in database enum.

Rules:
- Frontend `ProtectedRoute` redirects authenticated users away from unauthorized role spaces.
- Backend `authorize('admin')` protects admin endpoints.

## Account Status

Enum: `pending`, `active`, `inactive`, `banned`.

State effects:
- `active` can authenticate normally.
- `pending`, `inactive`, and `banned` cannot complete normal login.
- Changing to `inactive` or `banned` revokes active sessions.

## Admin Action

Backed by `audit_logs`.

Fields:
- actor admin id.
- target user/session id.
- action: `role_changed`, `user_updated`, `user_deactivated`, or session-related action.
- old/new values.
- IP and timestamp.

## Active Session

Backed by `v_active_sessions`.

Fields:
- `id`, `user_id`, `email`, `full_name`.
- `ip_address`, `user_agent`.
- `is_oauth`, `oauth_provider`.
- `last_active_at`, `expires_at`, `created_at`.

State:
- Active while `revoked_at IS NULL` and `expires_at > NOW()`.
- Revoked by setting `revoked_at = NOW()`.
