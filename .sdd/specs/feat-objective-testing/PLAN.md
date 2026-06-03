# Implementation Plan: Objective Testing & Test Management (feat-objective-testing)

**Status:** DRAFT — Awaiting Tech Lead Review  
**Linked Spec:** `.sdd/specs/feat-objective-testing/SPEC.md` (DRAFT, Risk: Medium)  
**Sprint:** Sprint 2 — Assessment Engine  
**Date:** 2026-06-03

---

## 1. ARCHITECTURAL APPROACH

- **Layered Architecture:** Tuân thủ Route → Controller → Service → DB Query (raw `pg`). Tuyệt đối không dùng ORM (Constitution Article 1).
- **Synchronous Auto-grading:** Grading phải chạy within the submit transaction và hoàn tất < 1 giây cho 40 câu hỏi. `AutoGrader` là pure service chạy in-memory, không gọi AI.
- **Historical Immutability:** Khi Tutor cập nhật question, tạo row `questions` mới (versioning). Existing `question_answers` vẫn reference `question_id` cũ — tuyệt đối không re-grade retroactively.
- **Parameterized Queries Only:** Mọi DB query dùng `$1, $2` (SEC-03). Zero string concatenation với user input.
- **Audit Logging:** Mọi Tutor mutation (create, update, delete test/question, update answer key) ghi vào `audit_logs` với `actor_id`, `action`, `target_table`, `target_id`, `old_value`, `new_value` (JSONB).
- **Standardized Responses:** Mọi API endpoint tuân theo format `{ success, data, error, meta }` (Constitution Article 2).

---

## 2. COMPONENTS & INTERFACE

### 2.1 `AutoGrader` — `src/backend/src/services/autoGrader.service.js`

> Pure utility service — không phụ thuộc DB, không phụ thuộc HTTP, 100% testable.

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `gradeAttempt(testQuestions, answers)` | `testQuestions: []`, `answers: [{ question_id, given_answer }]` | `{ raw_score: number, per_question: [{ question_id, is_correct, given_answer, correct_answer, explanation }] }` | Multiple Choice: exact match. Fill-in-blank: normalize cả hai chuỗi rồi so sánh. Chạy xong < 1s |
| `normalizeAnswer(answer, question_type)` | `answer: string`, `question_type: 'mcq' \| 'fill_blank'` | `normalized: string` | Fill-in-blank: `s.trim().toLowerCase().replace(/[.,!?;:'"]+$/, '').replace(/\s+/g, ' ')`. Null input → `''`. MCQ: trim only. |
| `toBandScore(rawScore, skill)` | `rawScore: number (0–40)`, `skill: 'reading' \| 'listening'` | `band: number (1.0–9.0 bội số 0.5)` | Lookup skill-specific table: `READING_BAND_TABLE` hoặc `LISTENING_BAND_TABLE` — cả hai hardcoded. VD: Reading 30 → 6.5, Listening 30 → 6.5. |

---

### 2.2 DB Queries — `src/backend/src/db/queries/tests.queries.js`

> Raw SQL parameterized ($1, $2). Mọi function nhận `pool` làm tham số đầu tiên.

