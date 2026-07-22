# Quickstart kiểm chứng sau implementation

**Mục đích**: Hướng dẫn đội dự án xác nhận implementation hiện tại khớp plan trước khi mở production.

**Lưu ý**: Đây là acceptance runbook; một mục chỉ được đánh dấu đạt khi có bằng chứng code/test tương ứng.

Tài liệu nguồn: [plan.md](./plan.md), [data-model.md](./data-model.md), [hợp đồng API](./contracts/speaking-grading-api.md) và [OpenAPI 3.1](./contracts/speaking-grading.openapi.yaml). Runtime hiện trả `AI Estimated Band` khi đủ transcript + audio evidence; các cổng governance ở cuối tài liệu vẫn chặn việc gọi kết quả đó là điểm IELTS chính thức/đã hiệu chuẩn.

### Acceptance hiện hành

- `grader=ai`: thành công phải có đủ Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation và Overall; không tạo tutor assignment.
- Thiếu evidence hoặc provider lỗi: tự retry rồi `failed`; giữ `grader=ai`. Nút chấm lại chỉ xuất hiện khi status `failed` và `can_retry=true`.
- `grader=tutor`: mới vào tutor queue. Tutor đã được phân công có thể chạy AI prelim để điền bản nháp bốn tiêu chí; gọi prelim không ghi điểm và không đổi trạng thái.
- `needs_review/partial_audio/transcript_only` chỉ còn trong reader/test tương thích dữ liệu lịch sử.

### Trạng thái kiểm thử ngày 2026-07-22

- Speaking/OpenAPI mục tiêu: backend 6 suite/23 test và frontend 2 file/6 test đạt với provider mock theo đúng các lệnh tập trung ở mục 2.
- Writing regression **chưa xanh**: backend còn 1 test fail do envelope lỗi ngắn chưa đặt `word_count`/`required_words` vào `error.details` và `request_id` vào `meta` (T070); frontend còn 1 test fail vì thiếu `Overall Writing Band` tổng hợp 33%/67% (T071).
- Provider smoke ba audio thật vẫn mở ở T067. Không dùng kết quả mock hoặc job thất bại do quota để đóng cổng này.

## 1. Điều kiện tiên quyết

- Node.js `>=20`, npm `>=10`.
- PostgreSQL 16 hoặc Supabase project riêng cho dev/test; tuyệt đối không dùng production database.
- `ffmpeg`/`ffprobe` phiên bản pin trong test container.
- Một private object-storage bucket thử nghiệm qua adapter (S3 target hoặc Supabase dev) với service credential đúng scope.
- Migration `008a_bootstrap_missing_prerequisites.sql`, `025_harden_ai_grading_schema.sql` và `026_create_speaking_analysis_artifacts.sql` đã được review.
- Provider adapters chạy mock/fake trong automated test; không đặt API key thật vào test hoặc commit.
- `spec.md` đã được chốt cho foundation fail-closed; RFC provider/storage/React/audio format và ngưỡng calibration phải được phê duyệt trước public rollout, hiện được theo dõi ở T058.
- Một bộ audio fixture hợp pháp, không chứa dữ liệu cá nhân thật: audio hợp lệ cho ba Part, silent, clipped, corrupt, MIME giả và file vượt giới hạn.

Runner hiện đã có migration history, checksum, advisory lock và baseline có xác nhận. Lượt triển khai này không chạy migration trên production: trước khi chạy thật vẫn phải backup, review checksum/baseline, thử trên PostgreSQL disposable hoặc staging và có kế hoạch restore.

## 2. Cài đặt và kiểm tra nền

Backend:

```powershell
cd backend
npm ci
npm test -- --runTestsByPath tests/contract/speakingGradingOpenApi.test.js tests/unit/ai/speechEvidence.adapter.test.js tests/unit/ai/speakingRubricScorer.adapter.test.js tests/unit/services/speakingGrading.service.test.js tests/unit/services/speakingTutorPrelim.service.test.js tests/unit/jobs/aiGrading.worker.test.js --silent

# Regression Writing hiện được kỳ vọng còn 1 lỗi cho tới khi T070 hoàn tất.
npm test -- --runTestsByPath tests/integration/submissions/writingAiGrading.test.js --silent
```

Frontend:

```powershell
cd frontend
npm ci
npm test -- tests/components/grading/FeedbackReport.speakingAsync.test.jsx tests/hooks/useSpeakingGrading.test.js --reporter=dot

# Regression Writing Detail hiện được kỳ vọng còn 1 lỗi cho tới khi T071 hoàn tất.
npm test -- tests/components/grading/FeedbackReport.writingDetail.test.jsx --reporter=dot
```

