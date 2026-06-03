# Feature: AI Assistance (feat-ai-assistance) — FULL SPECIFICATION

Status: **FINAL DRAFT** | Ready for Review  
Author: SWP391 IELTS Test Online Team | Date: 2026-06-03  
Risk Level: **High** (AI Reliability, Privacy, Cost Control, Grading Trust)  
Related Specs: `.sdd/global/constitution.md`, `.sdd/shared_context.md`, `feat-auth-and-users`, `feat-objective-testing`, `feat-subjective-grading`, `feat-content-library`

---

## 1. Business Context & Goals

This feature provides the **AI Assistance layer** for the IELTS Online Test platform.

The AI Assistance feature supports students and tutors during IELTS practice by providing AI-powered Writing evaluation, Speaking evaluation, contextual explanations, chatbot support, and tutor pre-check assistance. It also provides Admin users with AI usage metrics for monitoring token consumption and platform cost.

Feature boundary:

* `feat-ai-assistance` does **not** own the complete Writing/Speaking submission workflow.
* Submission creation is coordinated with `feat-subjective-grading`.
* This feature owns AI processing after a Writing/Speaking submission exists with `grader = 'ai'`.
* This feature does not modify official answer keys, tutor final grading, user roles, or content library resources.
* This feature uses the existing PostgreSQL schema and does not require a new `submission_status` enum value in Sprint 1.
* If AI processing fails asynchronously, the related submission remains `pending`, no final report is created, and the failure is tracked through application logs, job metadata, or client-safe Socket.io events.

Goals:

* Provide students with structured IELTS-style Writing and Speaking feedback.
* Help students understand objective Reading/Listening questions through simplified AI explanations.
* Provide an AI Chatbot for IELTS study support, grammar/vocabulary explanation, and platform guidance.
* Help Tutors view AI preliminary grammar/vocabulary checks without replacing human feedback.
* Track AI calls and token usage for Admin reporting.
* Keep AI output transparent, bounded, and safe.
* Store AI token usage in the correct existing schema locations.

---

## 2. Stakeholders & User Personas

* **Student:** Authenticated learner. Can request AI evaluation for own Writing/Speaking submissions, view own AI reports, use Explain with AI, and use AI Chatbot.
* **Tutor:** Human grader/content support role. Can view AI preliminary checks on Writing submissions visible or assigned to them, but AI must not overwrite tutor feedback.
* **Admin:** System administrator. Can view aggregated AI usage metrics and cost indicators, but cannot read private chatbot conversations by default.
* **AI System:** Backend service actor. Calls LLM/STT providers, validates provider output, and persists AI outputs through backend services only.
* **Objective Test Module:** Supplies `questions.question_text`, `questions.options`, `questions.correct_answer`, and `questions.explanation` for Explain with AI.
* **Subjective Grading Module:** Supplies existing Writing/Speaking submissions and receives status/report updates after successful AI processing.
* **External AI Provider:** LLM/STT provider. Receives only sanitized learning context and must never receive secrets or unnecessary personal data.

---

## 3. User Stories

* **STU-06:** As a Student, I want to click an **Explain with AI** button under a Tutor's explanation, so that I can get a simplified or deeper breakdown from the AI chatbot.
* **STU-07:** As a Student, I want to type or upload my Writing Task responses, so that I can choose to submit them either to the AI or to a Tutor for evaluation.
* **STU-08:** As a Student, I want to see a Speaking prompt and use a built-in web recorder to capture my voice, so that I can choose to submit the audio either to the AI or to a Tutor for evaluation.
* **STU-09:** As a Student, I want to view a detailed feedback report including Band Score, error highlights, and suggestions after my Writing or Speaking test has been graded.
* **STU-11:** As a Student, I want to have an AI Chatbot window constantly available in my study space, so that I can ask quick academic questions while studying.
* **TUT-03:** As a Tutor, I want to view an AI-generated preliminary grammar and vocabulary check on a student's essay, so that I can grade faster and focus on logic and coherence.
* **ADM-01:** As an Admin, I want to view a system dashboard with key metrics including AI usage and recent activities, so that I can monitor platform performance.
* **ADM-05:** As an Admin, I want to generate and filter usage reports including AI usage by date range, so that I can analyze platform growth and AI costs.
* **AI-01:** As an AI System, I want to analyze students' Writing responses and estimate a Band Score based on IELTS criteria.
* **AI-02:** As an AI System, I want to process Speaking recordings, convert speech to text, and evaluate IELTS Speaking criteria.
* **AI-03:** As an AI System, I want to receive the Tutor's original explanation text and the corresponding test question, so that I can generate a simplified breakdown.
* **AI-04:** As an AI System, I want to act as a chatbot assistant within the student's workspace.

---

## 4. Functional Requirements

### FR-01 — Process Existing Writing Submission for AI Evaluation

WHEN a Student requests AI Writing evaluation, THE system SHALL process only an existing `writing_submissions` record.

The system SHALL verify that:

* the user is authenticated,
* the user role is `student`,
* the user account status is `active`,
* the submission exists,
* the submission belongs to the authenticated Student,
* `grader = 'ai'`,
* `task_number` is `1` or `2`,
* `response_text` is available after typed input or file text extraction.

WHERE the same Writing submission already has an AI report, THE system SHALL return the existing report and SHALL NOT call the AI provider again.

WHERE no existing report is found, THE system SHALL verify that:

* `status = 'pending'`,
* global daily/monthly AI usage budget is not exceeded.

WHEN all conditions are valid, THE system SHALL start Writing AI evaluation asynchronously and return HTTP `202 Accepted`.

---

### FR-02 — Validate Writing Task Type

WHEN a Writing submission is processed, THE system SHALL validate `task_number`.

Allowed values:

* `1` — IELTS Writing Task 1.
* `2` — IELTS Writing Task 2.

WHERE `task_number` is not `1` or `2`, THE system SHALL reject the request with HTTP 400 Bad Request.

