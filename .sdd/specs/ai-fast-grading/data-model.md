# Mô hình dữ liệu: AI Speaking Grading production

**Ngày**: 2026-07-22

**Trạng thái**: Schema đã được triển khai; hành vi runtime AI-estimated bên dưới là nguồn hiện hành, migration vẫn phải được kiểm trên PostgreSQL disposable/staging trước production

**Nguyên tắc**: Tái sử dụng schema đang chạy; chỉ thêm bảng khi vòng đời dữ liệu hiện tại không thể biểu diễn an toàn.

## Kết luận database

Chỉ thêm **hai bảng thuộc feature**:

1. `ai_grading_jobs` cho queue bền vững, lease, retry và idempotency.
2. `speaking_analysis_artifacts` cho transcript/audio evidence có phiên bản theo từng Part.

Các bảng `speaking_submissions`, `ai_grading_reports`, `ai_usage_logs` và `tutor_feedback_reports` tiếp tục được dùng. Không tạo lại group, tutor report, usage log, audio asset hoặc từng bảng riêng cho fluency/pronunciation.

### Cập nhật hành vi runtime ngày 2026-07-22

- Không thêm bảng cho thay đổi chấm đủ bốn tiêu chí hoặc AI prelim của tutor.
- Job `grader=ai` thành công ghi một report `completed/full_audio` đủ bốn criterion band và Overall, với `assessment_type=estimated` và version estimation trong cột tương thích `calibration_version` khi chưa có bundle đã duyệt.
- Job learner thiếu evidence/provider lỗi đi theo `retry_wait/failed`; giữ `grader=ai`, không tạo report rỗng và không tự đưa vào tutor queue.
- `needs_review`, `partial_audio` và `transcript_only` được giữ trong schema/reader để tương thích dữ liệu lịch sử, không phải output của worker learner mới.
- AI prelim cho bài `grader=tutor` chỉ tạo response tạm thời; không insert job/report/artifact mới và không đổi assignment/status.

**Hạ tầng migration có điều kiện**: nếu production không dùng migration history được nền tảng quản lý và schema thật chưa có bảng tương đương, runner dùng chung có thể cần `schema_migrations(version, checksum, applied_at, ...)`. Đây là platform table duy nhất cho toàn repository, không thuộc feature và chỉ được tạo sau preflight xác nhận chưa tồn tại; tuyệt đối không tạo `ai_schema_migrations` riêng.

## Nguồn sự thật và quan hệ

```text
users
  └── speaking_submissions (3 hàng / speaking_group_id, Part 1..3)
        ├── speaking_analysis_artifacts (0..n phiên bản / Part)
        └── tutor_feedback_reports (0..n, neo vào Part đại diện)

speaking_group_id
  └── ai_grading_jobs (0..n lần chấm/retry theo pipeline)
        ├── ai_usage_logs (0..n provider calls, liên kết bằng entity_id)
        └── ai_grading_reports (0..1 kết quả tổng hợp / job)
```

- `speaking_submissions` là nguồn sự thật của bài nộp và ba Part.
- `speaking_analysis_artifacts` là nguồn sự thật của evidence đầu vào đã phân tích; không lấy transcript hiển thị làm evidence thay thế.
- `ai_grading_jobs` là nguồn sự thật của trạng thái xử lý.
- `ai_grading_reports` là nguồn sự thật của kết quả đã công bố; không dùng report làm queue.
- `tutor_feedback_reports` là nguồn sự thật của điểm/feedback người chấm.

`group_id` trong job không có foreign key trực tiếp vì nó là khóa đa hình dùng chung cho `speaking_group_id` và, ở giai đoạn sau, `writing_group_id`. Tính tồn tại và quyền sở hữu được kiểm tra trong transaction tạo job.

`input_fingerprint` có canonicalizer theo `submission_type`. Speaking dùng JSON Canonicalization Scheme (RFC 8785), UTF-8, UUID lowercase và object keys cố định cho `{schema,submission_type,test_id,parts:[{part_number,prompt_id,audio_object_key}]}` với Part sắp `1,2,3`; `audio_object_key` giữ nguyên vì case-sensitive. SHA-256 của bytes canonical là fingerprint và **không** chứa pipeline/config/checksum client. API nhận `prompt_id`; backend join `test_passages`/`mock_tests`, bắt buộc đúng `test_id`, `passage_number`, `skill='speaking'`, published/accessible và snapshot server-side `title + instruction + content` vào `speaking_submissions.prompt_text`. Khi Writing chuyển sang job phải định nghĩa canonicalizer riêng, không tái dùng công thức Speaking.

## Bảng hiện có: giữ và thay đổi tối thiểu

### `speaking_submissions`

Các cột hiện có tiếp tục dùng: `id`, `user_id`, `test_id`, `part_number`, `prompt_text`, `audio_url`, `transcript`, `grader`, `status`, `submitted_at`, `created_at`, `speaking_group_id`, `assigned_tutor_id`.

Các cột đề xuất bổ sung:

| Cột | Kiểu/constraint | Mục đích |
|---|---|---|
| `audio_storage_key` | `TEXT` | Object key trong private bucket; không lưu signed URL |
| `declared_audio_sha256` | `CHAR(64) CHECK (declared_audio_sha256 ~ '^[0-9a-f]{64}$')` | Checksum phía client khai báo trong token; chỉ là integrity hint, không dùng làm nguồn tin cậy |
| `audio_sha256` | `CHAR(64) NULL CHECK (audio_sha256 ~ '^[0-9a-f]{64}$')` | Checksum do worker tính từ bytes thật; chỉ cột này được dùng cho artifact/cache |
| `audio_size_bytes` | `BIGINT CHECK (audio_size_bytes > 0 AND audio_size_bytes <= 52428800)` | Kích thước đọc từ Storage stat khi bind object |
| `declared_duration_ms` | `INTEGER CHECK (declared_duration_ms > 0)` | Duration phía client khai báo để sàng lọc; duration đo lại nằm trong artifact |
| `source_prompt_id` | `UUID NULL` | UUID đề chính thức tại lúc resolve; cố ý không FK vì authoring hiện delete/reinsert passage, snapshot/hash giữ audit identity |
| `prompt_snapshot_sha256` | `CHAR(64) NULL CHECK (prompt_snapshot_sha256 ~ '^[0-9a-f]{64}$')` | Hash canonical UTF-8 của `id/test_id/part/title/instruction/content` đúng lúc nộp |
| `assigned_tutor_at` | `TIMESTAMPTZ NULL` | Một timestamp assignment/claim dùng chung cả ba Part, hỗ trợ replay ổn định |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Theo chuẩn timestamp của project |
| `deleted_at` | `TIMESTAMPTZ NULL` | Soft delete; không xóa vật lý bài nộp trong luồng nghiệp vụ |

Quy tắc chuyển đổi:

- `audio_url` hiện là `NOT NULL`; migration phải đổi thành nullable sau khi thêm `audio_storage_key` và thêm constraint `audio_storage_key IS NOT NULL OR audio_url IS NOT NULL`.
- Dữ liệu mới chỉ ghi `audio_storage_key`. `audio_url` chỉ còn để đọc dữ liệu legacy trong thời gian backfill; tuyệt đối không ghi signed URL có hạn vào DB. Conditional CHECK bắt buộc row có storage key phải đồng thời có declared hash, size, duration, `test_id`, `speaking_group_id`, Part hợp lệ, `source_prompt_id` và `prompt_snapshot_sha256`; row legacy chỉ có URL được miễn sau khi phân loại rõ.
- `transcript` giữ để UI/đường đọc cũ hoạt động. Với dữ liệu mới, nó được cập nhật từ `display_transcript`; grader phải đọc `asr_transcript` từ artifact.
- Backfill `speaking_group_id IS NULL` bằng một UUID riêng cho từng bài legacy, sau đó áp dụng `NOT NULL` nếu audit xác nhận không còn hàng lỗi.
- Không ép `part_number NOT NULL` trước khi audit dữ liệu legacy. API mới luôn yêu cầu đủ `1, 2, 3`.
- Thêm unique index trên `(speaking_group_id, part_number)` khi hai giá trị khác `NULL`, **không** lọc `deleted_at`; soft-delete không cho phép tái dùng group/Part lịch sử. Lần nộp thay thế phải có group mới.
- Thêm unique index trên `audio_storage_key` với điều kiện `audio_storage_key IS NOT NULL`, kể cả hàng đã soft-delete; token upload bị phát lại không bao giờ có thể gắn cùng object vào bài thứ hai.
- Bổ sung giá trị `grading_failed` vào enum `submission_status`. Ba Part trong cùng group phải được cập nhật trạng thái trong một transaction.
- Sau backfill assignment legacy, CHECK buộc `assigned_tutor_id` và `assigned_tutor_at` cùng `NULL` hoặc cùng khác `NULL`; assign/unassign/claim luôn cập nhật đồng nhất cả group.

Không thêm `ai_status`, `overall_band`, `evidence_mode` hoặc `job_id` vào submission vì các dữ liệu đó đã có nguồn sự thật ở job/report.

### `ai_grading_reports`

Tái sử dụng các cột điểm hiện có (`band_score`, `coherence_score`, `lexical_score`, `grammar_score`, `fluency_score`, `pronunciation_score`), `criteria_json`, `feedback_json`, `computed_band`, `prompt_version`, `model_name`, `status`, timestamps và các trường Writing.

Các cột đề xuất bổ sung:

| Cột | Kiểu/constraint | Mục đích |
|---|---|---|
| `speaking_group_id` | `UUID NULL` | Truy vấn báo cáo cả phiên Speaking mà không dựa vào một Part ngẫu nhiên |
| `grading_job_id` | `UUID NULL REFERENCES ai_grading_jobs(id)` | Audit kết quả thuộc lần xử lý nào |
| `pipeline_version` | `VARCHAR(80)` | Version của toàn pipeline evidence/scoring |
| `calibration_version` | `VARCHAR(80)` | Version mapping đã hiệu chuẩn hoặc version scorer ước lượng (giữ tên cột để tương thích schema) |
| `evidence_mode` | `VARCHAR(32) CHECK (evidence_mode IN ('full_audio','partial_audio','transcript_only'))` | Tóm tắt mức evidence; gate thật nằm ở từng tiêu chí |
| `requires_human_review` | `BOOLEAN NOT NULL DEFAULT FALSE` | Đưa vào hàng đợi tutor hiện có |
| `deleted_at` | `TIMESTAMPTZ NULL` | Soft delete |

Quy tắc:

- `submission_id` hiện là khóa đa hình bắt buộc. Với report Speaking cấp phiên, tiếp tục neo vào submission Part 1 để tương thích, đồng thời ghi `speaking_group_id` rõ ràng.
- Không thêm `part_number` cho Speaking report. Feedback từng Part nằm trong `feedback_json.part_feedback`; band là đánh giá cả phiên.
- Với Speaking mới, `criteria_json.fluency_coherence.band` là criterion-band duy nhất; ghi nó vào `fluency_score` để tương thích. `coherence_score` giữ cho Writing và phải là `NULL` ở report Speaking mới, không được average với `fluency_score`.
- Reliability/uncertainty nội bộ từng tiêu chí và calibration bundle digest nằm trong `criteria_json` bên cạnh `evidence_status`/evidence refs; serializer learner dùng allowlist và không trả các field nội bộ này. Không tạo thêm cột JSONB trùng nghĩa.
- Không lặp lại `input_fingerprint`: report truy ra fingerprint qua `grading_job_id`.
- `computed_band` là nguồn sự thật của Overall **Speaking job-backed** và là field duy nhất status API đọc. `band_score` chỉ là mirror tương thích: transaction writer phải ghi cùng giá trị backend tính vào cả hai và CHECK chỉ áp dụng khi `submission_type='speaking' AND grading_job_id IS NOT NULL`, buộc hai cột cùng `NULL` hoặc bằng nhau. Không áp CHECK này cho Writing/legacy vì runtime hiện có semantics khác. Không bao giờ lưu Overall Speaking do provider trả; thiếu một tiêu chí làm cả hai `NULL`.
- Unique index trên `grading_job_id` khi khác `NULL`, không phụ thuộc `deleted_at`; retry luôn là job mới và một job không bao giờ có report thứ hai.
- Giữ `failed`/`needs_review` trong CHECK để đọc report legacy. Writer learner mới chỉ tạo report `completed`; lỗi trước kết quả nằm ở job và không tạo report rỗng.
- Với report job-backed mới: `speaking_group_id`, `grading_job_id`, `pipeline_version`, `evidence_mode` và version scorer/hiệu chuẩn bắt buộc có khi có band.
- Invariant legacy: `transcript_only` làm toàn bộ cột điểm Speaking bằng `NULL`; `partial_audio` hoặc `requires_human_review=TRUE` luôn làm Overall bằng `NULL`. Runtime mới không persist các mode này cho learner.
- `full_audio + completed` đòi đủ bốn criterion band, pipeline/version và evidence status `sufficient`.
- Sau audit dữ liệu cũ, thêm CHECK cho mọi cột band: `NULL` hoặc trong `0..9` và `score * 2` là số nguyên. Có thể tạo `NOT VALID` để bảo vệ write mới rồi validate sau khi sửa row legacy; không âm thầm làm tròn dữ liệu lịch sử trong migration.

### `ai_usage_logs`

Không thay schema. Mỗi lần gọi provider ghi một hàng bằng các cột đã có:

- `feature = 'speaking_grading'`.
- `entity_id = ai_grading_jobs.id::text`.
- `entity_type` theo convention `ai_grading_job/transcription`, `ai_grading_job/speech_evidence` hoặc `ai_grading_job/rubric_scoring`.
- Ghi `provider`, model đã pin, token khi provider có cung cấp, `success`, mã lỗi đã chuẩn hóa và `latency_ms`.
- Không ghi prompt, transcript, audio, signed URL hoặc raw response vào usage log.

Như vậy không cần bảng `ai_grading_job_attempts`. `attempt_count` ở job đếm lần chạy toàn pipeline; `ai_usage_logs` lưu từng lần gọi provider.

### `tutor_feedback_reports`

Tái sử dụng bảng và các cột `speaking_submission_id`, `fluency_score`, `lexical_score`, `grammar_score`, `pronunciation_score`, `band_score`, `written_feedback`. Chỉ bổ sung `deleted_at TIMESTAMPTZ NULL` để thay hard-delete đang vi phạm Constitution.

- Human review cấp phiên tiếp tục neo vào Part 1; `speaking_group_id` được suy ra qua `speaking_submissions` như code hiện hành.
- Chỉ submission được tạo ban đầu với `grader='tutor'` mới vào tutor queue. Worker learner không đổi `grader` sau lỗi.
- Queue chỉ trả metadata tối thiểu cho group chưa gán. Tutor claim bằng một transaction khóa cả group và chỉ thành công khi cả ba Part còn `pending/tutor`, chưa có assignment và chưa có active tutor report; sau claim, cả ba Part mang cùng `assigned_tutor_id` và một `assigned_tutor_at=transaction_timestamp()`. Replay lấy `claimed_at` từ timestamp đã lưu, không sinh thời gian mới. Detail, review reference, signed audio URL và grade bắt buộc scope `assigned_tutor_id=req.user.id`; admin được bypass có audit. Grade transaction khóa group, từ chối nếu assignment/status/grader đổi hoặc bất kỳ Part đã `tutor_graded`.
- Report `needs_review` cũ vẫn là reviewer reference nội bộ và không được lộ cho learner.
- Khi learner tạo manual retry child từ original job `failed`, transaction đặt cả group trở lại `status='pending', grader='ai'` trước khi enqueue; retry không liên quan tutor assignment.
- AI prelim của tutor đọc ba audio private, tạo bản nháp đủ bốn tiêu chí rồi trả trực tiếp; chỉ thao tác grade riêng của tutor mới ghi `tutor_feedback_reports`.
- Mọi query/UPSERT tutor, history, export và revoke phải thêm `deleted_at IS NULL`. Sau khi audit row legacy, thêm CHECK XOR `num_nonnulls(writing_submission_id, speaking_submission_id)=1` cùng partial unique index `speaking_submission_id WHERE speaking_submission_id IS NOT NULL AND deleted_at IS NULL` và tương tự cho `writing_submission_id`, bảo đảm report có đúng một loại submission và mỗi submission chỉ có một report active; luồng revoke đổi từ `DELETE` sang set `deleted_at` rồi lần chấm sau mới được insert row mới. Không tạo bảng audit/review mới.
- Không tạo bảng `human_reviews` hoặc `tutor_assignments` mới.

