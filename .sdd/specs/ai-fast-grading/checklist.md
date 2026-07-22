# Danh sách kiểm tra triển khai: Chấm nhanh Writing và Speaking bằng AI

**Ngày đối chiếu mã nguồn**: 2026-07-22

**Tài liệu nguồn**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Quy ước**: `[x]` là có bằng chứng trong code/test ở repository; `[ ]` là cổng môi trường hoặc phê duyệt chưa có bằng chứng. Không dùng checklist này để tuyên bố đã sẵn sàng bật band Speaking production.

## 1. Xác thực, phân quyền và đầu vào

- [x] CHK001 Các endpoint upload, nộp Speaking AI, retry và Writing AI đều đi qua `authenticate` và role guard `student`; status/audio cho phép đúng tập role đã ghi trong OpenAPI.
- [x] CHK002 Status, audio, detail và grade kiểm quyền owner hoặc `assigned_tutor_id`; test IDOR xác nhận tutor khác bị từ chối, admin có scope riêng.
- [x] CHK003 Full Speaking yêu cầu đúng ba Part với tập `{1,2,3}`, `prompt_id` UUID và prompt thuộc đúng test Speaking đang được phép dùng.
- [x] CHK004 Upload token được mã hóa AEAD, có version/`kid`, expiry, owner, object key, MIME, kích thước, thời lượng và SHA-256 được bind vào token.
- [x] CHK005 Backend kiểm MIME được phép, magic byte, giới hạn 50 MiB, duration, checksum, prefix object theo user và từ chối path traversal hoặc tái sử dụng một object cho nhiều Part.
- [x] CHK006 Writing dùng chung validator 50/100 từ, làm sạch ký tự điều khiển nhưng không sửa ngữ pháp/nội dung bài của học viên.

## 2. Database, migration và tính toàn vẹn

- [x] CHK007 Feature chỉ thêm hai bảng nghiệp vụ: `ai_grading_jobs` và `speaking_analysis_artifacts`; các bảng submission/report/usage/tutor hiện có được tái sử dụng.
- [x] CHK008 `schema_migrations`, nếu chưa tồn tại, là bảng metadata dùng chung của migration runner, không phải bảng feature AI và không được nhân bản dưới namespace riêng.
- [x] CHK009 Runner có history, checksum, advisory lock, transaction, non-zero exit và baseline không ghi đè checksum đã tồn tại.
- [x] CHK010 Migration `008a`, `025`, `026` có static schema/SQL contract test; `008a` chỉ bootstrap đúng schema `library_resources` legacy của migration `012` do `011` tham chiếu sai thứ tự, còn test phá dữ liệu bị chặn nếu không xác nhận PostgreSQL disposable.
- [ ] CHK011 Đã baseline và apply `025`–`026` thành công trên database hiện tại sau khi tạo/verify backup `public`; lịch sử có 36 checksum và số dòng nghiệp vụ không đổi. Vẫn cần fresh migration, concurrency và restore rehearsal trên disposable/staging để đóng cổng production.
- [x] CHK012 Ba Speaking submission và root job được ghi trong cùng transaction; storage `stat` chạy trước transaction và object key được advisory-lock trước insert.
- [x] CHK013 Unique constraint/fingerprint/idempotency ngăn double-submit; replay trả canonical IDs và không gọi provider hoặc trừ quota lần nữa.
- [x] CHK014 `lease_generation` là fencing token độc lập với `attempt_count`; heartbeat, artifact và final write dùng CAS theo job/owner/generation.
- [x] CHK015 Job gốc tối đa hai attempt tự động, manual child tối đa một attempt; lỗi learner giữ `grader=ai`, chỉ retry đúng policy và không tự handoff tutor.
- [x] CHK016 Quarantine cleanup chỉ xóa object đúng prefix/pattern, quá tuổi tối thiểu, sau hai lần đối chiếu DB; log chỉ chứa hash của object key.

## 3. Writing regression và quota dùng chung

- [x] CHK017 Cả full Writing và từng task AI dùng cùng ngưỡng từ, sanitizer và idempotency key.
- [x] CHK018 Writing và Speaking dùng cùng advisory-lock quota 10 original submissions/user/ngày UTC; retry/replay không tính thêm.
- [x] CHK019 Replay Writing đọc report đã lưu và không gọi provider; trạng thái reservation job được finalize khi đủ kết quả.
- [x] CHK020 Overall Writing giữ trọng số Task 1/Task 2 là 33%/67% và làm tròn nửa band theo utility hiện có.
- [x] CHK021 Response và error Writing được chuẩn hóa về `{ success, data, error, meta }`; lỗi 500 không làm lộ thông tin nội bộ.

## 4. Evidence và chấm Speaking fail-closed

