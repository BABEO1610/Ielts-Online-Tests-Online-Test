# Đặc tả tính năng: Engine Chấm điểm Tự động (feat-auto-grading)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Completed
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cần engine chấm điểm tự động cho bài thi trắc nghiệm (Reading & Listening). Khi học viên nộp bài, backend nhận payload câu trả lời, so khớp với đáp án trong DB, tính Band Score IELTS Academic theo thang chuẩn Cambridge, và lưu kết quả nguyên tử vào `test_attempts` + `attempt_answers`. Kết quả trả về ngay lập tức — không cần chờ giáo viên chấm tay. Với bài Writing/Speaking (chủ quan), engine không tính Band Score mà lưu trạng thái `submitted` để chờ chấm thủ công.

**Input**: Tách từ User Story 3 của `feat-objective-testing/SPEC.md`.

## 2. Phạm vi

- Chấm điểm tự động cho bài thi `skill = 'reading'` và `skill = 'listening'`.
- Chuẩn hóa câu trả lời (normalize: trim, lowercase, strip punctuation) trước khi so khớp.
- Hỗ trợ multiple accepted answers qua cột `correct_answers` (JSONB array).
- Scale raw score về thang 40 câu khi bài thi có ít hơn 40 câu.
- Lưu nguyên tử summary (`test_attempts`) và chi tiết từng câu (`attempt_answers`) trong một transaction.
- Hỗ trợ `practiceMode` boolean — lưu vào `test_attempts.practice_mode`.
- Validate input: `answers` (plain object), `timeSpent` (số không âm).

## 3. Ngoài phạm vi

- Chấm điểm tự động Writing hoặc Speaking — luồng này chờ giáo viên chấm tay.
- Giao diện frontend trang làm bài (thuộc `feat-reading-ui`, `feat-listening-ui`).
- Lưu lịch sử và trang review chi tiết (thuộc `feat-attempt-history`).
- Thông báo real-time kết quả qua WebSocket hay Socket.io trong v1.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Gọi `POST /api/v1/tests/:id/attempts` để nộp bài và nhận kết quả của chính mình. |
| Giảng viên (Tutor) | Không tương tác với engine này; chỉ chấm bài Writing/Speaking qua luồng riêng. |
| Quản trị viên (Admin) | Không có quyền đặc biệt trong luồng chấm tự động; có thể xem log qua tầng vận hành. |
| Khách / chưa xác thực | Không được phép — tất cả endpoint đều yêu cầu JWT hợp lệ. |


## 5. Câu chuyện người dùng và kiểm thử độc lập

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

## 6. Trường hợp biên

- `answers` là object rỗng `{}` → Submit bình thường, raw score = 0.
- Câu trả lời là `null` hoặc `undefined` → `normalizeAnswer` trả về `""` → `isAnswerCorrect` trả `false` (unanswered = wrong).
- `answers` là `null`, `Array`, hoặc primitive → Controller trả `400 INVALID_PAYLOAD`.
- `timeSpent` âm hoặc không phải số → Controller trả `400 INVALID_PAYLOAD`.
- DB timeout khi INSERT `test_attempts` hoặc `attempt_answers` → ROLLBACK transaction, pass error tới `errorHandler.js`, trả về 500.
- Bài thi không có câu hỏi nào (`questions.length === 0`) → Service throw `400 Bad Request`.
- Bài thi có `skill` không phải `reading`/`listening` (writing/speaking) → `getBandScore` trả `0.0`, không throw error; `status` = `'submitted'` (chờ chấm tay).
- `correct_answers` là JSONB array → `isAnswerCorrect` so khớp với **bất kỳ** phần tử nào trong array (multiple accepted answers).

## 7. Quy tắc nghiệp vụ

- **BR-AG-001 [AS-BUILT]**: Chỉ học viên đã xác thực (`req.user.id`) mới có thể nộp bài; mọi attempt được gắn với `user_id` của người nộp — không thể nộp thay người khác.
- **BR-AG-002 [AS-BUILT]**: Câu trả lời PHẢI được chuẩn hóa (trim + lowercase + strip punctuation) trước khi so khớp — chênh lệch chữ hoa/thường hoặc khoảng trắng thừa không bị phạt.
- **BR-AG-003 [AS-BUILT]**: Nếu `correct_answers` (JSONB array) tồn tại, câu trả lời hợp lệ khi khớp với BẤT KỲ phần tử nào trong array sau normalize.
- **BR-AG-004 [AS-BUILT]**: Band Score IELTS Reading và Listening được tra cứu từ bảng chuẩn Cambridge — không tính theo tỉ lệ tuyến tính. Skill khác (writing/speaking) trả `bandScore = 0.0`.
- **BR-AG-005 [AS-BUILT]**: Bài thi có ít hơn 40 câu phải scale: `scaledRawScore = round((rawScore / totalQuestions) * 40)` trước khi tra bảng Band Score.
- **BR-AG-006 [AS-BUILT]**: Toàn bộ ghi DB (INSERT `test_attempts` + `attempt_answers`) PHẢI nằm trong một transaction duy nhất — nếu bất kỳ bước nào lỗi thì ROLLBACK toàn bộ.
- **BR-AG-007 [AS-BUILT]**: `correct_answer` KHÔNG được trả về trong response nộp bài (`POST /attempts`) — chỉ expose trong endpoint review chi tiết sau khi nộp.
- **BR-AG-008 [AS-BUILT]**: Bài thi không có câu hỏi (`questions.length === 0`) bị từ chối với `400 Bad Request` — không được tạo attempt rỗng.
- **BR-AG-009 [AS-BUILT]**: Mọi SQL query PHẢI dùng parameterized query (`$1, $2...`) — tuyệt đối không nối chuỗi SQL.