---

### FR-03 — Evaluate Writing Criteria

WHEN the AI Writing evaluation service processes a valid Writing submission, THE system SHALL evaluate the response using IELTS-style criteria.

For Writing Task 1, criteria SHALL include:

* Task Achievement.
* Coherence & Cohesion.
* Lexical Resource.
* Grammatical Range & Accuracy.

For Writing Task 2, criteria SHALL include:

* Task Response.
* Coherence & Cohesion.
* Lexical Resource.
* Grammatical Range & Accuracy.

Since the current database column is named `task_achievement_score`, Task Response for Task 2 SHALL be stored in `task_achievement_score` and labeled correctly in `raw_ai_response`.

All AI-generated scores SHALL be validated within `[0.0, 9.0]` and rounded to the nearest `0.5` increment before being stored.

---

### FR-04 — Save Writing AI Feedback Report

WHEN Writing AI evaluation succeeds, THE system SHALL insert a record into `ai_feedback_reports`.

The inserted report SHALL include:

* `writing_submission_id`
* `speaking_submission_id = NULL`
* `band_score`
* `task_achievement_score`
* `coherence_score`
* `lexical_score`
* `grammar_score`
* `error_highlights`
* `suggestions`
* `raw_ai_response`
* `generated_at`

The system SHALL update `writing_submissions.status` to `ai_graded` only after the AI report is successfully stored.

Writing AI token usage SHALL be stored inside `ai_feedback_reports.raw_ai_response.tokens_used`.

---

### FR-05 — Process Existing Speaking Submission for AI Evaluation

WHEN a Student requests AI Speaking evaluation, THE system SHALL process only an existing `speaking_submissions` record.

The system SHALL verify that:

* the user is authenticated,
* the user role is `student`,
* the user account status is `active`,
* the submission exists,
* the submission belongs to the authenticated Student,
* `grader = 'ai'`,
* `part_number` is `1`, `2`, or `3`,
* `audio_url` exists.

WHERE the same Speaking submission already has an AI report, THE system SHALL return the existing report and SHALL NOT call the AI provider again.

WHERE no existing report is found, THE system SHALL verify that:

* `status = 'pending'`,
* global daily/monthly AI usage budget is not exceeded.

WHEN all conditions are valid, THE system SHALL start transcription and Speaking AI evaluation asynchronously and return HTTP `202 Accepted`.

---

### FR-06 — Transcribe Speaking Audio

WHEN a Speaking submission is processed for AI evaluation, THE system SHALL call the Speech-to-Text provider to convert `audio_url` into transcript text.

WHEN transcription succeeds, THE system SHALL save the generated text into `speaking_submissions.transcript`.

WHERE transcription fails, THE system SHALL keep the submission as `pending`, SHALL emit or return a client-safe failure message, and SHALL NOT create a final AI feedback report.

---

### FR-07 — Evaluate Speaking Criteria

WHEN the AI Speaking evaluation service processes a valid transcript, THE system SHALL evaluate the response using IELTS-style criteria.

Criteria SHOULD include:

* Fluency & Coherence.
* Lexical Resource.
* Grammatical Range & Accuracy.
* Pronunciation.

WHERE pronunciation scoring is transcript-only or unavailable, THE system SHALL set `pronunciation_score = NULL` or store a limitation notice in `raw_ai_response`, and the UI SHALL show that pronunciation feedback may be incomplete.

All AI-generated scores SHALL be validated within `[0.0, 9.0]` and rounded to the nearest `0.5` increment before being stored.

---

### FR-08 — Save Speaking AI Feedback Report

WHEN Speaking AI evaluation succeeds, THE system SHALL insert a record into `ai_feedback_reports`.

The inserted report SHALL include:

* `writing_submission_id = NULL`
* `speaking_submission_id`
* `band_score`
* `fluency_score`
* `lexical_score`
* `grammar_score`
* `pronunciation_score`
* `error_highlights`
* `suggestions`
* `raw_ai_response`
* `generated_at`

The system SHALL update `speaking_submissions.status` to `ai_graded` only after the AI report is successfully stored.

Speaking AI token usage SHALL be stored inside `ai_feedback_reports.raw_ai_response.tokens_used`.

---

### FR-09 — Explain with AI for Objective Questions

WHEN a Student clicks **Explain with AI** for a question, THE system SHALL verify that:

* the user is authenticated,
* the user role is `student`,
* the user account status is `active`,
* the question exists,
* the related test/question is accessible to the Student,
* the question is not deleted or hidden.

WHERE the same Student requests explanation for the same question again, THE system MAY return the latest saved explanation to reduce AI cost.

WHERE no cached explanation is returned, THE system SHALL verify that global daily/monthly AI usage budget is not exceeded before calling the provider.

WHEN validation passes, THE system SHALL use the question context to generate a student-friendly explanation.

---

### FR-10 — Build Explain with AI Context

WHEN the system generates an AI explanation, THE system SHALL use:

* `questions.question_text`
* `questions.options`
* `questions.correct_answer`
* `questions.explanation`

The system SHALL copy `questions.explanation` into `ai_explain_requests.tutor_explanation` as a snapshot when available.

The AI response SHALL simplify, deepen, or rephrase the explanation without changing the official correct answer.

---

### FR-11 — Save Explain with AI Request

WHEN Explain with AI succeeds, THE system SHALL insert a record into `ai_explain_requests`.

The inserted data SHALL include:

* `user_id`
* `question_id`
* `tutor_explanation`
* `ai_response`
* `tokens_used`
* `created_at`

Explain with AI token usage SHALL be stored in `ai_explain_requests.tokens_used`.

---

### FR-12 — Create Chatbot Session

WHEN an authenticated Student opens or starts the AI Chatbot, THE system SHALL create a new record in `chatbot_sessions`.

The created session SHALL include:

* `user_id`
* `started_at`
* `ended_at = NULL`

