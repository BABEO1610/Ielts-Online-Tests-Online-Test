# Danh sách Tasks: Subjective Grading System (feat-subjective-grading)

**Dựa trên:** `SPEC.md` (APPROVED), `PLAN.md` (v1.1), `AGENTS.md`, `CLAUDE.md`, `constitution.md`.
**Quy định:** Mỗi task ≤ 4 giờ, implement độc lập theo thứ tự dependency, format bảng Markdown chi tiết tối đa.
**Lưu ý an toàn:** Mọi SQL phải dùng parameterized query ($1,$2). Mọi file upload phải validate magic bytes (SEC-04). Không gọi OpenAI API trực tiếp từ Controller (IELTS-09). AI grading phải đi qua `backend/src/ai/grading.service.js`.

---

## Phase 1: Database Migration

*Luật: Parameterized queries bắt buộc ($1, $2). Không dùng ORM. Tạo migration file riêng cho từng thay đổi schema. Tham chiếu `shared_context.md` để tránh duplicate schema.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T001** | Migration: Bổ sung cột Tutor Lock vào `writing_submissions` | `backend/src/db/migrations/002_add_tutor_lock_writing.sql` | 1 | DB Schema v2 đã tồn tại | PLAN §5, SPEC §7 | Thêm `locked_by_tutor_id UUID REFERENCES users(id) ON DELETE SET NULL` và `locked_at TIMESTAMPTZ`. Tạo partial index `idx_writing_locked_at WHERE status='in_progress'`. Rollback script đi kèm. |
| **T002** | Migration: Bổ sung cột Tutor Lock vào `speaking_submissions` | `backend/src/db/migrations/003_add_tutor_lock_speaking.sql` | 1 | T001 | PLAN §5, SPEC §7 | Thêm `locked_by_tutor_id UUID REFERENCES users(id) ON DELETE SET NULL` và `locked_at TIMESTAMPTZ`. Tạo partial index `idx_speaking_locked_at WHERE status='in_progress'`. |
| **T003** | Migration: Bổ sung cột AI Quota vào `users` | `backend/src/db/migrations/004_add_ai_quota_users.sql` | 1 | DB Schema v2 | PLAN §5, SPEC §4 | Thêm `ai_grading_quota_remaining SMALLINT NOT NULL DEFAULT 10`. Kiểm tra migration chạy không lỗi trên DB test. |
| **T004** | Cấu hình S3 Lifecycle Rule (IaC / document) | `docs/s3-lifecycle-setup.md` | 1.5 | AWS S3 bucket tồn tại | PLAN §1, §3 Flow 6 | Document hướng dẫn cấu hình S3 Lifecycle Rule: prefix `temp/`, Expiration 1 day. Xác nhận rule đã áp dụng trên bucket staging. |
| **T004B** | Định nghĩa Custom Error Classes | `backend/src/utils/errors.util.js` | 0.5 | None | PLAN §2.4, §2.8 | Định nghĩa `AppError` (kế thừa Error, thêm statusCode, isOperational). Định nghĩa `AIParseError` (kế thừa AppError, statusCode 500, dùng cho worker). Export các class. |

---

## Phase 2: Utilities & Core Helpers

