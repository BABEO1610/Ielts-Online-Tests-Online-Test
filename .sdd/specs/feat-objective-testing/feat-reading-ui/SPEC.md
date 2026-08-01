# Feature Specification: Giao diện Thi Reading (feat-reading-ui)

**Feature Branch**: `feat/reading-ui`

**Created**: 2026-07-27

**Status**: Draft

**Input**: Tách từ User Story 2 của `feat-objective-testing/SPEC.md` — Giao diện thi Reading với Split View, scroll độc lập, và hỗ trợ fill-in-blanks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Split View đọc bài và làm câu hỏi (Priority: P1)

Là một học viên, tôi muốn giao diện Reading chia đôi màn hình: bên trái là bài đọc (passage), bên phải là danh sách câu hỏi — hai bên cuộn hoàn toàn độc lập nhau.

**Why this priority**: Yêu cầu UX cốt lõi của IELTS Reading — không có Split View thì học viên phải cuộn lên xuống liên tục gây mất tập trung. Ngoài ra hỗ trợ Partial Practice để học viên chọn làm 1 vài Passage nhất định.

**Independent Test**: Render `ReadingTestPage` với mock passage và câu hỏi, cuộn pane trái → pane phải đứng yên và ngược lại.

**Acceptance Scenarios**:

1. **Given** màn hình thi Reading với passage dài, **When** học viên cuộn văn bản bên trái, **Then** pane câu hỏi bên phải KHÔNG cuộn theo.
2. **Given** học viên đang nhìn câu hỏi số 10, **When** cuộn bài đọc để tìm đoạn liên quan, **Then** câu hỏi vẫn hiển thị đúng vị trí ở pane phải.

---

### User Story 2 - Điền từ vào ô trống (fill-in-blanks) (Priority: P1)

Là một học viên, tôi muốn nhập câu trả lời văn bản vào các ô fill-in-blank và nội dung đã nhập phải được giữ lại khi tôi điều hướng qua lại giữa các câu hỏi.

**Why this priority**: Dạng câu hỏi fill-in-blank chiếm tỷ lệ lớn trong IELTS Reading — state phải bền vững trong session.

**Independent Test**: Nhập text vào câu fill-in-blank số 5, click sang câu 10, click lại câu 5 → text vẫn còn trong `<input>`.

**Acceptance Scenarios**:

1. **Given** học viên điền "migration" vào câu 5, **When** chuyển sang câu 8, **Then** quay lại câu 5 vẫn thấy "migration" trong ô input.
2. **Given** học viên điền xong 5 câu fill-in-blank, **When** bấm "Nộp bài", **Then** payload `answers` gửi lên backend chứa đủ 5 giá trị text.

---

### Edge Cases

- Màn hình tablet dọc (< 1024px): Stack vertical — passage trên, câu hỏi dưới (không side-by-side).
- Passage rất dài (> 1000 từ): Pane trái scroll mượt, không freeze UI.
- Submit khi có câu fill-in-blank rỗng → Submit bình thường, backend chấm sai cho câu đó.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST hiển thị layout Split View 2 cột với scroll độc lập (CSS `overflow-y: auto` trên mỗi pane).
- **FR-002**: Hệ thống MUST render passage HTML/text ở pane trái.
- **FR-003**: Hệ thống MUST hỗ trợ render và quản lý state cho đa dạng loại câu hỏi (MCQ, Multi-select, True/False/NG, Matching, Short Answer, Fill-in-blank) ở pane phải.
- **FR-004**: Hệ thống MUST hiển thị Bottom Navigation Bar để chuyển nhanh giữa các Passage đang làm (dựa trên `selectedPartIds`), và `ReviewModal` (mở từ TimerBar) cung cấp lưới tổng quan các câu có trạng thái. Khi click câu hỏi trong ReviewModal, hệ thống tự động switch sang đúng Passage chứa câu đó.
- **FR-005**: Hệ thống MUST tái sử dụng `ReviewModal`, `AutoSubmitModal` và `TimerBar` từ `feat-listening-ui`.
- **FR-006**: Hệ thống MUST gọi `submitAttempt(testId, { answers, timeSpent, practiceMode })` khi hết giờ hoặc học viên bấm "Nộp bài".
- **FR-007**: Hệ thống MUST xử lý hiển thị Loading Skeleton trong lúc gọi API lấy đề thi, và handle crash an toàn (catch-all) khi parse cấu trúc dữ liệu.
- **FR-008**: Hệ thống MUST render nội dung phụ của câu hỏi (blockContent) như hình ảnh, biểu đồ ở ngay phía trên câu đầu tiên của block tương ứng.

### Key Entities

- **`answers`**: Object local state `{ [questionId]: string | option | array }` — hỗ trợ tất cả các dạng câu hỏi.
- **Split View panes**: Hai div với `height: 100vh`, `overflow-y: auto` — CSS Grid 2 cột.
- **`ReviewModal` & `Bottom Nav Bar`** (shared): Điều hướng và Highlight câu đã điền / chưa điền.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cuộn pane trái không làm pane phải dịch chuyển (kiểm tra bằng scroll event isolation).
- **SC-002**: Fill-in-blank giữ đúng giá trị sau khi điều hướng qua lại 10 lần.
- **SC-003**: Layout Split View hiển thị đúng trên màn hình 1024px+ không bị overflow.
- **SC-004**: Payload submit chứa đúng và đủ tất cả câu đã điền (MCQ + fill-in-blank).

## Assumptions

- `ReviewModal.jsx`, `AutoSubmitModal.jsx` và `TimerBar.jsx` đã hoàn thành từ `feat-listening-ui`.
- API `GET /api/v1/tests/:id/take` trả về cả passage text và danh sách câu hỏi đa dạng loại.
- API `POST /api/v1/tests/:id/attempts` nhận đồng nhất payload `{ answers, timeSpent, practiceMode }`.
- Học viên dùng Desktop hoặc Tablet — mobile < 768px ngoài scope v1.
