# Quickstart: User Profile

## Prerequisites

- Migrated database with an active user.
- Avatar storage env configured if using cloud storage; local upload fallback available where configured.
- Backend and frontend dev servers running.

## Run

```powershell
cd backend
npm test -- --runTestsByPath backend/tests/unit/services/users.profile.test.js backend/tests/unit/controllers/users.controller.test.js
npm run dev
```

```powershell
cd frontend
npm test -- --run tests/pages/UserProfilePage.test.jsx tests/components/auth/OnboardingForm.test.jsx
npm run dev
```

## Validation Scenarios

1. Open `/profile` while authenticated.
   Expected: identity, email, role, status, avatar or initial placeholder, target band, and target test date render.

2. Open `/profile` while unauthenticated.
   Expected: redirect to `/login`.

3. Update full name, avatar URL, target band, and target date.
   Expected: `/users/me` PATCH succeeds, profile refreshes, values persist.

4. Enter invalid target band.
   Expected: frontend normalizes where possible; backend rejects out-of-range or non-0.5 increment values.

5. Upload supported avatar under size limit.
   Expected: `/users/me/avatar` returns `avatar_url`; saving profile stores it.

6. Upload unsupported or oversized avatar.
   Expected: clear error and profile unchanged.

7. Change password from security settings.
   Expected: valid local-password change succeeds; mismatched or short passwords are blocked.

8. Open support history.
   Expected: previous requests and admin replies render; empty history shows empty state.
