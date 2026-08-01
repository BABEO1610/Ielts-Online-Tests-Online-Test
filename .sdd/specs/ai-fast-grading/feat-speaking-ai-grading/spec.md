# Đặc tả tính năng: Chấm nhanh Speaking bằng AI

**Ngày tạo**: 2026-08-01  
**Trạng thái**: Foundation và automated test chính đã có; production/calibration gates còn mở  
**Phạm vi nguồn**: Tách từ `ai-fast-grading` và đối chiếu với code hiện tại

## Bối cảnh nghiệp vụ

Học viên cần nộp đủ audio Speaking Part 1, Part 2 và Part 3 rồi rời trang trong khi AI xử lý bất đồng bộ. Transcript không đủ để đánh giá Fluency & Coherence hoặc Pronunciation; vì vậy một kết quả thành công phải dựa trên cả ASR transcript và audio evidence, có đủ bốn tiêu chí cùng Overall.

Kết quả hiện hành là `AI Estimated Band` phục vụ luyện tập. Nhánh mô tả là đã hiệu chuẩn hoặc production-ready chỉ được bật khi calibration bundle, gold set và approval đều đạt. Lỗi AI không được tự chuyển bài sang tutor; tutor queue chỉ nhận bài học viên chủ động chọn `grader=tutor`.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Upload riêng tư và nộp đủ ba Part (Ưu tiên: P1)

Là học viên, tôi muốn tải ba audio lên kho riêng tư và nộp một lần để nhận trạng thái chờ ngay, không phải giữ request tới khi AI xong.

**Kiểm thử độc lập**: Dùng object-storage fake, xin ba signed upload, PUT ba object rồi nộp `POST /api/v1/submissions/speaking/full` với cùng `Idempotency-Key`; xác minh HTTP 202, ba submission và một root job.

**Kịch bản chấp nhận**:

1. **Cho trước** ba upload token hợp lệ thuộc cùng học viên và đúng Part 1/2/3, **khi** nộp `grader=ai`, **thì** hệ thống tạo ba submission và một job trong một transaction rồi trả status URL.
2. **Cho trước** Part thiếu/trùng, token hết hạn, owner sai, object thiếu hoặc metadata không khớp, **khi** nộp, **thì** hệ thống từ chối trước enqueue/quota/provider.
3. **Cho trước** cùng khóa và payload được replay đồng thời, **khi** xử lý, **thì** mọi response tham chiếu cùng group/job; cùng khóa khác payload bị từ chối.

---

### Câu chuyện người dùng 2 — Theo dõi job và phục hồi sau refresh (Ưu tiên: P1)

Là học viên, tôi muốn xem `queued`, `running`, `retry_wait`, `completed` hoặc `failed` để biết có thể đóng trang và quay lại sau.

**Kiểm thử độc lập**: Cho worker fake chuyển qua các stage, polling status API tới terminal, refresh trình duyệt giữa chừng và xác minh group ID được khôi phục mà không enqueue lại.

**Kịch bản chấp nhận**:

1. **Cho trước** submission đã commit, **khi** trang polling, **thì** API trả canonical job/status/stage từ database và dừng polling ở terminal.
2. **Cho trước** provider tạm lỗi, **khi** còn attempt budget, **thì** job chuyển `retry_wait` với backoff mà không trừ quota lần nữa.
3. **Cho trước** terminal `failed` và còn manual retry budget, **khi** owner retry với khóa hợp lệ, **thì** hệ thống tạo tối đa một child job canonical.

---

### Câu chuyện người dùng 3 — Nhận đủ bốn band từ audio evidence (Ưu tiên: P1)

Là học viên chọn AI, tôi muốn nhận Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation và Overall dưới nhãn ước tính rõ ràng.

**Kiểm thử độc lập**: Dùng ba audio/evidence fake hoàn chỉnh; worker phải lưu ba artifact, validate bốn band, bỏ Overall của provider, tự tính Overall half-up và hoàn tất group.

**Kịch bản chấp nhận**:

1. **Cho trước** ba Part có evidence hoàn chỉnh và cờ estimate bật, **khi** scorer hoàn tất, **thì** kết quả có đủ bốn criterion band, Overall và version audit dưới nhãn `AI Estimated Band`.
2. **Cho trước** thiếu audio evidence ở bất kỳ Part, **khi** pipeline xử lý, **thì** toàn job retry/failed theo policy, không trả partial band và giữ `grader=ai`.
3. **Cho trước** provider trả Overall hoặc reliability thô, **khi** finalizer lưu, **thì** các giá trị đó bị bỏ; backend chỉ dùng bốn band đã validate để tính Overall.
4. **Cho trước** cờ publish calibrated bật nhưng bundle/binding/approval không hợp lệ, **khi** load gate, **thì** pipeline fail closed và không tự gắn nhãn đã hiệu chuẩn.

---

### Câu chuyện người dùng 4 — Tutor review bài được chủ động gửi (Ưu tiên: P2)

Là tutor, tôi muốn claim nguyên tử một group `grader=tutor`, nghe audio bằng signed URL và tùy chọn lấy AI prelim để hỗ trợ chấm, nhưng quyết định cuối vẫn do tôi lưu.

**Kiểm thử độc lập**: Cho nhiều tutor claim cùng group; chỉ một người thắng cả ba Part. Assigned tutor hoặc admin được đọc detail/audio; tutor khác bị từ chối. AI prelim không thay đổi trạng thái/report.

**Kịch bản chấp nhận**:

1. **Cho trước** group tutor chưa gán, **khi** nhiều tutor claim đồng thời, **thì** chỉ một tutor được gán cho cả ba Part.
2. **Cho trước** tutor không được gán nhưng biết ID, **khi** đọc detail/audio hoặc gọi prelim, **thì** hệ thống từ chối.
3. **Cho trước** assigned tutor gọi AI prelim, **khi** kết quả trả về, **thì** form nhận bản nháp bốn tiêu chí nhưng database chưa tạo báo cáo cuối hoặc đổi status.

### Trường hợp biên

- MIME khai báo đúng nhưng magic bytes/checksum/codec/duration/decode không khớp.
- Worker mất lease sau provider response nhưng trước terminal write.
- Ba Part hoàn chỉnh nhưng một artifact có evidence không đủ.
- Provider trả 429, 5xx, timeout hoặc `Retry-After`.
- Manual retry diễn ra khi request khác cũng retry cùng group.
- Signed URL hết hạn khi tutor đang nghe.
- Dữ liệu legacy chỉ có public URL/transcript và không có verified digest.
- Calibration bundle hợp lệ về chữ ký nhưng sai scoring-config binding.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **SFR-001**: Mọi thao tác upload, submit, status, retry, audio và tutor action PHẢI xác thực và phân quyền từ `req.user`.
- **SFR-002**: Audio mới PHẢI dùng private object storage với signed URL có hạn; không lưu signed URL trong database/log.
- **SFR-003**: Upload token PHẢI ràng buộc version/kid, owner, Part, object key, MIME, size, SHA-256, duration và expiry.
- **SFR-004**: AI submission PHẢI có đúng tập Part `{1,2,3}` và resolve prompt chính thức từ database; không tin owner/object key/prompt text do client tự khai.
- **SFR-005**: Hệ thống PHẢI preflight object ngoài transaction, sau đó atomically tạo ba submission và một root job; request trả HTTP 202 mà không gọi provider.
- **SFR-006**: Idempotency/fingerprint PHẢI xử lý replay trước quota và bảo vệ request tuần tự lẫn đồng thời; mỗi object chỉ gắn một submission.
- **SFR-007**: Original AI group PHẢI dùng quota chung tối đa 10 lượt/người/ngày UTC; automatic/manual retry hợp lệ không tính thêm.
- **SFR-008**: Worker PHẢI claim bằng `SKIP LOCKED`, lease và fencing generation; heartbeat/artifact/report/final write từ generation cũ phải bị từ chối.
- **SFR-009**: Trước provider call, bytes thật PHẢI được kiểm tra checksum, magic bytes, codec, size, duration, decode và speech evidence.
- **SFR-010**: Pipeline PHẢI lưu ASR output riêng với display transcript; không sửa ngữ pháp transcript rồi dùng bản sửa làm evidence.
- **SFR-011**: Fluency & Coherence PHẢI dùng timing/fluency evidence cùng transcript; Pronunciation PHẢI dùng audio evidence; transcript-only không được sinh hai band này.
- **SFR-012**: Learner result thành công PHẢI là `full_audio`, đủ bốn criterion band và Overall; thiếu evidence làm job retry/failed, không công bố partial result.
- **SFR-013**: Overall PHẢI bỏ giá trị provider, lấy trung bình bằng nhau của bốn band hợp lệ và làm tròn half-up ở `.25/.75`.
- **SFR-014**: Job PHẢI có canonical status/stage, automatic retry tối đa theo `max_attempts`, watchdog thu hồi lease và manual child retry idempotent theo limit cấu hình.
- **SFR-015**: Học viên chỉ đọc result khi canonical job `completed`; lỗi AI giữ `grader=ai` và tuyệt đối không tự vào tutor queue.
- **SFR-016**: Estimate chỉ được trả khi `AI_SPEAKING_ESTIMATED_BANDS_ENABLED=true`, có disclaimer/version; nhãn calibrated/production chỉ khi bundle, binding, gold set và approval đều đạt cùng `AI_SPEAKING_PUBLISH_BANDS=true`.
- **SFR-017**: Group tutor PHẢI được claim nguyên tử; detail/audio/prelim/grade chỉ cho assigned tutor hoặc admin có scope.
- **SFR-018**: Tutor AI prelim PHẢI là dữ liệu tạm, không thay đổi assignment, grader, status hoặc report cho tới khi tutor lưu.
- **SFR-019**: API PHẢI dùng envelope `{ success, data, error, meta }`, mã lỗi ổn định và thông báo tiếng Việt; không trả raw AI output, object key, signed URL hết hạn hoặc reliability nội bộ ngoài field cho phép.
- **SFR-020**: Legacy data chỉ được đọc fallback; không tạo synthetic job/artifact và không dùng transcript legacy để sinh band mới.