*Luật (constitution SEC-04): Validate magic bytes bằng `file-type` package — không chỉ kiểm tra extension. Thuần logic — không phụ thuộc HTTP hay DB.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T005** | Implement `BandScoreUtil` | `backend/src/utils/bandScore.util.js` | 1 | None | PLAN §2.3, SPEC §4 EARS Ubiquitous | Hàm `roundToIELTSBand(rawScore)`: `Math.round(rawScore * 2) / 2`. Hàm `calculateOverallBand(criteriaScores[])`: avg → roundToIELTSBand. Export named functions. |
| **T006** | Implement `AudioValidationUtil` (magic bytes) | `backend/src/utils/audioValidation.util.js` | 2 | `file-type` package | PLAN §2.2, constitution SEC-04, SPEC §4 Unwanted | Hàm `validateMagicBytes(buffer: Buffer)`: Đọc 12 bytes đầu file — chấp nhận MP3 (`FF FB`, `ID3`), WAV (`52 49 46 46`), M4A/MP4 (`66 74 79 70`). Hàm `validateFileSize(sizeBytes)`: max 52,428,800 bytes (50MB). **Không** kiểm tra MIME type từ header client. |
| **T007** | Implement `StorageUtil` | `backend/src/utils/storage.util.js` | 2.5 | `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner` | PLAN §2.1, SPEC §8 NFR | Hàm `uploadStream(stream, s3Key, mimeType)`: stream thẳng lên S3 dùng `Upload` class (không buffer RAM). Hàm `generatePresignedUrl(s3Key, expiresInSeconds)`: private-scope, mặc định 3600s. Hàm `copyObject(sourceKey, destKey)`. Hàm `deleteObject(s3Key)`. |
| **T008** | Implement `AIResponseParser` | `backend/src/utils/aiResponseParser.util.js` | 2 | None | PLAN §2.4, CLAUDE.md AI Guardrails, SPEC §12 | Hàm `parseGradingResponse(rawJson)`: validate tất cả required fields — Writing: `task_achievement_score, coherence_score, lexical_score, grammar_score`; Speaking: thêm `fluency_score, pronunciation_score`. Nếu thiếu field → throw `AIParseError` (custom error class) để BullMQ retry. Dùng Regex/JSON.parse + try-catch (CLAUDE.md AI Guardrails). |
| **T009** | Cài đặt và cấu hình BullMQ Queue | `backend/src/config/queue.js` | 1.5 | `bullmq`, `ioredis`, Redis instance | PLAN §2.9 | Khởi tạo Queue `ai-grading-queue` và kết nối Redis. Config: `concurrency: 5`, `limiter: { max: 10, duration: 60000 }`, `defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }`. Export `queue` instance. |

---

## Phase 3: DB Queries Layer

*Luật: Mọi function nhận `pool` (hoặc `client` khi transaction-aware) làm tham số đầu tiên. Tuyệt đối không dùng string concat SQL. Parameterized query bắt buộc.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T010** | Viết `SubmissionQueries` — CRUD submissions | `backend/src/db/queries/submission.queries.js` | 2.5 | T001, T002 | PLAN §2.5 | Implement: `createWritingSubmission(client, data)`, `createSpeakingSubmission(client, data)`, `updateSubmissionStatus(client, data)`, `getSubmissionById(pool, data)`. Tất cả dùng `$1,$2`. |
| **T011** | Viết `SubmissionQueries` — Queue & Lock | `backend/src/db/queries/submission.queries.js` | 2 | T001, T002 | PLAN §2.5, SPEC §4 EARS State-driven | Bổ sung vào file T010: `claimSubmission(pool, data)` — `UPDATE ... WHERE status='pending' RETURNING id` (optimistic lock). `getTutorQueuePage(pool, filters)` — query từ `v_tutor_grading_queue` có OFFSET/LIMIT. `releaseTimedOutLocks(pool, ttlMinutes)`. |
| **T012** | Viết `FeedbackQueries` | `backend/src/db/queries/feedback.queries.js` | 2 | T001, T002 | PLAN §2.6, SPEC §7 | Implement: `createAIFeedbackReport(client, data)` (nhận `client` để dùng trong transaction), `createTutorFeedbackReport(pool, data)`, `getFeedbackBySubmissionId(pool, data)`. Đảm bảo CHECK constraint `one_submission` không vi phạm. |
| **T013** | Viết `FeedbackQueries` — Tutor Notes | `backend/src/db/queries/feedback.queries.js` | 1 | T003 | PLAN §2.6, SPEC §3 TUT-05 | Bổ sung vào file T012: `createTutorNote(pool, data)`, `getTutorNotesByStudent(pool, data)`. |
| **T014** | Viết `QuotaQueries` | `backend/src/db/queries/quota.queries.js` | 1.5 | T003 | PLAN §2.7, SPEC §4 EARS State-driven | Implement: `getAIQuota(pool, userId)`, `decrementAIQuota(client, userId)` — nhận `client` để dùng trong transaction SERIALIZABLE, trả `{ success: boolean }` dựa trên `rowCount`. `refundAIQuota(pool, userId)`. |

---

## Phase 4: Services (Business Logic)

