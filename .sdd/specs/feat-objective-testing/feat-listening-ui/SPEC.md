# Feature Specification: Giao diện Thi Listening (feat-listening-ui)

**Feature Branch**: `feat/listening-ui`

**Created**: 2026-07-27

**Status**: Completed

**Input**: Tách từ User Story 1 của `feat-objective-testing/SPEC.md` — Giao diện thi Listening hỗ trợ 2 chế độ (Practice & Simulation) với Audio Player thông minh, đếm giờ, và auto-submit.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nghe audio và chọn đáp án (Priority: P1)

Là một học viên, tôi muốn trải nghiệm 2 chế độ thi Listening:
- **Simulation (Thi thật)**: Audio tự động phát 1 lần duy nhất, không có nút điều khiển (không tua, không pause), hệ thống chặn mọi thao tác seek.
- **Practice (Luyện tập)**: Có đầy đủ controls (Play/Pause, thanh cuộn Seek, nút tua ngược 10s) để tiện học tập.

**Why this priority**: Luồng cốt lõi của trải nghiệm thi Listening — không có audio thì không thi được.

**Independent Test**: Render `ListeningTestPage` với mock test data, kiểm tra audio phát đúng khi nhấn Play, và state câu trả lời cập nhật đúng khi chọn đáp án MCQ.

**Acceptance Scenarios**:

1. **Given** học viên mở trang thi Simulation, **When** trang load xong, **Then** audio tự phát (autoplay), không hiện controls, và nếu học viên cố gắng pause (qua devtools) hệ thống tự động force play lại.
2. **Given** học viên mở trang Practice, **When** trang load xong, **Then** audio không autoplay, có hiện controls, cho phép tua ngược 10s bằng nút bấm chuyên dụng.
3. **Given** học viên đang làm bài, **When** chọn đáp án (MCQ) hoặc gõ text (FIB), **Then** đáp án được lưu vào local state và `ReviewModal` cùng Bottom Navbar cập nhật trạng thái "đã làm".

---

### User Story 2 - Đếm giờ và tự động nộp bài (Priority: P1)

Là một học viên, tôi muốn hệ thống quản lý thời gian linh hoạt: đếm ngược (đối với Simulation/Custom Limit) tự động nộp bài khi hết giờ, hoặc đếm tiến (đối với Practice không giới hạn) để theo dõi thời gian làm bài. Ngoài ra tôi muốn có thể luyện tập từng phần riêng biệt (VD: chỉ làm Part 1 và Part 2).

**Why this priority**: Bắt buộc để đảm bảo tính công bằng của bài thi — hệ thống tự submit đúng thời điểm.

**Independent Test**: Mock `timeLimit = 5` giây, kiểm tra sau 5 giây `TimerBar` gọi `onTimeUp()` và `submitAttempt` được invoke.

**Acceptance Scenarios**:

1. **Given** thi Simulation thời gian còn lại là `00:00`, **When** TimerBar về 0, **Then** hệ thống hiện `AutoSubmitModal` báo hết giờ và gọi API submit sau 2 giây.
2. **Given** học viên muốn nộp sớm, **When** nhấn nút "Nộp bài", **Then** hệ thống gọi submit ngay lập tức và disable nút để tránh double-submit.

---

### Edge Cases

- Học viên nhấn "Nộp bài" khi chưa làm câu nào → Submit bình thường với `answers = {}`, backend tính 0 điểm.
- Mất kết nối mạng khi auto-submit hết giờ → Hiển thị toast lỗi, không redirect.
- Học viên refresh trang giữa chừng → Mất toàn bộ draft (known limitation — không có auto-save).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST implement Dual-mode Audio Player:
  - `practiceMode = false` (Simulation): Tự động phát (autoplay), KHÔNG hiển thị controls, chặn pause/seek bằng cách revert `currentTime` về `lastTime`.
  - `practiceMode = true` (Practice): Không autoplay, hiển thị controls (Play/Pause, thanh trượt Seek, nút tua lùi 10s).
- **FR-002**: Hệ thống MUST hiển thị `TimerBar` hoạt động theo chế độ: đếm ngược (Simulation/Custom Limit) hoặc đếm tiến vô tận (Practice mode cơ bản).
- **FR-003**: Khi đếm ngược về 0, hệ thống MUST hiển thị `AutoSubmitModal` trong 2 giây rồi tự động gọi `submitAttempt(testId, { answers, timeSpent, practiceMode })`.
- **FR-004**: Hệ thống MUST hiển thị Bottom Navigation Bar để chuyển nhanh giữa các Phần (Parts) đang làm (dựa trên `selectedPartIds`), và `ReviewModal` (mở từ TimerBar) cung cấp lưới tổng quan các câu có trạng thái (chưa làm / đã làm) cùng tính năng filter/jump.
- **FR-005**: Hệ thống MUST hỗ trợ render và lưu đáp án đa dạng loại câu hỏi (MCQ, Fill-in-blank, Matching, Multi-choice) vào local state — không gọi API trung gian.
- **FR-006**: Nút "Nộp bài" MUST bị disable sau lần submit đầu tiên.

### Key Entities

- **`answers`**: Object local state `{ [questionId]: selectedOption }` — quản lý toàn bộ đáp án trong session thi.
- **`TimerBar`**: Component đếm ngược, hiển thị mode, và nút mở Review.
- **`ReviewModal`**: Popup hiển thị lưới trạng thái tất cả câu hỏi và filters.
- **Bottom Navigation**: Thanh điều hướng cố định dưới màn hình để chuyển giữa các Section/Part.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chọn đáp án và điều hướng giữa 40 câu không gây lag (< 16ms render time).
- **SC-002**: Audio Player phản hồi Play/Pause trong < 200ms.
- **SC-003**: `TimerBar` đếm ngược chính xác ±1 giây so với thực tế.
- **SC-004**: Submit thành công trong < 1000ms (network bình thường).

## Assumptions

- API `GET /api/v1/tests/:id` đã trả về đầy đủ câu hỏi, options, và URL audio.
- API `POST /api/v1/tests/:id/attempts` đã hoạt động (do `feat-auto-grading` cung cấp).
- Học viên dùng Desktop hoặc Tablet — không tối ưu cho mobile screen nhỏ.
- Component nhận cấu hình thông qua `useLocation().state`: `practiceMode`, `customTimeLimit`, `selectedPartIds`.
- Không có yêu cầu auto-save draft vào localStorage trong v1 này.
