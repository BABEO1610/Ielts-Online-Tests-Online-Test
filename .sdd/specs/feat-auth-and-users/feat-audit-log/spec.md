# Feature Specification: Audit Log and Change History

**Feature Branch**: `feat-auth-and-users`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Backfill feature spec from the completed web application for audit logging, including security/activity logs, admin change logs, filtering, suspicious action visibility, detail view, undo for supported user changes, and audit stats."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture Sensitive Actions (Priority: P1)

As the platform owner, I want sensitive account, security, and admin actions recorded so the team can investigate incidents and prove accountability.

**Why this priority**: Auditability is required for a secure identity and administration system.

**Independent Test**: Can be fully tested by performing login failure, login success, role change, status change, password change, or session revocation actions and confirming each creates an audit entry.

**Acceptance Scenarios**:

1. **Given** a user signs in successfully, **When** the session starts, **Then** the action is recorded with actor, target, time, and context.
2. **Given** a sign-in attempt fails, **When** the failure is processed, **Then** the failure is recorded as a security-relevant event.
3. **Given** an admin changes another user's role or status, **When** the change succeeds, **Then** the previous and new values are recorded.
4. **Given** an admin revokes a session, **When** the revocation succeeds, **Then** the revocation is recorded.

---

### User Story 2 - Monitor Activity Logs (Priority: P1)

As an admin, I want to view activity logs and highlight suspicious events so I can quickly notice risky behavior.

**Why this priority**: Admins need an operational view of login failures, permission changes, account deactivation, and other security-relevant activity.

**Independent Test**: Can be fully tested by opening the activity log, switching between all/normal/suspicious filters, and confirming rows and counts update.

**Acceptance Scenarios**:

1. **Given** an admin opens activity logs, **When** logs load, **Then** the system shows time, actor, action, target, IP, severity, and note.
2. **Given** an admin filters to suspicious activity, **When** the filter is applied, **Then** only suspicious security-relevant actions are shown.
3. **Given** there are no matching logs, **When** a filter is applied, **Then** the system shows an empty state.

---

### User Story 3 - Review Change History (Priority: P1)

As an admin, I want to inspect administrative change logs with before/after values so I can understand exactly what changed.

**Why this priority**: Change history is necessary to diagnose permission or account-state mistakes.

**Independent Test**: Can be fully tested by changing a user's role or status, opening change history, viewing the detail, and confirming before/after fields are visible.

**Acceptance Scenarios**:

1. **Given** an admin opens change history, **When** logs load, **Then** the system shows time, admin, action, target, and status.
2. **Given** an admin opens a change detail, **When** the detail loads, **Then** the system displays field-level previous and new values.
3. **Given** an admin searches by action, **When** the search is applied, **Then** matching changes are shown with pagination.

---

### User Story 4 - Undo Supported User Changes (Priority: P2)

As an admin, I want to undo supported user role or status changes so I can safely correct mistaken account-management actions.

**Why this priority**: Reversible administrative changes reduce operational risk while preserving traceability.

**Independent Test**: Can be fully tested by changing a user's role or status, opening the change detail, undoing the change, and confirming the original log is marked undone and a new undo log is created.

**Acceptance Scenarios**:

1. **Given** a change log is marked undoable and has not been undone, **When** an admin requests undo, **Then** the system restores the previous supported value and marks the source log as undone.
2. **Given** a change log is not undoable, already undone, or has a changed target state, **When** undo is requested, **Then** the system rejects the undo and explains why.
3. **Given** an admin attempts to undo a change on their own account, **When** undo is requested, **Then** the system denies the action.

### Edge Cases

- Audit creation failure is treated as a system error for actions that require traceability.
- Logs may have a system actor when no human actor exists.
- Some actions have no before/after values and still need a readable log row.
- Suspicious classification includes security-sensitive actions such as failed login, account lock, deactivation, role change, password change by admin, and permission denial.
- Undo is supported only for selected user role/status changes.
- Undo detects conflicts when the target was changed again after the source log.
- Pagination and filters remain stable when log volume is high.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record security-sensitive and administrative actions with actor, action, target, timestamp, and IP context when available.
- **FR-002**: System MUST record previous and new values for changes where before/after comparison is meaningful.
- **FR-003**: System MUST allow admins to view paginated activity logs.
- **FR-004**: System MUST allow admins to filter activity logs by suspicious severity.
- **FR-005**: System MUST label audit actions in user-friendly language.
- **FR-006**: System MUST show activity log rows with time, actor, action, target, IP, severity, and note.
- **FR-007**: System MUST allow admins to view paginated change logs.
- **FR-008**: System MUST allow admins to search or filter change logs by action.
- **FR-009**: System MUST allow admins to open a change-log detail with before/after values.
- **FR-010**: System MUST summarize total, undoable, and undone changes for change history.
- **FR-011**: System MUST allow undo only for supported, undoable, not-yet-undone user changes.
- **FR-012**: System MUST prevent undo when the target state no longer matches the logged change.
- **FR-013**: System MUST prevent admins from undoing changes on their own account.
- **FR-014**: System MUST create a new audit entry whenever a change is undone.
- **FR-015**: System MUST preserve the original audit entry and mark it as undone rather than deleting it.
- **FR-016**: System MUST provide activity statistics for total logs, suspicious logs, and failed sign-ins.

### Key Entities

- **Audit Log Entry**: A durable record of a sensitive action, including actor, action, target, context, and time.
- **Activity Log View**: A user-friendly presentation of audit entries for monitoring normal and suspicious events.
- **Change Log View**: A user-friendly presentation of before/after administrative changes.
- **Undo Record**: A new audit entry that documents reversal of a supported prior change.
- **Severity Classification**: A categorization that marks certain actions as suspicious for admin monitoring.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful role changes, status changes, password changes, login failures, logins, and session revocations produce an audit entry.
- **SC-002**: Admins can load the latest activity logs in under 3 seconds for normal log volumes.
- **SC-003**: Admins can identify suspicious activity count and failed-login count within 10 seconds of opening the activity page.
- **SC-004**: At least 95% of action searches in change history return filtered results in under 3 seconds.
- **SC-005**: 100% of supported undo actions preserve the source log and create a separate undo log.
- **SC-006**: 100% of unsupported, conflicted, already-undone, or self-targeted undo attempts are rejected without changing the target.
- **SC-007**: Admins can inspect before/after values for a change in under 30 seconds from the change history page.

## Assumptions

- Audit log access is restricted to admins.
- Audit logs are append-oriented; deletion of audit history is outside this feature.
- Only selected user role/status changes are undoable in the current scope.
- Content review and grading actions may also appear in audit logs, but the core scope here is identity, access, and admin accountability.
- The application treats suspicious classification as an operational aid, not as a legal fraud determination.
