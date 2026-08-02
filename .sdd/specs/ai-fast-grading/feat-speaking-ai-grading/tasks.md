---
description: "Công việc theo thứ tự phụ thuộc cho Chấm điểm Speaking bằng AI"
---

# Công việc: Chấm điểm Speaking bằng AI

`[x]` nghĩa là chuỗi route/controller/service/truy-vấn-hoặc-migration/frontend/kiểm-thử đã kiểm toán hỗ trợ hành vi nêu ra. `[ ]` là công việc MỤC TIÊU hoặc chưa giải quyết. Mỗi tác vụ tuân theo `- [ ] Txxx [P?] [USx?] Mô tả với đường dẫn`.

## Giai đoạn 1: Lưu trữ riêng tư nền tảng, schema, và hàng đợi

- [x] T001 Xác thực và gắn tải lên riêng tư có chữ ký với chủ sở hữu/Part/MIME/kích thước/checksum/thời lượng trong `backend/src/security/audioUploadToken.js`, `backend/src/storage/objectStorage.adapter.js`, và `backend/tests/unit/storage/objectStorage.adapter.test.js`.
- [x] T002 [P] Tạo hàng đợi gốc/con, idempotency/dấu vân tay, lần thử, lease, và bất biến báo cáo trong `backend/src/db/migrations/025_harden_ai_grading_schema.sql` và bao phủ trong `backend/tests/unit/db/aiGradingMigrations.test.js`.
- [x] T003 [P] Tạo tạo vật phân tích Speaking trong `backend/src/db/migrations/026_create_speaking_analysis_artifacts.sql`, sau đó phạm vi tạo vật thử lại theo công việc nguồn trong `backend/src/db/migrations/030_retry_speaking_artifacts_by_job.sql` và bao phủ quy tắc duy nhất cuối cùng trong `backend/tests/unit/db/aiGradingMigrations.test.js`.
- [x] T004 [P] Triển khai truy vấn claim/heartbeat/hoàn tất/thử lại/chuẩn công việc trong `backend/src/db/queries/aiGradingJobs.queries.js` với `backend/tests/unit/db/aiGradingJobs.queries.test.js`.
- [x] T005 [P] Triển khai truy vấn tạo vật bất biến theo phạm vi công việc và báo cáo trong danh sách cho phép trong `backend/src/db/queries/speakingAnalysis.queries.js` với `backend/tests/unit/db/speakingAnalysis.queries.test.js`.

## Giai đoạn 2: Câu chuyện 1 — Nộp ba Part riêng tư (Ưu tiên: P1) MVP

**Kiểm thử độc lập**: Nộp với lưu trữ giả chấp nhận đúng ba Part hợp lệ, trả một gốc bất đồng bộ, phát lại giống hệt, và từ chối metadata/quyền sở hữu không hợp lệ mà không tốn hạn mức trùng.

- [x] T006 [US1] Xác thực đúng Part, đề bài đã công bố, quyền sở hữu tải lên/metadata đối tượng, idempotency, dấu vân tay, và thứ tự hạn mức gốc trong `backend/src/services/speakingSubmission.helpers.js`, `backend/src/services/speakingSubmission.persistence.js`, và `backend/src/services/speakingSubmission.service.js`.
- [x] T007 [US1] Mở luồng HTTP tải lên/nộp đầy đủ có xác thực và phản hồi riêng tư no-store trong `backend/src/controllers/speakingGrading.controller.js`, `backend/src/routes/api/v1/submissions.routes.js`, và `backend/tests/contract/speakingGrading.contract.test.js`.
- [x] T008 [P] [US1] Triển khai SHA-256 phía client, PUT có chữ ký trực tiếp, khóa idempotency ổn định, và nộp đúng ba Part trong `frontend/src/services/grading.service.js`, `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`, và `frontend/tests/services/grading.service.test.js`.
- [x] T009 [P] [US1] Bao phủ tập Part không hợp lệ, metadata không khớp, công bố đề bài, phát lại, và đặt trước hạn mức an toàn trong `backend/tests/unit/services/speakingSubmission.service.test.js`.

## Giai đoạn 3: Câu chuyện 2 — Trạng thái chuẩn và thử lại (Ưu tiên: P1)

**Kiểm thử độc lập**: Lỗi giả dẫn qua thử lại tự động và hai con thủ công một-lần-thử; trạng thái luôn trả công việc chuẩn mới nhất và không tạo phân công giảng viên.

