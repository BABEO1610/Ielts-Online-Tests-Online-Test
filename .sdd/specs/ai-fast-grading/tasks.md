---
description: "Danh sách công việc triển khai production-safe cho AI Writing và Speaking grading"
---

# Công việc: Chấm nhanh Writing và Speaking bằng AI

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [research.md](./research.md), [hợp đồng API](./contracts/speaking-grading-api.md) và [OpenAPI](./contracts/speaking-grading.openapi.yaml).

**Kiểm thử**: Bắt buộc. Không gọi provider thật và không chạy migration test trên database lấy từ `.env`; database integration phải là PostgreSQL disposable.

**Nguyên tắc phát hành**: Foundation fail-closed toàn phiên được triển khai. `AI Estimated Band` chỉ xuất hiện khi đủ transcript + audio evidence cho bốn tiêu chí; transcript-only không bao giờ sinh Pronunciation/Overall. Calibration/approval vẫn chặn nhãn đã hiệu chuẩn, không tự chuyển bài AI sang tutor.

## Định dạng

- `[P]`: Có thể làm song song vì khác file và không phụ thuộc trực tiếp.
- `[USn]`: Liên kết câu chuyện người dùng trong `spec.md`.
- Mỗi task có đường dẫn chính xác và chỉ được đánh dấu `[x]` sau khi có bằng chứng kiểm tra.

## Giai đoạn 1: Setup và an toàn môi trường

**Mục đích**: Chặn thao tác nguy hiểm, cố định cấu hình và chuẩn bị process worker trước khi thay đổi runtime.

- [x] T001 Đồng bộ trạng thái triển khai và release gate trong `.sdd/specs/ai-fast-grading/spec.md`, `.sdd/specs/ai-fast-grading/plan.md`, `.sdd/specs/ai-fast-grading/research.md`, `.sdd/specs/ai-fast-grading/contracts/` và `.sdd/specs/ai-fast-grading/quickstart.md`.
- [x] T002 [P] Thêm cấu hình feature flag, idempotency TTL, storage/provider/model pin và fail-closed defaults tại `backend/src/config/aiGrading.config.js` cùng biến mẫu không chứa secret trong `backend/.env.example`.
- [x] T003 [P] Bổ sung script `worker`, dependency runtime thực sự cần và dependency lint còn thiếu trong `backend/package.json`/`backend/package-lock.json`; không đưa API key vào source.
- [x] T004 Harden migration runner bằng history/checksum/advisory lock/non-zero exit và cơ chế baseline có xác nhận tại `backend/scripts/migrate.js`, `backend/scripts/baseline-migrations.js` cùng test `backend/tests/unit/scripts/migrate.test.js`.
- [x] T005 Thêm guard để test phá dữ liệu chỉ chạy khi có database disposable được xác nhận tại `backend/tests/helpers/requireDisposableDatabase.js` và các test migration hiện có dưới `backend/tests/unit/migrations/`.

---

## Giai đoạn 2: Nền tảng database, queue và privacy

**Mục đích**: Hoàn thành phần chặn chung cho mọi câu chuyện người dùng mà không thêm bảng thừa.