| Function | Input | Output | SQL target |
|----------|-------|--------|------------|
| `getQuestionsForAttempt(pool, testId)` | `testId: string` | `questions: [{ id, question_order, question_text, options, question_type }]` | `SELECT DISTINCT ON (question_order) ... ORDER BY question_order ASC, updated_at DESC` — lấy 1 version mới nhất mỗi `question_order`. Omit `correct_answer`/`explanation`. Dùng cho `startAttempt`. |
| `getTestForStart(pool, testId)` | `testId: string` | `{ id, title, skill, difficulty, duration_minutes }` | SELECT metadata từ `mock_tests`. Check `is_published = TRUE`. |
| `getTestForGrading(pool, testId, questionIds)` | `testId`, `questionIds[]` | `{ questions: [{ id, question_text, options, correct_answer, question_order }] }` | Fetch official questions theo `question_id` array để grade. `correct_answer` có mặt. |
| `createTestAttempt(pool, data)` | `{ test_id, user_id, mode: 'timed' \| 'untimed' }` | `{ id: string }` | INSERT vào `test_attempts`, set `started_at = NOW()`, `submitted_at = NULL`. |
| `insertQuestionAnswers(pool, attemptId, answers)` | `attemptId`, `answers: [{ question_id, given_answer, is_correct }]` | `void` | Bulk INSERT vào `question_answers`. |
| `updateTestAttemptResult(pool, data)` | `{ attempt_id, submitted_at, band_score, raw_score }` | `void` | UPDATE `test_attempts`. |
| `versionQuestion(pool, data, actorId)` | `{ test_id, question_id, newValues: { correct_answer, explanation, question_text, options } }`, `actorId` | `{ new_question_id: string }` | INSERT row `questions` mới (preserve `question_order`), log audit. |
| `getLatestQuestionByTestAndOrder(pool, testId, order)` | `testId`, `order: number (1–40)` | `{ id, ..., updated_at }` | Fetch question hiện tại cho test theo order cụ thể. |
| `insertAuditLog(pool, audit)` | `{ actor_id, action, target_table, target_id, old_value, new_value }` | `void` | INSERT vào `audit_logs`. |
| `getAttemptWithAnswers(pool, attemptId)` | `attemptId` | `{ attempt, questions_answers[] }` | JOIN `test_attempts` + `question_answers` + `questions` để view result. |
| `countActiveAttempts(pool, userId, testId)` | `userId`, `testId` | `number` | Kiểm tra user có attempt chưa submit. |

---

### 2.3 `TestAttemptsController` — `src/backend/src/controllers/testAttempts.controller.js`

| Handler | Endpoint | Input | Output | Logic tóm tắt |
|---------|----------|-------|--------|----------------|
| `startAttempt` | `POST /api/v1/test-attempts` | `{ test_id, mode }` (body) | 201 `{ attempt_id, test_id, mode, started_at, questions[] }` | Validate test `is_published=true`. Check user không có incomplete attempt cho test này (409). Create attempt. Gọi `getQuestionsForAttempt` (latest version per order). Return questions (omit answers). |
| `submitAttempt` | `POST /api/v1/test-attempts/:id/submit` | `{ answers: [{ question_id, given_answer }] }` | 200 `{ band_score, raw_score, submitted_at }` | Validate owner (IDOR). Check `submitted_at IS NULL` (409). Fetch official questions. Run `AutoGrader.gradeAttempt()`. Tính `band_score = AutoGrader.toBandScore(raw_score, skill)`. Begin TX → Insert answers → Update result → Commit. |
| `getResult` | `GET /api/v1/test-attempts/:id/result` | URL param: `id` | 200 `{ band_score, raw_score, per_question: [{ given_answer, correct_answer, is_correct, explanation }] }` | Owner hoặc tutor/admin mới xem. Return full result với correct answers + explanations. |
| `listAttempts` | `GET /api/v1/test-attempts` | Query: `page, limit, skill?` | 200 `{ attempts: [], page, limit, total }` | Student xem own attempts (filter by `req.user.id`). Tutor xem tất cả. |

---

### 2.4 `MockTestsController` — `src/backend/src/controllers/mockTests.controller.js`

