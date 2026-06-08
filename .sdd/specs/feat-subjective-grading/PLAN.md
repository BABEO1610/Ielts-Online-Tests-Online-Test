# Implementation Plan: Subjective Grading System (feat-subjective-grading)

**Status:** DRAFT — Awaiting Tech Lead Review
**Linked Spec:** `.sdd/specs/feat-subjective-grading/SPEC.md` (APPROVED, Risk: High)
**Sprint:** Sprint 2 — Grading Core
**Date:** 2026-06-03
**Revision:** v1.1 — Fixed architectural flaws (IDOR, Transaction, Orphaned S3, GRD_AI_001 contradiction, edge cases)

---

## 1. ARCHITECTURAL APPROACH

- **Layered Architecture:** Tuân thủ mô hình Route → Controller → Service → DB Query (raw `pg`). Tuyệt đối không dùng ORM.
- **Async AI Pipeline:** Luồng AI Grading hoàn toàn tách khỏi HTTP request cycle. Sau khi Student submit, API trả về `201` ngay lập tức; một **BullMQ Worker** chạy nền sẽ nhận job từ Redis Queue, gọi OpenAI API (Whisper STT + GPT-4o), ghi kết quả, và đẩy Realtime Notification qua WebSocket.
- **File Storage Strategy:** Tất cả audio/document file được stream thẳng lên **AWS S3** (private bucket). DB chỉ lưu `s3_key` (không phải full URL). Frontend truy cập file qua **Presigned URL** được tạo on-demand qua API, hết hạn sau 60 phút — **không bao giờ trả thẳng URL cho client mà không qua ownership check**.
- **Presigned URL Ownership Guard:** Mọi request lấy Presigned URL đều phải qua `SubmissionService.getPresignedUrlForSubmission()` — service này verify `submission.user_id === req.user.id` (hoặc `role === 'tutor'` với submission đang bị claim bởi tutor đó) trước khi gọi `StorageUtil.generatePresignedUrl()`. Không có hàm public nào trả URL trực tiếp từ s3Key.
- **Atomic AI Write (DB Transaction):** Thao tác `createAIFeedbackReport()` và `updateSubmissionStatus('ai_graded')` **bắt buộc** bọc trong một PostgreSQL transaction duy nhất. Nếu một trong hai lỗi, toàn bộ rollback — tránh trạng thái inconsistent "có status mà không có report".
- **Concurrency Control (Optimistic Locking):** Khi Tutor nhận bài (`POST .../claim`), hệ thống dùng `UPDATE ... WHERE status = 'pending' RETURNING *`. Nếu `rowCount = 0` → trả về HTTP 409 `GRD_TUT_001`. Cơ chế này đảm bảo chỉ 1 Tutor "chiếm" được 1 submission tại một thời điểm mà không cần explicit DB lock.
- **Quota Concurrency Guard:** `decrementAIQuota` và `createSubmission` được thực thi trong cùng một **DB Transaction với `SERIALIZABLE` isolation level** để chặn race condition khi Student spam submit. Transaction sẽ rollback nếu quota đã về 0 do concurrent request khác giành trước.
- **Lock Timeout (Tutor TTL):** Một submission bị claim nhưng chưa graded sau **TTL** (mặc định 1 giờ — xem Open Question Q2) sẽ được một **Scheduled Job (cron)** tự động nhả lại vào queue (`status → 'pending'`, `locked_by_tutor_id → NULL`).
- **S3 Orphaned File Cleanup:** File audio được upload lên S3 nhưng không có bản ghi DB tương ứng sau 24h (do client rớt mạng trước khi gọi submit) sẽ được dọn sạch bằng **S3 Lifecycle Rule** (`Expiration: 1 day` trên prefix `temp/`) kết hợp với convention đặt tên key: upload trước dùng prefix `temp/{userId}/{uuid}`, sau khi submit thành công thì rename (copy + delete) sang `submissions/{submissionId}`.
- **Error Taxonomy — GRD_AI_001:** Mã lỗi này chỉ được trả về đồng bộ (HTTP 503) tại Controller khi **BullMQ không thể enqueue job** (Redis down hoặc queue full tại thời điểm submit). Việc Worker fail sau đó (retry hết lần) không trả HTTP response mà bắn **WebSocket error notification** và **refund quota** — hai luồng này hoàn toàn tách biệt.
- **Standardized Responses:** Mọi API response tuân thủ format `{ success, data, error, meta }`. Lỗi xử lý tập trung tại `backend/src/middleware/errorHandler.js`.

---

## 2. COMPONENTS & INTERFACE

### 2.1 `StorageUtil` — `backend/src/utils/storage.util.js`

> Wrapper cho AWS S3 SDK — không phụ thuộc DB, không phụ thuộc HTTP. **Không bao giờ được gọi trực tiếp từ Controller** — phải đi qua Service layer để đảm bảo ownership check.

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `uploadStream(stream, s3Key, mimeType)` | `stream: Readable`, `s3Key: string`, `mimeType: string` | `Promise<{ s3Key: string }>` | Stream trực tiếp lên S3 — **không buffer vào RAM**. Dùng `@aws-sdk/lib-storage` Upload class. Key phải có prefix `temp/{userId}/` cho file chưa được submit |
| `generatePresignedUrl(s3Key, expiresInSeconds)` | `s3Key: string`, `expiresInSeconds: number` | `Promise<string>` | Hàm **private-scope** trong util — chỉ `SubmissionService` được gọi sau khi đã verify ownership. Mặc định `expiresInSeconds = 3600` |
| `copyObject(sourceKey, destKey)` | `sourceKey: string`, `destKey: string` | `Promise<void>` | Dùng `CopyObjectCommand` — rename từ `temp/` → `submissions/` sau khi submit thành công |
| `deleteObject(s3Key)` | `s3Key: string` | `Promise<void>` | Dùng `DeleteObjectCommand`. Chỉ gọi khi có user confirmation (tuân thủ AGENTS.md §2) |

