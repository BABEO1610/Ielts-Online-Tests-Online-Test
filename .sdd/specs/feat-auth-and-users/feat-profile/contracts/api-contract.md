# API Contract: User Profile

## GET `/api/v1/users/me`

Auth: logged-in user.

Success data:

```json
{
  "id": "uuid",
  "email": "learner@example.com",
  "full_name": "Learner Name",
  "avatar_url": "https://example.com/avatar.png",
  "role": "student",
  "status": "active",
  "target_band_score": "7.0",
  "target_test_date": "2026-12-01",
  "created_at": "2026-07-24T00:00:00.000Z",
  "last_login_at": "2026-07-24T00:00:00.000Z"
}
```

Must not include `password_hash` or token secrets.

## PUT/PATCH `/api/v1/users/me`

Auth: logged-in user.

Body:

```json
{
  "full_name": "New Name",
  "avatar_url": "https://example.com/avatar.png",
  "target_band_score": 7.5,
  "target_test_date": "2026-12-01"
}
```

Success: safe updated profile object.

Validation errors:
- invalid target band score.
- missing/nonexistent user.

## POST `/api/v1/users/me/avatar`

Auth: logged-in user.

Request: `multipart/form-data` with file field `avatar`.

Success data:

```json
{ "avatar_url": "https://storage.example.com/avatars/user-id/file.webp" }
```

Errors:
- no file.
- unsupported type.
- size exceeds policy.
- storage failure.

## POST `/api/v1/auth/change-password`

Auth: logged-in user.

Body:

```json
{ "old_password": "oldsecret123", "new_password": "newsecret123" }
```

Used by profile security settings. See `feat-auth/contracts/api-contract.md`.
