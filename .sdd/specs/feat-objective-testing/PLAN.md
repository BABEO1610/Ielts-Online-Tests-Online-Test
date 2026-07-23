# Implementation Plan: Thi Trắc Nghiệm (feat-objective-testing)

**Branch**: `[feat-objective-testing]` | **Date**: 2026-07-24 | **Spec**: [SPEC.md](./SPEC.md)

**Input**: Feature specification from `/specs/feat-objective-testing/SPEC.md`

## Summary

Xây dựng trải nghiệm thi thử IELTS trọn vẹn từ lúc làm bài (Giao diện Listening/Reading), tới lúc tự động chấm bài (Auto-grading Engine), và tra cứu lại lịch sử (History Retrieval). Kiến trúc sử dụng React state cục bộ cho frontend và endpoint chấm điểm tập trung tại `attempt.service.js` ở backend.

## Technical Context

**Language/Version**: Node.js 20, React 18

**Primary Dependencies**: Express 5.x, pg (PostgreSQL driver)

**Storage**: PostgreSQL 16 (bảng `test_attempts`)

**Testing**: Jest (Backend), Vitest (Frontend) - *(Lưu ý: chưa viết unit test trong source code hiện tại)*

**Target Platform**: Web Browser (Desktop & Tablet)

**Project Type**: Web Application (Frontend + Backend API)

**Performance Goals**: API `/api/v1/tests/:id/attempts` phản hồi < 1000ms

**Constraints**: Không được gửi đáp án đúng xuống Frontend trước khi nộp bài

**Scale/Scope**: Hỗ trợ hàng ngàn bài thi đồng thời.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Quy tắc DB**: Không sử dụng ORM (Tuân thủ: Dùng raw queries với `pg` driver cho bảng test_attempts).
- **Quy tắc API**: Mọi response bắt buộc tuân thủ format `{ success, data, error, meta }` (Tuân thủ).
- **Quy tắc Lỗi**: Xử lý lỗi tập trung qua middleware (Tuân thủ: Controller sẽ pass error qua `next(error)`).

## Project Structure

### Documentation (this feature)

```text
specs/feat-objective-testing/
├── PLAN.md              # File này
├── SPEC.md              # Đặc tả tính năng
└── TASKS.md             # Danh sách công việc
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   └── attempt.controller.js     # Luồng nộp bài & lấy lịch sử
│   ├── services/
│   │   └── attempt.service.js        # Xử lý logic Auto-Grading & Band Score & Lịch sử
│   ├── routes/
│   │   └── api/v1/
│   │       ├── tests.js              # Định tuyến cho /tests/:id/attempts
│   │       └── attempts.routes.js    # Định tuyến cho /attempts
└── tests/
    └── unit/
        └── (Chưa có test cho attempt.service.js)

frontend/
├── src/
│   ├── pages/
│   │   └── objective-testing/
│   │       ├── ListeningTestPage.jsx
│   │       ├── ReadingTestPage.jsx
│   │       ├── TestHistoryPage.jsx
│   │       └── TestResultDetailPage.jsx
│   ├── components/
│   │   └── objective-testing/
│   │       ├── QuestionNavigation.jsx
│   │       └── TimerBar.jsx
│   └── services/
│       └── attempt.service.js
```

**Structure Decision**: Cấu trúc Monorepo phân tách rõ `frontend` và `backend`. Backend sử dụng `attempt` module (controller/service) chịu trách nhiệm toàn bộ cho cả việc ghi/chấm bài và đọc lịch sử. Frontend quản lý state hoàn toàn cục bộ (`useState`) thay vì sử dụng global store, tập trung logic UI tại `pages/objective-testing`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Vấn đề | Lý do cần thiết | Giải pháp thay thế đơn giản hơn đã bị loại |
|-----------|------------|-------------------------------------|
| Auto-grading Regex/Trim | Học viên thi IELTS có thể gõ " Apples " thay vì "apples". | `===` exact match. Bị loại vì quá cứng nhắc, gây khó chịu cho trải nghiệm luyện thi. |