*Luật: Service không chứa `req`/`res`. Throw `AppError` khi lỗi. AI calls đi qua `backend/src/ai/grading.service.js`. Transaction bắt buộc cho các thao tác atomic.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T015** | Service: `uploadAudio` | `backend/src/services/submission.service.js` | 2 | T006, T007 | PLAN §2.8, SPEC §6 upload endpoint, SPEC §4 Unwanted | Hàm `uploadAudio(fileStream, firstChunk, mimeType, fileSize, userId)`: gọi `validateMagicBytes()` → throw nếu fail. Gọi `validateFileSize()` → throw nếu fail. Gọi `StorageUtil.uploadStream()` với key `temp/{userId}/{uuid}`. Trả về `{ temp_s3_key }`. |
| **T016** | Service: `submitWriting` với Transaction | `backend/src/services/submission.service.js` | 2.5 | T010, T012, T014, T009 | PLAN §2.8 Flow 2, SPEC §4 Event-driven, PLAN §1 Quota Concurrency Guard | Validate `response_text.length <= 5000`. Nếu `grader='ai'`: BEGIN TRANSACTION (SERIALIZABLE) → `decrementAIQuota(client)` (rowCount=0 → ROLLBACK → HTTP 403) → `createWritingSubmission(client)` → COMMIT. Sau COMMIT: BullMQ enqueue (fail → throw AppError HTTP 503 `GRD_AI_001`). |
| **T017** | Service: `submitSpeaking` với Transaction | `backend/src/services/submission.service.js` | 2.5 | T010, T012, T014, T007, T009 | PLAN §2.8 Flow 1, SPEC §4 Event-driven | Validate `temp_s3_key` có prefix `temp/{userId}/` (IDOR guard). BEGIN TRANSACTION (SERIALIZABLE) → `decrementAIQuota(client)` → `createSpeakingSubmission(client)` → COMMIT. Sau COMMIT: `StorageUtil.copyObject(tempKey, 'submissions/{id}')` → BullMQ enqueue. Nếu grader='tutor': bỏ qua quota/enqueue. |
| **T018** | Service: `getPresignedUrlForSubmission` (IDOR guard) | `backend/src/services/submission.service.js` | 2 | T010, T007 | PLAN §2.8, PLAN §1 Presigned URL Ownership Guard, SPEC §8 NFR Security | Hàm `getPresignedUrlForSubmission(userId, userRole, submissionId, type)`: `getSubmissionById()` → verify `submission.user_id === userId` HOẶC (`role='tutor'` AND `submission.locked_by_tutor_id === userId`) → fail → throw AppError HTTP 403. Sau đó gọi `StorageUtil.generatePresignedUrl(submission.audio_url, 3600)`. |
| **T019** | Service: Tutor Queue & Claim | `backend/src/services/submission.service.js` | 2 | T011 | PLAN §2.8, SPEC §4 EARS State-driven, SPEC §5 AC | Hàm `getTutorQueue(filters)`: `getTutorQueuePage()` → trả paginated result. Hàm `claimSubmission(tutorId, submissionId, type)`: `claimSubmission()` query → `claimed=false` → throw `AppError(409, 'GRD_TUT_001')`. |
| **T020** | Service: `gradeSubmission` (Tutor) | `backend/src/services/submission.service.js` | 2.5 | T012, T010, T005, T007 | PLAN §2.8, SPEC §6 `POST /tutors/.../grade`, SPEC §3 TUT-02/04 | Verify `locked_by_tutor_id === tutorId`. **Nếu có `audio_feedback_url` (từ `temp/`), gọi `StorageUtil.copyObject` sang prefix `feedbacks/` và lấy URL mới để lưu.** Gọi `calculateOverallBand()`. `createTutorFeedbackReport()`. `updateSubmissionStatus('tutor_graded')`. Emit WebSocket event `grading_complete`. |
| **T021** | Service: `getFeedbackReport` & `addTutorNote` | `backend/src/services/submission.service.js` | 1.5 | T012, T013 | PLAN §2.8, SPEC §6 `GET /submissions/:id/feedback`, SPEC §3 TUT-05 | `getFeedbackReport(userId, submissionId, type)`: ownership check → `getFeedbackBySubmissionId()`. `addTutorNote(tutorId, studentId, note)`: `createTutorNote()`. |
| **T022** | Service: `runPrelimCheck` (AI grammar check) | `backend/src/services/submission.service.js` | 2 | T010, `backend/src/ai/grading.service.js` | PLAN §2.8, SPEC §4 Optional Feature WHERE, SPEC §3 TUT-03 | Verify `locked_by_tutor_id === tutorId`. Gọi AI qua `grading.service.js` với prompt "grammar/vocab check only — KHÔNG ghi điểm chính thức". Return `{ highlights }`. **Không lưu DB, không ghi đè điểm.** |

