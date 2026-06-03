# Implementation Plan: AI Assistance (feat-ai-assistance)

**Status:** FINAL DRAFT — Awaiting Tech Lead Review  
**Linked Spec:** `.sdd/specs/feat-ai-assistance/SPEC.md` (FINAL DRAFT, Risk: High)  
**Sprint:** Sprint 1 — Foundation  
**Date:** 2026-06-03  

---

## 1. ARCHITECTURAL APPROACH

- **Layered Architecture:** Route → Controller → Service → DB Query (raw `pg`) / External AI Service. Tuyệt đối không dùng ORM.

- **Feature Boundary:** `feat-ai-assistance` không sở hữu toàn bộ luồng tạo Writing/Speaking submission. Việc tạo submission thuộc / phối hợp với `feat-subjective-grading`. Feature này chỉ xử lý AI sau khi submission đã tồn tại và có `grader = 'ai'`, đồng thời xử lý Explain with AI, Chatbot, Tutor AI Precheck và Admin AI Usage.

- **AI Integration Isolation:** Giao tiếp với External LLM / STT Provider được đóng gói hoàn toàn trong `backend/src/ai/`. Controllers và Services nội bộ không gọi trực tiếp Provider SDK.

- **Async Processing & Socket.io:** Đối với AI Grading Writing/Speaking, xử lý bất đồng bộ vì thời gian có thể dài. API trả về HTTP `202 Accepted`, quá trình xử lý chạy nền, kết quả được push về Client qua Socket.io. Nếu xử lý thất bại, submission giữ nguyên `status = 'pending'`, không tạo final report rỗng, và lỗi được báo bằng Socket.io event / job metadata / application logs.

- **No New Submission Status:** Sprint 1 giữ nguyên enum `submission_status`: `pending`, `ai_graded`, `tutor_graded`, `reviewed`. `grader = 'ai'` thể hiện bài được chọn chấm bởi AI; `status = 'pending'` thể hiện bài đang chờ xử lý hoặc có thể retry sau lỗi provider.

- **Provider-Agnostic Structured Output:** Backend SHOULD dùng structured output theo khả năng của từng provider. Không hard-code riêng `response_format: { type: "json_object" }` cho mọi provider. Dù dùng Claude/OpenAI/STT provider nào, dữ liệu trả về vẫn bắt buộc parse, validate, normalize và sanitize trước khi lưu DB.

- **Idempotency & Guardrails:** Trước khi gọi AI grading hoặc Explain with AI, hệ thống kiểm tra kết quả đã tồn tại để tránh double-billing. Dữ liệu LLM trả về phải validate schema, validate score range, round band score về bước `0.5`, và reject nếu thiếu tiêu chí bắt buộc.

- **Budget Control:** Trước mọi AI provider call mới, service phải gọi `checkGlobalBudget()`. Nếu daily/monthly budget vượt limit, trả HTTP `429 AI_USAGE_LIMIT_EXCEEDED` và không enqueue/call provider. Cached results có thể được trả về mà không cần gọi provider.

- **Cost Tracking:** Lưu token usage đúng vị trí DB:
  - Chatbot: `chatbot_messages.tokens_used`.
  - Explain with AI: `ai_explain_requests.tokens_used`.
  - Writing/Speaking Grading: `ai_feedback_reports.raw_ai_response.tokens_used`.
  - Không lưu grading token vào cột `tokens_used` trực tiếp vì `ai_feedback_reports` không có cột này.

- **Tutor Precheck Safety:** Tutor AI Precheck chỉ là gợi ý hỗ trợ Tutor. Nếu submission có `grader = 'tutor'`, hệ thống KHÔNG được update `writing_submissions.status = 'ai_graded'` và KHÔNG được overwrite `tutor_feedback_reports`.

- **Standardized Responses:** Tuân thủ chuẩn `{ success, data, error, meta }`.

---

## 2. COMPONENTS & INTERFACE

