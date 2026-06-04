# Task Breakdown & Implementation Roadmap (feat-objective-testing)

**Generated:** 2026-06-03  
**Based on:** PLAN.md + SPEC.md  
**Total Effort:** ~11 days (parallelizable)  
**Sprint:** Sprint 2 — Assessment Engine

---

## Overview: Implementation Phases

```
Phase 1 (Days 1–2):  Database & Core Infrastructure
Phase 2 (Days 3–4):  Backend Services & Controllers
Phase 3 (Days 5–6):  Tutor Endpoints & Versioning
Phase 4 (Days 7–8):  Frontend UI Development
Phase 5 (Days 9–10): Testing & Integration
Phase 6 (Day 11):    Code Review & PR
```

---

## PHASE 1: DATABASE & CORE INFRASTRUCTURE

### Task 1.1: DB Migrations — Create Core Tables

**Estimated Effort:** 1 day (Backend)

**Description:** Create all necessary PostgreSQL tables, enums, indexes, and constraints for objective testing feature.

**Subtasks:**

| # | Subtask | AC (Acceptance Criteria) | Estimate |
|---|---------|--------------------------|----------|
| 1.1.1 | Create ENUM types: `skill_type`, `difficulty`, `question_type`, `attempt_mode`, `grader_type` | Enums registered in PostgreSQL. Verified with `\dT` psql command. | 30 min |
| 1.1.2 | Create `mock_tests` table with all columns (id PK, title, skill, difficulty, duration_minutes, is_published, publish_at, created_by FK, created_at, updated_at). Add indexes: `idx_mock_tests_skill`, `idx_mock_tests_publish`, `idx_tests_title_trgm` (GIN trigram). | Table created. Indexes verified with `\d mock_tests` and GIN working on full-text search. | 1 hour |
| 1.1.3 | Create `questions` table (id PK, test_id FK, question_order SMALLINT, question_type, question_text, options JSONB, correct_answer, explanation, created_at, updated_at). Add UNIQUE constraint (test_id, question_order). | Table created. Constraint prevents duplicate question orders per test. | 45 min |
| 1.1.4 | Create `test_attempts` table (id PK, test_id FK, user_id FK, mode, started_at, submitted_at, band_score NUMERIC, raw_score SMALLINT, created_at). | Table created. Constraint `submitted_at IS NOT NULL` represents immutability. | 45 min |
| 1.1.5 | Create `question_answers` table (id PK, attempt_id FK, question_id FK, given_answer VARCHAR, is_correct BOOLEAN, created_at). Add UNIQUE (attempt_id, question_id). | Table created. Verified one-to-one answer per question per attempt. | 45 min |
| 1.1.6 | Create `ai_explain_requests` table (id PK, user_id FK, question_id FK, ai_response TEXT, tokens_used INT, created_at). | Table for tracking AI explanation requests. | 30 min |
| 1.1.7 | Verify `audit_logs` table exists (shared from feat-auth-and-users). Add sample audit inserts for test_created, answer_key_updated. | Audit logs confirmed working for objective testing domain actions. | 30 min |
| 1.1.8 | Create migration script file `backend/db/migrations/011_create_objective_testing_tables.sql`. Test migrate up/down. | Migration file executable. `npm run migrate:up` and `migrate:down` work without errors. | 30 min |

**Dependencies:** PostgreSQL connection available, migration tooling set up.

**Definition of Done:**
- ✅ All 7 tables created with correct data types, constraints, and indexes.
- ✅ `npm run migrate:up 011` executes without errors.
- ✅ `npm run migrate:down 011` rolls back cleanly.
- ✅ GIN trigram index enables fast full-text search on `title`.

---

### Task 1.2: DB Helper Functions (Optional SQL-level Operations)

**Estimated Effort:** 0.5 day

**Description:** Optional: Create PostgreSQL functions for complex operations (advisory locks, band score calculation, etc.).

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 1.2.1 | Create `fn_auto_publish_tests()` function: scan `mock_tests` WHERE `publish_at <= NOW() AND is_published = FALSE`, update `is_published = TRUE`, log to `audit_logs`. | Function callable via `SELECT fn_auto_publish_tests();` in scheduled job. |
| 1.2.2 | Create advisory lock function `fn_acquire_publish_lock()` to prevent multi-instance double-publish (optional for MVP). | Advisory lock prevents race conditions on publish job. |