## Bảng mới 1: `ai_grading_jobs`

Đây là bảng operational, thay đổi trong quá trình xử lý nhưng được soft-delete và giữ đủ metadata để audit.

| Cột | Kiểu/constraint đề xuất | Ghi chú |
|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Job ID công khai dạng opaque |
| `submission_type` | `VARCHAR(20) NOT NULL CHECK (submission_type IN ('writing','speaking'))` | Phiên đầu dùng Speaking; thiết kế dùng chung |
| `group_id` | `UUID NOT NULL` | `speaking_group_id` hoặc `writing_group_id` |
| `user_id` | `UUID NOT NULL REFERENCES users(id)` | Ownership và quota |
| `idempotency_key` | `VARCHAR(128) NOT NULL CHECK (length(trim(idempotency_key)) BETWEEN 16 AND 128)` | Từ header `Idempotency-Key`, không chứa PII |
| `idempotency_expires_at` | `TIMESTAMPTZ NOT NULL` | Mốc kết thúc replay window đã duyệt; key không bao giờ được tái sử dụng sau mốc này |
| `input_fingerprint` | `CHAR(64) NOT NULL CHECK (input_fingerprint ~ '^[0-9a-f]{64}$')` | SHA-256 canonical của `test_id`, ba `test_passages.id` và ba `audio_storage_key` do server sinh theo Part; không dùng prompt text/checksum client |
| `pipeline_version` | `VARCHAR(80) NOT NULL CHECK (length(trim(pipeline_version)) > 0)` | Nhãn release/audit dễ đọc; exact config identity nằm ở digest kế tiếp |
| `scoring_config_sha256` | `CHAR(64) NOT NULL CHECK (scoring_config_sha256 ~ '^[0-9a-f]{64}$')` | Digest manifest bất biến pin toàn bộ prompt/provider/media/feature/calibrator config lúc enqueue |
| `calibration_bundle_sha256` | `CHAR(64) NULL CHECK (calibration_bundle_sha256 ~ '^[0-9a-f]{64}$')` | Bundle pin lúc enqueue; có thể `NULL` cho kết quả luyện tập AI-estimated có nhãn rõ ràng |
| `status` | `VARCHAR(32) NOT NULL CHECK (status IN ('queued','running','retry_wait','completed','needs_review','failed'))` | Trạng thái lifecycle |
| `stage` | `VARCHAR(32) NOT NULL CHECK (stage IN ('queued','validating_audio','analyzing','scoring','calibrating','finalizing'))` | Stage cuối/hiện tại |
| `attempt_count` | `SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)` | Tăng nguyên tử khi worker claim |
| `lease_generation` | `INTEGER NOT NULL DEFAULT 0 CHECK (lease_generation >= 0)` | Fencing token độc lập; tăng ở mỗi lần claim/reclaim để worker cũ không thể ghi |
| `max_attempts` | `SMALLINT NOT NULL CHECK (max_attempts IN (1,2))` | Original job đặt `2`, manual retry child đặt `1`; tổng chain không quá `3` |
| `run_after` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Backoff và lịch claim |
| `lease_owner` | `VARCHAR(128) NULL` | Instance worker đang giữ job |
| `lease_expires_at` | `TIMESTAMPTZ NULL` | Watchdog thu hồi job chết |
| `last_error_code` | `VARCHAR(80) NULL` | Mã lỗi an toàn để client/map retry |
| `last_error_message` | `TEXT NULL` | Thông tin vận hành đã loại PII, không trả thẳng ra client |
| `last_error_retryable` | `BOOLEAN NULL` | Quyết định retry endpoint |
| `retry_of_job_id` | `UUID NULL REFERENCES ai_grading_jobs(id)` | Lần retry thủ công tạo job mới, giữ lịch sử |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |  |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Trigger `set_updated_at()` hiện có |
| `finished_at` | `TIMESTAMPTZ NULL` | Thời điểm vào trạng thái terminal |
| `deleted_at` | `TIMESTAMPTZ NULL` | Soft delete |

Constraint/index bắt buộc:

