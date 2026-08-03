# Yêu cầu thô: Luồng thi và nộp bài Speaking 3 Parts (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-speaking-test-flow`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Học viên & Chuyên gia IELTS Speaking  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./spec.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Kỹ năng Speaking là kỹ năng khó luyện nhất trong IELTS vì học viên cần đối tác hoặc giáo viên để thực hành. Các vấn đề hiện tại:
1. **Không có nơi luyện tập độc lập**: Học viên muốn luyện Speaking nhưng không thể tìm giáo viên mọi lúc mọi nơi. Phải dùng app ngoài hoặc tự ghi âm bằng điện thoại.
2. **Không tái hiện đúng format thi IELTS**: Các ứng dụng luyện thi Speaking hiện tại không chia 3 Part đúng theo cấu trúc IELTS thật (Part 1: câu hỏi ngắn, Part 2: cue card + 1 phút chuẩn bị + 2 phút nói, Part 3: thảo luận chuyên sâu).
3. **Không có phản hồi chi tiết**: Sau khi ghi âm xong không biết mình được bao nhiêu band, phát âm có vấn đề gì, từ vựng có đa dạng không.
4. **Âm thanh bị mất, không lưu trữ an toàn**: Học viên tự ghi âm và gửi qua Zalo/email thường gặp sự cố file bị hỏng hoặc định dạng sai.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

- *"Tôi cần thấy đề câu hỏi rõ ràng trên màn hình, đồng thời có micro để tôi nói và hệ thống tự ghi âm lại."*
- *"Mỗi câu hỏi Part 1 và Part 3 phải có đồng hồ đếm ngược riêng, hết giờ tự động chuyển câu tiếp theo, không cần tôi bấm gì cả."*
- *"Part 2 phải có 1 phút chuẩn bị (tôi được đọc cue card và nghĩ ý), rồi hết 1 phút tự động chuyển sang 2 phút thu âm bài nói chính."*
- *"Tôi muốn xem lại được Cue Card khi đang nói Part 2 để không bị mất ý giữa chừng."*
- *"Giữa các Part phải có khoảng nghỉ nhỏ và thông báo chuẩn bị chuyển Part — giống như trong phòng thi thật có giám thị nhắc."*
- *"Sau khi nói xong cả 3 Part thì hiện màn hình tóm tắt để tôi xem lại và chọn: AI chấm ngay hay gửi cho Giáo viên chấm kỹ hơn."*
- *"Nếu tôi bị ngắt giữa chừng (ví dụ cuộc gọi đến, pin hết), file âm thanh đã thu trước đó phải được giữ lại, không bị mất."*
- *"Trình duyệt phải xin quyền micro trước, nếu tôi từ chối thì phải hướng dẫn tôi bật lại chứ không được im lặng rồi báo lỗi khó hiểu."*
- *"Sau khi nộp xong phải ra thông báo tiếng Việt rõ ràng là 'Bài đã được nộp thành công', không phải chỉ có mã JSON."*

**Yêu cầu bảo mật từ Tech Lead:**
- *"File audio tải lên phải được đặt trong thư mục riêng của từng user (speaking/{userId}/), không để lẫn lộn với user khác."*
- *"Phải validate đường dẫn audio — không cho phép ký tự '..' trong path để tránh path traversal attack."*
- *"Bắt buộc nộp đủ 3 Parts, thiếu Part nào là từ chối — không được chấm bài Speaking lẻ Part."*
- *"3 Part phải lưu trong cùng 1 DB transaction với cùng speaking_group_id để đảm bảo tính nguyên tử, tránh trường hợp chỉ lưu được 2/3 Part."*

---


## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

1. **Hỏi**: *Nếu học viên đóng trình duyệt giữa Part 2 thì phiên thi có được khôi phục không?*  
   **Trả lời**: *Không. Phiên thi bị hủy nếu đóng trình duyệt giữa chừng. File audio đã tải lên tạm thời cũng không được dùng để tiếp tục — học viên phải bắt đầu lại từ đầu. Cần cảnh báo trước khi rời trang.*
2. **Hỏi**: *Học viên có thể bấm "Hoàn thành sớm" giữa câu đang nói không?*  
   **Trả lời**: *Có, bấm "Hoàn thành sớm" chuyển sang câu hỏi tiếp theo nhưng KHÔNG dừng ghi âm toàn Part — ghi âm vẫn tiếp tục liên tục cho đến hết thời gian Part đó.*
3. **Hỏi**: *Một bài Speaking có thể dùng endpoint cũ (POST /speaking) với grader = ai không?*  
   **Trả lời**: *Không. Endpoint cũ (nộp 1 Part lẻ) với grader = ai sẽ bị từ chối. Bắt buộc phải dùng /speaking/full để đảm bảo có đủ 3 Parts trước khi gọi AI.*