Kỳ vọng:

- Không test nào gọi Internet/provider thật.
- Tập Speaking nêu trên phải đạt backend 6/23 và frontend 2/6. Hai lệnh Writing phải được chạy để thấy đúng khoảng trống T070–T071; exit code khác 0 ở hiện trạng không được diễn giải là toàn bộ Speaking thất bại.
- Coverage business logic mới đạt tối thiểu 80%; bằng chứng/gate CI này hiện còn mở ở T056 nên không được đánh dấu đạt chỉ dựa vào test count.
- Frontend build không chứa service credential, object key hoặc provider key.
- Test Writing, tutor feedback và submission history phải xanh trước phát hành. Hiện Writing còn đúng hai regression nêu ở T070–T071 nên acceptance toàn feature chưa đạt.

Chỉ chạy `npm test`/`npm run test:coverage` toàn backend trên PostgreSQL disposable đã được guard xác nhận; chạy lint/build toàn repository trong release rehearsal và ghi riêng lỗi legacy ngoài phạm vi.

File cấu hình mẫu an toàn đã có tại [`.env.example`](../../../.env.example) và T072 đã hoàn tất. Mỗi thành viên sao chép file mẫu thành `.env` cục bộ rồi chỉ điền credential dev của mình; tuyệt đối không chia sẻ hoặc commit `.env` thật. Backend có script worker riêng; chạy API và worker ở hai terminal trên môi trường disposable:

File mẫu cố ý giữ Speaking ở trạng thái fail-closed. Để chạy **demo estimate cục bộ** sau khi đã có private bucket, service credential dev, `ffmpeg`/`ffprobe` và quota Gemini, ghi đè các giá trị sau trong `.env` cá nhân (không sửa/commit `.env.example` bằng secret):

```dotenv
GOOGLE_AI_API_KEY=<gemini-api-key-cua-thanh-vien>
AI_SPEAKING_ASYNC_ENABLED=true
AI_SPEAKING_ESTIMATED_BANDS_ENABLED=true
AI_SPEAKING_PUBLISH_BANDS=false
AUDIO_UPLOAD_TOKEN_ACTIVE_KID=local-demo
AUDIO_UPLOAD_TOKEN_KEYS_JSON={"local-demo":"<khoa-ngau-nhien-32-byte-base64>"}
```

`AI_SPEAKING_PUBLISH_BANDS` phải giữ `false`: nhánh calibrated/publish chưa hoàn chỉnh theo T074. Hai tên bucket trong file mẫu phải trỏ tới **cùng private bucket dev thực tế**; không đổi thành public bucket và không dùng credential production để demo.

```powershell
cd backend
npm run dev
```

```powershell
cd backend
npm run worker
```

`npm run worker` phải khởi động được như process riêng; nếu không thì acceptance bị chặn, không thay bằng `setImmediate` trong API process.

## 3. Kiểm tra migration trên database rỗng và database có dữ liệu

Chạy hai vòng trên database dùng một lần:

1. Database rỗng: áp toàn bộ migration theo thứ tự và boot API/worker.
2. Snapshot dữ liệu đã ẩn danh từ schema hiện tại: chạy audit, backfill, migration và kiểm tra tương thích.

Các truy vấn read-only cần cho kết quả bằng `0` sau migration:

```sql
-- Một group không được có hai Part đang hoạt động cùng số.
SELECT speaking_group_id, part_number, COUNT(*)
FROM speaking_submissions
WHERE deleted_at IS NULL AND part_number IS NOT NULL
GROUP BY speaking_group_id, part_number
HAVING COUNT(*) > 1;

-- Job/report không được mồ côi.
SELECT agr.id
FROM ai_grading_reports agr
LEFT JOIN ai_grading_jobs j ON j.id = agr.grading_job_id
WHERE agr.grading_job_id IS NOT NULL AND j.id IS NULL;

-- Artifact phải trỏ tới submission tồn tại.
SELECT saa.id
FROM speaking_analysis_artifacts saa
LEFT JOIN speaking_submissions ss ON ss.id = saa.speaking_submission_id
WHERE ss.id IS NULL;
```

Kiểm tra bổ sung:

- `submission_status` có `grading_failed` và các trạng thái cũ không bị đổi.
- `audio_url` có thể nullable nhưng constraint bắt buộc có `audio_storage_key` hoặc legacy `audio_url`.
- Row có `audio_storage_key` bắt buộc đủ declared hash/size/duration, source prompt ID/hash, test/group/Part; row thiếu một field bị DB từ chối.
- Unique `(speaking_group_id,part_number)` vẫn giữ sau soft-delete; group lịch sử không thể được tái sử dụng.
- Dữ liệu legacy có transcript chỉ được fallback để hiển thị; migration không tạo synthetic job/artifact và transcript đó không được dùng để sinh criterion band/Overall mới.
- `tutor_feedback_reports` có `deleted_at`, CHECK XOR đúng một submission type và partial unique cho một report active trên mỗi speaking/writing submission; revoke là soft-delete và mọi reader/UPSERT/export bỏ qua row đã xóa.
- Mọi reader report ưu tiên job-backed report chưa xóa; chỉ fallback aggregate legacy khi group chưa có job.
- Unique `grading_job_id`, original-job fingerprint, active-job, storage key và artifact version đều chống được race tương ứng.
- Job pin `scoring_config_sha256`/`calibration_bundle_sha256`; artifact cache key dùng config digest, không chỉ nhãn pipeline.
- JSONB artifact vượt size cap/schema version bị từ chối.
- Chạy migration lại qua migration tool phải báo “already applied”, không chạy lại backfill.
- Hai process migrate đồng thời: một process giữ advisory lock, process còn lại chờ hoặc thoát an toàn.
- Migration lỗi phải làm command trả exit code khác `0`.

## 4. Test happy path end-to-end với provider mock

### Chuẩn bị

- Mock transcriber theo contract runtime: trả plain `asr_transcript`/`display_transcript`, `words=null`, `segments=null`, `uncertainty=null` và manifest `plain_transcript`.
- Mock Gemini speech evidence trả các trường Fluency/Pronunciation đã whitelist cùng `sufficient|insufficient`; không giả lập Azure, phoneme timeline hoặc structured ASR chưa có trong code.
- Mock rubric scorer trả feedback có cấu trúc; overall do code tính, không tin giá trị overall từ model.

### Luồng

1. Đăng nhập bằng learner test account.
2. Gọi ba lần `POST /speaking/audio-uploads`, mỗi Part một token; xác nhận response trả riêng `upload_url_expires_at` và `upload_token_expires_at`, UI dùng mốc sớm hơn.
3. Upload ba audio fixture vào signed URL.
4. Gọi `POST /speaking/full` với ba `prompt_id=test_passages.id` hợp lệ và `Idempotency-Key` mới; backend snapshot prompt chính thức, không nhận prompt text tự do.
5. Xác nhận API trả `202` cùng `Location`/`Retry-After` trong giới hạn p95 đề xuất, không chờ mock provider hoàn tất.
6. Poll `grading-status`: `queued → running → completed`.
7. Xác nhận UI chỉ hiển thị kết quả sau terminal state.

Negative prompt tests gửi passage thuộc Reading/Listening, test chưa published/chưa tới `publish_at`, test learner không được truy cập, sai Part hoặc ID không tồn tại: đều bị từ chối trước quota/job. Sau khi admin sửa test bằng delete/reinsert passage, submission cũ vẫn giữ `source_prompt_id`, snapshot `title+instruction+content` và hash cũ mà không chặn authoring flow.

Database kỳ vọng cho một lần nộp mới:

| Bảng | Số hàng mới | Điều kiện |
|---|---:|---|
| `speaking_submissions` | 3 | Cùng group, đúng Part 1/2/3, storage key private |
| `ai_grading_jobs` | 1 | Terminal `completed`, attempt `1` |
| `speaking_analysis_artifacts` | 3 | Một artifact terminal/Part, hash khớp |
| `ai_grading_reports` | 1 | Session report, `full_audio`, liên kết job/group |
| `ai_usage_logs` | Theo mock call | Liên kết job, không chứa prompt/transcript |
| `speaking_attempts` | 0 | Không dual-write |
| `speaking_attempt_answers` | 0 | Không dual-write |
| `tutor_grading_reports` | 0 | Không dùng bảng legacy |

Kết quả API kỳ vọng:

- Có bốn criterion band theo bước 0,5.
- Overall bỏ giá trị model/provider, dùng trung bình trọng số bằng nhau của đúng bốn band hợp lệ rồi áp quy tắc reporting whole/half-band đã duyệt.
- API đọc Overall từ `computed_band`; DB xác nhận `computed_band` và mirror legacy `band_score` cùng `null` hoặc bằng nhau.
- Có `assessment_type=estimated`, pipeline/calibration version và disclaimer.
- `raw_ai_response`, raw phoneme payload, object key và signed URL không xuất hiện.

Test Overall bằng decimal, không dùng floating binary. Với phần lẻ của mean lần lượt `.000/.125/.250/.375/.500/.625/.750/.875`, kết quả nửa band tương ứng là `.0/.0/.5/.5/.5/.5/+1.0/+1.0`; riêng `.25/.75` là tie hướng lên. Test thêm biên `0` và `9`, và xác nhận CHECK equality chỉ áp dụng Speaking job-backed, không phá Writing/legacy.