| Handler | Endpoint | Input | Output | Logic tóm tắt |
|---------|----------|-------|--------|----------------|
| `createTest` | `POST /api/v1/mock-tests` | `{ title, description, skill, difficulty, duration_minutes }` | 201 `{ id, ... }` | Auth required (tutor). Validate enums. Create row. Log audit `test_created`. |
| `updateTest` | `PUT /api/v1/mock-tests/:id` | `{ title?, difficulty?, duration_minutes?, is_published?, publish_at? }` | 200 `{ id, ... }` | Guard auth. Validate. Kiểm tra ít nhất 1 câu hỏi nếu publish (422 nếu không). Update. Log audit `test_updated`. |
| `deleteTest` | `DELETE /api/v1/mock-tests/:id` | — | 200 | Soft-delete: set `is_published=FALSE`. Log audit `test_deleted`. Existing attempts unaffected. |
| `createQuestion` | `POST /api/v1/mock-tests/:test_id/questions` | `{ question_order, question_text, question_type, options, correct_answer, explanation }` | 201 `{ id, ... }` | Tutor only. Check `question_order` 1–40, unique per test. Insert question. Log audit. |
| `updateQuestion` | `PUT /api/v1/mock-tests/:test_id/questions/:question_id` | Same as create | 200 `{ id, ... }` | Versioning: nếu đề đã có attempt → INSERT new row (preserve `question_order`, `test_id`). Nếu chưa có attempt → UPDATE in-place. Log audit `answer_key_updated`. |
| `listPublishedTests` | `GET /api/v1/mock-tests` | Query: `skill, difficulty, page, limit, search` | 200 `{ tests: [], meta }` | Guest/Student see `is_published=TRUE` only. Return metadata (exclude answers). |
| `listTutorTests` | `GET /api/v1/mock-tests/manage` | Query: `page, limit` | 200 `{ tests: [], meta }` | Tutor only (`authorize('tutor','admin')`). Trả ALL tests (kể cả unpublished) của `created_by = req.user.id`. |
| `getTestDetail` | `GET /api/v1/mock-tests/:id` | — | 200 `{ id, title, skill, ... }` | Return metadata. Tutor see full details + answers; others see metadata + question count. 404 nếu unpublished + non-tutor. |

---

### 2.5 Frontend (React) — High-Level Responsibilities

| Component / Flow | Responsibility |
|---|---|
| **Start Test UI** | Call `POST /api/v1/test-attempts`, render 40-item navigation panel, show timer (timed mode only), display current question. |
| **Timer & Auto-submit** | Countdown logic. At 00:00: lock UI, show "Submitting..." modal, call submit endpoint automatically. Show submit confirmation. |
| **Autosave Draft** | Every 60s: serialize current answers → save to `localStorage` under key `attempt:{attempt_id}:draft`. Optional: sync draft to server endpoint if needed (not in spec). |
| **Results Page** | Call `GET /api/v1/test-attempts/:id/result`, display band score (large), raw score (40), per-question grid with given answer / correct answer / is_correct / explanation. |
| **Explain with AI** | "Explain" button → call `POST /api/v1/ai-explain` with `question_id` → display AI-simplified explanation below. AI service must be mockable in tests. |

---

## 3. DATA FLOW (Luồng dữ liệu)

### Flow 1: Test Publishing & Availability

```
Tutor  POST /api/v1/mock-tests  { title, skill, difficulty, ... }
  → MockTestsController.createTest()
  → MockTestsService.createTest()
      ├─ Validate: skill ∈ {reading, listening}, difficulty ∈ {beginner, intermediate, advanced}
      ├─ createTest() → INSERT mock_tests (is_published=FALSE)
      ├─ insertAuditLog(action='test_created', ...)
      └─ return { id }
  ← Response: 201 { data: { id, title, ... } }

Tutor  PUT /api/v1/mock-tests/:id  { is_published: true, publish_at: null }
  → MockTestsController.updateTest()
  → MockTestsService.updateTest()
      ├─ Validate ownership
      ├─ UPDATE mock_tests SET is_published=TRUE
      ├─ insertAuditLog(action='test_updated', old_value={...}, new_value={...})
      └─ return { id }
  ← Response: 200 { data: { id, is_published: true, ... } }

Guest/Student  GET /api/v1/mock-tests  { skill='reading', difficulty='intermediate' }
  → MockTestsController.listPublishedTests()
  → getPublishedTests(pool, filters)
      ├─ SELECT FROM mock_tests WHERE is_published=TRUE AND skill=$1 AND difficulty=$2
      └─ return paginated list (omit correct_answer, explanation)
  ← Response: 200 { data: { tests: [...], meta: { page, limit, total } } }
```

---

### Flow 2: Test Attempt & Auto-grading