- [x] T010 [US2] Triển khai trạng thái chuẩn theo phạm vi chủ sở hữu và khả dụng thử lại trong `backend/src/services/speakingSubmission.service.js` và `backend/src/db/queries/aiGradingJobs.queries.js`.
- [x] T011 [US2] Triển khai thử lại con thủ công tuần tự, idempotent không tốn thêm hạn mức trong `backend/src/services/speakingGradingRetry.service.js` và `backend/tests/integration/submissions/speakingGradingRetry.test.js`.
- [x] T012 [US2] Triển khai claim worker, heartbeat lease, hàng rào generation, thử lại tự động có giới hạn, và phân loại thử lại trong `backend/src/jobs/aiGrading.worker.js` và `backend/tests/unit/jobs/aiGrading.worker.test.js`.
- [x] T013 [P] [US2] Phục hồi lease worker hết hạn không hoàn tất cũ trong `backend/src/jobs/aiGrading.watchdog.js` và `backend/tests/unit/jobs/aiGrading.watchdog.test.js`.
- [x] T014 [P] [US2] Truy vấn với backoff, dừng ở trạng thái kết thúc, khôi phục nhóm đang chờ, và gửi thử lại thủ công idempotent trong `frontend/src/hooks/useSpeakingGrading.js`, `frontend/src/services/grading.service.js`, và kiểm thử frontend tập trung.
- [ ] T015 [US2] Xóa/bảo vệ dự phòng mập mờ "đã chuyển cho giảng viên" khi phản hồi AI thiếu `job_id`, và bổ sung kiểm thử hồi quy phản hồi AI lỗi trong `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx` và `frontend/tests/pages/subjective-testing/SpeakingTestPage.test.jsx`.

## Giai đoạn 4: Câu chuyện 3 — Kết quả học viên có bằng chứng (Ưu tiên: P1)

**Kiểm thử độc lập**: Ba tạo vật giả hoàn chỉnh cho bốn band và điểm Tổng do backend tính; fixture không hợp lệ/im lặng/không đủ bằng chứng không cho band công khai, trạng thái retry/failed, và không chuyển giao giảng viên.

- [x] T016 [P] [US3] Xác minh byte/checksum/thời lượng và chuẩn hóa âm thanh trước ASR trong `backend/src/services/speakingEvidence.service.js`, `backend/src/media/audioNormalizer.service.js`, và kiểm thử unit tập trung.
- [x] T017 [P] [US3] Tạo bản ghi ASR/hiển thị và bằng chứng giọng nói qua bộ chuyển đổi trong `backend/src/ai/transcriber.adapter.js`, `backend/src/ai/speechEvidence.adapter.js`, và `backend/src/services/speakingEvidence.service.js`.
- [x] T018 [US3] Chấm bốn tiêu chí Speaking từ bằng chứng hoàn chỉnh trong `backend/src/ai/speakingRubricScorer.adapter.js` và `backend/tests/unit/ai/speakingRubricScorer.adapter.test.js`.
- [x] T019 [US3] Từ chối hình dạng kết quả không đầy đủ, yêu cầu `full_audio`, làm sạch đầu ra, và tính lại điểm Tổng từ bốn tiêu chí nửa-band trong `backend/src/ai/speakingResult.validator.js` và `backend/tests/unit/ai/speakingResult.validator.test.js`.
- [x] T020 [US3] Lưu chỉ tạo vật theo phạm vi công việc và báo cáo kết thúc trong danh sách cho phép, không chuyển giao giảng viên, trong `backend/src/services/speakingGrading.service.js`, `backend/src/jobs/aiGrading.worker.js`, và kiểm thử unit tập trung.
- [x] T021 [P] [US3] Hiển thị bản ghi/âm thanh và công bố band chỉ cho bằng chứng chuẩn `completed/full_audio` trong `frontend/src/components/grading/FeedbackReport.jsx` và `frontend/tests/components/grading/FeedbackReport.speakingAsync.test.jsx`.
- [ ] T022 [US3] Triển khai và xác thực ánh xạ/ràng buộc/độ tin cậy hiệu chuẩn dựa trên bộ vàng đã phê duyệt trong `backend/src/ai/calibration/calibration.loader.js`, `backend/src/ai/speakingRubricScorer.adapter.js`, và kiểm thử hợp đồng hiệu chuẩn mới; giữ công bố đã hiệu chuẩn vô hiệu hóa cho đến khi phê duyệt.

## Giai đoạn 5: Công việc MỤC TIÊU chính sách và vòng đời

- [ ] T023 Giải quyết quyết toán hạn mức sau thất bại kết thúc nhà cung cấp/hạ tầng và mã hóa quyết định trong `backend/src/services/aiQuota.service.js`, `backend/src/services/speakingGrading.service.js`, và kiểm thử quyết toán hạn mức mới.
- [ ] T024 [P] Phê duyệt quy tắc lưu giữ/xóa/KMS và triển khai xử lý vòng đời có đối chiếu trong `backend/src/jobs/audioUploadCleanup.job.js`, migration CSDL liên quan, và kiểm thử vòng đời mà không thực thi phá hủy trên production.
- [ ] T025 [P] Quyết định hủy công việc có được hỗ trợ không; nếu được phê duyệt, định nghĩa phân quyền/trạng thái/dọn dẹp hạn mức trong `.sdd/specs/ai-fast-grading/feat-speaking-ai-grading/spec.md` trước khi bổ sung tác vụ triển khai backend/frontend.