**Dependencies:** Task 1.1 complete (tables exist).

---

## PHASE 2: BACKEND SERVICES & CONTROLLERS

### Task 2.1: AutoGrader Service (Pure Logic, No DB I/O)

**Estimated Effort:** 0.5 day (Backend)

**Description:** Implement synchronous, deterministic auto-grading engine for Reading/Listening tests.

**Subtasks:**

| # | Subtask | AC | Estimate |
|---|---------|-----|----------|
| 2.1.1 | Create `src/backend/src/services/autoGrader.service.js` with `gradeAttempt(testQuestions, answers)` function. Implement MCQ exact-match logic (case-sensitive for "A"/"B"/"C"/"D"). | Function handles 40 MCQ in < 50ms. Tests pass with 100% correctness. | 1 hour |
| 2.1.2 | Implement `normalizeAnswer(answer, questionType)` helper: Fill-in-blank = trim + toLowerCase + collapse spaces + strip punctuation. MCQ = trim only. | Normalization logic tested with edge cases (leading/trailing spaces, mixed case, punctuation variants). | 1 hour |
| 2.1.3 | Implement `toBandScore(rawScore)` lookup function using hardcoded IELTS Academic conversion table (0–40 → 1.0–9.0 in 0.5 steps). Separate tables for Reading/Listening if needed. | Lookup returns correct band for all 41 possible raw scores (0–40). Unit tests cover boundary cases (0, 15, 32, 40). | 1 hour |
| 2.1.4 | Create unit tests: `tests/services/autoGrader.service.test.js`. Achieve 100% code coverage. Mock edge cases (null answers, empty options, etc.). | Test file created with 30+ test cases. Coverage report shows 100% line coverage. | 2 hours |
| 2.1.5 | Benchmark: Verify gradeAttempt completes < 1s for 40 questions on typical machine. | Performance test result: 40 MCQs grade in 20–50ms. 40 fill-in-blanks grade in 30–80ms. Acceptable. | 30 min |

**Dependencies:** None (pure service).

**Definition of Done:**
- ✅ `AutoGrader` is a pure module with no dependencies on DB or HTTP.
- ✅ Unit tests pass with 100% coverage.
- ✅ Performance < 1s verified.
- ✅ Deterministic: same input always produces same output.

---

### Task 2.2: DB Queries Module — Parameterized SQL

**Estimated Effort:** 1 day (Backend)

**Description:** Implement all DB query functions for tests, attempts, and answers using raw `pg` with parameterized queries.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 2.2.1 | Create `src/backend/src/db/queries/tests.queries.js` with stubs for all functions from PLAN §2.2. | Module file created with function signatures and JSDoc. |
| 2.2.2 | Implement `getTestForStart(pool, testId)`: SELECT from `mock_tests` + questions (omit answers). Test returns correct structure. | Function tested: published test returns metadata + 40 questions without `correct_answer`. Unpublished returns 404-like structure. |
| 2.2.3 | Implement `getTestForGrading(pool, testId, questionIds)`: SELECT questions with `correct_answer` for grading context. | Function fetches official questions by IDs. Verified `correct_answer` populated correctly. |
| 2.2.4 | Implement `createTestAttempt(pool, data)`: INSERT `test_attempts`. Return attempt_id. | Attempt created with `started_at = NOW()`, `submitted_at = NULL`, `mode` set correctly. |
| 2.2.5 | Implement `insertQuestionAnswers(pool, attemptId, answers)`: Bulk INSERT `question_answers`. | Bulk insert verified: 40 answers inserted in single query. UNIQUE constraint prevents duplicates. |
| 2.2.6 | Implement `updateTestAttemptResult(pool, data)`: UPDATE `test_attempts` with `submitted_at`, `band_score`, `raw_score`. | Update successful. Attempt marked as immutable after `submitted_at` set. |
| 2.2.7 | Implement `versionQuestion(pool, data, actorId)`: INSERT new question row (versioning). Log audit. | New question created with incremented version. Old question_id still accessible for historical grading. |
| 2.2.8 | Implement `insertAuditLog(pool, audit)`: INSERT into `audit_logs`. | Audit record persisted with all required fields. |
| 2.2.9 | Implement `getAttemptWithAnswers(pool, attemptId)`: JOIN for full result view. | Result includes attempt details + per-question answers + correct answers + explanations. |
| 2.2.10 | Implement `countActiveAttempts(pool, userId, testId)`: Check incomplete attempts. | Returns count. Used in start-attempt validation (409 if count > 0). |
| 2.2.11 | Write integration tests: `tests/db/queries/tests.queries.test.js`. Test all CRUD operations with transaction rollback. | Tests pass. DB state reverted after each test. |
| 2.2.12 | Verify ALL queries use parameterized ($1, $2). Run ESLint rule to detect string concatenation. | ESLint passes. Zero concatenation violations. SEC-03 compliance verified. |

