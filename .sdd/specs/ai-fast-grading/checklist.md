# Danh sách kiểm tra triển khai: Chấm nhanh Writing và Speaking bằng AI

**Mục đích**: Đối chiếu implementation, kiểm thử và cổng phát hành của AI Fast Grading với `spec.md`, `plan.md` và `tasks.md`; ô chưa đánh dấu là công việc còn mở, không phải bằng chứng đã đạt production.

**Ngày đối chiếu mã nguồn**: 2026-07-22

**Tài liệu nguồn**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Quy ước**: `[x]` là có bằng chứng trong code/test ở repository; `[ ]` là cổng môi trường hoặc phê duyệt chưa có bằng chứng. Không dùng checklist này để tuyên bố đã sẵn sàng bật band Speaking production.

## 1. Xác thực, phân quyền và đầu vào

- [x] CHK001 Các endpoint upload, nộp Speaking AI, retry và Writing AI đều đi qua `authenticate` và role guard `student`; status/audio cho phép đúng tập role đã ghi trong OpenAPI.
- [ ] CHK002 Status, signed audio và grade có kiểm quyền owner/`assigned_tutor_id`, nhưng controller detail chưa truyền requester vào service nên assigned tutor/admin có thể bị 403 sai; một số response tutor còn `meta:null`. Cần T073 cùng HTTP/envelope test trước khi coi toàn bộ scope đạt.
- [x] CHK003 Full Speaking yêu cầu đúng ba Part với tập `{1,2,3}`, `prompt_id` UUID và prompt thuộc đúng test Speaking đang được phép dùng.
- [x] CHK004 Upload token được mã hóa AEAD, có version/`kid`, expiry, owner, object key, MIME, kích thước, thời lượng và SHA-256 được bind vào token.
- [x] CHK005 Backend kiểm MIME được phép, magic byte, giới hạn 50 MiB, duration, checksum, prefix object theo user và từ chối path traversal hoặc tái sử dụng một object cho nhiều Part.
- [x] CHK006 Writing dùng chung validator 50/100 từ, làm sạch ký tự điều khiển nhưng không sửa ngữ pháp/nội dung bài của học viên.

## 2. Database, migration và tính toàn vẹn

- [x] CHK007 Feature chỉ thêm hai bảng nghiệp vụ: `ai_grading_jobs` và `speaking_analysis_artifacts`; các bảng submission/report/usage/tutor hiện có được tái sử dụng.
- [x] CHK008 `schema_migrations`, nếu chưa tồn tại, là bảng metadata dùng chung của migration runner, không phải bảng feature AI và không được nhân bản dưới namespace riêng.
- [x] CHK009 Runner có history, checksum, advisory lock, transaction, non-zero exit và baseline không ghi đè checksum đã tồn tại.
- [x] CHK010 Migration `008a`, `025`, `026` có static schema/SQL contract test; `008a` chỉ bootstrap đúng schema `library_resources` legacy của migration `012` do `011` tham chiếu sai thứ tự, còn test phá dữ liệu bị chặn nếu không xác nhận PostgreSQL disposable.
- [ ] CHK011 Ghi chú vận hành trước đây cho biết đã baseline/apply `025`–`026` sau backup, nhưng feature chưa kèm artifact log/checksum/row-count đã làm sạch để hội đồng tái lập. T055 vẫn phải tạo bằng chứng fresh/legacy migration, concurrency và restore rehearsal trên disposable/staging trước khi đóng cổng production.
- [x] CHK012 Ba Speaking submission và root job được ghi trong cùng transaction; storage `stat` chạy trước transaction và object key được advisory-lock trước insert.
- [x] CHK013 Unique constraint/fingerprint/idempotency ngăn double-submit; replay trả canonical IDs và không gọi provider hoặc trừ quota lần nữa.
- [x] CHK014 `lease_generation` là fencing token độc lập với `attempt_count`; heartbeat, artifact và final write dùng CAS theo job/owner/generation.
- [x] CHK015 Job gốc tối đa hai attempt tự động, manual child tối đa một attempt; lỗi learner giữ `grader=ai` và không tự handoff tutor. Việc bảo toàn phân loại lỗi 5xx để sử dụng đủ automatic budget được đánh giá riêng tại CHK033/T077.
- [x] CHK016 Quarantine cleanup chỉ xóa object đúng prefix/pattern, quá tuổi tối thiểu, sau hai lần đối chiếu DB; log chỉ chứa hash của object key.

## 3. Writing regression và quota dùng chung