## 5. Test ứng dụng không sửa ASR output và gate fidelity của provider

Dùng fixture có chủ đích:

- “He go to school every day” thay vì bản sửa “He goes...”.
- Repetition: “I, I, I think...”.
- Filler/false start: “um, I went— I mean I go...”.

Assertions:

- `asr_transcript` giữ đúng chuỗi mock provider trả về; `display_transcript` có thể thêm dấu câu nhưng không thay evidence đầu vào.
- Prompt gửi rubric scorer lấy `asr_transcript` cùng audio evidence đã lưu; không lấy `display_transcript` làm evidence thay thế.
- Với adapter hiện tại, xác nhận `words/segments/uncertainty` là `null` và UI/API không bịa timestamp hoặc confidence. Kịch bản uncertainty theo từ chỉ được thêm sau khi T068 hoàn tất.
- Không có bước LLM “correct grammar then grade” trong pipeline.
- Regrade cùng verified audio hash và `scoring_config_sha256` tái sử dụng artifact. Thay bất kỳ thành phần manifest nào phải tạo scoring-config digest và artifact mới; chỉ đổi nhãn `pipeline_version` không được làm cache key giả.

CI mock chỉ chứng minh ứng dụng không hậu xử lý, **không** chứng minh ASR là verbatim. Runtime estimate hiện chưa có gold-set hoặc threshold fidelity và scorer hiện đánh dấu đủ evidence khi adapter trả thành công; vì vậy không được tuyên bố nó đã tự abstain dựa trên fidelity. T076 phải so output provider với manual verbatim transcript trên L2 English audio, đo riêng retention của grammar errors, discourse markers, filler, repetition, repair/false start bên cạnh WER, rồi thực thi policy cho nhánh calibrated/production. Confidence cao của provider không được dùng để bỏ gate này.

Thêm cặp test có cùng filler count nhưng một câu dùng discourse marker phù hợp, một câu là word-search/functionless filler; hệ thống không được áp direct penalty theo raw count.

## 6. Test evidence không đủ: fail closed toàn phiên

### Có ba audio nhưng thiếu pronunciation evidence ở Part 3

- Worker không persist điểm một phần và không tạo report `completed`.
- Job retry theo policy; nếu vẫn thiếu evidence thì terminal `failed`, ba submission sang `grading_failed` nhưng giữ `grader='ai'`.
- Learner status có `result=null`; tutor queue không nhận group này.
- UI chỉ hiện nút chấm lại khi backend trả `can_retry=true`; không hiện trong lần chạy đầu, khi đang xử lý hoặc khi thành công.

### Chỉ còn transcript

- Không được suy luận Fluency/Pronunciation hoặc Overall từ transcript.
- Job AI kết thúc theo retry/failed, không tạo tutor assignment.
- Reader legacy vẫn từ chối mọi payload `transcript_only` có criterion band khác `null`.

### Bài học viên chủ động chọn tutor

- Trước claim, tutor queue chỉ lộ metadata tối thiểu; detail, AI reference và audio trả `403` cho mọi tutor chưa được assign.
- Cho 20 tutor claim đồng thời cùng group: đúng một tutor thắng, cả ba Part nhận cùng `assigned_tutor_id`; các request còn lại trả `409 TUTOR_CLAIM_CONFLICT`.
- Tutor được assign mới đọc được detail/reference/audio và grade. Tutor khác biết UUID vẫn bị `403`.
- Nút AI prelim trả bản nháp bốn tiêu chí từ ba audio + transcript, nhưng không insert/update job, AI report hoặc tutor report.
- Hai grade request đồng thời chỉ tạo một `tutor_feedback_reports` active; transaction khóa group, partial unique chặn duplicate, và grade sau khi một Part đã `tutor_graded` bị từ chối.
- Revoke soft-delete row active; mọi reader bỏ qua row đó và lần grade mới có thể insert đúng một replacement row.

### Reliability/uncertainty nội bộ

- Public learner/reviewer contract không có field reliability; serializer allowlist phải loại bỏ bucket, CI và bundle digest.
- Event cố định là adjacent agreement. Fixture kiểm point estimate, speaker-cluster bootstrap 95% CI, `speaker_count/session_count` và dùng `lower_95_ci`; nhiều session cùng speaker không được coi độc lập.
- Bucket thiếu minimum speaker count không được dùng để quảng bá kết quả đã hiệu chuẩn; validator từ chối self-confidence/provider score.
- Runtime hiện lấy bundle/digest từ cấu hình process lúc enqueue. Job pin full scoring-config/calibration digest; thay cấu hình deploy giữa attempt 1/2 hoặc trước manual retry không đổi digest của chain. Child khác digest bị từ chối. Khi có registry trong tương lai, registry cũng chỉ được chọn digest ở bước enqueue.

