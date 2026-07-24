---
description: "Danh sách công việc triển khai luồng thi và nộp bài Writing"
---

# Công việc: Luồng thi và nộp bài Writing

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md)

**Điều kiện tiên quyết**: Bảng `writing_submissions` (có `writing_group_id`, `word_count`, `ai_status`, `overall_ai_band`), `ai_grading_reports`, `mock_tests` đã tồn tại. Dịch vụ chấm AI (`gradeWriting`) từ `ai-fast-grading` đã sẵn sàng. Middleware `authenticate` đã hoạt động.

**Kiểm thử**: Bắt buộc cho service layer (≥80% coverage). Mock AI provider — không gọi Internet.

## Định dạng: `[ID] [P?] [Story] Mô tả`

- **[P]**: Có thể làm song song (khác file, không phụ thuộc)
- **[USn]**: Liên kết câu chuyện người dùng trong spec.md
- Mỗi task có đường dẫn file chính xác

## Giai đoạn 1: Thiết lập

**Mục đích**: Xác nhận cấu trúc hiện có và đảm bảo sẵn sàng trước khi sửa code.

- [x] T001 Xác minh bảng `writing_submissions` có đủ cột `writing_group_id`, `word_count`, `ai_status`, `overall_ai_band`, `tutor_status`, `updated_at` bằng query `information_schema.columns` trong `backend/tests/integration/db/writingSchema.verify.test.js`
- [x] T002 [P] Xác minh route `POST /api/v1/submissions/writing/full` tồn tại và gắn middleware `authenticate` trong `backend/src/routes/api/v1/submissions.routes.js`
- [x] T003 [P] Xác minh hàm `gradeWriting` export từ `backend/src/ai/grading.service.js` có thể import và mock được

**Điểm kiểm tra**: Schema, route và AI service dependency đã xác nhận — sẵn sàng triển khai.

---

## Giai đoạn 2: Nền tảng (Chặn chung)

**Mục đích**: Các thành phần chia sẻ mà nhiều User Story phụ thuộc.

**⚠️ QUAN TRỌNG**: Không triển khai User Story nào trước khi giai đoạn này hoàn tất.

- [x] T004 Chuẩn hóa hàm `normalizeWritingTasks` đảm bảo validate đúng hai task, non-empty `response_text`, `task_number` ∈ {1, 2}, không trùng lặp trong `backend/src/services/submission.service.js`
- [x] T005 [P] Chuẩn hóa hàm `countWords` và thêm validate ngưỡng từ tối thiểu (Task 1 ≥ 50, Task 2 ≥ 100) trước khi gọi AI trong `backend/src/ai/grading.service.js` (hoặc validator riêng nếu đã có trong `ai-fast-grading`)
- [x] T006 [P] Đảm bảo hàm `calcWeightedWritingOverall` tính đúng trọng số 33% (Task 1) / 67% (Task 2) và làm tròn half-band trong `backend/src/utils/scoring.js`
- [x] T007 Viết unit test cho `normalizeWritingTasks`, `countWords`, ngưỡng từ và `calcWeightedWritingOverall` trong `backend/tests/unit/services/writingValidation.test.js`

**Điểm kiểm tra**: Validation và scoring functions đã có test pass.

---

## Giai đoạn 3: Câu chuyện người dùng 1 — Giao diện thi Writing (P1) 🎯 MVP

**Mục tiêu**: Học viên mở đề, viết bài Task 1 & Task 2 trong split-view với đếm ngược và đếm từ.

**Kiểm thử độc lập**: Mở đề Writing trên trình duyệt, viết văn bản vào cả hai ô, xác minh đếm từ cập nhật đúng, timer đếm ngược, nút nộp vô hiệu khi task còn trống.