---

## Phase 5: Background Workers

*Luật: Worker chạy hoàn toàn tách khỏi HTTP request cycle (SPEC §8 Asynchronous). AI API phải set timeout 60s per call. Không throw unhandled exception làm crash toàn bộ worker process.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T023** | Implement `AIGradingWorker` — phần Speaking (STT) | `backend/src/workers/aiGrading.worker.js` | 2.5 | T009, T008, T012, T014, `backend/src/ai/grading.service.js` | PLAN §2.9 Processing Flow, SPEC §4 Event-driven (speaking path) | Dequeue job. Nếu type=speaking: gọi Whisper API (timeout 60s, qua `grading.service.js`), lưu transcript. Fail → throw để BullMQ retry. |
| **T024** | Implement `AIGradingWorker` — phần Grading & Transaction | `backend/src/workers/aiGrading.worker.js` | 3 | T023, T005, T008, T012 | PLAN §2.9, PLAN §7 Risk #7 (Data Inconsistency), SPEC §4 Event-driven | Gọi GPT-4o (timeout 60s). `AIResponseParser.parseGradingResponse()` → fail (AIParseError) → throw (BullMQ retry, **không crash process**). `calculateOverallBand()`. **BEGIN TRANSACTION** → `createAIFeedbackReport(client)` + `updateSubmissionStatus(client, 'ai_graded')` → **COMMIT**. Fail → ROLLBACK → throw → retry. Emit WebSocket `grading_complete`. |
| **T025** | Implement `AIGradingWorker` — Failed Handler | `backend/src/workers/aiGrading.worker.js` | 1.5 | T024, T014 | PLAN §2.9 Failed Handler, SPEC §4 Unwanted (retry 3 lần fail), SPEC §4 EARS Event-driven quota refund | BullMQ `'failed'` event listener: `updateSubmissionStatus('failed')` + `refundAIQuota(pool, user_id)`. Emit WebSocket `grading_failed`. **Không** throw HTTP 503 ở đây — đây là async context (PLAN §4 Error Taxonomy). |
| **T026** | Implement `LockReleaseWorker` (cron) | `backend/src/workers/lockRelease.worker.js` | 1.5 | T011, `node-cron` | PLAN §2.10, SPEC §10 Edge Cases (Tutor Lock Timeout) | Cron mỗi 15 phút (`*/15 * * * *`). Gọi `releaseTimedOutLocks(pool, TTL_MINUTES)` với TTL lấy từ env `TUTOR_LOCK_TTL_MINUTES` (default 60). Log số bài được nhả. |

---

## Phase 6: Middleware & Controllers & Routes

