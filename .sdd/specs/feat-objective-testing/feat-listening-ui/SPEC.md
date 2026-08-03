# Đặc tả tính năng: Giao diện Thi Listening (feat-listening-ui)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Completed
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cung cấp trang thi Listening cho học viên với hai chế độ: **Simulation** (thi thật — audio tự phát 1 lần, không cho pause/tua, đếm ngược tự nộp bài) và **Practice** (luyện tập — đủ controls, có nút tua lùi 10s, đếm tiến). Học viên có thể chọn luyện từng Part riêng biệt (Partial Practice), điều hướng nhanh qua Bottom Navigation và ReviewModal, và nghỉn đáp án được lưu trong local state — không gọi API trung gian. Toàn bộ được submit một lần duy nhất khi hết giờ hoặc học viên bấm nộp.

**Input**: Tách từ User Story 1 của `feat-objective-testing/SPEC.md`.

## 2. Phạm vi

- Dual-mode Audio Player: Simulation (autoplay, khóa controls) và Practice (có controls, tua lùi 10s).
- TimerBar: đếm ngược (Simulation/Custom Limit) và đếm tiến (Practice cơ bản).
- AutoSubmitModal: hiện thị 2 giây rồi tự submit khi hết giờ.
- Bottom Navigation Bar: chuyển nhanh giữa các Part đang làm (dựa trên `selectedPartIds`).
- ReviewModal: lưới tổng quan trạng thái câu hỏi (chưa làm / đã làm), filter, jump-to-question.
- Hỗ trợ đa dạng loại câu hỏi: MCQ, Fill-in-blank, Matching, Multi-choice.
- Partial Practice: học viên chọn tập hợp Part muốn làm qua `selectedPartIds`.
- Disable nút Nộp bài sau khi bấm lần đầu (đề phòng double-submit).

## 3. Ngoài phạm vi

- Backend chấm điểm và lưu kết quả (thuộc `feat-auto-grading`).
- Trang xem lại lịch sử và kết quả (thuộc `feat-attempt-history`).
- Auto-save draft vào localStorage — không có trong v1.
- Tối ưu Mobile screen nhỏ (< 768px) — ngoài scope v1.
- Real-time sync đáp án qua WebSocket.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Truy cập trang thi, chọn chế độ, làm bài, nghỉn đáp án và nộp bài. |
| Khách / chưa xác thực | Không được phép — trang thi yêu cầu được đăng nhập trước khi vào. |
| Giảng viên / Admin | Không tương tác trực tiếp với giao diện này trong luồng học viên. |


## 5. Câu chuyện người dùng và kiểm thử độc lập

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

## 6. Trường hợp biên

- Học viên nhấn "Nộp bài" khi chưa làm câu nào → Submit bình thường với `answers = {}`, backend tính 0 điểm.
- Mất kết nối mạng khi auto-submit hết giờ → Hiển thị toast lỗi, không redirect.
- Học viên refresh trang giữa chừng → Mất toàn bộ draft (known limitation — không có auto-save).

## 7. Quy tắc nghiệp vụ

- **BR-LIS-001 [AS-BUILT]**: Chế độ Simulation: audio PHẢI tự phát (autoplay), không hiển thị controls, và force-play lại ngay khi bị pause (revert `currentTime` về `lastTime`).
- **BR-LIS-002 [AS-BUILT]**: Chế độ Practice: không autoplay, hiển thị controls đầy đủ (Play/Pause, thanh Seek, nút tua lùi 10s).
- **BR-LIS-003 [AS-BUILT]**: Nút Nộp bài PHẢI bị disable ngay sau lần bấm đầu tiên — không cho phép double-submit.
- **BR-LIS-004 [AS-BUILT]**: Khi đếm ngược về 0, phải hiển AutoSubmitModal ít nhất 2 giây trước khi gọi API submit — không submit im lặng.
- **BR-LIS-005 [AS-BUILT]**: Đáp án chỉ được lưu trong local state (in-memory) — không gọi API trung gian mỗi lần chọn đáp án.
- **BR-LIS-006 [AS-BUILT]**: Nếu mất kết nối khi auto-submit, hiển thị toast lỗi — không redirect, không mất dữ liệu.
- **BR-LIS-007 [AS-BUILT]**: Refresh trang giữa chừng mất toàn bộ draft (known limitation — không có auto-save v1).
- **BR-LIS-008 [AS-BUILT]**: `selectedPartIds` được truyền qua `useLocation().state` — không được fetch lại từ API.

## 8. Yêu cầu chức năng

### Functional Requirements

- **FR-001**: Hệ thống MUST implement Dual-mode Audio Player:
  - `practiceMode = false` (Simulation): Tự động phát (autoplay), KHÔNG hiển thị controls, chặn pause/seek bằng cách revert `currentTime` về `lastTime`.
  - `practiceMode = true` (Practice): Không autoplay, hiển thị controls (Play/Pause, thanh trượt Seek, nút tua lùi 10s).
