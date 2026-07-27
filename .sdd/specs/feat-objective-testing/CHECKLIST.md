# QA Checklist: Thi Trắc Nghiệm (feat-objective-testing)

**Purpose**: Đảm bảo các luồng chức năng, giao diện, và logic chấm điểm của tính năng thi thử hoạt động chính xác trước khi release.
**Created**: 2026-07-24
**Feature**: [Đặc tả tính năng (SPEC.md)](./SPEC.md)

*Lưu ý: Danh sách này được xây dựng dựa trên các tiêu chí nghiệm thu (Acceptance Criteria) và Edge Cases trong bản Spec đã cập nhật.*

## Giao diện & Trải nghiệm Người dùng (UI/UX - US1 & US2)

- [ ] CHK001: Màn hình Reading hiển thị đúng cấu trúc Split View (chia đôi màn hình), có thể cuộn văn bản bên trái mà câu hỏi bên phải đứng yên.
- [ ] CHK002: Khi chuyển câu hỏi hoặc cuộn chuột, text đã gõ vào ô điền khuyết (fill-in-blanks) không bị mất (lưu trong local state).
- [ ] CHK003: Màn hình Listening hiển thị Audio Player ổn định, người dùng có thể thao tác (Play/Pause) nhưng không tự nhảy bài (auto-scroll).
- [ ] CHK004: Thanh điều hướng (QuestionNavigator) hiển thị đủ 40 ô số và cập nhật màu/trạng thái tức thời khi học viên điền đáp án.
- [ ] CHK005: Bộ đếm thời gian (Timer) đếm lùi chính xác theo thuộc tính `duration_minutes` của đề thi.

## Logic Hệ thống & Backend (US3)

- [ ] CHK006: Chức năng Auto-grading (trong `attempt.service.js`) chấm đúng cho trường hợp gõ dư khoảng trắng (ví dụ: ` Apples ` được tính là đúng nếu đáp án là `apples`).
- [ ] CHK007: Chức năng Auto-grading không phân biệt chữ hoa, chữ thường.
- [ ] CHK008: Khi bộ đếm thời gian về `00:00`, UI bị khóa và hệ thống bắt buộc tự động gọi API `POST /api/v1/tests/:id/attempts` thành công.
- [ ] CHK009: Thuật toán quy đổi Band Score IELTS hoạt động chính xác theo bảng điểm chuẩn.
- [ ] CHK010: Database Transaction đảm bảo ghi thành công vào bảng `test_attempts` (và các bảng liên quan).

## Lịch sử, Tra cứu & Xử lý Ngoại lệ (US4 & Edge Cases)

- [ ] CHK011: Trang Dashboard liệt kê đúng danh sách các lần nộp bài của học viên hiện tại.
- [ ] CHK012: Xem chi tiết một bài thi cũ, hệ thống bôi highlight xanh/đỏ chính xác dựa vào kết quả chấm và hiện lời giải.
- [ ] CHK013: Gửi POST payload thiếu field `answers` qua Postman -> Hệ thống trả về `400 Bad Request` kèm thông báo rõ ràng thay vì crash.
- [ ] CHK014: Giả lập Token hết hạn (Timeout) khi nộp bài -> Hệ thống từ chối (qua JWT middleware) và yêu cầu người dùng xử lý đăng nhập.
- [ ] CHK015: Không gửi kèm đáp án đúng (`correct_answer`) từ Backend xuống Frontend trong payload lấy đề thi ban đầu (Bảo mật).
- [ ] CHK016: (Kiểm tra Edge Case) Người dùng refresh trang hoặc mất kết nối mạng sẽ mất dữ liệu do không dùng auto-save LocalStorage (đảm bảo hiển thị cảnh báo nếu cần).

## Notes

- Tích dấu `[x]` khi hoàn thành mỗi mục kiểm thử.
- Với các lỗi phát sinh, hãy note trực tiếp ở đây hoặc tạo Issue trên Github kèm theo ID (ví dụ: Failed CHK006).