- [x] T008 [P] [US1] Rà soát và sửa component `WritingEditor` đảm bảo `onContentChange` callback trả về text realtime và `getTaskData()` trả đúng `{ task_number, prompt_text, response_text }` trong `frontend/src/components/grading/WritingEditor.jsx`
- [x] T009 [P] [US1] Rà soát và sửa component `TimerBar` đảm bảo `onTimeUp` callback kích hoạt đúng khi hết giờ và hiển thị thời gian còn lại chính xác trong `frontend/src/components/objective-testing/TimerBar.jsx`
- [x] T010 [US1] Rà soát `WritingTestScreen` đảm bảo: split-view layout (đề trái/editor phải), thanh điều hướng task ở dưới, badge `Done` khi task hoàn thành, nút nộp disable khi task trống, `handleTimeUp` mở modal nộp bài tự động trong `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- [x] T011 [US1] Bổ sung cảnh báo UI khi số từ dưới ngưỡng tối thiểu (150 từ Task 1, 250 từ Task 2 — ngưỡng hiển thị, khác ngưỡng chặn backend 50/100) trong `frontend/src/components/grading/WritingEditor.jsx`

**Điểm kiểm tra**: Giao diện thi Writing hiển thị đúng, đếm từ/timer hoạt động, nút nộp logic đúng.

---

## Giai đoạn 4: Câu chuyện người dùng 2 — Nộp bài và chọn người chấm (P1)

**Mục tiêu**: Học viên chọn `grader`, nộp bài; hệ thống lưu DB transaction và phân luồng AI hoặc tutor.

**Kiểm thử độc lập**: Gọi API `POST /writing/full` với mock AI, xác minh 2 record tạo đúng `writing_group_id`, AI gọi đúng cho `grader=ai`, không gọi cho `grader=tutor`.

- [x] T012 [P] [US2] Rà soát `WritingSubmitModal` đảm bảo radio chọn `grader` (ai/tutor), nút xác nhận gọi `onConfirm(grader)`, disable khi đang nộp, hiển thị đúng khi `isTimeUp` trong `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- [x] T013 [US2] Rà soát hàm `submitAllTasks` đảm bảo gom đúng `{ test_id, grader, tasks }` payload và gọi `gradingService.submitFullWriting` trong `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- [x] T014 [US2] Rà soát `SubmissionController.submitFullWriting` đảm bảo đọc `req.user.id`, validate `tasks` array và gọi service đúng trong `backend/src/controllers/submission.controller.js`
- [x] T015 [US2] Rà soát `SubmissionService.submitFullWriting` đảm bảo: validate grader, normalizeWritingTasks, normalizeOptionalUuid(testId), query mock_tests, BEGIN/COMMIT transaction, insertWritingTask ×2 cùng writing_group_id, gọi gradeWriting nếu ai, saveCompletedAiReport/saveFailedAiReport, calcWeightedWritingOverall, UPDATE ai_status/overall_ai_band/status trong `backend/src/services/submission.service.js`
- [x] T016 [US2] Viết integration test cho `POST /api/v1/submissions/writing/full` bao gồm: happy path (ai + tutor), lỗi validation (thiếu task, task trống, grader sai, test_id không tồn tại), AI thất bại (bài giữ lại, report lỗi lưu) trong `backend/tests/integration/submissions/writingFullSubmit.test.js`

**Điểm kiểm tra**: API nộp bài Writing pass tất cả test cases — sẵn sàng tích hợp UI.

---

## Giai đoạn 5: Câu chuyện người dùng 3 — Hiển thị kết quả AI (P2)

**Mục tiêu**: Sau khi nộp thành công với AI, giao diện chuyển sang màn hình kết quả với 4 tiêu chí và band tổng hợp.

**Kiểm thử độc lập**: Nộp bài AI thành công, xác minh FeedbackReport render đủ thông tin.

- [x] T017 [P] [US3] Rà soát `FeedbackReport` component đảm bảo: gọi `GET /:id/feedback?type=writing`, hiển thị 4 tiêu chí (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammar), band tổng hợp, nhãn `AI Estimated Band`, suggestions và error_highlights trong `frontend/src/components/grading/FeedbackReport.jsx`
- [x] T018 [US3] Rà soát luồng `handleSubmitSuccess` → `setSubmittedId` → render `FeedbackReport` đảm bảo chuyển màn hình đúng khi AI thành công và hiển thị lỗi khi AI thất bại trong `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- [x] T019 [US3] Thêm nhãn `AI Estimated Band` rõ ràng vào giao diện kết quả AI (nếu chưa có) và đảm bảo không nhầm với `Tutor Grade` trong `frontend/src/components/grading/FeedbackReport.jsx`

**Điểm kiểm tra**: Học viên nộp bài AI và nhìn thấy kết quả đầy đủ trên giao diện.

---

## Giai đoạn 6: Hoàn thiện và kiểm tra chéo

**Mục đích**: Cải thiện chất lượng xuyên suốt các User Story.

