---
description: "Danh sách công việc triển khai Luồng Chấm điểm Tự động bằng AI"
---

# Công việc: Luồng Chấm điểm Tự động bằng AI (AI Evaluation & Grading Integration)

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md)

**Điều kiện tiên quyết**: Bảng `writing_submissions`, `speaking_submissions`, `ai_grading_reports`, `ai_usage_logs` đã tồn tại. LLM Provider Wrapper và Validator đã sẵn sàng.

## Giai đoạn 1: Thiết lập

- [x] T001 Xác minh cấu trúc bảng `ai_grading_reports` và `ai_usage_logs` trong `backend/src/db/pool.js`
- [x] T002 [P] Xác minh route `POST /api/v1/submissions/writing/:submissionId/ai-grade` trong `backend/src/routes/api/v1/submissions.routes.js`
- [x] T003 [P] Xác minh hằng số `WORD_COUNT_THRESHOLDS` và `REPORT_STATUS` trong `backend/src/ai/aiGrading.constants.js`

---

## Giai đoạn 2: Nền tảng (Hợp lệ số từ & Idempotency)

- [x] T004 Chuẩn hóa kiểm tra quyền sở hữu `sub.user_id === req.user.id` và vai trò học viên trong `backend/src/controllers/aiGrading.controller.js`
- [x] T005 [P] Chuẩn hóa hàm `countWords` đếm từ chính xác và kiểm tra ngưỡng tối thiểu trong `backend/src/ai/grading.service.js`
- [x] T006 [P] Chuẩn hóa kiểm tra Cached Report (`findExistingReport`) đảm bảo tính Idempotency trong `backend/src/controllers/aiGrading.controller.js`
- [x] T007 Viết unit test cho countWords và idempotency cache lookup trong `backend/tests/unit/services/aiGradingValidation.test.js`

---

## Giai đoạn 3: Câu chuyện người dùng 1 — Chấm AI Writing & Tính Band Trọng số (P1) 🎯 MVP

- [x] T008 [P] [US1] Rà soát `gradeWriting` gọi LLM provider wrapper và validate 4 tiêu chí IELTS Writing trong `backend/src/ai/grading.service.js` & `grading.validator.js`
- [x] T009 [US1] Rà soát `saveGradingResult` mở DB transaction insert `ai_grading_reports` và UPDATE `writing_submissions` trong `backend/src/controllers/aiGrading.controller.js`
- [x] T010 [US1] Rà soát `updateWritingGroupAiState` tính điểm tổng hợp trọng số (33% Task 1 / 67% Task 2) và làm tròn half-band trong `backend/src/controllers/aiGrading.controller.js`
- [x] T011 [US1] Viết unit test cho `calcWeightedWritingOverall` trong `backend/tests/unit/utils/getBandScore.test.js`

---

## Giai đoạn 4: Câu chuyện người dùng 2 — Chấm AI Speaking 3 Parts (P1)

- [x] T012 [P] [US2] Rà soát `gradeSpeakingGroup` tự động gọi ASR transcribe nếu thiếu transcript trong `backend/src/services/speakingAiGrading.service.js`
- [x] T013 [US2] Rà soát `gradeSpeakingSession` validate 4 tiêu chí IELTS Speaking (gồm Pronunciation) trong `backend/src/ai/speakingGrading.validator.js`
- [x] T014 [US2] Rà soát lưu báo cáo Speaking AI vào `ai_grading_reports` và cập nhật `status = 'ai_graded'` trong `backend/src/services/speakingAiGrading.service.js`

---

## Giai đoạn 5: Câu chuyện người dùng 3 — Xử lý Sự cố & Realtime Socket (P2)

- [x] T015 [P] [US3] Rà soát `handleGradingError` lưu báo cáo lỗi `status = 'failed'` và giữ bài nộp ở trạng thái `pending` trong `backend/src/controllers/aiGrading.controller.js`
- [x] T016 [US3] Rà soát `emitGradingCompleted` và `emitGradingFailed` phát sự kiện Socket.io đến channel học viên trong `backend/src/controllers/aiGrading.controller.js`

---

## Giai đoạn 6: Hoàn thiện và Kiểm tra chéo

- [x] T017 [P] Đảm bảo mọi cuộc gọi AI đều ghi nhật ký token và độ trễ vào `ai_usage_logs` qua `aiUsageService.logUsage` trong `backend/src/services/aiUsage.service.js`
- [x] T018 Kiểm tra chéo spec ↔ plan ↔ tasks: xác minh mỗi FR trong spec.md có ít nhất một task đảm nhận

---

## Ma trận FR ↔ Task

| FR | Task(s) | Ghi chú |
|---|---|---|
| FR-001 | T004 | Verify ownership & student role |
| FR-002 | T005 | Min word count check (Task 1 >= 50, Task 2 >= 100) |
| FR-003 | T006 | Idempotency check with cached report |
| FR-004 | T008, T009 | Writing 4 criteria, improved version & error highlights |
| FR-005 | T012, T013 | Speaking 4 criteria including pronunciation |
| FR-006 | T010, T011 | Weighted band score calculation (33%/67% half-band) |
| FR-007 | T017 | Log usage metadata to ai_usage_logs |
| FR-008 | T015, T016 | Persist failure state & emit socket events |
