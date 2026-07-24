# API Contract: Authentication

All JSON responses use `{ success, data, error, meta }`. Auth cookies are HttpOnly where set by backend.

## POST `/api/v1/auth/register`

Body:

```json
{ "email": "learner@example.com", "password": "secret123", "full_name": "Learner Name" }
```

Success: `201`, generic registration/verification guidance. Duplicate emails must not disclose ownership.

## POST `/api/v1/auth/verify-email`

Body:

```json
{ "token": "opaque-token" }
```

Success: account active. Errors: invalid, used, or expired token.

## POST `/api/v1/auth/login`

Body:

```json
{ "email": "learner@example.com", "password": "secret123" }
```

Success data: safe user object without `password_hash`; access/refresh cookies set. Errors are generic for bad credentials or blocked status.

## POST `/api/v1/auth/refresh-token`

Body: optional `{ "refreshToken": "..." }`; cookie preferred.

Success: new access token/cookie if DB session is active and user remains active.

## POST `/api/v1/auth/logout`

Auth: any logged-in user.

Success: current session revoked and cookies cleared.

## POST `/api/v1/auth/forgot-password`

Body:

```json
{ "email": "learner@example.com" }
```

Success: generic message whether or not the email exists.

## POST `/api/v1/auth/reset-password`

Body:

```json
{ "token": "reset-token-or-otp", "password": "newsecret123" }
```

Success: password hash updated, token marked used, password history inserted.

## POST `/api/v1/auth/change-password`

Auth: logged-in user.

Body:

```json
{ "old_password": "oldsecret123", "new_password": "newsecret123" }
```

Errors: Google-only account without local password, wrong old password, too-short password.

## GET `/api/v1/auth/google`

Redirects to Google OAuth with state cookie.

## GET `/api/v1/auth/google/callback`

Query: `code`, `state`.

Success: validates state, exchanges code, upserts local user, starts session, redirects to frontend.
