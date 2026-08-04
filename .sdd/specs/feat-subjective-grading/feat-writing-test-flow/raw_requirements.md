# Yêu cầu thô: Luồng thi và nộp bài Writing (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-writing-test-flow`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Học viên & Trưởng bộ môn IELTS Writing  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./spec.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Trung tâm hiện tổ chức thi Writing dạng đề giấy hoặc để học viên tự nộp file qua email, gây ra các vấn đề:
1. **Chậm và thiếu chuyên nghiệp**: Học viên phải đánh máy bài ra file Word, gửi email cho giáo viên, chờ giáo viên trả kết quả qua email — toàn bộ quy trình có thể mất từ 2-7 ngày.
2. **Không theo dõi được thời gian và số từ**: Học viên luyện ở nhà không biết mình viết nhanh hay chậm, đủ số từ tối thiểu chưa (IELTS yêu cầu Task 1 ≥ 150 từ, Task 2 ≥ 250 từ trong điều kiện thi thật).
3. **Không có phản hồi tức thì**: Học viên muốn biết ngay mình được bao nhiêu band sau khi làm bài, không phải đợi giáo viên rảnh.
4. **Không lưu lịch sử**: Không so sánh được tiến bộ của mình qua các bài thi trước đây.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu:

- *"Tôi muốn thấy đề bài Task 1 và Task 2 ngay trên màn hình, bên cạnh có ô để tôi gõ bài vào, không phải mở thêm tab hay ứng dụng khác."*
- *"Trong lúc viết phải hiển thị số từ tôi đã gõ, tôi hay quên đếm tay và không biết mình đã viết đủ chưa."*
- *"Cần có đồng hồ đếm ngược, thi thật cũng có thời gian giới hạn nên phải quen từ lúc luyện."*
- *"Xong giờ thì bắn ra thông báo bắt tôi nộp bài, không được tự ý lưu lại cho tôi làm tiếp được vì như vậy không tái hiện điều kiện thi thật."*
- *"Tôi muốn chọn: hoặc là AI chấm ngay cho tôi kết quả, hoặc là gửi cho giáo viên chấm kỹ hơn. Tùy bài tôi muốn cái nào."*
- *"Nếu chọn AI thì phải ra điểm ngay, không phải đợi. Còn chọn giáo viên thì thôi, chờ được."*
- *"Phải hiện điểm theo từng tiêu chí của IELTS: Task Achievement, Coherence, Vocabulary, Grammar — không chỉ một con số tổng."*
- *"Bài AI chấm thì phải ghi rõ là AI chấm đấy nhé, không phải điểm chính thức như thi thật."*
- *"Nếu tôi viết chưa đủ số từ mà cố nộp, đừng cho nộp hoặc ít nhất là cảnh báo to lên."*
- *"Mỗi lần làm bài phải lưu lại, tôi muốn xem lại bài cũ và so sánh tiến bộ."*

**Yêu cầu từ phía Trưởng bộ môn:**
- *"Bài nộp thiếu Task 1 hoặc Task 2 thì hệ thống phải từ chối, không thể chấm một Task lẻ."*
- *"Kiểm tra tối thiểu 50 từ cho Task 1 và 100 từ cho Task 2 trước khi gọi AI, tránh tốn tiền API gọi cho bài rác."*
- *"Kết quả band AI phải tính theo trọng số chuẩn IELTS: Task 1 chiếm 33%, Task 2 chiếm 67%."*
- *"Giáo viên và AI chấm điểm riêng biệt, điểm AI không được ghi đè điểm giáo viên hoặc ngược lại."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

1. **Hỏi**: *Đề thi Writing chỉ có thể có đúng 2 Task không? Có trường hợp chỉ 1 Task hoặc 3 Task không?*  
   **Trả lời**: *Hệ thống chỉ chấp nhận đúng 2 Task (Task 1 và Task 2). Đề có số lượng task khác đều bị từ chối.*
2. **Hỏi**: *Nếu học viên làm mới trang giữa chừng thì có khôi phục bản nháp không?*  
   **Trả lời**: *Không. Bản nháp chưa nộp bị mất nếu tải lại trang — đây là thiết kế cố ý để tái hiện điều kiện thi thật. Cần cảnh báo học viên trước khi rời trang.*
3. **Hỏi**: *Học viên nộp cùng một đề thi nhiều lần có được không?*  
   **Trả lời**: *Có, mỗi lần nộp tạo một lịch sử mới, không ghi đè. Học viên có thể luyện lại đề cũ để theo dõi tiến bộ.*
