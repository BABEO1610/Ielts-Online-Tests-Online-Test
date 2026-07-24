# Feature Specification: User Administration and Authorization

**Feature Branch**: `feat-auth-and-users`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Backfill feature spec from the completed web application for user authorization and administration, including role guards, admin user list, search and filters, role/status changes, self-protection, session management, and session revocation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Protect Role-Specific Areas (Priority: P1)

As the platform owner, I want students, tutors, and admins to access only the areas allowed for their role, so sensitive management functions remain protected.

**Why this priority**: Role enforcement is the safety boundary between normal learning, tutor work, and system administration.

**Independent Test**: Can be fully tested by signing in as each role and attempting to access student, tutor, and admin areas.

**Acceptance Scenarios**:

1. **Given** a signed-in student tries to open an admin or tutor-only area, **When** authorization is checked, **Then** access is denied or redirected to an allowed area.
2. **Given** a signed-in tutor opens a tutor workspace, **When** authorization is checked, **Then** the workspace is shown.
3. **Given** a signed-in admin opens the admin dashboard, **When** authorization is checked, **Then** the admin area is shown.

---

### User Story 2 - Search and Filter Users (Priority: P1)

As an admin, I want to browse, search, filter, and page through users so I can quickly find accounts that need review.

**Why this priority**: User administration starts with finding the right account reliably and safely.

**Independent Test**: Can be fully tested by opening user management, applying role/status/search filters, moving between pages, and confirming the table updates.

**Acceptance Scenarios**:

1. **Given** an admin opens user management, **When** the list loads, **Then** the system shows users with name, email, role, status, and created date.
2. **Given** an admin searches by name or email, **When** the search is applied, **Then** only matching users are shown.
3. **Given** an admin filters by role or status, **When** the filter is applied, **Then** the list shows only users matching the selected criteria.
4. **Given** there are more users than fit on one page, **When** the admin changes page, **Then** the correct page of users is shown.

---

### User Story 3 - Change User Role or Status (Priority: P1)

As an admin, I want to update another user's role or account status so I can grant tutor/admin access or restrict unsafe accounts.

**Why this priority**: Role and status changes directly control platform access and operational responsibility.

**Independent Test**: Can be fully tested by choosing a non-self user, changing role and status, saving, and confirming the user row reflects the new values.

**Acceptance Scenarios**:

1. **Given** an admin selects another user, **When** they change that user's role and save, **Then** the user receives the new role and existing sessions for that user are ended.
2. **Given** an admin selects another user, **When** they change that user's status to inactive or banned, **Then** the user receives the new status and active sessions are ended.
3. **Given** an admin attempts to modify their own role or status, **When** they submit the change, **Then** the system rejects the action.

---

### User Story 4 - Manage Active Sessions (Priority: P2)

As an admin, I want to review active sessions and revoke suspicious ones so I can respond quickly to compromised or unsafe access.

**Why this priority**: Session revocation gives admins a direct operational control after suspicious login activity or role/status changes.

**Independent Test**: Can be fully tested by opening active sessions, filtering/searching by user or sign-in type, revoking a session, and confirming it disappears from active sessions.

**Acceptance Scenarios**:

1. **Given** an admin opens active sessions, **When** sessions load, **Then** the system shows user, email, device, IP, sign-in type, last activity, and expiration.
2. **Given** an admin filters sessions by password or external sign-in, **When** the filter is applied, **Then** only matching sessions are shown.
3. **Given** an admin revokes an active session, **When** the action succeeds, **Then** that session can no longer be used.

### Edge Cases

- Non-admin users cannot access user management, session management, or admin-only controls.
- Admins cannot modify their own role or status.
- Role changes end active sessions for the changed user to prevent stale permissions.
- Inactive or banned status changes end active sessions for the affected user.
- Empty search or filter results show an empty state rather than failing.
- Session revocation for a missing or already revoked session returns a clear failure.
- User list pagination remains valid when filters reduce the number of results.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce role-based access for protected student, tutor, and admin areas.
- **FR-002**: System MUST deny admin user-management access to non-admin users.
- **FR-003**: System MUST allow admins to view a paginated list of users.
- **FR-004**: System MUST allow admins to search users by name or email.
- **FR-005**: System MUST allow admins to filter users by role and account status.
- **FR-006**: System MUST show user role, account status, email, display name, and created date in the user list.
- **FR-007**: System MUST allow admins to change another user's role.
- **FR-008**: System MUST allow admins to change another user's account status.
- **FR-009**: System MUST prevent admins from changing their own role or status.
- **FR-010**: System MUST end active sessions when a user's role changes.
- **FR-011**: System MUST end active sessions when a user's status becomes inactive or banned.
- **FR-012**: System MUST allow admins to view active user sessions with user, device, IP, sign-in type, activity, and expiration information.
- **FR-013**: System MUST allow admins to revoke a specific active session.
- **FR-014**: System MUST record role changes, status changes, and admin session revocations in the system audit trail.
- **FR-015**: System MUST return clear permission errors when a user lacks authority for an action.

### Key Entities

- **User Account**: A person or system identity with role, status, profile, and account lifecycle state.
- **Role**: A permission category such as student, tutor, or admin that determines accessible areas and actions.
- **Account Status**: The lifecycle state that controls whether an account may access the platform.
- **Admin Action**: A privileged change made by an admin to another user's role, status, or session.
- **Active Session**: A currently valid sign-in instance that can be reviewed and revoked.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of admin-only pages deny access to non-admin users.
- **SC-002**: Admins can find a known user by email or full name in under 30 seconds.
- **SC-003**: At least 95% of user list searches or filters show updated results in under 3 seconds.
- **SC-004**: 100% of successful role changes are reflected in the user list after refresh.
- **SC-005**: 100% of successful inactive or banned status changes prevent the affected account from continuing active access.
- **SC-006**: 100% of self role/status modification attempts by admins are rejected.
- **SC-007**: Admins can revoke a selected active session in under 10 seconds.

## Assumptions

- The supported platform roles are fixed for this feature: student, tutor, and admin.
- Account statuses include active, inactive, pending, and banned.
- Admins manage other users but do not create users in this feature; account creation belongs to authentication or other admin workflows.
- Detailed audit viewing and undo behavior belong to the audit log feature, while this feature only requires audit trail creation for privileged actions.