Guest users SHALL NOT be allowed to create chatbot sessions.

---

### FR-13 — Send Chatbot Message

WHEN a Student sends a message in an active chatbot session, THE system SHALL verify that:

* the session exists,
* the session belongs to the authenticated Student,
* `ended_at IS NULL`,
* the message is not empty,
* the message does not exceed the configured maximum length,
* global daily/monthly AI usage budget is not exceeded.

WHEN validation passes, THE system SHALL save the user message, call the AI Chatbot service, save the assistant response, and return the assistant response to the client.

---

### FR-14 — Store Chatbot Messages

WHEN chatbot messages are saved, THE system SHALL insert rows into `chatbot_messages`.

Allowed `role` values:

* `user`
* `assistant`

The system SHALL save token usage in `chatbot_messages.tokens_used` for assistant messages when provider usage metadata is available.

The system SHALL NOT insert any other role value such as `system`.

---

### FR-15 — End Chatbot Session

WHEN a Student ends a chatbot session, THE system SHALL update `chatbot_sessions.ended_at = NOW()`.

WHERE a Student sends a message to an ended session, THE system SHALL reject the request with HTTP 409 Conflict.

---

### FR-16 — Restrict Chatbot Scope

WHEN the AI Chatbot responds, THE system SHALL restrict answers to:

* IELTS study support,
* academic English,
* grammar and vocabulary explanation,
* IELTS test strategy,
* platform usage guidance.

WHERE the message asks for unrelated, unsafe, private, or policy-violating content, THE system SHALL refuse or redirect the request safely.

---

### FR-17 — Tutor AI Preliminary Check

WHEN a Tutor opens or requests an AI preliminary check for a Writing submission, THE system SHALL verify that:

* the user is authenticated,
* the user role is `tutor`,
* the user account status is `active`,
* the Writing submission is visible or assigned to the Tutor.

WHERE an existing AI pre-check is available, THE system SHALL return it and SHALL NOT call the AI provider again.

WHERE no existing pre-check is returned, THE system SHALL verify that global daily/monthly AI usage budget is not exceeded before calling the provider.

WHEN validation passes, THE system SHALL generate a new preliminary check if allowed.

The AI preliminary check SHALL be displayed in a separate read-only panel and MUST be saved into `ai_feedback_reports`, but SHALL NOT overwrite `tutor_feedback_reports` and SHALL NOT update `writing_submissions.status`.

---

### FR-18 — Admin AI Usage Reporting

WHEN an Admin opens the AI usage report, THE system SHALL return aggregated AI usage metrics by date range.

The metrics SHALL include:

* `ai_calls_total`
* `ai_tokens_total`
* usage grouped by day
* usage grouped by feature category when metadata is available

Feature categories:

* `writing_evaluation`
* `speaking_evaluation`
* `explain_with_ai`
* `chatbot`

---

### FR-19 — Store AI Usage Metadata

WHEN the AI provider returns usage metadata, THE system SHALL persist token usage.

Storage rules:

* Chatbot token usage SHALL be stored in `chatbot_messages.tokens_used`.
* Explain with AI token usage SHALL be stored in `ai_explain_requests.tokens_used`.
* Writing/Speaking token usage SHALL be stored in `ai_feedback_reports.raw_ai_response.tokens_used`.
* Daily totals SHALL be aggregated into `platform_metrics_snapshots.ai_calls_total` and `platform_metrics_snapshots.ai_tokens_total`.

The system SHALL NOT create a fake top-level `tokens_used` column in `ai_feedback_reports`.

---

### FR-20 — AI Safety and Privacy Guardrails

WHEN any AI feature sends context to an external provider, THE system SHALL send only the minimum necessary learning context.

The system SHALL NOT send:

* passwords,
* password hashes,
* session tokens,
* refresh tokens,
* internal admin notes,
* unrelated profile fields,
* hidden prompts,
* API keys.

The system SHALL never expose raw provider API keys, system prompts, hidden moderation prompts, raw provider errors, or stack traces to Student/Tutor/Admin UI.

---

### FR-21 — AI Report Disclaimer

WHEN the system returns an AI feedback report, THE response SHALL include a visible disclaimer:

```text
AI-generated feedback is an estimate for IELTS practice only and may differ from official IELTS results.
```

---

### FR-22 — Provider Failure Handling

WHERE the AI provider times out, returns malformed structured output, or becomes unavailable, THE system SHALL return or emit a client-safe error response.

The system SHALL NOT persist invalid final report data.

WHERE async processing is used and AI processing fails, THE related submission SHALL remain `pending`.

The failure reason SHALL be tracked in application logs, job queue metadata, or client-safe Socket.io failure events.

The system SHALL NOT add or require any new `submission_status` value for Sprint 1.

---

## 5. Acceptance Criteria  
## EARS — Exhaustive

### Ubiquitous — Always True

* THE system SHALL require authentication for all AI Assistance APIs.
* THE system SHALL require account status `active` for all AI Assistance APIs.
* THE system SHALL enforce role-based access control.
* THE system SHALL allow Students to access only their own AI reports, chatbot sessions, chatbot messages, and explain requests.
* THE system SHALL allow Tutors to access only AI pre-checks connected to visible or assigned grading submissions.
* THE system SHALL allow Admin to access aggregated AI usage metrics only by default.
* THE system SHALL never expose raw AI provider API keys, internal prompts, server-side credentials, raw provider errors, or stack traces in API responses.
* THE system SHALL include an AI practice disclaimer in AI report responses.
* THE system SHALL store AI report scores as `NUMERIC(3,1)` values within `[0.0, 9.0]` and rounded to the nearest `0.5` increment.
* THE system SHALL preserve the current `ai_feedback_reports` one-submission constraint: exactly one of `writing_submission_id` or `speaking_submission_id` must be non-null.
* THE system SHALL record token usage whenever usage metadata is provided by the AI provider.
* THE system SHALL not allow AI output to modify official answer keys, tutor explanations, user roles, user status, published test content, or content library resources.
* THE system SHALL not insert unsupported values into PostgreSQL enum columns.
* THE system SHALL keep the existing `submission_status` enum unchanged in Sprint 1.

