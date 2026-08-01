# Implementation Plan: Giao diện Thi Listening (feat-listening-ui)

**Branch**: `feat/listening-ui` | **Date**: 2026-07-27 | **Spec**: [SPEC.md](./SPEC.md)

**Input**: User Story 1 từ `feat-objective-testing/SPEC.md`

## Summary

Xây dựng giao diện làm bài thi Listening: Audio Player Dual-mode, đếm ngược thời gian (`TimerBar`), thanh Bottom Navigation chuyển Phần, popup `ReviewModal` xem tổng quan 40 câu, tự động submit khi hết giờ (có qua `AutoSubmitModal`) bằng `POST /api/v1/tests/:id/attempts`. State câu trả lời quản lý cục bộ bằng `useState`. Hỗ trợ làm Partial Practice (chọn 1 vài parts).

## Technical Context

**Language/Version**: React 18, Vite

**Primary Dependencies**: React (useState, useRef), HTML5 Audio API

**Storage**: N/A — Frontend không ghi DB trực tiếp

**Testing**: Vitest (Frontend)

**Target Platform**: Web Browser (Desktop & Tablet)

**Performance Goals**: UI không lag khi điều hướng 40 câu hỏi

**Constraints**: Không lấy đáp án đúng từ API trước khi nộp bài; Hỗ trợ dual-mode cho Audio và Timer (Simulation/Practice); Hỗ trợ Partial Practice (lọc Parts dựa vào `selectedPartIds`).

**Scale/Scope**: Bài thi Listening tới 40 câu, mỗi phần 1 file audio

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **API format**: Gọi `POST /api/v1/tests/:id/attempts` — response `{ success, data, error, meta }` — Tuân thủ
- **Error handling**: Lỗi API submit bắt tại `attempt.service.js`, hiển thị thông báo user — Tuân thủ
- **No ORM**: Feature này là Frontend — N/A

## Project Structure

### Documentation

```text
specs/feat-objective-testing/feat-listening-ui/
├── PLAN.md   # File này
└── TASKS.md
```

### Source Code

```text
frontend/src/
├── pages/objective-testing/
│   └── ListeningTestPage.jsx      # Trang chính: layout + state + submit
├── components/objective-testing/
│   ├── ReviewModal.jsx            # Shared — popup review 40 câu
│   ├── AutoSubmitModal.jsx        # Shared — báo hết giờ
│   └── TimerBar.jsx               # Shared — tái dùng với feat-reading-ui
├── components/tutor/listening/
│   └── ListeningBlockRenderer.jsx # Render nội dung các dạng câu hỏi Listening (MCQ, Fill-in-blank...)
└── services/
    └── attempt.service.js         # submitAttempt(testId, { answers, timeSpent, practiceMode })
```

**Structure Decision**: Thuần Frontend. `ReviewModal`, `AutoSubmitModal`, và `TimerBar` là shared components dùng chung với `feat-reading-ui`. Việc render câu hỏi thực tế được tái sử dụng qua `ListeningBlockRenderer` (của module tutor). Logic gọi API tách ra `attempt.service.js`.

## Complexity Tracking

| Vấn đề | Lý do cần thiết | Giải pháp đơn giản hơn đã bị loại |
|--------|-----------------|-------------------------------------|
| Audio manual control | Chuẩn IELTS: học viên tự kiểm soát | `autoplay` — không phù hợp UX thi cử |
