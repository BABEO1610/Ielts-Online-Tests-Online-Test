---
description: "Task list for feat-listening-ui"
---

# Tasks: Giao diện Thi Listening (feat-listening-ui)

**Input**: `feat-objective-testing/SPEC.md` — User Story 1

**Prerequisites**: PLAN.md (required), SPEC.md (required)

## Format: `[ID] [P?] [US1] Description`

- **[P]**: Chạy song song (khác file, không phụ thuộc nhau)
- **[US1]**: Task thuộc User Story 1 — Giao diện Listening
- Include đường dẫn file cụ thể trong mô tả

## Path Conventions

- **Frontend**: `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/services/`
- **Backend**: N/A cho feature này — thuần Frontend
- Paths tuân theo cấu trúc trong PLAN.md

---

## Phase 1: Setup

- [x] T001 Tạo skeleton `frontend/src/pages/objective-testing/ListeningTestPage.jsx` + đăng ký route
- [x] T002 [P] Tạo skeleton `frontend/src/components/objective-testing/ReviewModal.jsx`
- [x] T003 [P] Tạo skeleton `frontend/src/components/objective-testing/TimerBar.jsx`
- [x] T004 [P] Xác nhận `frontend/src/services/attempt.service.js` có export `submitAttempt(testId, { answers, timeSpent, practiceMode })`

---

## Phase 2: User Story 1 — Giao diện Listening (P1) 🎯

**Goal**: Học viên nghe audio, chọn đáp án, nộp bài (manual hoặc auto khi hết giờ)

**Independent Test**: Render với mock data → chọn đáp án cập nhật state; TimerBar đếm đúng; submit gọi `attemptService.submitAttempt`

### Implementation

- [x] T005 [US1] Implement `TimerBar.jsx`: Dual mode (Simulation đếm ngược, Practice đếm tiến/chọn giờ), gọi callback `onTimeUp()`
- [x] T006 [US1] Implement `ReviewModal.jsx`: popup render lưới 40 câu hỏi, filter (answered/unanswered) và jump
- [x] T006b [US1] Implement Bottom Nav Bar chuyển đổi hiển thị giữa các Section/Part (hỗ trợ hiển thị 1 phần thông qua `selectedPartIds`)
- [x] T007 [US1] Setup state `answers` bằng `useState({})` trong `ListeningTestPage.jsx`
- [x] T008 [P] [US1] Nhúng Dual-mode Audio Player (Simulation: autoplay no-controls; Practice: controls)
- [x] T009 [US1] Render danh sách câu hỏi đa dạng (MCQ, FIB, Matching) qua `ListeningBlockRenderer.jsx`, liên kết selection/input với `answers` state (depends T007)
- [x] T010 [US1] Compose layout + Modal (AutoSubmitModal, ReviewModal)
- [x] T011 [US1] Gọi `submitAttempt(testId, { answers, timeSpent, practiceMode })` khi `onTimeUp` hoặc học viên bấm "Nộp bài"
- [x] T012 [US1] Xử lý response: redirect trang kết quả hoặc hiển thị toast lỗi

**Checkpoint**: ListeningTestPage hoạt động end-to-end với mock data

---

## Phase 3: Polish

- [x] T013 CSS layout Listening: audio player sticky top, câu hỏi scroll bên dưới
- [x] T014 Disable nút "Nộp bài" sau lần submit đầu (tránh double-submit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Không phụ thuộc — bắt đầu ngay
- **Phase 2 — Listening UI**: Phụ thuộc Phase 1 hoàn thành
- **Phase 3 — Polish**: Phụ thuộc Phase 2 hoàn thành

### User Story Dependencies

- **US1 (P1)**: Phụ thuộc `feat-auto-grading` (API submit) — có thể dùng mock khi dev song song
- `ReviewModal` và `TimerBar` (T002, T003) là prerequisite cho `feat-reading-ui`

### Within Each Phase

- T005 (`TimerBar`) và T006 (`ReviewModal`) có thể chạy song song
- T007 (state setup) trước T009 (render MCQ)
- T005, T006, T009 trước T010 (compose layout)
- T010 trước T011 (submit), T011 trước T012 (handle response)

### Parallel Opportunities

- T001–T004 Phase 1: tất cả chạy song song
- T005, T006: chạy song song
- T008 (Audio Player): chạy song song với T007

---

## Implementation Strategy

### MVP First (Listening UI Core)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Listening UI (T005–T012)
3. **STOP và VALIDATE**: Render với mock data — audio phát, chọn đáp án, submit hoạt động
4. Hàn gắn với `feat-auto-grading` API thật — integration test

### Incremental Delivery

1. Setup → Đư᨟c shared components (`TimerBar`, `ReviewModal`)
2. Implement state + MCQ render → kiểm tra chọn đáp án giữ đúng
3. Tích hợp `TimerBar` + submit → kiểm tra auto-submit khi hết giờ
4. Polish → merge

### Parallel Team Strategy

- **Developer A**: Làm `TimerBar` + `ReviewModal` (shared components)
- **Developer B**: Làm `ListeningTestPage` layout + state + MCQ render
- Merge và compose khi cả 2 component xong

---

## Notes

- ponytail: `useState` local đủ — không cần Zustand/Context
- Không auto-save draft (known limitation, ghi trong SPEC edge cases)
- Hỗ trợ làm bài từng phần riêng lẻ qua location state `selectedPartIds`
- Hiện tại dự án chưa có Unit Tests cho Frontend (Vitest). Các test case đều manual test trên trình duyệt.
