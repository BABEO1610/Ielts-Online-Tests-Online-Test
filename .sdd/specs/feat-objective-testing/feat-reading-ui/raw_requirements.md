# Yêu cầu thô: Giao diện Thi Reading (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-reading-ui`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Học viên & Giảng viên IELTS Reading  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./SPEC.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Hiện tại hệ thống chưa có giao diện thi Reading chuyên biệt, gây ra các vấn đề sau:
1. **Không đọc bài và làm câu hỏi cùng lúc được**: Học viên phải cuộn lên cuộn xuống liên tục giữa đoạn văn và câu hỏi — gây mất thời gian, mất tập trung, không phản ánh đúng trải nghiệm thi IELTS thực tế với 2 trang thi song song.
2. **Mất đáp án khi điều hướng**: Khi học viên đang điền fill-in-blank rồi click sang câu khác, nội dung đã gõ bị xóa sạch — buộc họ phải nhớ lại và gõ lại gây bức xúc.
3. **Không hỗ trợ luyện tập một phần (Partial Practice)**: IELTS Reading có 3 Passage, nhưng hệ thống buộc học viên phải làm cả 3 — không có cách nào chọn chỉ làm Passage 1 hoặc 2 để luyện tập chuyên sâu.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

- *"Trang thi Reading phải chia đôi màn hình: bên trái là bài đọc, bên phải là câu hỏi. Tôi cuộn bài đọc thì câu hỏi đứng yên, tôi cuộn câu hỏi thì bài đọc đứng yên."*
- *"Tôi điền chữ vào ô trống rồi click sang câu khác, quay lại thì chữ vẫn phải còn đó. Đừng để mất đáp án."*
- *"Cho tôi chọn luyện chỉ Passage 1 và Passage 2, không cần làm Passage 3."*
- *"Câu hỏi có nhiều dạng: trắc nghiệm 1 đáp án, chọn nhiều đáp án, True/False/Not Given, matching, điền từ ngắn — tất cả phải hiện ra đúng dạng."*
- *"Có bảng tổng quan câu hỏi nào đã làm, chưa làm. Click vào ô câu hỏi đó thì nhảy thẳng đến câu đó và tự cuộn đến đúng Passage chứa câu đó."*
- *"Đồng hồ đếm ngược phải có, hết giờ tự nộp bài."*
- *"Khi bài đọc có hình ảnh hay bảng số liệu kèm theo câu hỏi thì hình phải hiện ngay phía trên câu hỏi đó."*
- *"Khi tải đề chưa xong thì phải có màn chờ hoặc skeleton, đừng để màn hình trắng."*
- *"Màn hình nhỏ hơn (tablet dọc) thì đổi sang bố cục dọc: bài đọc ở trên, câu hỏi ở dưới."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Khi học viên click câu hỏi trong ReviewModal thuộc Passage khác với Passage đang hiển thị, hệ thống xử lý thế nào?*  
   **Trả lời**: *Hệ thống phải tự động switch sang Passage đúng chứa câu đó rồi mới scroll tới câu — không được yêu cầu học viên tự switch.*

2. **Hỏi**: *Ô điền trống (fill-in-blank) rỗng khi nộp thì tính điểm thế nào?*  
   **Trả lời**: *Submit bình thường, backend tự động chấm sai cho câu đó. Frontend không cần cảnh báo.*

3. **Hỏi**: *Màn hình mobile < 768px có cần hỗ trợ không?*  
   **Trả lời**: *Ngoài scope v1. Chỉ cần hỗ trợ Desktop và Tablet (>= 768px). Mobile sẽ làm sau.*
