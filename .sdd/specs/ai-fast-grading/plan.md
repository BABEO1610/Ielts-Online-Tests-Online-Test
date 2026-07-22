# Kế hoạch triển khai: Production hóa chấm Writing và Speaking bằng AI

**Nhánh**: `feature-global-ielts-virtual-assistant/Datnt` | **Ngày**: 2026-07-22 | **Đặc tả**: [spec.md](./spec.md)

**Trạng thái**: `AI ESTIMATED SPEAKING CÓ CODE/TEST MÔ PHỎNG — CỔNG PHÁT HÀNH CÒN MỞ` — đường estimate trả đủ bốn tiêu chí từ transcript + audio trong test mock; smoke test ba Part qua provider thật chưa có bằng chứng thành công có thể tái lập do các lần demo gần nhất gặp quota. Lỗi AI không tự handoff tutor theo service policy, nhưng UI còn câu chữ trái policy (T075). Nhánh calibrated/publish chưa nối end-to-end (T074), fidelity gate chưa tồn tại (T076), retry provider 5xx còn mất phân loại (T077), Writing còn T070–T071 và tutor detail/envelope còn T073.

**Đồng bộ tài liệu**: `tasks.md`, `checklist.md`, contract và `REVIEW_GUIDE.md` đã được đối chiếu lại với implementation fail-closed; các cổng môi trường/approval chưa có bằng chứng vẫn để mở.

**Đầu vào**: Đặc tả hiện tại, mã nguồn thực tế, toàn bộ migration đang có và yêu cầu bổ sung bằng chứng âm thanh cho Speaking.

**Giới hạn an toàn**: Không gọi provider thật trong test tự động, không chạy migration lên database production và không mô tả AI estimate là kết quả đã hiệu chuẩn khi thiếu calibration bundle hợp lệ.

## Quyết định nghiệp vụ cập nhật ngày 2026-07-22

Phần này thay thế mọi mô tả handoff tự động còn sót lại bên dưới:

- `grader=ai`: worker phân tích ba audio thật, giữ transcript ASR chưa sửa, tạo evidence Fluency/Pronunciation, rồi trả đủ bốn criterion band và Overall dưới nhãn `AI Estimated Band`.
- Nếu provider/evidence thất bại: dùng `retry_wait → failed` và manual retry hiện có; không đổi `grader` sang `tutor`, không đưa group vào tutor queue.
- `grader=tutor`: ngay từ lúc nộp mới vào tutor queue. Sau claim, tutor có nút chạy AI prelim; kết quả chỉ điền bản nháp bốn tiêu chí để tutor nghe lại và chỉnh sửa, không tự lưu báo cáo tutor.
- Không thêm bảng. Tiếp tục tái sử dụng `ai_grading_jobs`, `speaking_analysis_artifacts`, `ai_grading_reports`, `speaking_submissions` và `tutor_feedback_reports`.
- `AI_SPEAKING_ESTIMATED_BANDS_ENABLED` là cờ riêng cho điểm luyện tập. `AI_SPEAKING_PUBLISH_BANDS` vẫn dành cho rollout đã hiệu chuẩn; hai khái niệm không được nhập làm một.

## Tóm tắt

Giữ kiến trúc React + Express + PostgreSQL hiện tại, đặt private object storage sau một adapter (production theo S3 đã khóa trong Constitution; Supabase chỉ dùng khi RFC cho phép), chuyển AI grading sang worker bất đồng bộ và tách rõ ba loại bằng chứng:

1. Output ASR ít hậu xử lý nhất cho Lexical Resource, Grammatical Range & Accuracy và phần Coherence; đây không được coi là bản chép lời nguyên văn tuyệt đối. Schema hỗ trợ timestamp/uncertainty tùy chọn, nhưng adapter Gemini hiện tại mới trả plain transcript và để `words/segments/uncertainty=null`.
2. Tín hiệu audio cho Fluency, Pronunciation và chất lượng bản ghi.
3. Rubric scorer hợp nhất bằng chứng và chỉ công bố Overall khi đủ bốn tiêu chí; kết quả chưa có calibration bundle phải mang nhãn AI estimate.

Baseline trước feature gọi STT tuần tự, chỉ lưu một chuỗi `transcript`, sau đó gửi chữ cho grader nhưng vẫn sinh điểm Pronunciation và Overall. Implementation mới đã loại bỏ đường suy đoán đó: audio thật được xử lý bất đồng bộ thành evidence Fluency/Pronunciation có phiên bản, còn transcript ASR phục vụ Coherence, Lexical và Grammar. Nhánh learner chỉ hoàn tất khi scorer trả đủ bốn criterion band và Overall dưới nhãn `AI Estimated Band`; thiếu evidence hoặc provider lỗi đi theo retry/failed và không tự chuyển tutor. Calibration bundle tiếp tục là cổng chất lượng để nâng cấp độ tin cậy, không còn là điều kiện định tuyến bài AI sang tutor.

Về database nghiệp vụ/feature, kế hoạch tái sử dụng tối đa schema hiện có. Chỉ đề xuất **hai bảng mới**:

- `ai_grading_jobs`: hàng đợi PostgreSQL bền vững cho lease, retry, idempotency và trạng thái xử lý.
- `speaking_analysis_artifacts`: bằng chứng Speaking có phiên bản, gộp transcript có cấu trúc, chất lượng audio, fluency metrics và pronunciation evidence trong một bảng.

Không tạo riêng bảng audio asset, pronunciation, fluency, job attempt, idempotency key hoặc submission group.

Ngoại lệ hạ tầng có điều kiện: nếu không dùng migration history do nền tảng quản lý và database thật chưa có cơ chế tương đương, harden runner có thể cần **một bảng dùng chung `schema_migrations`** (version/checksum/applied time). Đây không phải bảng của feature và phải được reuse cho toàn hệ thống; không được tạo bản `ai_*` riêng hay tạo trùng khi nền tảng đã cung cấp.

## Mục tiêu và phạm vi

### Trong phạm vi

