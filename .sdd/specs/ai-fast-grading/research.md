# Nghiên cứu và quyết định: Production hóa AI Speaking Grading

**Ngày**: 2026-07-22

**Phạm vi**: Bằng chứng audio, transcript, chấm bất đồng bộ, lưu trữ, database tối thiểu và calibration cho `.sdd/specs/ai-fast-grading`.

Tài liệu này giải quyết các điểm chưa rõ của kế hoạch. Người dùng đã cho phép triển khai foundation/shadow/fail-closed ngày 2026-07-22; tài liệu vẫn không thay thế RFC hoặc quyền bật band Speaking production.

## Quyết định 1: Dùng pipeline bằng chứng lai, không dùng một model end-to-end

**Quyết định**: Tách pipeline thành ba lớp độc lập:

1. Output ASR trước mọi hậu xử lý của ứng dụng, kèm timestamp/uncertainty.
2. Phân tích audio cho quality, fluency và pronunciation.
3. Text grader tổng hợp rubric; calibrator tạo riêng bốn criterion-band, còn backend bỏ Overall provider, tính trung bình bằng decimal và làm tròn nửa band với tie `.25/.75` hướng lên. Quy tắc này là proposal phải được hội đồng duyệt và test đủ tám fraction có thể sinh từ bốn half-band.

**Lý do**: IELTS Speaking yêu cầu đánh giá hesitation, repetition, self-correction, tốc độ, rhythm, stress, intonation và intelligibility. Transcript thuần không giữ đủ các tín hiệu này. Bốn tiêu chí Speaking có trọng số bằng nhau; Overall không phải giá trị để LLM tự đặt. [IELTS Speaking Band Descriptors](https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf), [IELTS scoring in detail](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail)

**Các phương án đã cân nhắc**:

- Gemini audio chấm toàn bộ trong một request: tích hợp ngắn nhưng không có mapping IELTS hoặc phoneme score được công bố; chỉ phù hợp làm second opinion/feedback định tính.
- Transcript-only: chỉ đủ cho feedback chữ có cảnh báo; không đủ để cấp bất kỳ IELTS criterion band hoặc Overall nếu chưa có fidelity/calibration evidence.
- Full local ML ngay từ đầu: giảm lock-in nhưng cần dữ liệu, GPU/MLOps và calibration vượt phạm vi hiện tại.

## Quyết định 2: Giữ audio gốc bất biến và tách ASR/display transcript

**Quyết định**: Audio gốc không bị ghi đè. Mỗi tổ hợp verified audio + scoring-config digest tạo một artifact có `pipeline_version`, `audio_sha256`, provider/model và thời điểm; retry cùng exact config tái sử dụng artifact terminal hợp lệ thay vì ghi đè hoặc nhân bản. Lưu riêng:

- `asr_transcript`: output nguyên bản do provider trả về trước mọi hậu xử lý của ứng dụng. Đây không phải ground truth/verbatim và không chứng minh filler, lỗi phát âm hoặc lỗi ngữ pháp đã được giữ.
- `display_transcript`: thêm dấu câu/làm sạch chỉ để hiển thị.
- `words_json`/`segments_json`: timestamp, provider uncertainty/log probability và alternative khi có.

