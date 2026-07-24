# API Contract: Audit Log and Change History

All responses follow:

```json
{ "success": true, "data": {}, "error": null, "meta": {} }
```

Errors follow:

```json
{ "success": false, "data": null, "error": { "message": "..." }, "meta": {} }
```

## GET `/api/v1/admin/audit-logs`

Auth: admin.

Query:
- `page` integer, default `1`.
- `limit` integer, default `20`, max `100`.
- `severity` optional: `suspicious`.
- `actor_id`, `action`, `target_table`, `target_id`, `from`, `to`, `search` optional.

Response data: array of activity log rows:

```json
{
  "id": "uuid",
  "created_at": "2026-07-24T00:00:00.000Z",
  "actor": "Admin Name",
  "action": "login_failed",
  "action_label": "Đăng nhập thất bại",
  "target": "user@example.com",
  "ip": "127.0.0.1",
  "severity": "suspicious",
  "reason": "..."
}
```

## GET `/api/v1/admin/audit-logs/stats`

Auth: admin.

Response data:

```json
{ "total": 120, "suspicious": 8, "failed_logins": 5 }
```

## GET `/api/v1/admin/change-logs`

Auth: admin.

Query:
- `page`, `limit`, `action`, `status`, `search`, `from`, `to`.

Response data: array of change log rows.

Meta:

```json
{
  "page": 1,
  "limit": 10,
  "total": 120,
  "summary": { "total": 120, "undoable": 7, "undone": 3 }
}
```

## GET `/api/v1/admin/change-logs/:id`

Auth: admin.

Response data includes `old_value`, `new_value`, `can_undo`, `undone_at`, `undone_by`, and `undo_log_id`.

## POST `/api/v1/admin/change-logs/:id/undo`

Auth: admin.

Behavior:
- Restore supported `users.role` or `users.status` from source log old value.
- Reject unsupported, already undone, stale, missing target, or self-targeted changes.
- Insert `change_reverted` audit log.

Success data:

```json
{
  "source_log_id": "uuid",
  "undo_log_id": "uuid",
  "target_id": "uuid",
  "restored": { "role": "student" }
}
```