### 2.1 `AiProvider` — `backend/src/ai/grading.service.js`

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `evaluateWriting(prompt, responseText, taskNumber)` | `prompt`, `responseText`, `taskNumber: 1\|2` | `Promise<AiGradingResult>` | Prompt khác nhau tùy Task 1/2. Bắt buộc trả về dữ liệu đủ 4 tiêu chí Writing |
| `evaluateSpeaking(transcript, partNumber)` | `transcript`, `partNumber: 1\|2\|3` | `Promise<AiGradingResult>` | Prompt chấm Fluency, Lexical, Grammar, Pronunciation nếu provider hỗ trợ. `pronunciation_score = null` nếu text-only |
| `explainQuestion(questionContext, studentQuestion)` | `{ q_text, options, correct, tutor_expl }`, `student_q` | `Promise<{ answer: string, tokens: number, raw?: object }>` | Không thay đổi correct answer |
| `chatWithAi(sessionContext, message)` | `history_messages[]`, `message` | `Promise<{ content: string, tokens: number, raw?: object }>` | Ràng buộc phạm vi IELTS, Academic English, Grammar, platform guidance |
| `transcribeAudio(audioUrl)` | `audioUrl: string` | `Promise<{ transcript: string, confidence?: number, raw?: object }>` | Gọi STT provider |

---

### 2.2 `AiSchemaValidator` — `backend/src/ai/ai.schema.js`

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `validateWritingResult(raw)` | Provider raw response | `AiWritingResult` | Bắt buộc có 4 tiêu chí Writing |
| `validateSpeakingResult(raw)` | Provider raw response | `AiSpeakingResult` | Cho phép `pronunciation_score = null` nếu provider không hỗ trợ |
| `validateExplainResult(raw)` | Provider raw response | `{ ai_response, tokens_used }` | Không cho output đổi correct answer |
| `validateChatResult(raw)` | Provider raw response | `{ content, tokens_used }` | Không lộ system prompt / secrets |
| `roundBandToHalf(value)` | `number` | `number` | Làm tròn score về bước 0.5 |
| `assertScoreRange(value)` | `number` | `void` | Reject nếu ngoài `[0.0, 9.0]` |

---

### 2.3 `AiQueries` — `backend/src/db/queries/ai.queries.js`

| Function | Input | Output | SQL target |
|----------|-------|--------|------------|
| `getWritingSubmission(pool, id, userId?)` | `submissionId`, optional `userId` | `WritingSubmission \| null` | `writing_submissions` |
| `getSpeakingSubmission(pool, id, userId?)` | `submissionId`, optional `userId` | `SpeakingSubmission \| null` | `speaking_submissions` |
| `findAiReportByWritingId(pool, writingId)` | `writingId` | `Report \| null` | Check duplicate report |
| `findAiReportBySpeakingId(pool, speakingId)` | `speakingId` | `Report \| null` | Check duplicate report |
| `saveAiGradingReport(pool, data)` | report data | `{ id: UUID }` | `INSERT ai_feedback_reports` + update submission status = `ai_graded` |
| `saveTutorPrecheckReport(pool, data)` | precheck data | `{ id: UUID }` | `INSERT ai_feedback_reports`; no submission status update |
| `getQuestionContext(pool, questionId, userId)` | `questionId`, `userId` | `QuestionContext \| null` | Read question and review permission |
| `findExplainRequest(pool, userId, questionId)` | `userId`, `questionId` | `ExplainRequest \| null` | Optional cache |
| `saveExplainRequest(pool, data)` | explain data | `{ id: UUID }` | `ai_explain_requests` |
| `createChatSession(pool, userId)` | `userId` | `{ id: UUID }` | `chatbot_sessions` |
| `getChatSession(pool, sessionId, userId)` | `sessionId`, `userId` | `Session \| null` | Check owner and ended state |
| `endChatSession(pool, sessionId, userId)` | `sessionId`, `userId` | `void` | Set `ended_at = NOW()` |
| `saveChatMessage(pool, data)` | message data | `{ id: UUID }` | `chatbot_messages` |
| `getChatSessionMessages(pool, sessionId, userId, limit)` | `sessionId`, `userId`, `limit` | `Message[]` | Default `CHAT_HISTORY_LIMIT = 20` |
| `getAiReport(pool, reportId)` | `reportId` | `ReportDetail \| null` | Read report + owner |
| `getAdminUsageMetrics(pool, dates)` | date range | `UsageMetrics[]` | Aggregate from source AI tables + `platform_metrics_snapshots` |
| `upsertPlatformMetricsSnapshot(pool, snapshotDate, totals)` | `date`, totals | `void` | UPSERT daily `ai_calls_total`, `ai_tokens_total` |

Admin usage source:

* Chatbot usage: `chatbot_messages.tokens_used`.
* Explain usage: `ai_explain_requests.tokens_used`.
* Writing/Speaking usage: `ai_feedback_reports.raw_ai_response->>'tokens_used'`.
* Daily total snapshot: `platform_metrics_snapshots.ai_calls_total`, `platform_metrics_snapshots.ai_tokens_total`.

---

### 2.4 `AiService` — `backend/src/services/ai.service.js`

| Method | Input | Output | Logic tóm tắt |
|--------|-------|--------|----------------|
| `processWritingEvaluation(submissionId, userId)` | `subId, userId` | `{ message }` or existing report | Check owner/grader → check existing report → check status pending → check budget → return 202 → enqueue job |
| `runWritingEvaluationJob(submissionId, userId)` | `subId, userId` | `void` | Provider → retry once if transient → validate schema → repair retry once if needed → save report → update `ai_graded` |
| `processSpeakingEvaluation(submissionId, userId)` | `subId, userId` | `{ message }` or existing report | Check owner/grader → check existing report → check status pending/audio → check budget → return 202 → enqueue job |
| `runSpeakingEvaluationJob(submissionId, userId)` | `subId, userId` | `void` | STT → retry once if transient → save transcript → provider → validate → save report → update `ai_graded` |
| `explainObjectiveQuestion(userId, qId, context)` | `userId, qId, context` | `{ ai_response, tokens }` | Check access → optional cache → check budget → provider → save |
| `startChatSession(userId)` | `userId` | `{ session_id }` | Create session |
| `sendChatMessage(userId, sessionId, msg)` | `user, session, msg` | `{ reply }` | Check session → validate msg → check budget → save user msg → provider → save bot msg |
| `getAiReport(reportId, userId, role)` | `reportId, userId, role` | `ReportDetail` | Check Student/Tutor/Admin permission |
| `getTutorPrecheck(submissionId, tutorId)` | `submissionId, tutorId` | `{ precheck }` | Return existing precheck/report |
| `processTutorPrecheck(submissionId, tutorId)` | `submissionId, tutorId` | `{ message }` | Check Tutor permission → check existing report → check budget → enqueue job → no status update |
| `getAdminUsage(userId, dates)` | `userId`, `{ dateFrom, dateTo, groupBy }` | `UsageMetrics[]` | Admin role check → aggregate metrics only |
| `checkGlobalBudget(featureName, userId?)` | `featureName`, optional `userId` | `boolean` | Check daily and monthly AI usage against `AI_DAILY_TOKEN_LIMIT` and `AI_MONTHLY_TOKEN_LIMIT` before provider call |
| `aggregateAiMetrics()` | `void` | `void` | Cronjob hourly/daily: aggregate token usage and UPSERT into `platform_metrics_snapshots` |

Failure behavior:

* If Writing/Speaking AI job fails, keep submission `pending`, do not create final report, emit `ai_grading_error`.
* If Tutor Precheck job fails, do not update `writing_submissions.status`, do not overwrite tutor feedback, emit `ai_precheck_error`.

---

### 2.5 `AiController` — `backend/src/controllers/ai.controller.js`

| Handler | Method & Path | Response | Ghi chú |
|---------|--------------|----------|----------|
| `evaluateWriting` | `POST /api/v1/ai/writing/evaluate/:submission_id` | `202 Accepted` or existing report | Async process for existing submission |
| `evaluateSpeaking` | `POST /api/v1/ai/speaking/evaluate/:submission_id` | `202 Accepted` or existing report | Async process for existing submission |
| `getReport` | `GET /api/v1/ai/reports/:report_id` | `200 { report }` | Filter private metadata |
| `explain` | `POST /api/v1/ai/explain` | `201 { explanation }` or `200 cached` | Student only |
| `createSession` | `POST /api/v1/ai/chat/sessions` | `201 { session_id }` | Student only |
| `chatMessage` | `POST /api/v1/ai/chat/sessions/:session_id/messages` | `201 { reply }` | Student only |
| `endSession` | `PATCH /api/v1/ai/chat/sessions/:session_id/end` | `200 { message }` | Student only |
| `tutorPrecheckGet` | `GET /api/v1/tutor/submissions/writing/:id/ai-precheck` | `200 { precheck }` | Tutor route |
| `tutorPrecheckPost` | `POST /api/v1/tutor/submissions/writing/:id/ai-precheck` | `202 Accepted` or existing report | Tutor route |
| `adminUsage` | `GET /api/v1/admin/ai/usage` | `200 { metrics }` | Admin route |

