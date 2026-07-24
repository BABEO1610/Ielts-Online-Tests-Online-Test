# Implementation Plan: User Profile

**Branch**: `feat-auth-and-users` | **Date**: 2026-07-24 | **Spec**: `feat-profile/spec.md`

**Input**: Feature specification from `.sdd/specs/feat-auth-and-users/feat-profile/spec.md`

## Summary

Backfill design for authenticated profile viewing/editing, avatar upload, learning goal fields, onboarding goal capture, security settings/password change, and personal support history using existing `users` profile endpoints, avatar storage service, auth password endpoint, support queries, and React profile pages.

## Technical Context

**Language/Version**: Node.js 20+, Express 5.2; React + Vite currently installed as React 19.2.6.

**Primary Dependencies**: `pg`, `multer`, object storage adapters, Axios, React Router, Bootstrap/react-bootstrap.

**Storage**: PostgreSQL `users` for profile/learning goals; object storage/local upload path for avatars; support tables through `support.queries.js`.

**Testing**: Jest for users service/controller and avatar storage; Vitest for `UserProfilePage`, onboarding, and profile components.

**Target Platform**: Browser profile workspace backed by REST API.

**Project Type**: Full-stack web application.

**Performance Goals**: 95% profile loads under 3 seconds; 95% valid updates reflected after refresh under 5 seconds.

**Constraints**: Auth required; `password_hash` and auth secrets never returned; target band score must be 0.0-9.0 in 0.5 increments; avatar max 5 MB and allowed image MIME types.

**Scale/Scope**: Profile management for all authenticated roles, with student-focused learning goals.

## Constitution Check

- Tech stack: PASS for backend and raw `pg`; WATCH for React version drift.
- API protocol: PASS. Users controller returns standard envelopes.
- Security: PASS. `/users/me` and avatar upload use `authenticate`; user id comes from middleware.
- Database: PASS WITH RISK. Profile queries use parameterized SQL; runtime `ALTER TABLE` in `updateProfile` is existing drift and should be replaced by migration-only schema management in implementation work.
- Testing: PASS WITH RISK. Existing profile tests are present; avatar upload and support history should retain focused coverage.

Post-design re-check: PASS WITH NOTED RISKS. No new security exception; React drift and runtime DDL remain documented remediation items.

## Project Structure

```text
backend/
├── src/routes/api/v1/users.routes.js
├── src/controllers/users.controller.js
├── src/services/users.service.js
├── src/services/avatarStorage.service.js
├── src/middleware/uploadImage.middleware.js
├── src/db/queries/users.queries.js
├── src/db/queries/support.queries.js
└── tests/unit/services/users.profile.test.js

frontend/
├── src/pages/student/UserProfilePage.jsx
├── src/pages/student/SecuritySettingsPage.jsx
├── src/pages/student/StudyPlanPage.jsx
├── src/components/profile/ChangePwdModal.jsx
├── src/components/profile/ContactHistoryModal.jsx
└── tests/pages/UserProfilePage.test.jsx
```

**Structure Decision**: Keep all self-service profile writes behind `/api/v1/users/me`; reuse auth change-password endpoint for security settings; keep role-specific profile pages as thin wrappers over shared user data.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Existing React 19 package drift from constitution React 18 | Repo already contains React 19.2.6 | Must be explicitly remediated or approved before implementation completion. |
| Runtime DDL in `users.queries.updateProfile` | Existing compatibility patch | Future changes should use migrations only to preserve predictable DB operations. |
