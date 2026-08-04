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

### Từ Nguyễn Hải Yến (Học viên — Thường xuyên thi thử để theo dõi tiến độ):
- *"Tôi muốn có một trang Dashboard tổng hợp tất cả các lần thi của mình. Thi bài nào, ngày giờ nộp bài, được bao nhiêu điểm (Band Score). Phải xem được cả bài trắc nghiệm (Reading/Listening) lẫn bài tự luận (Writing/Speaking) ở cùng một chỗ."*
- *"Danh sách lịch sử thi phải sắp xếp từ mới nhất xuống cũ nhất. Có nhãn (label) màu sắc rõ ràng để biết đâu là bài Reading, đâu là Listening. Trực quan thì mới dễ nhìn."*
- *"Nếu tôi là tài khoản mới tinh chưa thi lần nào, đừng để một trang trắng bóc. Phải hiện thông báo thân thiện kiểu 'Bạn chưa làm bài thi nào, hãy bắt đầu ngay' kèm theo nút bấm dẫn sang trang chọn đề thi."*
- *"Tôi muốn xem lại chi tiết bài làm của mình. Click vào một lượt thi, tôi muốn thấy từng câu: câu nào đúng thì tô xanh, câu nào sai thì tô đỏ, và phải hiện rõ ràng đáp án chuẩn là gì để tôi đối chiếu."*
- *"Câu nào sai mà giáo viên có viết phần Giải thích (Explanation) thì hiện ra luôn bên dưới đáp án đúng. Giúp tôi hiểu tại sao mình sai để rút kinh nghiệm."*
- *"Cần có bộ lọc (Filter). Tôi muốn lọc để chỉ xem lại lịch sử các bài Listening, hoặc chỉ bài Reading để đánh giá từng kỹ năng."*

### Từ Thầy Tuấn (Trưởng bộ môn / Admin):
- *"Dữ liệu thi của học viên là cực kỳ nhạy cảm. Phải đảm bảo học viên A không thể nào xem được bài thi của học viên B, dù A có đoán được URL hay ID của bài thi đó."*
- *"Học viên thi xong bài Writing/Speaking thì chưa có điểm ngay. Lúc đó trong lịch sử thi, trạng thái hiển thị phải là 'Đang chờ chấm' (Pending) thay vì hiển thị Band Score rỗng hay số 0 (gây hoang mang)."*

### Từ Đội ngũ Kỹ thuật / UX:
- *"Trang xem chi tiết đáp án có thể rất dài (40 câu). Cần thiết kế dạng accordion (thu gọn/mở rộng). Nghĩa là click vào câu số 1 thì mới bung ra xem chi tiết đáp án và giải thích của câu 1, không cần show toàn bộ 40 câu cùng lúc gây quá tải thông tin."*
- *"Dữ liệu có thể lên tới hàng ngàn record cho một học viên chăm chỉ. Tuy nhiên, giai đoạn đầu (MVP) nếu chưa nhiều, có thể load toàn bộ danh sách, nhưng tương lai chắc chắn cần làm phân trang (pagination) dạng 'Tải thêm' (Load more) hoặc đánh số trang."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Danh sách lịch sử có cần phân trang (pagination) không, hay hiện hết một lúc?*  
   **Trả lời**: *Để đảm bảo performance, bắt buộc phải có phân trang ngay từ v1. Sử dụng dạng Limit/Offset, mỗi trang hiển thị 20 bản ghi. Ở phía UI dùng nút "Tải thêm" (Load more) hoặc phân trang số 1,2,3 đều được, tuỳ design.*

2. **Hỏi**: *Nếu một học viên cố tình thay đổi URL (ví dụ `history/details/123` thành `history/details/124`) để xem bài thi của người khác (lỗi IDOR), hệ thống xử lý thế nào?*  
   **Trả lời**: *Backend phải check xem bản ghi attempt `124` đó có thuộc `user_id` hiện tại không. Nếu không thuộc, trả về lỗi `403 Forbidden` hoặc giả vờ `404 Not Found`. Tuyệt đối không trả về data.*

3. **Hỏi**: *Nếu lượt thi bị gián đoạn (chưa submit), có hiển thị trong trang lịch sử này không?*  
   **Trả lời**: *Không. Trang Lịch sử (History) chỉ hiển thị các bài thi đã hoàn thành (is_completed = true). Các bài đang làm dở thì nằm ở tính năng khác (Resume).*

4. **Hỏi**: *Bài tự luận (Writing/Speaking) chưa được chấm điểm — khi hiện trong danh sách lịch sử thì hiển thị trạng thái thế nào?*  
   **Trả lời**: *Thay vì hiển thị Band Score (VD: 7.0), hiển thị một badge màu cam ghi chữ "Đang chấm" (Grading). Khi nào giáo viên chấm xong, badge đó sẽ đổi thành Band Score.*

5. **Hỏi**: *Giao diện chi tiết bài làm có cần hiển thị lại bài đọc (Reading passage) hay file âm thanh (Listening audio) không?*  
   **Trả lời**: *Có. Trải nghiệm xem lại kết quả (Review) phải y hệt như lúc thi, tức là phải có đoạn văn (Reading) hoặc có thanh phát audio (Listening) để học viên đọc lại/nghe lại thì mới hiểu tại sao mình sai. Form input bị disable, đáp án đúng hiện bên dưới câu trả lời của user.*

6. **Hỏi**: *Nếu admin xoá một đề thi mà học viên đã thi trước đó, lịch sử của học viên có bị mất không?*  
   **Trả lời**: *Lịch sử thi (attempt) không bao giờ được phép xoá. Dù đề thi gốc bị Admin "soft-delete", dữ liệu bài làm của học viên vẫn phải được giữ lại nguyên vẹn để họ tra cứu.*