- Sửa tính hợp lệ của chấm Speaking theo bốn tiêu chí IELTS.
- Upload và truy cập audio qua private object-storage adapter cùng signed URL/token; không để URL công khai.
- Chấm bất đồng bộ qua worker nằm trong cùng backend repository.
- Budget tối đa ba lần chạy pipeline cho một chain: hai attempt tự động ở job gốc và một manual retry attempt khi lỗi provider còn retryable; không để submission kẹt `pending`.
- Idempotency an toàn cho request đồng thời.
- Lưu bằng chứng/version đủ để audit, chấm lại và hiệu chuẩn.
- Tận dụng tutor queue/report hiện có chỉ cho bài học viên chủ động chọn tutor; AI prelim không thay đổi điểm cuối của tutor.
- Giữ Writing hoạt động; `ai_grading_jobs` được thiết kế dùng chung để Writing có thể chuyển sang worker sau mà không cần bảng queue thứ hai.

### Ngoài phạm vi của foundation đã triển khai

- Tự huấn luyện ASR hoặc pronunciation model.
- Realtime grading khi người học đang nói.
- Cấp chứng chỉ hoặc tuyên bố điểm IELTS chính thức.
- Xóa các bảng/cột legacy trong cùng release.
- Viết lại toàn bộ Writing, tutor grading hoặc frontend ngoài phần cần cho trạng thái async.

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js `>=20`; JavaScript CommonJS ở backend; React/JSX ở frontend.

**Phụ thuộc hiện có**:

- Backend: Express `5.2.1`, `pg` `8.21.0`, Supabase SDK, `ioredis`, `multer`, `file-type`, Winston.
- Frontend: React `19.2.6`, Vite `8.0.12`, Bootstrap `5.3.8`, Axios.
- AI runtime hiện tại: rubric scoring và speech evidence dùng Gemini. Transcription đi qua adapter provider hiện có; cấu hình demo không có OpenAI key dùng Gemini và trả plain transcript với `words/segments/uncertainty=null`. Structured ASR/model pin riêng là nâng cấp T068.
- Media worker hiện tại: `ffprobe`/`ffmpeg` decode, kiểm magic/container và normalize nguyên từng Part thành WAV PCM16 mono 16 kHz trong workspace tạm; chạy với timeout/resource limit, không shell-interpolate input. Chunk/deduplicate/rebase timestamp chưa được triển khai và chỉ là mục tiêu có điều kiện của T069.

**Lưu trữ hiện tại**: PostgreSQL raw SQL có tham số; Supabase Storage đang chứa audio. **Đích production**: private S3 theo Constitution hoặc Supabase sau RFC chấp nhận rõ TTL/ACL/compatibility; contract không phụ thuộc hãng.

**Kiểm thử**: Jest backend, Vitest + Testing Library frontend; provider phải được mock trong test tự động.

**Nền tảng đích**: React SPA + Express REST API + một Node worker riêng dùng cùng codebase và PostgreSQL.

**Mục tiêu hiệu năng đề xuất**:

- API không-AI và API enqueue: p95 dưới 500 ms, không tính thời gian upload file.
- `POST /speaking/full` trả `202 Accepted` sau khi commit submission + job, không chờ provider.
- Job không có SLO “15 giây”; mục tiêu ban đầu p95 dưới 5 phút và phải được xác nhận bằng load test.
- Worker hiện phân tích ba Part tuần tự để tránh dồn rate limit. Xử lý song song có giới hạn chỉ là tối ưu tương lai sau load test, không phải hành vi runtime hiện tại.

**Scale/scope baseline để load test**:

- Một phiên có đúng ba Part; mỗi object tối đa 50 MB và tối đa 15 phút theo runtime hiện tại. Normalizer xử lý nguyên từng Part; nếu giới hạn payload provider hoặc load test chứng minh cần, T069 mới bổ sung chunk/deduplicate/rebase timestamp.
- Quota 10 original AI-grading submissions/user/ngày UTC; retry hệ thống/manual generation hợp lệ không tính thêm.
- Baseline staging ban đầu: 30 enqueue/phút, 10 job đồng thời và benchmark ở 2× forecast thực tế trước production. Đây là sizing target, không phải số liệu traffic đã được xác nhận.
- Submission/feedback giữ theo retention policy hiện có; object upload mồ côi dọn sau 24 giờ. Forecast audio phút/ngày/chi phí và ngưỡng calibration cụ thể vẫn cần hội đồng chốt nên rollout công bố band production tiếp tục bị block.

**Ràng buộc**:

- Không ORM; mọi SQL có tham số.
- Mọi lời gọi grading/STT/speech assessment đi qua `backend/src/ai/grading.service.js` hoặc adapter do file này điều phối.
- Không dùng model alias `latest` ở production; pin model và pipeline version.
- Không log audio, transcript thô, signed URL hoặc PII.
- Không gọi provider thật trong unit/integration test.

**Cổng còn mở trước khi phát hành production**:

- RFC chọn text grader/storage/React version và policy WebM ingress.
- Ngưỡng MAE/QWK/exact-adjacent agreement/subgroup delta để bật criterion band.
- Forecast traffic/audio phút/ngày, ngân sách provider/storage và quyết định retention audio gắn submission.
- Thời lượng idempotency replay window và KMS decrypt-key retention tương ứng.
- Phê duyệt quy tắc Overall decimal round-half-up tại tie `.25/.75`.

Các cổng này không chặn xây nền tảng fail-closed/shadow, nhưng chặn bật public Speaking band. Implementation không được tự tạo threshold hoặc approval giả.

## Baseline trước triển khai

Bảng dưới đây ghi lại hiện trạng tại thời điểm audit ban đầu để giải thích vì sao kiến trúc đích được chọn. Trạng thái sau triển khai và các cổng còn mở được đối chiếu riêng ở phần Constitution và checklist; không dùng bảng baseline này làm mô tả runtime hiện tại.