- **FR-002**: Hệ thống MUST hiển thị `TimerBar` hoạt động theo chế độ: đếm ngược (Simulation/Custom Limit) hoặc đếm tiến vô tận (Practice mode cơ bản).
- **FR-003**: Khi đếm ngược về 0, hệ thống MUST hiển thị `AutoSubmitModal` trong 2 giây rồi tự động gọi `submitAttempt(testId, { answers, timeSpent, practiceMode })`.
- **FR-004**: Hệ thống MUST hiển thị Bottom Navigation Bar để chuyển nhanh giữa các Phần (Parts) đang làm (dựa trên `selectedPartIds`), và `ReviewModal` (mở từ TimerBar) cung cấp lưới tổng quan các câu có trạng thái (chưa làm / đã làm) cùng tính năng filter/jump.
- **FR-005**: Hệ thống MUST hỗ trợ render và lưu đáp án đa dạng loại câu hỏi (MCQ, Fill-in-blank, Matching, Multi-choice) vào local state — không gọi API trung gian.
- **FR-006**: Nút "Nộp bài" MUST bị disable sau lần submit đầu tiên.

## 9. Yêu cầu phi chức năng

- **NFR-LIS-001 [AS-BUILT]**: Chọn đáp án và điều hướng giữa 40 câu không gây lag (< 16ms render time).
- **NFR-LIS-002 [AS-BUILT]**: Audio Player phản hồi Play/Pause trong < 200ms.
- **NFR-LIS-003 [AS-BUILT]**: `TimerBar` đếm ngược chính xác ±1 giây so với thực tế.
- **NFR-LIS-004 [TARGET]**: Submit thành công trong < 1000ms (network bình thường).
- **NFR-LIS-005 [AS-BUILT]**: Trang thi phải hoạt động ổn định trên Desktop và Tablet (>= 768px) — không tối ưu mobile < 768px.

## 10. Thực thể chính

- **`answers`**: Object local state `{ [questionId]: selectedOption }` — quản lý toàn bộ đáp án trong session thi.
- **`TimerBar`**: Component đếm ngược, hiển thị mode, và nút mở Review.
- **`ReviewModal`**: Popup hiển thị lưới trạng thái tất cả câu hỏi và filters.
- **Bottom Navigation**: Thanh điều hướng cố định dưới màn hình để chuyển giữa các Section/Part.

## 11. Tiêu chí thành công

### Measurable Outcomes

- **SC-001**: Chọn đáp án và điều hướng giữa 40 câu không gây lag (< 16ms render time).
- **SC-002**: Audio Player phản hồi Play/Pause trong < 200ms.
- **SC-003**: `TimerBar` đếm ngược chính xác ±1 giây so với thực tế.
- **SC-004**: Submit thành công trong < 1000ms (network bình thường).

## 12. Giả định

- API `GET /api/v1/tests/:id` đã trả về đầy đủ câu hỏi, options, và URL audio.
- API `POST /api/v1/tests/:id/attempts` đã hoạt động (do `feat-auto-grading` cung cấp).
- Học viên dùng Desktop hoặc Tablet — không tối ưu cho mobile screen nhỏ.
- Component nhận cấu hình thông qua `useLocation().state`: `practiceMode`, `customTimeLimit`, `selectedPartIds`.
- Không có yêu cầu auto-save draft vào localStorage trong v1 này.

## 13. Phụ thuộc

- **`feat-auto-grading`**: Cung cấp `POST /api/v1/tests/:id/attempts` — endpoint submit bài.
- **`GET /api/v1/tests/:id`**: API lấy đề thi trả về câu hỏi, options, và URL audio.
- **`useLocation().state`**: React Router truyền `practiceMode`, `customTimeLimit`, `selectedPartIds` vào component.
- **`ReviewModal.jsx`, `AutoSubmitModal.jsx`, `TimerBar.jsx`**: Các shared component được xây từ feature này và tái sử dụng bởi `feat-reading-ui`.

## 14. Câu hỏi mở

1. **NEEDS CLARIFICATION**: Khi audio Simulation kết thúc (phát xong) nhưng học viên vẫn chưa làm xong — audio có loop lại hay dừng hẳn?
2. **NEEDS CLARIFICATION**: `customTimeLimit = 0` (Practice không giới hạn) hiển `TimerBar` đếm tiến hay ẩn hoàn toàn?
3. **NEEDS CLARIFICATION**: Khi học viên chọn `selectedPartIds` rỗng (không chọn Part nào), hệ thống xử lý thế nào — chặn trước tại trang chọn hay hiển thị lỗi trong trang thi?