**Dependencies:** Task 1.1 (tables exist).

**Definition of Done:**
- ✅ All 10+ query functions implemented.
- ✅ Parameterized queries only (0 concatenation).
- ✅ Integration tests pass with 100% coverage.
- ✅ No N+1 queries; efficient JOINs.

---

### Task 2.3: Test Attempts Controller — Start & Submit Flow

**Estimated Effort:** 1.5 days (Backend)

**Description:** Implement POST /api/v1/test-attempts (start) and POST /:id/submit (submit with grading transaction).

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 2.3.1 | Create `src/backend/src/controllers/testAttempts.controller.js` with `startAttempt` handler. Validate: test published, no incomplete attempt. | Handler tested: returns 201 with attempt_id + questions (no answers). Returns 409 if incomplete attempt exists. |
| 2.3.2 | Implement input validation (express-validator): test_id UUID, mode enum. | Validation catches invalid input, returns 400 with error details. |
| 2.3.3 | Implement `submitAttempt` handler: validate owner (IDOR), check `submitted_at IS NULL`, fetch questions, grade, transaction. | Handler executes full flow. Grading completes in < 1s. Band score persisted. |
| 2.3.4 | Implement transaction wrapping: BEGIN → insert answers → update attempt → COMMIT. Rollback on any error. | Transaction integrity tested: if grading fails, no answers inserted. Attempt stays `submitted_at = NULL`. |
| 2.3.5 | Implement `getResult` handler: join attempt + answers + questions. Auth check (owner or tutor/admin). | Handler returns full result with `given_answer`, `correct_answer`, `is_correct`, `explanation`. Owner access verified. Tutor access verified. |
| 2.3.6 | Implement `listAttempts` handler: paginated student attempts. | Handler returns phân trang attempts for authenticated student. |
| 2.3.7 | Create integration tests: `tests/controllers/testAttempts.controller.test.js`. Happy path + error cases. Mock AutoGrader. | Tests pass: submit happy path, IDOR prevention, transaction rollback, 409 on re-submit. |
| 2.3.8 | Implement Socket.io emit `grading_completed` event after submit success. | Event emitted with attempt_id. Frontend receives event in < 1s. |

**Dependencies:** Task 2.1 (AutoGrader), Task 2.2 (DB queries), `authenticate` + `authorize` middleware exist.

**Definition of Done:**
- ✅ Start attempt: 201, questions populated, no answers exposed.
- ✅ Submit attempt: 200, grading < 1s, band_score saved, transaction safe.
- ✅ Get result: owner/tutor access enforced, full details returned.
- ✅ IDOR prevention: 403 if attempt not owned.
- ✅ Integration tests pass.

---

### Task 2.4: Mock Tests Controller — CRUD & Publish

**Estimated Effort:** 1 day (Backend)