## 8. Yêu cầu chức năng

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

### 9. Yêu cầu phi chức năng

- **NFR-AG-001 [AS-BUILT]**: Mọi endpoint phải xác thực JWT và enforce `user_id` ownership — không có endpoint nào public.
- **NFR-AG-002 [AS-BUILT]**: Tất cả SQL query phải dùng parameterized query `$N` — không có SQL injection vector.
- **NFR-AG-003 [AS-BUILT]**: Response theo chuẩn AGENTS.md: `{ success, data, error, meta }` — không trả về stack trace trong production.
- **NFR-AG-004 [TARGET]**: API chấm 40 câu trả về kết quả `< 1000ms` (không tính latency mạng) tại staging load.
- **NFR-AG-005 [TARGET]**: Test coverage ≥ 80% cho `attempt.service.js` và `scoring.js` — bao gồm happy path, edge case normalize, bảng Band Score đầy đủ 0–40, và ít nhất 1 error case mỗi validator.
- **NFR-AG-006 [AS-BUILT]**: Log lỗi không được chứa giá trị câu trả lời của học viên hoặc đáp án đúng.

## 10. Thực thể chính

- **`test_attempts`**: Summary — `user_id`, `test_id`, `mode`, `status`, `raw_score`, `total_questions`, `band_score`, `time_spent`, `practice_mode`, `submitted_at`.
- **`attempt_answers`**: Per-question detail — `attempt_id`, `question_id`, `question_order`, `user_answer`, `is_correct`, `correct_answer`.
- **`questions`**: Read-only — lấy `correct_answer`, `correct_answers` (JSONB), `question_order` để chấm bài.
- **`mock_tests`**: Read-only — lấy `skill`, `title` để xác định thang Band Score.

## 11. Tiêu chí thành công

### Measurable Outcomes

- **SC-001**: API chấm điểm 40 câu trả về kết quả trong < 1000ms (không tính latency mạng).
- **SC-002**: 100% câu trả lời chỉ thừa khoảng trắng nhưng đúng từ vựng → được chấm ĐÚNG.
- **SC-003**: Band Score trả về khớp 100% với bảng IELTS Academic chuẩn Cambridge cho mọi raw score 0–40.
- **SC-004**: Không có SQL injection vector — mọi query dùng parameterized `$N`.

## 12. Giả định

- Database đã có bảng `questions` với cột `correct_answer`, `correct_answers` (JSONB) và `question_order` (từ `feat-content-builder`).
- JWT middleware đã cung cấp `req.user.id` tại mọi route protected.
- `errorHandler.js` middleware đã được setup và mount trong Express app.
- Bảng Band Score IELTS Academic cho Reading và Listening là cố định — không thay đổi theo đề thi.

## 13. Phụ thuộc

- **feat-content-builder**: Cung cấp bảng `questions` với cột `correct_answer`, `correct_answers` (JSONB), `question_order`.
- **feat-auth**: JWT middleware cung cấp `req.user.id` tại mọi protected route.
- **errorHandler.js**: Middleware xử lý lỗi tập trung đã được mount trong Express app.
- **PostgreSQL 16**: Hỗ trợ JSONB và transaction (`BEGIN/COMMIT/ROLLBACK`).
- **`backend/src/utils/scoring.js`**: Module tra cứu Band Score chuẩn Cambridge — đọc-only, không có side effect.

## 14. Câu hỏi mở

1. **NEEDS CLARIFICATION**: Khi học viên thi cùng một `test_id` nhiều lần (re-attempt), hệ thống có giới hạn số lần thi không? Có ghi đè attempt cũ hay lưu tất cả?
2. **NEEDS CLARIFICATION**: `timeSpent = 0` (học viên nộp ngay lập tức) có được phép không, hay cần validate minimum time?
3. **NEEDS CLARIFICATION**: Chính sách hoàn trả/tính phí cho attempt khi DB ROLLBACK do lỗi hạ tầng — hạn mức attempt có bị tính hay không?