1. Unique `(user_id, idempotency_key)` để hai request đồng thời chỉ tạo một job. Cùng key lookup chỉ so canonical request fingerprint rồi replay **pipeline/config đã lưu trên job**, không so registry hiện tại; payload khác trả `409 IDEMPOTENCY_KEY_REUSED`. Sau `idempotency_expires_at`, trả `410 IDEMPOTENCY_WINDOW_EXPIRED` và không cho tái sử dụng key.
2. Unique original job `(user_id, submission_type, input_fingerprint)` với điều kiện `retry_of_job_id IS NULL`; giữ hiệu lực ở mọi status và cả khi soft-delete. Submission endpoint không tạo regrade qua deploy/config mới: cùng fingerprint nhưng key khác trả `409 DUPLICATE_GRADING_REQUEST` kèm canonical IDs. Regrade là contract riêng, không tái bind storage key và không thuộc feature này.
3. Unique original job `(submission_type, group_id)` khi `retry_of_job_id IS NULL`, không phụ thuộc status/deleted/config; một group của feature này có đúng một root chain nên status lookup không phụ thuộc global active pipeline. Partial unique active job trên group vẫn bảo vệ queue nếu schema sau này thêm regrade có audit.
4. Unique `retry_of_job_id` khi khác `NULL`; một terminal job chỉ sinh tối đa một manual retry trực tiếp. Original job chạy tối đa hai attempt tự động, manual child tối đa một attempt, nên tổng chain không quá ba. Child phải copy đúng `pipeline_version`, `scoring_config_sha256` và `calibration_bundle_sha256` của parent; service/trigger từ chối digest khác. Chỉ parent job gốc `failed` sau đủ hai attempt và lỗi provider retryable được tạo child; job mới không dùng `needs_review` để handoff tutor.
5. Claim index `(status, run_after, lease_expires_at, created_at)` với `deleted_at IS NULL`.
6. Index `(user_id, group_id, created_at DESC)` cho status API và authorization.
7. Table CHECK `attempt_count <= max_attempts`. `retry_wait` chỉ hợp lệ với `(max_attempts,attempt_count)=(2,1)`; manual child `max_attempts=1` không vào `retry_wait` và không có `can_retry`. Khi terminal, lease phải rỗng và `finished_at` phải có; khi non-terminal, `finished_at` phải `NULL`.

Không có `progress_json`: stage nằm ở job, còn tiến độ/component từng Part được suy ra từ artifact. Việc bỏ field này tránh thêm một nguồn trạng thái mutable và không làm lộ kết quả trung gian.

Status query theo group lấy **root job duy nhất đã persist cùng group**, không tra global registry/pipeline hiện hành, rồi `LEFT JOIN` child qua `retry_of_job_id`; nếu child tồn tại thì child là canonical bất kể state, nếu không dùng root. Deploy không đổi chain lịch sử. Mọi field status/report projection lấy từ cùng canonical job. Retry cùng key replay child; retry key khác khi child đã tồn tại trả `409 RETRY_ALREADY_CREATED`, không lưu alias.

`attempt_count` chỉ đếm ngân sách chạy pipeline; `lease_generation` là fencing token độc lập. Claim/reclaim tăng `lease_generation`, còn `attempt_count` chỉ tăng khi bắt đầu một attempt mới. Mọi heartbeat, artifact terminal write, report insert và final status transaction phải kiểm `job_id + lease_owner + lease_generation + status='running'`; artifact write khóa/verify job trong cùng transaction. Watchdog cũng khóa/CAS row trước khi thu hồi. Worker cũ quay lại sau khi lease hết hạn phải nhận zero-row/CAS failure và bỏ output, không được ghi cache/report hoặc chuyển terminal.

## Bảng mới 2: `speaking_analysis_artifacts`

Một hàng biểu diễn evidence của một Part, một audio hash và một scoring-config digest. Hàng có thể được cập nhật trong lúc `processing`; sau `complete`/`partial` thì bất biến ở tầng service.

| Cột | Kiểu/constraint đề xuất | Ghi chú |
|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |  |
| `speaking_submission_id` | `UUID NOT NULL REFERENCES speaking_submissions(id)` | Evidence thuộc đúng một Part |
| `source_job_id` | `UUID NOT NULL REFERENCES ai_grading_jobs(id)` | Job tạo artifact lần đầu |
| `audio_sha256` | `CHAR(64) NOT NULL CHECK (audio_sha256 ~ '^[0-9a-f]{64}$')` | Checksum do worker tính, đối chiếu với submission/object |
| `schema_version` | `SMALLINT NOT NULL DEFAULT 1 CHECK (schema_version > 0)` | Version cấu trúc các JSONB |
| `pipeline_version` | `VARCHAR(80) NOT NULL` | Nhãn audit/diagnostic dễ đọc; không phải cache authority |
| `scoring_config_sha256` | `CHAR(64) NOT NULL CHECK (scoring_config_sha256 ~ '^[0-9a-f]{64}$')` | Exact manifest digest pin trên source job; cache authority |
| `status` | `VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','complete','partial','failed'))` | Chỉ terminal artifact được dùng để chấm |
| `language_code` | `VARCHAR(16) NOT NULL DEFAULT 'en'` | Ngôn ngữ nhận dạng |
| `asr_transcript` | `TEXT NULL` | Output provider trước hậu xử lý ứng dụng; không được gọi là verbatim/ground truth |
| `display_transcript` | `TEXT NULL` | Chỉ để hiển thị; không thay ASR input khi chấm |
| `asr_uncertainty_json` | `JSONB NULL` | Logprob/no-speech/alternatives đã whitelist; không phải criterion confidence |
| `provider_manifest_json` | `JSONB NOT NULL DEFAULT '{}'` | Provider/model/config version cho từng component |
| `component_status_json` | `JSONB NOT NULL DEFAULT '{}'` | Trạng thái/lỗi chuẩn hóa của STT, quality, fluency, pronunciation |
| `words_json` | `JSONB NULL` | Word, start/end, provider uncertainty/logprob; schema whitelist |
| `segments_json` | `JSONB NULL` | Segment, start/end, provider uncertainty/logprob; schema whitelist |
| `audio_quality_json` | `JSONB NULL` | Duration đo lại, silence, clipping, SNR/quality flags |
| `fluency_metrics_json` | `JSONB NULL` | Speech/articulation rate, pause, filler, repair, mean length of run |
| `pronunciation_evidence_json` | `JSONB NULL` | Acoustic proxies cùng provider-local recognized words/timestamps đã whitelist và alignment/disagreement với ASR chính; không ghi intelligibility trực tiếp nếu chưa có mapping human-rated |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |  |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Trigger `set_updated_at()`; chỉ thay đổi lúc processing |
| `finalized_at` | `TIMESTAMPTZ NULL` | Bắt buộc khi terminal |
| `deleted_at` | `TIMESTAMPTZ NULL` | Soft delete |

