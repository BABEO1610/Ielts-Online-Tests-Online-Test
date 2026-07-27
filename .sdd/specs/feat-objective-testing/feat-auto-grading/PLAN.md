# Implementation Plan: Engine Chấm điểm Tự động (feat-auto-grading)

**Branch**: `feat/auto-grading` | **Date**: 2026-07-27 | **Spec**: [SPEC.md](./SPEC.md)

**Input**: User Story 3 từ `feat-objective-testing/SPEC.md`

## Summary

Xây dựng backend engine tự động chấm bài thi IELTS: so khớp đáp án với `normalizeAnswer` + `isAnswerCorrect` (trim, lowerCase, strip punctuation, JSONB array support), tính Band Score qua `getBandScore(skill, rawScore)` tại `utils/scoring.js` theo thang chuẩn IELTS Academic, lưu kết quả vào `test_attempts` + `attempt_answers` trong 1 transaction.

## Technical Context

**Language/Version**: Node.js 20, Express 5.x

**Primary Dependencies**: `pg` (PostgreSQL driver) — raw parameterized queries, no ORM

**Storage**: PostgreSQL 16 — bảng `test_attempts` (summary) + `attempt_answers` (per-question detail), JOIN với `questions` để lấy đáp án đúng

**Testing**: Jest (Backend) — unit test `normalizeAnswer`, `getBandScore`, integration test API endpoint

**Target Platform**: Linux server (Node.js)

**Performance Goals**: `POST /api/v1/tests/:id/attempts` phản hồi < 1000ms với payload 40 câu

**Constraints**: KHÔNG gửi đáp án đúng (`correct_answer`) xuống Frontend trước khi nộp bài

**Scale/Scope**: Hỗ trợ payload 40 câu / request; hàng ngàn request đồng thời

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **No ORM**: Dùng raw parameterized queries `$1, $2` với `pg` — Tuân thủ
- **API format**: Response `{ success, data, error, meta }` — Tuân thủ
- **Error handling**: Qua middleware `errorHandler.js`, không log stack trace ra response — Tuân thủ
- **HTTP status**: 400 thiếu field, 404 test không tồn tại, 500 DB error — Tuân thủ

## Project Structure

### Documentation

```text
specs/feat-objective-testing/feat-auto-grading/
├── PLAN.md   # File này
└── TASKS.md
```

### Source Code

```text
backend/src/
├── controllers/
│   └── attempt.controller.js      # Validate input, gọi service, format response
├── services/
│   └── attempt.service.js         # normalizeAnswer(), isAnswerCorrect(), submitAttempt()
├── utils/
│   └── scoring.js                 # getBandScore(skill, rawScore) — lookup tables Listening & Reading
└── routes/api/v1/
    ├── tests.js                   # POST /api/v1/tests/:id/attempts
    └── attempts.routes.js         # GET /api/v1/attempts, GET /api/v1/attempts/:attemptId, GET /api/v1/attempts/:attemptId/detail
```

**Structure Decision**: Logic chấm điểm (`normalizeAnswer`, `isAnswerCorrect`) trong `attempt.service.js`. Band Score lookup tách ra `utils/scoring.js` — dùng chung cho cả hệ thống (subjective grading cũng dùng). Controller chỉ validate input và format response. Transaction duy nhất INSERT cả `test_attempts` + `attempt_answers`.

## Complexity Tracking

| Vấn đề | Lý do cần thiết | Giải pháp đơn giản hơn đã bị loại |
|--------|-----------------|-------------------------------------|
| `normalizeAnswer` (trim + lower + strip punctuation) | Học viên gõ " Apples " thay vì "apples" — phải chấp nhận | `===` exact match — quá cứng nhắc, gây oan sai |
| Band Score lookup table | Thang IELTS Academic cố định (chuẩn Cambridge) | Tính linear — không chính xác theo chuẩn thực tế |