## 7. Test idempotency và concurrency

### Cùng key, cùng payload

Gửi 20 request đồng thời cùng user, `Idempotency-Key` và body:

- Tất cả trả cùng `speaking_group_id`/`job_id` hoặc replay response tương đương.
- Chỉ có 3 submission, 1 job và tối đa một provider pipeline.

### Cùng key, khác payload

- Request đầu trả `202`.
- Request sau đổi một upload token trả `409 IDEMPOTENCY_KEY_REUSED`.
- Không tạo thêm row.

### Key khác, fingerprint giống nhau

- Dùng cùng ba upload token/storage key nhưng key khác: một request thắng `202`, request còn lại trả `409 DUPLICATE_GRADING_REQUEST` kèm canonical IDs; key thua không được coi là alias replay.
- Không tạo report/provider calls trùng.
- Upload cùng bytes lại dưới ba storage key mới là attempt mới và bị quota kiểm soát; không giả định checksum client là content-dedupe an toàn.

Replay cả cùng-key và duplicate-fingerprint phải được lookup trước quota: sau khi user đạt đủ 10 lượt, replay cùng key vẫn trả canonical job, còn key khác/fingerprint trùng vẫn trả `409`, không bị đổi thành `429`.

### Quota đồng thời

Gửi đồng thời Writing và Speaking request khi user còn đúng một slot trong ngày UTC:

- Cả hai entrypoint dùng cùng advisory-lock convention.
- Chỉ một original group/job được reserve; request còn lại trả `429 DAILY_GRADING_QUOTA_EXCEEDED`.
- Automatic/manual retry hợp lệ không tăng count.
- Lookup idempotency/fingerprint diễn ra trong cùng advisory-lock trước phép đếm; request đồng thời thứ hai không tiêu thụ slot hoặc nhận `429` sai.
- Nếu Writing chưa dùng convention chung, gate quota production bị fail; không thêm Redis counter để che race.

### Nhiều worker

Chạy ít nhất hai worker claim cùng queue:

- Một job chỉ do một worker giữ lease tại một thời điểm.
- `FOR UPDATE SKIP LOCKED` cho phép hai worker xử lý hai job khác nhau.
- Không giữ DB transaction mở trong lúc gọi provider mock.
- Cho worker A hết lease sau provider call, watchdog thu hồi và worker B claim generation mới; mọi heartbeat/artifact/report/final write của A với `(lease_owner,lease_generation)` cũ phải CAS thất bại và không thay cache/job.

## 8. Test retry, watchdog và trạng thái lỗi

| Tình huống mock | Kỳ vọng |
|---|---|
| Provider timeout rồi thành công ở attempt 2 | `running → retry_wait → running → completed` trong original job; worker claim trực tiếp khi `run_after` tới hạn |
| Provider `429` | Worker dùng backoff mũ có jitter nội bộ; runtime hiện chưa đọc `Retry-After` của provider |
| Provider `5xx` | **Khoảng trống T077**: gateway có thể đổi lỗi thành `INTERNAL_ERROR/AIGRADE_003`, khiến worker fail ngay thay vì `retry_wait`; chỉ kỳ vọng hai automatic attempt sau khi test end-to-end T077 đạt |
| Owner bấm retry sau trường hợp trên | Tạo đúng một child `retry_of_job_id`, `max_attempts=1`; tổng chain không quá 3 |
| Evidence âm thanh vẫn thiếu sau retry | Job `failed`, group `grading_failed/ai`; không handoff tutor |
| File corrupt/codec sai | Fail ngay, không retry provider và không gọi grader |
| Worker chết sau claim | Lease hết hạn, watchdog thu hồi; không tạo hai report |
| Worker chết sau insert report trước response nội bộ | Transaction/idempotency để lần chạy lại đọc report cũ, không chấm lại |
| Retry thủ công cùng key | Một job retry duy nhất có `retry_of_job_id` |

Xác nhận retry không làm quota learner tăng thêm. Public job status `failed` map sang `speaking_submissions.status='grading_failed'`; frontend không trộn hai enum này.