---

### 2.6 `AiJobQueue / AiWorker` — `backend/src/jobs/ai.worker.js`

| Job | Payload | Ghi chú |
|-----|---------|---------|
| `writing-ai-evaluation` | `{ submissionId, userId }` | Chấm Writing AI, update status after successful report creation |
| `speaking-ai-evaluation` | `{ submissionId, userId }` | STT + Speaking AI grading |
| `tutor-writing-precheck` | `{ submissionId, tutorId }` | Create Tutor precheck, no submission status update |
| `aggregate-ai-metrics` | none | Cronjob updates `platform_metrics_snapshots` |

Implementation options:

* Sprint demo: Native Promise.
* Production recommended: BullMQ + Redis.

Failure rules:

* Provider/STT/schema failure → keep submission status `pending`.
* Do not insert incomplete final report.
* No enum/status change required; `submission_status` remains unchanged.
* Emit `ai_grading_error` or `ai_precheck_error` with client-safe error code.

---

## 3. DATA FLOW (Luồng dữ liệu)

### Flow 1: AI Writing Evaluation (Async Flow)

```
Client POST /api/v1/ai/writing/evaluate/:id
  → authenticate middleware
  → AiController.evaluateWriting()
  → AiService.processWritingEvaluation()
      ├─ AiQueries.getWritingSubmission(id, userId)
      │   └─ NOT FOUND / Wrong User / grader != 'ai' → 403/404/400
      ├─ Check existing report by writing_submission_id
      │   └─ EXISTS → return existing report, do not call AI provider
      ├─ Check status = 'pending'
      │   └─ status != 'pending' → 400 Invalid submission state
      ├─ AiService.checkGlobalBudget(featureName='writing_evaluation', userId)
      │   └─ LIMIT EXCEEDED → HTTP 429
      ├─ Return HTTP 202 Accepted
      └─ Async job:
          ├─ AiProvider.evaluateWriting()
          │   ├─ Transient 5xx/timeout → retry once
          │   └─ Still fail → log, keep `pending`, emit `ai_grading_error`
          ├─ AiSchemaValidator.validateWritingResult()
          │   ├─ Invalid schema → retry once with repair prompt
          │   └─ Still invalid → log, keep `pending`, emit `ai_grading_error`
          ├─ Normalize scores to 0.5
          ├─ INSERT ai_feedback_reports with raw_ai_response.tokens_used
          ├─ UPDATE writing_submissions SET status = 'ai_graded'
          └─ Socket.io emit('ai_grading_completed')
```

### Flow 2: AI Speaking Evaluation (Async Flow)

```
Client POST /api/v1/ai/speaking/evaluate/:id
  → authenticate middleware
  → AiController.evaluateSpeaking()
  → AiService.processSpeakingEvaluation()
      ├─ AiQueries.getSpeakingSubmission(id, userId)
      │   └─ NOT FOUND / Wrong User / grader != 'ai' → 403/404/400
      ├─ Check existing report by speaking_submission_id
      │   └─ EXISTS → return existing report, do not call AI provider
      ├─ Check status = 'pending'
      │   └─ status != 'pending' → 400 Invalid submission state
      ├─ Check audio_url exists
      ├─ AiService.checkGlobalBudget(featureName='speaking_evaluation', userId)
      │   └─ LIMIT EXCEEDED → HTTP 429
      ├─ Return HTTP 202 Accepted
      └─ Async job:
          ├─ AiProvider.transcribeAudio()
          │   ├─ Transient 5xx/timeout → retry once
          │   └─ Still fail → log, keep `pending`, emit `ai_grading_error`
          ├─ UPDATE speaking_submissions SET transcript = transcript
          ├─ AiProvider.evaluateSpeaking()
          │   ├─ Transient 5xx/timeout → retry once
          │   └─ Still fail → log, keep `pending`, emit `ai_grading_error`
          ├─ AiSchemaValidator.validateSpeakingResult()
          │   ├─ Invalid schema → retry once with repair prompt
          │   └─ Still invalid → log, keep `pending`, emit `ai_grading_error`
          ├─ INSERT ai_feedback_reports with raw_ai_response.tokens_used
          ├─ UPDATE speaking_submissions SET status = 'ai_graded'
          └─ Socket.io emit('ai_grading_completed')
```