*Luật: Controller chỉ parse HTTP, gọi Service, format response `{ success, data, error, meta }`. Không có business logic. Không có `console.log`.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T027** | Middleware: `checkAIQuota` | `backend/src/middleware/checkAIQuota.js` | 1 | T014 | PLAN §2.13, SPEC §4 EARS State-driven (quota) | Pre-flight check: `getAIQuota(pool, userId)` → `remaining <= 0` → HTTP 403 `GRD_QUO_001`. Chỉ mount trên `POST /submissions/writing` và `POST /submissions/speaking`. Ghi chú: guard thực sự chống concurrency nằm trong Service Transaction. |
| **T028** | `SubmissionController` — Upload & Submit | `backend/src/controllers/submission.controller.js` | 2 | T015, T016, T017, T030 | PLAN §2.11, SPEC §6 API Contracts | Handler `uploadAudio`: parse multipart (Multer, dùng disk/stream — cấm `memoryStorage`), đọc 12 bytes đầu cho magic bytes, gọi `SubmissionService.uploadAudio()`, trả `200 { temp_s3_key }`. Handler `submitWriting` → `201`. Handler `submitSpeaking` → `201`. |
| **T029** | `SubmissionController` — Feedback & Audio URL | `backend/src/controllers/submission.controller.js` | 1.5 | T018, T021, T030 | PLAN §2.11, SPEC §6, SPEC §3 STU-09 | Handler `getAudioUrl`: gọi `getPresignedUrlForSubmission()`, trả `200 { presigned_url }`. Handler `getFeedback`: gọi `getFeedbackReport()`, trả `200 { submission, ai_report?, tutor_report? }`. |
| **T030** | `TutorController` — Queue & Claim | `backend/src/controllers/tutor.controller.js` | 2 | T019, T030_errorHandler | PLAN §2.12, SPEC §6, SPEC §3 TUT-01 | Handler `getQueue`: parse query params `type, page, limit` → `getTutorQueue()` → trả `200` kèm `meta.total`. Handler `claimSubmission`: gọi `claimSubmission()` → `200 {}` hoặc catch AppError 409 `GRD_TUT_001`. |
| **T031** | `TutorController` — Grade, PrelimCheck, Notes | `backend/src/controllers/tutor.controller.js` | 2 | T020, T021, T022, T030_errorHandler | PLAN §2.12, SPEC §6, SPEC §3 TUT-02/03/04/05 | Handler `gradeSubmission` → `201 { report_id }`. Handler `runPrelimCheck` → `200 { highlights }`. Handler `addNote` → `201 { note_id }`. Tất cả gọi `next(error)` khi có lỗi — không try-catch tự xử lý. |
| **T032** | Đăng ký Routes & Gắn Middleware | `backend/src/api/submissions.routes.js`<br>`backend/src/api/tutors.routes.js` | 2 | T027, T028, T029, T030, T031, middleware `authenticate`, middleware `authorize` | SPEC §6 API Contracts, constitution ARTICLE 4 | Route Student: `POST /speaking/upload`, `POST /writing`, `POST /speaking`, `GET /:id/audio-url`, `GET /:id/feedback` — đều cần `authenticate`. Route Tutor: `GET /queue`, `POST /:id/claim`, `POST /:id/grade`, `POST /:id/prelim-check`, `POST /students/:sid/notes` — cần `authenticate` + `authorize('tutor')`. |
| **T033** | WebSocket Integration | `backend/src/config/socket.js` | 2 | `socket.io`, T024, T025, T020 | PLAN §2.9, PLAN §3 Flow 1 bước [3], CLAUDE.md Realtime | Khởi tạo Socket.io server. Export hàm `emitToUser(userId, event, payload)`. Tích hợp vào Worker `AIGradingWorker` và `SubmissionService.gradeSubmission()`. Events: `grading_complete`, `grading_failed`. |
| **T033_B** | Socket.io Auth Middleware | `backend/src/middleware/socketAuth.js` | 1.5 | T033 | SPEC §8 Security | Intercept socket connection. Verify JWT. Gán `socket.userId = decoded.id` và join socket vào room `user_${decoded.id}`. Reject nếu sai token. |
---

### Cấu trúc lại Phase 7: Frontend Implementation (Chia thành 5 PRs)

**Phase 7.1: Foundation & Shared Architecture (PR 1 - Nền tảng)**
| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T039_C** | API Services Layer | `frontend/src/services/grading.service.js` | 1.5 | T032 | Giao tiếp API | Khởi tạo Axios functions: `uploadAudio`, `submitWriting/Speaking`, `getTutorQueue`, `gradeSubmission`, `getFeedback`. |
| **T039_D** | Shared UI Elements | `frontend/src/components/common/...` | 2.0 | None | UX Requirements | Tạo: `LoadingSkeleton`, `ToastNotification`, `Badge` (pending/graded/failed). |