- Retry child dùng key khác sau khi child đã tồn tại trả `409 RETRY_ALREADY_CREATED`; không tạo alias/key thứ hai.
- Ngay khi child commit, status URL cấp group trả `job_id`/status/attempt/report của child; không trộn parent `failed` với child đang chạy hoặc terminal.
- Retry cùng key trả accepted representation `queued`; live state luôn đọc qua status URL.
- Retry cùng key/payload trong replay window của child trả đúng child; sau `idempotency_expires_at` trả `410 IDEMPOTENCY_WINDOW_EXPIRED`, không tái sử dụng key hoặc tạo child mới.

## 9. Test audio validation và bảo mật

### Upload/format

- File khai báo `audio/mp4` nhưng magic bytes là executable/text phải bị từ chối trước provider.
- File đúng MIME nhưng decode lỗi bị từ chối.
- File >50 MB trả `413`.
- Trong khi G-03 chưa đổi, WebM bị từ chối rõ ràng; nếu RFC WebM được duyệt, fixture WebM/Opus phải normalize được sang format canonical.
- File hợp lệ trong giới hạn được normalize **nguyên từng Part** thành WAV PCM16 mono 16 kHz; runtime chưa chunk, deduplicate hoặc rebase timestamp.
- Worker xử lý Part 1, 2, 3 tuần tự và speech evidence dùng Gemini. Không có Azure continuous mode hoặc alignment hai transcript trong implementation hiện tại.
- T068 chỉ được đóng khi adapter thật trả structured words/segments/timestamp/uncertainty và model transcription được pin/validate; T069 chỉ được đóng khi có nhu cầu từ load/provider limit cùng test bounded parallel, chunk/deduplicate/rebase. Trước đó không dùng các khả năng này làm acceptance đã đạt.
- Không decode được, duration bằng 0 hoặc không có speech: `failed` non-retryable, không gọi provider chấm.
- Audio vẫn có speech nhưng clipping/noise làm một criterion evidence không đủ: retry/failed, không bịa criterion/Overall và không handoff tutor.
- Client sửa `duration_ms` hoặc declared SHA-256 không vượt qua duration/checksum do worker tự đo/tính; mismatch checksum fail trước provider.

### Storage privacy

- Anonymous request tới object URL trả `401/403`, không phát audio.
- User A không xin được signed URL của User B (`404` hoặc `403` theo policy chống enumeration).
- Tutor chưa được phân công không nghe được audio.
- Signed URL hết hạn trong tối đa 5 phút và response có `Cache-Control: private, no-store`.
- DB/log không chứa signed URL; `audio_storage_key` không xuất hiện trong API response.
- Cleanup reconciler xóa object quarantine quá 24 giờ chỉ khi key không tồn tại trong `speaking_submissions`; fixture đã bind không bị blind lifecycle xóa nhầm.
- Replay stateless upload token đồng thời chỉ bind được một submission nhờ unique storage key; tài liệu/UI không được tuyên bố token có thể revoke trước bind.
- Token có authenticated `kid`; rotate KMS key trong replay window vẫn giải mã được token cũ và replay đúng job. Sau `idempotency_expires_at` trả `410 IDEMPOTENCY_WINDOW_EXPIRED`; key cũ chỉ được xóa khi không còn window phụ thuộc cộng clock skew.
- Nếu adapter Supabase được chọn, acceptance xác nhận storage upload URL thực tế khoảng hai giờ và app-token expiry ngắn hơn không thu hồi URL đã phát; nếu risk chưa được RFC chấp nhận thì gate fail.

## 10. Test phân quyền tutor và AI prelim

- Chỉ bài được nộp ban đầu với `grader='tutor'` xuất hiện trong queue; lỗi của job `grader='ai'` không được handoff.
- Group chưa gán chỉ lộ metadata queue; 20 tutor claim đồng thời thì đúng một người thắng và cả ba Part có cùng `assigned_tutor_id`.
- Reference/raw audio và grade đã kiểm `assigned_tutor_id`/admin. Riêng detail hiện có thể trả 403 sai vì controller chưa truyền requester; chỉ đánh dấu đạt sau khi T073 cùng HTTP test assigned tutor/tutor khác/admin xanh.
- Tutor grade ghi vào `tutor_feedback_reports`, không ghi `tutor_grading_reports`.
- AI prelim chỉ điền gợi ý trong UI để tutor chỉnh sửa; chưa bấm lưu thì database không có tutor report mới.
- Feedback tutor neo vào Part đại diện nhưng UI/query trả đúng toàn group.
- Hai grade request đồng thời chỉ tạo một report active; revoke soft-delete rồi mới cho phép một replacement row.
- Tutor override không sửa artifact/report AI gốc; audit log chỉ ra ai, lúc nào và giá trị thay thế.
- Revoke tutor feedback set `deleted_at`, không hard-delete; history/export/metrics bỏ qua row đã xóa.