**Lý do**: ASR có thể chuẩn hóa lời nói hoặc suy ra từ người học định nói. Nếu chỉ lưu một chuỗi cuối, hệ thống không thể biết lỗi grammar/pronunciation đã bị che hay chưa. Provider uncertainty cao giúp phát hiện vùng đáng ngờ, nhưng uncertainty thấp không loại trừ intent bias/over-correction. `whisper-1` hỗ trợ verbose output và timestamp ở mức từ, phù hợp với adapter hiện có hơn việc chỉ lấy `data.text`. [OpenAI Speech-to-Text — timestamps](https://developers.openai.com/api/docs/guides/speech-to-text#timestamps)

**Các phương án đã cân nhắc**:

- Ghi đè `speaking_submissions.transcript`: ít cột nhưng mất lịch sử và không audit được regrade.
- Chỉ lưu transcript display: dễ đọc nhưng phá hủy bằng chứng dùng để chấm.
- Lưu raw provider payload không giới hạn: khó kiểm soát PII/schema; chỉ lưu các trường đã whitelist.

## Quyết định 3: Provider production là adapter có version, không khóa nghiệp vụ vào hãng

**Quyết định**: Thiết kế ba interface `Transcriber`, `SpeechEvidenceProvider`, `RubricScorer`. Cấu hình khởi đầu được đề xuất:

- `whisper-1` structured output cho transcript/timestamps vì code đã có nhánh OpenAI.
- Azure Pronunciation Assessment `unscripted` cho Accuracy/Fluency/Prosody và word/phoneme evidence.
- Text scorer được pin model stable: Claude nếu tuân thủ Constitution hiện tại; Gemini chỉ khi RFC cho phép.

Azure unscripted dùng recognition stream riêng, không phải transcript Whisper. Adapter phải chạy continuous recognition cho audio dài hơn 30 giây, pin `en-US`/SDK/config/segmentation, chỉ lưu provider-local words/timestamps/phoneme đã whitelist và align theo thời gian/token với ASR chính. Alignment coverage/disagreement là evidence gate; dưới ngưỡng calibration làm Pronunciation/F&C liên quan `insufficient`, không âm thầm chọn transcript thuận lợi hơn.

Tất cả lời gọi đi qua `backend/src/ai/grading.service.js`; provider/model/config/pipeline được lưu cùng artifact/report.

**Lý do**: Azure có chế độ unscripted dành cho speaking và trả accuracy, fluency, prosody; prosody bao gồm stress, intonation, speaking speed và rhythm. Các điểm này chỉ là feature, không phải IELTS band. Prosody hiện có giới hạn locale, vì vậy bắt buộc kiểm tra bias và có human review. [Microsoft Pronunciation Assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment)

Gemini có thể hiểu audio, transcribe và tham chiếu timestamp, nhưng Google định vị đây là audio understanding và khuyến nghị dịch vụ STT chuyên dụng cho use case STT chuyên biệt. [Gemini Audio Understanding](https://ai.google.dev/gemini-api/docs/audio)

**Các phương án đã cân nhắc**:

- Đổi toàn bộ sang một provider: giảm số integration nhưng tăng lock-in và không chứng minh được tính hợp lệ của Pronunciation.
- Azure score 0–100 quy đổi tuyến tính sang IELTS 0–9: không có cơ sở calibration, bị loại.
- Alias model `latest`: có thể thay đổi âm thầm và làm mất khả năng lặp lại; production phải pin model stable. [Gemini model version patterns](https://ai.google.dev/gemini-api/docs/models#model-version-name-patterns)

**Quản trị**: Constitution khóa `claude-sonnet-4-20250514` và S3 production; code hiện dùng Gemini/Supabase. Plan không tự hợp thức hóa sai lệch này. Phải có RFC được toàn đội duyệt hoặc implementation quay lại stack đã khóa.

## Quyết định 4: Dùng PostgreSQL làm durable queue trước khi cân nhắc BullMQ

**Quyết định**: Tạo bảng `ai_grading_jobs`; worker claim job bằng transaction và `FOR UPDATE SKIP LOCKED`, có lease, watchdog, retry và unique idempotency. Redis không tham gia correctness của phiên bản đầu.

Retry budget của một submission chain là ba lần chạy pipeline: job gốc tối đa hai attempt tự động, sau đó learner có tối đa một manual retry child nếu lỗi provider còn retryable. Worker mới không tạo `needs_review`; lỗi giữ ở luồng AI và không handoff tutor.

**Lý do**:

- PostgreSQL đã là source of truth và dependency bắt buộc.
- Redis hiện là optional/fallback cho session cache; dùng BullMQ sẽ biến nó thành dependency production mới.
- Job và submission được tạo trong cùng transaction, tránh dual-write DB/Redis.
- PostgreSQL 16 hỗ trợ `SKIP LOCKED`, phù hợp cho nhiều worker claim các hàng queue khác nhau. [PostgreSQL 16 SELECT locking clause](https://www.postgresql.org/docs/16/sql-select.html)

**Các phương án đã cân nhắc**:

- Xử lý trong HTTP request: dễ timeout và retry trùng.
- `setImmediate` trong API process: job mất khi process restart.
- BullMQ ngay lập tức: tốt khi throughput lớn nhưng thêm hạ tầng/HA/persistence chưa được load test chứng minh.
- Dùng `ai_grading_reports` làm queue: trộn operational state mutable với report nghiệp vụ cần bất biến.

**Điều kiện nâng cấp**: Chỉ chuyển sang BullMQ/managed queue khi load test cho thấy PostgreSQL queue không đáp ứng queue latency hoặc tạo contention đáng kể.

## Quyết định 5: Chỉ thêm hai bảng feature mới

**Quyết định**:

- Thêm `ai_grading_jobs`.
- Thêm `speaking_analysis_artifacts`, gộp transcript có phiên bản và audio evidence.
- Tái sử dụng `speaking_submissions`, `ai_grading_reports`, `ai_usage_logs`, `tutor_feedback_reports`, `assigned_tutor_id` và `speaking_group_id`.

**Lý do**: Hai vòng đời dữ liệu chưa có nơi lưu đúng nghĩa:

1. Job thay đổi state/lease/retry trước khi report tồn tại.
2. Một Part có nhiều lần phân tích theo audio hash/scoring-config digest; không được ghi đè evidence cũ. `pipeline_version` chỉ là metadata dễ đọc, không phải cache authority.

Các loại dữ liệu còn lại đã có bảng phù hợp hoặc có thể lưu bằng JSONB đã được document.

Nếu không dùng migration history do nền tảng quản lý, một `schema_migrations` dùng chung toàn repository có thể được platform migration hardening bổ sung sau preflight. Nó không phải feature table và không được nhân bản dưới namespace AI.

**Các phương án đã cân nhắc**:

- `speaking_attempts`/`speaking_attempt_answers`: không có runtime sử dụng và mô hình audio từng câu, trong khi UI hiện thu một audio cho mỗi Part; dùng lại sẽ tạo nguồn sự thật thứ hai.
- Bảng `speaking_audio_assets`: chưa cần vì private object-storage metadata, application token opaque AEAD và unique storage key trên submission đủ cho atomic bind-once. Phương án này chủ động không cung cấp revoke/one-time state trước bind.
- Tách `speaking_transcriptions`, `speaking_audio_quality`, `speaking_pronunciation`: chuẩn hóa cao hơn nhưng tạo quá nhiều join/bảng cho quy mô hiện tại; gộp thành một artifact có schema version.
- Bảng `job_attempts`: provider attempts đã được lưu trong `ai_usage_logs`; job chỉ cần attempt tổng và lỗi cuối.

## Quyết định 6: Private object-storage adapter, direct signed upload và object key thay public URL

**Quyết định**: Browser xin signed-upload URL và application token opaque AEAD, upload trực tiếp vào private bucket. Database lưu `audio_storage_key`; endpoint nghe audio chỉ cấp signed URL ngắn hạn sau khi kiểm quyền. Production mặc định dùng S3 theo Constitution. Adapter Supabase chỉ được dùng production khi RFC chấp nhận khác biệt TTL/ACL; có thể tiếp tục dùng trong dev/chuyển đổi.

**Lý do**: Audio là PII. Private bucket chỉ cho download qua authenticated request hoặc signed URL có hạn; public URL khó đoán không phải authorization. Với Supabase, public bucket bỏ qua access control khi tải asset. [Supabase Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

Direct upload tránh giữ toàn bộ file tới 50 MB trong RAM của Express. Supabase signed-upload URL hiện có hiệu lực cố định khoảng hai giờ; app token hết hạn sớm hơn không thu hồi được URL Storage đã phát, nên không được mô tả nó như token one-time/revocable. S3 target cho phép TTL ngắn và checksum policy linh hoạt hơn. [Supabase signed upload URL](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)

**Các phương án đã cân nhắc**:

- Tiếp tục upload qua `multer.memoryStorage()`: đơn giản nhưng tốn RAM và khó scale.
- Public URL bí mật theo UUID: URL khó đoán không phải authorization.
- Thêm bảng asset riêng: chỉ cần nếu product yêu cầu revoke, one-time state hoặc audit lifecycle trước bind. Release này dùng quarantine prefix, unique key khi bind và cleanup reconciler chỉ xóa object quá 24 giờ sau khi cross-check không có `speaking_submissions.audio_storage_key`; không dùng blind lifecycle.

## Quyết định 7: Tách Fluency & Coherence thành evidence nhưng vẫn công bố một band

**Quyết định**:

- Coherence/relevance được đánh giá từ logical sequencing, relevance và cách dùng cohesive/discourse devices trong nội dung transcript. Vì ASR có thể bỏ/sửa discourse marker, repair hoặc nội dung logic, vế này phụ thuộc cùng verbatim-fidelity gate với Lexical/GRA; nếu gate không đạt thì band Fluency & Coherence kết hợp phải `null` dù timing audio vẫn có.
- Fluency features gồm speech/articulation rate, timing, pause, repair, repetition, false start, self-correction và mean length of run. Filler/discourse marker phải được phân loại theo chức năng/ngữ cảnh; không trừ điểm theo raw count.
- Calibrator học cách hợp nhất thành một band Fluency & Coherence; không đặt trọng số 50/50 tùy ý.
- Pronunciation dùng acoustic proxies về segmental accuracy, stress, rhythm, intonation, chunking/connected speech. Intelligibility/listener effort chỉ được suy ra qua mapping đã validate bằng human listener ratings, không coi là output trực tiếp của Azure hoặc ASR uncertainty.

**Lý do**: Band descriptor đánh giá cụm tín hiệu qua toàn bộ ba Part; không một metric riêng lẻ nào đại diện đầy đủ. Điểm provider chỉ là input feature.

**Các phương án đã cân nhắc**:

- LLM tự chọn band cuối: thiếu lặp lại và khó audit.
- Trung bình trực tiếp các score provider: khác thang đo và chưa hiệu chuẩn.
- Chấm/average từng Part: không đúng mục tiêu đánh giá cả phiên; giữ feature từng Part nhưng calibrate session-level.

## Quyết định 8: Calibration và abstention là cổng phát hành

**Quyết định**: Thu dữ liệu đủ ba Part từ người Việt. Mỗi phiên có ít nhất hai giám khảo đạt chuẩn, chấm độc lập và mù với AI/provider output; dùng anchor, inter-rater gate, adjudication và drift audit. Tách train/calibration/locked holdout theo speaker. Hiệu chuẩn riêng từng tiêu chí. Kết quả có band ghi `estimated`; transcript-only không được chấm, còn evidence/uncertainty không đạt làm job retry/failed và không chuyển tutor.

**Lý do**: Không provider nào trong kiến trúc cung cấp mapping IELTS chính thức cho dữ liệu người Việt. Tính hợp lệ phải được đo với gold set nội bộ thay vì suy ra từ WER hoặc điểm phát âm 0–100.

**Chỉ số đánh giá**:

- MAE theo criterion và overall.
- Exact agreement và adjacent agreement trong ±0.5 band.
- Quadratic weighted kappa.
- Calibration error và reliability nội bộ cho event adjacent agreement `abs(system_band - adjudicated_human_band) <= 0.5`.
- Sai lệch theo accent vùng miền, giới, thiết bị, noise và band range.

Calibration chỉ hợp lệ cho đúng feature schema/provider/model/locale/SDK/media/feature config và population. Threshold không chọn trên locked holdout. Bundle khóa event đích, bucket, point estimate, **speaker-cluster bootstrap** 95% CI, speaker/session count, slice, dataset hash và approval; per-result dùng cận dưới CI. Bucket thiếu minimum speaker count trả `null`/handoff. Release còn phải đạt minimum automation coverage và maximum review rate toàn cohort/từng subgroup, tránh đạt metric bằng abstain gần hết. Giá trị reliability chỉ lưu nội bộ, không thay bằng self-confidence/provider score.

Source of truth không cần bảng mới: bundle/manifest bất biến nằm trong build artifact hoặc private object store, có schema, SHA-256 và chữ ký release. Enqueue resolve registry rồi pin scoring-config/calibration digest trên job; manual child copy nguyên digest và worker không chuyển sang registry mới. Manifest pin prompt hash, provider/model/locale/SDK, ffmpeg/normalizer, local feature và calibrator. Report lưu version/digest để audit/replay.

**Các phương án đã cân nhắc**:

- Release ngay với disclaimer: không đủ cho production và khó bảo vệ trước hội đồng.
- Chỉ audit bài empirical reliability thấp: không phát hiện drift ở nhóm cao; cần thêm random audit.

## Quyết định 9: Evidence sufficiency theo từng tiêu chí và transcript-only phải fail closed

**Quyết định**:

- `full_audio` chỉ hợp lệ khi cả ba Part có artifact `complete`, hash khớp, quality đủ, evidence bắt buộc của mọi tiêu chí là `sufficient` và provider/model/config khớp exact calibration bundle/digest đã pin trên job.
- Đủ ba file audio nhưng uncertainty cao, ngoài phân phối hoặc bất đồng evidence vẫn không phải `full_audio`: worker mới retry/failed toàn phiên. `partial_audio` chỉ còn là representation legacy/audit.
- Nếu có audio nhưng thiếu bất kỳ Part/component/calibration nào, dùng `partial_audio`; tiêu chí bị ảnh hưởng có band `null` và Overall luôn `null` nếu còn một band thiếu.
- Với `transcript_only`, cả bốn `criteria.*.band` và `overall_band` đều `null`. Chỉ lưu `text_based_feedback`, không trình bày nó như IELTS criterion score; khi group còn `pending/tutor`, learner không được xem reviewer reference theo IELTS-07.
- Mỗi tiêu chí ghi `evidence_status = sufficient | insufficient | unavailable` và evidence refs; validator từ chối `band != null` khi status khác `sufficient`.
- `is_partial_assessment=true` và `requires_human_review=true` khi người học cần đủ band.

**Lý do**: “Có audio” không đồng nghĩa đủ evidence, và “ASR output chưa qua hậu xử lý của ứng dụng” không đồng nghĩa verbatim. Hệ thống production phải từ chối chấm tiêu chí không đủ bằng chứng thay vì làm đầy schema bằng số giả.

**Các phương án đã cân nhắc**:

- Giữ Lexical/Grammar/Pronunciation score từ transcript rồi thêm disclaimer: người dùng/UI vẫn dễ hiểu nhầm và Overall vẫn bị nhiễm.
- Dùng `0` thay `null`: biến “không có dữ liệu” thành “năng lực bằng 0”, bị loại.

## Quyết định 10: Migration production cần version history và lock

**Quyết định**: Không dùng trực tiếp `backend/scripts/migrate.js` hiện tại cho production vì script chạy lại toàn bộ SQL, không ghi version/checksum và nuốt lỗi ở process level. Dùng migration history của nền tảng hoặc harden runner với advisory lock, version/checksum và exit code khác 0.

**Lý do**: Schema mới có backfill và unique index; chạy đồng thời hoặc chạy lặp không được kiểm soát có thể tạo trạng thái dở dang.

**Các phương án đã cân nhắc**:

- Chỉ viết mọi migration `IF NOT EXISTS`: không phát hiện file đã bị sửa sau khi áp dụng và không bảo vệ hai deploy đồng thời.
- Tạo thêm bảng feature-specific để tracking: không cần; dùng cơ chế migration dùng chung của nền tảng.

## Quyết định 11: Chuẩn hóa/chunk audio tại worker boundary

**Quyết định**: Giữ product limit 50 MB nhưng không gửi nguyên file một cách mù quáng cho provider. Worker dùng `ffprobe`/`ffmpeg` phiên bản pin để validate/decode và tạo derivative chuẩn hóa trong workspace tạm. Nếu vượt giới hạn provider, cắt tại ranh giới im lặng có overlap, ghép/deduplicate transcript và rebase timestamp về timeline Part gốc.

Fluency/audio-quality metrics phải chạy trên timeline toàn Part trước khi chunk để không làm mất pause hoặc đếm overlap hai lần; chunk chỉ là transport boundary cho provider có file-size limit.

**Lý do**: Browser hiện có thể tạo WebM/Opus, trong khi constraint G-03 khóa mp3/m4a/wav; provider STT cũng có giới hạn file thấp hơn 50 MB. Audio normalization là ranh giới duy nhất để kiểm codec, duration và timestamp nhất quán. OpenAI Speech-to-Text hiện nêu giới hạn upload 25 MB. [OpenAI Speech-to-Text](https://developers.openai.com/api/docs/guides/speech-to-text)

**Các phương án đã cân nhắc**:

- Hạ toàn bộ product limit xuống 25 MB: đơn giản nhưng thay constraint sản phẩm và vẫn không giải quyết browser codec.
- Transcode trong browser: tăng CPU/battery, hành vi khác nhau theo thiết bị và khó audit.
- Gửi 50 MB trực tiếp rồi chờ provider lỗi: không production-safe.

**Quản trị**: Cho tới khi G-03 được sửa/RFC duyệt, contract chỉ chấp nhận mp3/m4a/wav. WebM ingress trong plan là đề xuất bị block, không phải format đã được phép.

## Quyết định 12: Tận dụng job/submission cho quota, không thêm ledger ngay

**Quyết định**: Dùng PostgreSQL transaction advisory lock theo `user_id + UTC date`. Trong cùng transaction, đếm distinct original `ai_grading_jobs` Speaking và distinct Writing groups đã được chấp nhận, rồi reserve submission/job mới. Retry tự động và một manual retry generation hợp lệ bị loại khỏi quota.

**Lý do**: Job/submission đã là durable reservation; thêm quota ledger sẽ trùng dữ liệu. Advisory lock làm hai request đồng thời không cùng vượt mức 10/ngày.

**Các phương án đã cân nhắc**:

- Chỉ count không lock: race condition.
- Redis counter: Redis hiện optional và không được làm correctness source.
- Bảng quota ledger: chỉ cần khi policy có credit/refund/timezone phức tạp hơn; chưa có requirement đó.

Writing và Speaking phải dùng cùng convention trước khi tuyên bố quota dùng chung production-ready.

## Quyết định 13: Điểm luyện tập AI và tutor là hai luồng độc lập

**Quyết định**: Với bài nộp có `grader=ai`, Gemini nhận transcript ASR chưa sửa cùng audio thật của đủ ba Part. Transcript cung cấp bằng chứng cho Coherence, Lexical Resource và Grammatical Range & Accuracy; audio cung cấp bằng chứng bắt buộc cho Fluency và Pronunciation. Chỉ khi đủ bốn tiêu chí, hệ thống mới trả Overall dưới nhãn `AI Estimated Band` và disclaimer không phải điểm IELTS chính thức.

Provider/evidence lỗi đi theo state machine `retry_wait → failed`; hệ thống không đổi `grader` sang `tutor` và không đưa bài vào tutor queue. `needs_review`/`partial_audio` được giữ để đọc dữ liệu lịch sử, không còn là kết quả do worker learner mới tạo.

Với bài nộp có `grader=tutor`, tutor queue hoạt động như trước. Sau khi được phân công, tutor có thể gọi AI prelim để lấy bản nháp đủ bốn tiêu chí từ transcript + audio, nhưng bản nháp không tự ghi tutor report, không đổi trạng thái và không thay quyền quyết định của tutor.

**Lý do**: Đây là ranh giới nghiệp vụ người dùng đã chốt. Nó tránh biến lỗi kỹ thuật của AI thành một yêu cầu chấm người thật ngoài lựa chọn ban đầu, đồng thời vẫn cho tutor công cụ hỗ trợ khi học viên chủ động chọn tutor.

**Calibration**: Calibration/fairness vẫn là cổng kiểm soát chất lượng cho release đã hiệu chuẩn. Thiếu bundle không ngăn kết quả luyện tập có nhãn rõ ràng, nhưng kết quả đó không được gọi là điểm IELTS chính thức hoặc dùng cho quyết định có hệ quả cao.

## Kết luận nghiên cứu

Kiến trúc kỹ thuật đã được chọn để triển khai điểm luyện tập AI fail-closed theo evidence: chỉ trả đủ bốn tiêu chí hoặc thất bại rõ ràng, không trả điểm một phần và không tự chuyển tutor. Các cổng governance/business sau vẫn chặn việc nâng kết quả này thành điểm đã hiệu chuẩn:

1. `spec.md` đã được sửa: transcript-only không sinh bất kỳ IELTS criterion band/Overall và đã thêm `partial_audio`.
2. RFC provider/storage/React/audio format để xử lý xung đột với Constitution/G-03.
3. Hội đồng chốt ngưỡng MAE/QWK/agreement/subgroup delta cho calibration release gate.
4. Thuật toán làm tròn Overall ở tie `.25/.75` đã được chốt trong đặc tả và phải được kiểm thử.
5. Product xác nhận forecast enqueue/audio phút/retention-cost để thay sizing baseline trong plan.

Có thể bật `AI Estimated Band` cho luyện tập với disclaimer. Không được tự tạo threshold, gọi kết quả này là điểm IELTS chính thức hoặc tuyên bố production-ready khi các cổng còn lại chưa đạt.