**Phase 7.2: Student Submission Flow (PR 2 - Luồng nộp bài)**
| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T034** | `AudioRecorder` Component | `frontend/src/components/grading/AudioRecorder.jsx` | 3.0 | T039_C | SPEC §3 STU-08 | Dùng MediaRecorder API. Dừng khi vượt max duration. Upload qua API, nhận `temp_s3_key`. |
| **T035** | `WritingEditor` Component | `frontend/src/components/grading/WritingEditor.jsx` | 2.5 | T039_C | SPEC §3 STU-07 | Textarea max 5000 chars. Gọi API `submitWriting`. |
| **T039_F** | Quota Display Integration | `WritingEditor.jsx`, `AudioRecorder.jsx` | 1.0 | T039_C | SPEC §4 | Fetch `ai_grading_quota_remaining`. Hiển thị "Còn X lượt AI". Disable nút Submit to AI nếu quota = 0. |
| **T039_G** | Dummy Test Selection Page | `frontend/src/pages/grading/DummyTestEntry.jsx` | 1.0 | None | Integration | Trang giả lập có nút "Làm Writing/Speaking Mock 1" để test UI độc lập, truyền cứng `testId` vào URL. |

**Phase 7.3: Tutor Workspace (PR 3 - Không gian làm việc Giáo viên)**
| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T038** | `TutorQueue` Component | `frontend/src/components/grading/TutorQueue.jsx` | 2.5 | T039_C | SPEC §3 TUT-01 | Fetch queue. Bảng danh sách, pagination. Nút "Start Grading" gọi API claim. |
| **T039_H** | Tutor Queue: Tab Lịch Sử | `frontend/src/components/grading/TutorQueue.jsx` | 1.5 | T038 | Trải nghiệm UI | Thêm Tab "Đã chấm". Fetch queue với filter `status=tutor_graded`. |
| **T039** | `TutorGradingPanel` Component | `frontend/src/components/grading/TutorGradingPanel.jsx` | 3.5 | T039_C | SPEC §3 TUT-02 | Lấy Presigned URL để phát audio. Form 4 tiêu chí scores. Nút "Run Prelim Check". Gọi API submit grade. |
| **T039_I** | Tutor Context Sidebar (Notes) | `frontend/src/components/grading/TutorContextSidebar.jsx`| 2.0 | T039 | SPEC §3 TUT-05 | Sidebar bên phải. List notes cũ của học viên. Textarea + nút "Add Note". |

**Phase 7.4: Realtime Feedback & History (PR 4 - Kết quả & Lịch sử)**
| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T037** | `GradingSocketListener` Hook| `frontend/src/hooks/useGradingSocket.js` | 2.0 | T033 | SPEC §4 | Hook kết nối Socket.io. Nghe `grading_complete` và `grading_failed`, update state. |
| **T036** | `FeedbackReport` Component | `frontend/src/components/grading/FeedbackReport.jsx` | 2.5 | T037, T039_C | SPEC §3 STU-09 | Hiển thị Band Score, 4 tiêu chí, error highlights. Lắng nghe socket để refresh data. |
| **T039_E** | Student Submissions History | `frontend/src/pages/grading/StudentHistoryPage.jsx` | 2.0 | T039_C, T039_D| UI Navigation | Bảng lịch sử bài nộp, trạng thái, điểm. Click dòng để mở `FeedbackReport`. |
| **T039_J** | Student Dashboard Widgets | `frontend/src/components/grading/StudentDashboardWidgets.jsx`| 1.5 | T039_E | SPEC §3 STU-12 | 3 Thẻ Card: Target Band, Current Avg Score, Remaining Quotas. Gắn lên đầu trang History. |

**Phase 7.5: App Assembly & Routing (PR 5 - Lắp ráp hoàn chỉnh)**
| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T039_B** | Frontend Pages & Routing | `frontend/src/App.jsx`, `pages/...` | 2.5 | Tất cả Phase 7| UI Navigation | Khai báo Routes (React Router). Bọc `ProtectedRoute role="tutor"` cho các trang của giáo viên. Ráp các Component vào trang tương ứng. |
## Phase 8: Testing & Quality Assurance

