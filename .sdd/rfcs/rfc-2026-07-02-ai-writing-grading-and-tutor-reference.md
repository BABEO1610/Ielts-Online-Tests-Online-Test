# RFC: AI Writing Grading And Tutor AI Reference

**Date**: 2026-07-02  
**Feature**: `ai-writing-grading-and-tutor-ai-reference`  
**Status**: IMPLEMENTED / NEEDS RUNTIME DB VERIFICATION  

## Reason

Project IELTS Online Tests cần bổ sung luồng chấm Writing bằng AI song song với luồng tutor grading hiện tại.

Business rule quan trọng:

- Student phải được chọn một trong hai hình thức chấm:
  - `tutor`: Giảng viên chấm.
  - `ai`: AI chấm điểm.
- Không bỏ lựa chọn Giảng viên chấm.
- Không ép toàn bộ bài Writing sang AI.
- Nếu chọn tutor, bài phải vào tutor queue như logic cũ.
- Nếu chọn AI, bài phải được lưu trước, sau đó mới gọi AI grading.
- Nếu AI fail thật, bài vẫn giữ `grader='ai'`, không fallback sang tutor.
- Tutor vẫn cần xem được các bài AI đã chấm trong khu vực AI Reference để tham khảo.

## Problems Found During Implementation

### 1. AI option bị hiện "Hết lượt"

Ở màn Writing submission, option AI từng hiện dạng:

```text
AI Chấm điểm (Hết lượt)
```

Root cause:

- Frontend dùng quota mặc định hoặc quota từ user/dashboard để quyết định AI có còn lượt hay không.
- Khi quota chưa load hoặc mặc định bằng `0`, UI coi AI là hết lượt.
- Radio AI bị disable hoặc bị gắn label "Hết lượt", làm student không submit được bằng AI trong project/demo.

Decision:

- Demo hiện tại không dùng quota nội bộ để chặn AI Writing grading.
- AI option không được disable vì quota.
- UI không render "Hết lượt" cho Writing AI.

### 2. Submit Writing bị kẹt nếu AI grading fail

Sau khi sửa flow chọn AI, phát sinh lỗi:

```text
column "status" does not exist
```

UI bị kẹt ở:

```text
Time is up! Dang nop bai cua ban...
```

Root cause có khả năng cao:

- Schema nền `ai_grading_reports` từ migration 015 không có cột `status`.
- Migration 020 mới thêm `ai_grading_reports.status` bằng `ADD COLUMN IF NOT EXISTS`.
- DB runtime có thể chưa chạy migration 020.
- Code AI grading và history từng query trực tiếp `ai_grading_reports.status`.
- Frontend từng `await` AI grading ngay sau submit Writing; nếu AI endpoint fail vì thiếu cột report, UI coi toàn bộ submit là fail dù bài đã hoặc đang được lưu.

Decision:

- Submit Writing chính không được phụ thuộc vào `ai_grading_reports.status`.
- `writing_submissions.status` là source of truth cho trạng thái bài nộp.
- AI grading chỉ chạy sau khi submission đã lưu thành công.
- AI report columns mới phải được xử lý tương thích ngược nếu DB chưa chạy migration 020.

## Implemented Backend Changes

### AI Grading Service

Files:

- `backend/src/services/ai.service.js`
- `backend/src/ai/aiGrading.constants.js`
- `backend/src/ai/grading.prompt.js`
- `backend/src/ai/grading.validator.js`
- `backend/src/ai/grading.service.js`
- `backend/src/controllers/aiGrading.controller.js`

Behavior:

- AI Writing grading dùng Gemini qua existing AI service/config.
- Chấp nhận API key từ:
  - `GEMINI_API_KEY`
  - `GOOGLE_AI_API_KEY`
  - `GOOGLE_API_KEY`
- Không dùng Anthropic/Claude.
- Không fake AI response.
- Nếu thiếu key, trả lỗi rõ:

```text
AI grading is not configured. Please add GEMINI_API_KEY, GOOGLE_AI_API_KEY, or GOOGLE_API_KEY.
```

Endpoint:

```http
POST /api/v1/submissions/writing/:submissionId/ai-grade
```

Validation:

- Chỉ student owner của submission được gọi.
- Submission phải tồn tại.
- Submission phải có `grader='ai'`.
- Submission phải là Writing Task 1 hoặc Task 2.
- Có word-count guard trước khi gọi Gemini.

Idempotency/cache:

- Nếu đã có AI report hoàn chỉnh, endpoint trả cached result.
- Cache check hiện không còn phụ thuộc `ai_grading_reports.status`.
- Cache dùng điều kiện report có `band_score IS NOT NULL`.

Save result:

- Insert AI report vào `ai_grading_reports`.
- Update `writing_submissions`:

```sql
SET grader = 'ai', status = 'ai_graded'
```

Error handling:

- Nếu provider/validator/save lỗi thật, cố gắng lưu failed report.
- Giữ `writing_submissions.grader='ai'`.
- Giữ `writing_submissions.status='pending'` để không đẩy bài vào tutor queue.
- Không fallback sang tutor.

Compatibility with DB missing migration 020:

- Controller kiểm tra runtime columns của `ai_grading_reports` qua `information_schema.columns`.
- Insert report chỉ dùng các cột đang tồn tại trong DB.
- Nếu DB chưa có `status`, `error_message`, `criteria_json`, `feedback_json`, controller vẫn có thể lưu phần dữ liệu cơ bản từ schema 015 như:
  - `submission_id`
  - `submission_type`
  - `band_score`
  - criterion scores
  - `error_highlights`
  - `suggestions`
  - `raw_ai_response`
  - `generated_at`

### Submission Service

File:

- `backend/src/services/submission.service.js`

Writing submit:

- `submitWriting()` insert một task Writing vào `writing_submissions` với `status='pending'`.
- `submitFullWriting()` insert nhiều task cùng `writing_group_id`.
- Submit Writing không gọi AI trực tiếp trong backend service.
- Submit Writing không phụ thuộc vào `ai_grading_reports`.

History:

- History gộp Writing/Speaking.
- Writing history group theo `writing_group_id` hoặc fallback `id`.
- Trạng thái history dùng alias:

```sql
... END AS submission_status
```

- Không còn dùng `ai_grading_reports.status` để tính trạng thái Writing history.
- Vẫn có thể lấy `agr.band_score` nếu AI report đã có điểm.

Feedback:

- `getFeedback(id, userId, type)` hỗ trợ legacy id hoặc group id.
- Nếu submission pending và chưa có report, trả pending.
- Nếu có report thì trả report tương ứng.

### Tutor Service

Files:

- `backend/src/services/tutor.service.js`
- `backend/src/controllers/tutor.controller.js`
- `backend/src/routes/api/v1/tutors.routes.js`

Tutor Queue:

- Queue vẫn chỉ lấy bài tutor:

```sql
ws.status = 'pending' AND ws.grader = 'tutor'
```

- Bài AI fail giữ `grader='ai'`, nên không nhảy vào tutor queue.

Tutor AI Reference:

Routes:

```http
GET /api/v1/tutors/ai-reference
GET /api/v1/tutors/ai-reference/:submissionId
```

Behavior:

- Tutor xem danh sách bài Writing `grader='ai'`.
- Tutor xem detail gồm prompt, response, word count, AI report.
- Read-only, tutor không sửa AI feedback.

Compatibility:

- `getAiReferenceList()` kiểm tra runtime columns của `ai_grading_reports`.
- Nếu DB chưa có `status/error_message`, query dùng:

```sql
NULL::text AS ai_report_status
NULL::text AS error_message
```

- Nếu có cột, query dùng alias rõ:

```sql
agr.status AS ai_report_status
ws.status::text AS submission_status
```

## Implemented Frontend Changes

### Writing Option UI

File:

- `frontend/src/components/grading/WritingEditor.jsx`

Before:

- AI option có thể hiện "Hết lượt".
- AI option có thể bị disable vì quota.

After:

- Giữ đủ hai radio:
  - `Giảng viên chấm`
  - `AI chấm điểm - nhận feedback nhanh`
- Không render "Hết lượt".
- Không disable AI vì quota nội bộ.
- `getTaskData()` trả về `grader: 'tutor' | 'ai'`.

### Writing Submit Flow

File:

- `frontend/src/pages/subjective-testing/WritingTestPage.jsx`

Before:

- Submit Writing và AI grading nằm chung một try/catch.
- Nếu AI grading fail sau khi bài đã lưu, UI vẫn alert lỗi và không gọi `onSubmitSuccess`.
- Modal có thể bị kẹt.

After:

1. Collect tasks từ các editor refs.
2. Đảm bảo cả bài Writing dùng cùng một grader.
3. Gọi:

```js
gradingService.submitFullWriting(payload)
```