| Khu vực | Hiện trạng | Hệ quả production |
|---|---|---|
| Upload audio | Backend nhận toàn bộ file qua `multer.memoryStorage()` và tạo public URL | Tốn RAM, audio cá nhân có thể bị truy cập bằng URL dài hạn |
| Định dạng browser | UI ưu tiên `audio/mp4`, fallback `audio/webm`; constraint G-03 chỉ khóa mp3/m4a/wav | Chrome/WebM không thể release nếu chưa sửa constraint hoặc có RFC/transcode policy |
| Submit Speaking | Sau `COMMIT`, request vẫn chờ ba lần STT và một lần grading | Dễ timeout, retry trùng và giữ DB connection lâu |
| Transcript | `speaking_submissions.transcript` chỉ giữ chuỗi cuối | Không có timestamp, confidence, provider version hoặc lịch sử evidence |
| Scoring | Grader chỉ nhận transcript nhưng vẫn bắt buộc Pronunciation | Điểm không có bằng chứng audio nhưng vẫn được tính Overall |
| Idempotency | Cache/lookup trước khi insert; Speaking gọi `force: true` | Hai request đồng thời có thể gọi provider và tạo report thừa |
| Trạng thái lỗi | `submission_status` chưa có `grading_failed` | Bài có thể giữ `pending` dù provider đã thất bại |
| Quyền nghe audio | Controller/service có logic signed URL nhưng route chưa mount và tutor scope chưa giới hạn assignment | Chỉ đổi URL không sửa ownership query vẫn tạo IDOR |
| Migration | Script hiện chạy lại mọi file và không ghi version/checksum | Không đủ an toàn để áp dụng trực tiếp trên production |

## Kiến trúc đích

```text
Browser
  │ 1. xin signed-upload token
  │ 2. upload trực tiếp
  ▼
Private object storage (S3 production; adapter khác cần RFC)
  │
  ├── POST /speaking/full
  │     └── transaction: 3 submissions + 1 ai_grading_job
  │           └── HTTP 202 + status_url
  │
  ▼
Node grading worker
  ├── claim job bằng FOR UPDATE SKIP LOCKED
  ├── validate magic bytes/codec/duration/ownership
  ├── xử lý tuần tự từng Part (runtime hiện tại)
  │     ├── plain ASR trước hậu xử lý ứng dụng
  │     │     └── words/segments/timestamps/uncertainty hiện là null
  │     └── Gemini audio evidence cho quality/fluency/pronunciation
  ├── lưu speaking_analysis_artifacts
  ├── LLM chấm text/coherence và tổng hợp feedback
  ├── rubric scorer + validator tạo AI Estimated Band
  └── transaction: report + trạng thái submissions + job
        ├── completed
        └── failed

Reader vẫn hiểu `needs_review` từ job/report lịch sử nhưng worker learner mới không tạo trạng thái này.
```

### Trạng thái và stage của job

```text
queued
  → running
      ├── completed
      ├── retry_wait → running (claim khi run_after tới hạn)
      └── failed

Legacy terminal (read-only compatibility): needs_review

Khi status = running, stage tiến qua:
validating_audio → analyzing → scoring → calibrating → finalizing
```

Schema cho phép stage `calibrating`, nhưng runtime hiện chỉ có loader/xác minh bundle và scorer estimate. Worker chỉ khởi tạo scorer khi cờ estimate bật; bật publish/bundle riêng không tạo được nhánh calibrated, còn bật cả estimate vẫn không làm scorer áp dụng mapping. T074 phải triển khai và kiểm thử đường này trước khi dùng stage/nhãn đã hiệu chuẩn.

- Worker claim job bằng lease; job có lease hết hạn được watchdog thu hồi.
- Policy đích retry timeout, `429`, `502/503/504` hoặc lỗi mạng; không retry file sai, audio im lặng hoặc schema nghiệp vụ sai. Hiện gateway có thể đổi provider 5xx thành `INTERNAL_ERROR/AIGRADE_003` trước worker, nên T077 phải khép sai lệch này; backoff hiện là mũ + jitter nội bộ và chưa đọc `Retry-After` của provider.
- Retry nội bộ không tiêu thụ thêm quota người học.
- Khi một nguồn evidence thiếu, không cho nguồn khác tự bịa tiêu chí đó.

## Chiến lược database: tái sử dụng trước, chỉ thêm khi bắt buộc

Chi tiết cột và quan hệ nằm trong [data-model.md](./data-model.md).

### Thành phần database hiện có được tái sử dụng

| Bảng | Quyết định | Thay đổi tối thiểu |
|---|---|---|
| `speaking_submissions` | Giữ làm nguồn sự thật cho ba Part | Thêm storage key/checksum/duration, `source_prompt_id`, prompt snapshot hash, `assigned_tutor_at`, `updated_at`, `deleted_at`; giữ `transcript` làm trường tương thích trong giai đoạn chuyển đổi |
| `ai_grading_reports` | Giữ làm báo cáo tổng hợp duy nhất của phiên | Thêm `speaking_group_id`, `grading_job_id`, pipeline/calibration version, evidence mode và cờ human review; reliability nội bộ có thể nằm trong `criteria_json`, còn bundle digest truy qua job để không lặp dữ liệu; không trả learner |
| `ai_usage_logs` | Giữ để log từng provider attempt | Không tạo bảng attempt; dùng `feature`, `entity_type`, `entity_id`, provider/model/latency/error hiện có theo convention mới |
| `tutor_feedback_reports` | Giữ cho bài học viên chủ động chọn tutor | Bổ sung `deleted_at`, thay hard-delete; nhánh tutor dùng `status=pending`, `grader=tutor`, `assigned_tutor_id`; lỗi AI không ghi vào bảng này |
| `assigned_tutor_id` | Giữ cho phân quyền người chấm | Không tạo bảng assignment mới |
| `speaking_group_id` | Giữ làm khóa nhóm ba Part | Backfill dữ liệu cũ và thêm unique index `(speaking_group_id, part_number)` |

### Hai bảng mới bắt buộc

