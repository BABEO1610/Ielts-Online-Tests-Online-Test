# Danh sách Tasks: AI Assistance (feat-ai-assistance)

**Dựa trên:** `SPEC.md`, `PLAN.md`, `AGENTS.md`, `CLAUDE.md` và `constitution.md`.  
**Quy định:** Mỗi task ≤ 4 giờ, implement độc lập, format bảng Markdown chi tiết tối đa.  
**Feature boundary:** `feat-ai-assistance` chỉ xử lý AI sau khi Writing/Speaking submission đã tồn tại; submission creation thuộc/phối hợp với `feat-subjective-grading`.  
**Quyết định Sprint 1:** Không thêm enum/status lỗi mới cho `submission_status`. Khi AI/STT/provider/schema fail, submission giữ `status = 'pending'`, không tạo final report rỗng, và emit event `ai_grading_error`.

---

## Phase 1: Database Queries & Schema Alignment (Raw SQL `pg`)
*Luật (constitution): Bắt buộc dùng parameterized queries (`$1`, `$2`), không dùng ORM, không nối chuỗi SQL trực tiếp. Sprint 1 không tạo migration enum/status mới.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---:|---|---|---|
| **T001** | Review & xác nhận DB schema AI Assistance | `docs/ai-schema-notes.md` | 1.5 | None | SPEC §7 | Xác nhận các bảng hiện có: `writing_submissions`, `speaking_submissions`, `ai_feedback_reports`, `ai_explain_requests`, `chatbot_sessions`, `chatbot_messages`, `platform_metrics_snapshots`. Ghi rõ Sprint 1 không thêm enum/status mới cho `submission_status`. |
| **T002** | Viết Queries: Writing/Speaking Submissions | `backend/src/db/queries/ai_submissions.queries.js` | 2.5 | T001 | FR-01, FR-05 | Có hàm `getWritingSubmission(pool,id,userId?)`, `getSpeakingSubmission(pool,id,userId?)`, `updateWritingStatusToAiGraded()`, `updateSpeakingStatusToAiGraded()`. Chỉ update `ai_graded` sau khi report lưu thành công. |
| **T003** | Viết Queries: AI Feedback Reports | `backend/src/db/queries/ai_reports.queries.js` | 3 | T001 | FR-04, FR-08, FR-19 | Có `findAiReportByWritingId`, `findAiReportBySpeakingId`, `getAiReport`, `saveAiGradingReport`. Insert đúng constraint: chỉ một trong `writing_submission_id` hoặc `speaking_submission_id` non-null. Token grading lưu trong `raw_ai_response.tokens_used`. |
| **T004** | Viết Queries: Tutor AI Precheck | `backend/src/db/queries/ai_precheck.queries.js` | 1.5 | T003 | FR-17 | Có `findTutorPrecheckByWritingId`, `saveTutorPrecheckReport`. Chỉ INSERT `ai_feedback_reports`; không update `writing_submissions.status`, không overwrite `tutor_feedback_reports`. |
| **T005** | Viết Queries: Explain with AI | `backend/src/db/queries/ai_explain.queries.js` | 2.5 | T001 | FR-09, FR-10, FR-11 | Có `getQuestionContext`, `findExplainRequest`, `saveExplainRequest`. Query kiểm tra quyền truy cập question/review. Copy `questions.explanation` sang `ai_explain_requests.tutor_explanation`. |
| **T006** | Viết Queries: Chatbot Sessions & Messages | `backend/src/db/queries/ai_chat.queries.js` | 2.5 | T001 | FR-12, FR-13, FR-14, FR-15 | Có `createChatSession`, `getChatSession`, `endChatSession`, `saveChatMessage`, `getChatSessionMessages`. Chỉ cho `role = 'user'` hoặc `role = 'assistant'`; assistant message lưu `tokens_used` khi có. |
| **T007** | Viết Queries: Admin AI Usage Metrics | `backend/src/db/queries/ai_metrics.queries.js` | 2.5 | T003, T005, T006 | FR-18, FR-19 | Aggregate từ `chatbot_messages.tokens_used`, `ai_explain_requests.tokens_used`, `ai_feedback_reports.raw_ai_response->>'tokens_used'`, và `platform_metrics_snapshots`. Không trả essay/chat content. |
| **T008** | Viết Query UPSERT Platform Metrics Snapshot | `backend/src/db/queries/platform_metrics.queries.js` | 1.5 | T007 | FR-19 | Có `upsertPlatformMetricsSnapshot(pool, snapshotDate, totals)`. UPSERT theo `snapshot_date`, update `ai_calls_total`, `ai_tokens_total`. Chạy lại cùng ngày không duplicate. |