### Flow 3: Explain with AI (Sync Flow)

```
Client POST /api/v1/ai/explain
  → authenticate middleware
  → AiService.explainObjectiveQuestion()
      ├─ Check question access
      ├─ Check cached explanation
      │   └─ EXISTS → return cached response
      ├─ checkGlobalBudget(featureName='explain_with_ai', userId)
      ├─ Build context from questions
      ├─ AiProvider.explainQuestion()
      ├─ AiSchemaValidator.validateExplainResult()
      └─ INSERT ai_explain_requests
```

### Flow 4: AI Chatbot Message (Sync Flow)

```
Client POST /api/v1/ai/chat/sessions/:id/messages
  → authenticate middleware
  → AiService.sendChatMessage()
      ├─ Check session owner and ended_at
      ├─ Validate message
      ├─ checkGlobalBudget(featureName='chatbot', userId)
      ├─ INSERT chatbot_messages(role='user')
      ├─ Load recent history
      ├─ AiProvider.chatWithAi()
      ├─ AiSchemaValidator.validateChatResult()
      └─ INSERT chatbot_messages(role='assistant', tokens_used)
```

### Flow 5: Tutor AI Preliminary Check (Async Flow)

```
Tutor POST /api/v1/tutor/submissions/writing/:id/ai-precheck
  → authenticate middleware
  → tutor role middleware
  → AiService.processTutorPrecheck()
      ├─ Check Tutor permission
      ├─ Check existing precheck/report
      │   └─ EXISTS → return existing precheck
      ├─ checkGlobalBudget(featureName='tutor_precheck', tutorId)
      ├─ Return HTTP 202 Accepted
      └─ Async job:
          ├─ AiProvider.evaluateWriting()
          ├─ AiSchemaValidator.validateWritingResult()
          ├─ AiQueries.saveTutorPrecheckReport()
          │   └─ INSERT ai_feedback_reports only
          └─ Socket.io emit('ai_precheck_completed')
```

Critical rule:

```
Tutor AI Precheck MUST NOT update writing_submissions.status and MUST NOT overwrite tutor_feedback_reports.
```

### Flow 6: Admin AI Usage Metrics (Sync Flow)

```
Admin GET /api/v1/admin/ai/usage
  → authenticate middleware
  → admin role middleware
  → AiService.getAdminUsage()
      ├─ Validate date range
      ├─ Read platform_metrics_snapshots
      ├─ Read chatbot_messages.tokens_used
      ├─ Read ai_explain_requests.tokens_used
      ├─ Read ai_feedback_reports.raw_ai_response->>'tokens_used'
      └─ Return aggregated metrics only
```

### Flow 7: AI Metrics Aggregation Job

```
Cron / Worker aggregate-ai-metrics
  → AiService.aggregateAiMetrics()
      ├─ Scan chatbot_messages.tokens_used for assistant messages
      ├─ Scan ai_explain_requests.tokens_used
      ├─ Scan ai_feedback_reports.raw_ai_response->>'tokens_used'
      ├─ Count AI calls by day
      ├─ Sum tokens by day
      └─ UPSERT platform_metrics_snapshots(snapshot_date, ai_calls_total, ai_tokens_total)
```

---

## 4. IMPLEMENTATION DEPENDENCIES

**Thứ tự triển khai:**

| Bước | Nội dung | Phụ thuộc |
|------|----------|-----------|
| 1 | `AiProvider` and prompt templates | none |
| 2 | `AiSchemaValidator` | Step 1 |
| 3 | `AiQueries` raw SQL functions | Existing DB schema |
| 4 | `AiService` with idempotency, budget check, ownership checks | Steps 1–3 |
| 5 | `AiJobQueue / AiWorker` for Writing/Speaking/Tutor Precheck/Metrics | Step 4 |
| 6 | `AiController` & Routes | Step 4 |
| 7 | Socket.io namespace/events | Step 5 |
| 8 | Admin usage aggregation endpoint | Steps 3–6 |
| 9 | Unit tests with mocked provider | Steps 1–4 |
| 10 | Integration tests with DB and mocked provider | Steps 3–7 |

**External Dependencies:**