1. **`ai_grading_jobs`**: operational state thay đổi nhiều lần, có lease/retry và có thể tồn tại trước report. Không dùng `ai_grading_reports` làm queue vì report là kết quả nghiệp vụ cần bất biến và không nên bị worker tranh chấp cập nhật.
2. **`speaking_analysis_artifacts`**: một submission có thể được phân tích lại bởi provider/model/pipeline khác. Không tiếp tục ghi đè một cột `transcript`, và không nhét evidence đầu vào theo từng Part vào report tổng hợp.

### Bảng hiện có không dùng cho luồng này

| Bảng | Lý do không dùng |
|---|---|
| `speaking_attempts` | Không có runtime nào đọc/ghi; mô hình cũ là attempt header trong khi luồng thật đã dùng `speaking_group_id` |
| `speaking_attempt_answers` | Bắt buộc `question_index` và lưu audio từng câu, không khớp UI hiện ghi một audio cho mỗi Part |
| `tutor_grading_reports` | Bảng legacy; runtime hiện dùng `tutor_feedback_reports` |

Các bảng legacy được giữ nguyên để tránh xóa nhầm dữ liệu. Không dual-write vào chúng và không DROP trong feature này.

### Những bảng không tạo

- Không tạo `speaking_audio_assets`: application token dạng opaque AEAD + metadata object storage + unique `audio_storage_key` trên submission đủ cho atomic bind-once. Token stateless không hỗ trợ revoke/one-time trước bind; nếu requirement đó xuất hiện phải xem lại quyết định bảng.
- Không tạo `speaking_transcriptions` và `speaking_audio_evidence` riêng: gộp vào `speaking_analysis_artifacts` để tránh hai nguồn evidence cạnh tranh.
- Không tạo `job_attempts`: số lần thử, lỗi cuối và provider attempts được giữ ở job + `ai_usage_logs`.
- Không tạo `api_idempotency_keys`: `ai_grading_jobs.idempotency_key` cùng unique constraint đủ cho endpoint này.
- Không tạo bảng group chung: tái sử dụng `speaking_group_id`; Writing tiếp tục dùng `writing_group_id`.

## Luật chấm và công bố kết quả

### Chế độ `full_audio`

- **Runtime estimate hiện tại** gắn `full_audio` khi ba artifact hoàn tất, quality/hash hợp lệ và scorer trả đủ bốn evidence status/band. Transcript là plain ASR trước hậu xử lý ứng dụng; ứng dụng không sửa ngữ pháp, nhưng chưa có gold-set hoặc threshold chứng minh provider giữ nguyên lỗi/filler/repair. Scorer hiện đánh dấu evidence đủ khi adapter hoàn tất, vì vậy không được mô tả estimate này là đã qua fidelity/calibration gate.
- **Đích calibrated/production sau T074 và T076** mới được yêu cầu verbatim-fidelity gate cho Lexical, Grammar và vế Coherence; thiếu fidelity phải abstain theo policy đã duyệt. Fluency phải kết hợp timing/pause/repair/repetition với Coherence, còn Pronunciation phải dựa trên audio/acoustic evidence và mapping đã validate với người chấm, không suy từ transcript hay confidence của provider.
- Ở cả estimate và calibrated, backend bỏ mọi Overall provider, dùng số học decimal tính `mean=sum(4 bands)/4`, rồi làm tròn về `0.5` gần nhất với tie `.25/.75` hướng lên (`floor(mean*2+0.5)/2`); không dùng floating binary. Vì input nửa band tạo fraction `.000/.125/.250/.375/.500/.625/.750/.875`, test phải phủ đủ tám trường hợp và biên 0/9. `computed_band` là nguồn API; `band_score` chỉ mirror cho Speaking job-backed. Thiếu một band thì Overall `null`.

### Chế độ `partial_audio` *(audit/legacy; không phải terminal learner mới)*

- Dùng khi có audio nhưng thiếu Part/component, quality không đủ, hoặc evidence/config không khớp bundle đã pin.
- Tên mode biểu thị **evidence âm thanh chưa đủ để tự động công bố trọn bộ điểm**, không chỉ việc thiếu file. Với job learner mới, đủ ba audio nhưng evidence không đạt phải kết thúc theo retry/failed và không tạo report điểm một phần; `partial_audio/needs_review` chỉ còn là dữ liệu legacy/audit tương thích.
- Mỗi tiêu chí có `evidence_status = sufficient | insufficient | unavailable`; chỉ `sufficient` mới được có band.
- Ví dụ thiếu pronunciation evidence ở Part 3: Pronunciation và Overall là `null`; các band khác chỉ được giữ nếu evidence riêng của chúng đủ trên toàn phiên.
- Worker learner mới không công bố mode này và không tự handoff tutor; thiếu evidence kết thúc theo retry/failed. Mode được giữ để đọc report lịch sử và audit nội bộ.
- Theo IELTS-07, learner không được thấy report AI này khi group đang `pending/tutor`; status API chỉ báo đã chuyển người chấm. Criterion candidates/evidence chỉ dành cho assigned tutor/admin.

### Chế độ `transcript_only` *(audit/legacy; không dùng để hoàn tất bài AI mới)*

- Chỉ tạo/lưu `text_based_feedback` về từ vựng/ngữ pháp/coherence với cảnh báo ASR có thể đã bỏ hoặc sửa tín hiệu; không điền các feedback này vào IELTS criterion band.
- Cả bốn `criteria.*.band` và `overall_band` phải là `null`.
- Nếu sau này sản phẩm muốn có text estimate, phải dùng trường riêng không mang tên IELTS criterion và chỉ bật sau verbatim-fidelity evaluation; không thuộc release đầu.
- Bài AI mới chỉ có transcript nhưng thiếu audio evidence phải thất bại; object này chỉ còn phục vụ dữ liệu lịch sử/audit.
- Text feedback/report AI được lưu cho reviewer nhưng không trả learner khi submission chưa `ai_graded`/`tutor_graded`; muốn công bố sớm phải sửa Constitution/spec riêng.

