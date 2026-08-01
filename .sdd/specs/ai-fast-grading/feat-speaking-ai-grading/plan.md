# Kế hoạch triển khai: Chấm nhanh Speaking bằng AI

**Đặc tả**: [spec.md](./spec.md)  
**Công việc**: [tasks.md](./tasks.md)  
**Checklist chất lượng**: [checklist.md](./checklist.md)  
**Machine-readable contract**: [contracts/speaking-grading.openapi.yaml](./contracts/speaking-grading.openapi.yaml)

## Tóm tắt

Giữ modular monolith nhưng tách API process và worker process từ cùng backend package. API chịu trách nhiệm signed upload, validation, idempotency/quota và enqueue atomically; worker claim PostgreSQL job bằng lease/fencing, tạo evidence từng Part, chấm đủ bốn tiêu chí, finalize report hoặc retry/failed. Frontend poll canonical status và chỉ render public `full_audio` result.

## Bối cảnh kỹ thuật

- **Backend**: Node.js 20, Express 5, CommonJS, PostgreSQL `pg`.
- **Worker**: `backend/src/worker.js`, job queue trong PostgreSQL, không thêm broker.
- **Storage**: adapter private object storage cho Supabase/S3/fake.
- **Media**: `ffmpeg`/`ffprobe` validate và normalize bằng spawn args an toàn.
- **AI**: gateway chung; transcriber, speech-evidence và rubric scorer adapters.
- **Frontend**: React 18/Vite, direct PUT signed URL, polling hook.
- **Kiểm thử**: Jest/Supertest, OpenAPI contract test, Vitest/Testing Library.

## Kiểm tra Constitution

- Identity/role chỉ lấy từ middleware; SQL tham số hóa và transaction ngắn.
- Provider call, storage download và media processing đều ngoài DB transaction.
- Audio/transcript/signed URL không xuất hiện trong log; diagnostic được sanitize.
- AI output phải validate/allowlist trước report write.
- Automated tests dùng fake storage/provider; smoke thật là release evidence riêng.

## Kiến trúc và luồng code hiện tại *(as-built)*

```text
SpeakingTestPage / ExamRecorder
  → POST /speaking/audio-uploads × 3
  ← signed upload URL + bound upload token
  → direct PUT private object storage × 3
  → POST /speaking/full + Idempotency-Key
  → SpeakingSubmissionService
      1. validate exact Part set/tokens
      2. replay lookup; preflight object metadata
      3. transaction: lock objects, resolve prompts, reserve quota/job,
         insert 3 speaking_submissions
  ← HTTP 202 + status_url + Retry-After
  → useSpeakingGrading polls canonical status

AiGradingWorker
  → claimNextJob(submission_type='speaking') with SKIP LOCKED + lease generation
  → load exactly 3 parts
  → validate/download/normalize/transcribe/analyze each Part
  → persist fenced speaking_analysis_artifacts
  → load estimate/calibration gate
  → rubric scorer with transcript + audio evidence
  → SpeakingGradingService validates and persists completed report
  → update group ai_graded
  └─ error → retry_wait or failed/grading_failed; never tutor handoff
```

## Hợp đồng API

| Method | Path | Vai trò | Kết quả |
|---|---|---|---|
| `POST` | `/api/v1/submissions/speaking/audio-uploads` | student | Signed upload URL/token ràng buộc metadata |
| `POST` | `/api/v1/submissions/speaking/full` | student | `202`, group/job/status URL cho AI; `201` cho tutor path hợp lệ |
| `GET` | `/api/v1/submissions/speaking/:groupId/grading-status` | owner/assigned tutor/admin | Canonical status/stage/result đã redact |
| `POST` | `/api/v1/submissions/speaking/:groupId/retry-grading` | owner student | Idempotent manual child retry |
| `GET` | `/api/v1/submissions/:partId/audio-url?type=speaking` | owner/assigned tutor/admin | Signed download URL on demand |
| `POST` | `/api/v1/tutors/submissions/speaking/:groupId/claim` | tutor | Atomic group claim |
| `POST` | `/api/v1/tutors/submissions/speaking/:submissionId/ai-prelim` | assigned tutor/admin | Bản nháp không persist |

`POST /speaking` và `/speaking/upload` là legacy; khi async grading bật, entry point AI cũ trả 410 hoặc yêu cầu `/speaking/full`.

## Mô hình dữ liệu

### Bảng tái sử dụng

- `speaking_submissions`: ba Part/group, owner, prompt snapshot, private object metadata, grader/status/assignment/soft-delete.
- `ai_grading_reports`: report toàn group gắn `grading_job_id`, evidence mode, pipeline/calibration version và public result allowlist.
- `ai_usage_logs`: metrics provider/stage/token/latency và diagnostic đã sanitize.
- `tutor_feedback_reports`: báo cáo cuối của tutor, soft-delete.

### Bảng dành cho pipeline