- [x] T006 Tạo migration prerequisite idempotent để fresh database có enum/table cần đúng thứ tự tại `backend/src/db/migrations/008a_bootstrap_missing_prerequisites.sql`.
- [x] T007 Tạo migration hardening gồm `grading_failed`, private-audio metadata, `ai_grading_jobs`, report/job/review fields, tutor soft-delete và index/constraint an toàn tại `backend/src/db/migrations/025_harden_ai_grading_schema.sql`.
- [x] T008 Tạo đúng bảng feature mới thứ hai và các index/terminal constraints tại `backend/src/db/migrations/026_create_speaking_analysis_artifacts.sql`; không tạo synthetic artifact từ transcript legacy.
- [x] T009 [P] Viết static schema/SQL contract test cho T006–T008 tại `backend/tests/unit/db/aiGradingMigrations.test.js` và integration schema test chỉ nhận DB disposable tại `backend/tests/integration/db/aiGrading.schema.test.js`.
- [x] T010 [P] Viết query queue có enqueue/idempotency lookup, `SKIP LOCKED`, heartbeat CAS, retry/finalization và canonical chain tại `backend/src/db/queries/aiGradingJobs.queries.js` cùng unit test `backend/tests/unit/db/aiGradingJobs.queries.test.js`.
- [x] T011 [P] Viết query artifact immutable/cache-by-digest và report projection allowlist tại `backend/src/db/queries/speakingAnalysis.queries.js` cùng unit test `backend/tests/unit/db/speakingAnalysis.queries.test.js`.
- [x] T012 [P] Tạo application upload token AEAD có version/`kid`, expiry và metadata binding tại `backend/src/security/audioUploadToken.js` cùng unit test `backend/tests/unit/security/audioUploadToken.test.js`.
- [x] T013 [P] Tạo private object-storage adapter cho signed upload/stat/download, không trả public URL và có fake adapter cho test tại `backend/src/storage/objectStorage.adapter.js`, `backend/src/storage/supabaseObjectStorage.adapter.js`, `backend/src/storage/s3ObjectStorage.adapter.js` và `backend/tests/unit/storage/objectStorage.adapter.test.js`.
- [x] T014 Tạo quota service dùng PostgreSQL advisory lock, replay/fingerprint trước phép đếm và không tính retry tại `backend/src/services/aiQuota.service.js` cùng unit test `backend/tests/unit/services/aiQuota.service.test.js`.

**Điểm kiểm tra**: Chỉ có hai bảng feature mới (`ai_grading_jobs`, `speaking_analysis_artifacts`); `ai_usage_logs`, group, assignment và tutor report được tái sử dụng.

---

## Giai đoạn 3: Câu chuyện người dùng 1 — Giữ ổn định Writing (P1)

**Mục tiêu**: Không làm hồi quy Writing và đưa entrypoint Writing vào cùng rule quota/idempotency tối thiểu trước khi tuyên bố quota dùng chung.

**Kiểm thử độc lập**: Mock AI, kiểm Task 1/2, ngưỡng 50/100, cache, lỗi và band 33%/67% mà không gọi Internet.

- [x] T015 [P] [US1] Viết regression test cho threshold, response envelope, cache và band tổng hợp tại `backend/tests/integration/submissions/writingAiGrading.test.js`.
- [x] T016 [US1] Dùng chung word-threshold validator và sanitizer ở mọi Writing entrypoint tại `backend/src/ai/grading.validator.js`, `backend/src/controllers/aiGrading.controller.js` và `backend/src/services/submission.service.js`.
- [x] T017 [US1] Tích hợp quota advisory-lock convention cho original Writing group tại `backend/src/services/aiQuota.service.js` và `backend/src/services/submission.service.js`, giữ retry/replay không tính thêm.
- [x] T018 [US1] Chuẩn hóa kết quả mới/cache và lỗi Writing về `{ success, data, error, meta }` tại `backend/src/controllers/aiGrading.controller.js` và `backend/src/middleware/errorHandler.js`.

**Điểm kiểm tra**: Writing regression test đạt trước khi bật route Speaking async.

---

## Giai đoạn 4: Câu chuyện người dùng 2 — Private upload và enqueue Speaking (P1)

**Mục tiêu**: Học viên upload riêng tư ba Part, submit idempotent và nhận `202` ngay.

**Kiểm thử độc lập**: Mock storage/DB; tạo ba signed upload, submit đúng `{1,2,3}`, kiểm replay/conflict/quota/owner và status sau refresh.