---

### 2.2 `AudioValidationUtil` — `backend/src/utils/audioValidation.util.js`

> Validate file trước khi upload — không có side effects.

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `validateMagicBytes(buffer)` | `buffer: Buffer` (first 12 bytes của file) | `boolean` | **Đọc magic bytes thực tế của file** thay vì tin vào MIME type do client khai báo. Chữ ký hợp lệ: MP3 (`FF FB`, `FF F3`, `FF F2`, `ID3`), WAV (`52 49 46 46`), M4A/MP4 (`00 00 00 xx 66 74 79 70`). Chặn bypass bằng cách đổi đuôi `.exe` → `.mp3` |
| `validateFileSize(sizeBytes)` | `sizeBytes: number` | `boolean` | Max = **50MB** (52,428,800 bytes) |

> **Lý do bỏ `validateMimeType(mimeType)`:** MIME type trong multipart header do client tự khai báo — không tin cậy được. Chỉ `validateMagicBytes()` mới là nguồn truth thực sự.

---

### 2.3 `BandScoreUtil` — `backend/src/utils/bandScore.util.js`

> Thuần logic tính toán — không phụ thuộc bên ngoài. **Unit-testable độc lập.**

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `roundToIELTSBand(rawScore)` | `rawScore: number` | `number` | Làm tròn theo chuẩn IELTS: 6.25 → 6.5; 6.124 → 6.0. Logic: `Math.round(rawScore * 2) / 2` |
| `calculateOverallBand(criteriaScores)` | `criteriaScores: number[]` | `number` | Tính trung bình cộng 4 tiêu chí → gọi `roundToIELTSBand()` |

---

### 2.4 `AIResponseParser` — `backend/src/utils/aiResponseParser.util.js`

> Parse và validate kết quả trả về từ GPT-4o — tách riêng để dễ unit test.

| Function | Input | Output | Ghi chú |
|----------|-------|--------|---------|
| `parseGradingResponse(rawJson)` | `rawJson: string \| object` | `GradingResult` hoặc throw `AIParseError` | Validate các trường bắt buộc: `task_achievement_score`, `coherence_score`, `lexical_score`, `grammar_score` (với Writing); `fluency_score`, `pronunciation_score` (với Speaking). Nếu thiếu bất kỳ trường nào → throw `AIParseError` để BullMQ retry, **không crash toàn bộ worker process** |

> **Lý do tách riêng:** AI Hallucination là edge case có xác suất thực tế. Nếu LLM trả JSON thiếu `fluency_score`, worker phải throw đúng loại error để BullMQ nhận biết là retriable failure — không phải unhandled exception.

---

### 2.5 `SubmissionQueries` — `backend/src/db/queries/submission.queries.js`

> Raw SQL với parameterized query (`$1, $2`). Các function transaction-aware nhận `client` (pg PoolClient) thay vì `pool`.

| Function | Input | Output | SQL Target |
|----------|-------|--------|------------|
| `createWritingSubmission(client, data)` | `{ user_id, test_id, task_number, prompt_text, response_text, grader }` | `{ id: string }` | `INSERT INTO writing_submissions ... RETURNING id` |
| `createSpeakingSubmission(client, data)` | `{ user_id, test_id, part_number, prompt_text, audio_url, grader }` | `{ id: string }` | `INSERT INTO speaking_submissions ... RETURNING id` |
| `updateSubmissionStatus(client, data)` | `{ id, type: 'writing'\|'speaking', status }` | `void` | `UPDATE writing_submissions\|speaking_submissions SET status = $1 WHERE id = $2` |
| `claimSubmission(pool, data)` | `{ submission_id, type, tutor_id }` | `{ claimed: boolean }` | `UPDATE ... SET status='in_progress', locked_by_tutor_id=$1, locked_at=NOW() WHERE id=$2 AND status='pending' RETURNING id` — `rowCount=0` → `claimed=false` (HTTP 409) |
| `getSubmissionById(pool, data)` | `{ id, type: 'writing'\|'speaking' }` | `WritingSubmission \| SpeakingSubmission \| null` | `SELECT * FROM ... WHERE id = $1` |
| `getTutorQueuePage(pool, filters)` | `{ type?, page, limit }` | `{ rows: QueueItem[], total: number }` | Query từ `v_tutor_grading_queue` với OFFSET/LIMIT |
| `releaseTimedOutLocks(pool, ttlMinutes)` | `ttlMinutes: number` | `number` (rows affected) | `UPDATE ... SET status='pending', locked_by_tutor_id=NULL WHERE status='in_progress' AND locked_at < NOW() - interval '$1 minutes' RETURNING id` |

> **Convention:** Các function nhận `client` (PoolClient) được thiết kế để dùng trong transaction block. Các function nhận `pool` được dùng độc lập ngoài transaction.

> **Lưu ý Schema:** Bảng `writing_submissions` và `speaking_submissions` trong DB Schema v2 chưa có cột `locked_by_tutor_id` và `locked_at`. Cần tạo migration bổ sung — xem §5.

---

### 2.6 `FeedbackQueries` — `backend/src/db/queries/feedback.queries.js`