**Description:** Implement Tutor endpoints for test creation, update, delete (soft), and question management.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 2.4.1 | Create `src/backend/src/controllers/mockTests.controller.js`. Implement `createTest` handler: validate input, insert mock_tests, log audit. | Handler creates test with `is_published = FALSE`. Audit log recorded. |
| 2.4.2 | Implement `updateTest` handler: update metadata, validate, log audit. Support `is_published`, `publish_at`. | Handler updates test. If `publish_at` set, scheduled job will publish later. Audit logged. |
| 2.4.3 | Implement `deleteTest` handler: soft-delete (set `is_published = FALSE`), log audit. Reject hard-delete. | Handler soft-deletes. Existing attempts unaffected. Hard-delete prevented. Audit logged. |
| 2.4.4 | Implement `createQuestion` handler: validate (question_order ≤ 40, unique per test), insert question, log audit. | Handler adds question. UNIQUE constraint prevents duplicates. Audit logged. |
| 2.4.5 | Implement `updateQuestion` handler with versioning: INSERT new question row (preserve test_id + question_order), log answer_key_updated audit. Do NOT update in-place. | Handler creates new question version. Old question_id still exists for historical grading. Audit shows old + new values. |
| 2.4.6 | Implement `listPublishedTests` handler (public): filter `is_published = TRUE`, paginate, return metadata only. | Handler returns published tests without answers. Pagination works. Search/filter working. |
| 2.4.7 | Implement `getTestDetail` handler: return metadata. Tutor sees full details + question list. Others see basic info. | Handler returns full details for tutor. Basic info for student. 404 if unpublished + not tutor. |
| 2.4.8 | Implement auth checks: Tutor-only on create/update/delete/question endpoints. | Auth middleware enforces role. 403 if student tries to create test. |
| 2.4.9 | Create integration tests: test CRUD operations, versioning, audit logging, auth checks. | Tests pass: create/update/delete flow verified. Versioning tested. Audit records checked. |

**Dependencies:** Task 2.2 (DB queries), `authenticate` + `authorize` middleware.

**Definition of Done:**
- ✅ Tutor can create, update, delete (soft), publish tests.
- ✅ Question versioning works: old data preserved, new data isolated.
- ✅ Audit logs recorded for all mutations.
- ✅ Guest/Student see only published tests without answers.
- ✅ Integration tests pass.

---

## PHASE 3: TUTOR ENDPOINTS & AUDIT

### Task 3.1: Audit Logging Integration

**Estimated Effort:** 0.5 day (Backend)

**Description:** Ensure all Tutor mutations are logged with actor_id, old/new values in JSONB format.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 3.1.1 | Audit log test_created: log `{ action: 'test_created', actor_id, target_table: 'mock_tests', target_id, new_value: {...test data} }`. | Create test triggers audit. Verify record in DB. |
| 3.1.2 | Audit log test_updated: log old_value + new_value JSONB, action = 'test_updated'. | Update test (e.g., publish_at) logs both old + new state. |
| 3.1.3 | Audit log test_deleted (soft): log action = 'test_deleted'. | Soft-delete test logs audit. |
| 3.1.4 | Audit log answer_key_updated: detailed diff of correct_answer + explanation old vs new. | Update question answer logs old + new values separately. |
| 3.1.5 | Verify audit query endpoint: `GET /api/v1/audit-logs?target_table=mock_tests&actor_id=...`. | Admin can filter audit logs by table, actor, date. Results paginated. |

**Dependencies:** Task 2.4 (Tutor endpoints), `audit_logs` table exists.

**Definition of Done:**
- ✅ All Tutor mutations logged with actor_id, old_value, new_value.
- ✅ Admin can query audit logs with filters.
- ✅ JSONB format correct for compliance.

---

### Task 3.2: Scheduled Publish Job

**Estimated Effort:** 0.5 day (Backend)

**Description:** Implement background job to auto-publish tests when `publish_at <= NOW()`.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 3.2.1 | Install `node-cron` package (or use existing background queue if available). | Dependency added to package.json. |
| 3.2.2 | Create `src/backend/src/jobs/publishScheduledTests.job.js`: query tests with `publish_at <= NOW() AND is_published = FALSE`, update `is_published = TRUE`, log audit with `actor_id = NULL` (system action). | Job runs. Tests auto-publish at scheduled time. |
| 3.2.3 | Register job in cron schedule (e.g., run every minute or every 5 minutes). | Job registered in app startup. Runs on interval without blocking. |
| 3.2.4 | Add DB advisory lock (or Redis lock) to prevent multi-instance race. | Lock ensures single instance executes publish job. No double-publish. |
| 3.2.5 | Add logging: job run timestamp, count of tests published. | Logs visible in app logs. Debugging aided. |
| 3.2.6 | Test job: mock cron, verify tests are published and audit logged. | Job test passes. Scheduled publish verified. |

**Dependencies:** Task 1.1 (tables), Task 3.1 (audit logging).

**Definition of Done:**
- ✅ Job runs on schedule without blocking.
- ✅ Tests auto-publish at `publish_at` time.
- ✅ Audit logged for each scheduled publish.
- ✅ Multi-instance safe (lock prevents race).

---