## Giai đoạn 6: Xác minh và cổng phát hành

- [x] T026 [P] Giữ và xác thực hợp đồng Speaking máy đọc được qua `backend/tests/contract/speakingGradingOpenApi.test.js` và `.sdd/specs/ai-fast-grading/feat-speaking-ai-grading/contracts/speaking-grading.openapi.yaml`.
- [ ] T027 Thiết lập một vị trí OpenAPI chuẩn xuyên suốt kiểm thử repository và quy trình ngoài; kiểm thử repository hiện đã dùng đường dẫn cục bộ trong tính năng, nên kiểm toán tham chiếu ngoài trước khi thay đổi `backend/tests/contract/speakingGradingOpenApi.test.js` hoặc `.sdd/specs/ai-fast-grading/feat-speaking-ai-grading/contracts/speaking-grading.openapi.yaml`.
- [ ] T028 Diễn tập migration 025/026/030 trên CSDL PostgreSQL dùng một lần mới và cũ và ghi bằng chứng checksum/rollback không bí mật trong `backend/tests/integration/db/aiGrading.schema.test.js` và hồ sơ phát hành.
- [ ] T029 [P] Đo và kiểm soát ít nhất 80% coverage Speaking service/nghiệp vụ dùng `backend/package.json`, `frontend/package.json`, và cấu hình coverage tập trung.
- [ ] T030 Chạy kiểm tra tải/chaos staging đã phê duyệt cho p95 xếp hàng, độ trễ pipeline, claim/thử lại đồng thời, phục hồi watchdog, và từ chối ghi cũ; giữ bằng chứng ngoài bí mật mã nguồn và liên kết từ `.sdd/specs/ai-fast-grading/feat-speaking-ai-grading/plan.md`.
- [ ] T031 Chạy smoke nhà cung cấp ba-âm-thanh được ủy quyền rõ ràng mà không ghi âm thanh/bản ghi/thông tin xác thực, sau đó cập nhật bằng chứng phát hành trong `.sdd/specs/ai-fast-grading/feat-speaking-ai-grading/plan.md`; không chạy trong kiểm thử tự động thông thường.

## Phụ thuộc và thứ tự

1. T001–T005 là nền tảng và đã có bằng chứng.
2. US1 (T006–T009) cho phép US2 và US3; US2/US3 có thể kiểm thử độc lập sau khi nộp đã tồn tại.
3. T015 là sửa nhất quán UI học viên, độc lập với hiệu chuẩn.
4. T022 phụ thuộc vào quyết định hiệu chuẩn/bộ vàng đã phê duyệt. T023–T025 phụ thuộc vào câu trả lời sản phẩm.
5. T028–T031 là cổng phát hành và không hoàn thành từ kiểm thử unit mock.

## Ma trận truy vết

| Yêu cầu | Tác vụ | Kiểm thử/bằng chứng |
|---|---|---|
| BR-SPK-001–004; FR-SPK-001–007 | T001, T006–T009 | Kiểm thử hợp đồng HTTP Speaking và dịch vụ nộp |
| BR-SPK-005–006; FR-SPK-008–009 | T004, T010–T014 | Kiểm thử tích hợp thử lại, worker, watchdog, truy vấn |
| BR-SPK-007–014; FR-SPK-010–014 | T003, T005, T016–T021 | Kiểm thử bằng chứng, chấm điểm, xác thực, worker, truy vấn, migration, frontend |
| BR-SPK-015, BR-SPK-017; FR-SPK-017 | T023 | Cần kiểm thử quyết toán hạn mức mới |
| BR-SPK-016; FR-SPK-017; NFR-SPK-002, NFR-SPK-010 | T024 | Cần kiểm thử lưu giữ/KMS/vòng đời mới |
| BR-SPK-018 | T025 | Quyết định sản phẩm, sau đó kiểm thử trạng thái/phân quyền |
| FR-SPK-015 | T015 | Kiểm thử hồi quy phản hồi lỗi trang Speaking |
| FR-SPK-016 | T022 | Kiểm thử ràng buộc/đầu ra/bộ vàng hiệu chuẩn |
| NFR-SPK-001, NFR-SPK-003 | T001, T007, T010, T020–T021 | Kiểm thử hợp đồng xác thực, làm sạch, biên tập học viên |
| NFR-SPK-004–005; SC-SPK-007 | T030–T031 | Chỉ số tải staging và bằng chứng smoke được ủy quyền |
| NFR-SPK-006–008; SC-SPK-001–006 | T002–T005, T009–T020, T028 | Kiểm thử đồng thời/thử lại/hàng rào/schema/runtime |
| NFR-SPK-009; SC-SPK-008 | T026, T028–T029 | Kiểm thử hợp đồng, migration dùng một lần, báo cáo coverage |
