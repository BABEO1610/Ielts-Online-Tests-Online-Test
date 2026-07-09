# Subjective Grading - As-built Plan

Status: active plan aligned with the current implementation.

This plan describes the synchronous/direct backend flow currently implemented in
the repository.

## 1. Implementation Architecture

Frontend:

- `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`
- `frontend/src/components/grading/AudioRecorder.jsx`
- `frontend/src/components/grading/WritingEditor.jsx`
- `frontend/src/services/grading.service.js`
- `frontend/src/services/api.js`

Backend routing:

- `backend/src/routes/api/v1/submissions.routes.js`
- `backend/src/controllers/submission.controller.js`
- `backend/src/controllers/aiGrading.controller.js`
- `backend/src/middleware/authenticate.js`
- `backend/src/middleware/upload.middleware.js`

Backend services:

- `backend/src/services/submission.service.js`
- `backend/src/services/speakingAiGrading.service.js`
- `backend/src/services/ai.service.js`
- `backend/src/services/aiUsage.service.js`

AI grading:

- `backend/src/ai/grading.service.js`
- `backend/src/ai/grading.prompt.js`
- `backend/src/ai/grading.validator.js`
- `backend/src/ai/speakingGrading.prompt.js`
- `backend/src/ai/speakingGrading.validator.js`
- `backend/src/ai/aiGrading.constants.js`

Database:

- `writing_submissions`
- `speaking_submissions`
- `ai_grading_reports`
- `tutor_feedback_reports`
- `ai_usage_logs`

## 2. Writing Plan

Active endpoint:

- `POST /api/v1/submissions/writing/full`

Frontend plan:

- Require both Task 1 and Task 2 before submit.
- Send `grader`, optional `test_id`, and two `tasks`.
- Do not send or trust `userId`.

Backend plan:

1. `authenticate` populates `req.user`.
2. Controller reads `req.user.id`.
3. Controller validates `tasks` shape enough to call service.
4. `SubmissionService.submitFullWriting` validates `grader`.
5. `normalizeWritingTasks` enforces exactly two tasks: `task_number = 1` and
   `task_number = 2`.
6. Service validates optional `test_id`.
7. Service checks grouped Writing migration support for `writing_group_id`.
8. Service opens a DB transaction.
9. Service inserts both `writing_submissions` rows with shared `writing_group_id`.
10. Service commits the transaction.
11. If `grader = ai`, service calls `gradeWriting` for each task directly.
12. AI result is validated by `grading.validator.js`.
13. Service writes completed or failed rows to `ai_grading_reports`.
14. Service updates `ai_status`, `overall_ai_band`, and `status` where columns
    exist.

Transaction point:

- The two Writing submission rows are created inside one transaction.
- AI grading happens after the submission transaction commits so the student's
  answer is not lost if the provider fails.

Result persistence:

- Per-task AI reports go to `ai_grading_reports`.
- Group-level AI state is reflected on `writing_submissions` through
  `ai_status` and `overall_ai_band`.

## 3. Speaking Plan

Active endpoints:

- `POST /api/v1/submissions/speaking/upload`
- `POST /api/v1/submissions/speaking/full`

Frontend plan:

- Record/upload all three parts.
- Submit exactly three parts to `/speaking/full`.
- Use `/speaking` only as a legacy tutor-compatible path.

Backend plan:

1. `authenticate` populates `req.user`.
2. Controller reads `req.user.id`.
3. Controller requires `parts` array length exactly three.
4. `SubmissionService.submitFullSpeaking` validates `grader`.
5. Service validates optional `test_id`.
6. Service verifies every audio storage path starts with `speaking/{userId}/` and
   does not contain `..`.
7. Service opens a DB transaction.
8. Service inserts three `speaking_submissions` rows with shared
   `speaking_group_id`.
9. Service commits the transaction.
10. If `grader = ai`, service calls `gradeSpeakingGroup`.
11. `gradeSpeakingGroup` reloads the group and enforces exactly three parts.
12. Missing transcripts are generated through the backend provider wrapper.
13. `gradeSpeakingSession` grades the whole session.
14. `speakingGrading.validator.js` validates fluency/coherence, lexical resource,
    grammatical range/accuracy, and pronunciation.
15. AI report is saved in `ai_grading_reports`.
16. Speaking submissions are updated to `status = ai_graded` on success.

Transaction point:

- The three Speaking submission rows are created inside one transaction.
- AI grading happens after the submission transaction commits.

Result persistence:

- AI Speaking report is stored in `ai_grading_reports`.
- The report is attached to a representative speaking submission and uses
  `speaking_group_id`/`part_number` only if those columns exist in the live report
  schema.

## 4. Tutor Boundary Plan

Student chooses the grader:

- `grader = ai` calls the AI path and saves AI reference feedback.
- `grader = tutor` leaves the submission pending for tutor manual grading.

Tutor queue plan:

- Tutor service queries only pending rows where `grader = 'tutor'`.
- Tutor reports are stored in `tutor_feedback_reports`.
- AI reports stay in `ai_grading_reports`.
- AI status and tutor status are separate where the grouped Writing migration has
  run.

Tutor AI support is not part of this plan.

## 5. Validation Plan

Writing:

- valid `grader`;
- exactly Task 1 and Task 2;
- non-empty response text;
- computed word count;
- optional valid `test_id`;
- AI JSON includes all four Writing criteria;
- normalized bands are within 0-9 and rounded to half-band increments.

Speaking:

- valid `grader`;
- exactly three parts;
- valid part numbers;
- audio path ownership under `speaking/{userId}/`;
- no path traversal;
- transcript or audio available before AI grading;
- AI JSON includes all four Speaking criteria;
- pronunciation is not fabricated without audio/transcript context.

Retrieval:

- history and feedback queries must be scoped by `req.user.id`;
- feedback detail must reject unknown or foreign submission IDs.

## 6. Error Plan

Provider failure:

- Save failed AI report where possible.
- Keep persisted submission retrievable.
- Do not silently switch an AI submission into the tutor queue.

Invalid AI response:

- Validator rejects missing or malformed criteria.
- Error is handled as AI grading failure.

Incomplete Speaking:

- `/speaking/full` returns validation error if parts length is not three.
- legacy `/speaking` rejects `grader = ai`.

Foreign audio path:

- service rejects paths not owned by `speaking/{userId}/`.

Missing migrations:

- grouped Writing flow raises a migration readiness error when required columns are
  missing.
- Speaking report group columns are conditional and should be added only if the
  project wants group-level report metadata in the report table.

## 7. Retrieval Plan

History:

```text
GET /api/v1/submissions/history
  -> authenticate
  -> SubmissionService.getHistory(req.user.id)
  -> grouped writing/speaking rows only for current user
  -> include AI/tutor status and available report summary
```

Feedback detail:

```text
GET /api/v1/submissions/:id/feedback
  -> authenticate
  -> resolve writing or speaking group
  -> verify user_id equals req.user.id
  -> join ai_grading_reports
  -> join tutor_feedback_reports
  -> return detail
```

## 8. Current Non-goals

- No async queue grading pipeline.
- No vendor-specific speech-to-text implementation in this codebase.
- No frontend direct AI-provider call.
- No required realtime result pipeline for the active full-submission flow.
- No tutor AI support expansion.
