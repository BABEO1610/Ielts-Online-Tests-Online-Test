# Hợp đồng API: Speaking grading bất đồng bộ

**Đường dẫn gốc**: `/api/v1/submissions`

**Trạng thái**: Hợp đồng triển khai cho `AI Estimated Band` đủ bốn tiêu chí; calibration/RFC vẫn là cổng để nâng kết quả thành mức đã hiệu chuẩn, không phải điều kiện handoff tutor

**Xác thực**: `cookieAuth` bằng HttpOnly `accessToken` hiện hành; các POST kiểm `Origin`/CSRF policy tương ứng.

## Quy ước chung

Response thành công:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Response lỗi:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Thông báo an toàn cho người dùng",
    "details": null
  },
  "meta": { "request_id": "req_opaque" }
}
```

- Không trả stack trace, lỗi SQL, provider response, object key hoặc signed URL trong error.
- UUID/job ID là opaque; client không được suy luận cấu trúc từ ID.
- Thời gian dùng ISO 8601 UTC.
- Tên field JSON dùng `snake_case` để khớp convention API feature này; adapter frontend chịu trách nhiệm map nếu UI dùng camelCase.
- `Retry-After` được trả trên `202`/`429` khi có thể.

## 1. Xin quyền upload audio

### `POST /api/v1/submissions/speaking/audio-uploads`

Cấp quyền upload trực tiếp vào private bucket. Endpoint không nhận bytes audio và không trả public URL.

Role: chỉ `student` đang active và là owner của submission intent.

Request:

```json
{
  "part_number": 1,
  "content_type": "audio/mp4",
  "size_bytes": 1843200,
  "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "duration_ms": 52341
}
```

Validation trước khi cấp token:

- `part_number` thuộc `1..3`.
- `size_bytes > 0` và không quá 50 MB.
- Contract đang khóa theo G-03: mp3, m4a/`audio/mp4`, wav. `audio/webm` chỉ được nhận sau RFC format; UI hiện fallback WebM nên browser không hỗ trợ format khóa phải bị chặn rõ ràng trước khi ghi âm/nộp.
- `content_type` client chỉ là hint; worker vẫn kiểm magic bytes/container/codec.
- `sha256` đúng 64 ký tự hex nhưng chỉ là checksum client khai báo. Worker phải tự hash bytes; không dùng giá trị này để dedupe/quota trước validate.
- `duration_ms` nằm trong giới hạn cấu hình hợp lý, nhưng không được tin làm duration chính thức.
- Áp rate limit theo user. Quota grading được reserve nguyên tử lúc submit full, không trừ ngay ở bước xin upload.

Response `201 Created`:

```json
{
  "success": true,
  "data": {
    "upload_url": "https://storage.example/signed-upload",
    "upload_token": "v1.kid1.opaque-encrypted-application-token",
    "required_headers": {
      "content-type": "audio/mp4"
    },
    "upload_url_expires_at": "2026-07-22T01:10:00.000Z",
    "upload_token_expires_at": "2026-07-22T01:08:00.000Z",
    "max_size_bytes": 52428800
  },
  "error": null,
  "meta": {}
}
```

`upload_token` là application token **opaque AEAD** do backend mã hóa/xác thực, ràng buộc `user_id`, object key do server sinh, Part, declared content type/size/hash/duration và app-token expiry. Envelope token có version + authenticated `kid`; KMS/key ring dùng key active để mã hóa và giữ key cũ ở chế độ decrypt-only ít nhất tới hết idempotency replay window cộng clock skew. Client không nhận object key riêng.

Client phải gửi đúng toàn bộ `required_headers`; adapter S3 có thể bổ sung checksum/content-length conditions. Dù Storage cưỡng chế checksum, worker vẫn xác nhận bytes trước khi tạo evidence.

Không có bảng upload state nên token không thể bị revoke/lock/đánh dấu consumed trước khi bind. Hai replay đồng thời được giải quyết tại transaction insert: unique `audio_storage_key` chỉ cho một submission thắng; replay cùng canonical payload nhận job hiện có, payload khác trả conflict. Signed upload phải `upsert=false`; object tạm nằm dưới quarantine prefix. Cleanup reconciler chỉ xóa object quá 24 giờ sau khi cross-check key không tồn tại trong DB, không dùng blind lifecycle.

Hai thời hạn có nghĩa khác nhau: `upload_url_expires_at` là TTL của storage signed URL, còn `upload_token_expires_at` là TTL của application token dùng để bind submission. Client phải hoàn tất upload **và submit trước thời điểm sớm hơn**. Ví dụ trên là target S3 theo Constitution. Nếu RFC chọn Supabase, signed-upload URL hiện có thời hạn cố định khoảng hai giờ; app-token ngắn hơn không thu hồi được storage URL đã phát nên response phải trả đúng cả hai mốc. Cleanup quarantine 24 giờ phải lớn hơn hai TTL cộng clock-skew allowance.

Mã lỗi chính:

| HTTP | Code | Khi nào |
|---|---|---|
| `400` | `UNSUPPORTED_AUDIO_FORMAT` | MIME/container không được hỗ trợ |
| `400` | `INVALID_AUDIO_METADATA` | Size/hash/duration/Part không hợp lệ |
| `413` | `AUDIO_TOO_LARGE` | Quá 50 MB |
| `429` | `UPLOAD_RATE_LIMITED` | Vượt rate limit |
| `503` | `STORAGE_UNAVAILABLE` | Không cấp được signed upload |

## 2. Nộp đủ ba Part và enqueue

### `POST /api/v1/submissions/speaking/full`

Role: chỉ `student`; `req.user.id` từ HttpOnly cookie là owner, không nhận `user_id` từ body.

Header bắt buộc:

```http
Idempotency-Key: 8d0e5d44-31c8-4f18-aafe-29a187ef14ef
```

Request:

```json
{
  "test_id": "bdb0eabe-79b7-4b5f-83e7-7c93f5acaf18",
  "grader": "ai",
  "parts": [
    {
      "part_number": 1,
      "prompt_id": "d4cc7bea-1355-4e48-92fc-76ee0c8f3497",
      "upload_token": "v1.kid1.opaque-encrypted-part-1-token"
    },
    {
      "part_number": 2,
      "prompt_id": "8408202c-fe46-4c58-a95c-b8afaf2d920d",
      "upload_token": "v1.kid1.opaque-encrypted-part-2-token"
    },
    {
      "part_number": 3,
      "prompt_id": "630e8104-9c40-4c40-93be-c1d24db659bf",
      "upload_token": "v1.kid1.opaque-encrypted-part-3-token"
    }
  ]
}
```

Validation/transaction:

- `parts` có đúng ba phần tử và tập `part_number` bằng `{1,2,3}`; không nhận trùng/thiếu Part.
- Mỗi `prompt_id` phải join tới `test_passages`/`mock_tests` đúng `test_id` và `passage_number=part_number`; test bắt buộc `skill='speaking'`, đã published/đến thời điểm publish, chưa bị vô hiệu và learner có quyền làm test. Backend snapshot chuẩn hóa `title + instruction + content`, lưu source UUID và snapshot hash; endpoint không nhận/tin prompt text tự do.
- Với request mới, mỗi upload token phải còn hạn, thuộc đúng user/Part và trỏ tới object đã upload. Replay cùng idempotency key được nhận diện từ token có chữ ký hợp lệ trước bước expiry nên không thất bại chỉ vì token hết hạn sau lần submit đã commit.
- Storage stat phải khớp size sơ bộ; declared hash/content type vẫn chưa được coi là tin cậy. Worker hash/decode bytes trước provider call.
- Dựng canonical fingerprint từ `test_id`, ba prompt ID chính thức và ba server-generated storage key theo Part. Trong một DB transaction, lấy advisory lock theo user + ngày UTC; lookup idempotency key/fingerprint **trước quota**; chỉ request hoàn toàn mới mới reserve quota 10 original jobs/ngày, insert job reservation rồi tạo ba `speaking_submissions`. Unique object key thực hiện atomic bind-once.
- Request không chờ STT/grader.

Response `202 Accepted`:

Headers:

```http
Location: /api/v1/submissions/speaking/ad344881-f357-4e2a-a78b-57c91b90898e/grading-status
Retry-After: 3
```

```json
{
  "success": true,
  "data": {
    "speaking_group_id": "ad344881-f357-4e2a-a78b-57c91b90898e",
    "job_id": "fcf824ee-341f-4462-a00a-67b19ee79502",
    "status": "queued",
    "stage": "queued",
    "status_url": "/api/v1/submissions/speaking/ad344881-f357-4e2a-a78b-57c91b90898e/grading-status",
    "submitted_at": "2026-07-22T01:00:00.000Z"
  },
  "error": null,
  "meta": {}
}
```

Idempotency:

- Cùng user + `Idempotency-Key` + cùng canonical payload trả lại đúng group/job và **accepted representation ban đầu** (`status='queued'`, cùng `Location`/status URL); trạng thái hiện tại luôn đọc từ polling endpoint. Không tạo submission/report/provider call mới.
- Cùng key nhưng payload khác trả `409 IDEMPOTENCY_KEY_REUSED`.
- Hai request dùng cùng fingerprint nhưng **khác key** trả `409 DUPLICATE_GRADING_REQUEST` kèm canonical `speaking_group_id`/`job_id` cho đúng owner. Không trả replay thành công cho key chưa được lưu và không thêm bảng alias. Cùng bytes được upload lại dưới object key mới là submission mới và chịu quota; không hứa content-dedupe trước khi worker tính checksum thật.
- Lookup/replay/conflict ở hai dòng trên diễn ra trước quota. Vì vậy replay hợp lệ vẫn trả canonical job khi user đã đủ 10 lượt; request đồng thời thứ hai không thể bị `429` trước khi unique/idempotency được giải quyết.
- Replay guarantee có thời hạn `idempotency_expires_at` persist trên job (giá trị retention cụ thể thuộc governance). Trong window, key rotation không được phá replay vì decrypt key cũ còn trong key ring. Sau window, server trả `410 IDEMPOTENCY_WINDOW_EXPIRED`, không tái sử dụng key và không tạo submission mới từ storage key đã bind.
- Request xử lý fast lookup `(user,idempotency-key)` trước khi decrypt upload token: row hết window trả `410`; row còn window giải mã token rồi đối chiếu trực tiếp `test_id`, ba prompt ID, object key, hash, size và duration với ba submission snapshot đã commit, không resolve lại đề có thể đã đổi. Key vắng mới chạy validation/Storage stat cho submission mới và lặp authoritative lookup trong transaction để xử lý race.
- Retry do worker không tính thêm quota người học. Một lần nộp mới có input khác mới tiêu thụ quota.

Mã lỗi chính:

| HTTP | Code | Khi nào |
|---|---|---|
| `400` | `SPEAKING_PARTS_INCOMPLETE` | Không đúng Part 1, 2, 3 |
| `400` | `UPLOAD_TOKEN_INVALID` | Token sai chữ ký/metadata |
| `409` | `UPLOAD_TOKEN_ALREADY_USED` | Object đã gắn vào submission khác |
| `409` | `IDEMPOTENCY_KEY_REUSED` | Key cũ nhưng payload khác |
| `409` | `DUPLICATE_GRADING_REQUEST` | Key khác nhưng canonical fingerprint đã có original job |
| `410` | `UPLOAD_TOKEN_EXPIRED` | Token hết hạn |
| `410` | `IDEMPOTENCY_WINDOW_EXPIRED` | Key đã qua replay window đã persist; không được tái sử dụng |
| `422` | `AUDIO_OBJECT_MISSING` | Upload chưa hoàn thành hoặc object không tồn tại |
| `429` | `DAILY_GRADING_QUOTA_EXCEEDED` | Vượt quota submission mới |

## 3. Theo dõi trạng thái và lấy kết quả

### `GET /api/v1/submissions/speaking/{speakingGroupId}/grading-status`

Chỉ owner, tutor được phân công hoặc admin có quyền đọc.

Job canonical của status endpoint được chọn xác định theo chain đã persist: mỗi group có đúng một root job, không tra registry/pipeline đang active sau deploy; nếu root có manual retry child thì child luôn thay parent làm job hiển thị, dù child đang chạy hay đã terminal. Vì `retry_of_job_id` unique, chain chỉ có tối đa một child. `job_id`, `status`, `attempt_count`, `can_retry` và `result` đều phải đến từ cùng job canonical này; không trộn trạng thái parent với report child.

Response bắt buộc có `Cache-Control: private, no-store` và không được CDN/proxy-cache vì cùng URL có projection khác nhau theo owner/assigned tutor/admin.

Response khi đang xử lý `200 OK`:

```json
{
  "success": true,
  "data": {
    "speaking_group_id": "ad344881-f357-4e2a-a78b-57c91b90898e",
    "job_id": "fcf824ee-341f-4462-a00a-67b19ee79502",
    "status": "running",
    "stage": "analyzing",
    "attempt_count": 1,
    "max_attempts": 2,
    "is_terminal": false,
    "can_retry": false,
    "result": null,
    "updated_at": "2026-07-22T01:01:10.000Z"
  },
  "error": null,
  "meta": {}
}
```

Public status mapping:

| `status` | Ý nghĩa | `is_terminal` | `can_retry` |
|---|---|---:|---:|
| `queued` | Đang chờ worker | false | false |
| `running` | Đang validate/analyze/score | false | false |
| `retry_wait` | Lỗi tạm thời, hệ thống sẽ tự thử lại | false | false |
| `completed` | Có kết quả đủ điều kiện công bố | true | false |
| `needs_review` | Trạng thái legacy để đọc dữ liệu cũ; worker learner mới không tạo | true | false |
| `failed` | Hết retry hoặc input không thể chấm | true | chỉ khi lỗi provider retryable, parent là job gốc và chưa có manual retry |

Client được thấy `stage` ở mức cao, nhưng không nhận band tạm, transcript tạm, provider name, lỗi nội bộ hoặc tiến độ uncertainty. Với learner owner, `result` chỉ khác `null` khi job `completed` và group đã `ai_graded`. Lỗi mới kết thúc ở `failed`, giữ `grader=ai`; `needs_review` chỉ còn được project an toàn cho dữ liệu lịch sử.

Response `completed` với `full_audio`:

```json
{
  "success": true,
  "data": {
    "speaking_group_id": "ad344881-f357-4e2a-a78b-57c91b90898e",
    "job_id": "fcf824ee-341f-4462-a00a-67b19ee79502",
    "status": "completed",
    "stage": "finalizing",
    "attempt_count": 1,
    "max_attempts": 2,
    "is_terminal": true,
    "can_retry": false,
    "result": {
      "report_id": "4575ae2e-cd88-4f89-8e0f-43b65959932d",
      "assessment_type": "estimated",
      "evidence_mode": "full_audio",
      "is_partial_assessment": false,
      "requires_human_review": false,
      "overall_band": 6.5,
      "criteria": {
        "fluency_coherence": { "band": 6.5, "evidence_status": "sufficient", "feedback": "..." },
        "lexical_resource": { "band": 6.5, "evidence_status": "sufficient", "feedback": "..." },
        "grammatical_range_accuracy": { "band": 6.0, "evidence_status": "sufficient", "feedback": "..." },
        "pronunciation": { "band": 6.0, "evidence_status": "sufficient", "feedback": "..." }
      },
      "part_feedback": [
        { "part_number": 1, "display_transcript": "...", "feedback": "...", "audio_quality_warnings": [] }
      ],
      "text_based_feedback": null,
      "disclaimer": "Điểm ước tính hỗ trợ luyện tập, không phải điểm IELTS chính thức.",
      "pipeline_version": "speaking-v2",
      "calibration_version": "gemini-audio-estimate-v1",
      "generated_at": "2026-07-22T01:03:20.000Z"
    },
    "updated_at": "2026-07-22T01:03:20.000Z"
  },
  "error": null,
  "meta": {}
}
```

`full_audio` chỉ hợp lệ khi cả ba Part có artifact `complete`, checksum/quality đạt và mọi criterion evidence là `sufficient`. Transcript ASR phục vụ Coherence/Lexical/Grammar; audio thật là điều kiện bắt buộc cho Fluency/Pronunciation. Thiếu một vế làm toàn job retry/failed, không tạo điểm một phần và không handoff tutor. Khi chưa có calibration bundle, `calibration_version` mang version scorer ước lượng để audit và response bắt buộc có `assessment_type=estimated` cùng disclaimer.

Khối `partial_audio/needs_review` dưới đây chỉ là hình dạng tương thích cho report lịch sử. Worker learner mới không tạo nó; learner response ở cùng trạng thái luôn có `result=null`:

```json
{
  "report_id": "4575ae2e-cd88-4f89-8e0f-43b65959932d",
  "assessment_type": "estimated",
  "evidence_mode": "partial_audio",
  "is_partial_assessment": true,
  "requires_human_review": true,
  "overall_band": null,
  "criteria": {
    "fluency_coherence": { "band": 6.5, "evidence_status": "sufficient", "feedback": "..." },
    "lexical_resource": { "band": 6.5, "evidence_status": "sufficient", "feedback": "..." },
    "grammatical_range_accuracy": { "band": 6.0, "evidence_status": "sufficient", "feedback": "..." },
    "pronunciation": { "band": null, "evidence_status": "insufficient", "feedback": "Thiếu evidence đã hiệu chuẩn ở Part 3." }
  },
  "text_based_feedback": null,
  "disclaimer": "Tham chiếu nội bộ cho người chấm; không phải điểm IELTS chính thức.",
  "pipeline_version": "speaking-v1",
  "calibration_version": "vi-ielts-v1",
  "generated_at": "2026-07-22T01:03:20.000Z"
}
```

Khối `transcript_only` dưới đây cũng chỉ để đọc report lịch sử; learner không nhận object này:

```json
{
  "report_id": "4575ae2e-cd88-4f89-8e0f-43b65959932d",
  "assessment_type": "text_feedback_only",
  "evidence_mode": "transcript_only",
  "is_partial_assessment": true,
  "requires_human_review": true,
  "overall_band": null,
  "criteria": {
    "fluency_coherence": { "band": null, "evidence_status": "unavailable", "feedback": null },
    "lexical_resource": { "band": null, "evidence_status": "insufficient", "feedback": null },
    "grammatical_range_accuracy": { "band": null, "evidence_status": "insufficient", "feedback": null },
    "pronunciation": { "band": null, "evidence_status": "unavailable", "feedback": null }
  },
  "text_based_feedback": {
    "lexical": "...",
    "grammar": "...",
    "coherence": "...",
    "warning": "ASR có thể đã bỏ hoặc sửa tín hiệu; đây không phải IELTS criterion score."
  },
  "disclaimer": "Tham chiếu nội bộ cho người chấm; không phải điểm IELTS chính thức.",
  "pipeline_version": "speaking-v1",
  "calibration_version": null,
  "generated_at": "2026-07-22T01:03:20.000Z"
}
```

Schema an toàn bắt buộc:

- Band chỉ nhận `0..9` theo bước `0.5` hoặc `null`.
- Nếu bất kỳ một trong bốn band là `null`, `overall_band` bắt buộc `null`.
- `band != null` chỉ khi `evidence_status='sufficient'` trên đủ ba Part và có version scorer/hiệu chuẩn để audit.
- `transcript_only` luôn có cả bốn criterion band và Overall bằng `null`; feedback chữ nằm ở field riêng.
- `partial_audio` luôn có Overall bằng `null`; tiêu chí thiếu evidence cũng phải `null`.
- `partial_audio` không có criterion band nào vẫn có thể giữ `calibration_version` khi bundle đã pin nhưng abstain vì uncertainty/OOD; version chỉ `null` khi job không có calibration binding.
- `overall_band` của API chỉ đọc `ai_grading_reports.computed_band`. Writer job-backed tự tính Overall, ghi cùng giá trị vào `computed_band` và mirror `band_score`; hai cột phải cùng `null` hoặc bằng nhau, không dùng Overall provider.
- Reliability point/CI/bucket chỉ nằm trong dữ liệu nội bộ; calibration bundle digest truy qua `report.grading_job_id` tới job đã pin. Response serializer allowlist các field contract và loại bỏ chúng hoàn toàn.
- Không trả `raw_ai_response`, phoneme raw payload, storage key hoặc audio URL trong report.

## 4. Retry thủ công

### `POST /api/v1/submissions/speaking/{speakingGroupId}/retry-grading`

Header `Idempotency-Key` bắt buộc. Body có thể rỗng:

```json
{
  "reason": "user_requested_retry"
}
```

Key của lần retry phải là key mới, khác key của submission gốc; mọi lần lặp lại chính retry request đó dùng lại key retry này.

Quy tắc:

- Chỉ `student` owner được gọi. Admin/tutor regrade là operation audit riêng, không dùng endpoint learner.
- Chỉ original job `failed` do lỗi provider retryable và chưa có retry child mới có `can_retry=true`; worker mới không dùng `needs_review` để chuyển tutor.
- Tổng budget của chain là ba lần chạy pipeline: original job tối đa hai attempt tự động, manual retry child tối đa một attempt. Đây là cách đồng thời đáp ứng retry tự động và quyền “thử lại” mà không vượt policy ba lần.
- Child copy bất biến `pipeline_version`, `scoring_config_sha256` và `calibration_bundle_sha256` từ parent; không tra registry active mới. Retry vì provider lỗi phải tái lập cùng chain, còn regrade bằng config mới là operation khác.
- Nếu retry child đã tồn tại và request dùng đúng idempotency key đã tạo child, trả lại accepted representation ban đầu của child (`status='queued'`) cùng status URL; trạng thái live đọc qua polling. Nếu dùng key khác, trả `409 RETRY_ALREADY_CREATED` kèm canonical child IDs, không tạo alias key.
- Retry child có replay window riêng được persist bằng `idempotency_expires_at`. Trong window, cùng key/payload replay child; sau window trả `410 IDEMPOTENCY_WINDOW_EXPIRED`, không tái sử dụng key và không tạo child khác.
- Retry do provider lỗi không trừ quota người học; regrade chủ động với pipeline mới là nghiệp vụ riêng và phải audit.
- Transaction tạo child `retry_of_job_id` đồng thời đưa group `grading_failed` về `status='pending', grader='ai'`; chỉ tái sử dụng artifact có cùng verified audio hash và `scoring_config_sha256` đã copy từ parent.

Response `202 Accepted` có cùng hình dạng enqueue, luôn là accepted representation `queued` và trỏ tới child mới. Cùng idempotency key trả lại đúng representation đó; status endpoint của group chuyển sang child ngay sau commit.

Mã lỗi:

| HTTP | Code | Khi nào |
|---|---|---|
| `409` | `GRADING_NOT_RETRYABLE` | Lỗi input hoặc đã vượt policy |
| `409` | `RETRY_ALREADY_CREATED` | Parent đã có child được tạo bằng idempotency key khác |
| `410` | `IDEMPOTENCY_WINDOW_EXPIRED` | Key retry đã qua replay window đã persist; không được tái sử dụng |
| `429` | `RETRY_RATE_LIMITED` | Abuse/rate limit |

## 5. Claim bài Speaking cần người chấm

### `POST /api/v1/tutors/submissions/speaking/{speakingGroupId}/claim`

Role: `tutor`. Queue có thể cho tutor thấy metadata tối thiểu của group chưa gán, nhưng không trả transcript, AI reference hoặc audio URL trước khi claim.

Transaction khóa cả ba Part và chỉ thành công khi toàn group còn `status='pending'`, `grader='tutor'`, assignment đều trống hoặc đã đồng nhất với chính tutor hiện tại, chưa có tutor report active và chưa có Part `tutor_graded`. Sau claim, cả ba Part nhận cùng `assigned_tutor_id=req.user.id`. Nếu tutor hiện tại đã claim đủ group, replay trả cùng assignment; tutor khác nhận `409 SPEAKING_GROUP_ALREADY_CLAIMED`, còn state không thể claim nhận `409 SPEAKING_GROUP_NOT_CLAIMABLE`.

Response `200` trả `speaking_group_id`, `assigned_tutor_id`, `assignment_status='claimed'` và `claimed_at` lấy từ timestamp assignment chung đã persist trên ba Part; replay không sinh timestamp mới. Không kèm learner content/evidence.

Sau đó mọi endpoint detail, normalized review reference, signed audio và grade phải query-scope theo assignment; grade lại khóa cả group và từ chối khi assignment/status/grader thay đổi. Admin có thể assign/bypass qua operation riêng có audit. Không tạo bảng assignment mới.

### `POST /api/v1/tutors/submissions/speaking/{submissionId}/ai-prelim`

Chỉ tutor đã được phân công (hoặc admin có quyền tương ứng) được gọi. `submissionId` có thể là Part đại diện hoặc group ID mà service resolve được. API đọc đủ ba audio private và transcript, sau đó trả bản nháp:

```json
{
  "success": true,
  "data": {
    "suggestedOverallBand": 6.0,
    "suggestedCriteria": {
      "fluencyScore": 5.5,
      "lexicalScore": 6.0,
      "grammarScore": 5.5,
      "pronunciationScore": 6.0
    },
    "feedbackDraft": "...",
    "keyProblems": [],
    "tutorNotes": "Đây là bản nháp AI; tutor cần nghe audio, chỉnh điểm và phản hồi trước khi lưu."
  },
  "error": null,
  "meta": null
}
```

Lệnh này không insert/update AI job, AI report, tutor report, assignment hoặc submission status. Chỉ endpoint grade của tutor mới persist quyết định cuối.

## 6. Nghe lại audio bằng signed URL

### `GET /api/v1/submissions/{submissionId}/audio-url?type=speaking`

Route đã được mount tại `submissions.routes.js`. Với audio mới, service chỉ trả signed download URL ngắn hạn từ private storage; audio legacy còn public URL được giữ làm fallback hiển thị và phải backfill theo cổng privacy/retention trước production.

Authorization:

- Owner của submission.
- Tutor có `assigned_tutor_id` khớp trên toàn group; quyền nhìn queue chưa claim không đủ để lấy audio.
- Admin có scope phù hợp.

Query runtime kiểm owner hoặc toàn bộ group ba Part có cùng `assigned_tutor_id`; chỉ biết UUID hoặc chỉ được gán một Part không đủ quyền. Admin bypass theo role hiện hành và phải qua operation/audit quản trị tương ứng.

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "url": "https://storage.example/private-signed-download",
    "expires_at": "2026-07-22T01:08:20.000Z"
  },
  "error": null,
  "meta": {}
}
```