### Event-driven — Triggered by Events

* WHEN `feat-subjective-grading` creates a valid Writing submission with `grader = 'ai'`, THE system SHALL accept the `submission_id`, process AI evaluation, create an `ai_feedback_reports` record, and update the submission status to `ai_graded` after success.
* WHEN `feat-subjective-grading` creates a valid Speaking submission with `grader = 'ai'`, THE system SHALL accept the `submission_id`, transcribe the audio, save the transcript, create an `ai_feedback_reports` record, and update the submission status to `ai_graded` after success.
* WHEN AI Writing evaluation returns criterion-level scores, THE system SHALL map them to `task_achievement_score`, `coherence_score`, `lexical_score`, and `grammar_score`.
* WHEN AI Speaking evaluation returns criterion-level scores, THE system SHALL map them to `fluency_score`, `lexical_score`, `grammar_score`, and `pronunciation_score` where supported.
* WHEN pronunciation scoring is unavailable, THE system SHALL either set `pronunciation_score = NULL` or mark the limitation in `raw_ai_response`, and the UI SHALL display a limitation notice.
* WHEN the AI provider returns error highlights, THE system SHALL save them into `error_highlights` as JSONB.
* WHEN a Student clicks **Explain with AI** for an accessible question and budget is available, THE system SHALL create an `ai_explain_requests` record containing the generated `ai_response` and token usage.
* WHEN a Student starts a chatbot conversation, THE system SHALL create a `chatbot_sessions` row with `user_id`, `started_at`, and `ended_at = NULL`.
* WHEN a Student sends a chatbot message in an active session and budget is available, THE system SHALL save the user message, call the AI service, save the assistant response, and return the assistant response.
* WHEN the system uses streaming for chatbot response, THE system SHALL persist the user message before streaming and persist the full assistant response immediately after stream completion.
* WHEN a Student ends a chatbot session, THE system SHALL set `ended_at = NOW()` and prevent additional messages in that session.
* WHEN a Tutor opens a Writing submission grading screen and AI pre-check exists, THE system SHALL show the AI pre-check in a separate read-only panel.
* WHEN Admin opens the AI usage dashboard, THE system SHALL return aggregated AI calls and token usage for the selected date range.
* WHEN the AI metrics aggregation job runs, THE system SHALL upsert daily totals into `platform_metrics_snapshots`.

### State-driven — Continuous Conditions

* WHILE a Writing submission has `status = 'pending'` and `grader = 'ai'`, THE system SHALL show the AI grading state as processing or retryable and SHALL NOT display an empty final report.
* WHILE a Speaking submission has `status = 'pending'` and `grader = 'ai'`, THE system SHALL show transcription/evaluation progress or retryable state and SHALL NOT display an empty final report.
* WHILE a chatbot session has `ended_at IS NOT NULL`, THE system SHALL reject new messages with HTTP 409.
* WHILE a Student is viewing AI resources, THE system SHALL return only resources owned by or accessible to the authenticated Student.
* WHILE Admin views AI usage analytics, THE system SHALL show aggregated counts and tokens and SHALL NOT expose individual chatbot content by default.
* WHILE AI processing fails asynchronously, THE submission SHALL remain `pending`; the failure reason SHALL be tracked in application logs, job metadata, or client-safe Socket.io events.

### Unwanted — Error Handling Conditions

* WHERE a Writing submission has missing `response_text` after file extraction, THE system SHALL return HTTP 400 Bad Request.
* WHERE a Writing `task_number` is not `1` or `2`, THE system SHALL return HTTP 400 Bad Request.
* WHERE a Writing response is too short for meaningful evaluation, THE system SHALL return HTTP 400 Bad Request.
* WHERE a user submits `grader` outside `ai` or `tutor`, THE system SHALL return HTTP 400 Bad Request.
* WHERE `grader` is missing in a submission flow that requires choosing AI or Tutor, THE system SHALL return HTTP 400 Bad Request.
* WHERE an uploaded Writing file type is unsupported, THE system SHALL return HTTP 415 Unsupported Media Type.
* WHERE a Speaking `part_number` is not `1`, `2`, or `3`, THE system SHALL return HTTP 400 Bad Request.
* WHERE a Speaking submission has no `audio_url`, THE system SHALL return HTTP 400 Bad Request.
* WHERE audio transcription fails, THE system SHALL keep the Speaking submission as `pending` and SHALL NOT create a partial final AI report.
* WHERE the AI provider times out, THE system SHALL return HTTP 504 Gateway Timeout for synchronous requests or keep the submission as `pending` for async processing.
* WHERE the AI provider returns malformed JSON for structured evaluation, THE system SHALL retry once with a repair prompt; if still invalid, THE system SHALL reject the response and SHALL NOT persist invalid report data.
* WHERE a Student requests Explain with AI for a question they cannot access, THE system SHALL return HTTP 403 Forbidden.
* WHERE a Student sends a chatbot message to a session they do not own, THE system SHALL return HTTP 403 Forbidden.
* WHERE a Student sends a chatbot message longer than the configured maximum length, THE system SHALL return HTTP 400 Bad Request.
* WHERE the daily or monthly AI usage budget is exceeded, THE system SHALL reject new non-critical AI requests with HTTP 429 Too Many Requests.

---

## 6. API Contracts

This feature uses a unified AI Assistance API. Role-based access is handled by authentication and authorization middleware.

### Writing AI Evaluation

* `POST /api/v1/ai/writing/evaluate/:submission_id`  
  Response: 202 Accepted / 200 OK / 400 / 401 / 403 / 404 / 429 / 502 / 504  
  Role: Student  
  Purpose: Process an existing Writing submission for AI evaluation. Submission creation is owned by `feat-subjective-grading`.

