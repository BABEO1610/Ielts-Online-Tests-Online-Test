---
description: "Danh sách công việc triển khai luồng thi và nộp bài Speaking 3 Parts"
---

# Công việc: Luồng thi và nộp bài Speaking 3 Parts

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md)

**Điều kiện tiên quyết**: Bảng `speaking_submissions` (có `speaking_group_id`, `audio_url`, `part_number`, `status`, `grader`), `ai_grading_reports`, `mock_tests` đã tồn tại. Dịch vụ `gradeSpeakingGroup` từ `ai-fast-grading` đã sẵn sàng. Middleware `authenticate` và Supabase/S3 storage đã hoạt động.

**Kiểm thử**: Bắt buộc cho service layer (≥80% coverage). Mock storage & AI provider — không gọi dịch vụ ngoài thật trong test tự động.

## Định dạng: `[ID] [P?] [Story] Mô tả`

- **[P]**: Có thể làm song song (khác file, không phụ thuộc)
- **[USn]**: Liên kết câu chuyện người dùng trong spec.md
- Mỗi task có đường dẫn file chính xác

## Giai đoạn 1: Thiết lập

**Mục đích**: Xác nhận cấu trúc hiện có và đảm bảo sẵn sàng trước khi sửa code.

- [x] T001 Xác minh bảng `speaking_submissions` có đủ cột `speaking_group_id`, `audio_url`, `part_number`, `grader`, `status`, `submitted_at` trong `backend/src/db/pool.js`
- [x] T002 [P] Xác minh route `POST /api/v1/submissions/speaking/upload` và `POST /api/v1/submissions/speaking/full` tồn tại và gắn middleware `authenticate` trong `backend/src/routes/api/v1/submissions.routes.js`
- [x] T003 [P] Xác minh hàm `gradeSpeakingGroup` export từ `backend/src/services/speakingAiGrading.service.js` có thể import và mock được

**Điểm kiểm tra**: Schema, routes và AI service dependency đã xác nhận.

---

## Giai đoạn 2: Nền tảng (Bảo mật & Validation)

**Mục đích**: Các điều kiện bảo mật và kiểm tra hợp lệ mà mọi User Story phụ thuộc.

**⚠️ QUAN TRỌNG**: Không triển khai User Story nào trước khi giai đoạn này hoàn tất.

- [x] T004 Chuẩn hóa kiểm tra an toàn đường dẫn audio: Bắt buộc chứa tiền tố `speaking/{userId}/` và KHÔNG chứa ký tự chuyển hướng `..` trong `backend/src/services/submission.service.js`
- [x] T005 [P] Chuẩn hóa mảng Parts đầu vào: Bắt buộc đúng 3 phần (`parts.length === 3`) và chứa `part_number` hợp lệ (1, 2, 3) trong `backend/src/services/submission.service.js`
- [x] T006 [P] Đảm bảo endpoint legacy `POST /speaking` ngắt và từ chối nếu `grader = ai` với mã lỗi `SPEAKING_FULL_SUBMISSION_REQUIRED` trong `backend/src/controllers/submission.controller.js`
- [ ] T007 Viết unit test cho audio path verification, parts array validation và legacy grader rejection trong `backend/tests/unit/services/speakingValidation.test.js`

**Điểm kiểm tra**: Security guards và validation functions đã có test pass.

---

## Giai đoạn 3: Câu chuyện người dùng 1 — Giao diện thu âm 3 Parts Speaking (P1) 🎯 MVP

**Mục tiêu**: Học viên trải nghiệm luồng thi Speaking từ Intro qua 3 Parts, thu âm và upload audio tạm thời thành công.

**Kiểm thử độc lập**: Mở đề Speaking, trải nghiệm thu âm từng Part, kiểm tra console/network tab nhận được `temp_s3_key` trả về từ API `/speaking/upload`.

- [x] T008 [P] [US1] Rà soát và sửa component `ExamRecorder` đảm bảo thu âm âm thanh MediaRecorder và upload tự động qua `gradingService.uploadAudio` nhận `temp_s3_key` trong `frontend/src/components/grading/ExamRecorder.jsx`
- [x] T009 [P] [US1] Rà soát màn hình Part 1 & Part 3 (`Part13Screen`) đảm bảo đếm ngược theo câu hỏi, bấm "Hoàn thành sớm" chuyển câu đúng trong `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`
- [x] T010 [US1] Rà soát màn hình Part 2 (`Part2Screen`) đảm bảo đếm ngược 60 giây chuẩn bị, hiển thị Cue Card, sau đó chuyển sang 120 giây nói trong `frontend/src/components/grading/Part2Screen.jsx`
- [x] T011 [US1] Rà soát `SpeakingTestScreen` State Machine điều phối chuyển phase (intro → part1 → part2 → part3 → summary → result) trong `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`

**Điểm kiểm tra**: Thu âm 3 Parts trên giao diện hoạt động mượt mà, upload nhận `temp_s3_key`.

---

## Giai đoạn 4: Câu chuyện người dùng 2 — Nộp bài Full 3 Parts & Chọn Grader (P1)

**Mục tiêu**: Học viên chọn `grader`, nộp 3 Parts; backend lưu DB transaction và phân luồng AI/tutor.

**Kiểm thử độc lập**: Gọi API `POST /speaking/full` với 3 parts, xác minh 3 record được insert cùng `speaking_group_id`, `grader = ai` gọi AI service, `grader = tutor` giữ status `pending`.