## PHASE 4: FRONTEND UI DEVELOPMENT

### Task 4.1: Attempt Start UI & Question Navigation

**Estimated Effort:** 1.5 days (Frontend)

**Description:** Build test-start page, pre-test instruction modal, question navigation panel.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 4.1.1 | Create `StartTestPage` component. Display test metadata, "Timed" vs "Untimed" buttons. | Component renders. Buttons functional. Navigation to pre-test modal on click. |
| 4.1.2 | Create `PreTestInstructionModal` component. Show rules, time warning, auto-submit warning. | Modal displays. User can read and click "Begin". |
| 4.1.3 | Implement test attempt API call: `POST /api/v1/test-attempts`. Handle response, store attempt_id + questions. | API call successful. Questions loaded into state. |
| 4.1.4 | Create `QuestionNavigationPanel` component: 40 squares, color-coded by status (unanswered/answered/current/bookmarked). | Panel displays 40 squares. Click navigates to question. Colors update real-time. |
| 4.1.5 | Implement click-to-navigate: click square → scroll question panel to that question. | Navigation smooth. Current square highlighted. |
| 4.1.6 | Create unit tests for navigation logic. | Tests pass: navigate to different questions, panel updates. |

**Dependencies:** Backend Task 2.3 (start API), `authenticate` middleware.

**Definition of Done:**
- ✅ UI renders correctly on Tablet+ (≥ 768px).
- ✅ Test starts. Questions loaded.
- ✅ Navigation panel interactive.
- ✅ No answers exposed in UI before submit.

---

### Task 4.2: Timer & Auto-submit Implementation

**Estimated Effort:** 1 day (Frontend)

**Description:** Implement countdown timer, UI lock on expiry, automatic submit.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 4.2.1 | Create `Timer` component: display `MM:SS` format. Start from `duration_minutes`. Update every second. | Timer counts down correctly. Reaches 00:00. |
| 4.2.2 | Implement color change: ≤ 5 min → red. | Color changes at 5-min mark. |
| 4.2.3 | Implement auto-submit trigger: at 00:00, lock UI, show "Submitting..." modal, call submit API with localStorage draft. | UI locked at expiry. Submit API called. Loading state shown. |
| 4.2.4 | Handle submit success: redirect to results page. | Redirect to results on successful submit. |
| 4.2.5 | Handle submit failure: show error, allow retry. | Retry logic implemented. Error message clear. |
| 4.2.6 | Implement manual submit button: student can submit before timer expires. | Manual submit calls API, redirects to results. |
| 4.2.7 | Create unit tests: timer logic, auto-submit trigger, error handling. | Tests pass. Timer accuracy verified. |

**Dependencies:** Backend Task 2.3 (submit API).

**Definition of Done:**
- ✅ Timer accurate (±100ms).
- ✅ Auto-submit at 00:00 without user interaction.
- ✅ Manual submit available anytime.
- ✅ Error handling graceful.

---

### Task 4.3: Question Answer Input & Autosave

**Estimated Effort:** 1.5 days (Frontend)

**Description:** Render MCQ + Fill-in-blank questions, capture answers, autosave to localStorage.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 4.3.1 | Create `MCQQuestion` component: render question_text + options (radio buttons). | Component renders. Clicking option updates state. |
| 4.3.2 | Create `FillInBlankQuestion` component: render question_text + text input. Allow freeform input. | Component renders. User can type. Input captured. |
| 4.3.3 | Implement answer state management: store all 40 answers in component state. Update on user input. | State management works. Changes reflected immediately. |
| 4.3.4 | Implement autosave: every 60s, save current answers to `localStorage` under `attempt:{id}:draft`. | LocalStorage updated every 60s with latest answers. |
| 4.3.5 | Implement draft recovery: on page reload, restore draft from localStorage if exists. | Page recovers draft on reload. User can continue from saved state. |
| 4.3.6 | Clear draft on successful submit: remove localStorage entry after submit success. | Draft cleaned up after successful submit. |
| 4.3.7 | Create unit tests: answer capture, autosave logic, draft recovery. | Tests pass. Autosave timing verified. Draft restoration verified. |

**Dependencies:** Backend Task 2.3 (answer structure from API).

**Definition of Done:**
- ✅ MCQ + Fill-in-blank inputs work.
- ✅ Autosave every 60s.
- ✅ Draft recoverable on reload.
- ✅ Draft cleared after submit.