- `@anthropic-ai/sdk` or `openai`, depending on provider decision.
- STT provider SDK/API for Speaking transcription.
- `socket.io` for notifications.
- BullMQ + Redis if production-ready background jobs are selected.
- `zod` or equivalent JSON validation library.
- Existing or new rate limiter.

---

## 5. TECHNICAL RISKS & MITIGATION

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | LLM returns malformed JSON or missing criteria | High | High | Structured output when supported, schema validation, retry once with repair prompt, do not persist invalid report |
| 2 | STT timeout or poor transcript quality | Medium | High | Async processing, retry once for transient errors, keep submission `pending`, no incomplete report |
| 3 | Prompt injection | Medium | High | Treat student input as untrusted, isolate system/user context, never expose secrets |
| 4 | API token cost spike | Medium | High | Rate limit, check daily/monthly budget, max tokens, metrics aggregation |
| 5 | Native Promise job lost on restart | Medium | Medium | Use same interface so BullMQ + Redis can replace it later |
| 6 | Tutor Precheck changes submission status | Medium | High | Separate `saveTutorPrecheckReport()` from `saveAiGradingReport()` and test status unchanged |
| 7 | Admin metrics expose private content | Low | High | Aggregate metrics only by default |
| 8 | Wrong token storage for grading | Medium | Medium | Store grading token usage in `raw_ai_response.tokens_used` and test it |
| 9 | Provider failure looks like completed grading | Medium | High | Keep `pending`, emit failed event, no final report |

---

## 6. OPEN QUESTIONS

| # | Question | Owner | Priority | Status |
|---|----------|-------|----------|--------|
| Q1 | Should Sprint 1 use Native Promise or BullMQ + Redis for async grading? | Tech Lead | High | Open |
| Q2 | Which LLM provider/model will be used for Writing, Speaking, Explain, and Chatbot? | Tech Lead | High | Open |
| Q3 | Which STT provider will be used for Speaking transcription? | Tech Lead / Infrastructure | High | Open |
| Q4 | Should `pronunciation_score = NULL` be default if provider only supports transcript? | Product / Tech Lead | High | Open |
| Q5 | What are daily/monthly AI token budgets? | PM / Admin | High | Open |
| Q6 | Can a Student regenerate an AI report for the same submission? | Product Owner | Medium | Open |
| Q7 | Is `AI_MOCK_MODE=true` required for Dev/Test? | Team | Medium | Open |

---

## 7. DEFINITION OF DONE

Feature `feat-ai-assistance` is DONE when:

- [ ] All endpoints in SPEC §6 work with correct HTTP codes and response format.
- [ ] Database access uses parameterized raw SQL only.
- [ ] AI provider calls go through `backend/src/ai/`.
- [ ] Controllers do not call provider SDK directly.
- [ ] Writing/Speaking evaluation processes existing submissions through `submission_id`.
- [ ] AI output is validated before DB persistence.
- [ ] Scores are within `[0.0, 9.0]` and rounded to nearest `0.5`.
- [ ] Invalid/malformed AI response is not saved as a final report.
- [ ] Successful AI grading inserts report and updates status to `ai_graded`.
- [ ] Async provider/STT/schema failure keeps submission status as `pending` and does not add any new DB enum/status.
- [ ] Tutor AI Precheck does not update `writing_submissions.status`.
- [ ] Tutor AI Precheck does not overwrite `tutor_feedback_reports`.
- [ ] Token usage is stored correctly:
  - [ ] Chatbot → `chatbot_messages.tokens_used`.
  - [ ] Explain with AI → `ai_explain_requests.tokens_used`.
  - [ ] Writing/Speaking Grading → `ai_feedback_reports.raw_ai_response.tokens_used`.
- [ ] `checkGlobalBudget()` is called before every new provider call: Writing, Speaking, Explain, Chatbot, Tutor Precheck.
- [ ] Metrics aggregation job upserts daily totals into `platform_metrics_snapshots`.
- [ ] Socket.io sends completion/failure notification for async grading.
- [ ] Chatbot restricts answers to IELTS / Academic English / platform guidance.
- [ ] Ownership checks prevent cross-user access.
- [ ] Admin Usage endpoint returns aggregate metrics only by default.
- [ ] Test coverage is at least 85% for AI Assistance backend module.
- [ ] Automated tests mock AI provider calls.
- [ ] API responses do not expose API keys, hidden prompts, raw provider errors, stack traces, or private user content.