```
Student  POST /api/v1/test-attempts  { test_id, mode: 'timed' }
  → TestAttemptsController.startAttempt()
  → TestAttemptsService.startAttempt(test_id, user_id, mode)
      ├─ getTestForStart(test_id) → check is_published=TRUE
      ├─ countActiveAttempts(user_id, test_id) > 0 → 409 Conflict
      ├─ createTestAttempt({ test_id, user_id, mode, started_at=NOW() })
      ├─ fetch questions from getTestForStart() → omit correct_answer
      └─ return { attempt_id, test_id, mode, started_at, questions: [...], duration_minutes }
  ← Response: 201 { data: { attempt_id, questions: [...], timer_ms: 2400000 } }

[Frontend: Countdown timer reaches 00:00]
  ↓
Student  [Auto-submit UI locked]  POST /api/v1/test-attempts/:id/submit  { answers: [...] }
  → TestAttemptsController.submitAttempt(id)
  → TestAttemptsService.submitAttempt(attemptId, user_id, answers)
      ├─ getAttempt(attemptId) → check user_id matches (IDOR), submitted_at IS NULL
      ├─ getTestForGrading(test_id, question_ids) → fetch official questions (with correct_answer)
      ├─ BEGIN TRANSACTION
      ├─ AutoGrader.gradeAttempt(questions, answers)
      │   ├─ for each answer:
      │   │   ├─ if question.type='mcq': exact match
      │   │   └─ if question.type='fill_blank': normalize both sides, exact match
      │   │   └─ store { question_id, given_answer, is_correct }
      │   └─ raw_score = count(is_correct)
      ├─ band_score = AutoGrader.toBandScore(raw_score)
      ├─ insertQuestionAnswers(attemptId, per_question_results)
      ├─ updateTestAttemptResult({ attempt_id, submitted_at=NOW(), band_score, raw_score })
      ├─ COMMIT TRANSACTION
      └─ emit Socket event `grading_completed` to user
  ← Response: 200 { data: { band_score: 7.5, raw_score: 30, submitted_at, per_question: [...] } }

Student  GET /api/v1/test-attempts/:id/result
  → TestAttemptsController.getResult(id, user_id)
  → getAttemptWithAnswers(attemptId)
      ├─ SELECT * FROM test_attempts WHERE id=$1 AND user_id=$2
      ├─ SELECT * FROM question_answers WHERE attempt_id=$1
      ├─ JOIN questions to get correct_answer + explanation
      └─ return { band_score, raw_score, per_question: [{ given_answer, correct_answer, is_correct, explanation }] }
  ← Response: 200 { data: { band_score, raw_score, questions: [...] } }
```

---

### Flow 3: Question Versioning (Non-destructive Update)

```
Tutor  PUT /api/v1/mock-tests/:test_id/questions/:question_id  { correct_answer, explanation }
  → MockTestsController.updateQuestion()
  → MockTestsService.versionQuestion(test_id, question_id, newValues, tutor_id)
      ├─ SELECT FROM questions WHERE id=$1 AND test_id=$2 → old row
      ├─ BEGIN TRANSACTION
      ├─ INSERT INTO questions (test_id, question_order, question_text, ..., correct_answer=NEW)
      │   → old question_id vẫn tồn tại, dùng cho existing attempts
      │   → new row có id khác, dùng cho future attempts (hiện tại không applicable cho reading/listening tại tác điểm)
      ├─ insertAuditLog(
      │     action='answer_key_updated',
      │     target_id=old.id,
      │     old_value={ correct_answer: old.correct_answer, explanation: old.explanation },
      │     new_value={ correct_answer: NEW.correct_answer, explanation: NEW.explanation }
      │   )
      ├─ COMMIT TRANSACTION
      └─ return { id: new_question_id }
  ← Response: 200 { data: { id } }

[Ví dụ: Tutor sửa answer key sau khi có students đã nộp]
→ Question_answers của students cũ vẫn reference old question_id
→ old question row vẫn có correct_answer=OLD value
→ Grading result của students cũ KHÔNG thay đổi
→ New attempts (không có) sẽ dùng mới (question_id khác, nếu test chưa lock)
```

---

## 4. IMPLEMENTATION TASKS & ESTIMATES

