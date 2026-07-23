# Nghiên cứu và quyết định: Production hóa AI Speaking Grading

**Ngày**: 2026-07-22

**Phạm vi**: Bằng chứng audio, transcript, chấm bất đồng bộ, lưu trữ, database tối thiểu và calibration cho `.sdd/specs/ai-fast-grading`.

Tài liệu này giải quyết các điểm chưa rõ của kế hoạch. Người dùng đã cho phép triển khai foundation/shadow/fail-closed ngày 2026-07-22; tài liệu vẫn không thay thế RFC hoặc quyền bật band Speaking production.

## Quyết định 1: Dùng pipeline nhiều bước, không tin một output điểm end-to-end

**Quyết định**: Tách pipeline thành ba bước có contract riêng, dù runtime hiện tại có thể dùng cùng nhà cung cấp Gemini:

1. Transcription trả output ASR trước mọi hậu xử lý của ứng dụng. Adapter Gemini hiện chỉ trả plain transcript; `words/segments/uncertainty` là `null` và structured ASR thuộc T068.
2. Gemini nhận audio đã normalize cùng ASR transcript để tạo evidence Fluency và Pronunciation có schema/allowlist.
3. Gemini rubric scorer tổng hợp transcript + audio evidence thành bốn criterion-band; backend bỏ Overall do provider khai, tính trung bình bằng decimal và làm tròn nửa band với tie `.25/.75` hướng lên.

Nhánh luyện tập dùng version scorer và nhãn `AI Estimated Band`; không cần calibration bundle khi cờ estimate bật. Calibrator/bundle chỉ bắt buộc khi muốn nâng kết quả thành mức đã hiệu chuẩn/công bố production.

**Lý do**: IELTS Speaking yêu cầu đánh giá hesitation, repetition, self-correction, tốc độ, rhythm, stress, intonation và intelligibility. Transcript thuần không giữ đủ các tín hiệu này. Bốn tiêu chí Speaking có trọng số bằng nhau; Overall không phải giá trị để LLM tự đặt. [IELTS Speaking Band Descriptors](https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf), [IELTS scoring in detail](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail)

**Các phương án đã cân nhắc**:

- Tin nguyên một response Gemini gồm cả criterion và Overall: tích hợp ngắn nhưng không kiểm được evidence/Overall; bị loại. Runtime vẫn dùng Gemini nhưng tách adapter, validate schema/evidence và tự tính Overall ở backend.
- Transcript-only: chỉ đủ cho feedback chữ có cảnh báo; không đủ để cấp bất kỳ IELTS criterion band hoặc Overall nếu chưa có fidelity/calibration evidence.
- Full local ML ngay từ đầu: giảm lock-in nhưng cần dữ liệu, GPU/MLOps và calibration vượt phạm vi hiện tại.

## Quyết định 2: Giữ audio gốc bất biến và tách ASR/display transcript

**Quyết định**: Audio gốc không bị ghi đè. Mỗi tổ hợp verified audio + scoring-config digest tạo một artifact có `pipeline_version`, `audio_sha256`, provider/model và thời điểm; retry cùng exact config tái sử dụng artifact terminal hợp lệ thay vì ghi đè hoặc nhân bản. Lưu riêng:

- `asr_transcript`: output nguyên bản do provider trả về trước mọi hậu xử lý của ứng dụng. Đây không phải ground truth/verbatim và không chứng minh filler, lỗi phát âm hoặc lỗi ngữ pháp đã được giữ.
- `display_transcript`: thêm dấu câu/làm sạch chỉ để hiển thị.
- `words_json`/`segments_json`/`asr_uncertainty_json`: cột dự phòng nullable. Runtime Gemini hiện ghi `null`; chỉ có dữ liệu khi T068 bổ sung adapter structured và test tương ứng.

**Lý do**: ASR có thể chuẩn hóa lời nói hoặc suy ra từ điều người học định nói. Tách ASR/display ngăn ứng dụng tự sửa grammar rồi dùng bản sửa để chấm. Tuy nhiên, plain transcript hiện tại không chứng minh filler/lỗi đã được giữ; structured timestamp/uncertainty chỉ là khả năng nâng cấp, không phải bằng chứng runtime đang có.

**Các phương án đã cân nhắc**:

- Ghi đè `speaking_submissions.transcript`: ít cột nhưng mất lịch sử và không audit được regrade.
- Chỉ lưu transcript display: dễ đọc nhưng phá hủy bằng chứng dùng để chấm.
- Lưu raw provider payload không giới hạn: khó kiểm soát PII/schema; chỉ lưu các trường đã whitelist.

## Quyết định 3: Provider đi qua adapter có version; runtime hiện tại dùng Gemini

**Quyết định**: Giữ ba interface `Transcriber`, `SpeechEvidenceProvider`, `RubricScorer` để nghiệp vụ không phụ thuộc trực tiếp vào hãng. Implementation hiện tại là:

- `ExistingProviderTranscriberAdapter` gọi gateway hiện có. Khi không có OpenAI key, cấu hình dùng Gemini; output chỉ có `asrTranscript`, `displayTranscript` và manifest `plain_transcript`, còn words/segments/uncertainty là `null`.
- `GeminiSpeechEvidenceAdapter` nhận audio WAV của từng Part cùng ASR transcript, trả evidence Fluency/Pronunciation đã whitelist và trạng thái `sufficient|insufficient`.
- `GeminiSpeakingRubricScorer` chấm cả phiên từ ba artifact và luôn gắn `assessment_type=estimated`; Overall do backend kiểm tra/tính lại.
- Worker xử lý Part 1, 2, 3 tuần tự. Không có Azure adapter, continuous recognition hoặc alignment hai transcript trong code hiện tại.

Tất cả lời gọi đi qua `backend/src/ai/grading.service.js`; provider/model/config/pipeline được lưu cùng artifact/report.

**Lý do**: Đây là đúng ranh giới code đang chạy và cho phép thay adapter sau này mà không đổi API/database. Gemini audio evidence phù hợp cho feedback luyện tập nhưng không tự chứng minh mapping IELTS chính thức; calibration/fairness gate vẫn bắt buộc cho nhãn đã hiệu chuẩn.

**Các phương án đã cân nhắc**:

- Bổ sung Azure/phoneme provider ngay: có thể tạo evidence chi tiết hơn nhưng chưa có adapter, SDK, alignment hoặc test; chỉ được xem là phương án tương lai sau RFC/calibration, không phải runtime hiện tại.
- Quy đổi tuyến tính score provider sang IELTS 0–9: không có cơ sở calibration, bị loại.
- Alias model `latest`: grading model đã bị chặn ở production; transcription model chưa có validation tương đương và được theo dõi ở T068.

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
- Nhánh estimate để Gemini rubric scorer hợp nhất evidence thành một band Fluency & Coherence và luôn gắn disclaimer; không đặt trọng số 50/50 tùy ý trong code.
- Pronunciation hiện dựa trên evidence định tính do Gemini phân tích trực tiếp từ audio (`intelligibility`, segmental accuracy, word stress, rhythm, intonation, connected speech). Đây là AI estimate; chỉ được gọi là đã hiệu chuẩn sau khi mapping được validate bằng human ratings và bundle/approval đạt gate.

**Lý do**: Band descriptor đánh giá cụm tín hiệu qua toàn bộ ba Part; không một metric riêng lẻ nào đại diện đầy đủ. Điểm provider chỉ là input feature.

**Các phương án đã cân nhắc**:

- Tin band/Overall tự do từ LLM mà không schema/evidence/backend validation: thiếu lặp lại và khó audit.
- Trung bình trực tiếp các score provider: khác thang đo và chưa hiệu chuẩn.
- Chấm/average từng Part: không đúng mục tiêu đánh giá cả phiên; giữ feature từng Part nhưng calibrate session-level.

## Quyết định 8: Calibration là cổng nâng cấp nhãn chất lượng, không chặn AI estimate

**Quyết định đích**: Có hai mức phát hành tách biệt:

- **Luyện tập AI estimate**: khi `AI_SPEAKING_ESTIMATED_BANDS_ENABLED=true`, đủ transcript + audio evidence thì trả `AI Estimated Band` với version scorer và disclaimer; `calibration_bundle_sha256` có thể `null`.
- **Đã hiệu chuẩn/công bố production**: yêu cầu calibration bundle hợp lệ, scorer thực sự áp dụng mapping/threshold/reliability từ bundle, `AI_SPEAKING_PUBLISH_BANDS=true`, RFC/approval và gold-set gate. Thu dữ liệu đủ ba Part từ người Việt; mỗi phiên có ít nhất hai giám khảo đạt chuẩn, chấm độc lập và mù với output AI, rồi đánh giá trên split theo speaker.

