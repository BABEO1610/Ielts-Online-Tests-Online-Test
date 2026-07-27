# Feature Specification: Engine Chấm điểm Tự động (feat-auto-grading)

**Feature Branch**: `feat/auto-grading`

**Created**: 2026-07-27

**Status**: Completed

**Input**: Tách từ User Story 3 của `feat-objective-testing/SPEC.md` — Backend engine chấm bài tự động, tính Band Score IELTS, lưu `test_attempts` + `attempt_answers`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chấm điểm tự động khi học viên nộp bài (Priority: P1)

Là một hệ thống (Backend), tôi muốn nhận payload câu trả lời từ Frontend, so khớp với đáp án đúng trong DB, tính điểm raw và Band Score IELTS Academic, sau đó lưu kết quả vào bảng `test_attempts` và trả về kết quả cho Frontend.

**Why this priority**: Đây là trái tim của hệ thống đánh giá — không có engine này thì không có kết quả thi.

**Independent Test**: Gửi `POST /api/v1/tests/:id/attempts` với JSON payload `{ "answers": { "1": " Apples ", "2": "B" }, "timeSpent": 3600 }` → kiểm tra response chứa `bandScore` và `rawScore` đúng. (Lưu ý: key của `answers` là `question_order` dạng số, không phải question ID.)

**Acceptance Scenarios**:

1. **Given** đáp án đúng là `"apples"`, **When** học viên gửi lên `" Apples "` (có khoảng trắng và in hoa), **Then** hệ thống `normalizeAnswer` trim + lowercase → chấm ĐÚNG.
2. **Given** bài Reading có 40 câu, học viên trả lời đúng 30 câu, **When** API tính điểm, **Then** trả về `bandScore: 7.0` theo thang IELTS Academic chuẩn.

---

### User Story 2 - Validate payload và xử lý lỗi (Priority: P1)

Là một hệ thống (Backend), tôi muốn reject các request thiếu hoặc sai format để tránh dữ liệu rác vào DB.

**Why this priority**: Bảo vệ tính toàn vẹn DB và đảm bảo không lưu attempt rác.

**Independent Test**: Gửi request thiếu field `answers` → API trả về `400 Bad Request` với error message rõ ràng.

**Acceptance Scenarios**:

1. **Given** request body không có field `answers`, **When** gọi `POST /api/v1/tests/:id/attempts`, **Then** response `400 Bad Request` với `{ success: false, error: "answers is required" }`.
2. **Given** `testId` không tồn tại trong DB, **When** gọi API, **Then** response `404 Not Found`.

---

### Edge Cases

- `answers` là object rỗng `{}` → Submit bình thường, raw score = 0.
- Câu trả lời là `null` hoặc `undefined` → `normalizeAnswer` trả về `""` → `isAnswerCorrect` trả `false` (unanswered = wrong).
- `answers` là `null`, `Array`, hoặc primitive → Controller trả `400 INVALID_PAYLOAD`.
- `timeSpent` âm hoặc không phải số → Controller trả `400 INVALID_PAYLOAD`.
- DB timeout khi INSERT `test_attempts` hoặc `attempt_answers` → ROLLBACK transaction, pass error tới `errorHandler.js`, trả về 500.
- Bài thi không có câu hỏi nào (`questions.length === 0`) → Service throw `400 Bad Request`.
- Bài thi có `skill` không phải `reading`/`listening` (writing/speaking) → `getBandScore` trả `0.0`, không throw error; `status` = `'submitted'` (chờ chấm tay).
- `correct_answers` là JSONB array → `isAnswerCorrect` so khớp với **bất kỳ** phần tử nào trong array (multiple accepted answers).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST implement `normalizeAnswer(str)` trong `attempt.service.js`: trim → toLowerCase → strip leading/trailing punctuation → collapse internal spaces.
- **FR-002**: Hệ thống MUST implement `isAnswerCorrect(userAnswer, correctAnswer, correctAnswers)`: so khớp sau normalize; hỗ trợ `correct_answers` JSONB array (multiple accepted answers).
- **FR-003**: Hệ thống MUST implement `getBandScore(skill, rawScore)` tại `backend/src/utils/scoring.js` theo bảng tra cứu IELTS Academic chuẩn Cambridge — Reading và Listening có thang khác nhau; skill khác (writing/speaking) trả `0.0`.
- **FR-004**: Hệ thống MUST lưu summary vào `test_attempts` VÀ per-question detail vào `attempt_answers` trong **một transaction duy nhất** với parameterized queries — KHÔNG nối chuỗi SQL.
- **FR-005**: Hệ thống MUST validate: `answers` phải là plain object (không null/array); `timeSpent` phải là số không âm → 400 `INVALID_PAYLOAD` nếu vi phạm.
- **FR-006**: Hệ thống MUST KHÔNG trả về `correct_answer` trong submit response (`POST /attempts`). (Chỉ expose trong review endpoint `GET /attempts/:id/detail` sau khi nộp.)
- **FR-007**: Hệ thống MUST hỗ trợ `practiceMode: boolean` — lưu vào `test_attempts.practice_mode`; `status` = `'graded'` (objective) hoặc `'submitted'` (subjective).
- **FR-008**: Hệ thống MUST scale raw score khi bài thi không đủ 40 câu: `scaledRawScore = round((rawScore / totalQuestions) * 40)`.
- **FR-009**: Hệ thống MUST trả về response theo chuẩn AGENTS.md: `{ success, data: { attemptId, status, rawScore, totalQuestions, bandScore, correctCount, incorrectCount, timeSpent, practiceMode, message }, meta: null, error: null }`.

### Key Entities

- **`test_attempts`**: Summary — `user_id`, `test_id`, `mode`, `status`, `raw_score`, `total_questions`, `band_score`, `time_spent`, `practice_mode`, `submitted_at`.
- **`attempt_answers`**: Per-question detail — `attempt_id`, `question_id`, `question_order`, `user_answer`, `is_correct`, `correct_answer`.
- **`questions`**: Read-only — lấy `correct_answer`, `correct_answers` (JSONB), `question_order` để chấm bài.
- **`mock_tests`**: Read-only — lấy `skill`, `title` để xác định thang Band Score.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: API chấm điểm 40 câu trả về kết quả trong < 1000ms (không tính latency mạng).
- **SC-002**: 100% câu trả lời chỉ thừa khoảng trắng nhưng đúng từ vựng → được chấm ĐÚNG.
- **SC-003**: Band Score trả về khớp 100% với bảng IELTS Academic chuẩn Cambridge cho mọi raw score 0–40.
- **SC-004**: Không có SQL injection vector — mọi query dùng parameterized `$N`.

## Assumptions

- Database đã có bảng `questions` với cột `correct_answer`, `correct_answers` (JSONB) và `question_order` (từ `feat-content-builder`).
- JWT middleware đã cung cấp `req.user.id` tại mọi route protected.
- `errorHandler.js` middleware đã được setup và mount trong Express app.
- Bảng Band Score IELTS Academic cho Reading và Listening là cố định — không thay đổi theo đề thi.