### Speaking AI Evaluation

* `POST /api/v1/ai/speaking/evaluate/:submission_id`  
  Response: 202 Accepted / 200 OK / 400 / 401 / 403 / 404 / 429 / 502 / 504  
  Role: Student  
  Purpose: Process an existing Speaking submission for AI evaluation. Submission creation is owned by `feat-subjective-grading`.

### AI Report Retrieval

* `GET /api/v1/ai/reports/:report_id`  
  Response: 200 OK / 401 / 403 / 404  
  Role: Student / Tutor / Admin  
  Purpose: Return an AI feedback report with ownership and role checks.

### Explain with AI

* `POST /api/v1/ai/explain`  
  Body: `question_id`, `attempt_id`, `mode`, `student_question`  
  Response: 201 Created / 200 OK / 400 / 401 / 403 / 404 / 429 / 503  
  Role: Student  
  Purpose: Generate or return an AI explanation for an objective-test question.

### Chatbot Sessions

* `POST /api/v1/ai/chat/sessions`  
  Response: 201 Created / 401 / 403  
  Role: Student  
  Purpose: Create a new chatbot session.

* `POST /api/v1/ai/chat/sessions/:session_id/messages`  
  Body: `message`, `context`  
  Response: 201 Created / 400 / 401 / 403 / 404 / 409 / 429 / 503  
  Role: Student  
  Purpose: Send a message and receive the assistant response.

* `PATCH /api/v1/ai/chat/sessions/:session_id/end`  
  Response: 200 OK / 401 / 403 / 404  
  Role: Student  
  Purpose: End a chatbot session.

### Tutor AI Preliminary Check

* `GET /api/v1/tutor/submissions/writing/:submission_id/ai-precheck`  
  Response: 200 OK / 401 / 403 / 404  
  Role: Tutor  
  Purpose: Return an existing AI preliminary check for tutor grading support.

* `POST /api/v1/tutor/submissions/writing/:submission_id/ai-precheck`  
  Response: 202 Accepted / 200 OK / 401 / 403 / 404 / 429 / 503  
  Role: Tutor  
  Purpose: Request generation of an AI preliminary check when no AI report exists.

### Admin AI Usage

* `GET /api/v1/admin/ai/usage`  
  Query: `date_from`, `date_to`, `group_by`  
  Response: 200 OK / 400 / 401 / 403  
  Role: Admin  
  Purpose: Return aggregated AI usage metrics by date range.

---

## 7. Data Models & DB Schema Changes

The system utilizes the existing PostgreSQL v2 schema. AI Assistance MUST strictly follow the current table names, enum types, data types, and constraints.

### Enum Types

* `submission_status`: `pending`, `ai_graded`, `tutor_graded`, `reviewed`
* `grader_type`: `ai`, `tutor`
* `skill_type`: `reading`, `listening`, `writing`, `speaking`
* `user_role`: `user`, `student`, `tutor`, `admin`
* `account_status`: `pending`, `active`, `inactive`, `banned`

Sprint decision:

* No new `submission_status` enum value is required for Sprint 1.
* AI processing failure SHALL keep the related submission as `pending`.
* Failure reason SHALL be tracked outside the enum through application logs, job queue metadata, or client-safe Socket.io failure events.
* AI audit actions SHALL NOT be inserted into `audit_logs` unless the team later adds supported `log_action` enum values.

### Core Table: `writing_submissions`

Used as the source input for AI Writing evaluation.

| Field | Type / Rule | Usage |
|---|---|---|
| `id` | UUID | Submission identifier |
| `user_id` | UUID | Owner Student |
| `test_id` | UUID, nullable | Related mock test if available |
| `task_number` | SMALLINT, must be 1 or 2 | Writing task type |
| `prompt_text` | TEXT | Writing prompt |
| `response_text` | TEXT, required | Student response |
| `file_url` | TEXT, nullable | Uploaded response file |
| `grader` | grader_type | Must be `ai` for AI evaluation |
| `status` | submission_status | `pending` -> `ai_graded` after successful report creation |
| `submitted_at` | TIMESTAMPTZ | Submission timestamp |

### Core Table: `speaking_submissions`

Used as the source input for AI Speaking evaluation.

| Field | Type / Rule | Usage |
|---|---|---|
| `id` | UUID | Submission identifier |
| `user_id` | UUID | Owner Student |
| `test_id` | UUID, nullable | Related mock test if available |
| `part_number` | SMALLINT, must be 1, 2, or 3 | Speaking part |
| `prompt_text` | TEXT | Speaking prompt |
| `audio_url` | TEXT, required | Recorded audio file |
| `transcript` | TEXT, nullable | Generated transcript |
| `grader` | grader_type | Must be `ai` for AI evaluation |
| `status` | submission_status | `pending` -> `ai_graded` after successful report creation |
| `submitted_at` | TIMESTAMPTZ | Submission timestamp |

### Core Table: `ai_feedback_reports`

Used for both Writing and Speaking AI evaluation.

| Field | Type / Rule | Usage |
|---|---|---|
| `id` | UUID | Report identifier |
| `writing_submission_id` | UUID, nullable | Non-null only for Writing report |
| `speaking_submission_id` | UUID, nullable | Non-null only for Speaking report |
| `band_score` | NUMERIC(3,1) | Estimated overall band |
| `task_achievement_score` | NUMERIC(3,1), nullable | Writing Task Achievement / Task Response |
| `coherence_score` | NUMERIC(3,1), nullable | Writing Coherence & Cohesion |
| `lexical_score` | NUMERIC(3,1), nullable | Lexical Resource |
| `grammar_score` | NUMERIC(3,1), nullable | Grammatical Range & Accuracy |
| `fluency_score` | NUMERIC(3,1), nullable | Speaking Fluency & Coherence |
| `pronunciation_score` | NUMERIC(3,1), nullable | Speaking Pronunciation if supported |
| `error_highlights` | JSONB, nullable | Structured issue highlights |
| `suggestions` | TEXT, nullable | Improvement suggestions |
| `raw_ai_response` | JSONB, nullable | Provider metadata, model output, token usage, prompt version |
| `generated_at` | TIMESTAMPTZ | Report timestamp |