- [x] T012 [P] [US2] Rà soát `SpeakingSummaryScreen` đảm bảo hiển thị đủ 3 phần đã thu âm, cho phép chọn `grader` (ai/tutor) và gọi `onSubmit(grader)` trong `frontend/src/components/grading/SpeakingSummaryScreen.jsx`
- [x] T013 [US2] Rà soát controller `SubmissionController.uploadSpeakingAudio` đảm bảo nhận file, validate mimetype, lưu kho và trả `temp_s3_key` trong `backend/src/controllers/submission.controller.js`
- [x] T014 [US2] Rà soát controller `SubmissionController.submitFullSpeaking` đảm bảo đọc `req.user.id`, validate `parts` length = 3 và gọi service trong `backend/src/controllers/submission.controller.js`
- [x] T015 [US2] Rà soát service `SubmissionService.submitFullSpeaking` đảm bảo: BEGIN/COMMIT transaction, verify audio storage path, insert 3 `speaking_submissions` cùng `speaking_group_id`, gọi `gradeSpeakingGroup` nếu `grader = ai`, update status `ai_graded` khi hoàn tất trong `backend/src/services/submission.service.js`
- [ ] T016 [US2] Viết integration test cho `POST /api/v1/submissions/speaking/upload` và `POST /api/v1/submissions/speaking/full` bao gồm: happy path, path traversal attack, thiếu part, grader = tutor trong `backend/tests/integration/submissions/speakingFullSubmit.test.js`

**Điểm kiểm tra**: API nộp bài Speaking Full pass tất cả test cases.

---

## Giai đoạn 5: Câu chuyện người dùng 3 — Màn hình kết quả & Thông báo (P2)

**Mục tiêu**: Sau khi nộp bài thành công, học viên nhận thông báo hoàn thành tiếng Việt và có nút trở về.

**Kiểm thử độc lập**: Nộp bài Speaking thành công, xác minh giao diện chuyển sang màn hình thông báo hoàn thành với icon tích xanh và nút quay lại.

- [x] T017 [P] [US3] Rà soát màn hình kết quả nộp bài `phase === 'result'` đảm bảo hiển thị icon tích xanh, thông báo bằng tiếng Việt và nút "Trở về danh sách đề" trong `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`
- [x] T018 [US3] Rà soát việc chuyển hướng về danh sách đề thi Speaking `/speaking` khi học viên bấm hoàn thành trong `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx`

**Điểm kiểm tra**: Trải nghiệm nộp bài hoàn tất và điều hướng mượt mà.

---

## Giai đoạn 6: Hoàn thiện và kiểm tra chéo

**Mục đích**: Cải thiện chất lượng và độ an toàn hệ thống.

- [x] T019 [P] Rà soát xử lý lỗi micro/upload ở frontend: hiển thị thông báo lỗi thân thiện bằng tiếng Việt khi không có micro hoặc upload thất bại trong `frontend/src/components/grading/ExamRecorder.jsx`
- [x] T020 [P] Đảm bảo không trả stack trace hoặc raw storage keys trong API error response production trong `backend/src/middleware/errorHandler.js`
- [ ] T021 Viết regression test cho Speaking AI submission flow trong `backend/tests/integration/submissions/speakingAiGrading.test.js`
- [x] T022 Kiểm tra chéo spec ↔ plan ↔ tasks: xác minh mỗi FR trong spec.md có ít nhất một task đảm nhận

---

## Phụ thuộc và thứ tự thực thi

### Phụ thuộc giữa các giai đoạn

- **Giai đoạn 1 (Thiết lập)**: Không phụ thuộc — bắt đầu ngay.
- **Giai đoạn 2 (Nền tảng)**: Phụ thuộc giai đoạn 1 — CHẶN tất cả User Story.
- **Giai đoạn 3 (US1 — Giao diện thu âm)**: Phụ thuộc giai đoạn 2.
- **Giai đoạn 4 (US2 — Nộp bài API)**: Phụ thuộc giai đoạn 2.
- **Giai đoạn 5 (US3 — Màn hình kết quả)**: Phụ thuộc giai đoạn 3 + 4.
- **Giai đoạn 6 (Hoàn thiện)**: Phụ thuộc tất cả giai đoạn trước.

---

## Ma trận FR ↔ Task

| FR | Task(s) | Ghi chú |
|---|---|---|
| FR-001 | T011 | State Machine (Intro → Part 1,2,3 → Summary → Result) |
| FR-002 | T008, T013 | Upload audio & receive temp_s3_key |
| FR-003 | T013 | Safe path format `speaking/{userId}/` |
| FR-004 | T009 | Part 1 & Part 3 timer & early finish |
| FR-005 | T010 | Part 2 prep & speaking timer |
| FR-006 | T012 | Summary screen & grader selection |
| FR-007 | T005, T014 | Require exactly 3 parts |
| FR-008 | T004, T015, T016 | Path ownership & traversal verification |
| FR-009 | T015, T016 | DB transaction & speaking_group_id |
| FR-010 | T006 | Legacy endpoint rejection for grader=ai |
| FR-011 | T015 | AI grading trigger & fail-safe handling |
| FR-012 | T015 | Tutor routing & status=pending |
| FR-013 | T015 | Optional test_id validation |
| FR-014 | T013, T014, T020 | API Envelope format |
| FR-015 | T017, T018 | Result screen & return button |

---

## Ghi chú

- [P] = khác file, không phụ thuộc trực tiếp
- [USn] = liên kết câu chuyện người dùng
- AI Engine internals (ASR, audio evidence, scoring) thuộc `ai-fast-grading` — không sửa ở đây
