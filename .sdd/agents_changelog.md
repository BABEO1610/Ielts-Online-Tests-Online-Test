# Agent Changelog — IELTSZone
# Format: [DATE] | [AGENT] | [FILE CHANGED] | [SUMMARY]

---

## 2026-05-30

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-05-30 | Antigravity | `.sdd/specs/feat-auth-and-users/SPEC.md` | **Spec fix (Constitution SEC-01):** Sửa FR-01 và NFR Security từ "Salt Round = 10" → "cost factor = 12". Layer 1 Constitution trump Spec. |
| 2026-05-30 | Antigravity | `.sdd/specs/feat-auth-and-users/TASKS.md` | **Spec sync:** Update T012 Done Criteria `bcrypt.hash(password, 10)` → `bcrypt.hash(password, 12)` để đồng bộ với Constitution SEC-01. |
| 2026-05-30 | Antigravity | `backend/src/db/migrations/002_create_users_table.sql` | **T003:** Tạo migration UP/DOWN cho bảng `users`. 13 columns, CHECK constraint (target_band_score 0–9), brute-force columns (failed_login_count, failed_login_window_start), trigger updated_at, 2 indexes (idx_users_email, idx_users_status), pgcrypto extension. |
| 2026-05-30 | Antigravity | `tests/db/migrations/002_create_users_table.test.js` | **T003 tests:** 15 test suites, static-analysis. Traceability Matrix mapping đủ SPEC/PLAN/TASKS. 105/105 tests PASS. |
| 2026-05-30 | Antigravity | ackend/src/db/queries/users.queries.js | **T006:** Implement c�c User Query Functions ph?c v? auth (createUser, getUserByEmail, getUserById, updateUserStatus, updateUserRole v?i optimistic locking, updatePassword, incrementFailedLogin, resetFailedLogin). Vi?t Unit Test 	ests/db/queries/users.queries.test.js mock pg pool. 18/18 tests PASS. |