Constraint:

* Exactly one of `writing_submission_id` or `speaking_submission_id` must be non-null.
* Writing/Speaking token usage SHALL be stored inside `raw_ai_response.tokens_used`, not in a non-existent top-level `tokens_used` column.

### Core Tables: `chatbot_sessions` and `chatbot_messages`

| Table | Field | Rule / Usage |
|---|---|---|
| `chatbot_sessions` | `id` | Session identifier |
| `chatbot_sessions` | `user_id` | Owner Student |
| `chatbot_sessions` | `started_at` | Start time |
| `chatbot_sessions` | `ended_at` | End time; if non-null, no more messages |
| `chatbot_messages` | `session_id` | Related chatbot session |
| `chatbot_messages` | `role` | Must be `user` or `assistant` |
| `chatbot_messages` | `content` | Message content |
| `chatbot_messages` | `tokens_used` | Assistant token usage when available |
| `chatbot_messages` | `created_at` | Message timestamp |

### Core Table: `ai_explain_requests`

Used for Explain with AI.

| Field | Type / Rule | Usage |
|---|---|---|
| `id` | UUID | Request identifier |
| `user_id` | UUID | Student requesting explanation |
| `question_id` | UUID | Related objective-test question |
| `tutor_explanation` | TEXT, nullable | Snapshot copied from `questions.explanation` |
| `ai_response` | TEXT | Generated explanation |
| `tokens_used` | INT, nullable | Provider token usage |
| `created_at` | TIMESTAMPTZ | Request timestamp |

### Related Table: `questions`

Explain with AI uses the following fields:

| Field | Usage |
|---|---|
| `question_text` | Question content |
| `options` | Answer options |
| `correct_answer` | Official answer |
| `explanation` | Tutor explanation |
| `test_id` | Related mock test |
| `question_order` | Display order |

The AI service MUST NOT modify `questions.correct_answer` or `questions.explanation`.

### Related Table: `platform_metrics_snapshots`

Used for Admin AI usage reporting.

| Field | Usage |
|---|---|
| `snapshot_date` | Reporting day |
| `ai_calls_total` | Daily AI call count |
| `ai_tokens_total` | Daily AI token total |

Feature-level AI usage is derived from:

* `ai_feedback_reports.raw_ai_response.feature` and `raw_ai_response.tokens_used` for Writing/Speaking evaluation.
* `ai_explain_requests.tokens_used` for Explain with AI.
* `chatbot_messages.tokens_used` for Chatbot assistant responses.

Daily totals are aggregated into `platform_metrics_snapshots`.

### Index Requirements

Existing indexes required by this feature:

* `idx_chatbot_msg_session` on `chatbot_messages(session_id, created_at)`.
* `idx_writing_user` and `idx_writing_status` for Writing submissions.
* `idx_speaking_user` and `idx_speaking_status` for Speaking submissions.
* `idx_questions_test` for Explain with AI question lookup.

Database changes:

* No mandatory database schema change is required for Sprint 1.
* No new `submission_status` enum value is required for Sprint 1.
* Optional future enum values for `audit_logs.log_action`: `ai_writing_evaluated`, `ai_speaking_evaluated`, `ai_explain_requested`, `ai_chat_session_started`, `ai_usage_limit_reached`.
* Optional future AI usage table may be added if Admin needs detailed per-feature/per-user billing analytics.

---

## 8. Non-Functional Requirements

* **Performance — Explain with AI:** Response time should be < 10 seconds p95 for normal context size.
* **Performance — Chatbot:** Response time should be < 12 seconds p95 for normal study questions.
* **Performance — Writing AI Evaluation:** Processing should complete within 60 seconds p95.
* **Performance — Speaking AI Evaluation:** Transcription + evaluation should complete within 120 seconds p95.
* **Report Retrieval Performance:** AI report retrieval APIs should respond in < 500ms p95 because they read from database.
* **Reliability:** The system SHALL retry AI provider calls once for transient 5xx or timeout errors.
* **Reliability:** The system SHALL NOT create final AI feedback reports from malformed or incomplete provider responses.
* **Transaction Safety:** Report creation and submission status update SHOULD happen in the same transaction where possible.
* **Security:** All AI endpoints require an authenticated active account.
* **Authorization:** Ownership checks are mandatory for report, chatbot, and explain retrieval.
* **Privacy:** Prompts sent to the provider MUST NOT include session tokens, passwords, refresh tokens, admin notes, or unrelated personal data.
* **Provider Secret Safety:** AI provider API keys MUST be stored in environment variables or secret manager only.
* **Prompt Injection Defense:** The system SHALL sanitize or isolate user input used in prompts to reduce prompt-injection risk.
* **Academic Safety:** AI output must be framed as learning support, not guaranteed official IELTS scoring.
* **Cost Control:** Token usage MUST be stored whenever available.
* **Rate Limiting:** Backend SHALL enforce per-user rate limits for chatbot and explain requests.
* **Budget Control:** Backend SHALL enforce platform-level daily/monthly AI budget limits before new provider calls.
* **Observability:** Provider call latency, provider status, feature name, and token usage SHOULD be logged in structured application logs.
* **Log Safety:** Logs MUST NOT store full student essays, speaking transcripts, private chatbot content, passwords, raw prompts, or secrets.

---

## 9. Error Handling Matrix