*Luật (constitution ARTICLE 5): Coverage ≥ 80% cho Service layer. Không gọi real OpenAI/Whisper API trong test — bắt buộc mock. Không gọi real S3 — mock StorageUtil. Phải test happy path + ít nhất 1 error case mỗi function.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done Criteria |
|---|---|---|---|---|---|---|
| **T040** | Unit Test: `BandScoreUtil` | `backend/tests/unit/utils/bandScore.util.test.js` | 1 | T005 | SPEC §12 Unit Tests, SPEC §5 AC | Test `roundToIELTSBand(6.25) === 6.5`, `roundToIELTSBand(6.124) === 6.0`, `roundToIELTSBand(0) === 0`, `roundToIELTSBand(9) === 9`. Test `calculateOverallBand` với mảng 4 phần tử. |
| **T041** | Unit Test: `AudioValidationUtil` | `backend/tests/unit/utils/audioValidation.util.test.js` | 1.5 | T006 | SPEC §12, SPEC §4 Unwanted GRD_UPL_001, PLAN §7 Risk #9 | Test `validateMagicBytes` với buffer MP3 hợp lệ → true. Test với buffer PDF/EXE giả MP3 (đổi đuôi) → false. Test `validateFileSize(51MB)` → false. |
| **T042** | Unit Test: `AIResponseParser` | `backend/tests/unit/utils/aiResponseParser.util.test.js` | 2 | T008 | PLAN §7 Risk #8 AI Hallucination | Test parse JSON đủ trường Writing → trả GradingResult. Test JSON thiếu `grammar_score` → throw `AIParseError`. Test JSON thiếu `fluency_score` cho Speaking → throw `AIParseError`. Test raw string (không phải JSON) → throw `AIParseError`. |
| **T043** | Unit Test: `SubmissionService.uploadAudio` | `backend/tests/unit/services/submission.upload.test.js` | 2 | T015, T016 | SPEC §5 AC, SPEC §4 Unwanted | Mock `StorageUtil.uploadStream`. Test file hợp lệ → trả `temp_s3_key`. Test magic bytes sai → throw AppError HTTP 400 `GRD_UPL_001`. Test file >50MB → throw AppError HTTP 413 `GRD_UPL_002`. |
| **T044** | Unit Test: `SubmissionService.submitWriting/Speaking` với Transaction | `backend/tests/unit/services/submission.submit.test.js` | 3 | T016, T017 | PLAN §7 Risk #10 Quota Race Condition, SPEC §4 Event-driven | Mock DB pool/client. Test submit `grader='ai'` quota=0 → HTTP 403. Test submit thành công → `createSubmission` và `decrementQuota` được gọi trong cùng transaction client. Test BullMQ enqueue fail → HTTP 503 `GRD_AI_001`. Test submit `grader='tutor'` → không gọi quota. |
| **T045** | Unit Test: `SubmissionService.getPresignedUrlForSubmission` | `backend/tests/unit/services/submission.presigned.test.js` | 1.5 | T018 | PLAN §7 Risk #6 IDOR, SPEC §8 Security | Mock `getSubmissionById`, mock `StorageUtil.generatePresignedUrl`. Test user lấy URL của chính mình → pass. Test user A lấy URL của user B → HTTP 403. Test tutor đang claim bài → pass. Test tutor không claim bài → HTTP 403. |
| **T046** | Unit Test: `SubmissionService.claimSubmission` | `backend/tests/unit/services/submission.claim.test.js` | 2 | T019 | SPEC §5 AC (2 Tutors cùng claim), PLAN §7 Risk #3 | Mock `claimSubmission` query với `rowCount=1` → pass. Mock `rowCount=0` → throw AppError 409 `GRD_TUT_001`. |
| **T047** | Unit Test: `AIGradingWorker` — success & AIParseError retry | `backend/tests/unit/workers/aiGrading.worker.test.js` | 3 | T023, T024, T025 | SPEC §12 Integration Tests (mock), PLAN §7 Risk #8 | Mock OpenAI (Whisper + GPT-4o). Test happy path: transaction commit, WebSocket emit `grading_complete`. Test GPT-4o trả JSON thiếu field → `AIParseError` → job fail, **không crash worker process**. Test job fail sau 3 lần → `updateStatus('failed')` + `refundQuota()` + emit `grading_failed`. |
| **T048** | Unit Test: `AIGradingWorker` — Transaction Rollback | `backend/tests/unit/workers/aiGrading.transaction.test.js` | 2.5 | T024 | PLAN §7 Risk #7 Data Inconsistency | Mock `createAIFeedbackReport` thành công nhưng `updateSubmissionStatus` fail → verify ROLLBACK xảy ra → không có record `ai_feedback_reports` mới nào tồn tại (verify DB state). Job được retry bởi BullMQ. |
| **T049** | Integration Test: Submit → AI Grade → Feedback | `backend/tests/integration/grading.flow.test.js` | 3.5 | T032, T028, T029 (routes up) | SPEC §12 Integration Tests, SPEC §5 AC | Dùng test DB thật. POST submit writing `grader='ai'` → verify `201`, status=pending. Trigger worker manually (hoặc spy on queue). Verify `status='ai_graded'`, `ai_feedback_reports` record tồn tại. GET feedback → trả đủ data. |
| **T050** | Integration Test: Tutor Queue & Concurrency Lock | `backend/tests/integration/tutor.claim.test.js` | 3.5 | T030, T031 (routes up) | SPEC §12 Stress/Concurrency Test, SPEC §5 AC | 2 requests đồng thời `POST .../claim` cùng 1 submission_id → 1 nhận 200, 1 nhận 409 `GRD_TUT_001`. Load test: 50 requests đồng thời → đúng 1 thành công. |
| **T051** | Integration Test: Quota Race Condition | `backend/tests/integration/quota.concurrent.test.js` | 3 | T032 (routes up) | PLAN §7 Risk #10, SPEC §10 Edge Cases | User với quota=1 spam 10 request submit `grader='ai'` đồng thời → chỉ 1 submission tạo thành công, 9 còn lại nhận HTTP 403. Verify DB: `ai_grading_quota_remaining = 0`. |
| **T052** | Integration Test: AI Job Retry & Refund | `backend/tests/integration/grading.retry.test.js` | 2.5 | T032, T025 (worker) | SPEC §4 Unwanted (retry 3 lần), SPEC §5 AC | Mock OpenAI luôn fail (5xx). Verify sau 3 retry: `status='failed'`, quota được hoàn trả, WebSocket event `grading_failed` bắn. |
| **T053** | Test Coverage Check | `package.json` vitest/jest config | 1 | T040–T052 | constitution ARTICLE 5: ≥ 80% Service layer | Chạy `npm test -- --coverage`. Verify coverage Service layer (`submission.service.js`, `quota.queries.js`) ≥ 80%. Verify không còn `console.log` trong production code. |

