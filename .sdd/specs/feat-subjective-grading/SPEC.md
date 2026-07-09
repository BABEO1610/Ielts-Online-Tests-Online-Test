# Subjective Grading - As-built Spec

Status: active as-built documentation for student-facing Writing/Speaking
subjective grading and the AI/tutor boundary.

This spec intentionally describes only the current direct Express
controller/service flow that calls the backend AI provider wrapper.

## 1. Feature Scope

In scope:

- Student-facing AI Writing grading.
- Student-facing AI Speaking grading.
- Student choice of `grader = ai` or `grader = tutor`.
- AI feedback as student-facing reference feedback.
- Tutor grading as a separate manual/official flow.
- Student feedback and history retrieval for the authenticated user's own
  submissions.

Out of scope for this spec:

- Tutor AI support.
- Tutor-side AI reference generation.
- Replacing tutor grading with chatbot answers.
- Any frontend direct call to an AI provider.

## 2. Active Routes

All submission routes are mounted under `/api/v1/submissions` and protected by
`backend/src/middleware/authenticate.js`.

Active student routes:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/writing/full` | Submit full Writing Task 1 + Task 2 for AI or tutor grading. |
| POST | `/speaking/upload` | Upload temporary Speaking audio through backend middleware. |
| POST | `/speaking/full` | Submit full Speaking Parts 1, 2, and 3 for AI or tutor grading. |
| POST | `/speaking` | Legacy one-part endpoint. Tutor only; AI is rejected. |
| GET | `/history` | Retrieve current student's Writing/Speaking history. |
| GET | `/:id/feedback` | Retrieve current student's feedback detail. |

Additional owned Writing AI endpoint:

- `POST /writing/:submissionId/ai-grade` exists for an authenticated student-owned
  Writing submission where `grader = ai`. It is not the primary current frontend
  submission path.

## 3. Writing AI Grading Flow

Frontend:

- `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- `frontend/src/services/grading.service.js`

Backend:

- `backend/src/controllers/submission.controller.js`
- `backend/src/services/submission.service.js`
- `backend/src/ai/grading.service.js`
- `backend/src/ai/grading.prompt.js`
- `backend/src/ai/grading.validator.js`

Flow:

1. Student completes both Writing Task 1 and Task 2 in the frontend.
2. Student selects `grader = ai` or `grader = tutor`.
3. Frontend posts to `/api/v1/submissions/writing/full`.
4. Controller uses `req.user.id`; it does not trust `req.body.userId`.
5. Service validates `grader` and normalizes the tasks.
6. `normalizeWritingTasks` requires exactly two tasks: task number 1 and task
   number 2.
7. Service validates optional `test_id` against `mock_tests`.
8. Service creates a `writing_group_id`.
9. Service inserts both `writing_submissions` rows inside a database transaction.
10. If `grader = ai`, service directly calls `gradeWriting` for each task after the
    transaction commits.
11. AI provider returns structured JSON through `backend/src/services/ai.service.js`.
12. `grading.validator.js` validates the four IELTS Writing criteria:
    `taskAchievementOrResponse`, `coherenceCohesion`, `lexicalResource`, and
    `grammarRangeAccuracy`.
13. Band scores are normalized to IELTS half-band increments.
14. Completed or failed AI reports are saved in `ai_grading_reports`.
15. Writing rows are updated with `ai_status`, `overall_ai_band`, and status where
    the schema supports those columns.
16. Student can retrieve feedback/history through authenticated, user-scoped
    endpoints.

AI failure does not silently erase the submission. The service saves a failed AI
report where possible and keeps the submission in a pending/failed AI state rather
than converting it into tutor grading automatically.

## 4. Speaking AI Grading Flow

Frontend:

- `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`
- `frontend/src/components/grading/AudioRecorder.jsx`
- `frontend/src/services/grading.service.js`

Backend:

- `backend/src/controllers/submission.controller.js`
- `backend/src/services/submission.service.js`
- `backend/src/services/speakingAiGrading.service.js`
- `backend/src/ai/grading.service.js`
- `backend/src/ai/speakingGrading.prompt.js`
- `backend/src/ai/speakingGrading.validator.js`

Flow:

1. Student records Speaking Part 1, Part 2, and Part 3.
2. Frontend uploads audio through `/api/v1/submissions/speaking/upload`.
3. Frontend posts all three parts to `/api/v1/submissions/speaking/full`.
4. Controller requires `parts.length === 3`.
5. Service uses `req.user.id` from auth.
6. Service validates `grader` and optional `test_id`.
7. For each submitted part, service verifies the storage path belongs to the user:
   it must start with `speaking/{userId}/` and must not contain `..`.
8. Service creates a `speaking_group_id` and inserts all three
   `speaking_submissions` rows inside a transaction.
9. If `grader = ai`, service calls `gradeSpeakingGroup`.
10. `gradeSpeakingGroup` reloads the group and rejects anything other than exactly
    three parts.
11. Missing transcripts are generated from audio through the backend AI provider
    wrapper.
12. The session is graded as one full Speaking session.
13. `speakingGrading.validator.js` validates the four IELTS Speaking criteria:
    `fluencyCoherence`, `lexicalResource`, `grammaticalRangeAccuracy`, and
    `pronunciation`.
14. Pronunciation is part of the Speaking result only because audio/transcript input
    exists. The prompt warns not to pretend to hear details that are not available.
15. Completed or failed AI reports are saved in `ai_grading_reports`.
16. Student can retrieve feedback/history through authenticated, user-scoped
    endpoints.

The legacy one-part `/speaking` endpoint is not the active AI Speaking path. It now
rejects `grader = ai` because AI Speaking grading requires all three parts.

## 5. Tutor Grading Boundary

Student choice controls the boundary:

- `grader = ai`: submission is AI-only reference feedback unless a separate user
  action or tutor flow handles it later.
- `grader = tutor`: submission enters the tutor manual grading queue.

Tutor queue code filters pending submissions by `grader = 'tutor'`. AI-only
submissions should not appear in the tutor queue as pending tutor work.

AI grading does not overwrite tutor grades. Tutor feedback is stored separately in
`tutor_feedback_reports`, and Writing submissions have separate `ai_status`,
`tutor_status`, `overall_ai_band`, and `overall_tutor_band` where the migration has
run.

## 6. Security Requirements

- Use `req.user.id` from authentication for all student submission ownership.
- Never trust `req.body.userId`.
- Use parameterized SQL queries.
- Verify history and feedback belong to the authenticated user before returning
  data.
- Reject foreign or malformed Speaking audio paths.
- Do not call AI providers directly from the frontend.
- Store AI usage metadata in `ai_usage_logs` when the AI wrapper is called.
- Keep AI reports and tutor reports separate.
- Do not expose raw provider credentials in API responses.

## 7. Error Handling

Handled cases:

- invalid `grader`;
- Writing submission missing Task 1 or Task 2;
- Speaking submission missing one of the three parts;
- invalid or foreign Speaking audio path;
- AI provider failure;
- invalid AI JSON;
- missing required IELTS criteria;
- AI report persistence failure;
- missing database migration columns for required grouped Writing flow;
- history or feedback lookup for another user's submission.

The service should not silently lose a submitted subjective answer. When the answer
has already been persisted and AI fails, the failure is recorded where possible and
the submission remains retrievable.

## 8. Database

Current subjective grading tables used by code:

### `writing_submissions`

Columns from migrations/code include:

- `id`, `user_id`, `test_id`, `task_number`, `prompt_text`, `response_text`,
  `file_url`, `grader`, `status`, `submitted_at`, `created_at`;
- `assigned_tutor_id`;
- `writing_group_id`;
- `word_count`, `ai_status`, `tutor_status`, `overall_ai_band`,
  `overall_tutor_band`, `updated_at`.

### `speaking_submissions`

Columns from migrations/code include:

- `id`, `user_id`, `test_id`, `part_number`, `prompt_text`, `audio_url`,
  `transcript`, `grader`, `status`, `submitted_at`, `created_at`;
- `assigned_tutor_id`;
- `speaking_group_id`.

### `ai_grading_reports`

Base and extended columns from migrations/code include:

- `id`, `submission_id`, `submission_type`, `band_score`;
- Writing scores: `task_achievement_score`, `coherence_score`, `lexical_score`,
  `grammar_score`;
- Speaking scores: `fluency_score`, `pronunciation_score`;
- `error_highlights`, `suggestions`, `raw_ai_response`, `generated_at`;
- `status`, `improved_version`, `prompt_version`, `model_name`, `error_message`,
  `criteria_json`, `feedback_json`, `computed_band`,
  `band_validation_warning`, `created_at`, `updated_at`;
- Writing group support: `task_number`, `writing_group_id`;
- Speaking service conditionally writes `speaking_group_id` and `part_number` if
  those columns exist in the live schema. This repo does not include a migration
  that adds those two report columns.

### `tutor_feedback_reports`

Current grouped tutor feedback table used by `submission.service.js` and
`tutor.service.js`:

- `id`, `tutor_id`, `writing_submission_id`, `speaking_submission_id`,
  `task_number`, `band_score`, criteria score columns, `written_feedback`,
  `audio_feedback_url`, `created_at`, `updated_at`.

### `ai_usage_logs`

AI usage metadata table:

- `id`, `user_id`, `feature`, `provider`, `model`, `response_id`, `entity_type`,
  `entity_id`, token counters, `success`, `error_code`, `error_message`,
  `latency_ms`, `created_at`.

Chatbot tables are documented in the chatbot spec, not here, except for shared
`ai_usage_logs`.

## 9. Text Diagrams

Writing AI flow:

```text
WritingTestPage
  -> gradingService.submitFullWriting
  -> POST /api/v1/submissions/writing/full
  -> authenticate
  -> submitFullWriting controller
  -> SubmissionService.submitFullWriting
  -> transaction inserts Task 1 + Task 2
  -> gradeWriting for each task
  -> grading.validator validates 4 criteria
  -> ai_grading_reports
  -> writing_submissions ai_status/overall_ai_band
  -> response to student
```

Speaking AI flow:

```text
SpeakingTestPage
  -> upload audio through backend
  -> gradingService.submitFullSpeaking
  -> POST /api/v1/submissions/speaking/full
  -> authenticate
  -> submitFullSpeaking controller
  -> ownership check for speaking/{userId}/ audio paths
  -> transaction inserts Part 1 + Part 2 + Part 3
  -> gradeSpeakingGroup
  -> transcript generation if needed
  -> speakingGrading.validator validates 4 criteria
  -> ai_grading_reports
  -> speaking_submissions status
  -> response to student
```

Tutor grading boundary:

```text
Student selects grader
  -> grader = ai: AI reference feedback path
  -> grader = tutor: pending tutor manual grading queue
Tutor queue
  -> WHERE status = 'pending' AND grader = 'tutor'
```

Student feedback/history:

```text
GET /api/v1/submissions/history or /:id/feedback
  -> authenticate
  -> use req.user.id
  -> query writing/speaking group owned by user
  -> join ai_grading_reports and tutor_feedback_reports
  -> return only current student's data
```

## 10. Acceptance Criteria

- AI Writing submission requires both Task 1 and Task 2.
- AI Writing returns four criteria per task.
- AI Speaking submission requires all three Speaking parts.
- AI Speaking returns four criteria including pronunciation.
- Pronunciation is only scored in the Speaking flow where audio/transcript exists.
- Legacy one-part Speaking endpoint rejects `grader = ai`.
- History and feedback only return current user's data.
- AI grading does not overwrite tutor grade fields.
- Tutor queue does not include AI-only pending submissions.
- Invalid AI JSON or missing criteria is rejected/handled safely.
- AI usage is logged when the AI provider wrapper is called.