### Calibration gate

Trước khi bật band Speaking production:

- Bộ dữ liệu gồm đủ ba Part, nhiều vùng giọng Việt Nam, thiết bị và mức nhiễu.
- Ít nhất hai giám khảo đạt chuẩn do hội đồng xác định chấm độc lập và mù với AI/provider features; dùng anchor định kỳ, đo inter-rater threshold và adjudicate bất đồng trước gold label.
- Tách train/calibration/locked holdout theo speaker; cùng người không được lọt vào nhiều split và không chọn threshold trên locked holdout.
- Theo dõi MAE, quadratic weighted kappa, exact/adjacent agreement và sai lệch theo accent/thiết bị/noise.
- Mapping score của provider sang band phải có `calibration_version`; không quy đổi tuyến tính 0–100 thành 0–9.
- Calibration chỉ hợp lệ cho đúng feature schema, provider/model/config và population đã đánh giá; thay đổi bất kỳ thành phần nào phải quay về shadow.
- Reliability chỉ dùng nội bộ cho abstention/audit, không xuất API. Event đích là `abs(system_band - adjudicated_human_band) <= 0.5`. Mỗi kết quả vào bucket khóa trước; lưu point estimate, speaker-cluster bootstrap 95% CI, `speaker_count/session_count` và dùng cận dưới CI. Bucket thiếu minimum speaker count đã duyệt làm toàn phiên learner `failed` theo policy; chỉ bài đã chọn `grader=tutor` mới tiếp tục ở nhánh tutor. Không dùng self-rating/provider score.
- Release gate phải đồng thời đạt chất lượng và minimum automation coverage/maximum human-review rate trên toàn cohort cùng subgroup; không được “đạt” bằng cách abstain gần hết. Các ngưỡng này, inter-rater threshold và drift-audit cadence cần hội đồng ký.
- Runtime hiện tại tạo manifest từ cấu hình môi trường lúc process khởi động rồi luôn pin `scoring_config_sha256`; `calibration_bundle_sha256` có thể `null` cho nhánh `AI Estimated Band`. Với job có calibration digest, worker load đúng bundle/đường dẫn đã pin và fail closed khi thiếu hoặc lệch chữ ký, digest hay binding. Tuy nhiên `GeminiSpeakingRubricScorer.score()` hiện bỏ qua đối số bundle và vẫn trả `assessment_type='estimated'`; việc thực sự áp dụng mapping/threshold/reliability thuộc T074. Registry version-controlled là thiết kế production tương lai, chưa có file `calibration-registry.json` trong repository.
- Report lưu `calibration_version` để query và dùng `grading_job_id` truy `calibration_bundle_sha256` đã pin để tái lập; không lặp digest trong `criteria_json` và không tạo bảng calibration mới. Khi bổ sung registry sau này, đổi active digest phải là một release có audit.
- Job ngoài phân phối, uncertainty cao hoặc nguồn evidence bất đồng phải đánh dấu evidence bị ảnh hưởng `insufficient`; worker learner retry/failed toàn phiên, không tạo điểm một phần và không chuyển tutor.

## Hợp đồng API

Hợp đồng diễn giải nằm tại [contracts/speaking-grading-api.md](./contracts/speaking-grading-api.md); schema máy đọc có conditional nullable rules tại [contracts/speaking-grading.openapi.yaml](./contracts/speaking-grading.openapi.yaml).

Các thay đổi chính:

- `POST /api/v1/submissions/speaking/audio-uploads`: cấp signed-upload URL/token cho private bucket và trả riêng thời hạn URL với thời hạn application token.
- `POST /api/v1/submissions/speaking/full`: nhận đúng ba `prompt_id` + upload token, bắt buộc `Idempotency-Key`, trả `202`; backend resolve prompt chính thức và không tin `prompt_text` từ client.
- `GET /api/v1/submissions/speaking/{groupId}/grading-status`: polling trạng thái và chỉ trả result khi hoàn tất.
- `POST /api/v1/submissions/speaking/{groupId}/retry-grading`: retry có điều kiện và idempotent.
- `POST /api/v1/tutors/submissions/speaking/{groupId}/claim`: tutor claim nguyên tử group chưa gán; mọi detail/reference/audio/grade sau đó bắt buộc đúng assignment.
- Endpoint nghe audio chỉ trả signed URL ngắn hạn cho owner, tutor được phân công hoặc admin.

## Kế hoạch migration và rollout

### Bước 0 — Đồng bộ đặc tả và cổng phát hành

- `spec.md` đã được viết lại để phân biệt `full_audio/partial_audio/transcript_only`, không tạo failed report giả, chỉ retry lỗi retryable và không mặc định Speaking luôn có band.
- Sinh lại `checklist.md` và `tasks.md` từ spec mới trước khi thực thi task code; task/checklist transcript-only cũ không được dùng.
- Phê duyệt RFC cho provider và storage vì Constitution khóa Claude/S3 trong khi code đang dùng Gemini/Supabase.
- Phê duyệt format policy: tiếp tục khóa mp3/m4a/wav hoặc sửa G-03 cho phép WebM/Opus ở ingress rồi normalize; UI hiện fallback WebM nên không thể bỏ qua quyết định này.
- Chọn một trong hai hướng provider text: tuân thủ Claude theo Constitution, hoặc RFC cho phép registry có Gemini. Kiến trúc adapter không phụ thuộc lựa chọn này.
- Hội đồng chốt ngưỡng MAE/QWK/agreement/subgroup delta và forecast tải/chi phí; plan không tự tạo số đạt chuẩn thiếu dữ liệu.
- Quy tắc Overall decimal/round-half-up ở các tie `.25/.75` đã được chốt trong đặc tả; implementation phải có test đầy đủ và không dùng banker's rounding.
- Product/security duyệt `idempotency_expires_at` và KMS key-retention window; không hard-code TTL tùy ý.
- Có thể triển khai `AI Estimated Band` luyện tập khi các cổng phát hành còn mở. Không được tự chọn calibration threshold, gọi kết quả là điểm IELTS chính thức hoặc tuyên bố production-ready cho tới khi các cổng liên quan được duyệt.