| Function | Input | Output | SQL Target |
|----------|-------|--------|------------|
| `createAIFeedbackReport(client, data)` | `{ writing_submission_id?, speaking_submission_id?, band_score, task_achievement_score, coherence_score, lexical_score, grammar_score, fluency_score, pronunciation_score, error_highlights, suggestions, raw_ai_response }` | `{ id: string }` | `INSERT INTO ai_feedback_reports ... RETURNING id`. Nhận `client` để chạy trong transaction cùng `updateSubmissionStatus` |
| `createTutorFeedbackReport(pool, data)` | `{ tutor_id, writing_submission_id?, speaking_submission_id?, band_score, ...criteria_scores, written_feedback, audio_feedback_url }` | `{ id: string }` | `INSERT INTO tutor_feedback_reports ... RETURNING id` |
| `getFeedbackBySubmissionId(pool, data)` | `{ submission_id, type: 'writing'\|'speaking' }` | `{ ai_report?, tutor_report? }` | `SELECT * FROM ai_feedback_reports WHERE writing_submission_id=$1` (hoặc speaking variant) |
| `createTutorNote(pool, data)` | `{ tutor_id, student_id, note }` | `{ id: string }` | `INSERT INTO tutor_student_notes ... RETURNING id` |
| `getTutorNotesByStudent(pool, data)` | `{ tutor_id, student_id }` | `TutorNote[]` | `SELECT * FROM tutor_student_notes WHERE tutor_id=$1 AND student_id=$2` |

---

### 2.7 `QuotaQueries` — `backend/src/db/queries/quota.queries.js`

> **Lưu ý:** Bảng `users` hiện tại chưa có cột `ai_grading_quota_remaining`. Cần migration bổ sung — xem §5.

| Function | Input | Output | SQL Target |
|----------|-------|--------|------------|
| `getAIQuota(pool, userId)` | `userId: string` | `{ remaining: number }` | `SELECT ai_grading_quota_remaining FROM users WHERE id = $1` |
| `decrementAIQuota(client, userId)` | `userId: string` | `{ success: boolean }` | `UPDATE users SET ai_grading_quota_remaining = ai_grading_quota_remaining - 1 WHERE id = $1 AND ai_grading_quota_remaining > 0 RETURNING ai_grading_quota_remaining`. Nhận `client` để chạy trong transaction. `rowCount=0` → quota đã hết (concurrent request đã giành mất) |
| `refundAIQuota(pool, userId)` | `userId: string` | `void` | `UPDATE users SET ai_grading_quota_remaining = ai_grading_quota_remaining + 1 WHERE id = $1` |

---

### 2.8 `SubmissionService` — `backend/src/services/submission.service.js`

> Business logic thuần — không có `req`/`res`. Throw `AppError` khi gặp lỗi.

| Method | Input | Output | Logic Tóm Tắt |
|--------|-------|--------|----------------|
| `uploadAudio(fileStream, firstChunk, mimeType, fileSize, userId)` | stream + metadata + userId | `{ temp_s3_key: string }` | `validateMagicBytes(firstChunk)` (→ `GRD_UPL_001`) → `validateFileSize()` (→ `GRD_UPL_002`) → `StorageUtil.uploadStream(stream, 'temp/{userId}/{uuid}', mimeType)` → return temp s3Key |
| `submitWriting(userId, data)` | `{ test_id, task_number, prompt_text, response_text, grader }` | `{ submission_id: string }` | Validate `response_text` maxLength (5000 chars) → **BEGIN TRANSACTION (SERIALIZABLE)** → nếu `grader='ai'`: `decrementAIQuota(client)` (rowCount=0 → rollback → HTTP 403) → `createWritingSubmission(client)` → **COMMIT** → nếu `grader='ai'`: enqueue BullMQ (fail → HTTP 503 `GRD_AI_001`) → return `submission_id` |
| `submitSpeaking(userId, data)` | `{ test_id, part_number, prompt_text, temp_s3_key, grader }` | `{ submission_id: string }` | Validate `temp_s3_key` thuộc prefix `temp/{userId}/` (guard IDOR) → **BEGIN TRANSACTION (SERIALIZABLE)** → nếu `grader='ai'`: `decrementAIQuota(client)` → `createSpeakingSubmission(client, { audio_url: finalKey })` → **COMMIT** → `StorageUtil.copyObject(tempKey, 'submissions/{id}')` → enqueue BullMQ (fail → HTTP 503 `GRD_AI_001`) → return `submission_id` |
| `getPresignedUrlForSubmission(userId, userRole, submissionId, type)` | `userId, userRole, submissionId, type` | `{ presigned_url: string }` | `getSubmissionById()` → verify ownership: `submission.user_id === userId` **HOẶC** (`userRole === 'tutor'` AND `submission.locked_by_tutor_id === userId`) → fail → HTTP 403 → `StorageUtil.generatePresignedUrl(submission.audio_url, 3600)` → return URL |
| `getTutorQueue(tutorId, filters)` | `{ type?, page, limit }` | `{ items: QueueItem[], total, page, limit }` | Guard role=tutor → `getTutorQueuePage()` → return paginated result |
| `claimSubmission(tutorId, submissionId, type)` | `tutorId, submissionId, type` | `void` | `claimSubmission()` query → `claimed=false` → throw `AppError(409, 'GRD_TUT_001')` |
| `gradeSubmission(tutorId, submissionId, type, gradeData)` | `tutorId, submissionId, type, { band_score, ...criteria, written_feedback, audio_feedback_url }` | `{ report_id: string }` | Verify `locked_by_tutor_id = tutorId` → `calculateOverallBand()` → `createTutorFeedbackReport()` → `updateSubmissionStatus('tutor_graded')` → emit WebSocket event |
| `getFeedbackReport(userId, submissionId, type)` | `userId, submissionId, type` | `{ submission, ai_report?, tutor_report? }` | `getSubmissionById()` → verify `user_id = userId` (ownership guard) → `getFeedbackBySubmissionId()` → merge & return |
| `runPrelimCheck(tutorId, submissionId)` | `tutorId, submissionId` | `{ highlights: object }` | `getSubmissionById()` → verify `locked_by_tutor_id = tutorId` → gọi GPT-4o với prompt "grammar/vocab check only" → return highlights (không lưu DB, không ghi đè điểm) |
| `addTutorNote(tutorId, studentId, note)` | `tutorId, studentId, note` | `{ note_id: string }` | `createTutorNote()` |

---