- [x] T019 [P] [US2] Viết contract test trước cho signed upload, async submit và status auth tại `backend/tests/contract/speakingGrading.contract.test.js`.
- [x] T020 [P] [US2] Viết service test trước cho prompt resolution, token expiry, exact Part set, fingerprint và concurrent replay tại `backend/tests/unit/services/speakingSubmission.service.test.js`.
- [x] T021 [US2] Tạo service resolve đề chính thức, storage stat ngoài transaction và transaction insert ba submission + root job tại `backend/src/services/speakingSubmission.service.js`.
- [x] T022 [US2] Tạo controller mỏng cho audio upload, full submit và status tại `backend/src/controllers/speakingGrading.controller.js` và mount route authenticated/role-scoped trong `backend/src/routes/api/v1/submissions.routes.js`.
- [x] T023 [US2] Giữ nhánh tutor/legacy tương thích sau feature flag nhưng chặn writer AI đồng bộ cũ cho cohort async tại `backend/src/controllers/submission.controller.js` và `backend/src/services/submission.service.js`.
- [x] T024 [P] [US2] Thêm client signed upload/direct PUT/submit/status với snake_case normalization và idempotency-key persistence tại `frontend/src/services/grading.service.js`.
- [x] T025 [P] [US2] Sửa recorder để chọn đúng MIME được phép, tính SHA-256/size/duration, không upload lúc cleanup và không giả đuôi file tại `frontend/src/components/grading/ExamRecorder.jsx` và `frontend/src/components/grading/AudioRecorder.jsx`.
- [x] T026 [US2] Sửa `SpeakingTestPage`/summary để giữ `prompt_id`, đợi đủ ba upload token, xử lý `202`, persist group ID và không bỏ response tại `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx` cùng `frontend/src/components/grading/SpeakingSummaryScreen.jsx`.
- [x] T027 [US2] Thêm hook polling có backoff, hủy khi unmount/terminal và khôi phục sau refresh tại `frontend/src/hooks/useSpeakingGrading.js` cùng test `frontend/tests/hooks/useSpeakingGrading.test.js`.
- [x] T028 [US2] Thêm test frontend cho signed upload, MIME, double-submit, incomplete Part và async state tại `frontend/tests/services/grading.service.test.js` và `frontend/tests/pages/subjective-testing/SpeakingTestPage.test.jsx`.

**Điểm kiểm tra**: Request AI mới không giữ DB client hoặc chờ provider; direct upload không gửi cookie/API credential tới storage host.

---

## Giai đoạn 5: Câu chuyện người dùng 3 — Evidence pipeline và fail-closed scoring (P1)

**Mục tiêu**: Worker tạo evidence có phiên bản; chỉ full audio evidence mới có đủ bốn band, còn thiếu evidence đi theo retry/failed và không handoff tutor.

**Kiểm thử độc lập**: Mock media/STT/speech/calibration cho ba mode và xác minh transcript-only/partial không thể sinh Overall.

- [x] T029 [P] [US3] Tạo structured transcriber và speech-evidence interfaces do `grading.service.js` điều phối tại `backend/src/ai/transcriber.adapter.js`, `backend/src/ai/speechEvidence.adapter.js` và sửa `backend/src/ai/grading.service.js`.
- [x] T030 [P] [US3] Tạo media validator/normalizer dùng spawn args an toàn, timeout/resource limit và workspace cleanup tại `backend/src/media/audioNormalizer.service.js` cùng unit test `backend/tests/unit/media/audioNormalizer.service.test.js`.
- [x] T031 [P] [US3] Tạo schema/loader cho immutable signed scoring-config và calibration bundle, mặc định không bundle thì fail closed tại `backend/src/ai/calibration/calibration-bundle.schema.json`, `backend/src/ai/calibration/calibration.loader.js` và `backend/tests/unit/ai/calibration.loader.test.js`.
- [x] T032 [US3] Tạo evidence orchestration theo từng Part và lưu artifact terminal có fencing tại `backend/src/services/speakingEvidence.service.js` cùng unit test `backend/tests/unit/services/speakingEvidence.service.test.js`.
- [x] T033 [US3] Tạo validator/result builder cho `full_audio`, `partial_audio`, `transcript_only`, criterion nullable và decimal half-up tại `backend/src/ai/speakingResult.validator.js` cùng unit test `backend/tests/unit/ai/speakingResult.validator.test.js`.
- [x] T034 [US3] Tạo report finalizer allowlist, bỏ provider Overall/raw reliability, transaction `completed|failed` và reader/finalizer `needs_review` chỉ để tương thích legacy tại `backend/src/services/speakingGrading.service.js` cùng unit test.
- [x] T035 [US3] Tạo worker claim/heartbeat/process/finalize và process entrypoint riêng tại `backend/src/jobs/aiGrading.worker.js`, `backend/src/worker.js`; mọi provider call chạy ngoài transaction.
- [x] T036 [US3] Thêm test worker nhiều generation, full-audio/failed mới, evidence mode legacy ở validator, ASR/display separation và không sửa grammar tại các unit test AI/worker.
- [x] T037 [US3] Cập nhật learner feedback adapter chỉ render `completed/full_audio`, không dùng raw response và không tự tính band từ null tại `frontend/src/components/grading/FeedbackReport.jsx`, `frontend/src/components/grading/AiFeedbackPanel.jsx` cùng test `frontend/tests/components/grading/FeedbackReport.speakingAsync.test.jsx`.

