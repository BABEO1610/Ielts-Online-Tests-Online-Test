# Yêu cầu thô: Lịch sử nộp bài và Báo cáo kết quả của Học viên (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-student-feedback-history`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Học viên & Product Owner  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./spec.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Sau khi học viên nộp bài Writing hoặc Speaking, hệ thống hiện không có trang xem kết quả tổng hợp:
1. **Không biết bài đang ở đâu**: Học viên nộp bài xong không biết AI đã chấm chưa, Giáo viên đã xem chưa, hay bài bị mất.
2. **Không có phản hồi chi tiết**: Chỉ biết band tổng, không biết mình yếu tiêu chí nào, lỗi ngữ pháp ở đoạn nào, từ vựng cần cải thiện chỗ nào.
3. **Không so sánh được tiến bộ**: Không xem lại bài cũ để so sánh với bài hiện tại, không theo dõi được xu hướng cải thiện theo thời gian.
4. **Báo cáo AI bị nhầm lẫn với kết quả chính thức**: Học viên nhận điểm AI và tưởng đó là điểm thi thật → Cần phân biệt rõ ràng "AI Estimated Band" và "Tutor Grade".
5. **Không thể tự xử lý khi AI lỗi**: Bài nộp gặp sự cố AI mà học viên không có cách nào yêu cầu chấm lại, phải liên hệ admin qua Zalo/email.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

- *"Tôi cần một trang 'Lịch sử làm bài' ở profile của tôi, xem được tất cả các bài Writing và Speaking tôi đã nộp từ trước đến nay."*
- *"Danh sách phải hiện rõ: bài nào, tên đề thi gì, nộp ngày nào, đang ở trạng thái gì (đang chấm / đã có điểm AI / Giáo viên đã chấm / bị lỗi)."*
- *"Tôi muốn lọc được: chỉ hiện bài Writing, hoặc chỉ hiện bài Speaking — không phải cuộn qua toàn bộ danh sách lẫn lộn."*
- *"Bài đang chờ chấm thì nút 'Xem chi tiết' phải bị xám đi, đừng cho tôi click vào bài trống không có gì."*
- *"Khi bấm xem chi tiết, tôi cần thấy điểm từng tiêu chí IELTS (4 tiêu chí), không chỉ một điểm tổng."*
- *"Bài AI chấm thì phải ghi rõ là 'AI Estimated Band', không phải điểm thi thật. Tôi không muốn đi khoe với bạn bè rồi bị ngượng."*
- *"Bài Giáo viên chấm thì phải thấy nhận xét của Giáo viên, và nếu giáo viên có ghi âm nhận xét thì tôi nghe được luôn trên trang."*
- *"Phần bài viết Writing thì phải hiện bài gốc của tôi bên cạnh bài được AI/Giáo viên sửa lại — để tôi học từ cái sửa đó."*
- *"Nếu bài AI bị lỗi mà chưa có điểm, tôi muốn có nút 'Chấm lại bằng AI' để tự yêu cầu thử lại, không cần nhắn tin hỏi admin."*
- *"Nếu tôi dùng hết lượt chấm AI trong ngày rồi thì báo cho tôi biết bằng tiếng Việt, đừng hiện lỗi kỹ thuật khó hiểu."*
- *"Nếu tôi chưa có bài nào thì đừng để trang trống trơn, hiện hướng dẫn và nút dẫn đến phần làm bài."*

**Yêu cầu từ phía bảo mật:**
- *"Học viên A không được xem báo cáo bài nộp của học viên B, dù biết ID của bài đó. Phải kiểm tra ownership."*
- *"API lịch sử bài nộp phải lấy user_id từ token đăng nhập, không tin vào tham số trên URL."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

1. **Hỏi**: *Danh sách lịch sử có bao gồm cả bài Listening và Reading (objective test) không?*  
   **Trả lời**: *Có, trang Lịch sử làm bài (`PracticeHistoryPage`) hiển thị tất cả 4 kỹ năng (Listening, Reading, Writing, Speaking). Tuy nhiên feat-student-feedback-history tập trung vào luồng báo cáo chi tiết của Writing & Speaking — phần Listening/Reading có luồng riêng.*
2. **Hỏi**: *Khi báo cáo AI chỉ hoàn thành cho Task 1 nhưng Task 2 bị lỗi, hiển thị thế nào?*  
   **Trả lời**: *Hiển thị Task 1 với điểm đầy đủ, Task 2 với badge trạng thái "Đang xử lý" hoặc "Xảy ra lỗi" kèm nút chấm lại AI riêng cho Task 2.*
3. **Hỏi**: *Học viên có thể export báo cáo ra PDF không?*  
   **Trả lời**: *Ngoài phạm vi Sprint 1. Ghi nhận là yêu cầu tương lai — ưu tiên thấp (P3).*