### Bước 1 — Harden migration và schema

- Runner đã có version/checksum, advisory lock và transaction theo file; vẫn không chạy production trước fresh/legacy/restore rehearsal trên PostgreSQL disposable hoặc chuyển sang migration history tương đương do nền tảng quản lý.
- Migration `008a_bootstrap_missing_prerequisites.sql`: chỉ bootstrap enum và schema `library_resources` legacy của migration `012` để sửa phụ thuộc sai thứ tự ở `011`; database hiện hữu là no-op, không tính là bảng feature AI.
- Migration `025_harden_ai_grading_schema.sql`: thêm `grading_failed`, cột/index/soft-delete còn thiếu và tạo `ai_grading_jobs`.
- Migration `026_create_speaking_analysis_artifacts.sql`: tạo artifact table; **không** tạo synthetic job/artifact cho transcript legacy vì không có source job/config đáng tin cậy. Reader chỉ dual-read transcript cũ để hiển thị trong giai đoạn chuyển đổi.
- Audit duplicate trước khi tạo unique index; không DROP dữ liệu.
- Sau audit legacy, thêm CHECK XOR đúng một submission FK và partial unique cho mỗi `tutor_feedback_reports` active trên speaking/writing submission; mọi UPSERT/revoke lọc `deleted_at IS NULL`. Thêm `assigned_tutor_at`, harden claim/assignment tutor cấp group trước handoff.
- Cập nhật toàn bộ reader/history/tutor/export/admin lọc `deleted_at IS NULL` và chọn report job-backed trước khi bật writer mới.

### Bước 2 — Private upload, quota và audio validation

- Dùng private object-storage adapter, cấp signed-upload URL và application token opaque AEAD; response trả riêng hai expiry và client dùng mốc sớm hơn. Production ưu tiên S3 theo Constitution. Nếu dùng Supabase, contract/UX phải chấp nhận signed-upload URL cố định khoảng hai giờ và app-token ngắn hơn không thể thu hồi URL đã phát.
- Token có version/`kid`; KMS key ring giữ decrypt key cũ hết replay window đã persist. Storage HEAD/stat chạy ngoài transaction; transaction ngắn lặp lại idempotency/fingerprint/quota trước insert.
- Deploy song song `audio_storage_key` với `audio_url`; backfill dữ liệu cũ rồi mới chuyển read path.
- Unique storage key chỉ bảo đảm bind-once lúc insert; token stateless không được mô tả là revoke/consume trước thời điểm này.
- Dùng advisory lock theo user + ngày UTC trên cả Writing/Speaking. Trong lock phải lookup/replay idempotency key rồi kiểm unique fingerprint **trước** phép đếm quota; key khác/fingerprint trùng trả `409` với canonical IDs, không tạo alias table. Chỉ request hoàn toàn mới mới reserve quota; không thêm quota ledger nếu hai entrypoint cùng tuân thủ convention.
- Resolve `prompt_id` bằng join `test_passages/mock_tests`: đúng Speaking, published/accessible và đúng Part; lưu source UUID không FK cùng snapshot/hash server-side vì authoring hiện delete/reinsert passage.
- Worker tính SHA-256 từ bytes thật; checksum client chỉ là hint. Kiểm magic bytes, codec, kích thước, duration, silence, clipping và ownership trước provider.
- Runtime hiện giới hạn 50 MB và 15 phút cho mỗi Part, xác minh/normalize nguyên file thành WAV PCM16 mono 16 kHz trong workspace tạm rồi dọn sau job. Chunk tại ranh giới im lặng, overlap/dedup và rebase timestamp chưa được triển khai; chỉ bổ sung khi giới hạn payload provider hoặc load test chứng minh cần.
- Cleanup reconciler quét object quarantine quá 24 giờ theo batch và chỉ xóa khi `audio_storage_key` không tồn tại trong submission chưa hard-delete; không dùng blind lifecycle có thể xóa nhầm object đã bind. Object tag/metadata chỉ là tối ưu, DB vẫn là nguồn kiểm tra. Không cần bảng asset khi không yêu cầu revoke/audit upload trước bind.

### Bước 3 — Job worker bất đồng bộ

- Tách worker entrypoint trong backend, không tạo service repository mới.
- Transaction tạo ba submission + job; API trả `202`.
- Claim bằng `FOR UPDATE SKIP LOCKED`, lease/watchdog; `lease_generation` là fencing token độc lập với `attempt_count`. Mọi heartbeat/artifact/report/final write CAS theo `job_id + lease_owner + lease_generation + running`, nên worker cũ sau lease expiry không thể ghi. `attempt_count` chỉ quản lý ngân sách: job gốc tối đa hai attempt, manual child một attempt.
- Thêm endpoint status/retry và frontend polling có giới hạn.
- Job mới của learner không dùng `needs_review`; lỗi evidence/provider đi theo `retry_wait/failed`. Chỉ submission được tạo ban đầu với `grader=tutor` xuất hiện trong tutor queue.

### Bước 4 — Evidence pipeline

- Lưu output ASR trước hậu xử lý ứng dụng/display transcript và provider version. Interface đã dành chỗ cho words/segments/timestamps/uncertainty, nhưng adapter Gemini hiện trả plain transcript và các trường này là `null`; structured ASR thuộc T068, còn gold-set/policy verbatim-fidelity thuộc T076.
- Tích hợp speech assessment/audio metrics qua adapter.
- Hiện chạy ba Part tuần tự, sau đó chấm cả phiên một lần. Chỉ chuyển sang bounded parallelism sau khi T057/T069 có số liệu quota và load.
- Pin full scoring-config digest gồm model/prompt/media/feature/calibrator; cache evidence theo verified audio hash + digest.
- Load scoring-config/calibration **theo digest đã pin lúc enqueue**, xác minh chữ ký/exact binding; artifact lưu scoring-config digest, report tham chiếu job pin calibration digest. Hiện digest được resolve từ cấu hình process; registry active chưa được triển khai.