**Điểm kiểm tra lịch sử**: Foundation ban đầu kiểm `needs_review`; hành vi này được T060–T066 thay thế bằng `AI Estimated Band` đủ bốn tiêu chí hoặc retry/failed. Không tạo điểm Pronunciation từ transcript-only.

---

## Giai đoạn 6: Câu chuyện người dùng 4 — Retry, watchdog và trạng thái (P2)

**Mục tiêu**: Job không kẹt, retry đúng loại lỗi và tổng chain không quá ba run.

**Kiểm thử độc lập**: Mock timeout/429/5xx/file lỗi/worker chết; kiểm state machine, fencing và manual child duy nhất.

- [x] T038 [P] [US4] Viết state-machine/retry integration test tại `backend/tests/integration/submissions/speakingGradingRetry.test.js` bằng DB adapter mock hoặc PostgreSQL disposable.
- [x] T039 [US4] Tạo watchdog thu hồi lease bằng CAS, backoff+jitter và terminal failure mapping tại `backend/src/jobs/aiGrading.watchdog.js` cùng test `backend/tests/unit/jobs/aiGrading.watchdog.test.js`.
- [x] T040 [US4] Tạo manual retry service/endpoint idempotent và canonical child status tại `backend/src/services/speakingGradingRetry.service.js`, `backend/src/controllers/speakingGrading.controller.js` và `backend/src/routes/api/v1/submissions.routes.js`.
- [x] T041 [US4] Hiển thị `queued/running/retry_wait/needs_review/failed`, stage và nút retry chỉ theo `can_retry` tại `frontend/src/pages/grading/StudentHistoryPage.jsx` và `frontend/src/components/grading/FeedbackReport.jsx`.
- [x] T042 [US4] Thêm frontend test cho retry key, refresh, terminal stop và learner redaction tại `frontend/tests/pages/grading/StudentHistoryPage.test.jsx` và `frontend/tests/components/grading/FeedbackReport.speakingAsync.test.jsx`.

---

## Giai đoạn 7: Câu chuyện người dùng 5 — Tutor claim và audio authorization (P2)

**Mục tiêu**: Một tutor claim cả group; tutor khác không xem/chấm được và revoke không hard-delete.

**Kiểm thử độc lập**: Gửi nhiều claim đồng thời, kiểm một assignment; test IDOR cho detail/reference/audio/grade và soft-delete replacement.

- [x] T043 [P] [US5] Viết authorization/concurrency test cho claim, audio và grade tại `backend/tests/integration/tutors/speakingReviewAuthorization.test.js`.
- [x] T044 [US5] Tạo atomic group claim và assignment-scoped query tại `backend/src/services/tutor.service.js` và `backend/src/db/queries/grading.queries.js`.
- [x] T045 [US5] Mount `POST /api/v1/tutors/submissions/speaking/:groupId/claim` và chuẩn hóa contract/path tại `backend/src/routes/api/v1/tutors.routes.js`, `backend/src/controllers/tutor.controller.js` và `.sdd/specs/ai-fast-grading/contracts/speaking-grading.openapi.yaml`.
- [x] T046 [US5] Mount signed audio route và giới hạn owner/assigned tutor/admin tại `backend/src/routes/api/v1/submissions.routes.js`, `backend/src/controllers/submission.controller.js` và `backend/src/services/submission.service.js`.
- [x] T047 [US5] Thay revoke bằng soft-delete và thêm `deleted_at IS NULL` cho tutor/history/export/report reader trong `backend/src/services/tutor.service.js`, `backend/src/services/submission.service.js` và các controller admin liên quan.
- [x] T048 [US5] Thêm claim trước navigation, signed-audio on-demand và không persist URL tại `frontend/src/pages/grading/TutorQueuePage.jsx`, `frontend/src/pages/grading/TutorGradingPage.jsx` và `frontend/src/services/grading.service.js`.