- [x] CHK022 Audio normalizer dùng `spawn` với mảng tham số, timeout, giới hạn tài nguyên, workspace tạm và cleanup; không ghép shell command từ input.
- [x] CHK023 Kiểm tra WAV PCM có RMS, clipping, silence ratio; silent/corrupt/duration mismatch là lỗi dữ liệu không retry.
- [x] CHK024 `asr_transcript` và `display_transcript` được tách; grader không dùng bản hiển thị đã thêm dấu câu để thay bằng chứng gốc.
- [x] CHK025 Adapter speech evidence và manifest model/provider được pin; alias model `latest` không còn được hard-code trong đường transcribe.
- [x] CHK026 Calibration loader vẫn kiểm schema, digest, chữ ký và exact binding cho nhánh đã hiệu chuẩn; cờ AI estimate là cấu hình riêng và luôn kèm disclaimer.
- [x] CHK027 `transcript_only` không sinh Pronunciation/Overall; learner mới thiếu bất kỳ evidence bắt buộc nào đi theo retry/failed và không chuyển tutor.
- [x] CHK028 Chỉ `completed + full_audio` đủ bốn criterion và có version scorer/hiệu chuẩn mới được learner projection công bố; frontend không đổi `null` thành `0`.
- [x] CHK029 Backend tự tính Overall từ criterion đã validate, bỏ Overall/raw reliability do provider tự khai và chỉ lưu projection allowlist.
- [x] CHK030 Lỗi terminal không tạo failed report giả; submission sang `grading_failed`, giữ `grader=ai`; `needs_review` chỉ còn để đọc dữ liệu lịch sử.

## 5. Async worker, retry và trải nghiệm người dùng

- [x] CHK031 Submit AI trả `202`, `Location`, `Retry-After` và `Cache-Control: private, no-store`; request không chờ provider.
- [x] CHK032 Worker chạy bằng entrypoint/process riêng, claim bằng `FOR UPDATE SKIP LOCKED`, heartbeat trong provider call dài và bỏ output của stale worker.
- [x] CHK033 Watchdog thu hồi lease hết hạn bằng lock/CAS, dùng exponential backoff có jitter, đưa về queue hoặc terminal theo attempt budget và không để bài kẹt `pending` vô hạn.
- [x] CHK034 Manual retry yêu cầu idempotency key, chỉ owner được gọi và chỉ tạo tối đa một child canonical.
- [x] CHK035 Frontend upload trực tiếp không gửi cookie/API credential cho storage host; idempotency key và pending group được giữ qua refresh rồi xóa ở terminal state.
- [x] CHK036 Polling có backoff, abort khi unmount và dừng ở `completed|needs_review|failed`; UI hiển thị đủ `queued|running|retry_wait|needs_review|failed`.

## 6. Tutor, audio riêng tư và soft-delete

- [x] CHK037 Tutor claim khóa nguyên tử cả group ba Part; một tutor thắng, các Part có cùng `assigned_tutor_id`/`assigned_tutor_at`.
- [x] CHK038 Tutor phải claim trước khi mở detail, AI reference, signed audio hoặc ghi điểm; grade kiểm lại assignment trong transaction.
- [x] CHK039 Audio endpoint chỉ trả `{url, expires_at}`, có `private, no-store`, không trả object key và không lưu signed URL vào state lâu dài.
- [x] CHK040 Revoke tutor report là soft-delete; history/detail/export/stats/admin reader liên quan bỏ qua report hoặc Speaking submission đã xóa.
- [x] CHK041 Chỉ bài chọn `grader=tutor` dùng tutor queue/report/assignment hiện có; AI prelim là response tạm thời và không tạo bảng/report thừa.

## 7. Hợp đồng, quan sát và bằng chứng kiểm thử

- [x] CHK042 Usage metric chỉ ghi allowlist job/stage/provider/model/outcome/latency; sanitizer loại transcript, prompt, token, signed URL, object key và raw response.
- [x] CHK043 OpenAPI 3.1 có đủ bảy path gồm tutor AI prelim, mọi local `$ref` resolve, mô tả hai nhánh `grader=ai|tutor`, nullable result và header chống cache.
- [x] CHK044 Feature-targeted verification đạt: backend 29 suite/130 test, frontend 6 file/32 test, ESLint mục tiêu sạch, JavaScript mục tiêu qua `node --check`, frontend production build thành công.
- [ ] CHK045 Smoke test provider thật trên ba audio private đã trả `completed/full_audio` đủ bốn tiêu chí; vẫn chưa chạy load/chaos, coverage gate toàn feature và restore rehearsal staging nên cổng production còn mở.
- [ ] CHK046 Chưa có RFC/approval cuối cho provider-storage-audio format, retention, forecast/cost và calibration/fairness bundle; public Speaking band phải giữ tắt.
- [x] CHK047 Backend feature mới cùng hook polling/summary mới đạt giới hạn 300 dòng/file và 40 dòng/hàm; kiểm tra này có lệnh lint riêng.
- [ ] CHK048 Các màn hình frontend kế thừa đã phải tích hợp feature vẫn còn file/hàm vượt giới hạn Constitution và bundle 2.883,70 kB (gzip 813,64 kB); T059 phải refactor/code-split trước production.

## Kết luận

Foundation, private upload, queue, worker, chấm đủ bốn tiêu chí, retry chỉ sau lỗi và tutor AI prelim đã có bằng chứng code/test. `AI Estimated Band` dùng cho luyện tập và không tự handoff tutor; chưa đủ căn cứ để gọi kết quả là đã hiệu chuẩn/production-ready cho đến khi CHK011, CHK045, CHK046 và CHK048 được đóng bằng bằng chứng thật.