| # | Task | Effort | Dependencies |
|---|------|--------|--------------|
| **A** | DB Migrations: `mock_tests`, `questions`, `test_attempts`, `question_answers`, `ai_explain_requests`, `audit_logs` tables. Indexes, enums, constraints. | 1 day | — |
| **B** | DB Queries Module (`tests.queries.js`): All parameterized queries, tested. | 1 day | **A** |
| **C** | `AutoGrader` service: gradeAttempt, normalizeAnswer, toBandScore. Unit tests (pure logic). | 0.5 day | — |
| **D** | Controllers & Routes: start, submit, result endpoints. Input validation (express-validator). IDOR checks. Transaction setup. | 1.5 days | **B**, **C** |
| **E** | Question Versioning & Tutor endpoints: updateQuestion versioning logic. Audit logging for all mutations. | 1 day | **B**, **D** |
| **F** | Scheduled Publish Job: node-cron + DB/Redis advisory lock (optional for MVP). | 0.5 day | **B** |
| **G** | Frontend UI: Start test page (timer, navigation panel, autosave), Results page (band score, per-question grid). | 3 days | **D** (backend) |
| **H** | Tests: Unit tests for AutoGrader, integration tests for submit flow, DB migration tests, end-to-end scenario. AI service mocking. | 2 days | **C**, **D**, **E** |
| **I** | Code review, ESLint, Prettier, Pre-commit checklist, PR. | 0.5 day | **A**–**H** |

**Total estimate:** ~11 days (parallelizable across backend/frontend/QA teams).

---

## 5. DATA MODELS & DB SCHEMA

### Core Tables

**Table: `mock_tests`**
- `id` (UUID PK)
- `title` (VARCHAR 500)
- `description` (TEXT)
- `skill` (ENUM: reading, listening, writing, speaking) — feature uses reading/listening
- `difficulty` (ENUM: beginner, intermediate, advanced)
- `duration_minutes` (INT) — NULL = no time limit
- `is_published` (BOOLEAN DEFAULT FALSE)
- `publish_at` (TIMESTAMPTZ) — NULL = no scheduled publish
- `created_by` (UUID FK → users)
- `created_at` (TIMESTAMPTZ DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ DEFAULT NOW())

**Indexes:** `idx_mock_tests_publish`, `idx_mock_tests_skill`, `idx_tests_title_trgm` (GIN trigram for search).

**Table: `questions`**
- `id` (UUID PK)
- `test_id` (UUID FK → mock_tests, ON DELETE CASCADE)
- `question_order` (SMALLINT, 1–40)
- `question_type` (ENUM: mcq, fill_blank)
- `question_text` (TEXT)
- `options` (JSONB: `[{ label: 'A', text: '...' }, ...]` — only for MCQ)
- `correct_answer` (VARCHAR)
- `explanation` (TEXT)
- `created_at` (TIMESTAMPTZ DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ DEFAULT NOW())

**Constraint:** UNIQUE (test_id, question_order) — one question per position.

**Table: `test_attempts`**
- `id` (UUID PK)
- `test_id` (UUID FK → mock_tests, ON DELETE CASCADE)
- `user_id` (UUID FK → users, ON DELETE CASCADE)
- `mode` (ENUM: timed, untimed)
- `started_at` (TIMESTAMPTZ NOT NULL)
- `submitted_at` (TIMESTAMPTZ) — NULL = in-progress
- `band_score` (NUMERIC(3,1)) — 1.0–9.0, null while pending
- `raw_score` (SMALLINT) — 0–40, null while pending
- `created_at` (TIMESTAMPTZ DEFAULT NOW())

**Constraint:** `submitted_at IS NOT NULL` → attempt immutable (no re-grade, no re-submit).

**Constraint:** `submitted_at IS NOT NULL` means immutable.

**Table: `question_answers`**
- `id` (UUID PK)
- `attempt_id` (UUID FK → test_attempts, ON DELETE CASCADE)
- `question_id` (UUID FK → questions, ON DELETE CASCADE)
- `given_answer` (VARCHAR)
- `is_correct` (BOOLEAN)
- `created_at` (TIMESTAMPTZ DEFAULT NOW())

**Constraint:** UNIQUE (attempt_id, question_id) — one answer per question per attempt.

**Table: `audit_logs`** (shared, defined in feat-auth-and-users, reused here)
- `id` (UUID PK)
- `actor_id` (UUID FK → users)
- `action` (VARCHAR: test_created, test_updated, test_deleted, answer_key_updated, ...)
- `target_table` (VARCHAR: mock_tests, questions, ...)
- `target_id` (UUID)
- `old_value` (JSONB)
- `new_value` (JSONB)
- `created_at` (TIMESTAMPTZ DEFAULT NOW())

---

