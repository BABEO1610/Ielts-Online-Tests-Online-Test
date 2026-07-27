# Implementation Plan: Lịch sử & Tra cứu Kết quả (feat-attempt-history)

**Branch**: `feat/attempt-history` | **Date**: 2026-07-27 | **Spec**: [SPEC.md](./SPEC.md)

**Input**: User Story 4 từ `feat-objective-testing/SPEC.md`

## Summary

Xây dựng luồng xem lại kết quả sau thi: (1) Backend cung cấp 3 API — danh sách lượt thi (merge tự luận và trắc nghiệm), tổng quan kết quả 1 lần thi, và chi tiết câu đúng/sai; (2) Frontend hiển thị trang lịch sử (`TestHistoryPage`) và trang review chi tiết (`TestResultDetailPage`) với giao diện Accordion. Đọc dữ liệu từ bảng `test_attempts` và thông qua `SubmissionService`.

## Technical Context

**Language/Version**: Node.js 20 (Backend), React 18 (Frontend), Vite

**Primary Dependencies**: `pg` (Backend), React (Frontend)

**Storage**: PostgreSQL 16 — bảng `test_attempts` (read-only trong feature này)

**Testing**: Jest (Backend API), Vitest (Frontend render)

**Target Platform**: Web Browser (Desktop & Tablet)

**Performance Goals**: Danh sách lịch sử load < 500ms; trang chi tiết load < 800ms

**Constraints**: Chỉ đọc `test_attempts` của đúng `user_id` từ JWT — không lộ attempt của người khác

**Scale/Scope**: Mỗi user tối đa vài trăm lượt thi; mỗi lượt tối đa 40 câu

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **No ORM**: Raw parameterized queries `$1, $2` với `pg` — Tuân thủ
- **API format**: `{ success, data, error, meta }` — Tuân thủ
- **Auth**: Query phải filter theo `user_id` lấy từ JWT middleware — Tuân thủ
- **Error handling**: Qua `errorHandler.js` — Tuân thủ

## Project Structure

### Documentation

```text
specs/feat-objective-testing/feat-attempt-history/
├── PLAN.md   # File này
└── TASKS.md
```

### Source Code

```text
backend/src/
├── services/
│   └── attempt.service.js         # Các hàm: getAttemptHistory(), getAttemptById(), getAttemptDetail()
├── controllers/
│   └── attempt.controller.js      # Các hàm: getHistory, getAttempt, getAttemptDetail
└── routes/api/v1/
    └── attempts.routes.js         # GET /api/v1/attempts, GET /api/v1/attempts/:attemptId, GET /api/v1/attempts/:attemptId/detail

frontend/src/
├── pages/objective-testing/
│   ├── TestHistoryPage.jsx        # Danh sách lượt thi (cả Trắc nghiệm & Tự luận)
│   └── TestResultDetailPage.jsx   # Chi tiết câu đúng/sai (Accordion view)
└── services/
    └── attempt.service.js         # Các hàm: getAttemptHistory(), getAttempt(id), getAttemptDetail(id)
```

**Structure Decision**: Mở rộng `attempt.service.js` hiện có. 3 route mới trong `attempts.routes.js`. `TestHistoryPage` gọi endpoint hợp nhất để hiển thị cả 2 dạng bài thi.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Full-stack feature (Backend + Frontend) | Lịch sử cần cả API lẫn UI — không thể chỉ làm 1 phần | Split thành 2 feature riêng — over-engineering cho scope nhỏ này |
| JOIN query `test_attempts` + `questions` | Cần `correct_answer` + `explanation` trong cùng 1 response | 2 queries riêng rồi merge JS — thêm round-trip không cần thiết |
