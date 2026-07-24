# Feature Specification: User Profile

**Feature Branch**: `feat-auth-and-users`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Backfill feature spec from the completed web application for profile management, including viewing account identity, editing profile details, avatar, IELTS target band score, target test date, onboarding target setup, security settings, password change, and personal support history."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Personal Profile (Priority: P1)

As a signed-in user, I want to view my account identity, email, role, status, and learning profile so I can confirm the platform recognizes me correctly.

**Why this priority**: Users need confidence that progress, submissions, and account settings are attached to the right identity.

**Independent Test**: Can be fully tested by signing in and opening the profile area to confirm the displayed name, email, role, status, avatar, target band score, and target test date match the account data.

**Acceptance Scenarios**:

1. **Given** a signed-in user opens the profile page, **When** their account is found, **Then** the system shows their identity and learning profile fields.
2. **Given** a user has no avatar, **When** the profile page is shown, **Then** the system displays a safe placeholder based on their name.
3. **Given** the user is not signed in, **When** they try to open the profile area, **Then** the system requires sign-in first.

---

### User Story 2 - Update Learning Profile (Priority: P1)

As a learner, I want to update my full name, avatar, IELTS target band score, and target test date so my profile and study experience stay current.

**Why this priority**: The target band and target test date drive personalization and help the learner keep goals visible.

**Independent Test**: Can be fully tested by editing profile fields, saving, refreshing the page, and confirming the changed values remain visible.

**Acceptance Scenarios**:

1. **Given** a signed-in user changes their full name or avatar URL, **When** they save, **Then** the system updates the profile and confirms success.
2. **Given** a signed-in user selects a valid IELTS target band score, **When** they save, **Then** the target score is stored and displayed.
3. **Given** a signed-in user sets or clears the target test date, **When** they save, **Then** the profile reflects the latest target date choice.

---

### User Story 3 - Upload Avatar (Priority: P2)

As a user, I want to upload an avatar image so my account feels personal without needing to host an image myself.

**Why this priority**: Avatar upload improves profile usability and reduces friction compared with requiring a manual image URL.

**Independent Test**: Can be fully tested by uploading a supported image, receiving the uploaded image location, saving the profile, and seeing the avatar on reload.

**Acceptance Scenarios**:

1. **Given** a signed-in user selects a supported image within the allowed size, **When** upload succeeds, **Then** the system fills the avatar field and prompts the user to save profile changes.
2. **Given** a selected avatar file is too large or invalid, **When** upload is attempted, **Then** the system rejects it and explains the issue.

---

### User Story 4 - Manage Security Settings (Priority: P2)

As a signed-in user, I want to change my password from my profile area so I can maintain account security.

**Why this priority**: Password change is a core account-management action and supports users who suspect exposure.

**Independent Test**: Can be fully tested by opening security settings, submitting the current password plus a valid new password, and then using the new password for the next sign-in.

**Acceptance Scenarios**:

1. **Given** a signed-in user has a local password, **When** they submit the correct current password and matching valid new password, **Then** the password changes and the user sees confirmation.
2. **Given** the new password confirmation does not match, **When** the user submits, **Then** the system prevents the change and shows a mismatch error.
3. **Given** the user signed up through Google and has no local password, **When** they open password change, **Then** the system explains that they should use password recovery to create one.

---

### User Story 5 - Review Support History (Priority: P3)

As a signed-in user, I want to view my previous support requests and replies so I can track whether my issues were handled.

**Why this priority**: Support history helps users self-serve status updates without asking the team again.

**Independent Test**: Can be fully tested by opening support history and confirming each request shows message, status, created time, and any admin reply.

**Acceptance Scenarios**:

1. **Given** a user has support requests, **When** they open support history, **Then** the system lists requests with status and replies.
2. **Given** a user has no support requests, **When** they open support history, **Then** the system shows an empty state.

### Edge Cases

- Target band score must stay within IELTS band range and valid half-band increments.
- Empty optional fields, such as avatar or target test date, are allowed without blocking profile save.
- Avatar uploads over the size limit are rejected before profile save.
- Profile updates for a missing or inactive account fail safely.
- Users cannot access profile or security settings without an active signed-in session.
- Password change requires a current password unless the account has no local password.
- Support history may be empty and should still render a useful state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow signed-in users to view their own profile identity and learning settings.
- **FR-002**: System MUST omit password secrets and other sensitive authentication details from profile data shown to users.
- **FR-003**: System MUST allow users to update their full name.
- **FR-004**: System MUST allow users to update avatar by entering an image location or uploading a supported image.
- **FR-005**: System MUST reject avatar uploads that exceed the allowed size or are not supported image types.
- **FR-006**: System MUST allow users to set, update, or clear a target test date.
- **FR-007**: System MUST allow users to set an IELTS target band score from 0.0 to 9.0 in 0.5 increments.
- **FR-008**: System MUST reject invalid target band scores with a clear user-facing message.
- **FR-009**: System MUST refresh visible profile data after a successful save.
- **FR-010**: System MUST allow first-time or onboarding users to set target band score before continuing.
- **FR-011**: System MUST allow signed-in users with a local password to change password after confirming the current password.
- **FR-012**: System MUST prevent password change when the new password is too short or confirmation does not match.
- **FR-013**: System MUST explain the alternate password creation path for users who only have external sign-in.
- **FR-014**: System MUST allow users to view their own support request history and admin replies.

### Key Entities

- **Profile**: User-facing account information, including full name, email, avatar, role, status, and learning goals.
- **Learning Goal**: IELTS target band score and optional target test date used to personalize the learning experience.
- **Avatar Image**: A user-selected profile picture location or uploaded image reference.
- **Security Setting**: User-controlled password change state and account sign-in method awareness.
- **Support Request History**: Prior user support messages, statuses, timestamps, and admin responses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of signed-in users can load their profile in under 3 seconds.
- **SC-002**: At least 95% of valid profile updates are saved and reflected after refresh in under 5 seconds.
- **SC-003**: 100% of invalid target band scores are rejected before being stored.
- **SC-004**: 100% of avatar uploads over the allowed size are rejected with a clear message.
- **SC-005**: Users can update profile name, avatar, target band score, and target test date in under 2 minutes.
- **SC-006**: 100% of password change attempts with mismatched confirmation are blocked before submission completes.
- **SC-007**: Users with no support history see an empty state rather than an error.

## Assumptions

- Profile management applies to all signed-in roles unless a role-specific page overrides presentation.
- Email is treated as account identity and is not editable in this profile feature.
- Avatar upload and avatar URL entry are both accepted paths, but saving profile confirms the final avatar choice.
- Target band score defaults may be shown to guide the user, but the user can change the goal.
- Support request creation belongs to the support feature; this feature only covers viewing personal support history.