---

### Task 4.4: Results Page & Per-Question Review

**Estimated Effort:** 1.5 days (Frontend)

**Description:** Display band score, raw score, per-question correctness, explanations, and AI explain button.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 4.4.1 | Create `ResultsSummary` component: display band_score (large, prominent), raw_score / 40, percentage, submit time. | Component displays summary clearly. Band score prominent. |
| 4.4.2 | Create `PerQuestionGrid` component: render all 40 questions in grid. Each cell shows: question number, correctness (✓/✗), given answer, correct answer. | Grid displays. Color-coded (green/red). Answers visible. |
| 4.4.3 | Implement click-to-expand: click question cell → expand row to show full question_text + explanation + "Explain with AI" button. | Row expands. Full details shown. Collapse on click again. |
| 4.4.4 | Implement "Explain with AI" button: call `POST /api/v1/ai-explain` with question_id. Display simplified AI explanation below tutor explanation. | API call successful. AI response displayed. Formatted nicely. |
| 4.4.5 | Handle AI unavailable: show placeholder message "AI explanation currently unavailable." | Graceful error handling. UI doesn't crash. |
| 4.4.6 | Implement progress chart (optional): line chart showing band_score history across multiple attempts. Use Recharts. | Chart displays past attempts. Band score trend visible. |
| 4.4.7 | Create unit tests: results display, per-question grid, AI explain button. | Tests pass. Components render. API calls verified. |

**Dependencies:** Backend Task 2.3 (result API), Task 2.3.8 (Socket.io event).

**Definition of Done:**
- ✅ Results page displays all required information.
- ✅ Per-question review interactive and comprehensive.
- ✅ AI explain feature integrated and error-handled.
- ✅ Layout responsive on Tablet+.

---

## PHASE 5: TESTING & INTEGRATION

### Task 5.1: Unit Tests (Services & Utilities)

**Estimated Effort:** 1 day (Backend QA)

**Description:** Comprehensive unit tests for AutoGrader, DB queries, services (no AI calls).

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 5.1.1 | Unit tests for `AutoGrader.gradeAttempt()`: 40 MCQ, 40 fill-in-blank, mixed scenarios. | 30+ test cases. 100% coverage. All pass. |
| 5.1.2 | Unit tests for `AutoGrader.normalizeAnswer()`: edge cases (spaces, punctuation, case). | Edge cases covered. Normalization deterministic. |
| 5.1.3 | Unit tests for `AutoGrader.toBandScore()`: all 41 possible raw scores (0–40) → correct band. | All outputs verified against official IELTS table. |
| 5.1.4 | Unit tests for DB query functions: mock pool, test SQL generation (parameterized). | 20+ test cases per function. Parameterization verified. |
| 5.1.5 | Unit tests for controllers: mock request/response, test validation, auth checks (no actual DB). | Happy path + error cases. IDOR prevention tested. |

**Dependencies:** Tasks 2.1–2.4 (services + controllers implemented).

**Definition of Done:**
- ✅ 80%+ code coverage on services.
- ✅ All critical paths tested.
- ✅ No AI service calls in unit tests (mocked).

---

### Task 5.2: Integration Tests (API Flow End-to-End)

**Estimated Effort:** 1 day (Backend QA)

**Description:** Full integration tests: start attempt → submit → verify grading → check audit → versioning.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 5.2.1 | Integration test: Create test → Start attempt → Submit answers → Verify band_score persisted + attempt locked. | Test flow completes. Band score calculated correctly. Attempt marked submitted. |
| 5.2.2 | Integration test: Versioning — update question → old attempt unchanged → new attempt uses new data. | Old attempt grade unchanged. New question version created. Audit logged. |
| 5.2.3 | Integration test: IDOR prevention — attempt from student B cannot be submitted by student A. | 403 returned. IDOR prevented. |
| 5.2.4 | Integration test: 409 on re-submit — second submit of same attempt rejected. | 409 returned. Attempt immutable. |
| 5.2.5 | Integration test: Transaction safety — if error during submit, answers not inserted, attempt not locked. | Rollback verified. No orphaned data. |
| 5.2.6 | Integration test: Soft-delete test — delete test → attempt unaffected → audit logged. | Test unpublished. Attempts still readable. Hard-delete prevented. |
| 5.2.7 | Integration test: Audit logging — all mutations logged with actor_id + old/new values. | Audit records verified. Diffs accurate. |