- [x] CHK017 Cả full Writing và từng task AI dùng cùng ngưỡng từ, sanitizer và idempotency key.
- [x] CHK018 Writing và Speaking dùng cùng advisory-lock quota 10 original submissions/user/ngày UTC; retry/replay không tính thêm.
- [x] CHK019 Replay Writing đọc report đã lưu và không gọi provider; trạng thái reservation job được finalize khi đủ kết quả.
- [ ] CHK020 Utility tổng hợp Writing vẫn dùng trọng số Task 1/Task 2 là 33%/67%, nhưng màn hình Writing Detail hiện chưa render `Overall Writing Band`; frontend regression còn 1 fail và được theo dõi tại T071.
- [ ] CHK021 Error Writing ngắn hiện chưa khớp hoàn toàn envelope `{ success, data, error, meta }`: `word_count`/`required_words` và `request_id` còn sai vị trí; backend regression còn 1 fail và được theo dõi tại T070.

## 4. Evidence và chấm Speaking fail-closed

- [x] CHK022 Audio normalizer dùng `spawn` với mảng tham số, timeout, giới hạn tài nguyên, workspace tạm và cleanup; không ghép shell command từ input.
- [x] CHK023 Kiểm tra WAV PCM có RMS, clipping, silence ratio; silent/corrupt/duration mismatch là lỗi dữ liệu không retry.
- [x] CHK024 `asr_transcript` và `display_transcript` được tách; grader không dùng bản hiển thị đã thêm dấu câu để thay bằng chứng gốc.
- [x] CHK025 Adapter speech evidence và manifest model/provider được ghi nhận theo scoring config. Grading model bị chặn alias `latest` ở production; transcription model hiện chưa có validation tương đương và được theo dõi ở T068.
- [x] CHK026 Calibration loader kiểm schema, digest, chữ ký và exact binding cho nhánh đã hiệu chuẩn. Nhánh estimate dùng cờ riêng, cho phép bundle `NULL`, bắt buộc version scorer + disclaimer và không được gọi là kết quả đã hiệu chuẩn.
- [x] CHK027 `transcript_only` không sinh Pronunciation/Overall; learner mới thiếu bất kỳ evidence bắt buộc nào đi theo retry/failed và không chuyển tutor.
- [x] CHK028 Chỉ `completed + full_audio` đủ bốn criterion và có version scorer/hiệu chuẩn mới được learner projection công bố; frontend không đổi `null` thành `0`.
- [x] CHK029 Backend tự tính Overall từ criterion đã validate, bỏ Overall/raw reliability do provider tự khai và chỉ lưu projection allowlist.
- [x] CHK030 Lỗi terminal không tạo failed report giả; submission sang `grading_failed`, giữ `grader=ai`; `needs_review` chỉ còn để đọc dữ liệu lịch sử.

## 5. Async worker, retry và trải nghiệm người dùng

- [x] CHK031 Submit AI trả `202`, `Location`, `Retry-After` và `Cache-Control: private, no-store`; request không chờ provider.
- [x] CHK032 Worker chạy bằng entrypoint/process riêng, claim bằng `FOR UPDATE SKIP LOCKED`, heartbeat trong provider call dài và bỏ output của stale worker.
- [ ] CHK033 Watchdog thu hồi lease hết hạn bằng lock/CAS và có exponential backoff + jitter nội bộ; tuy nhiên lỗi provider 5xx có thể bị gateway đổi thành `INTERNAL_ERROR/AIGRADE_003` trước khi tới worker nên chưa chắc vào `retry_wait`. T077 phải khóa lại phân loại end-to-end.
- [x] CHK034 Manual retry yêu cầu idempotency key, chỉ owner được gọi và chỉ tạo tối đa một child canonical.
- [x] CHK035 Frontend upload trực tiếp không gửi cookie/API credential cho storage host; idempotency key và pending group được giữ qua refresh rồi xóa ở terminal state.
- [x] CHK036 Polling có backoff, abort khi unmount và dừng ở `completed|needs_review|failed`; UI hiển thị đủ `queued|running|retry_wait|needs_review|failed`.

## 6. Tutor, audio riêng tư và soft-delete

- [x] CHK037 Tutor claim khóa nguyên tử cả group ba Part; một tutor thắng, các Part có cùng `assigned_tutor_id`/`assigned_tutor_at`.
- [ ] CHK038 Claim, AI reference, signed audio và grade có scope assignment; riêng detail Speaking đang thiếu requester context ở controller và phải được khép bằng T073.
- [x] CHK039 Audio endpoint chỉ trả `{url, expires_at}`, có `private, no-store`, không trả object key và không lưu signed URL vào state lâu dài.
- [x] CHK040 Revoke tutor report là soft-delete; history/detail/export/stats/admin reader liên quan bỏ qua report hoặc Speaking submission đã xóa.
- [x] CHK041 Chỉ bài chọn `grader=tutor` dùng tutor queue/report/assignment hiện có; AI prelim là response tạm thời và không tạo bảng/report thừa.

