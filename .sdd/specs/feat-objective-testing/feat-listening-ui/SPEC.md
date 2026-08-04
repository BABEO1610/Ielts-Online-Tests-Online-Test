# Đặc tả tính năng: Giao diện Thi Listening (feat-listening-ui)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Completed
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

Hệ thống hiện tại chưa có giao diện thi Listening chuẩn IELTS. Học viên muốn thi Simulation (chỉ nghe 1 lần) hoặc Practice (có tua lại, chỉnh tốc độ), tự động tính giờ và nộp bài.
Tính năng cung cấp trải nghiệm làm bài Listening thực tế với Audio Player tùy chỉnh, bộ đếm giờ, Auto-submit, và hiển thị Navigation Grid tổng quan.

## 2. Phạm vi

- Dual-mode Audio Player (Simulation vs Practice).
- Đồng hồ đếm giờ và tự động nộp bài khi hết thời gian.
- Navigation Grid hiển thị trạng thái các câu hỏi và điều hướng.
- Hỗ trợ các dạng câu hỏi đặc thù: MCQ, Form Completion, Matching, Map Labelling.
- Bottom Navigation Bar và màn hình sẵn sàng "Click to Start".

## 3. Ngoài phạm vi

- Tính năng tự động lưu nháp (Auto-save) sau mỗi X phút ở MVP.
- Giao diện bài thi cho Mobile màn hình quá nhỏ.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên | Chọn chế độ thi, làm bài, tương tác với Audio Player (trong giới hạn chế độ), xem Navigation Grid, nộp bài. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Nghe audio và chọn đáp án (Ưu tiên: P1)

Với tư cách học viên, tôi muốn trải nghiệm 2 chế độ thi Listening: Simulation (tự phát 1 lần, không control) và Practice (có full control, tua 10s, speed).

**Kiểm thử độc lập**: Render trang thi, kiểm tra audio autoplay ở mode Simulation, hoặc hiển thị controls ở mode Practice. Chọn đáp án và kiểm tra state lưu đúng.

**Kịch bản chấp nhận**:

1. **Cho trước** màn hình thi Simulation, **Khi** học viên ấn Start, **Thì** audio tự phát, không hiện controls, cố pause bằng bàn phím sẽ bị ép play tiếp.
2. **Cho trước** trang Practice, **Khi** load xong, **Thì** hiển thị controls, cho tua 10s và chỉnh tốc độ.

### Câu chuyện 2 — Đếm giờ và nộp bài tự động (Ưu tiên: P1)

Với tư cách học viên, tôi muốn có đếm ngược, hết giờ tự nộp. Có bảng Navigation để theo dõi.

**Kiểm thử độc lập**: Mock time limit 5s, kiểm tra sau 5s hiện modal auto-submit.

**Kịch bản chấp nhận**:

1. **Cho trước** đếm ngược về 00:00, **Khi** TimerBar về 0, **Thì** hiện AutoSubmitModal và gọi API sau 2s.
2. **Cho trước** nhấn nút "Nộp bài", **Khi** đang loading, **Thì** disable nút tránh click nhiều lần.

## 6. Trường hợp biên

- Nhấn nộp bài khi chưa làm câu nào → Gửi `{}` và 0 điểm.
- Rớt mạng khi submit → Giữ state, báo lỗi có nút thử lại.
- F5 giữa chừng → Có beforeunload báo mất bài.
- Đề Listening chỉ có 2 Part → Navigation Grid sinh động chỉ hiển thị 2 Part đó.

## 7. Quy tắc nghiệp vụ

- **BR-LSUI-001 [AS-BUILT]**: Mode Simulation ép buộc nghe liên tục một lần. Không thể pause hoặc seek.
- **BR-LSUI-002 [AS-BUILT]**: Màn hình "Click to Start" yêu cầu click để vượt rào Autoplay của trình duyệt.
- **BR-LSUI-003 [AS-BUILT]**: Hết giờ, bài bị khóa và buộc nộp ngay.
- **BR-LSUI-004 [AS-BUILT]**: Partial practice chỉ hiển thị các Part đã chọn trong giao diện Overview.

## 8. Yêu cầu chức năng

- **FR-LSUI-001 [AS-BUILT]**: Hệ thống MUST implement Dual-mode Audio Player.
- **FR-LSUI-002 [AS-BUILT]**: Hệ thống MUST quản lý `TimerBar` (Countdown / Countup).
- **FR-LSUI-003 [AS-BUILT]**: Hệ thống MUST hiện Bottom Navigation Bar và `ReviewModal` (Overview grid).
- **FR-LSUI-004 [AS-BUILT]**: Khi bấm số câu trên grid, tự động scroll đến câu đó.
- **FR-LSUI-005 [AS-BUILT]**: Nút submit disable sau khi bấm.
- **FR-LSUI-006 [AS-BUILT]**: Dạng Map Labelling hiển thị hình to rõ.

## 9. Yêu cầu phi chức năng

- **NFR-LSUI-001 [AS-BUILT]**: Audio preload để tránh giật lag do mạng chậm.
- **NFR-LSUI-002 [AS-BUILT]**: Render 40 câu hỏi mượt mà, phản hồi < 16ms khi gõ hoặc click.

## 10. Thực thể chính

- **`answers` state**: Object chứa đáp án ở Frontend.
- **Audio element**: Thẻ HTML5 xử lý logic phát thanh.

## 11. Tiêu chí thành công

- **SC-LSUI-001 [AS-BUILT]**: Không thể pause âm thanh bằng bất kỳ cách nào ở mode Simulation.
- **SC-LSUI-002 [AS-BUILT]**: TimerBar chính xác ±1s.
- **SC-LSUI-003 [AS-BUILT]**: Trạng thái câu hỏi đồng bộ ngay lập tức trên Navigation Grid.

## 12. Giả định

- API đã trả về Audio URL đủ nhanh.

## 13. Phụ thuộc

- API submit bài (`feat-auto-grading`).

## 14. Câu hỏi mở
- None.
