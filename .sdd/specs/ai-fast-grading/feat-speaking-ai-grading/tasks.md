---
description: "Công việc cho module chấm nhanh Speaking bằng AI"
---

# Công việc: Chấm nhanh Speaking bằng AI

## Định dạng

`- [ ] T### [P?] [US#?] Mô tả có đường dẫn file chính xác`

- `[x]`: đã có trong code hiện tại và đã được đối chiếu.
- `[ ]`: còn mở; không được coi là production-ready.
- `[P]`: có thể thực hiện song song khi không sửa cùng file.

## Giai đoạn 1: Nền tảng database, storage và queue

- [x] T001 Tạo schema prerequisite/hardening cho private audio, `ai_grading_jobs`, report fields và `grading_failed` tại `backend/src/db/migrations/008a_bootstrap_missing_prerequisites.sql` và `backend/src/db/migrations/025_harden_ai_grading_schema.sql`.
- [x] T002 [P] Tạo artifact schema/index/fencing và retry artifact theo job tại `backend/src/db/migrations/026_create_speaking_analysis_artifacts.sql` và `backend/src/db/migrations/030_retry_speaking_artifacts_by_job.sql`.
- [x] T003 [P] Tạo queue queries cho enqueue, `SKIP LOCKED`, heartbeat CAS, finalization và retry chain tại `backend/src/db/queries/aiGradingJobs.queries.js` cùng unit test tương ứng.
- [x] T004 [P] Tạo immutable artifact queries và projection allowlist tại `backend/src/db/queries/speakingAnalysis.queries.js` cùng unit test tương ứng.
- [x] T005 [P] Tạo AEAD upload token và private storage adapters tại `backend/src/security/audioUploadToken.js`, `backend/src/storage/objectStorage.adapter.js`, `backend/src/storage/supabaseObjectStorage.adapter.js` và `backend/src/storage/s3ObjectStorage.adapter.js`.
- [x] T006 Tích hợp quota/replay/fingerprint dùng advisory lock tại `backend/src/services/aiQuota.service.js` và `backend/src/services/speakingSubmission.service.js`.

## Giai đoạn 2: Câu chuyện người dùng 1 — Upload và enqueue (P1) 🎯 MVP

- [x] T007 [US1] Tạo signed upload, token verification, object preflight, exact Part validation và official prompt resolution tại `backend/src/services/speakingSubmission.service.js`.
- [x] T008 [US1] Tạo atomically ba submission + root job và response 202 tại `backend/src/controllers/speakingGrading.controller.js`, `backend/src/services/speakingSubmission.service.js` và `backend/src/routes/api/v1/submissions.routes.js`.
- [x] T009 [P] [US1] Tạo direct PUT client, hash/size/duration/MIME metadata và idempotency persistence tại `frontend/src/services/grading.service.js`, `frontend/src/components/grading/ExamRecorder.jsx` và `frontend/src/components/grading/AudioRecorder.jsx`.
- [x] T010 [US1] Kết nối full-submit ba Part và double-submit guard tại `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx` và `frontend/src/components/grading/SpeakingSummaryScreen.jsx`.
- [x] T011 [P] [US1] Khóa contract cho upload/submit/auth/replay bằng `backend/tests/contract/speakingGrading.contract.test.js` và `backend/tests/unit/services/speakingSubmission.service.test.js`.

## Giai đoạn 3: Câu chuyện người dùng 2 — Status, retry và recovery (P1)

- [x] T012 [US2] Tạo status API canonical, owner/assignment authorization và learner redaction tại `backend/src/services/speakingSubmission.service.js`.
- [x] T013 [P] [US2] Tạo polling backoff, terminal stop và refresh recovery tại `frontend/src/hooks/useSpeakingGrading.js` cùng `frontend/tests/hooks/useSpeakingGrading.test.js`.
- [x] T014 [US2] Tạo worker claim/lease/heartbeat/process entrypoint tại `backend/src/jobs/aiGrading.worker.js` và `backend/src/worker.js`.
- [x] T015 [US2] Tạo watchdog CAS, backoff/jitter và terminal recovery tại `backend/src/jobs/aiGrading.watchdog.js` cùng unit test.
- [x] T016 [US2] Tạo idempotent manual child retry và canonical chain tại `backend/src/services/speakingGradingRetry.service.js`, `backend/src/controllers/speakingGrading.controller.js` và `backend/src/db/queries/aiGradingJobs.queries.js`.
- [x] T017 [US2] Bảo toàn lỗi provider 429/5xx/timeout và `retryable` xuyên `backend/src/services/ai.service.js`, `backend/src/ai/grading.service.js`, `backend/src/jobs/aiGrading.worker.js`; thêm adapter→gateway→worker tests và tôn trọng `Retry-After` trong giới hạn 3600 giây.
- [x] T018 [P] [US2] Sửa thông điệp lỗi/thiếu evidence để khẳng định retry/failed, không tự chuyển tutor; chỉ hiện “Chấm lại” khi `failed + can_retry=true` tại learner Speaking UI và regression test liên quan.