**Dependencies:** Tasks 2.1–2.4, Task 3.1 (audit), DB migrations runnable.

**Definition of Done:**
- ✅ All integration tests pass.
- ✅ End-to-end flow verified.
- ✅ No data corruption or orphaned records.
- ✅ Audit trail complete.

---

### Task 5.3: Frontend Integration Tests

**Estimated Effort:** 0.5 day (Frontend QA)

**Description:** Jest + React Testing Library tests for frontend components and API interactions.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 5.3.1 | Component tests: StartTestPage, PreTestInstructionModal, QuestionNavigationPanel, Timer, ResultsSummary. | All components render without errors. Props passed correctly. |
| 5.3.2 | User flow test: Start attempt → answer questions → auto-submit at 00:00 → view results. | Full flow tested. No user interaction bugs. |
| 5.3.3 | Autosave test: answer question → wait 60s → refresh page → draft restored. | Autosave verified. Draft recovery works. |
| 5.3.4 | API mock tests: Mock `fetch` calls for start/submit/result. Verify payloads + response handling. | Mocks set up correctly. API interactions tested. |

**Dependencies:** Tasks 4.1–4.4 (frontend implemented).

**Definition of Done:**
- ✅ Frontend components unit-tested.
- ✅ API interactions mocked and verified.
- ✅ User flow end-to-end tested.

---

### Task 5.4: DB Migration Tests

**Estimated Effort:** 0.25 day (Backend DevOps)

**Description:** Verify migrations up/down, schema integrity, constraint enforcement.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 5.4.1 | Migration up test: Run `migrate:up`, verify all tables + enums + indexes created. | `\dt`, `\dT`, `\di` show all objects. |
| 5.4.2 | Migration down test: Run `migrate:down`, verify tables dropped cleanly. | Rollback complete. Schema clean. |
| 5.4.3 | Constraint tests: INSERT violating UNIQUE (test_id, question_order) → error expected. | Constraint enforced. Duplicate order rejected. |
| 5.4.4 | Foreign key tests: DELETE test → attempts CASCADE deleted. | Cascade behavior verified. Referential integrity maintained. |

**Dependencies:** Task 1.1 (migrations).

**Definition of Done:**
- ✅ Migrations up/down work without errors.
- ✅ Schema matches design.
- ✅ Constraints enforced.

---

## PHASE 6: CODE REVIEW & PR

### Task 6.1: Pre-Commit Checklist & Code Quality

**Estimated Effort:** 0.5 day (Backend/Frontend)

**Description:** Run linters, formatters, security checks, pre-commit validation.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 6.1.1 | ESLint: Run `npm run lint` on all new files. Fix 0 warnings. | ESLint output clean. No warnings. |
| 6.1.2 | Prettier: Run `npm run format` on all new files. Verify formatting consistent. | All files formatted per project style. |
| 6.1.3 | Security check: No hardcoded secrets, API keys, `.env` in source. | Security audit clean. No secrets found. |
| 6.1.4 | SQL injection check: Verify parameterized queries. No string concatenation. | 0 SQL injection vulnerabilities. SEC-03 compliant. |
| 6.1.5 | API response format check: All endpoints return `{ success, data, error, meta }`. | Response format consistent across all endpoints. |
| 6.1.6 | Function size check: No function > 40 lines (Constitution Article 2). | All functions ≤ 40 lines. Refactored if needed. |
| 6.1.7 | File size check: No file > 300 lines (Constitution Article 2). | All files ≤ 300 lines. Modularized if needed. |
| 6.1.8 | No console.log in production code. | Grep removes all console.log from src/. Logging via winston/pino only. |
| 6.1.9 | No TODO/FIXME comments. | Grep finds 0 TODO/FIXME. All removed or resolved. |
| 6.1.10 | AI grading check: All AI calls go through `src/ai/grading.service.js` (IELTS-09). | 0 direct Anthropic API calls found. |

**Dependencies:** All implementation tasks complete.

**Definition of Done:**
- ✅ ESLint: 0 warnings.
- ✅ Prettier: formatted.
- ✅ Security: clean.
- ✅ Constitution compliance: verified.

---

