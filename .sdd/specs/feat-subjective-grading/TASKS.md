# Subjective Grading - As-built Tasks

Status: current task inventory after code audit.

## Completed Runtime Tasks

- [x] Protect submission routes with `authenticate`.
- [x] Use `req.user.id` for student submissions instead of trusting body `userId`.
- [x] Implement active Writing flow at `POST /api/v1/submissions/writing/full`.
- [x] Require Writing AI submissions to include Task 1 and Task 2.
- [x] Create grouped Writing rows with `writing_group_id`.
- [x] Store Writing word counts on `writing_submissions` when schema supports it.
- [x] Call backend AI grading service for `grader = ai` Writing submissions.
- [x] Validate AI Writing response against four IELTS Writing criteria.
- [x] Normalize AI bands to half-band increments.
- [x] Save completed Writing AI reports to `ai_grading_reports`.
- [x] Save failed Writing AI reports where possible.
- [x] Keep tutor grading separate through `grader = tutor`.
- [x] Keep tutor feedback in `tutor_feedback_reports`.
- [x] Filter tutor queue to pending `grader = 'tutor'` submissions.
- [x] Implement active Speaking flow at `POST /api/v1/submissions/speaking/full`.
- [x] Require Speaking AI submissions to include exactly three parts.
- [x] Verify Speaking audio paths belong to `speaking/{userId}/`.
- [x] Create grouped Speaking rows with `speaking_group_id`.
- [x] Generate missing transcripts through backend AI provider wrapper.
- [x] Validate AI Speaking response against four IELTS Speaking criteria.
- [x] Include pronunciation only in the audio/transcript-based Speaking flow.
- [x] Save Speaking AI reports to `ai_grading_reports`.
- [x] Return student history through authenticated, user-scoped queries.
- [x] Return feedback detail only for current user's submission/group.
- [x] Log AI provider usage metadata in `ai_usage_logs`.
- [x] Reject legacy one-part `/speaking` requests when `grader = ai`.

## Completed Documentation And Chatbot Hardening Tasks

- [x] Fix assistant IELTS fallback dead code.
- [x] Add assistant rate limit to `/chat` and `/chat/stream`.
- [x] Protect assistant `/status` and remove provider/model/key disclosure.
- [x] Deprecate `.sdd/specs/feat-ai-assistance/`.
- [x] Create `.sdd/specs/global-ielts-virtual-assistant/RFC.md`.
- [x] Rewrite chatbot active spec/plan/tasks as as-built docs.
- [x] Rewrite subjective grading spec/plan/tasks as as-built docs.

## Remaining Hardening Tasks

- [ ] Add focused backend tests for legacy `/speaking` rejecting `grader = ai`.
- [ ] Add focused backend route tests for assistant rate limiting and protected
      `/status` once auth helpers are ready.
- [ ] Add or verify migration for `ai_grading_reports.speaking_group_id` and
      `ai_grading_reports.part_number` only if group-level Speaking report lookup
      needs those columns in production.
- [ ] Confirm production database has `chatbot_sessions` and `chatbot_messages`
      matching `.sdd/context/db-schema-snapshot.md`.
- [ ] Decide whether old `AudioRecorder.jsx` legacy flow should expose only tutor
      grading or be retired from active pages.

## Removed From Active Task List

The following older tasks are not part of the current implementation and should not
be presented as completed architecture:

- Legacy async grading queue.
- Separate background grading process.
- Vendor-specific speech-to-text or grading-provider tasks.
- Required realtime completion-event pipeline for the active full-submission flow.
- AI quota decrement/refund queue flow.
- The old AI report table name used by earlier docs.

Current table name for AI reports is `ai_grading_reports`.
