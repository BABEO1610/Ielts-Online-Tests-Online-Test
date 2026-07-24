# Data Model: Audit Log and Change History

## Audit Log Entry

Backed by `audit_logs`.

Fields:
- `id` UUID primary key.
- `actor_id` UUID nullable reference to `users.id`; null means system action.
- `action` `log_action` enum.
- `target_table` string.
- `target_id` UUID nullable target record id.
- `old_value` JSONB nullable before-state snapshot.
- `new_value` JSONB nullable after-state snapshot.
- `ip_address` INET nullable.
- `can_undo` boolean.
- `undone_at` timestamp nullable.
- `undone_by` UUID nullable reference to `users.id`.
- `undo_log_id` UUID nullable reference to another `audit_logs.id`.
- `created_at` timestamp.

Relationships:
- Actor joins to `users` as the performing admin/user.
- Target joins to `users` when `target_table = 'users'`.
- Undo actor joins to `users` through `undone_by`.
- Undo log points to the generated `change_reverted` row.

Validation rules:
- `action` must be present in `log_action`.
- Undo requires `can_undo = true`, `undone_at IS NULL`, target table `users`, and old/new field support.
- Undo rejects self-targeting admin actions.

## Activity Log View

Projection of `audit_logs` formatted by `AuditLogService.listActivityLogs`.

Fields:
- `id`, `created_at`, `action`, `action_label`.
- `actor` display label.
- `target` display label.
- `ip` normalized IP.
- `severity`: `normal` or `suspicious`.
- `reason` human-readable note.

## Change Log View

Projection of `audit_logs` formatted by `AuditLogService.listChangeLogs`.

Fields:
- `id`, `created_at`, `action`, `action_label`.
- `actor`, `target_table`, `target_id`, `target_label`.
- `old_value`, `new_value`.
- `status`: `applied` or `undone`.
- `can_undo`, `undone_at`, `undo_log_id`.

## Undo Record

An `audit_logs` row with `action = 'change_reverted'`.

State transition:
- Source log: `applied` -> `undone`.
- Target user role/status: current value must match source `new_value`; then restore source `old_value`.
- New undo log is inserted; source log stores `undone_at`, `undone_by`, `undo_log_id`.

## Severity Classification

Derived from action:
- Suspicious: `login_failed`, `account_locked`, `user_deactivated`, `role_changed`, `password_changed_by_admin`, `permission_denied`.
- Normal: all other actions unless service logic expands the list.