Constraint/index bắt buộc:

1. Unique `(speaking_submission_id, audio_sha256, scoring_config_sha256)` không phụ thuộc `deleted_at`; hai worker không tạo hai artifact cùng exact config và soft-delete không mở đường ghi đè lịch sử. Nhãn `pipeline_version` không phải cache key duy nhất.
2. Index `(source_job_id, status)` và `(speaking_submission_id, created_at DESC)`.
3. Artifact chỉ được dùng khi `status IN ('complete','partial')`, checksum khớp submission và `scoring_config_sha256`/provider manifest khớp digest **đã pin trên job**, không tra registry active mới tại thời điểm worker chạy.
4. `complete` đòi đủ component mà `full_audio` yêu cầu. `partial` phải chỉ rõ component thiếu; nó chỉ hỗ trợ band cho tiêu chí có evidence `sufficient` trên đủ ba Part. Artifact `failed` không được dùng để chấm.
5. CHECK terminal: `processing` đi với `finalized_at IS NULL`; `complete|partial|failed` đi với `finalized_at IS NOT NULL`. Tầng service cấm sửa evidence sau terminal.
6. Không lưu raw provider payload. Mỗi JSONB phải validate theo JSON Schema gắn với `schema_version` và bị giới hạn: manifest/status 32 KiB mỗi trường, words 1 MiB, segments 512 KiB, quality 128 KiB, fluency 256 KiB, pronunciation 2 MiB.

Ví dụ manifest tối thiểu:

```json
{
  "transcription": { "provider": "openai", "model": "whisper-1", "config_version": "stt-v1", "locale": "en" },
  "speech_evidence": { "provider": "azure", "model": "pronunciation-assessment", "config_version": "pa-v1", "locale": "en-US", "sdk_version": "pinned", "recognition_mode": "continuous" },
  "media": { "ffmpeg_build": "pinned", "normalizer_version": "audio-v1" },
  "local_metrics": { "feature_schema_version": "fluency-v1" }
}
```

Tên provider trong ví dụ là đề xuất nghiên cứu, chưa được xem là RFC đã phê duyệt.

## Cấu trúc kết quả trong `criteria_json`

Tận dụng cột JSONB hiện có thay vì thêm nhiều cột reliability/evidence:

```json
{
  "_calibration": {
    "version": "vi-ielts-v1",
    "bundle_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "reliability_target": "absolute_error_lte_0_5"
  },
  "fluency_coherence": {
    "band": 6.5,
    "evidence_status": "sufficient",
    "evidence_refs": ["artifact-id:fluency", "artifact-id:coherence"],
    "uncertainty": {
      "reliability_bucket": "fc-b6-quality-a",
      "point_estimate": 0.86,
      "lower_95_ci": 0.81,
      "upper_95_ci": 0.90,
      "speaker_count": 214,
      "session_count": 238,
      "method": "speaker-cluster-bootstrap-adjacent-agreement",
      "version": "reliability-v1"
    }
  },
  "lexical_resource": {
    "band": 6.5,
    "evidence_status": "sufficient",
    "evidence_refs": ["artifact-id:asr"],
    "uncertainty": { "reliability_bucket": "lr-b6-quality-a", "point_estimate": 0.88, "lower_95_ci": 0.84, "upper_95_ci": 0.92, "speaker_count": 226, "session_count": 247, "method": "speaker-cluster-bootstrap-adjacent-agreement", "version": "reliability-v1" }
  },
  "grammatical_range_accuracy": {
    "band": 6.0,
    "evidence_status": "sufficient",
    "evidence_refs": ["artifact-id:asr"],
    "uncertainty": { "reliability_bucket": "gra-b6-quality-a", "point_estimate": 0.81, "lower_95_ci": 0.76, "upper_95_ci": 0.85, "speaker_count": 219, "session_count": 241, "method": "speaker-cluster-bootstrap-adjacent-agreement", "version": "reliability-v1" }
  },
  "pronunciation": {
    "band": 6.0,
    "evidence_status": "sufficient",
    "evidence_refs": ["artifact-id:pronunciation"],
    "uncertainty": { "reliability_bucket": "pr-b6-quality-a", "point_estimate": 0.78, "lower_95_ci": 0.72, "upper_95_ci": 0.83, "speaker_count": 205, "session_count": 229, "method": "speaker-cluster-bootstrap-adjacent-agreement", "version": "reliability-v1" }
  }
}
```

Các số trên chỉ minh họa shape, **không phải ngưỡng được phê duyệt**. Event đích là `abs(system_band - adjudicated_human_band) <= 0.5`; bucket rules khóa trước evaluation và per-result dùng `lower_95_ci` làm tín hiệu abstention. CI dùng bootstrap theo cụm speaker để nhiều session của một người không bị coi là độc lập; bundle ghi speaker/session count, numerator/denominator, population/slice, dataset hash và minimum speaker count. Trước gate/bucket thiếu mẫu, `uncertainty=null` và handoff. Object này chỉ dành cho audit nội bộ.