---

## Phase 2: AI Utilities, Provider Wrappers & Core Services
*Luật: Provider SDK chỉ được gọi trong `backend/src/ai/`. Service không parse HTTP request/response. Error phải dùng AppError/client-safe error code.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---:|---|---|---|
| **T009** | Cấu hình AI Env, Provider & Feature Flags | `backend/src/config/ai.config.js`<br>`.env.example` | 1.5 | None | Rollout, NFR Budget | Thêm config `AI_ASSISTANCE_ENABLED`, `AI_WRITING_ENABLED`, `AI_SPEAKING_ENABLED`, `AI_EXPLAIN_ENABLED`, `AI_CHATBOT_ENABLED`, `AI_DAILY_TOKEN_LIMIT`, `AI_MONTHLY_TOKEN_LIMIT`, provider model names, timeout configs. Không đọc `.env` thật trong code review. |
| **T010** | Viết Prompt Templates & Prompt Versioning | `backend/src/ai/prompts/writing.prompt.js`<br>`backend/src/ai/prompts/speaking.prompt.js`<br>`backend/src/ai/prompts/explain.prompt.js`<br>`backend/src/ai/prompts/chatbot.prompt.js` | 3 | T009 | FR-03, FR-07, FR-10, FR-16 | Prompt có version, feature name, rubric version. Writing Task 1/2 tách tiêu chí đúng; Speaking Part 1/2/3 có rubric; Chatbot giới hạn IELTS/Academic English/platform guidance. |
| **T011** | Implement AI Provider Wrapper | `backend/src/ai/grading.service.js` | 3.5 | T009, T010 | PLAN §2.1, FR-20 | Implement `evaluateWriting`, `evaluateSpeaking`, `explainQuestion`, `chatWithAi`. Trả normalized response + usage metadata. Không expose API key/raw provider error. |
| **T012** | Implement STT Provider Wrapper | `backend/src/ai/stt.service.js` | 2 | T009 | FR-06, AI-02 | Implement `transcribeAudio(audioUrl)`. Có timeout, retry support ở service/job layer. Error map thành client-safe `AI_TRANSCRIPTION_FAILED`/provider error. |
| **T013** | Implement AI Schema Validator | `backend/src/ai/ai.schema.js` | 2.5 | T010 | FR-03, FR-07, FR-22 | Validate Writing/Speaking/Explain/Chat output. Reject malformed JSON, missing criteria, unsafe output, score ngoài `[0.0, 9.0]`. Có `roundBandToHalf()` và `assertScoreRange()`. |
| **T014** | Implement Score Normalizer & Report Mapper | `backend/src/ai/ai.mapper.js` | 2 | T013 | FR-03, FR-04, FR-07, FR-08 | Map Writing Task 2 Task Response vào `task_achievement_score`. Map Speaking criteria vào `fluency_score`, `lexical_score`, `grammar_score`, `pronunciation_score`. Score round bước 0.5. |
| **T015** | Implement AI Budget Service | `backend/src/services/ai_budget.service.js` | 2 | T007, T009 | FR-09, FR-13, FR-17, NFR Budget | Hàm `checkGlobalBudget(featureName,userId?)` kiểm tra daily/monthly usage với `AI_DAILY_TOKEN_LIMIT` và `AI_MONTHLY_TOKEN_LIMIT`. Nếu vượt limit throw `AI_USAGE_LIMIT_EXCEEDED` HTTP 429 trước provider/enqueue. Cached result không cần call provider. |
| **T016** | Implement AI Socket Service | `backend/src/services/ai_socket.service.js` | 1.5 | None | Event-driven, PLAN §2.6 | Helper emit `ai_grading_started`, `ai_grading_completed`, `ai_grading_error`, `ai_precheck_completed`, `ai_precheck_error`. Payload chỉ có client-safe fields, không có raw prompt/provider error. |
| **T017** | Service AI: Request Writing Evaluation | `backend/src/services/ai.service.js` | 2.5 | T002, T003, T015, T016 | FR-01, API Contracts | Check owner, `grader='ai'`, task number/text. Check existing report trước status. Nếu report tồn tại return 200. Nếu chưa có, check `status='pending'`, budget, enqueue job, return 202. |
| **T018** | Service AI: Run Writing Evaluation Job | `backend/src/services/ai.service.js` | 3.5 | T011, T013, T014, T016, T017 | FR-03, FR-04, FR-22 | Gọi provider, retry once transient, repair retry once invalid schema. Success: INSERT report + update `ai_graded`. Failure: giữ `pending`, không tạo final report, emit `ai_grading_error`. |
| **T019** | Service AI: Request Speaking Evaluation | `backend/src/services/ai.service.js` | 2.5 | T002, T003, T015, T016 | FR-05, API Contracts | Check owner, `grader='ai'`, part number/audio. Check existing report trước status. Nếu chưa có, check `status='pending'`, budget, enqueue job, return 202. |
| **T020** | Service AI: Run Speaking Evaluation Job | `backend/src/services/ai.service.js` | 3.5 | T012, T011, T013, T014, T016, T019 | FR-06, FR-07, FR-08, FR-22 | STT retry once, save transcript nếu success, evaluate, validate, save report, update `ai_graded`. Nếu STT/provider/schema fail: giữ `pending`, không tạo report rỗng, emit `ai_grading_error`. |
| **T021** | Service AI: Explain Objective Question | `backend/src/services/ai_explain.service.js` | 2.5 | T005, T011, T013, T015 | FR-09, FR-10, FR-11 | Check Student access to question/review. Return cached explanation nếu có. Nếu không cached, check budget, call provider, save `ai_explain_requests.tokens_used`. AI không đổi official correct answer. |
| **T022** | Service AI: Chatbot Session & Message | `backend/src/services/ai_chat.service.js` | 3 | T006, T011, T013, T015 | FR-12, FR-13, FR-14, FR-15, FR-16 | Start/end session, send message, check owner/open session, validate length, budget check, load `CHAT_HISTORY_LIMIT=20`, save user + assistant messages. |
| **T023** | Service AI: Tutor Writing Precheck | `backend/src/services/ai_tutor_precheck.service.js` | 2.5 | T004, T011, T013, T014, T015, T016 | FR-17 | Check Tutor permission, existing precheck, budget. Generate read-only precheck. Không update `writing_submissions.status`, không overwrite `tutor_feedback_reports`. Failure emit `ai_precheck_error`. |
| **T024** | Service AI: Admin Usage & Metrics Aggregation | `backend/src/services/ai_metrics.service.js` | 2.5 | T007, T008 | FR-18, FR-19 | `getAdminUsage()` trả aggregate only. `aggregateAiMetrics()` scan usage tables và UPSERT `platform_metrics_snapshots`. Không trả essay/chat content. |
| **T024b** | Service AI: Report Retrieval & Permission Check | `backend/src/services/ai_report.service.js` | 1.5 | T003 | FR-21, API Contracts, Ubiquitous | Implement `getAiReport(reportId, userId, role)`. Check Student owner / Tutor visible / Admin policy. Sanitize private metadata, không trả raw provider error/API key/system prompt. Response data có AI disclaimer. |

