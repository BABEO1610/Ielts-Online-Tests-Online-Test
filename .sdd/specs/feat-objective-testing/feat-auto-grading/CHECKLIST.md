# Implementation Checklist: Engine Chấm điểm Tự động (feat-auto-grading)

**Purpose**: Kiểm tra toàn bộ các hạng mục trước khi merge feat-auto-grading
**Created**: 2026-07-27
**Feature**: [SPEC.md](./SPEC.md) | [PLAN.md](./PLAN.md) | [TASKS.md](./TASKS.md)

## normalizeAnswer

- [x] CHK001 `normalizeAnswer(" Apples ")` → `"apples"` (trim + lower)
- [x] CHK002 `normalizeAnswer("LONDON.")` → `"london"` (strip trailing punctuation)
- [x] CHK003 `normalizeAnswer(null)` → `""` (không crash)
- [x] CHK004 `normalizeAnswer(undefined)` → `""` (không crash)
- [x] CHK005 `normalizeAnswer("  ")` → `""` (chỉ khoảng trắng)
- [x] CHK006 `normalizeAnswer("correct")` → `"correct"` (không thay đổi đầu vào hợp lệ)
- [x] CHK006b `normalizeAnswer("hello  world")` → `"hello world"` (collapse internal spaces)

## isAnswerCorrect

- [x] CHK006c `isAnswerCorrect("", "apples", [])` → `false` (unanswered = wrong)
- [x] CHK006d `isAnswerCorrect(" Apples ", "apples", [])` → `true` (normalize cả 2 vế)
- [x] CHK006e `isAnswerCorrect("apple", null, ["apples", "apple"])` → `true` (JSONB array match)
- [x] CHK006f `isAnswerCorrect("wrong", "apples", ["apples"])` → `false`

## getBandScore (tại `backend/src/utils/scoring.js`)

- [x] CHK007 Reading: raw 39+ → Band 9.0
- [x] CHK008 Reading: raw 30–32 → Band 7.0
- [x] CHK009 Reading: raw 0 → Band 0.0 (không phải 1.0 — check thực tế `scoring.js`)
- [x] CHK010 Listening: raw 39+ → Band 9.0
- [x] CHK011 Listening và Reading: cùng raw score cho giá trị khác nhau — ví dụ raw 32: Listening ≥ 32 → 7.5, Reading ≥ 33 → 7.5 nên Reading 32 = 7.0 (threshold khác nhau theo `scoring.js`)
- [x] CHK012 Skill khác (`writing`, `speaking`) → trả `0.0` (KHÔNG throw error)

## Database

- [x] CHK013 Mọi query INSERT/SELECT dùng parameterized `$1, $2, ...` — KHÔNG nối chuỗi SQL
- [x] CHK014 INSERT `test_attempts` lưu đủ: `user_id`, `test_id`, `mode`, `status`, `raw_score`, `total_questions`, `band_score`, `time_spent`, `practice_mode`, `submitted_at`
- [x] CHK014b INSERT `attempt_answers` lưu đủ: `attempt_id`, `question_id`, `question_order`, `user_answer`, `is_correct`, `correct_answer`
- [x] CHK014c Cả 2 INSERT chạy trong **1 transaction** — ROLLBACK nếu bất kỳ bước nào lỗi
- [x] CHK015 SELECT `questions` dùng `WHERE test_id = $1` — không lấy toàn bộ bảng

## API Endpoint

- [x] CHK016 `POST /api/v1/tests/:id/attempts` trả về HTTP 201 với `{ success: true, data: { attemptId, status, rawScore, totalQuestions, bandScore, correctCount, incorrectCount, timeSpent, practiceMode, message }, meta: null, error: null }`
- [x] CHK017 `answers` là `null`, array, hoặc primitive → `400 INVALID_PAYLOAD`
- [x] CHK017b `timeSpent` âm hoặc không phải số → `400 INVALID_PAYLOAD`
- [x] CHK018 `testId` không tồn tại → `404 Not Found`
- [x] CHK018b Bài thi không có câu hỏi → `400 Bad Request`
- [x] CHK019 DB lỗi → `500 Internal Server Error` qua `errorHandler.js` (KHÔNG log stack trace ra response)
- [x] CHK020 Submit response KHÔNG chứa field `correct_answer` (chỉ có trong `GET /attempts/:id/detail`)

## Security

- [x] CHK021 Route `POST /api/v1/tests/:id/attempts` được bảo vệ bởi JWT `authenticate` middleware
- [x] CHK022 `user_id` lấy từ `req.user.id` (JWT) — KHÔNG từ request body
- [x] CHK023 Không có SQL injection vector (review tất cả query trong `attempt.service.js` và `scoring.js`)

## Tests (Chưa implement trong source code)

- [ ] CHK024 (BỎ QUA) Unit test `normalizeAnswer` — CHK001–CHK006b đều có test case tương ứng
- [ ] CHK025 (BỎ QUA) Unit test `getBandScore` — CHK007–CHK012 đều có test case tương ứng
- [ ] CHK026 (BỎ QUA) Tests chạy pass: `npm test` (Jest)

## Notes

- CHK020 là security requirement bắt buộc — phải pass trước khi merge vào main
- CHK013 là DB compliance requirement theo AGENTS.md — không được bypass
- CHK014c (transaction) là data integrity requirement — nếu `attempt_answers` INSERT lỗi phải rollback cả `test_attempts`
- Đã đánh dấu `[x]` các phần logic vì code đã hoàn thiện, phần test vẫn để `[ ]` vì chưa thấy file test tương ứng trong source.