### 2.9 `AIGradingWorker` — `backend/src/workers/aiGrading.worker.js`

> BullMQ Worker — chạy nền, độc lập với HTTP server. Mỗi job xử lý một submission.

**Job Payload:**
```json
{
  "submission_id": "uuid",
  "type": "writing" | "speaking",
  "user_id": "uuid"
}
```

**Processing Flow:**
```
Dequeue job
  ├─ [speaking] Gọi Whisper API: audio_url → transcript (timeout 60s)
  │   └─ [fail] throw Error → BullMQ retry
  ├─ Gọi GPT-4o với structured prompt chấm điểm IELTS 4 tiêu chí (timeout 60s)
  │   └─ [fail / timeout] throw Error → BullMQ retry
  ├─ AIResponseParser.parseGradingResponse(rawResponse)
  │   └─ [AIParseError: thiếu field / wrong format] throw Error → BullMQ retry
  │       ⚠️ KHÔNG crash worker process — chỉ fail JOB này
  ├─ BandScoreUtil.calculateOverallBand([...scores])
  │
  ├─ ── BEGIN TRANSACTION ──────────────────────────────────────────────
  │   ├─ FeedbackQueries.createAIFeedbackReport(client, reportData)
  │   └─ SubmissionQueries.updateSubmissionStatus(client, { id, status: 'ai_graded' })
  └─ ── COMMIT ─────────────────────────────────────────────────────────
      └─ [COMMIT fail] ROLLBACK → throw Error → BullMQ retry

  → [Sau COMMIT] Emit WebSocket: { event: 'grading_complete', submission_id, user_id }

[Sau 3 lần retry fail — BullMQ 'failed' event handler]
  ├─ SubmissionQueries.updateSubmissionStatus(pool, { id, status: 'failed' })
  ├─ QuotaQueries.refundAIQuota(pool, user_id)
  └─ Emit WebSocket: { event: 'grading_failed', submission_id, user_id }
      ⚠️ KHÔNG trả HTTP 503 — đây là async failure, không có HTTP response context
```

**Config:**
```js
{
  connection: redisClient,
  concurrency: 5,
  limiter: { max: 10, duration: 60000 },  // 10 jobs/phút — kiểm soát OpenAI API cost
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }  // 1s → 2s → 4s
  }
}
```

---

### 2.10 `LockReleaseWorker` — `backend/src/workers/lockRelease.worker.js`

> Cron job chạy mỗi 15 phút để nhả bài bị "ngâm" quá TTL.

```js
// Chạy mỗi 15 phút
cron.schedule('*/15 * * * *', async () => {
  const ttlMinutes = process.env.TUTOR_LOCK_TTL_MINUTES || 60;
  const released = await SubmissionQueries.releaseTimedOutLocks(pool, ttlMinutes);
  logger.info(`[LockRelease] Released ${released} timed-out submissions`);
});
```

---

### 2.11 `SubmissionController` — `backend/src/controllers/submission.controller.js`

> Chỉ parse HTTP, gọi Service, format response. Không có business logic.

| Handler | Method & Path | Auth | Response |
|---------|---------------|------|----------|
| `uploadAudio` | `POST /api/v1/submissions/speaking/upload` | Student | `200 { temp_s3_key }` |
| `submitWriting` | `POST /api/v1/submissions/writing` | Student | `201 { submission_id }` |
| `submitSpeaking` | `POST /api/v1/submissions/speaking` | Student | `201 { submission_id }` |
| `getAudioUrl` | `GET /api/v1/submissions/:id/audio-url?type=speaking` | Student (own) / Tutor (claimed) | `200 { presigned_url }` |
| `getFeedback` | `GET /api/v1/submissions/:id/feedback?type=writing\|speaking` | Student (own) | `200 { submission, ai_report?, tutor_report? }` |

> **Lưu ý:** `uploadAudio` trả về `temp_s3_key` (không phải URL). Client dùng key này để gọi `submitSpeaking`. Không có endpoint nào trả thẳng Presigned URL mà không qua ownership check tại Service.

---

### 2.12 `TutorController` — `backend/src/controllers/tutor.controller.js`

| Handler | Method & Path | Auth | Response |
|---------|---------------|------|----------|
| `getQueue` | `GET /api/v1/tutors/queue` | Tutor | `200 { items[], total, page, limit }` |
| `claimSubmission` | `POST /api/v1/tutors/submissions/:id/claim` | Tutor | `200 {}` hoặc `409 GRD_TUT_001` |
| `gradeSubmission` | `POST /api/v1/tutors/submissions/:id/grade` | Tutor | `201 { report_id }` |
| `runPrelimCheck` | `POST /api/v1/tutors/submissions/:id/prelim-check` | Tutor | `200 { highlights }` |
| `addNote` | `POST /api/v1/tutors/students/:studentId/notes` | Tutor | `201 { note_id }` |

---

### 2.13 `checkAIQuota` Middleware — `backend/src/middleware/checkAIQuota.js`

> **Lưu ý:** Middleware này chỉ là **pre-flight check nhanh** để tránh trường hợp hiển nhiên (quota=0). Guard thực sự chống concurrency được thực hiện bằng Transaction + `decrementAIQuota(client)` trong Service layer.

```
Request với grader='ai'
  → getAIQuota(pool, userId)  ← đọc nhanh, ngoài transaction
  → quota.remaining <= 0 → HTTP 403 (GRD_QUO_001: "AI Grading quota exhausted")
  → next()  ← Service layer sẽ check lại lần nữa trong transaction
```

> Middleware này chỉ được mount trên `POST /submissions/writing` và `POST /submissions/speaking`.

---

### 2.14 Frontend Components