---

## Phase 3: Workers, Middleware, Controllers & API Routes
*Luật: Controller chỉ handle HTTP, gọi service, format response `{ success, data, error, meta }`. Không dùng `console.log`, không expose raw provider errors.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---:|---|---|---|
| **T025** | Implement AI Job Queue Abstraction | `backend/src/jobs/ai.queue.js` | 2 | T017-T024 | PLAN §2.6 | Tạo interface enqueue cho `writing-ai-evaluation`, `speaking-ai-evaluation`, `tutor-writing-precheck`, `aggregate-ai-metrics`. Sprint demo có thể dùng Native Promise, giữ interface để thay BullMQ. |
| **T026** | Worker: Writing/Speaking AI Evaluation Jobs | `backend/src/jobs/ai.worker.js` | 3 | T018, T020, T025 | Event-driven, FR-22 | Worker gọi `runWritingEvaluationJob` và `runSpeakingEvaluationJob`. Failure giữ `pending`, emit `ai_grading_error`, không tạo final report rỗng. |
| **T027** | Worker: Tutor Precheck Job | `backend/src/jobs/ai_precheck.worker.js` | 2 | T023, T025 | FR-17 | Worker xử lý `tutor-writing-precheck`. Failure không update submission status, emit `ai_precheck_error`. Success emit `ai_precheck_completed`. |
| **T028** | Worker/Cron: Aggregate AI Metrics | `backend/src/jobs/ai_metrics.worker.js` | 2 | T024, T025 | FR-19, Event-driven | Cron hourly/daily chạy `aggregateAiMetrics()`. UPSERT `platform_metrics_snapshots`. Idempotent khi chạy lại cùng ngày. |
| **T029** | Socket.io Namespace & Rooms | `backend/src/socket/ai.socket.js` | 2 | T016 | Event-driven, Security | Tạo namespace/rooms bảo mật theo user/submission. Student không nhận event của user khác. Tutor chỉ nhận event submission được phép xem. |
| **T030** | Middleware: AI Rate Limit | `backend/src/middleware/aiRateLimit.js` | 1.5 | T009 | NFR Rate Limiting | Rate limit cho chatbot/explain/evaluate/precheck. Trả `AI_RATE_LIMITED` HTTP 429. Không thay thế budget control. |
| **T031** | Controller AI: Writing/Speaking Evaluation | `backend/src/controllers/ai.controller.js` | 2.5 | T017, T019, T025 | API Contracts | Endpoints `POST /api/v1/ai/writing/evaluate/:submission_id`, `POST /api/v1/ai/speaking/evaluate/:submission_id`. Trả 202 khi enqueue, 200 nếu existing report, 429 khi budget exceeded. |
| **T032** | Controller AI: Report Retrieval | `backend/src/controllers/ai.controller.js` | 1.5 | T024b | FR-21, API Contracts | Endpoint `GET /api/v1/ai/reports/:report_id`. Check Student owner / Tutor visible / Admin policy. Response có disclaimer, không lộ raw secret/provider error. |
| **T033** | Controller AI: Explain with AI | `backend/src/controllers/ai.controller.js` | 2 | T021 | FR-09, FR-10, FR-11 | Endpoint `POST /api/v1/ai/explain`. Trả 201 nếu tạo mới, 200 nếu cached, 403 nếu inaccessible question, 429 nếu vượt budget. |
| **T034** | Controller AI: Chatbot Sessions & Messages | `backend/src/controllers/ai_chat.controller.js` | 2.5 | T022 | FR-12, FR-13, FR-14, FR-15 | Endpoints create session, send message, end session. Trả 409 nếu session ended. Trả 429 khi budget exceeded. |
| **T035** | Controller Tutor: AI Precheck | `backend/src/controllers/tutor_ai.controller.js` | 2 | T023, T025 | FR-17 | Endpoints GET/POST `/api/v1/tutor/submissions/writing/:id/ai-precheck`. POST return 202 hoặc existing report. Không update submission status. |
| **T036** | Controller Admin: AI Usage | `backend/src/controllers/admin_ai.controller.js` | 1.5 | T024 | FR-18 | Endpoint `GET /api/v1/admin/ai/usage`. Validate date range. Return aggregate metrics only; không trả private content. |
| **T037** | AI Routes Registration | `backend/src/routes/ai.routes.js`<br>`backend/src/routes/tutor.routes.js`<br>`backend/src/routes/admin.routes.js` | 2 | T030-T036 | API Contracts | Mount đúng routes. Gắn `authenticate`, `authorize('student'/'tutor'/'admin')`, `aiRateLimit` đúng endpoints, response format chuẩn. |
| **T038** | Centralized Error Mapping cho AI | `backend/src/middleware/errorHandler.js`<br>`backend/src/errors/ai.errors.js` | 2 | T031-T037 | Error Matrix | Map `AI_USAGE_LIMIT_EXCEEDED`, `AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_INVALID_RESPONSE`, `AI_TRANSCRIPTION_FAILED`, `AI_FORBIDDEN`. Không trả stack/raw provider error. |