---

## Giai đoạn 8: Hoàn thiện, đối chiếu dữ liệu và bàn giao hội đồng

- [x] T049 [P] Thêm quarantine cleanup reconciler chỉ xóa object quá hạn sau DB cross-check tại `backend/src/jobs/audioUploadCleanup.job.js` cùng unit test `backend/tests/unit/jobs/audioUploadCleanup.job.test.js`.
- [x] T050 [P] Bổ sung log/metrics an toàn theo job/stage/provider, không chứa audio/transcript/signed URL tại `backend/src/services/aiUsage.service.js` và `backend/src/jobs/aiGrading.worker.js`.
- [x] T051 [P] Validate OpenAPI refs/examples/state combinations bằng `backend/tests/contract/speakingGradingOpenApi.test.js`.
- [x] T052 Chạy `node --check`, feature-targeted lint, targeted Jest/Vitest và frontend build; ghi rõ baseline lỗi ngoài phạm vi, không chạy destructive migration tests trên DB thật.
- [x] T053 Đối chiếu schema/query/API/UI với `quickstart.md`, cập nhật bằng chứng đạt/chưa đạt trong `.sdd/specs/ai-fast-grading/checklist.md` và không đánh dấu production gate chưa có dữ liệu.
- [x] T054 Cập nhật `.sdd/agents_changelog.md` và tạo hướng dẫn bộ file nên giữ cho hội đồng trong `.sdd/specs/ai-fast-grading/REVIEW_GUIDE.md`.

## Giai đoạn 9: Cổng phát hành cần bằng chứng môi trường thật

**Mục đích**: Các task dưới đây cố ý để mở sau khi foundation hoàn tất. Chỉ đánh dấu `[x]` khi có artifact đo được hoặc phê duyệt chính thức; không thay bằng mock hay suy đoán.

- [ ] T055 Chạy fresh/legacy migration, concurrency và backup/restore rehearsal trên PostgreSQL disposable hoặc staging đã xác nhận; lưu log/checksum không chứa secret làm bằng chứng cho CHK011/G-05.
- [ ] T056 Đo coverage cho business logic mới, bổ sung nhánh happy/error còn thiếu và đặt gate CI tối thiểu 80%; không dùng tổng coverage của code legacy để che phần feature chưa được kiểm thử.
- [ ] T057 Chạy benchmark/load/chaos trên staging ở baseline 30 enqueue/phút, ít nhất 10 job đồng thời và 2× forecast đã duyệt; xác nhận p95 enqueue dưới 500 ms cùng queue recovery/watchdog.
- [ ] T058 Hoàn tất RFC/approval cho React, provider, private storage, audio format, retention/KMS, calibration/fairness và forecast/cost; đồng bộ mirror `.specify/memory/constitution.md` với `.sdd/constitution.md`; giữ public Speaking band OFF cho tới khi mọi quyết định liên quan được ký.
- [ ] T059 Tách các màn hình frontend kế thừa còn vượt giới hạn Constitution 300 dòng/file hoặc 40 dòng/hàm, bổ sung code splitting cho bundle lớn và chạy lại regression/build.

## Giai đoạn 10: AI Estimated Speaking đủ bốn tiêu chí và tutor prelim

**Mục đích**: Thực hiện quyết định nghiệp vụ ngày 2026-07-22 mà không thêm bảng: learner AI nhận đủ điểm luyện tập; lỗi giữ ở luồng AI; tutor chỉ nhận bài được chọn tutor và có bản nháp AI để chỉnh.