4. Nếu `selectedGrader === 'ai'`, sau khi submit thành công mới gọi:

```js
gradingService.requestAiGrading(task.id)
```

5. AI grading failures được catch riêng.
6. Dù AI fail, vẫn gọi `onSubmitSuccess(response)` để bài đã lưu hiển thị trong flow/history.
7. Nếu chọn tutor, tuyệt đối không gọi AI grading.

### Feedback Report

File:

- `frontend/src/components/grading/FeedbackReport.jsx`

Changes:

- Hiển thị `AiFeedbackPanel` nếu report là AI report.
- Socket handler nhận cả hai shape event:
  - `submission_id`
  - `submissionId`
- Message AI fail không còn nhắc quota refund.

### Student History

Files:

- `frontend/src/pages/grading/StudentHistoryPage.jsx`
- `frontend/src/pages/student/StudentHistoryPage.jsx`

Behavior:

- Pending AI Writing có thể hiển thị nút gọi AI grading lại nếu phù hợp.
- AI feedback hiển thị qua report panel sau khi có report.
- Tutor grading vẫn dùng flow cũ.

### Tutor AI Reference Pages

Files:

- `frontend/src/pages/grading/TutorAiReferencePage.jsx`
- `frontend/src/pages/grading/TutorAiReferenceDetailPage.jsx`
- `frontend/src/components/grading/AiFeedbackPanel.jsx`
- `frontend/src/layouts/TutorLayout.jsx`
- `frontend/src/App.jsx`
- `frontend/src/services/grading.service.js`

Routes:

```text
/grading/tutor/ai-reference
/grading/tutor/ai-reference/:submissionId
```

Behavior:

- Tutor sidebar có link AI Reference.
- List page hiển thị bài AI graded / AI failed nếu report schema hỗ trợ.
- Detail page hiển thị submission content và AI feedback.

## Database Changes

Migration:

- `backend/src/db/migrations/020_add_ai_grading_columns.sql`

Purpose:

- Bổ sung các cột chi tiết cho `ai_grading_reports`.

Safe operations only:

```sql
ALTER TABLE ai_grading_reports
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';
```

Các cột thêm bằng `ADD COLUMN IF NOT EXISTS`:

- `status`
- `improved_version`
- `prompt_version`
- `model_name`
- `error_message`
- `criteria_json`
- `feedback_json`
- `computed_band`
- `band_validation_warning`
- `created_at`
- `updated_at`

Không có:

- `DROP`
- `DELETE`
- `TRUNCATE`
- `RENAME`
- tạo table mới trong migration này

Runtime note:

- Nếu DB thật chưa chạy migration 020, code đã phòng thủ để submit Writing chính không crash.
- Tuy nhiên để lưu đầy đủ rich AI feedback, cần chạy migration:

```bash
cd backend
npm run migrate
```

## Routes

Backend:

```http
POST /api/v1/submissions/writing
POST /api/v1/submissions/writing/full
POST /api/v1/submissions/writing/:submissionId/ai-grade
GET  /api/v1/submissions/history
GET  /api/v1/submissions/:id/feedback?type=writing
GET  /api/v1/tutors/ai-reference
GET  /api/v1/tutors/ai-reference/:submissionId
```

Frontend:

```text
/grading/tutor/ai-reference
/grading/tutor/ai-reference/:submissionId
```

## Files Affected

Backend:

- `backend/src/services/ai.service.js`
- `backend/src/ai/aiGrading.constants.js`
- `backend/src/ai/grading.prompt.js`
- `backend/src/ai/grading.validator.js`
- `backend/src/ai/grading.service.js`
- `backend/src/controllers/aiGrading.controller.js`
- `backend/src/routes/api/v1/submissions.routes.js`
- `backend/src/services/submission.service.js`
- `backend/src/services/tutor.service.js`
- `backend/src/controllers/tutor.controller.js`
- `backend/src/routes/api/v1/tutors.routes.js`
- `backend/src/db/migrations/020_add_ai_grading_columns.sql`
- `backend/src/db/queries/grading.queries.js`

Frontend:

- `frontend/src/components/grading/WritingEditor.jsx`
- `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- `frontend/src/services/grading.service.js`
- `frontend/src/components/grading/AiFeedbackPanel.jsx`
- `frontend/src/components/grading/FeedbackReport.jsx`
- `frontend/src/pages/grading/StudentHistoryPage.jsx`
- `frontend/src/pages/grading/TutorAiReferencePage.jsx`
- `frontend/src/pages/grading/TutorAiReferenceDetailPage.jsx`
- `frontend/src/layouts/TutorLayout.jsx`
- `frontend/src/App.jsx`

## Acceptance Criteria

- Writing submission screen keeps both options:
  - Giảng viên chấm.
  - AI chấm điểm.
- AI option does not display "Hết lượt".
- AI option is selectable in demo/project mode.
- Selecting tutor submits with `grader='tutor'`.
- Selecting tutor does not call AI grading.
- Selecting AI submits with `grader='ai'`.
- AI grading call happens only after Writing submission is saved.
- AI grading calls:

```http
POST /api/v1/submissions/writing/:submissionId/ai-grade
```

- AI provider errors do not fallback to tutor.
- AI fail keeps `grader='ai'`.
- Tutor queue only shows `grader='tutor' AND status='pending'`.
- Student history does not crash if `ai_grading_reports.status` is missing.
- No ambiguous report `status` query in AI/history flow.
- Tutor AI Reference remains available.
- AI grading flow does not use Anthropic/Claude.

## Manual Test Plan

### Tutor Grading Flow

1. Open Writing Task.
2. Enter Task 1 / Task 2 responses.
3. Select `Giảng viên chấm`.
4. Submit.
5. Verify network calls `POST /api/v1/submissions/writing/full`.
6. Verify no `ai-grade` request is made.
7. Verify bài xuất hiện trong Tutor Queue.
8. Tutor grades normally.

### AI Grading Flow

1. Open Writing Task.
2. Enter Task 1 / Task 2 responses.
3. Select `AI chấm điểm`.
4. Submit.
5. Verify Writing submission is saved first.
6. Verify network calls:

```http
POST /api/v1/submissions/writing/full
POST /api/v1/submissions/writing/:submissionId/ai-grade
```

7. If Gemini key is configured, verify AI feedback appears.
8. If Gemini key is missing, verify clear provider/config error appears.
9. Verify bài vẫn lưu trong history.
10. Verify bài does not appear in Tutor Queue.

### Tutor AI Reference

1. Login tutor.
2. Open `/grading/tutor/ai-reference`.
3. Verify AI graded Writing submissions are listed.
4. Open detail.
5. Verify prompt, response, word count and AI feedback are visible.

## Verification Already Run

Frontend:

```bash
npx eslint src/pages/subjective-testing/WritingTestPage.jsx src/components/grading/WritingEditor.jsx src/components/grading/FeedbackReport.jsx src/services/grading.service.js
npm run build
```

Backend:

```bash
node --check backend/src/ai/grading.service.js
node --check backend/src/ai/grading.validator.js
node --check backend/src/controllers/aiGrading.controller.js
node --check backend/src/routes/api/v1/submissions.routes.js
node --check backend/src/services/submission.service.js
node --check backend/src/services/tutor.service.js
node --check backend/src/controllers/tutor.controller.js
npm test -- --runTestsByPath tests/unit/ai/grading.validator.test.js tests/unit/ai/grading.prompt.test.js
```

Search checks:

- No `AI Chấm điểm (Hết lượt)` in Writing submit UI.
- No `Hết lượt` in Writing AI submit path.
- No `COALESCE(status, ...)` against `ai_grading_reports`.
- No Anthropic/Claude in AI grading flow.

Known unrelated test issue:

- `backend/tests/services/submission.service.test.js` currently fails on stale Speaking tests that still call `SubmissionService.submitSpeaking`; current service uses `submitFullSpeaking`.

## Remaining Risks

- Runtime DB may still lack migration 020; code is defensive, but rich AI fields require migration.
- Real Gemini behavior depends on configured API key and provider quota.
- Multi-task Writing AI grading currently sends one AI request per submitted task.
- If one task AI grading succeeds and the other fails, UI should still show saved submission and available feedback; this should be checked manually with real DB/provider.
- Some Vietnamese UI strings in repo are mojibake due encoding; not fixed in this RFC scope.

## Rollback Plan

Rollback can be done by reverting the feature files listed above.

DB rollback is not required for migration 020 because it only adds nullable/default columns using `ADD COLUMN IF NOT EXISTS`. Leaving those columns in place is safe for old code.

If AI grading must be disabled temporarily:

- Hide or disable only the AI option in Writing UI.
- Keep `grader='tutor'` flow untouched.
- Keep Tutor Queue query unchanged.