- `ai_grading_jobs`: root/child chain, idempotency, fingerprint, quota identity, stage/status, attempt budget, lease owner/expiry/generation và config digests.
- `speaking_analysis_artifacts`: artifact theo Part/job/config; output terminal và write bị fencing.

Không tạo bảng assignment hoặc review mới; assignment vẫn nằm trên `speaking_submissions`.

## State machine

```text
queued → running → completed
             ├── retry_wait → running
             └── failed

completed  → speaking group: ai_graded
failed     → speaking group: grading_failed
needs_review → chỉ đọc tương thích dữ liệu cũ; learner flow mới không tạo
```

Stages: `queued → validating_audio → analyzing → scoring → calibrating → finalizing`.

Automatic retry chỉ áp dụng lỗi retryable khi còn `max_attempts`. Manual retry tạo tối đa child theo limit cấu hình và canonical status luôn lấy job cuối của chain.

## Evidence và scoring

1. Verify object bytes, checksum, codec, duration, decode và speech presence.
2. Lưu ASR output; display transcript không được sửa rồi quay lại làm evidence.
3. Tạo audio/timing evidence theo Part.
4. Chỉ score khi cả ba artifact `complete`.
5. Validate bốn criterion band theo bước 0.5; bỏ Overall/reliability thô từ provider.
6. Tính Overall bằng trung bình đều và decimal half-up.
7. Estimate branch dùng disclaimer/version riêng; calibrated branch phải thực sự áp dụng mapping/threshold/reliability từ bundle.

## Bảo mật và quyền riêng tư

- Object key theo `quarantine/speaking/{userId}/...`; token AEAD có expiry và metadata binding.
- Signed URL chỉ tạo on demand; database giữ storage key, không giữ URL tạm.
- Owner nghe audio của mình; tutor chỉ nghe sau atomic group assignment; admin theo scope/audit.
- Cleanup chỉ xóa object quá hạn sau DB cross-check.
- Log không chứa audio, transcript, prompt thô, signed URL hoặc secret.

## Cấu trúc mã nguồn liên quan

```text
backend/src/
├── controllers/speakingGrading.controller.js
├── routes/api/v1/submissions.routes.js
├── services/
│   ├── speakingSubmission.service.js
│   ├── speakingEvidence.service.js
│   ├── speakingGrading.service.js
│   ├── speakingGradingRetry.service.js
│   └── speakingTutorPrelim.service.js
├── jobs/
│   ├── aiGrading.worker.js
│   ├── aiGrading.watchdog.js
│   └── audioUploadCleanup.job.js
├── ai/
│   ├── grading.service.js
│   ├── transcriber.adapter.js
│   ├── speechEvidence.adapter.js
│   ├── speakingRubricScorer.adapter.js
│   ├── speakingResult.validator.js
│   └── calibration/
├── storage/
├── media/audioNormalizer.service.js
└── db/
    ├── queries/aiGradingJobs.queries.js
    ├── queries/speakingAnalysis.queries.js
    └── migrations/{025,026,030}_*.sql

frontend/src/
├── pages/subjective-testing/SpeakingTestPage.jsx
├── components/grading/{ExamRecorder,SpeakingSummaryScreen,FeedbackReport}.jsx
├── hooks/useSpeakingGrading.js
└── services/grading.service.js
```

## Chiến lược kiểm thử

- Unit: token/storage/media, quota, queries, evidence, scorer, validator, worker, watchdog, retry và tutor prelim.
- Contract: route/envelope/auth/state plus OpenAPI reference/examples.
- Integration: schema on disposable DB, submit/replay/concurrency, retry chain, tutor authorization.
- Frontend: signed PUT, exact Part set, double submit, polling/refresh/terminal, retry messaging và result rendering.
- Release: migration rehearsal, coverage, load/chaos, provider smoke ba Part và approvals.

## Khoảng trống và release gates còn mở

1. Chưa có fresh/legacy migration rehearsal, backup/restore evidence, coverage gate và load/chaos staging.
2. Provider/storage/audio/retention/KMS/calibration/fairness/cost approvals chưa đầy đủ.
3. Provider smoke thật đủ ba Part chưa có bằng chứng lặp lại cho môi trường phát hành.
4. Transcriber hiện có thể chỉ trả plain transcript; structured timestamp/uncertainty chỉ triển khai khi gold-set/policy yêu cầu.
5. Calibration bundle hiện chưa thực sự thay đổi scorer output; `AI_SPEAKING_PUBLISH_BANDS` phải giữ `false`.
6. Provider 5xx có nguy cơ mất phân loại retryable khi đi qua gateway.
7. Tutor detail requester context và learner error wording còn regression mở.

## Quyết định artifact

Module giữ bốn artifact lõi `spec.md`, `plan.md`, `tasks.md`, `checklist.md`. OpenAPI YAML được giữ như artifact tùy chọn vì là hợp đồng máy đọc và đang được contract test thực thi; tài liệu prose contract, research, data model và quickstart được hợp nhất vào plan/tasks.
