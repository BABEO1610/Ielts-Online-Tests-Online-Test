# Yêu cầu thô: Lịch sử & Tra cứu Kết quả (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-attempt-history`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Học viên & Trưởng bộ môn IELTS  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./SPEC.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Hiện tại hệ thống không có trang lịch sử thi, gây ra các vấn đề sau cho học viên:
1. **Không theo dõi được tiến độ**: Học viên thi nhiều lần nhưng không có nơi nào liệt kê kết quả cũ — họ không biết mình đang tiến bộ hay đi ngang, không thể so sánh Band Score giữa các lần thi.
2. **Không học được từ lỗi sai**: Sau khi thi xong, học viên muốn xem lại câu nào mình sai và tại sao sai — nhưng hệ thống hiện tại không lưu chi tiết câu trả lời, không có trang xem lại.
3. **Dữ liệu bài thi rải rác, không hợp nhất**: Bài thi trắc nghiệm (Reading/Listening) và bài tự luận (Writing/Speaking) lưu ở 2 bảng DB khác nhau — học viên phải vào 2 chỗ khác nhau để tra, rất bất tiện.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

- *"Tôi muốn có một trang Dashboard xem được tất cả các lần thi của mình: thi bài nào, khi nào, được bao nhiêu điểm. Cả bài trắc nghiệm lẫn bài tự luận đều hiện chung ở đó."*
- *"Danh sách phải sắp xếp từ mới nhất xuống cũ nhất, và tôi muốn biết loại bài thi (Reading, Listening, Writing, Speaking) của từng lượt."*
- *"Nếu tôi chưa thi lần nào thì phải hiện thông báo 'Bạn chưa làm bài thi nào', đừng để trang trắng."*
- *"Click vào một lượt thi, tôi muốn thấy từng câu: câu nào đúng thì tô xanh, câu nào sai thì tô đỏ, và đáp án đúng là gì."*
- *"Nếu câu sai có kèm giải thích thì hiện giải thích đó ra. Nếu không có thì thôi, không cần hiện gì."*
- *"Phải chắc chắn rằng tôi chỉ xem được bài thi của mình, không được xem bài của người khác dù tôi biết link."*
- *"Tôi cũng muốn lọc xem chỉ bài Reading thôi, hoặc chỉ bài Listening thôi."*
- *"Trang xem chi tiết thì hiện dạng accordion — click vào câu để mở ra xem đáp án và giải thích, không cần hiện hết ngay một lúc."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Danh sách lịch sử có cần phân trang (pagination) không, hay hiện hết một lúc?*  
   **Trả lời**: *Chưa cần — ở MVP, mỗi học viên thi không quá nhiều nên filter theo `user_id` là đủ nhỏ. Pagination làm sau nếu cần.*

2. **Hỏi**: *Học viên truy cập thẳng vào URL chi tiết lượt thi của người khác (IDOR attack), hệ thống xử lý thế nào?*  
   **Trả lời**: *Trả về `403 Forbidden` hoặc `404 Not Found` — không được lộ bất kỳ dữ liệu nào của người khác.*

3. **Hỏi**: *Bài tự luận (Writing/Speaking) chưa được giáo viên chấm — khi hiện trong danh sách lịch sử thì Band Score hiện gì?*  
   **Trả lời**: *Hiện trạng thái "Đang chờ chấm" thay vì Band Score. Khi giáo viên chấm xong thì cập nhật tự động.*