| Component | Interface (Props / Context) | Trách Nhiệm |
|-----------|----------------------------|------------|
| `AudioRecorder` | props: `onUploadComplete(tempS3Key)` | Built-in web recorder dùng `MediaRecorder API`, tự động dừng nếu vượt max duration, upload qua `POST .../upload`, nhận về `temp_s3_key` |
| `WritingEditor` | props: `testId, task, onSubmit` | Textarea với realtime word count, `maxLength` validation (5000 chars), nút "Submit to AI" / "Submit to Tutor" |
| `FeedbackReport` | props: `submissionId, type` | Hiển thị Band Score card, 4 tiêu chí, error highlights, suggestions. Lắng nghe WebSocket event `grading_complete` để trigger refresh |
| `TutorQueue` | props: none | Bảng danh sách pending submissions, filter theo type, pagination, nút "Start Grading" → gọi `/claim` |
| `TutorGradingPanel` | props: `submissionId, type` | Panel chấm điểm: lấy Presigned URL từ `GET .../audio-url` để nghe audio, input 4 tiêu chí scores, textarea feedback, nút "Run Prelim Check", audio recorder cho feedback |
| `GradingSocketListener` | context hook | Lắng nghe WebSocket events `grading_complete` và `grading_failed` → cập nhật UI state tương ứng |

---

## 3. DATA FLOW (Luồng Dữ Liệu)

### Flow 1: Student Submit Speaking với AI Grading

```
[1] Client POST /submissions/speaking/upload  { audio_file: multipart }
  → authenticate middleware
  → SubmissionController.uploadAudio()
  → SubmissionService.uploadAudio(stream, firstChunk, mimeType, fileSize, userId)
      ├─ AudioValidationUtil.validateMagicBytes(firstChunk)
      │   └─ fail (magic bytes không khớp) → HTTP 400 GRD_UPL_001
      │       ⚠️  Chặn bypass đổi đuôi .exe→.mp3 — kiểm tra byte thực tế, không tin header
      ├─ AudioValidationUtil.validateFileSize(fileSize)
      │   └─ fail (> 50MB) → HTTP 413 GRD_UPL_002
      └─ StorageUtil.uploadStream(stream, 'temp/{userId}/{uuid}', mimeType)  →  { s3Key }
  ← Response: 200 { data: { temp_s3_key: "temp/uuid1/uuid2.mp3" } }

[2] Client POST /submissions/speaking  { test_id, part_number, temp_s3_key, grader: 'ai' }
  → authenticate middleware
  → checkAIQuota middleware (pre-flight)
      └─ quota.remaining <= 0  →  HTTP 403 GRD_QUO_001
  → SubmissionService.submitSpeaking(userId, data)
      ├─ Validate temp_s3_key có prefix 'temp/{userId}/' → fail → HTTP 400 (IDOR guard)
      ├─ ── BEGIN TRANSACTION (SERIALIZABLE) ──────────────────────────────
      │   ├─ QuotaQueries.decrementAIQuota(client, userId)
      │   │   └─ rowCount=0 (concurrent request đã giành quota) → ROLLBACK → HTTP 403
      │   └─ SubmissionQueries.createSpeakingSubmission(client, data)  →  { submission_id }
      └─ ── COMMIT ────────────────────────────────────────────────────────
      ├─ StorageUtil.copyObject('temp/{userId}/...', 'submissions/{submission_id}')
      └─ BullMQ.add('ai-grading', { submission_id, type: 'speaking', user_id })
          └─ [Queue fail / Redis down] → HTTP 503 GRD_AI_001
  ← Response: 201 { data: { submission_id } }

[3] [Background] AIGradingWorker dequeues job
  ├─ Whisper API: audio_url → transcript
  ├─ GPT-4o: transcript + IELTS prompt → rawResponse
  ├─ AIResponseParser.parseGradingResponse(rawResponse)
  │   └─ [AIParseError] throw → BullMQ retry (max 3 lần)
  ├─ BandScoreUtil.calculateOverallBand([...scores])
  ├─ ── BEGIN TRANSACTION ──────────────────────────────────────────────
  │   ├─ FeedbackQueries.createAIFeedbackReport(client, reportData)
  │   └─ SubmissionQueries.updateSubmissionStatus(client, 'ai_graded')
  └─ ── COMMIT ─────────────────────────────────────────────────────────
  → Emit WebSocket: { event: 'grading_complete', submission_id, user_id }

[4] Client WebSocket listener nhận event 'grading_complete'
  → GET /submissions/{id}/feedback?type=speaking
  ← Response: 200 { submission, ai_report: { band_score, criteria, highlights } }

[5] Client GET /submissions/{id}/audio-url?type=speaking  (để nghe lại)
  → SubmissionService.getPresignedUrlForSubmission(userId, 'student', id, 'speaking')
      ├─ getSubmissionById()
      └─ verify submission.user_id === userId  →  fail → HTTP 403
  → StorageUtil.generatePresignedUrl(submission.audio_url, 3600)
  ← Response: 200 { presigned_url: "https://s3.../..." }  ← hết hạn sau 60 phút
```

---

### Flow 2: Student Submit Writing với Tutor Grading

```
Client POST /submissions/writing  { test_id, task_number, response_text, grader: 'tutor' }
  → authenticate middleware
  → SubmissionService.submitWriting(userId, data)
      ├─ Validate response_text.length <= 5000 chars → fail → HTTP 400
      └─ SubmissionQueries.createWritingSubmission(pool, data)
          →  status='pending', grader='tutor'
  ← Response: 201 { data: { submission_id } }

  [Submission tự động xuất hiện trong v_tutor_grading_queue]
```

---

### Flow 3: Tutor Claim & Grade Submission