- TTL tối đa đề xuất 5 phút.
- Response có `Cache-Control: private, no-store`.
- Không ghi signed URL vào DB/log/analytics và không trả object key.

## Chuyển trạng thái hợp lệ

```text
queued → running
running → completed | retry_wait | failed
retry_wait → running (worker claim khi run_after tới hạn)
queued/running với lease hết hạn → queued | failed
failed retryable --một manual retry hợp lệ--> job mới queued
```

- Client không được cập nhật status.
- `completed` và `failed` là terminal của job learner mới; `needs_review` chỉ còn terminal legacy.
- `completed` đặt group `ai_graded`; `failed` đặt group `grading_failed` và giữ `grader=ai`. Các cập nhật diễn ra cùng transaction với report/job terminal.

## Hợp đồng bảo mật và quyền riêng tư

- Bucket audio là private; public bucket/public URL bị cấm cho dữ liệu mới.
- Upload token opaque AEAD ràng buộc user + object + declared hash/metadata + expiry bằng key tách khỏi access token; vì stateless nên không cam kết revoke/consume trước atomic DB bind.
- Worker đọc object bằng service credential chỉ sau khi DB ownership đã được xác nhận.
- Worker tự tính checksum, kiểm magic bytes/container/codec/decode/duration/silence/clipping rồi normalize/chunk theo provider limit trước khi gọi AI.
- Prompt/transcript/audio không xuất hiện trong access log, error log hoặc `ai_usage_logs`.
- API result chỉ chứa display transcript; ASR transcript/evidence chi tiết chỉ có thể mở cho audit role qua contract riêng sau này.
- Endpoint phải chống IDOR bằng query có `user_id`/assignment scope, không chỉ kiểm UUID có tồn tại.

