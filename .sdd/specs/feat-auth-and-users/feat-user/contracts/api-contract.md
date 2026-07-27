# API Contract: User Administration and Authorization

## GET `/api/v1/admin/users`

Auth: admin.

Query:
- `page` integer default `1`.
- `limit` integer default `10`.
- `role` optional: `student`, `tutor`, `admin`.
- `status` optional: `pending`, `active`, `inactive`, `banned`.
- `search` optional name/email substring.

Success data: array of safe users.

Meta:

```json
{ "page": 1, "limit": 10, "total": 42 }
```

## PUT `/api/v1/admin/users/:id/role`

Auth: admin.

Body:

```json
{ "role": "tutor" }
```

Success: updated safe user.

Errors:
- 403 for self-change.
- 404 for missing user.
- 400 for invalid role.

Side effects:
- Revoke target user's active sessions.
- Insert audit log with old/new role values.

## PUT `/api/v1/admin/users/:id/status`

Auth: admin.

Body:

```json
{ "status": "inactive" }
```

Success: updated safe user.

Errors:
- 403 for self-change.
- 404 for missing user.
- 400 for invalid status.

Side effects:
- Revoke active sessions when target becomes `inactive` or `banned`.
- Insert audit log with old/new status values.

## GET `/api/v1/admin/sessions`

Auth: admin.

Success data:

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "email": "learner@example.com",
    "full_name": "Learner Name",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0",
    "is_oauth": false,
    "oauth_provider": null,
    "last_active_at": "2026-07-24T00:00:00.000Z",
    "expires_at": "2026-07-31T00:00:00.000Z"
  }
]
```

## DELETE `/api/v1/admin/sessions/:id`

Auth: admin.

Success: session `revoked_at` set.

Errors:
- 404 or clear error for missing/already revoked session.

Side effects:
- Insert audit log for session revocation.
