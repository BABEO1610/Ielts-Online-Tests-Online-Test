# Research: User Administration and Authorization

## Decision: Backend authorization is authoritative

**Rationale**: Frontend `ProtectedRoute` improves navigation, but backend `/api/v1/admin/*` routes enforce `authenticate` and `authorize('admin')`.

**Alternatives considered**: Frontend-only route protection; rejected because API must remain secure without trusting the browser.

## Decision: List users with server-side filters

**Rationale**: Existing `usersQueries.listUsers` supports `page`, `limit`, `role`, `status`, and `search` through parameterized SQL and count query.

**Alternatives considered**: Fetch all users and filter client-side; rejected for privacy, scale, and pagination correctness.

## Decision: Prevent self role/status changes in service layer

**Rationale**: `users.service.changeUserRole` and `changeUserStatus` compare actor and target ids before mutation.

**Alternatives considered**: Hide self action only in UI; rejected because direct API calls must also be protected.

## Decision: Revoke sessions after role/status changes

**Rationale**: Existing service calls session revocation so old privileges cannot survive after administrative changes.

**Alternatives considered**: Let sessions expire naturally; rejected because stale permissions are a security risk.

## Decision: Session management reads `v_active_sessions`

**Rationale**: The view joins active session rows to users and excludes revoked/expired records, which matches the admin active-session UI.

**Alternatives considered**: Query `user_sessions` directly in frontend; rejected because frontend must not access DB and the view centralizes active-session rules.

## Decision: Record privileged changes in audit trail

**Rationale**: Role changes, status changes, and session revocations are sensitive admin actions already logged through `audit.service`.

**Alternatives considered**: Rely on server logs only; rejected because admin UI and undo flows require durable structured audit rows.
