# Research: User Profile

## Decision: Use `/users/me` as the profile boundary

**Rationale**: Existing route derives `userId` from auth middleware and returns a safe user object without `password_hash`.

**Alternatives considered**: Accept user id in request body/query; rejected because constitution forbids trusting identity from client input.

## Decision: Store learning goals on `users`

**Rationale**: `target_band_score` and `target_test_date` already exist on `users`; these fields belong to the user's long-lived profile.

**Alternatives considered**: Separate `learning_goals` table; rejected for current scope because one current goal per user is enough.

## Decision: Support both avatar URL and upload

**Rationale**: UI allows entering a URL or uploading a file; upload returns an `avatar_url` that the user confirms by saving the profile.

**Alternatives considered**: Upload-only flow; rejected because existing UI and spec support manual URLs.

## Decision: Reuse auth password change

**Rationale**: Password-change validation, Google-only handling, password hashing, and audit logging already live in `auth.service.changePassword`.

**Alternatives considered**: Duplicate profile-specific password service; rejected to avoid inconsistent security behavior.

## Decision: Render support history as read-only profile context

**Rationale**: Spec only requires viewing previous support requests and admin replies; creation/update belongs to support/contact feature.

**Alternatives considered**: Add profile support mutation endpoints; rejected as out of scope.