| Error Code | HTTP Status | Message (Client) | Retry Behavior |
|---|---:|---|---|
| `AI_AUTH_REQUIRED` | 401 | "Please log in to use AI assistance." | Login then retry. |
| `AI_FORBIDDEN` | 403 | "You do not have permission to access this AI resource." | Do not retry without permission change. |
| `AI_INVALID_GRADER` | 400 | "Grader must be either AI or Tutor." | Fix input and retry. |
| `AI_GRADER_REQUIRED` | 400 | "Please choose AI or Tutor grading." | Fix input and retry. |
| `AI_WRITING_TEXT_REQUIRED` | 400 | "Response text is required for AI Writing evaluation." | Add response text and retry. |
| `AI_WRITING_TOO_SHORT` | 400 | "Response text is too short for meaningful IELTS feedback." | Expand answer and retry. |
| `AI_WRITING_INVALID_TASK` | 400 | "Writing task number must be 1 or 2." | Fix task number and retry. |
| `AI_UNSUPPORTED_FILE_TYPE` | 415 | "Unsupported file type for AI evaluation." | Upload supported file type. |
| `AI_SPEAKING_AUDIO_REQUIRED` | 400 | "Speaking audio is required for AI evaluation." | Upload/record audio and retry. |
| `AI_SPEAKING_INVALID_PART` | 400 | "Speaking part number must be 1, 2, or 3." | Fix part number and retry. |
| `AI_TRANSCRIPTION_FAILED` | 502 | "We could not transcribe this recording. Please try again." | Retry with clearer audio. |
| `AI_REPORT_NOT_FOUND` | 404 | "AI feedback report was not found." | Do not retry unless report should exist. |
| `AI_EXPLAIN_FORBIDDEN` | 403 | "You cannot request explanation for this question." | Do not retry. |
| `AI_QUESTION_NOT_FOUND` | 404 | "Question was not found." | Check question ID. |
| `AI_CHAT_SESSION_NOT_FOUND` | 404 | "Chat session was not found." | Start a new session. |
| `AI_CHAT_SESSION_ENDED` | 409 | "This chat session has already ended." | Start a new session. |
| `AI_CHAT_MESSAGE_TOO_LONG` | 400 | "Your message is too long. Please shorten it." | Shorten and retry. |
| `AI_USAGE_LIMIT_EXCEEDED` | 429 | "AI usage limit has been reached. Please try again later." | Retry after limit reset. |
| `AI_RATE_LIMITED` | 429 | "Too many AI requests. Please wait before trying again." | Retry after `Retry-After`. |
| `AI_PROVIDER_TIMEOUT` | 504 | "AI service took too long to respond. Please try again." | Retry once later. |
| `AI_PROVIDER_UNAVAILABLE` | 503 | "AI service is temporarily unavailable." | Retry later. |
| `AI_PROVIDER_INVALID_RESPONSE` | 502 | "AI service returned an invalid response. Please try again." | Retry later. |
| `AI_INTERNAL_ERROR` | 500 | "Something went wrong while processing AI assistance." | Retry later; log internally. |

---

## 10. Edge Cases & Corner Cases

* **Feature Boundary with Subjective Grading:** Writing/Speaking submission creation belongs to `feat-subjective-grading`. AI Assistance only processes existing submissions through `submission_id`.
* **Writing Task 1 vs Task 2:** Task 1 uses Task Achievement, while Task 2 uses Task Response. Both are stored in `task_achievement_score`, but labels must be preserved in `raw_ai_response`.
* **Invalid Writing Task:** A Student submits `task_number = 3`; the system rejects with `AI_WRITING_INVALID_TASK`.
* **Missing Writing Text:** File extraction returns empty content; the system rejects with `AI_WRITING_TEXT_REQUIRED`.
* **Unsupported Writing File:** Student uploads `.exe`, `.zip`, or `.mp4` as Writing input; the system rejects with `AI_UNSUPPORTED_FILE_TYPE`.
* **Invalid AI Score:** Provider returns score `9.5` or `-1`; the system rejects the provider response and does not persist invalid score.
* **Partial AI Response:** Provider returns overall score but missing criterion score; the system retries/repairs and persists only if schema validation passes.
* **Noisy Speaking Audio:** Audio is too noisy for transcription; the system returns `AI_TRANSCRIPTION_FAILED`, keeps submission `pending`, and allows retry.
* **Transcript Saved but Scoring Fails:** The system may save transcript, but must not create incomplete final report.
* **Pronunciation Unsupported:** Provider does not support reliable pronunciation scoring; the system sets `pronunciation_score = NULL` or records limitation and shows notice.
* **Provider Failure:** Provider timeout/unavailable/malformed output does not create a final report and does not require a new enum status.
* **Question Has No Tutor Explanation:** Explain with AI uses question text, options, and correct answer; `tutor_explanation` remains null.
* **Student Challenges Correct Answer:** AI must not claim a wrong option is correct or alter the official answer.
* **Inaccessible Question:** Student tries to use Explain with AI for unpublished/inaccessible test; return HTTP 403.
* **Ended Chatbot Session:** Student sends a message after ending session; return HTTP 409.
* **Cross-user Chatbot Access:** Student A accesses Student B's session; return HTTP 403.
* **Chatbot Data Leakage:** Student asks for another user's score/report; chatbot refuses and backend does not query unrelated data.
* **Active Assessment Misuse:** Student asks for direct answer to an active graded assessment; chatbot redirects toward explanation and study method.
* **Budget Exceeded:** Non-critical AI generation requests are rejected with HTTP 429 before calling the provider.
* **Admin Metrics Double Run:** Metrics job runs twice for same date; update existing `platform_metrics_snapshots` row using `snapshot_date` uniqueness.
* **Invalid Admin Date Range:** `date_from > date_to`; return HTTP 400.

---

## 11. Dependencies & Integration Points