---

## Summary: Dependency Graph & Critical Path

```
Phase 1 (DB Migration): T001 → T002 → T003
                         T004 (S3 Rule, parallel)

Phase 2 (Utilities):    T005, T006, T007, T008, T009  ← all parallel

Phase 3 (Queries):      T010 ← [T001,T002]
                         T011 ← T010
                         T012 ← [T001,T002]
                         T013 ← T012
                         T014 ← T003

Phase 4 (Services):     T015 ← [T006,T007]
                         T016 ← [T010,T012,T014,T009]
                         T017 ← [T010,T012,T014,T007,T009]
                         T018 ← [T010,T007]
                         T019 ← T011
                         T020 ← [T012,T010,T005]
                         T021 ← [T012,T013]
                         T022 ← [T010, grading.service.js]

Phase 5 (Workers):      T023 ← [T009,T008,T012,T014]
                         T024 ← T023
                         T025 ← T024
                         T026 ← T011

Phase 6 (Controller):   T027 ← T014
                         T028 ← [T015,T016,T017]
                         T029 ← [T018,T021]
                         T030 ← T019
                         T031 ← [T020,T021,T022]
                         T032 ← [T027-T031]
                         T033 ← [T024,T020]

Phase 7 (Frontend):     T034-T039 ← T032, T033

Phase 8 (Tests):        T040-T053 ← các tasks tương ứng
```

**Critical Path:** T001 → T002 → T010 → T011 → T016/T017 → T024 → T032 → T049 (Integration Test)

**Estimated Total:** ~83 giờ (có thể làm song song trong nhiều phases)