Calibration source of truth là bundle bất biến trong build artifact/private object store. Registry chỉ chọn digest **lúc enqueue**; job pin `scoring_config_sha256` và `calibration_bundle_sha256`, sau đó worker luôn load đúng digest đã pin dù registry đổi. Scoring-config manifest khóa prompt hash/schema, ASR và speech provider/model/locale/SDK/config, media decoder/ffmpeg build/normalizer, local feature schema và calibrator bundle. Worker fail closed nếu lookup/signature/digest/binding sai; report truy đúng digest qua `grading_job_id`, không lặp dữ liệu. Không tạo bảng calibration thứ ba.

Validator áp dụng:

- `band != null` chỉ khi `evidence_status='sufficient'` trên đủ ba Part và đúng calibration binding.
- `fluency_coherence.band != null` chỉ khi cả acoustic Fluency evidence và ASR-fidelity/semantic Coherence evidence đều `sufficient`; thiếu một vế làm criterion `null`.
- Speaking Overall dùng decimal: `mean=sum(bốn criterion)/4`, kết quả `floor(mean*2+0.5)/2`. Tie `.25/.75` hướng lên; không dùng floating binary/banker's rounding. Chỉ ghi sau khi thuật toán được hội đồng duyệt.
- `partial_audio`: tiêu chí thiếu evidence có band `null`; `band_score`/`computed_band` luôn `null`.
- `transcript_only`: cả bốn criterion band và `band_score`/`computed_band` đều `null`; feedback chữ nằm trong `feedback_json.text_based_feedback`.

## Vòng đời dữ liệu và transaction

### Tạo bài và enqueue

Token AEAD có version/`kid`; KMS/key ring giữ decrypt-only key cũ ít nhất tới `idempotency_expires_at` lớn nhất cộng clock skew. Trước decrypt, chạy read-only fast lookup `(user_id,idempotency_key)`: row đã hết window trả `410` ngay; row còn window mới decrypt để so fingerprint; key không tồn tại đi theo request mới. Với candidate mới, kiểm token expiry và chạy Storage HEAD/stat song song **ngoài** DB transaction; không giữ advisory lock trong external I/O. Transaction sau đó vẫn lặp authoritative lookup để chống race.

Trong một transaction:

1. Resolve/join và khóa authoritative test/prompt rows: test phải `skill='speaking'`, published/accessible cho learner; ba passage đúng test/Part. Tính RFC-8785 fingerprint và prompt snapshot/hash từ `title/instruction/content` chính thức.
2. Lấy advisory lock theo `(user_id, UTC-date)`, rồi **lặp lại** authoritative lookup `(user_id,idempotency_key)` trước quota. Nếu tồn tại và request fingerprint khớp, replay job/config đã lưu bất kể deploy hiện tại; nếu khác trả `409 IDEMPOTENCY_KEY_REUSED`.
3. Lookup original job theo unique fingerprint. Nếu đã tồn tại với key khác, trả `409 DUPLICATE_GRADING_REQUEST` cùng canonical IDs cho đúng owner; không tạo alias key hoặc row mới.
4. Chỉ với request hoàn toàn mới, xác nhận preflight token/stat result còn hợp lệ, resolve registry thành immutable scoring-config/calibration digest và đếm/reserve quota. Original job mới tính quota; retry/replay không tính lại.
5. Sinh group, insert job với config digests/idempotency expiry, rồi tạo ba submissions gồm source prompt ID/snapshot/hash và private-audio metadata. Unique object key thực hiện atomic bind-once; conflict rollback.
6. Chỉ trả `202` sau commit.

Không gọi provider và không tạo report trong request transaction.

Không thêm bảng quota. Để quota 10 lần/ngày là nguyên tử, mọi entrypoint AI Writing/Speaking phải dùng cùng advisory-lock convention và đếm distinct original Speaking jobs cùng distinct Writing groups đã được chấp nhận trong ngày UTC. Nếu Writing chưa chuyển sang convention này, không được tuyên bố quota dùng chung đã production-ready.

Upload cleanup không cần bảng asset: reconciler quét quarantine object quá 24 giờ (luôn lớn hơn cả URL TTL, application-token TTL và clock-skew allowance), batch-query `speaking_submissions.audio_storage_key` và chỉ xóa key không được bind. Không dùng storage lifecycle mù trên toàn prefix; tag/metadata có thể tối ưu nhưng DB là nguồn quyết định cuối.

### Worker claim và hoàn tất

- Worker dùng transaction ngắn với `FOR UPDATE SKIP LOCKED`, chỉ claim job đủ `run_after` và lease trống/hết hạn.
- Worker tải object, tính SHA-256 từ bytes thật, so với `declared_audio_sha256`, rồi mới cập nhật `speaking_submissions.audio_sha256`; mismatch/format/decode lỗi là non-retryable và không gọi provider.
- Provider call chạy ngoài transaction DB.
- Artifact từng Part được upsert theo unique key; terminal artifact không bị ghi đè.
- Khi đủ transcript + audio evidence: transaction cuối insert report `completed/full_audio`, cập nhật ba submission sang `ai_graded`, job sang `completed` và xóa lease. Kết quả chưa có bundle dùng estimation version và disclaimer.
- Khi evidence/provider không đủ: worker retry theo policy rồi cập nhật ba submission sang `grading_failed`, job sang `failed`; không tạo report giả và không đổi `grader`.
- Nếu hết retry: cập nhật ba submission sang `grading_failed`, job sang `failed`; không tạo report giả.
- Watchdog đưa job lease hết hạn về `queued` hoặc `failed` theo `attempt_count`.

