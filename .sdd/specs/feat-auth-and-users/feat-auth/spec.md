# Feature Specification: Authentication

**Feature Branch**: `feat-auth-and-users`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Backfill feature spec from the completed web application for authentication, including registration, email verification, login, logout, password recovery, password change, session refresh, role-based redirection, and Google sign-in."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Verify Account (Priority: P1)

As a guest, I want to create an account with my email, password, and full name, then verify my email before using protected learning features.

**Why this priority**: Account creation is the entry point for learners and enables the platform to associate progress, submissions, and feedback with a real identity.

**Independent Test**: Can be fully tested by registering with a new email, receiving a verification instruction, opening the verification link, and then reaching a state where login is allowed.

**Acceptance Scenarios**:

1. **Given** a guest provides a valid full name, email, password, and matching confirmation, **When** they submit registration, **Then** the system creates a pending account and tells the guest to check email for verification.
2. **Given** a guest opens a valid unused verification link within its allowed time, **When** verification is processed, **Then** the account becomes active and the guest is invited to log in.
3. **Given** the registration password confirmation does not match, **When** the guest tries to submit, **Then** the system prevents submission and explains that the passwords do not match.

---

### User Story 2 - Sign In and Reach the Correct Workspace (Priority: P1)

As a student, tutor, or admin, I want to sign in securely and be taken to the workspace that matches my role.

**Why this priority**: Every protected feature depends on a trustworthy login state and correct role-specific navigation.

**Independent Test**: Can be fully tested by signing in as each role and confirming that each user lands on the correct student, tutor, or admin area.

**Acceptance Scenarios**:

1. **Given** an active account with valid credentials, **When** the user signs in, **Then** the system creates an authenticated session and redirects the user based on their role.
2. **Given** an authenticated user returns to the login page, **When** the current session is still valid, **Then** the system redirects them away from the login form to their appropriate workspace.
3. **Given** a user submits incorrect credentials, **When** authentication fails, **Then** the system shows a generic failure message without exposing whether the email exists.

---

### User Story 3 - Recover or Change Password (Priority: P2)

As a user, I want to recover access through email and change my password when signed in, so I can keep access to my account under my control.

**Why this priority**: Password recovery reduces account lockout support burden and password change is a basic security expectation.

**Independent Test**: Can be fully tested by requesting password recovery, completing reset with a valid token, then signing in with the new password; separately, a signed-in user can change password after confirming the old one.

**Acceptance Scenarios**:

1. **Given** a guest requests password recovery for any email, **When** the request is submitted, **Then** the system shows the same success-style message regardless of whether the email exists.
2. **Given** a user has a valid reset token, **When** they submit a new password and confirmation that meet password rules, **Then** the password is updated and the user is guided back to login.
3. **Given** a signed-in user enters the correct current password and a valid new password, **When** they save the change, **Then** the system updates the password and confirms success.

---

### User Story 4 - Continue with Google (Priority: P3)

As a guest, I want to sign in with Google so I can enter the platform without creating a separate password first.

**Why this priority**: Social sign-in improves onboarding convenience but the email/password path remains the primary access path.

**Independent Test**: Can be fully tested by choosing Google sign-in, approving the provider flow, and confirming the user lands in the appropriate workspace.

**Acceptance Scenarios**:

1. **Given** a guest chooses Google sign-in, **When** the provider confirms a valid profile, **Then** the system creates or updates the account and starts an authenticated session.
2. **Given** the provider callback is invalid or expired, **When** the user returns to the login page, **Then** the system displays a clear login error and allows retry.

### Edge Cases

- Registration with an already-used email returns a generic failure and does not reveal account ownership.
- Pending, inactive, or banned accounts cannot complete normal sign-in.
- Repeated failed sign-in attempts temporarily block further login attempts.
- A fourth active session for the same account revokes the oldest active session.
- Expired, reused, or missing verification/reset tokens are rejected with user-friendly errors.
- Google-linked users without a local password are guided to password recovery instead of normal password change.
- Signed-out or expired-session users are redirected to login before accessing protected pages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow guests to register with full name, valid email, password, and password confirmation.
- **FR-002**: System MUST require new email/password accounts to verify email before normal authenticated access.
- **FR-003**: System MUST prevent duplicate-account discovery by using generic messaging for registration and password recovery outcomes.
- **FR-004**: System MUST allow active users to sign in with email and password.
- **FR-005**: System MUST redirect authenticated users to the workspace matching their current role.
- **FR-006**: System MUST deny sign-in for accounts that are pending, inactive, banned, temporarily locked, or otherwise not allowed to access the platform.
- **FR-007**: System MUST track failed sign-in attempts and temporarily block repeated failures.
- **FR-008**: System MUST maintain secure user sessions and support automatic continuation when a still-valid session can be refreshed.
- **FR-009**: System MUST allow users to sign out and end the current session.
- **FR-010**: System MUST limit simultaneous active sessions per account and revoke the oldest session when the limit is exceeded.
- **FR-011**: System MUST allow guests to request password recovery using email without revealing whether the account exists.
- **FR-012**: System MUST allow password reset only with a valid, unused, unexpired reset credential.
- **FR-013**: System MUST prevent users from reusing recently used passwords during reset.
- **FR-014**: System MUST allow signed-in users with a local password to change password after confirming the current password.
- **FR-015**: System MUST support Google sign-in for account creation or account access, including a clear failure path when provider validation fails.
- **FR-016**: System MUST never expose password secrets, recovery secrets, or session secrets in user-facing responses.

### Key Entities

- **Account**: A platform identity with email, display name, role, status, optional avatar, and security-related account state.
- **Session**: A signed-in device or browser session associated with one account, including activity and expiration state.
- **Verification Credential**: A time-limited credential used to activate a newly registered email account.
- **Password Reset Credential**: A time-limited credential used to prove control of the account email during password recovery.
- **Password History Entry**: A record of prior password changes used to prevent unsafe reuse.
- **External Login Account**: A link between a platform account and a third-party identity provider.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of valid registrations display the email verification instruction in under 5 seconds.
- **SC-002**: At least 95% of valid sign-ins reach the correct workspace in under 3 seconds after submission.
- **SC-003**: 100% of protected pages redirect unauthenticated users to login before showing protected content.
- **SC-004**: 100% of password recovery requests display a non-enumerating response regardless of account existence.
- **SC-005**: Repeated incorrect password attempts lock or throttle the affected login flow within 5 consecutive failures.
- **SC-006**: No user can maintain more than 3 active sessions at the same time.
- **SC-007**: 100% of password reset attempts with expired, reused, or invalid credentials fail without changing the password.
- **SC-008**: Users can complete password reset or password change in under 2 minutes when they have the required information.

## Assumptions

- Users have access to the email inbox associated with their account for verification and password recovery.
- Email/password remains the primary authentication path; Google sign-in is an additional convenience path.
- Roles are assigned by the platform and determine the landing workspace after sign-in.
- Session duration and lockout duration follow the security policy already implemented in the completed application.
- Password strength is enforced at a minimum of 8 characters in the current application.