* **Authentication / RBAC:** Depends on `feat-auth-and-users` for user identity, active account status, roles, and access control.
* **Objective Testing:** Explain with AI depends on `questions`, `mock_tests`, `test_attempts`, and question review permissions from `feat-objective-testing`.
* **Subjective Grading:** Writing/Speaking AI evaluation depends on existing `writing_submissions`, `speaking_submissions`, and `ai_feedback_reports`.
* **Admin Dashboard:** AI usage metrics integrate with `platform_metrics_snapshots` and Admin reporting logic.
* **File / Storage Service:** Writing file extraction and Speaking audio evaluation depend on uploaded file/audio URLs.
* **LLM Provider:** External dependency for Writing feedback, Speaking feedback, Explain with AI, and Chatbot responses.
* **Speech-to-Text Provider:** External dependency for Speaking audio transcription.
* **Background Worker / Queue:** Recommended for long-running Writing/Speaking evaluation to avoid HTTP request timeouts.
* **Prompt Versioning:** Backend SHOULD store prompt version, model name, rubric version, feature name, token usage, confidence flags, and safety flags inside `raw_ai_response`.

---

## 12. Testing Requirements

### Unit Tests

* Validate Writing `task_number`: only `1` and `2` accepted.
* Validate Speaking `part_number`: only `1`, `2`, and `3` accepted.
* Validate `grader`: required and must be `ai` or `tutor` in submission flows.
* Validate required `response_text` for Writing AI evaluation.
* Validate Writing response minimum length rule.
* Validate supported Writing file type logic.
* Validate chatbot message length limit.
* Validate AI report score normalization and range `[0.0, 9.0]`.
* Validate JSON schema parsing for AI Writing response.
* Validate JSON schema parsing for AI Speaking response.
* Validate error mapping from provider failures to client-safe error codes.
* Validate that Writing/Speaking token usage is stored in `raw_ai_response`, not a non-existent column.
* Validate global AI budget check before provider calls.

### Integration Tests

* Existing Writing submission with `grader = 'ai'` -> mock provider -> verify `ai_feedback_reports` row exists and status becomes `ai_graded`.
* Existing Speaking submission with `grader = 'ai'` -> mock STT + mock provider -> verify transcript saved, report created, status becomes `ai_graded`.
* AI provider failure during async Writing/Speaking -> verify no final report is created and submission remains `pending`.
* Explain with AI request -> verify `ai_explain_requests` row includes `user_id`, `question_id`, `tutor_explanation`, `ai_response`, and `tokens_used`.
* Chatbot session create -> send message -> verify two `chatbot_messages` rows are created.
* End chatbot session -> send message again -> verify HTTP 409.
* Student A attempts to view Student B's AI report -> verify HTTP 403.
* Tutor opens AI pre-check for accessible Writing submission -> verify read-only AI panel response and `writing_submissions.status` is not changed.
* Budget exceeded -> verify HTTP 429 and provider is not called.
* Metrics aggregation job -> verify upsert into `platform_metrics_snapshots`.
* Admin usage endpoint aggregates AI calls and token totals by date range.

### E2E Tests

* Student completes Writing Task -> chooses AI grading -> receives report screen with band score, criterion scores, error highlights, suggestions, and disclaimer.
* Student completes Speaking recording -> chooses AI grading -> receives transcript and speaking report.
* Student reviews a Reading/Listening question -> clicks Explain with AI -> sees simplified explanation.
* Student opens chatbot in workspace -> asks IELTS grammar question -> receives answer; refresh page -> conversation history remains.
* Tutor opens essay grading screen -> sees AI pre-check panel but tutor feedback remains editable and separate.
* Admin opens dashboard -> sees AI usage totals for selected date range.

### Coverage Target

* >= 85% for AI Assistance backend module.
* All critical DB write flows must have integration tests.
* All ownership and RBAC paths must have security tests.

---

## 13. Rollout Plan

* Use the existing PostgreSQL v2 schema.
* No migration is required for Sprint 1 if the existing AI-related tables are used.
* No `submission_status` enum migration is required for Sprint 1.
* Configure LLM provider API key in server-side environment or secret manager.
* Configure STT provider before enabling Speaking AI evaluation.
* Deploy first to Development with mocked AI/STT providers.
* Deploy to Staging with strict daily/monthly token budget and test accounts.
* Enable first for Explain with AI and Chatbot because they are lower risk than scoring.
* Enable Writing AI evaluation after prompt quality and report format are reviewed.
* Enable Speaking AI evaluation after transcription quality is reviewed.
* Enable Admin AI usage dashboard after metrics aggregation is verified.
* Use feature flags: `AI_ASSISTANCE_ENABLED`, `AI_WRITING_ENABLED`, `AI_SPEAKING_ENABLED`, `AI_EXPLAIN_ENABLED`, `AI_CHATBOT_ENABLED`.
* Keep existing reports readable even when new AI generation is disabled.
* Stop provider calls immediately when budget, safety, or reliability incidents occur.

---

## 14. Open Questions

* **Q1: AI Provider Selection** — Which provider/model will be used for Writing, Speaking, Explain, and Chatbot?
* **Q2: STT Provider Selection** — Which Speech-to-Text provider will be used for Speaking transcription?
* **Q3: Async Processing** — Should Writing/Speaking evaluation run fully async with background worker, or sync with longer timeout?
* **Q4: Token Budget** — What is the daily/monthly AI token budget per user and for the whole platform?
* **Q5: Report Regeneration Policy** — Can students regenerate an AI report for the same submission? If yes, how many times?
* **Q6: Tutor Visibility** — Can all Tutors view AI pre-checks, or only Tutors assigned to the submission?
* **Q7: Admin Privacy Policy** — Should Admin see only aggregated usage metrics, or also per-user usage metadata for support?
* **Q8: Speaking Pronunciation Scoring** — Does the selected STT/evaluation provider support pronunciation scoring reliably enough for IELTS feedback?
* **Q9: Chatbot Scope Enforcement** — Will out-of-scope detection be handled only by prompt guardrails, or by a separate intent classifier?