```
[1] Tutor GET /tutors/queue?type=writing&page=1&limit=20
  → authenticate + authorize('tutor') middleware
  → SubmissionService.getTutorQueue()
  → SubmissionQueries.getTutorQueuePage()
      → query từ v_tutor_grading_queue ORDER BY submitted_at ASC
  ← Response: 200 { data: { items[], total, page, limit } }

[2] Tutor POST /tutors/submissions/{id}/claim  { type: 'writing' }
  → SubmissionService.claimSubmission(tutorId, id, type)
  → SubmissionQueries.claimSubmission()
      ├─ UPDATE ... SET status='in_progress', locked_by_tutor_id=$1, locked_at=NOW()
      │   WHERE id=$2 AND status='pending' RETURNING id
      ├─ rowCount = 1  →  claimed=true  →  200 OK
      └─ rowCount = 0  →  claimed=false  →  HTTP 409 GRD_TUT_001
  ← Response: 200 {} hoặc 409

[3] [Optional] Tutor POST /tutors/submissions/{id}/prelim-check
  → SubmissionService.runPrelimCheck(tutorId, submissionId)
      ├─ getSubmissionById() → verify locked_by_tutor_id = tutorId → fail → HTTP 403
      └─ GPT-4o với prompt "grammar/vocab check only, KHÔNG ghi điểm chính thức"
  ← Response: 200 { data: { highlights: { grammar: [], vocab: [] } } }

[4] Tutor GET /submissions/{id}/audio-url?type=speaking  (Tutor xem audio của student)
  → SubmissionService.getPresignedUrlForSubmission(tutorId, 'tutor', id, 'speaking')
      ├─ getSubmissionById()
      └─ verify submission.locked_by_tutor_id === tutorId  →  fail → HTTP 403
  → StorageUtil.generatePresignedUrl(submission.audio_url, 3600)
  ← Response: 200 { presigned_url: "https://..." }

[5] Tutor POST /tutors/submissions/{id}/grade
  Body: { type, band_score, task_achievement_score, coherence_score, lexical_score,
          grammar_score, fluency_score, pronunciation_score, written_feedback, audio_feedback_url }
  → SubmissionService.gradeSubmission()
      ├─ getSubmissionById() → verify locked_by_tutor_id = tutorId  →  fail → HTTP 403
      ├─ BandScoreUtil.calculateOverallBand([...criteria])
      ├─ FeedbackQueries.createTutorFeedbackReport(pool, reportData)
      ├─ SubmissionQueries.updateSubmissionStatus(pool, { id, status: 'tutor_graded' })
      └─ Emit WebSocket: { event: 'grading_complete', submission_id, user_id: student_id }
  ← Response: 201 { data: { report_id } }
```

---

### Flow 4: AI Job Failure & Retry

```
AIGradingWorker job fails (OpenAI timeout / 5xx / AIParseError)
  → BullMQ retry #1 (delay 1s)
  → BullMQ retry #2 (delay 2s)
  → BullMQ retry #3 (delay 4s)
  → [Sau 3 lần fail] BullMQ 'failed' event handler
      ├─ SubmissionQueries.updateSubmissionStatus(pool, { id, status: 'failed' })
      ├─ QuotaQueries.refundAIQuota(pool, user_id)
      └─ Emit WebSocket: { event: 'grading_failed', submission_id, user_id }

  ⚠️ GRD_AI_001 (HTTP 503) KHÔNG được ném ở đây — đây là async context.
     HTTP 503 chỉ được trả tại bước [2] khi BullMQ.add() throw lỗi enqueue.
```

---

### Flow 5: Tutor Lock Timeout Release

```
[Cron: mỗi 15 phút]
LockReleaseWorker
  → SubmissionQueries.releaseTimedOutLocks(pool, TTL_MINUTES)
  → UPDATE writing_submissions
       SET status='pending', locked_by_tutor_id=NULL, locked_at=NULL
       WHERE status='in_progress'
         AND locked_at < NOW() - interval '60 minutes'
  → (tương tự cho speaking_submissions)
  → log: "[LockRelease] Released N timed-out submissions"
```

---

### Flow 6: S3 Orphaned File Cleanup

```
[Tình huống:] Client upload audio thành công (temp_s3_key nhận về)
              nhưng rớt mạng trước khi gọi POST /submissions/speaking

[Giải pháp: S3 Lifecycle Rule + Key Convention]

  Key convention:
    Upload:  'temp/{userId}/{uuid}.mp3'   ← prefix 'temp/'
    Submit:  'submissions/{submission_id}.mp3'  ← copy + delete temp

  S3 Lifecycle Rule (cấu hình trên bucket):
    - Prefix: 'temp/'
    - Expiration: 1 day (24 giờ)
    → S3 tự động xóa mọi object trong temp/ sau 24h

  → Không cần cronjob riêng.
  → File không bao giờ "leak" sang submissions/ vì chỉ được copy
    sau khi COMMIT transaction tạo submission thành công.
```

---

## 4. ERROR HANDLING — GRD_AI_001 Clarification

> **⚠️ Đây là điểm mâu thuẫn đã được giải quyết:** SPEC §9 định nghĩa `GRD_AI_001` là HTTP 503. PLAN cũ đặt nó trong Worker (async context — không thể trả HTTP response).

**Định nghĩa lại rõ ràng:**

| Context | Trigger | Xử lý |
|---------|---------|--------|
| **Synchronous (HTTP)** | `BullMQ.add()` throw khi Redis queue down/full tại thời điểm `POST /submissions/*` | Controller bắt exception → HTTP **503** `GRD_AI_001`: "AI System is busy." |
| **Asynchronous (Worker)** | Worker fail 3 lần retry sau khi job đã được enqueue thành công | **Không** trả HTTP. Thực hiện: `updateStatus('failed')` + `refundQuota()` + **WebSocket** `grading_failed` event → Client hiển thị thông báo "Chấm bài thất bại, quota đã được hoàn trả." |

---

## 5. IMPLEMENTATION DEPENDENCIES

**Thứ tự triển khai (phụ thuộc thứ tự):**