Ở cả hai mức, transcript-only không được chấm và evidence bắt buộc không đủ làm job retry/failed; không tự chuyển tutor.

**Hiện trạng code**: Worker đã load/xác minh bundle và kiểm gate, nhưng `GeminiSpeakingRubricScorer.score()` chỉ nhận `{artifacts, parts, job}` và bỏ qua `calibrationBundle`; các band vẫn là output estimate của Gemini, `assessment_type` vẫn là `estimated`. Worker chỉ gán `calibration_version` theo version bundle, thao tác này không phải calibration. Vì vậy nhánh đã hiệu chuẩn chưa tồn tại ở runtime, `AI_SPEAKING_PUBLISH_BANDS` phải giữ `false` và T074 phải bổ sung mapping cùng test chống “đổi nhãn nhưng không đổi phép chấm”.

**Lý do**: Không provider nào trong kiến trúc cung cấp mapping IELTS chính thức cho dữ liệu người Việt. Tính hợp lệ phải được đo với gold set nội bộ thay vì suy ra từ WER hoặc điểm phát âm 0–100.

**Chỉ số đánh giá**:

- MAE theo criterion và overall.
- Exact agreement và adjacent agreement trong ±0.5 band.
- Quadratic weighted kappa.
- Calibration error và reliability nội bộ cho event adjacent agreement `abs(system_band - adjudicated_human_band) <= 0.5`.
- Sai lệch theo accent vùng miền, giới, thiết bị, noise và band range.

Calibration chỉ hợp lệ cho đúng feature schema/provider/model/locale/SDK/media/feature config và population. Threshold không chọn trên locked holdout. Bundle khóa event đích, bucket, point estimate, **speaker-cluster bootstrap** 95% CI, speaker/session count, slice, dataset hash và approval; per-result dùng cận dưới CI. Bucket thiếu minimum speaker count chỉ chặn nhánh đã hiệu chuẩn/công bố production, không biến mất nhánh AI estimate đã được bật riêng. Giá trị reliability chỉ lưu nội bộ, không thay bằng self-confidence/provider score.

Source of truth đích không cần bảng mới: bundle/manifest bất biến nằm trong build artifact hoặc private object store, có schema, SHA-256 và chữ ký release. Runtime hiện tạo manifest từ cấu hình process rồi pin scoring-config/calibration digest trên job; manual child copy nguyên digest và loader kiểm binding. Registry version-controlled là phương án production tương lai, chưa có artifact registry trong repository. Sau T074, manifest phải pin cả calibrator/mapping thực sự được scorer sử dụng; report truy bundle digest qua job để audit/replay.

**Các phương án đã cân nhắc**:

- Gọi AI estimate có disclaimer là kết quả đã hiệu chuẩn/production-ready: bị loại. AI estimate vẫn được phép cho luyện tập khi evidence đạt.
- Chỉ audit bài empirical reliability thấp: không phát hiện drift ở nhóm cao; cần thêm random audit.

## Quyết định 9: Evidence sufficiency theo từng tiêu chí và transcript-only phải fail closed

**Quyết định**:

- `full_audio` chỉ hợp lệ khi cả ba Part có artifact `complete`, hash khớp, quality đủ, evidence bắt buộc của mọi tiêu chí là `sufficient` và provider/model/config khớp scoring-config digest đã pin trên job. Nhánh đã hiệu chuẩn còn phải khớp calibration bundle digest; nhánh estimate cho phép digest bundle `null`.
- Đủ ba file audio nhưng uncertainty cao, ngoài phân phối hoặc bất đồng evidence vẫn không phải `full_audio`: worker mới retry/failed toàn phiên. `partial_audio` chỉ còn là representation legacy/audit.
- `partial_audio` chỉ là representation legacy/audit khi có audio nhưng thiếu Part/component/evidence hoặc binding bắt buộc của nhánh đã hiệu chuẩn; việc không có calibration bundle tự nó không làm nhánh estimate thành partial. Worker learner mới không persist report này mà fail toàn phiên khi evidence bắt buộc không đủ.
- Với `transcript_only`, cả bốn `criteria.*.band` và `overall_band` đều `null`. Chỉ lưu `text_based_feedback`, không trình bày nó như IELTS criterion score; khi group còn `pending/tutor`, learner không được xem reviewer reference theo IELTS-07.
- Mỗi tiêu chí ghi `evidence_status = sufficient | insufficient | unavailable` và evidence refs; validator từ chối `band != null` khi status khác `sufficient`.
- `is_partial_assessment=true` và `requires_human_review=true` chỉ còn ý nghĩa tương thích legacy/audit, không tự tạo assignment tutor.