## 7. Hợp đồng, quan sát và bằng chứng kiểm thử

- [x] CHK042 Usage metric chỉ ghi allowlist job/stage/provider/model/outcome/latency; sanitizer loại transcript, prompt, token, signed URL, object key và raw response.
- [x] CHK043 OpenAPI 3.1 có đủ bảy path gồm tutor AI prelim, mọi local `$ref` resolve, mô tả hai nhánh `grader=ai|tutor`, nullable result và header chống cache.
- [ ] CHK044 Lần đối chiếu ngày 2026-07-22 bằng các lệnh tái lập trong `quickstart.md`: backend AI Speaking/OpenAPI đạt 6 suite/23 test và frontend Speaking grading đạt 2 file/6 test; tuy nhiên Writing chưa xanh do đúng 1 backend fail ở envelope (T070) và 1 frontend fail ở Overall Writing (T071). Các số liệu full-suite cũ chỉ là lịch sử và không thay thế coverage gate.
- [ ] CHK045 Chạy smoke test provider thật trên ba audio private và nhận `completed/full_audio` đủ bốn tiêu chí; các lần demo dừng ở quota/`failed` không phải bằng chứng đạt. Load/chaos, coverage gate toàn feature và restore rehearsal staging vẫn còn mở.
- [ ] CHK046 Chưa có RFC/approval cuối cho provider-storage-audio format, retention, forecast/cost và calibration/fairness bundle; public Speaking band phải giữ tắt.
- [x] CHK047 Backend feature mới cùng hook polling/summary mới đạt giới hạn 300 dòng/file và 40 dòng/hàm; kiểm tra này có lệnh lint riêng.
- [ ] CHK048 Các màn hình frontend kế thừa đã phải tích hợp feature vẫn còn file/hàm vượt giới hạn Constitution và bundle 2.883,70 kB (gzip 813,64 kB); T059 phải refactor/code-split trước production.
- [ ] CHK049 Adapter Gemini transcription hiện trả plain transcript (`words/segments/uncertainty=null`), worker xử lý ba Part tuần tự và normalizer chưa chunk/deduplicate; T068–T069 theo dõi các nâng cấp này nếu release gate yêu cầu.
- [x] CHK050 `.env.example` ở root bao phủ biến chatbot, Writing/Speaking grading, worker và private storage bằng giá trị mẫu fail-closed; kiểm tra không phát hiện key trùng, trailing whitespace hoặc credential thật (T072).
- [ ] CHK051 Nhánh publish/đã hiệu chuẩn chưa chạy end-to-end: worker có thể không khởi tạo scorer khi chỉ bật publish, scorer chưa tiêu thụ mapping/threshold/reliability từ bundle và hiện vẫn phát `assessment_type=estimated`; T074 phải chứng minh calibration thực, không chỉ đổi version/nhãn.
- [ ] CHK052 Nội dung `SpeakingSummaryScreen.jsx` còn nói thiếu evidence sẽ “chuyển giáo viên”, trái policy retry/failed và không auto-handoff; cần T075 cùng regression test.
- [ ] CHK053 Runtime estimate giữ plain ASR trước hậu xử lý ứng dụng nhưng chưa có gold-set/verbatim-fidelity threshold để quyết định abstain cho Lexical/Grammar/Coherence; cần T076 trước nhánh calibrated/production.
- [ ] CHK054 Policy retry provider 5xx chưa được bảo toàn xuyên gateway/service/worker và runtime chưa đọc `Retry-After` của provider; cần T077, không dùng backoff nội bộ làm bằng chứng cho hai hành vi này.

## Kết luận

Foundation, private upload, queue, worker, chấm ước lượng đủ bốn tiêu chí và tutor AI prelim đã có bằng chứng code/test mô phỏng; cấu hình mẫu an toàn cũng đã được khép tại CHK050. `AI Estimated Band` dùng cho luyện tập khi đủ evidence và không tự handoff tutor. Toàn feature chưa đạt regression/release gate cho tới khi CHK002, CHK011, CHK020, CHK021, CHK033, CHK038, CHK044–CHK046 và CHK048–CHK054 được đóng; đặc biệt không được gọi nhánh hiện tại là đã hiệu chuẩn/production-ready.