---

## Phase 4: Frontend Implementation (React + Vite)
*Luật: Components viết bằng PascalCase. Style dùng Bootstrap 5. UI phải hiển thị AI disclaimer và không hiển thị raw provider metadata.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---:|---|---|---|
| **T039** | AI API Client Service | `frontend/src/services/aiApi.js` | 2 | T031-T037 | API Contracts | Viết client functions: evaluateWriting, evaluateSpeaking, getReport, explainQuestion, createChatSession, sendChatMessage, endChatSession, getAdminAiUsage, tutorPrecheck. |
| **T040** | AI Socket Hook | `frontend/src/hooks/useAiSocket.js` | 2 | T029, T039 | Event-driven | Listen `ai_grading_started`, `ai_grading_completed`, `ai_grading_error`, `ai_precheck_completed`, `ai_precheck_error`. Cleanup listeners khi unmount. |
| **T041** | Component: AI Processing State | `frontend/src/components/ai/AiProcessingState.jsx` | 1.5 | T040 | State-driven | Hiển thị processing/retryable state cho submission `pending`. Không hiển thị empty final report. |
| **T042** | Component: AI Writing Feedback Report | `frontend/src/components/ai/WritingAiReport.jsx` | 2.5 | T032, T039 | STU-09, FR-21 | Hiển thị band score, 4 criteria, highlights, suggestions, disclaimer. Label Task 1/Task 2 đúng. |
| **T043** | Component: AI Speaking Feedback Report | `frontend/src/components/ai/SpeakingAiReport.jsx` | 2.5 | T032, T039 | STU-09, FR-07, FR-21 | Hiển thị transcript, band score, criteria, pronunciation limitation notice nếu có, disclaimer. |
| **T044** | Button/Modal: Explain with AI | `frontend/src/components/ai/ExplainWithAiButton.jsx`<br>`frontend/src/components/ai/ExplainWithAiModal.jsx` | 2.5 | T033, T039 | STU-06 | Button dưới Tutor explanation. Modal hiển thị loading, cached/new response, error 403/429/503. Không thay correct answer. |
| **T045** | Component: AI Chatbot Window | `frontend/src/components/ai/AiChatbotWindow.jsx` | 3 | T034, T039 | STU-11, FR-12-FR-16 | Chat window trong workspace. Start session, send message, end session, hiển thị lịch sử, xử lý 409 ended session, 429 budget. |
| **T046** | Component: Tutor AI Precheck Panel | `frontend/src/components/tutor/TutorAiPrecheckPanel.jsx` | 2.5 | T035, T039 | TUT-03, FR-17 | Read-only panel trong Tutor grading screen. POST request tạo precheck khi chưa có. Không ghi đè form tutor feedback. |
| **T047** | Page/Widget: Admin AI Usage Dashboard | `frontend/src/components/admin/AiUsageDashboard.jsx` | 2.5 | T036, T039 | ADM-01, ADM-05 | Filter theo date range. Hiển thị AI calls/tokens theo ngày/feature. Không hiển thị nội dung essay/chat. |
| **T048** | Component: AI Error & Disclaimer UI | `frontend/src/components/ai/AiErrorMessage.jsx`<br>`frontend/src/components/ai/AiDisclaimer.jsx` | 1.5 | T039 | Error Matrix, FR-21 | Chuẩn hóa message cho 400/403/409/429/502/503/504. Disclaimer xuất hiện trên AI reports. |

