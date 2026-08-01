---
description: "Task list for feat-reading-ui"
---

# Tasks: Giao diện Thi Reading (feat-reading-ui)

**Input**: `feat-objective-testing/SPEC.md` — User Story 2

**Prerequisites**: PLAN.md (required), SPEC.md (required), `feat-listening-ui` hoàn thành (shared components)

## Format: `[ID] [P?] [US2] Description`

- **[P]**: Chạy song song (khác file, không phụ thuộc nhau)
- **[US2]**: Task thuộc User Story 2 — Giao diện Reading
- Include đường dẫn file cụ thể trong mô tả

## Path Conventions

- **Frontend**: `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/services/`
- **Backend**: N/A cho feature này — thuần Frontend
- Paths tuân theo cấu trúc trong PLAN.md

---

## Phase 1: Setup

- [x] T001 Tạo skeleton `frontend/src/pages/objective-testing/ReadingTestPage.jsx` + đăng ký route
- [x] T002 Xác nhận `ReviewModal.jsx`, `AutoSubmitModal.jsx` và `TimerBar.jsx` đã sẵn sàng tái dùng (từ feat-listening-ui)

---

## Phase 2: User Story 2 — Giao diện Reading (P1) 🎯

**Goal**: Split View layout với 2 pane cuộn độc lập; fill-in-blanks giữ nội dung khi cuộn

**Independent Test**: Cuộn pane trái → pane phải đứng yên; nhập text vào fill-in-blank → chuyển câu → text vẫn còn trong state

### Implementation

- [x] T003 [US2] Implement CSS Split View: 2 cột `display: grid`, mỗi cột `overflow-y: auto`, `height: 100vh`
- [x] T004 [US2] Setup state `answers` bằng `useState({})` trong `ReadingTestPage.jsx`
- [x] T005 [US2] Render pane trái: bài đọc (passage HTML/text, scroll độc lập)
- [x] T005b [US2] Implement data normalizer (`flattenTestData`) để chuẩn hoá type câu hỏi từ Backend
- [x] T006 [US2] Render pane phải: danh sách câu hỏi đa dạng (MCQ, Matching, T/F/NG...) liên kết với `answers` state (depends T004)
- [x] T006c [US2] Render nội dung phụ `blockContent` (hình ảnh, biểu đồ) phía trên câu hỏi đầu tiên của block
- [x] T007 [US2] Render câu hỏi fill-in-blanks: `<input>` text liên kết với `answers` state, giữ giá trị khi scroll (depends T004)
- [x] T008 [US2] Nhúng `TimerBar` + `ReviewModal` + Bottom Nav Bar vào layout (tái dùng từ feat-listening-ui, hỗ trợ Partial Practice qua `selectedPartIds`)
- [x] T009 [US2] Gọi `submitAttempt(testId, { answers, timeSpent, practiceMode })` khi `onTimeUp` hoặc bấm "Nộp bài"
- [x] T010 [US2] Xử lý response: redirect trang kết quả hoặc toast lỗi

**Checkpoint**: ReadingTestPage hoạt động — split view đúng, fill-in-blank giữ state, submit thành công

---

## Phase 3: Polish

- [x] T011 Responsive: tablet mode — stack vertical (passage trên, câu hỏi dưới) thay vì side-by-side
- [x] T012 Disable nút "Nộp bài" sau lần submit đầu

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Không phụ thuộc — bắt đầu ngay
- **Phase 2 — Reading UI**: Phụ thuộc Phase 1 hoàn thành
- **Phase 3 — Polish**: Phụ thuộc Phase 2 hoàn thành

### User Story Dependencies

- **US2 (P1)**: Phụ thuộc `feat-listening-ui` hoàn thành (để có `ReviewModal`, `AutoSubmitModal`, `TimerBar`)
- Phụ thuộc `feat-auto-grading` (API submit) — có thể dùng mock khi dev

### Within Each Phase

- T003 (CSS Split View) và T004 (state setup) nên làm trước
- T004 trước T006 (MCQ) và T007 (fill-in-blank)
- T003, T005, T006, T007 trước T008 (compose layout)
- T008 trước T009 (submit), T009 trước T010 (handle response)

### Parallel Opportunities

- T001, T002 Phase 1: chạy song song
- T006 (MCQ render) và T007 (fill-in-blank render): chạy song song (depends cùng T004)
- T005 (pane trái): chạy song song với T006+T007

---

## Implementation Strategy

### MVP First (Reading Split View)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Reading UI (T003–T010)
3. **STOP và VALIDATE**: Kiểm tra cuộn 2 pane độc lập; fill-in-blank giữ state; submit thành công
4. Integration test với `feat-auto-grading` API thật

### Incremental Delivery

1. Setup → route sẵn sàng
2. CSS Split View → kiểm tra scroll độc lập
3. Render MCQ + fill-in-blank với state → kiểm tra data persistence
4. Compose `TimerBar` + `ReviewModal` + Bottom Nav Bar + submit → kiểm tra flow đầy đủ
5. Polish → merge

### Parallel Team Strategy

- **Developer A**: CSS Split View + pane trái (passage render)
- **Developer B**: State management + MCQ + fill-in-blank
- Merge và compose `TimerBar`/`ReviewModal` khi cả 2 xong

---

## Notes

- ponytail: CSS Grid thuần + `overflow-y: auto` đủ làm Split View — không cần thư viện ngoài
- Fill-in-blanks dùng controlled `<input>` liên kết trực tiếp với `answers` state
- Hiện tại dự án chưa có Unit Tests cho Frontend (Vitest). Các test case đều manual test trên trình duyệt.