- [x] T020 [P] Rà soát xử lý lỗi mạng/timeout ở frontend: hiển thị thông báo lỗi thân thiện bằng tiếng Việt, không để treo loading vô thời hạn trong `frontend/src/pages/subjective-testing/WritingTestPage.jsx`
- [x] T021 [P] Đảm bảo không trả stack trace, raw AI response hoặc internal error trong API response production trong `backend/src/middleware/errorHandler.js`
- [x] T022 Chạy regression test Writing từ `ai-fast-grading` (nếu có) để xác nhận không hồi quy khi thay đổi code liên quan trong `backend/tests/integration/submissions/writingAiGrading.test.js`
- [x] T023 Kiểm tra chéo spec ↔ plan ↔ tasks: xác minh mỗi FR trong spec.md có ít nhất một task đảm nhận, mỗi task có file path cụ thể

---

## Phụ thuộc và thứ tự thực thi

### Phụ thuộc giữa các giai đoạn

- **Giai đoạn 1 (Thiết lập)**: Không phụ thuộc — bắt đầu ngay.
- **Giai đoạn 2 (Nền tảng)**: Phụ thuộc giai đoạn 1 — CHẶN tất cả User Story.
- **Giai đoạn 3 (US1 — Giao diện)**: Phụ thuộc giai đoạn 2. Có thể song song với giai đoạn 4 (backend).
- **Giai đoạn 4 (US2 — Nộp bài)**: Phụ thuộc giai đoạn 2. Có thể song song với giai đoạn 3 (frontend).
- **Giai đoạn 5 (US3 — Kết quả)**: Phụ thuộc giai đoạn 3 + 4 hoàn tất.
- **Giai đoạn 6 (Hoàn thiện)**: Phụ thuộc tất cả giai đoạn trước.

### Phụ thuộc giữa các User Story

- **US1 (Giao diện thi)**: Độc lập — chỉ cần component UI.
- **US2 (Nộp bài)**: Độc lập về backend — cần US1 để tích hợp frontend↔API.
- **US3 (Kết quả)**: Phụ thuộc US2 (cần bài nộp AI thành công để có kết quả hiển thị).

### Cơ hội song song

```text
# Giai đoạn 1: Setup (tất cả [P] song song)
T001 | T002 | T003

# Giai đoạn 2: Foundation (T005 và T006 song song)
T004 → T007
T005 | T006

# Giai đoạn 3 + 4: US1 frontend || US2 backend (song song giữa FE/BE)
FE: T008 | T009 → T010 → T011
BE: T012 | T014 → T015 → T016
```

---

## Chiến lược triển khai

### MVP (chỉ US1 + US2)

1. Hoàn tất Giai đoạn 1 + 2 → Nền tảng sẵn sàng
2. Hoàn tất Giai đoạn 3 + 4 song song → Giao diện thi + API nộp bài
3. **DỪNG và KIỂM TRA**: Nộp bài thành công qua UI, verify DB records
4. Deploy/demo nếu sẵn sàng

### Phát triển lũy tiến

1. MVP → Thi và nộp bài hoạt động
2. Thêm US3 → Hiển thị kết quả AI tức thì
3. Hoàn thiện → Error handling, regression test, cross-check

---

## Ma trận FR ↔ Task

| FR | Task(s) | Ghi chú |
|---|---|---|
| FR-001 | T010 | Split-view layout |
| FR-002 | T008, T011 | Đếm từ realtime + cảnh báo |
| FR-003 | T009, T010 | Timer + auto-show modal |
| FR-004 | T010 | Nút nộp disable |
| FR-005 | T012 | Modal chọn grader |
| FR-006 | T014 | req.user.id |
| FR-007 | T004, T015 | normalizeWritingTasks |
| FR-008 | T005, T007, T016 | Word count threshold |
| FR-009 | T015, T016 | DB transaction |
| FR-010 | T015, T016 | AI call + error handling |
| FR-011 | T015, T016 | Tutor routing |
| FR-012 | T015, T016 | test_id validation |
| FR-013 | T015 | Lịch sử mới, không ghi đè |
| FR-014 | T014, T021 | Response envelope |
| FR-015 | T017, T018, T019 | Kết quả AI + nhãn |

---

## Ghi chú

- [P] = khác file, không phụ thuộc trực tiếp
- [USn] = liên kết câu chuyện người dùng
- Phần lớn code đã as-built → task chủ yếu là **rà soát, sửa lỗi và bổ sung test** thay vì viết mới
- AI Engine internals (prompt, validator, retry, cache) thuộc `ai-fast-grading` — không sửa ở đây
