---
description: "Task list for feat-auto-grading"
---

# Tasks: Engine Chấm điểm Tự động (feat-auto-grading)

**Input**: `feat-objective-testing/SPEC.md` — User Story 3

**Prerequisites**: PLAN.md (required), DB schema `test_attempts` + `attempt_answers` + `questions` + `mock_tests` đã tồn tại

## Format: `[ID] [P?] [US3] Description`

- **[P]**: Chạy song song (khác file, không phụ thuộc nhau)
- **[US3]**: Task thuộc User Story 3
- Include đường dẫn file cụ thể trong mô tả

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/` (N/A cho feature này — thuần Backend)
- Paths tuân theo cấu trúc trong PLAN.md

---

## Phase 1: Setup

- [x] T001 Kiểm tra/tạo bảng `test_attempts` (cột: id, user_id, test_id, mode, status, raw_score, total_questions, band_score, time_spent, practice_mode, submitted_at) và `attempt_answers` (attempt_id, question_id, question_order, user_answer, is_correct, correct_answer) trong migration SQL
- [x] T002 [P] Tạo `backend/src/services/attempt.service.js` với `normalizeAnswer`, `isAnswerCorrect`, class `AttemptService`
- [x] T003 [P] Tạo `backend/src/controllers/attempt.controller.js` với `AttemptController`
- [x] T004 [P] Đăng ký route `POST /api/v1/tests/:id/attempts` trong `backend/src/routes/api/v1/tests.js`

---

## Phase 2: User Story 3 — Auto-Grading Engine (P1) 🎯 CORE

**Goal**: API nhận payload câu trả lời, chấm điểm, tính Band Score, lưu DB trong 1 transaction, trả về kết quả trong < 1s

**Independent Test**: `POST /api/v1/tests/:id/attempts` với `{ "answers": { "1": "apples", "2": "B" }, "timeSpent": 3600 }` → trả về `{ bandScore: 7.0, rawScore: 30 }`. (Key của `answers` là `question_order` dạng số)

### Implementation

- [x] T007 [US3] Implement `normalizeAnswer(str)` trong `attempt.service.js`: trim → toLowerCase → strip leading/trailing `[.,;:!?'"\-\s]` → collapse internal spaces
- [x] T007b [US3] Implement `isAnswerCorrect(userAnswer, correctAnswer, correctAnswers)`: normalize cả 2 vế; hỗ trợ `correct_answers` JSONB array (multiple accepted answers); unanswered = `false`
- [x] T008 [US3] Implement Band Score lookup tables `getBandScore(skill, rawScore)` tại `backend/src/utils/scoring.js` theo thang IELTS Academic chuẩn Cambridge; skill khác trả `0.0`
- [x] T009 [US3] Implement `AttemptService.submitAttempt(testId, userId, answers, timeSpent, practiceMode)` trong `attempt.service.js`:
  1. Query `mock_tests` xác nhận test tồn tại, lấy `skill` (parameterized `$1`)
  2. Query `questions` lấy `correct_answer`, `correct_answers`, `question_order` (parameterized `$1`)
  3. Vòng lấp chấm điểm dùng `isAnswerCorrect`
  4. Scale raw score: `scaledRawScore = round((rawScore / totalQuestions) * 40)`
  5. Gọi `getBandScore(skill, scaledRawScore)` tính band
  6. **Transaction BEGIN**: INSERT `test_attempts` → INSERT từng row `attempt_answers` → **COMMIT**; ROLLBACK nếu lỗi
  7. Return `{ attemptId, status, rawScore, totalQuestions, bandScore, correctCount, incorrectCount, timeSpent, practiceMode, message }`
- [x] T010 [US3] Implement `attempt.controller.js`:
  - Validate `answers` là plain object (không null/array) → `400 INVALID_PAYLOAD`
  - Validate `timeSpent` là số không âm → `400 INVALID_PAYLOAD`
  - Gọi `AttemptService.submitAttempt`, wrap response `{ success: true, data: result, error: null, meta: null }` (HTTP 201)
  - Map `error.statusCode` từ service → HTTP status tương ứng
- [x] T011 [US3] Xử lý edge case: `testId` không tồn tại → 404; bài thi không có câu hỏi → 400; DB lỗi → pass `next(error)` tới `errorHandler.js`

**Checkpoint**: `POST /api/v1/tests/:id/attempts` hoạt động độc lập — unit test pass, manual test qua curl/Postman thành công

---

## Phase 3: Polish

- [x] T012 Đảm bảo `correct_answer` KHÔNG bao giờ xuất hiện trong submit response (chỉ có trong `GET /attempts/:id/detail`)
- [x] T013 `getHistory` merge cả objective (`test_attempts`) + subjective (`submission.service`) — sort theo `submitted_at DESC`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Không phụ thuộc — bắt đầu ngay
- **Phase 2 — Auto-Grading**: Phụ thuộc Phase 1 hoàn thành — BLOCKS mọi Frontend feature
- **Phase 3 — Polish**: Phụ thuộc Phase 2 hoàn thành

### User Story Dependencies

- **US3 (P1)**: Không phụ thuộc `feat-listening-ui` hay `feat-reading-ui` — phát triển hoàn toàn song song
- **feat-attempt-history**: Phải chờ feature này xong (cần `test_attempts` có data)

### Within Each Phase

- Tests (T005, T006) viết TRƯỚC và PHẢI FAIL trước khi implement T007, T008
- T007 (`normalizeAnswer`) trước T009 (`submitAttempt`)
- T008 (`getBandScore`) trước T009
- T009 (service) trước T010 (controller)
- T010 (controller) trước T011 (edge cases)

### Parallel Opportunities

- T002, T003, T004 trong Phase 1: chạy song song
- T005, T006 (test stubs): chạy song song
- T007, T008 (`normalizeAnswer` và `getBandScore`): chạy song song sau khi tests fail

### External Dependencies

- DB migration `test_attempts` + `questions` phải tồn tại (từ `feat-content-builder`)
- `errorHandler.js` middleware đã setup và mount trong Express app

---

## Implementation Strategy

### MVP First (Auto-Grading Core Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Auto-Grading Engine (T005–T011)
3. **STOP và VALIDATE**: Test API `POST /api/v1/tests/:id/attempts` độc lập bằng curl/Postman
4. Deploy nếu ready — Frontend features có thể bắt đầu sau đây

### Incremental Delivery

1. Setup → Foundation ready
2. Implement `normalizeAnswer` + `getBandScore` → test pass → verify logic chấm điểm
3. Implement `submitAttempt` → test API end-to-end → deploy
4. Polish (T012, T013) → merge

### Parallel Team Strategy

- **Developer Backend**: Làm toàn bộ feature này
- **Developer Frontend**: Song song build `feat-listening-ui` / `feat-reading-ui` với mock submit API
- Merge và integration test khi cả 2 xong

---

## Notes

- ponytail: lookup table Band Score đơn giản hơn tính formula — và chính xác hơn vì thang IELTS không tuyến tính
- Toàn bộ logic chấm điểm trong 1 file service — dễ test, dễ audit