## Giai đoạn 4: Câu chuyện người dùng 3 — Evidence và scoring (P1)

- [x] T019 [P] [US3] Tạo media validator/normalizer an toàn tại `backend/src/media/audioNormalizer.service.js` cùng unit test.
- [x] T020 [P] [US3] Tạo transcriber, speech-evidence và scorer adapters tại `backend/src/ai/transcriber.adapter.js`, `backend/src/ai/speechEvidence.adapter.js` và `backend/src/ai/speakingRubricScorer.adapter.js`.
- [x] T021 [US3] Điều phối evidence từng Part và fenced terminal artifact tại `backend/src/services/speakingEvidence.service.js`.
- [x] T022 [US3] Validate `full_audio`, bốn criterion band, nullability và Overall decimal half-up tại `backend/src/ai/speakingResult.validator.js`.
- [x] T023 [US3] Finalize allowlisted report/group/job, bỏ provider Overall/raw reliability và không handoff tutor tại `backend/src/services/speakingGrading.service.js`.
- [x] T024 [US3] Kết nối worker với estimate gate, scorer và full-audio semantics tại `backend/src/jobs/aiGrading.worker.js`.
- [x] T025 [P] [US3] Chỉ render completed/full-audio public result tại `frontend/src/components/grading/FeedbackReport.jsx` và `frontend/src/components/grading/AiFeedbackPanel.jsx`.
- [ ] T026 [US3] Hoàn thiện calibrated branch để thực sự áp dụng mapping/threshold/reliability từ bundle tại `backend/src/jobs/aiGrading.worker.js`, `backend/src/ai/speakingRubricScorer.adapter.js`; thêm tests bundle binding/output và giữ `AI_SPEAKING_PUBLISH_BANDS=false` tới khi đạt.
- [ ] T027 [US3] Xây dựng L2 English audio gold set, transcript thủ công và fidelity/abstain policy; thực thi gate ở `backend/src/ai/transcriber.adapter.js`, `backend/src/ai/speakingRubricScorer.adapter.js` và `backend/src/ai/speakingResult.validator.js`.
- [ ] T028 [US3] Nâng structured words/segments/timestamp/uncertainty trong `backend/src/ai/transcriber.adapter.js` nếu T027 chứng minh cần; pin model transcription production, không dùng alias `latest`.
- [ ] T029 [US3] Chỉ thêm bounded parallelism/chunk/deduplicate/rebase timestamp trong `backend/src/jobs/aiGrading.worker.js` và media/evidence adapters nếu load test hoặc provider limit chứng minh cần.

## Giai đoạn 5: Câu chuyện người dùng 4 — Tutor authorization và prelim (P2)

- [x] T030 [US4] Tạo atomic group claim và assignment-scoped queries tại `backend/src/services/tutor.service.js` và `backend/src/db/queries/grading.queries.js`.
- [x] T031 [US4] Giới hạn signed audio cho owner/assigned tutor/admin tại `backend/src/controllers/submission.controller.js` và `backend/src/services/submission.service.js`.
- [x] T032 [US4] Tạo non-persisted AI prelim bốn tiêu chí tại `backend/src/services/speakingTutorPrelim.service.js` và route/controller tutor hiện có.
- [x] T033 [P] [US4] Tạo claim-before-navigation và signed-audio on demand tại `frontend/src/pages/grading/TutorQueuePage.jsx`, `frontend/src/pages/grading/TutorGradingPage.jsx` và `frontend/src/services/grading.service.js`.
- [ ] T034 [US4] Truyền requester `req.user` vào `TutorService.getSubmissionDetail()`, chuẩn hóa `meta` object và thêm assigned/other/admin HTTP tests tại `backend/src/controllers/tutor.controller.js`, `backend/src/services/tutor.service.js` và tests controller/integration liên quan.