### Thực thể chính

- **Speaking Group**: Ba `speaking_submissions` Part 1/2/3 dùng chung `speaking_group_id`.
- **AI Grading Job**: Trạng thái mutable, lease, generation, retry chain, config digest và idempotency.
- **Speaking Analysis Artifact**: Evidence bất biến theo Part/job/config, gồm ASR/audio analysis và terminal status.
- **AI Grading Report**: Kết quả public/review đã allowlist cho toàn group.
- **Tutor Feedback Report**: Quyết định chấm cuối của tutor, hỗ trợ soft-delete.

## Tiêu chí thành công *(bắt buộc)*

- **SSC-001**: 20 replay đồng thời cùng khóa/payload chỉ tạo ba submission, một root job và một canonical pipeline.
- **SSC-002**: 100% file sai checksum/magic bytes/codec/decode hoặc thiếu speech evidence bị chặn trước scoring.
- **SSC-003**: 100% learner result thành công có đủ bốn band, Overall half-up đúng và `evidence_mode=full_audio`.
- **SSC-004**: Với ít nhất hai worker, mọi write của lease generation cũ bị từ chối.
- **SSC-005**: 100% AI failure giữ `grader=ai`; 0% tự chuyển tutor.
- **SSC-006**: 20 tutor claim đồng thời chỉ có một assigned tutor trên cả group; mọi IDOR detail/audio/prelim bị từ chối.
- **SSC-007**: Enqueue p95 dưới 500 ms ở 30 request/phút; pipeline mock p95 dưới 5 phút với 10 job đồng thời trên staging.
- **SSC-008**: Business logic mới đạt tối thiểu 80% coverage và mọi endpoint có happy/error path không gọi Internet thật.
- **SSC-009**: Smoke provider thật đủ ba Part hoàn tất `queued → running → completed/full_audio` trước khi bật public estimate ở môi trường mục tiêu.

## Giả định và phụ thuộc

- Private storage, provider/model, retention/KMS và audio format phải được phê duyệt theo môi trường.
- `ffmpeg`/`ffprobe` khả dụng ở worker runtime.
- Estimate luyện tập và calibrated publication là hai cờ độc lập.
- Database đã áp dụng migrations `025`, `026` và `030`.

## Ngoài phạm vi

- Realtime grading khi học viên đang nói.
- Tự huấn luyện ASR hoặc pronunciation model.
- Tuyên bố kết quả là điểm IELTS chính thức.
- Tự động chuyển bài AI lỗi sang tutor.
- Xóa vật lý audio/report hoặc xóa schema legacy trong cùng release.