## Tương thích runtime và soft-delete

- Feature flag phải tắt writer Speaking sync cũ cho cohort trước khi bật writer job mới; hai writer không được cùng chấm một group.
- Reader mới chọn report job-backed theo `speaking_group_id`, terminal `grading_job_id`, `status IN ('completed','needs_review')` và `deleted_at IS NULL`; `needs_review` chỉ phục vụ lịch sử, còn writer mới chỉ tạo `completed`. Chỉ fallback aggregate Part legacy khi group chưa có job.
- Writer mới không tạo failed report. Reader vẫn hiểu failed report legacy nhưng không ưu tiên nó hơn report job-backed.
- Trước khi dùng partial unique/soft-delete, mọi query history, tutor queue, export, aggregate, audio authorization và admin phải lọc `deleted_at IS NULL`; nếu chưa hoàn tất thì không bật replacement row/soft-delete path.
- Audio authorization hiện tại phải được sửa để tutor chỉ đọc group đã được assign; đổi public URL thành signed URL mà giữ query scope cũ vẫn là IDOR.

## Bảng legacy không tham gia

| Bảng | Quyết định |
|---|---|
| `speaking_attempts` | Giữ nguyên, không đọc/ghi/dual-write; không khớp runtime source of truth hiện tại |
| `speaking_attempt_answers` | Giữ nguyên; mô hình audio từng câu và `question_index` không khớp một audio/Part |
| `tutor_grading_reports` | Giữ nguyên như legacy; runtime dùng `tutor_feedback_reports` |

Không DROP hoặc migrate dữ liệu legacy trong feature này. Việc dọn bảng phải là feature riêng sau usage audit và backup.

## Thứ tự migration đã triển khai

### `008a_bootstrap_missing_prerequisites.sql`

1. Khôi phục các enum legacy mà migration `009`–`013` dùng nhưng thứ tự lịch sử chưa bảo đảm.
2. Bootstrap `library_resources` theo đúng thân bảng đã có ở migration `012`, vì migration `011` tham chiếu bảng này trước `012`.
3. Đây không phải bảng feature AI: database đã có bảng thì `IF NOT EXISTS` là no-op; static test khóa schema bootstrap phải trùng migration `012` để không phát sinh biến thể thừa.

### `025_harden_ai_grading_schema.sql`

1. Audit enum/cột/index hiện có và duplicate group/part.
2. Thêm `grading_failed` vào `submission_status` theo cách an toàn với PostgreSQL version hiện dùng.
3. Thêm cột/timestamp/soft delete vào `speaking_submissions`; đổi `audio_url` nullable sau khi có check thay thế.
4. Tạo `ai_grading_jobs`, trigger và index.
5. Thêm cột Speaking/job/version/review vào `ai_grading_reports` sau khi job table tồn tại.
6. Thêm `deleted_at` vào `tutor_feedback_reports`, đổi revoke/read path sang soft-delete.
7. Backfill `speaking_group_id`; tạo unique index sau khi báo cáo duplicate bằng 0.

### `026_create_speaking_analysis_artifacts.sql`

1. Tạo `speaking_analysis_artifacts` và index.
2. Không backfill transcript legacy thành artifact và không tạo synthetic job: dữ liệu cũ không có `source_job_id`, verified audio hash hoặc scoring-config digest đáng tin cậy.
3. Dual-read có giới hạn: ưu tiên artifact terminal mới; fallback `speaking_submissions.transcript` chỉ để hiển thị, không dùng làm evidence chấm mới.
4. Sau khi private storage rollout ổn định mới ngừng đọc `audio_url`; không xóa cột trong release này.

## Cổng an toàn migration production

Runner đã được harden bằng `schema_migrations`, checksum SHA-256, PostgreSQL advisory lock, transaction theo file và exit code khác 0 khi lỗi. Tuy nhiên lượt này chưa chạy lên PostgreSQL disposable/staging thật, vì vậy:

- Không chạy thẳng `008a`, `025`, `026` trên production chỉ dựa vào static test.
- Nếu nền tảng đã có migration history tương đương, phải reuse cơ chế đó thay vì tạo metadata trùng; nếu chưa có, dùng `schema_migrations` dùng chung của runner đã harden.
- Chạy duplicate/orphan report ở chế độ chỉ đọc trước khi thêm constraint.
- Chạy fresh/legacy migration, concurrency và backup/restore rehearsal trên database disposable/staging; rollback ứng dụng phải tương thích cột mới, không rollback bằng DROP dữ liệu.

## Checklist tránh thêm thừa

- [x] Group: dùng `speaking_group_id` hiện có.
- [x] Submission: dùng `speaking_submissions` hiện có.
- [x] Báo cáo AI: dùng `ai_grading_reports` hiện có.
- [x] Usage/provider attempts: dùng `ai_usage_logs` hiện có.
- [x] Tutor review/assignment: dùng `tutor_feedback_reports` và `assigned_tutor_id` hiện có.
- [x] Audio object: dùng private Storage + `audio_storage_key`, không thêm bảng asset.
- [x] Evidence có phiên bản: cần một bảng mới vì cột transcript hiện tại bị ghi đè.
- [x] Durable job/idempotency: cần một bảng mới vì report không thể làm queue an toàn.
