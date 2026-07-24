# Data Model: Authentication

## Account

Backed by `users`.

Fields:
- `id` UUID.
- `email` unique string.
- `password_hash` nullable string; null for Google-only users.
- `full_name`, `avatar_url`.
- `role`: `student`, `tutor`, `admin` plus legacy `user`.
- `status`: `pending`, `active`, `inactive`, `banned`.
- `failed_login_attempts`, `locked_until`, `last_login_at`, `must_change_password`.
- `target_band_score`, `target_test_date`.
- `created_at`, `updated_at`.

Validation:
- Email unique and syntactically valid.
- Password minimum 8 characters.
- Active status required for normal login.

## Session

Backed by `user_sessions` and `v_active_sessions`.

Fields:
- `id`, `user_id`, `session_token`.
- `ip_address`, `user_agent`.
- `is_oauth`, `oauth_provider`.
- `last_active_at`, `expires_at`, `revoked_at`.
- `created_at`, `updated_at`.

State transitions:
- Created on successful login/OAuth.
- Revoked on logout, admin revoke, role change, inactive/banned status, or max-session enforcement.
- Active only when not revoked and not expired.

## Verification Credential

Backed by `email_verification_tokens`.

Fields: `id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`.

State: unused -> used; expired tokens are rejected.

## Password Reset Credential

Backed by `password_reset_tokens`.

Fields: `id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`.

State: unused -> used; expired/used/missing tokens are rejected.

## Password History Entry

Backed by `password_history`.

Fields: `id`, `user_id`, `hash`, `reason`, `changed_from_ip`, `created_at`.

Validation: new password must not match last 3 hashes.

## External Login Account

Backed by `oauth_accounts`.

Fields inferred from query usage: `user_id`, `provider`, `provider_user_id`, `provider_email`, `linked_at`, `updated_at`.

Relationship: one local account may have a Google provider link.