- [x] T060 [P] Viết unit test cho Gemini audio evidence và rubric scorer đủ Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation tại `backend/tests/unit/ai/speechEvidence.adapter.test.js` và `backend/tests/unit/ai/speakingRubricScorer.adapter.test.js`.
- [x] T061 Tích hợp audio thật + transcript ASR vào Gemini qua `backend/src/ai/speechEvidence.adapter.js`, `backend/src/ai/speakingRubricScorer.adapter.js`, prompt/schema và provider gateway hiện có; không suy luận Pronunciation chỉ từ transcript.
- [x] T062 Chuyển worker learner sang semantics đủ bốn tiêu chí hoặc retry/failed, không gọi `finalizeReview`/đổi `grader=tutor`; thêm cờ riêng cho AI estimate và version audit tại config/worker/finalizer.
- [x] T063 [P] Thêm tutor AI prelim đọc ba audio private, trả bản nháp bốn tiêu chí nhưng không persist tại `backend/src/services/speakingTutorPrelim.service.js`, `backend/src/services/tutor.service.js` và route/controller hiện có; thêm unit test.
- [x] T064 [P] Chuẩn hóa UX: nút “Chấm lại” chỉ hiện ở `failed + can_retry`, còn tutor thấy nút “AI chấm nháp để tutor chỉnh sửa”; giữ regression test frontend xanh.
- [x] T065 Bổ sung cấu hình mẫu không chứa secret, hỗ trợ đường dẫn `ffmpeg`/`ffprobe`, và xác minh smoke test provider thật trên ba audio private trả `completed/full_audio` đủ bốn tiêu chí.
- [x] T066 Đồng bộ `spec.md`, `plan.md`, `research.md`, `data-model.md`, quickstart, contract/OpenAPI, checklist và review guide với semantics mới; chạy contract/unit/frontend/build/lint trước bàn giao.

## Phụ thuộc và thứ tự

- Giai đoạn 1 chặn mọi migration/runtime mới.
- Giai đoạn 2 chặn US2–US5; T010–T013 có thể làm song song sau T007/T008 được chốt.
- US1 có thể kiểm song song với nền tảng nhưng phải đạt trước rollout.
- US2 tạo job trước US3 xử lý job; US4 phụ thuộc state/query của US2–US3; US5 áp dụng riêng cho bài được nộp với `grader=tutor`, không phụ thuộc lỗi/handoff của US3.
- `AI Estimated Band` luyện tập đã được triển khai; nhãn/kết quả đã hiệu chuẩn vẫn phụ thuộc T055–T059 và external calibration/RFC gate dù code test xanh.

## Cơ hội song song

- Nhánh database/query: T006–T014.
- Nhánh frontend upload/polling: T024–T028 sau khi request/response contract T019 được khóa.
- Nhánh evidence/calibration: T029–T036 sau khi job/artifact query ổn định.
- Nhánh tutor authorization: T043–T048 sau khi migration T007 tồn tại.

## Chiến lược MVP

1. Hoàn tất Setup + database/job/private upload.
2. Giữ Writing regression xanh.
3. Bật Speaking async fail-closed toàn phiên: đủ transcript + audio evidence thì trả `AI Estimated Band`, lỗi thì retry/failed.
4. Hoàn thiện retry/watchdog và tutor authorization/AI prelim cho bài learner chủ động chọn tutor.
5. Chỉ quảng bá kết quả là đã hiệu chuẩn/chính thức sau khi calibration/RFC/retention gate có bằng chứng và được duyệt.

## Quy tắc kiểm chứng

- Không gọi Gemini/OpenAI/Anthropic/Azure thật trong automated test.
- Không đọc hoặc sử dụng secret trong `.env` cho test.
- Không chạy `npm test` toàn backend cho tới khi destructive migration tests có DB disposable guard.
- Không dùng “file tồn tại” làm bằng chứng task đạt; phải có check/test tương ứng.
- Không sửa/xóa dữ liệu legacy để làm migration pass.
