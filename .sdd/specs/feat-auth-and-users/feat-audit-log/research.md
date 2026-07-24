# Research: Audit Log and Change History

## Decision: Keep audit persistence in `audit_logs`

**Rationale**: Existing migrations create `audit_logs` with actor, action, target, old/new JSONB values, IP address, undo flags, and timestamps. This matches the spec without introducing a new table or ORM.

**Alternatives considered**: Separate activity and change-log tables; rejected because both views are projections of the same event stream.

## Decision: Use admin-only REST endpoints

**Rationale**: Existing routes under `/api/v1/admin` already apply `authenticate` and `authorize('admin')` for audit lists, stats, details, and undo.

**Alternatives considered**: Client-side filtering from a broad audit endpoint; rejected because audit data is sensitive and filtering/pagination belong server-side.

## Decision: Represent suspicious events through service-level classification

**Rationale**: `audit.service.js` maps selected actions such as `login_failed`, `account_locked`, `user_deactivated`, `role_changed`, `password_changed_by_admin`, and `permission_denied` to suspicious severity.

**Alternatives considered**: Persist severity as a column; rejected for the current scope because existing enum/action data is enough and avoids schema churn.

## Decision: Undo only supported user role/status changes

**Rationale**: Existing undo logic builds a user undo plan from `old_value` and `new_value`, locks the audit row and target user in a transaction, rejects stale/self/unsupported changes, updates the user, inserts `change_reverted`, and marks source log undone.

**Alternatives considered**: Generic JSON-based undo for all target tables; rejected because it would risk unsafe reversals across unrelated domains.

## Decision: Query performance through indexes and bounded pagination

**Rationale**: Existing migrations index actor, target, created time, `can_undo`, and `undone_at`. `listAuditLogs` clamps limits to 100.

**Alternatives considered**: Full-text search table; rejected until operational audit volume proves simple indexed filters insufficient.