### Bước 5 — Scoring, UI và tutor draft

- Validator cho phép band nullable theo evidence mode.
- Learner UI chỉ hiển thị AI report khi `completed/ai_graded`; nút retry chỉ xuất hiện ở `failed` và `can_retry=true`.
- Tutor UI chỉ nhận bài `grader=tutor`; nút AI prelim tạo bản nháp từ transcript + audio, điền bốn tiêu chí nhưng không thay đổi status/report cho tới khi tutor lưu.
- Không hiển thị `raw_ai_response` hoặc intermediate results.
- Reuse tutor queue hiện có cho submission được tạo ngay từ đầu với `pending/tutor`; không handoff bài AI lỗi. `requires_human_review` chỉ còn phục vụ dữ liệu legacy/audit. Revoke tutor feedback chuyển sang soft-delete.
- Mount audio URL route và sửa authorization query: owner, assigned tutor hoặc admin scope; không cho mọi tutor đọc theo UUID.
- Khoảng trống hiện tại: `TutorController.getSubmissionDetail()` chưa truyền `req.user` vào `TutorService.getSubmissionDetail()`, nên detail Speaking bị từ chối cả với tutor đã claim/admin. T073 phải sửa controller và thêm HTTP happy/error-path test trước khi đánh dấu luồng tutor đạt.

### Bước 6 — Calibration và phát hành

- Hiện chỉ có loader/chữ ký/binding gate; worker chưa có nhánh scorer calibrated hoàn chỉnh và scorer chưa dùng bundle để biến output estimate thành kết quả đã hiệu chuẩn. T074 là task triển khai bắt buộc, không được đóng chỉ bằng việc có file bundle hợp lệ hoặc đổi `calibration_version`.
- Shadow-run pipeline trên dữ liệu có điểm người chấm.
- Có thể mở `AI Estimated Band` cho luyện tập khi đủ transcript + audio evidence và cờ estimation bật; giao diện bắt buộc ghi rõ đây không phải điểm IELTS chính thức.
- Chỉ nâng lên kết quả đã hiệu chuẩn/công bố theo chuẩn chất lượng khi calibration gate đạt. Mọi thay đổi feature schema/provider/model/config làm calibration cũ hết hiệu lực nhưng không tự chuyển submission AI sang tutor.
- Đóng gói mapping/threshold/metrics/approval thành bundle bất biến; CI kiểm schema, SHA-256/chữ ký. Nếu bổ sung registry trong tương lai, registry chỉ chọn digest cho job mới; worker đang chạy tiếp tục dùng digest persisted.
- Rollout theo tỷ lệ; audit ngẫu nhiên cả bucket reliability nội bộ cao để phát hiện blind spot/drift.
- Rollback bằng feature flag sẽ dừng nhận yêu cầu AI mới hoặc làm job thất bại rõ ràng; không được âm thầm đổi lựa chọn của học viên sang tutor.

## Quan sát vận hành và chi phí

- Mỗi job có request ID, stage, provider/model, latency và mã lỗi; không log nội dung audio/transcript.
- Chỉ tái sử dụng artifact khi verified `audio_sha256 + scoring_config_sha256` không đổi; nhãn pipeline không đủ làm cache key.
- Một lần gọi text grader cho toàn bộ ba Part, không gọi riêng ba lần.
- Runtime hiện không tự chuyển sang provider thứ hai. Nếu bổ sung shadow provider sau này, chỉ dùng cho evaluation/audit và không tự động coi đồng thuận giữa hai provider là ground truth.
- Dashboard theo dõi queue depth, tuổi job lâu nhất, success/retry/failure rate, latency từng stage, chi phí theo provider và tỷ lệ human review.

## Đối chiếu Constitution sau triển khai foundation

| Cổng | Hiện trạng | Hành động trong plan |
|---|---|---|
| Node 20, Express 5, PostgreSQL/raw `pg` | Đạt | Giữ nguyên |
| React 18 | Không đạt do code dùng React 19 | RFC hoặc hạ phiên bản; không giải quyết ngầm trong feature này |
| AI Grading = Claude | Không đạt do code dùng Gemini | RFC hoặc thay provider trước rollout production |
| Mọi AI call qua grading service | Đạt cho đường grading mới | Worker/transcriber gọi adapter do `grading.service.js` điều phối; chatbot ngoài grading không thuộc feature này |
| Production storage S3 | **Một phần/không đạt cho rollout** | Có adapter private S3/Supabase và không trả public object key, nhưng runtime demo dùng Supabase; phải chọn S3 theo Constitution hoặc có RFC chấp nhận Supabase trước production |
| Upload magic bytes ≤ 50 MB, mp3/m4a/wav | Đạt cho format đang khóa; WebM chưa được phép | Backend kiểm magic byte/size/duration/checksum; browser không có MIME được duyệt phải bị chặn cho tới RFC G-03 |
| `grading_failed`, retry, idempotency | **Một phần** | Job state, enum, unique constraint, fencing và watchdog có test; phân loại provider 5xx xuyên gateway/worker còn mở ở T077 |
| Soft-delete/timestamps | Đạt trong phạm vi reader đã audit | Submission/report/artifact/job và `tutor_feedback_reports` có soft-delete; history/detail/export/stats bỏ row đã xóa |
| API envelope, auth, centralized errors | **Một phần** | Speaking contract/role guard có test, nhưng lỗi Writing ngắn chưa đúng envelope (T070) và tutor detail controller chưa truyền requester context (T073) |
| Tổ chức code ≤300 dòng/file, ≤40 dòng/hàm | **Một phần** | Backend feature mới và hook/summary mới đạt, nhưng các màn hình frontend kế thừa đã tích hợp feature vẫn vượt giới hạn; T059 còn mở |
| Tên nhánh/tạo tác Speckit | **Chưa đạt governance** | Nhánh hiện tại và tên `spec.md` kế thừa khác quy ước Hiến chương; phải đồng bộ bằng thay đổi phối hợp hoặc RFC, không tự đổi trong lượt tài liệu này |
| Coverage ≥80%, mock AI | Provider mock đạt; coverage chưa đo | Đo coverage nghiệp vụ mới và đặt gate CI bằng T056 trước production |