## Giai đoạn 6: Cổng phát hành và vận hành

- [x] T035 [P] Tạo cleanup reconciler và safe metrics tại `backend/src/jobs/audioUploadCleanup.job.js`, `backend/src/services/aiUsage.service.js` và unit tests tương ứng.
- [x] T036 [P] Validate machine-readable contract tại `backend/tests/contract/speakingGradingOpenApi.test.js` dựa trên `.sdd/specs/ai-fast-grading/feat-speaking-ai-grading/contracts/speaking-grading.openapi.yaml`.
- [ ] T037 Chạy fresh/legacy migration, concurrency và backup/restore rehearsal trên PostgreSQL disposable/staging; lưu log/checksum không secret cho migrations `008a`, `025`, `026`, `030`.
- [ ] T038 [P] Đo coverage logic Speaking mới và đặt CI gate tối thiểu 80% trong cấu hình test của `backend/package.json`/`frontend/package.json`.
- [ ] T039 Chạy load/chaos staging ở 30 enqueue/phút, ≥10 job đồng thời và 2× forecast; xác nhận enqueue p95 <500 ms, queue/watchdog phục hồi.
- [ ] T040 Hoàn tất approval/RFC cho provider, private storage, audio format, retention/KMS, calibration/fairness và forecast/cost; đồng bộ constitution mirrors nếu cần.
- [ ] T041 [P] Tách các component Speaking/Feedback liên quan còn vượt giới hạn kích thước Constitution và chạy lại build/regression tại `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`, `frontend/src/components/grading/FeedbackReport.jsx`.
- [ ] T042 [US3] Chạy smoke provider thật bằng ba audio private và lưu bằng chứng `queued → running → completed/full_audio`, transcript, bốn band và Overall mà không chứa secret.
- [ ] T043 Chạy toàn bộ targeted unit/integration/contract/frontend/build/lint sau T017–T042 và cập nhật trạng thái release trong module này.

## Giai đoạn 7: Hardening runtime/deployment Speaking (hotfix độc lập calibration)

- [x] T044 Cài `ffmpeg`/`ffprobe` trong backend image và thêm `speaking-worker` dùng chung image, không expose port tại `backend/Dockerfile.backend` và `docker-compose.prod.yml`.
- [x] T045 Sắp xếp deploy fail-fast theo compose validation/build/preflight/migrate/up/runtime-check, không baseline và không in env tại `.github/workflows/deploy.yml`.
- [x] T046 Tạo runtime checker allowlist cho flag/storage/model/media/migrations/index/job status tại `backend/scripts/check-speaking-runtime.js` cùng static/unit tests.
- [x] T047 Sửa public transcript/Part mapping, terminal stage, signed-audio error/reload, retry polling canonical child và learner disclaimer tại backend/frontend cùng tests.
- [x] T048 Tạo runbook merge-to-VPS, smoke provider thật và rollback không phá DB tại `docs/speaking-ai-vps-deployment.md`.

## Phụ thuộc và thứ tự

1. T017 và T018 có thể xử lý độc lập; T026 phụ thuộc gold-set/policy ở T027 để được gọi là calibrated.
2. T028/T029 là conditional tasks, chỉ triển khai khi evidence từ T027/T039 yêu cầu.
3. T037–T042 là release gates; automated mock test không thay thế provider smoke hoặc approval.
4. T044–T048 là hotfix runtime độc lập với calibrated gates T026–T029; T043 chỉ được đóng sau khi toàn bộ release gates trong phạm vi của nó thực sự hoàn tất.

## Ma trận truy vết

| User story | Yêu cầu | Tasks |
|---|---|---|
| US1 | SFR-001–SFR-007 | T005–T011 |
| US2 | SFR-008, SFR-014–SFR-015 | T012–T018 |
| US3 | SFR-009–SFR-016, SFR-019–SFR-020 | T019–T029, T036–T043 |
| US4 | SFR-017–SFR-018 | T030–T034 |