**Lý do**: “Có audio” không đồng nghĩa đủ evidence, và “ASR output chưa qua hậu xử lý của ứng dụng” không đồng nghĩa verbatim. Hệ thống production phải từ chối chấm tiêu chí không đủ bằng chứng thay vì làm đầy schema bằng số giả.

**Các phương án đã cân nhắc**:

- Giữ Lexical/Grammar/Pronunciation score từ transcript rồi thêm disclaimer: người dùng/UI vẫn dễ hiểu nhầm và Overall vẫn bị nhiễm.
- Dùng `0` thay `null`: biến “không có dữ liệu” thành “năng lực bằng 0”, bị loại.

## Quyết định 10: Migration production cần version history và lock

**Baseline lịch sử và quyết định**: Trước phần hardening, `backend/scripts/migrate.js` chạy lại toàn bộ SQL, không ghi version/checksum và có thể không báo lỗi process đúng cách, nên không phù hợp production. Runtime repository hiện đã có migration history/checksum, advisory lock, baseline có xác nhận và exit code khác 0; vẫn chỉ được phát hành sau rehearsal trên PostgreSQL disposable/staging và restore test ở T055.

**Lý do**: Schema mới có backfill và unique index; hardening runner xử lý rủi ro kỹ thuật trong code, nhưng không thay thế bằng chứng rehearsal/restore trên môi trường đích.

**Các phương án đã cân nhắc**:

- Chỉ viết mọi migration `IF NOT EXISTS`: không phát hiện file đã bị sửa sau khi áp dụng và không bảo vệ hai deploy đồng thời.
- Tạo thêm bảng feature-specific để tracking: không cần; dùng cơ chế migration dùng chung của nền tảng.

## Quyết định 11: Runtime normalize nguyên từng Part; chunking là mục tiêu có điều kiện

**Quyết định hiện tại**: Worker nhận tối đa 50 MiB và 15 phút cho mỗi Part, dùng `ffprobe`/`ffmpeg` để validate/decode, normalize toàn bộ Part thành WAV PCM16 mono 16 kHz trong workspace tạm rồi dọn dẹp. Ba Part được xử lý tuần tự. Code chưa cắt chunk, ghép/deduplicate transcript hoặc rebase timestamp.

**Mục tiêu tương lai T069**: Chỉ thêm bounded parallelism và chunk tại ranh giới im lặng có overlap khi load test hoặc giới hạn payload provider chứng minh cần. Khi đó fluency/audio-quality phải tính trên timeline toàn Part trước chunk và phải có test deduplicate/rebase; không được mô tả đây là runtime đã có trước khi T069 hoàn tất.

**Lý do**: Đây là đúng hành vi code hiện tại và tránh tuyên bố một cơ chế transport chưa được triển khai. Audio normalization vẫn là ranh giới kiểm codec, duration và chất lượng; nếu provider áp giới hạn thấp hơn policy sản phẩm, hệ thống phải từ chối rõ ràng hoặc hoàn tất T069 trước rollout tương ứng.

**Các phương án đã cân nhắc**:

- Hạ toàn bộ product limit xuống 25 MB: đơn giản nhưng thay constraint sản phẩm và vẫn không giải quyết browser codec.
- Transcode trong browser: tăng CPU/battery, hành vi khác nhau theo thiết bị và khó audit.
- Gửi payload vượt giới hạn đã biết rồi chờ provider lỗi: không production-safe; phải thu hẹp policy hoặc hoàn tất T069 trước khi chấp nhận input đó.

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