## 11. Test frontend

- Sau submit, trang chuyển sang trạng thái “đang xử lý” và không giữ nút submit hoạt động.
- Poll có backoff/giới hạn; dừng khi component unmount hoặc job terminal.
- Refresh trang lấy lại trạng thái từ server bằng group ID, không phụ thuộc state RAM.
- `retry_wait` hiển thị đang tự thử lại; không yêu cầu user bấm liên tục.
- Public job `failed`/submission `grading_failed` hiển thị lỗi an toàn và nút retry chỉ khi `can_retry=true`.
- `needs_review` lịch sử chỉ hiển thị an toàn với `result=null`; job learner mới không tạo trạng thái này.
- Learner không render `transcript_only`/`partial_audio` report lịch sử; lỗi mới hiển thị `failed` và nút retry chỉ theo `can_retry`.
- Status response luôn `Cache-Control: private, no-store`; test proxy/cache không được tái sử dụng projection tutor có review reference cho learner cùng URL.
- Khi tutor hoàn tất, learner đọc tutor result qua feedback contract hiện có, không dùng job status để lộ AI partial result.
- Browser chỉ được bắt đầu ghi/nộp khi MIME recorder nằm trong policy đã duyệt; không âm thầm gửi WebM khi G-03 chưa được sửa.
- Screen reader đọc được trạng thái async; màu không phải tín hiệu duy nhất.
- Không log response có transcript/audio URL vào console production.

## 12. Calibration/shadow gate để nâng cấp nhãn chất lượng

Phần này **không** chặn nhánh luyện tập `AI Estimated Band`: nhánh đó được phép chạy khi cờ estimate bật, đủ evidence, có version scorer và disclaimer dù calibration bundle chưa có. Hiện worker chỉ khởi tạo scorer cho cờ estimate; scorer bỏ qua bundle và luôn phát `assessment_type=estimated`, nên nhánh publish/calibrated chưa tồn tại end-to-end. T074 cùng các bước dưới đây là bắt buộc trước khi mô tả `full_audio` band là kết quả đã hiệu chuẩn/production-grade hoặc bật `AI_SPEAKING_PUBLISH_BANDS`:

1. Chạy shadow pipeline trên bộ gold set đủ ba Part đã được consent/ẩn danh phù hợp.
2. Mỗi phiên có ít nhất hai người chấm độc lập; bất đồng được adjudicate.
3. Giám khảo đạt chuẩn, chấm mù với AI/provider output, dùng anchor; inter-rater threshold đạt trước adjudication. Tách split theo speaker và dùng speaker-cluster bootstrap nếu một người có nhiều session.
4. Đánh giá ASR fidelity bằng manual verbatim transcript, gồm retention của grammar error/filler/repetition/repair chứ không chỉ WER.
5. Báo cáo MAE từng tiêu chí/Overall, exact/adjacent agreement, QWK, cluster-bootstrap reliability và so với inter-rater/human ceiling.
6. Phân tích sai lệch theo accent vùng miền Việt Nam, giới, band range, thiết bị và noise; báo subgroup sample size/delta.
7. Chọn uncertainty/human-review threshold từ calibration set, khóa trước khi chạy holdout.
8. Pin exact prompt hash, provider/model/locale/SDK, ffmpeg/normalizer, feature schema/calibrator và population; thay bất kỳ thành phần nào tạo scoring-config digest mới và shadow lại.
9. Bundle ghi bucket rules, point estimate/speaker-cluster bootstrap CI, speaker/session count, thresholds, metrics/slices, dataset hash và approval; CI xác minh schema/SHA-256/chữ ký.
10. Runtime hiện lấy digest từ cấu hình process lúc enqueue; job pin scoring digest và calibration digest tùy chọn, artifact pin scoring-config digest, report tham chiếu job qua `grading_job_id`, và manual child copy parent. Nếu bổ sung registry version-controlled trong tương lai thì registry cũng chỉ được chọn digest lúc enqueue. Nhánh có bundle phải fail closed nếu bundle/binding sai.
11. Đạt minimum automation coverage và maximum human-review rate trên toàn cohort/từng subgroup, bên cạnh quality/fairness; không chấp nhận pipeline abstain gần hết.

Ngưỡng MAE/QWK/agreement/subgroup delta hiện phải được hội đồng Việt Nam ký. Nếu chưa chốt hoặc chưa đạt, learner chỉ được thấy `AI Estimated Band` kèm disclaimer; không được mô tả là điểm IELTS chính thức và lỗi AI không tự chuyển tutor.

## 13. Load và resilience gate

Kịch bản tối thiểu trên môi trường staging:

- Burst nhiều request enqueue đồng thời: p95 API dưới 500 ms, không tính direct upload.
- Baseline proposal: 30 enqueue/phút, 10 job đồng thời; sau đó chạy ở 2× forecast thật đã được product duyệt.
- Queue có nhiều worker; đo queue depth, oldest job age và DB lock/contention.
- Pipeline p95 mục tiêu ban đầu dưới 5 phút với provider mock latency thực tế mô phỏng.
- Storage/provider tạm mất: API enqueue vẫn nhất quán, worker backoff, không mất job.
- Restart API/worker/PostgreSQL connection: job đang xử lý được lease recovery.
- Không tăng RAM API theo kích thước audio vì bytes đi thẳng Storage.
- Worker hiện normalize nguyên từng Part trong giới hạn disk/RAM/CPU container và xóa derivative sau job; file độc hại/treo bị timeout. Chunk/deduplicate chưa có và được theo dõi ở T069.

Chỉ cân nhắc BullMQ/managed queue khi số liệu chứng minh PostgreSQL queue gây contention hoặc không đạt queue latency; không thêm hạ tầng theo cảm tính.

## 14. Quan sát vận hành

Dashboard/alert phải có:

- Queue depth và tuổi job lâu nhất.
- Success/retry/needs-review/failure rate.
- Latency theo validation, transcription, speech evidence, scoring và calibration.
- Provider error code/rate limit theo model version.
- Chi phí/token theo `ai_usage_logs` và tỷ lệ artifact cache hit.
- Tỷ lệ missing evidence, audio quality failure và human review.
- Drift theo calibration version/bundle digest; random audit cả bucket reliability nội bộ cao để phát hiện blind spot.

Log test xác nhận chỉ có request/job IDs và metadata an toàn, không có prompt, transcript, signed URL hoặc raw provider response.

## 15. Go/no-go checklist

- [x] `spec.md` đã quy định `full_audio/partial_audio/transcript_only`, evidence sufficiency và transcript-only không có bất kỳ criterion band/Overall.
- [x] `checklist.md` và `tasks.md` đã được đồng bộ lại từ spec/plan fail-closed; không còn task chấm Pronunciation hoặc Overall từ transcript-only.
- [ ] RFC provider/storage/React/audio format đã được toàn đội duyệt hoặc implementation tuân thủ đúng Constitution/G-03 khóa.
- [ ] Ngưỡng calibration/fairness và forecast scale/cost đã được hội đồng/product ký.
- [x] Chỉ có hai bảng feature mới; nếu cần `schema_migrations` thì reuse đúng một platform table dùng chung sau preflight, không tạo bảng tracking riêng cho AI.
- [ ] Migration có history/checksum/advisory lock, backup và restore test.
- [x] API và worker chạy thành process riêng; media normalizer và timestamp/duration validation đã kiểm thử mục tiêu.
- [ ] Backend/frontend lint, test, coverage và build đều xanh; hiện backend Writing còn 1 fail ở envelope (T070) và frontend Writing Detail còn 1 fail ở Overall 33%/67% (T071).
- [ ] Idempotency/concurrency/watchdog mục tiêu đã có test, nhưng phân loại retry provider 5xx còn sai lệch end-to-end tại T077.
- [x] Quota Writing + Speaking chịu cùng advisory lock và test ranh giới quota đạt.
- [x] Private storage, magic-byte và IDOR tests mục tiêu xanh.
- [ ] Tutor claim/assignment khóa cả group và reference/audio/grade có scope; detail còn thiếu requester context ở T073, nên chưa thể xác nhận toàn luồng assignment.
- [ ] Ứng dụng không biến đổi `asr_transcript`, nhưng runtime chưa thực thi fidelity gate trên manual verbatim gold audio; T076 phải định nghĩa và kiểm thử abstention cho nhánh calibrated/production.
- [x] Transcript-only trả cả bốn criterion band và Overall bằng `null`; schema partial audio chỉ dùng cho legacy/audit, còn learner mới thiếu evidence sẽ fail toàn phiên.
- [ ] Calibration/shadow gate và bundle digest chưa được áp dụng bởi scorer; T074 phải hoàn thiện nhánh calibrated end-to-end, registry version-controlled chưa được triển khai và public API không được lộ reliability nội bộ.
- [ ] Feature flag, staged rollout và dashboard/rollback của AI estimate đã sẵn sàng; rollback tắt AI estimate chứ không tự đổi bài sang tutor.
- [ ] Smoke test provider thật cần chạy lại trên ba audio private bằng model/project còn quota và phải trả `completed/full_audio`; mock test hoặc job `failed` do quota không đóng cổng này.