## Tương thích và ngừng dùng

| Hiện tại | Đích | Chuyển đổi |
|---|---|---|
| `POST /speaking/upload` nhận multipart qua Express | `POST /speaking/audio-uploads` + direct signed upload | Giữ endpoint cũ sau feature flag trong một release, giới hạn traffic; không dùng cho luồng mới |
| `POST /speaking/full` chờ grading và trả kết quả đồng bộ | Trả `202` + polling URL | Frontend rollout cùng feature flag; không đổi ngầm cho client cũ |
| `audio_url` công khai | `audio_storage_key` + signed download | Dual-read dữ liệu legacy, không ghi public URL mới |
| UI fallback `audio/webm` | G-03 hiện chỉ cho mp3/m4a/wav | Chặn browser không tương thích hoặc duyệt RFC WebM ingress + normalization trước rollout |
| Pronunciation/Overall từ transcript | Transcript + audio thật để chấm đủ bốn tiêu chí; transcript-only bị từ chối | Đã triển khai, kết quả mang nhãn AI estimate |

Contract có hiệu lực cho implementation fail-closed toàn phiên: đủ bốn tiêu chí hoặc lỗi rõ ràng. `AI Estimated Band` được phép cho luyện tập với disclaimer; chỉ nhãn/kết quả đã hiệu chuẩn mới phụ thuộc calibration/RFC approval.