| Bước | Nội dung | Phụ thuộc |
|------|----------|-----------|
| 1 | DB Migration: Thêm `locked_by_tutor_id`, `locked_at` vào submission tables; thêm `ai_grading_quota_remaining` vào `users` | DB Schema v2 |
| 2 | Utilities: `StorageUtil`, `AudioValidationUtil` (magic bytes), `BandScoreUtil`, `AIResponseParser` | _(none)_ |
| 3 | `SubmissionQueries` + `FeedbackQueries` + `QuotaQueries` — raw SQL, transaction-aware | Bước 1 |
| 4 | `SubmissionService` (upload, submit với transaction, getPresignedUrl) | Bước 2, 3 |
| 5 | `checkAIQuota` middleware | Bước 3 |
| 6 | `AIGradingWorker` + BullMQ queue setup (với transaction trong worker) | Bước 2, 3, Redis |
| 7 | `LockReleaseWorker` (cron) | Bước 3 |
| 8 | `SubmissionController` + `TutorController` + Routes | Bước 4, 5 |
| 9 | S3 Lifecycle Rule cấu hình trên bucket (prefix `temp/`, expiry 1 day) | AWS Console / IaC |
| 10 | WebSocket integration (emit events từ Worker + Controller) | Bước 6, 8, Socket.io |
| 11 | Frontend: `AudioRecorder`, `WritingEditor`, `FeedbackReport` | Bước 8, 10 |
| 12 | Frontend: `TutorQueue`, `TutorGradingPanel`, `GradingSocketListener` | Bước 11 |

**External Dependencies:**

| Package | Mục Đích |
|---------|----------|
| `@aws-sdk/client-s3` | S3 file storage |
| `@aws-sdk/lib-storage` | Multipart upload streaming |
| `@aws-sdk/s3-request-presigner` | Tạo Presigned URL |
| `bullmq` | Message Queue (AI grading jobs) |
| `openai` | OpenAI SDK (Whisper STT + GPT-4o) |
| `multer` | Parse `multipart/form-data` cho audio upload |
| `node-cron` | Scheduler cho Lock Release Worker |
| `ioredis` | Redis connection (BullMQ + existing session cache) |
| `socket.io` | Realtime notification cho Student/Tutor |
| `file-type` | *(optional)* Helper đọc magic bytes nếu không tự implement |

---

## 6. DB MIGRATION PLAN

> Schema DB v2 cần bổ sung các cột sau. Tạo migration file: `migrations/002_subjective_grading.sql`.

```sql
-- Thêm cột tracking Tutor lock vào submission tables
ALTER TABLE writing_submissions
  ADD COLUMN locked_by_tutor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN locked_at TIMESTAMPTZ;

ALTER TABLE speaking_submissions
  ADD COLUMN locked_by_tutor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN locked_at TIMESTAMPTZ;

-- Thêm cột AI Quota cho users
ALTER TABLE users
  ADD COLUMN ai_grading_quota_remaining SMALLINT NOT NULL DEFAULT 10;

-- Index hỗ trợ Lock Release cron
CREATE INDEX idx_writing_locked_at ON writing_submissions(locked_at)
  WHERE status = 'in_progress';
CREATE INDEX idx_speaking_locked_at ON speaking_submissions(locked_at)
  WHERE status = 'in_progress';
```

> **Lưu ý:** View `v_tutor_grading_queue` hiện tại query `status='pending'`. Sau khi Tutor claim bài, status chuyển thành `'in_progress'`, bài đó tự động rời khỏi queue — logic đúng, không cần cập nhật view.

---

## 7. TECHNICAL RISKS & MITIGATION

| # | Risk | Xác Suất | Impact | Mitigation |
|---|------|----------|--------|------------|
| 1 | **OpenAI API Timeout/5xx** — Worker treo khi AI service chậm | Medium | High | BullMQ retry x3 với exponential backoff (1s/2s/4s). Timeout 60s per API call (SPEC §11). Sau 3 lần fail: refund quota + WebSocket notify |
| 2 | **Audio File Buffering vào RAM** — Server OOM khi nhiều upload đồng thời | Medium | High | Bắt buộc dùng `stream` mode. Multer `memoryStorage` bị cấm — dùng `diskStorage` với pipe thẳng sang S3 hoặc `PassThrough` stream |
| 3 | **Race Condition Tutor Claim** — 2 Tutors claim cùng 1 submission | High | High | Optimistic locking bằng `UPDATE ... WHERE status='pending' RETURNING id`. Chỉ 1 rowCount=1 thành công → Tutor còn lại nhận HTTP 409 `GRD_TUT_001` |
| 4 | **AI API Cost Abuse** — Student spam `response_text` dài 10,000 từ | Medium | Medium | Validate `maxLength: 5000` ký tự tại Service layer **trước khi enqueue**. Token count check trước khi gọi OpenAI nếu cần |
| 5 | **Orphaned Locked Submissions** — Tutor mất kết nối khi đang chấm | Medium | Medium | `LockReleaseWorker` cron mỗi 15 phút nhả TTL-expired locks. TTL configurable qua env `TUTOR_LOCK_TTL_MINUTES` |
| 6 | **IDOR via Presigned URL** — User A lấy được audio của User B bằng cách đoán s3Key | Medium | High | Presigned URL chỉ được tạo sau ownership check trong `getPresignedUrlForSubmission()`. `StorageUtil.generatePresignedUrl()` không public — không endpoint nào bypass được Service layer |
| 7 | **Data Inconsistency: status='ai_graded' nhưng không có report** | Low | High | `createAIFeedbackReport` và `updateSubmissionStatus('ai_graded')` bắt buộc trong cùng **một DB Transaction**. COMMIT fail → cả hai rollback → Worker retry |
| 8 | **AI Hallucination — LLM trả JSON sai format** | Medium | Medium | `AIResponseParser.parseGradingResponse()` validate toàn bộ schema bắt buộc. Thiếu field (VD: `fluency_score`) → throw `AIParseError` → BullMQ retry, **không crash worker process**. Sau 3 lần: `status='failed'`, quota refund |
| 9 | **File Validation Bypass — đổi đuôi .exe → .mp3** | Medium | High | `AudioValidationUtil.validateMagicBytes()` đọc **byte signature thực tế** của file (FF FB cho MP3, 52 49 46 46 cho WAV). MIME type do client khai báo trong header bị bỏ qua hoàn toàn |
| 10 | **Quota Race Condition — spam Submit 10 lần/giây với quota=1** | Medium | High | `decrementAIQuota(client)` + `createSubmission(client)` trong **cùng một Transaction với `SERIALIZABLE` isolation**. Concurrent transaction check quota: chỉ 1 rowCount=1 thành công, các transaction khác rollback |
| 11 | **S3 Orphaned Files** — Upload audio thành công, client rớt mạng trước khi submit | Low | Low | S3 Lifecycle Rule: prefix `temp/` tự động xóa sau 24h. File chỉ được move sang `submissions/` sau khi COMMIT transaction tạo submission thành công |
| 12 | **BullMQ Queue Backlog** — Nhiều submission AI cùng lúc | Low | Medium | `concurrency: 5`, rate limiter 10 jobs/phút. Monitor queue depth bằng BullMQ Dashboard/metrics |