## Các cổng Constitution/release còn mở

Thiết kế đã đưa ra cách đáp ứng SQL, UUID, API envelope, auth, error handling, soft-delete, idempotency, evidence sufficiency và mock provider. Implementation được phép tiến hành ở chế độ fail-closed, nhưng Constitution/release gate vẫn chưa đạt cho production band vì các phê duyệt/giá trị sau còn mở:

1. RFC provider/storage được toàn đội phê duyệt hoặc implementation quay về đúng Claude/S3 như Constitution.
2. Quyết định React 18/19 được xử lý ngoài hoặc cùng RFC.
3. G-03 được giữ kèm browser support giới hạn, hoặc RFC cho phép WebM ingress + normalization được duyệt.
4. Hội đồng ký ngưỡng calibration/fairness và forecast scale/cost; không dùng số tùy ý trong code.
5. Product/security chốt audio retention, `idempotency_expires_at` và thời gian giữ KMS decrypt key tương ứng.
6. T056–T059 cung cấp bằng chứng coverage/load và xử lý nợ cấu trúc frontend trước production.

Không coi việc tài liệu mô tả một hướng là phê duyệt RFC.

## Cấu trúc dự án đã triển khai (rút gọn)

### Tài liệu tính năng

```text
.sdd/specs/ai-fast-grading/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── speaking-grading-api.md
│   └── speaking-grading.openapi.yaml
├── checklists/
│   └── requirements.md
├── tasks.md
├── checklist.md
└── REVIEW_GUIDE.md
```

### Mã nguồn đã triển khai

```text
backend/
├── src/
│   ├── ai/
│   │   ├── grading.service.js
│   │   ├── transcriber.adapter.js
│   │   ├── speechEvidence.adapter.js
│   │   ├── speakingGrading.validator.js
│   │   └── calibration/
│   │       ├── calibration-bundle.schema.json
│   │       └── calibration.loader.js
│   ├── storage/
│   │   └── objectStorage.adapter.js
│   ├── media/
│   │   └── audioNormalizer.service.js
│   ├── jobs/
│   │   ├── aiGrading.worker.js
│   │   └── aiGrading.watchdog.js
│   ├── services/
│   │   ├── speakingSubmission.service.js
│   │   ├── speakingEvidence.service.js
│   │   ├── aiQuota.service.js
│   │   └── speakingGrading.service.js
│   ├── db/queries/
│   │   ├── aiGradingJobs.queries.js
│   │   └── speakingAnalysis.queries.js
│   └── db/migrations/
│       ├── 008a_bootstrap_missing_prerequisites.sql
│       ├── 025_harden_ai_grading_schema.sql
│       └── 026_create_speaking_analysis_artifacts.sql
└── tests/
    ├── unit/
    ├── integration/
    └── contract/

frontend/
├── src/
│   ├── components/grading/
│   ├── pages/subjective-testing/SpeakingTestPage.jsx
│   └── services/grading.service.js
└── tests/
```

**Quyết định cấu trúc**: Giữ modular monolith; API và worker là hai process từ cùng backend package. Không tạo microservice hoặc dependency queue mới trước khi load test chứng minh cần.

## Theo dõi độ phức tạp

| Quyết định có độ phức tạp | Vì sao bắt buộc | Phương án đơn giản hơn bị loại |
|---|---|---|
| Thêm `ai_grading_jobs` | HTTP request không thể giữ an toàn qua nhiều provider; cần retry/lease/idempotency bền vững | Dùng `ai_grading_reports` làm queue làm trộn state mutable với kết quả bất biến |
| Thêm `speaking_analysis_artifacts` | Cần evidence từng Part có phiên bản và không ghi đè transcript | Thêm JSONB trực tiếp vào `speaking_submissions` làm mất lịch sử khi regrade/model đổi |
| Worker process riêng | Tách timeout/provider khỏi request nhưng vẫn dùng cùng codebase | `setImmediate` hoặc xử lý nền trong API process mất job khi process restart |
| Adapter phân tích audio | Transcript không chứa pronunciation/prosody | Runtime Gemini nhận audio + ASR để tạo evidence luyện tập; nhãn đã hiệu chuẩn vẫn cần gold set, bundle và approval |

## Tạo tác thiết kế và cổng tiếp theo

- Quyết định và nguồn tham khảo: [research.md](./research.md)
- Schema và chiến lược tái sử dụng: [data-model.md](./data-model.md)
- Hợp đồng API/state/result: [contracts/speaking-grading-api.md](./contracts/speaking-grading-api.md) và [OpenAPI 3.1](./contracts/speaking-grading.openapi.yaml)
- Hướng dẫn kiểm chứng implementation: [quickstart.md](./quickstart.md)

`spec.md`, `tasks.md`, checklist và contract được đối chiếu với implementation hiện tại. T001–T054 là foundation; T060–T066 ghi nhận phần code/test mô phỏng cho bốn tiêu chí, tutor prelim và semantics retry-only-after-failure. T055–T059 cùng T067–T069 là cổng môi trường/production hoặc nâng cấp còn mở. Phase 11 giữ T070–T071 mở cho Writing, T073 cho tutor detail/envelope, T074 cho calibrated branch thật, T075 cho nội dung UI, T076 cho fidelity gate và T077 cho phân loại retry provider; T072 đã khép bằng `.env.example` an toàn ở root. Không được tuyên bố toàn bộ regression xanh trước khi các test tương ứng đạt. `AI Estimated Band` chỉ nên demo sau provider smoke thành công; kết quả chỉ được gọi là đã hiệu chuẩn sau khi T074/T076 cùng calibration/RFC gate có bằng chứng.