### Task 6.2: Documentation & Handoff

**Estimated Effort:** 0.25 day

**Description:** Document new endpoints, migration steps, deployment notes.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 6.2.1 | Create API documentation (Swagger/OpenAPI) for new endpoints. | OpenAPI spec updated. All endpoints documented. |
| 6.2.2 | Write deployment notes: migration steps, env vars needed, feature flags. | Deployment guide clear. No surprises in production. |
| 6.2.3 | Document AutoGrader: algorithm, normalization rules, band table. | Algorithm document + code comments. Maintainable. |
| 6.2.4 | Update agents_changelog.md: log all changes made during sprint. | Changelog entry detailed. Future developers understand what changed. |

**Definition of Done:**
- ✅ API docs complete.
- ✅ Deployment clear.
- ✅ Changelog updated.

---

### Task 6.3: Create PR & Code Review

**Estimated Effort:** (Depends on review cycle, typically 2–3 days including feedback)

**Description:** Create pull request, address review feedback, merge to main.

**Subtasks:**

| # | Subtask | AC |
|---|---------|-----|
| 6.3.1 | Create PR on GitHub: compare `feat/objective-testing` → `main`. Include description, link to spec, screenshot/demo video. | PR created. Description clear. Reviewers tagged. |
| 6.3.2 | Code review round 1: Reviewers comment. Address feedback. Commit changes. | Feedback addressed. Commits clean. No force-push. |
| 6.3.3 | CI/CD pipeline passes: Tests green, ESLint clean, build succeeds. | CI pipeline shows all checks passing. |
| 6.3.4 | Minimum 1 approval: Tech Lead or Senior Dev approves. | PR approved by designated reviewer. |
| 6.3.5 | Squash merge to main. | PR merged with squash. Main branch updated. |
| 6.3.6 | Deploy to staging/production: coordinate with DevOps. Monitor for errors. | Feature live. Logging monitored. No runtime errors. |

**Definition of Done:**
- ✅ PR merged.
- ✅ CI/CD passed.
- ✅ Feature deployed.
- ✅ No critical bugs in monitoring.

---

## Implementation Order & Timeline

```
Day 1 (Mon):  Task 1.1 (DB Migrations)
Day 2 (Tue):  Task 1.2 (optional) + Task 2.1 (AutoGrader)
Day 3 (Wed):  Task 2.2 (DB Queries)
Day 4 (Thu):  Task 2.3 (TestAttempts Controller) + Task 2.4 (MockTests Controller)
Day 5 (Fri):  Task 3.1 (Audit Logging) + Task 3.2 (Scheduled Publish)
Day 6 (Mon):  Task 4.1 (Start UI + Navigation)
Day 7 (Tue):  Task 4.2 (Timer + Auto-submit) + Task 4.3 (Answer Input + Autosave)
Day 8 (Wed):  Task 4.4 (Results Page)
Day 9 (Thu):  Task 5.1 + 5.2 (Unit + Integration Tests)
Day 10 (Fri): Task 5.3 (Frontend Tests) + Task 5.4 (DB Migration Tests)
Day 11 (Mon): Task 6.1 + 6.2 + 6.3 (Code Review & PR)
```

---

## Risk Mitigation & Escalation

| Risk | Mitigation |
|------|-----------|
| Auto-grader performance issues | Benchmark early (Day 2). Optimize if > 1s. |
| Transaction deadlocks | Test high concurrency. Use advisory locks. |
| AI explain service not ready | Mock it during frontend dev. Integrate later. |
| DB migration issues | Test rollback. Dry-run on staging first. |
| Frontend browser compatibility | Test on Chrome, Firefox, Safari. Use polyfills if needed. |

---

## Success Criteria (Feature Complete)

- ✅ All tasks completed on schedule (or with documented delays).
- ✅ 80%+ code coverage on new code.
- ✅ 0 ESLint warnings.
- ✅ All acceptance criteria from spec verified.
- ✅ Audit trail complete and queryable.
- ✅ Auto-grading < 1s for 40 questions.
- ✅ Question versioning working (old attempts unaffected).
- ✅ No IDOR vulnerabilities.
- ✅ Deployed to staging without critical bugs.
- ✅ Documented for handoff.

---

*Generated:* 2026-06-03  
*Authors:* Engineering Team (Prepared for Sprint 2 Planning)