## 6. TECHNICAL RISKS & MITIGATIONS

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| 1 | Auto-grader performance spike on concurrent submits | Low | O(n) with n=40. Rate-limit submissions. Horizontal scale. Monitor p99 latency. |
| 2 | Incorrect versioning: old question row gets deleted or updated retroactively | High | Enforce INSERT-only for new versions. Old question_id immutable. Tests validate historical grading. |
| 3 | Race: Tutor updates question while Student submitting | Medium | Fetch question row by ID at submit time. Do NOT join test.latest_questions. Snapshot in transaction. |
| 4 | Scheduled publish in multi-instance setup causes double-publish | Medium | Use DB advisory lock or Redis distributed lock. Single writer pattern. |
| 5 | Student loses draft on network drop before auto-submit | Medium | LocalStorage auto-save every 60s (spec). Optional: server-side draft persistence (out of scope MVP). |
| 6 | Band score calculation errors due to hardcoded table misalignment | Medium | Unit test `toBandScore()` against official IELTS table. Doc table in code comment. |

---

## 7. OPEN QUESTIONS

| # | Question | Owner | Priority | Status |
|---|----------|-------|----------|--------|
| **Q1** | Fill-in-the-blank: Levenshtein distance tolerance or strict exact-match? Default = exact post-normalization. Tolerant requires RFC. | Tech Lead | HIGH | Open |
| **Q2** | Question versioning: Should old attempts show both old + new correct_answer for transparency, or only historical old? | Product | HIGH | Open |
| **Q3** | Publish job: Use `node-cron` (single instance) or background queue (e.g., Bull)? MVP: `node-cron` + lock. | Backend | MEDIUM | Open |
| **Q4** | Should server persist draft submissions besides `localStorage`? Spec only mandates localStorage. | Product | MEDIUM | Open |
| **Q5** | Explain with AI: Route through existing `src/ai/grading.service.js` or new `src/ai/explain.service.js`? | Tech Lead | MEDIUM | Open |

---

## 8. DEFINITION OF DONE

Feature `feat-objective-testing` được xem là **DONE** khi:

- ✅ Tất cả Acceptance Criteria trong linked spec được thỏa mãn.
- ✅ Tất cả DB queries dùng parameterized SQL, no hardcoded values.
- ✅ `AutoGrader` service unit-tested, 100% deterministic, idempotent.
- ✅ Integration test: submit flow (create → submit → verify band_score + question_answers persisted).
- ✅ Versioning test: update question → verify old attempt grade unchanged, new attempt uses new data.
- ✅ Audit logs recorded for all Tutor mutations.
- ✅ ESLint/Prettier clean (0 warnings).
- ✅ No hardcoded secrets, API keys.
- ✅ Stack trace not exposed in API responses.
- ✅ Input validation on all endpoints.
- ✅ IDOR prevention (attempt ownership check).
- ✅ Transaction safety: all-or-nothing submit.

---

## 9. NEXT STEPS (Immediate Actions)

1. **Tech Lead Review:** Approve this PLAN with feedback.
2. **Create DB Migrations:** Write migration files under `backend/db/migrations/` for new tables (mock_tests, questions, test_attempts, question_answers).
3. **Implement AutoGrader:** Pure service + unit tests.
4. **Implement DB Queries:** Parameterized SQL module + integration tests.
5. **Implement Controllers & Routes:** submit flow with transaction.

---

## 10. AMENDMENTS & RFC PROCESS

Any changes to this PLAN or Constitution Article 1 (Tech Stack) must follow RFC process:
1. Create `.sdd/rfcs/rfc-[YYYY-MM-DD]-[topic].md`.
2. Team review & approval.
3. Update AMENDMENT LOG below with link to RFC.

| Date | RFC File | Change | Approved by |
|------|----------|--------|-------------|
| — | — | — | — |

---

*Authors:* Prepared for Tech Lead review (2026-06-03).  
*References:*
- `.sdd/constitution.md` — Project law & constraints
- `.sdd/shared_context.md` — Shared domain knowledge
- `.sdd/specs/feat-objective-testing/SPEC.md` — Full spec (DRAFT)
- `.sdd/specs/feat-auth-and-users/PLAN.md` — Template reference
