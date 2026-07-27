# Implementation Plan: Giao diện Thi Reading (feat-reading-ui)

**Branch**: `feat/reading-ui` | **Date**: 2026-07-27 | **Spec**: [SPEC.md](./SPEC.md)

**Input**: User Story 2 từ `feat-objective-testing/SPEC.md`

## Summary

Xây dựng giao diện làm bài thi Reading với Split View layout: pane trái hiển thị bài đọc (scroll độc lập), pane phải hiển thị câu hỏi đa dạng loại. Tái sử dụng `ReviewModal`, `AutoSubmitModal`, và `TimerBar` từ `feat-listening-ui`. State câu trả lời quản lý cục bộ bằng `useState`. Submit qua `POST /api/v1/tests/:id/attempts`. Hỗ trợ Partial Practice, chuẩn hóa loại câu hỏi (Data Normalization), render Loading Skeleton và nội dung phụ `blockContent` (hình ảnh, biểu đồ).

## Technical Context

**Language/Version**: React 18, Vite

**Primary Dependencies**: React (useState), CSS Grid/Flexbox

**Storage**: N/A — Frontend không ghi DB trực tiếp

**Testing**: Vitest (Frontend)

**Target Platform**: Web Browser (Desktop & Tablet)

**Performance Goals**: Cuộn 2 pane độc lập không gây re-render toàn trang; UI mượt với passage dài

**Constraints**: Pane bài đọc và pane câu hỏi cuộn hoàn toàn độc lập nhau; Hỗ trợ làm Partial Practice (chọn Passages) qua `selectedPartIds`.

**Scale/Scope**: Reading passage tới 1000 từ, 40 câu hỏi hỗn hợp đa dạng (MCQ, Multi-select, True/False, Matching, FIB)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **API format**: `POST /api/v1/tests/:id/attempts` — response `{ success, data, error, meta }` — Tuân thủ
- **Error handling**: Lỗi submit bắt tại service layer — Tuân thủ
- **No ORM**: Feature Frontend — N/A

## Project Structure

### Documentation

```text
specs/feat-objective-testing/feat-reading-ui/
├── PLAN.md   # File này
└── TASKS.md
```

### Source Code

```text
frontend/src/
├── pages/objective-testing/
│   └── ReadingTestPage.jsx        # Split View layout + state + submit
├── components/objective-testing/
│   ├── ReviewModal.jsx            # Shared (từ feat-listening-ui)
│   ├── AutoSubmitModal.jsx        # Shared (từ feat-listening-ui)
│   └── TimerBar.jsx               # Shared (từ feat-listening-ui)
└── services/
    ├── attempt.service.js         # submitAttempt(testId, { answers, timeSpent, practiceMode })
    └── test.service.js            # getTestById(id)
```

**Structure Decision**: CSS Grid 2 cột với `overflow-y: auto` riêng biệt cho mỗi pane. Không dùng thư viện split-pane ngoài — CSS thuần đủ dùng. Hàm `flattenTestData` đóng vai trò Parser chuẩn hoá (Normalize) mọi cấu trúc Type bất quy tắc từ Backend.

## Complexity Tracking

> Không có vi phạm Constitution.

| Vấn đề | Lý do cần thiết | Giải pháp đơn giản hơn đã bị loại |
|--------|-----------------|-------------------------------------|
| Split View 2 pane scroll độc lập | Chuẩn IELTS: đọc passage trong khi nhìn câu hỏi | Single scroll — UX kém, phải cuộn lên xuống liên tục |