---

## Phase 5: Testing & Quality Assurance
*Luật: Coverage ≥ 85% cho AI Assistance backend module. Không gọi real AI provider/STT trong test. Mock toàn bộ provider calls.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | EARS spec refs | Done criteria |
|---|---|---|---:|---|---|---|
| **T049** | Unit Test: AiSchemaValidator & Score Normalizer | `tests/unit/ai/ai.schema.test.js` | 2 | T013, T014 | FR-03, FR-07, Unwanted | Test valid/missing criteria, malformed JSON, score ngoài range, score round 0.5, pronunciation nullable. |
| **T050** | Unit Test: AiProvider Wrapper Mock Contract | `tests/unit/ai/grading.service.test.js` | 2 | T011, T012 | PLAN §2.1 | Mock SDK response. Test normalized output có `tokens`, `raw`, no raw API key. Không gọi provider thật. |
| **T051** | Unit Test: Budget Service | `tests/unit/services/ai_budget.test.js` | 1.5 | T015 | FR-09, FR-13, FR-17 | Mock usage vượt daily/monthly limit -> throw `AI_USAGE_LIMIT_EXCEEDED`. Verify provider/enqueue không được gọi. |
| **T052** | Unit Test: Writing/Speaking AI Services | `tests/unit/services/ai_grading.test.js` | 3 | T017-T020 | FR-01-FR-08, FR-22 | Test idempotency existing report, check status sau existing report, success update `ai_graded`, failure giữ `pending`, emit `ai_grading_error`. |
| **T053** | Unit Test: Explain & Chatbot Services | `tests/unit/services/ai_explain_chat.test.js` | 2.5 | T021, T022 | FR-09-FR-16 | Test cached explanation, inaccessible question 403, chatbot ended session 409, message too long 400, scope refusal, token saved. |
| **T054** | Unit Test: Tutor Precheck & Admin Metrics Services | `tests/unit/services/ai_tutor_admin.test.js` | 2.5 | T023, T024 | FR-17-FR-19 | Test precheck không update submission status, không overwrite tutor report. Test aggregate metrics source tables. |
| **T055** | Integration Test: Writing AI Evaluation Flow | `tests/integration/ai_writing.test.js` | 3 | T026, T031, T037 | Event-driven | Seed writing submission `grader='ai'`, mock provider success -> POST returns 202, job creates report, status `ai_graded`, token in `raw_ai_response.tokens_used`. |
| **T056** | Integration Test: Speaking AI Evaluation Flow | `tests/integration/ai_speaking.test.js` | 3.5 | T026, T031, T037 | Event-driven | Seed speaking submission, mock STT + provider -> transcript saved, report created, status `ai_graded`, pronunciation nullable supported. |
| **T057** | Integration Test: Async Failure Safety | `tests/integration/ai_failure.test.js` | 2.5 | T026 | FR-22 | Mock timeout/malformed schema/STT fail -> no final report, submission remains `pending`, event `ai_grading_error` emitted. |
| **T058** | Integration Test: Explain with AI & Chatbot | `tests/integration/ai_explain_chat.test.js` | 3 | T033, T034, T037 | FR-09-FR-16 | Test Explain creates `ai_explain_requests`; cached returns 200. Chat session creates user/assistant messages and rejects ended session with 409. |
| **T059** | Integration Test: Tutor Precheck Safety | `tests/integration/ai_tutor_precheck.test.js` | 2.5 | T027, T035, T037 | FR-17 | Tutor precheck creates read-only AI report; verify `writing_submissions.status` unchanged and `tutor_feedback_reports` untouched. |
| **T060** | Integration Test: Budget Control | `tests/integration/ai_budget.test.js` | 2 | T015, T031-T035 | Unwanted, NFR Budget | Seed usage over budget -> Writing/Speaking/Explain/Chatbot/TutorPrecheck return 429 before provider call. Cached explanation/report vẫn trả về. |
| **T061** | Integration Test: Metrics Aggregation Job | `tests/integration/ai_metrics_worker.test.js` | 2.5 | T028, T036 | FR-18, FR-19 | Seed chatbot/explain/grading token usage -> run `aggregateAiMetrics()` -> verify UPSERT `platform_metrics_snapshots.ai_calls_total`, `ai_tokens_total`. |
| **T062** | Security Test: Ownership & RBAC | `tests/integration/ai_security.test.js` | 3 | T037 | Ubiquitous | Student A không xem report/chat/explain của Student B. Tutor chỉ xem allowed submission. Admin usage trả aggregate only. |
| **T063** | Frontend Test: AI Components | `frontend/src/components/ai/*.test.jsx` | 3 | T039-T048 | STU-06, STU-09, STU-11, TUT-03 | Test render AI reports/disclaimer, Explain modal, Chatbot window, Tutor Precheck panel, error 429/409/403. Mock API/socket. |
| **T064** | Test Coverage Check | `package.json`<br>`vitest.config.js` / `jest.config.js` | 1 | T049-T063 | Coverage Target | Chạy coverage đạt ≥ 85% cho AI Assistance backend module. CI fail nếu gọi real AI/STT provider. |
