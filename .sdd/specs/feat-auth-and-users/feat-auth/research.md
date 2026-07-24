# Research: Authentication

## Decision: Email/password accounts start as pending

**Rationale**: Existing `createUser` inserts default role `student` and status `pending`; `verifyEmail` activates accounts after a valid token.

**Alternatives considered**: Immediate activation; rejected because spec requires email verification before normal protected access.

## Decision: Use opaque token hashes for verification and reset

**Rationale**: Existing code hashes generated verification/reset values with `hashOTP` and stores only `token_hash`, `expires_at`, and `used_at`.

**Alternatives considered**: Store raw tokens; rejected for security.

## Decision: JWT access/refresh tokens tied to DB sessions

**Rationale**: Access and refresh tokens carry user/session claims while `authenticate` checks active session state through `user_sessions`.

**Alternatives considered**: Stateless JWT only; rejected because logout, revocation, and session limit require server-side session state.

## Decision: Max 3 active sessions per user

**Rationale**: Existing service counts `v_active_sessions` and revokes the oldest before creating a fourth session.

**Alternatives considered**: Unlimited sessions; rejected because spec and security posture require bounded active devices.

## Decision: Google OAuth maps to local user records

**Rationale**: `handleGoogleCallback` exchanges code, fetches Google profile, upserts `users`, stores `oauth_accounts`, and starts an OAuth-marked session.

**Alternatives considered**: Separate external-only identity store; rejected because role/status/workspace logic depends on local `users`.

## Decision: Prevent account enumeration

**Rationale**: Register and forgot-password paths use generic failure/success messaging.

**Alternatives considered**: Specific duplicate/not-found messages; rejected because they disclose account existence.
