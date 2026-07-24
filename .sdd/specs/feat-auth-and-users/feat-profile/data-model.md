# Data Model: User Profile

## Profile

Backed by `users`.

Fields shown:
- `id`, `email`, `full_name`, `avatar_url`.
- `role`, `status`.
- `target_band_score`, `target_test_date`.
- `created_at`, `last_login_at`.

Sensitive fields excluded:
- `password_hash`.
- token/session secrets.
- reset/verification token data.

Validation:
- User must be authenticated.
- Account must exist.
- Profile update accepts `full_name`, `avatar_url`, `target_band_score`, `target_test_date`.

## Learning Goal

Stored on `users`.

Fields:
- `target_band_score` numeric nullable, 0.0 to 9.0, increments of 0.5.
- `target_test_date` date nullable.

State:
- Unset -> set during onboarding or profile edit.
- Set -> updated.
- Set -> cleared by sending null date where supported.

## Avatar Image

Fields:
- Uploaded file: `avatar` multipart field.
- Returned data: `avatar_url`.

Validation:
- MIME type must be supported image type.
- File size must not exceed 5 MB in frontend and backend policy.

## Security Setting

Derived from account auth state.

Fields:
- `has_local_password`: inferred from nullable `password_hash`.
- Password change payload uses old/new password.

Rules:
- Local-password users must provide correct current password.
- Google-only users receive guidance to reset password by email.

## Support Request History

Backed by support/contact query layer.

Fields:
- Request id, subject/content, status, created timestamp.
- Admin notes or reply message where available.

Rule: empty history renders an empty state, not an error.