---

## 8. OPEN QUESTIONS

| # | Câu Hỏi | Owner | Priority | Status |
|---|---------|-------|----------|--------|
| **Q1** | **[Audio Retention]** File audio của học viên giữ mãi hay xóa sau 6 tháng? Ảnh hưởng S3 lifecycle policy (prefix `submissions/`) | Tech Lead / Product | HIGH | Open |
| **Q2** | **[Tutor Lock TTL]** Tutor "ngâm" bài tối đa bao lâu trước khi hệ thống nhả bài? Đề xuất: **60 phút** | Tech Lead | HIGH | Open |
| **Q3** | **[AI Quota Default]** Mỗi Student được bao nhiêu AI Grading lượt/tháng? Đề xuất: **10 lượt** — reset ngày đầu tháng bằng cron | Product | HIGH | Open |
| **Q4** | **[Quota Reset]** Quota reset định kỳ (monthly) hay dùng mãi cho đến khi upgrade plan? | Product | Medium | Open |
| **Q5** | **[Whisper Fallback]** Nếu Whisper STT thất bại, hệ thống có cho phép GPT-4o chấm trực tiếp từ audio_url không, hay phải có transcript? | Tech Lead | Medium | Open |
| **Q6** | **[Prelim Check Cost]** `runPrelimCheck` gọi GPT-4o mỗi lần Tutor bấm nút — có giới hạn số lần gọi/submission không? | Tech Lead | Medium | Open |
| **Q7** | **[Audio Feedback Storage]** Tutor record audio feedback — upload lên S3 qua luồng nào? Đề xuất: dùng lại `POST /submissions/speaking/upload` với scope flag khác | Tech Lead | Low | Open |

---

## 9. DEFINITION OF DONE

Feature `feat-subjective-grading` được coi là **DONE** khi toàn bộ điều kiện sau được thỏa mãn:

- [ ] Migration `002_subjective_grading.sql` chạy thành công, không rollback lỗi
- [ ] **5 API endpoints** Student + **5 API endpoints** Tutor hoạt động đúng theo contract SPEC §6
- [ ] Upload audio `.mp3` hợp lệ (<50MB) → S3 key trả về, không buffer vào RAM server
- [ ] Upload file `.pdf` đổi đuôi thành `.mp3` → bị reject HTTP 400 `GRD_UPL_001` (magic bytes validation)
- [ ] `GET .../audio-url` của submission không thuộc về user → HTTP 403 (IDOR guard hoạt động)
- [ ] Submit với `grader='ai'` → AI Worker nhận job, chấm xong trong ≤3 phút, Student nhận WebSocket notification
- [ ] `createAIFeedbackReport` + `updateSubmissionStatus('ai_graded')` trong cùng transaction: test rollback khi COMMIT fail → không tồn tại "status=ai_graded không có report"
- [ ] `BandScoreUtil.roundToIELTSBand(6.25) === 6.5` và `roundToIELTSBand(6.124) === 6.0` — Unit test pass
- [ ] `AIResponseParser.parseGradingResponse()` với JSON thiếu `fluency_score` → throw `AIParseError` — Unit test pass
- [ ] 2 Tutor cùng claim 1 submission → Tutor 1 `200 OK`, Tutor 2 `409 GRD_TUT_001` — Integration test pass
- [ ] AI job fail 3 lần → `status='failed'`, quota được hoàn trả, WebSocket `grading_failed` bắn — Integration test với Mock OpenAI
- [ ] Spam 10 request submit đồng thời với quota=1 → chỉ 1 submission được tạo, 9 request còn lại nhận HTTP 403 — Concurrency test
- [ ] Stress test: 50 request đồng thời gọi `POST .../claim` cùng 1 `submission_id` → chỉ 1 thành công
- [ ] `LockReleaseWorker` nhả bài đúng sau TTL — unit test với giả lập thời gian
- [ ] S3 Lifecycle Rule cấu hình đúng: object trong prefix `temp/` expire sau 24h
- [ ] Test coverage Service layer ≥ **80%** (AGENTS.md §3)
- [ ] Không có SQL template literal — chỉ dùng `$1, $2` parameterized queries
- [ ] Không có `console.log` hay stack trace trong production response
- [ ] Tất cả file audio truy cập qua Presigned URL, S3 Bucket cấu hình **private**
- [ ] Error codes `GRD_UPL_001`, `GRD_UPL_002`, `GRD_AI_001` (HTTP), `GRD_TUT_001` trả về đúng theo Error Matrix SPEC §9
- [ ] Code review bởi ít nhất 1 member khác trước khi merge vào `main`
Review xem PLAN.md đã ổn chưa