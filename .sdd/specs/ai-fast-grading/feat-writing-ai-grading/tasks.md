---
description: "Công việc cho module chấm nhanh Writing bằng AI"
---

# Công việc: Chấm nhanh Writing bằng AI

## Định dạng

`- [ ] T### [P?] [US#?] Mô tả có đường dẫn file chính xác`

- `[x]`: đã có trong code hiện tại và đã được đối chiếu.
- `[ ]`: còn mở; không được coi là release-ready.
- `[P]`: có thể thực hiện song song khi không sửa cùng file.

## Giai đoạn 1: Nền tảng dùng chung

- [x] T001 Thiết lập cấu hình Writing pipeline, quota và idempotency trong `backend/src/config/aiGrading.config.js` và `.env.example`.
- [x] T002 [P] Tạo schema report/usage/group fields và root job hỗ trợ Writing trong `backend/src/db/migrations/020_add_ai_grading_columns.sql`, `backend/src/db/migrations/021_writing_group_feedback_refactor.sql`, `backend/src/db/migrations/022_create_ai_usage_logs.sql` và `backend/src/db/migrations/025_harden_ai_grading_schema.sql`.
- [x] T003 [P] Tạo validator/sanitizer/ngưỡng từ dùng chung trong `backend/src/ai/grading.validator.js` cùng unit test dưới `backend/tests/unit/ai/`.
- [x] T004 Tích hợp quota theo UTC, fingerprint và idempotency replay trước phép đếm tại `backend/src/services/aiQuota.service.js`, `backend/src/db/queries/aiGradingJobs.queries.js` và `backend/src/services/submission.service.js`.

## Giai đoạn 2: Câu chuyện người dùng 1 — Nộp trọn bộ (P1) 🎯 MVP

- [x] T005 [US1] Chuẩn hóa full payload thành đúng Task 1/2, validate `test_id`, word threshold và tạo group tại `backend/src/services/submission.service.js`.
- [x] T006 [US1] Tạo atomically root Writing job và hai `writing_submissions`, xử lý replay/conflict trong `backend/src/services/submission.service.js`.
- [x] T007 [P] [US1] Gửi `Idempotency-Key`, chặn double submit và giữ `writing_group_id` tại `frontend/src/services/grading.service.js` và `frontend/src/pages/subjective-testing/WritingTestPage.jsx`.
- [x] T008 [US1] Khóa entry point một-Task bằng `WRITING_FULL_SUBMISSION_REQUIRED` trong `backend/src/services/submission.service.js` và giữ `/writing/full` là route chuẩn tại `backend/src/routes/api/v1/submissions.routes.js`.

## Giai đoạn 3: Câu chuyện người dùng 2 — Chấm và tổng hợp (P1)

- [x] T009 [US2] Điều phối provider, prompt, timeout và validate bốn tiêu chí tại `backend/src/ai/grading.service.js`, `backend/src/ai/grading.prompt.js` và `backend/src/ai/grading.validator.js`.
- [x] T010 [US2] Chấm tuần tự hai Task, lưu report, tính band 1/3–2/3, cập nhật group/job và phát Socket.IO event tại `backend/src/services/submission.service.js`.
- [ ] T011 [US1] Chuẩn hóa lỗi bài ngắn về envelope canonical: đưa `word_count`/`required_words` vào `error.details`, `request_id` vào `meta` tại `backend/src/controllers/submission.controller.js`, `backend/src/middleware/errorHandler.js`; làm xanh `backend/tests/integration/submissions/writingAiGrading.test.js`.
- [ ] T012 [P] [US2] Khôi phục Overall Writing Band và chi tiết trọng số 33%/67% tại `frontend/src/components/grading/FeedbackReport.jsx`; làm xanh `frontend/tests/components/grading/FeedbackReport.writingDetail.test.jsx`.

## Giai đoạn 4: Câu chuyện người dùng 3 — Đọc kết quả và vận hành (P2)

- [x] T013 [US3] Chuẩn hóa history/feedback projection và che raw provider data tại `backend/src/services/submission.service.js` và `frontend/src/components/grading/FeedbackReport.jsx`.
- [x] T014 [P] [US3] Ghi usage/diagnostic đã sanitize tại `backend/src/services/aiUsage.service.js` và kiểm thử `backend/tests/unit/services/aiUsage.service.test.js`.
- [ ] T015 [P] [US3] Đo coverage riêng cho business logic Writing, bổ sung nhánh provider/transaction/replay còn thiếu và đặt gate tối thiểu 80% trong cấu hình CI/test của `backend/package.json`.
- [ ] T016 [US3] Chạy lại targeted backend/frontend regression và lưu bằng chứng đạt cho `backend/tests/integration/submissions/writingAiGrading.test.js`, `frontend/tests/components/grading/FeedbackReport.writingDetail.test.jsx` và `frontend/tests/pages/WritingPage.test.jsx`.

## Phụ thuộc và thứ tự

1. T011 và T012 độc lập, có thể làm song song.
2. T015 chạy sau khi hai regression được sửa để số liệu coverage phản ánh code cuối.
3. T016 là cổng phát hành cuối của module Writing.

## Ma trận truy vết

| User story | Yêu cầu | Tasks |
|---|---|---|
| US1 | WFR-001–WFR-007, WFR-012 | T004–T008, T011 |
| US2 | WFR-008–WFR-011 | T009–T012 |
| US3 | WFR-012–WFR-014 | T013–T016 |
