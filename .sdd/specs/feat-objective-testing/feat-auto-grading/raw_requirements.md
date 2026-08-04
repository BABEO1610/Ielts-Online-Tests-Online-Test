# Yêu cầu thô: Engine Chấm điểm Tự động (Raw Requirements)

**Dự án**: IELTSZone  
**Tính năng**: `feat-auto-grading`  
**Người thu thập (BA / Dev)**: Nhóm phát triển  
**Nguồn cung cấp yêu cầu**: Biên bản phỏng vấn Trưởng bộ môn IELTS & Đội ngũ kỹ thuật  
**Ngày thu thập**: 2026-07-20  
**Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hóa thành [spec.md](./SPEC.md)

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Hiện tại hệ thống chưa có cơ chế chấm điểm tự động cho bài thi trắc nghiệm (Reading & Listening), gây ra các vấn đề sau:
1. **Không có kết quả ngay lập tức**: Sau khi học viên nộp bài thi Reading hoặc Listening, hệ thống không trả về điểm số — học viên phải chờ giáo viên chấm thủ công, gây trễ hàng giờ đến hàng ngày.
2. **Chấm điểm thủ công thiếu nhất quán**: Các giáo viên chấm tay đôi khi không chuẩn hóa câu trả lời (ví dụ "Apples" vs "apples" vs " apples ") dẫn đến chấm sai câu đúng — gây khiếu nại từ học viên.
3. **Band Score tính sai**: Thang Band Score IELTS Academic cho Reading và Listening khác nhau và khác với thang điểm thông thường (ví dụ 30/40 câu đúng = 7.0 không phải 75%). Tính tay dễ nhầm.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Nguyễn Hải Yến (Học viên — Target 7.0 đang luyện thi tại Lango):
- *"Học viên nộp bài xong thì phải thấy điểm ngay lập tức, không cần đợi giáo viên chấm tay. Mình thi máy là để biết kết quả luôn."*
- *"Hệ thống phải cực kỳ thông minh ở dạng bài Fill-in-the-blank (Điền từ). Học sinh gõ 'APPLES', ' apples ', hay 'Apples' đều phải tính là đúng nếu đáp án gốc là 'apples'. Không được phân biệt chữ hoa chữ thường hay khoảng trắng thừa ở hai đầu."*
- *"Nhiều câu IELTS chấp nhận nhiều đáp án, ví dụ 'transport' hoặc 'transportation'. Đề thi hay có dấu '/' kiểu 'transport/transportation'. Hệ thống phải hiểu và chấm đúng nếu học viên nhập 1 trong 2."*
- *"Đôi khi đáp án có chữ trong ngoặc đơn, ví dụ 'the (local) government'. Nếu học sinh gõ 'the government' hoặc 'the local government' đều phải được tính đúng."*

### Từ cô Phương (Giáo viên giảng dạy IELTS tại Lango):
- *"Band score phải tính chính xác tuyệt đối theo thang chuẩn Cambridge. Bài Reading và Listening tính điểm theo thang khác nhau. Hơn nữa, IELTS Academic và General Training của Reading cũng có thang khác nhau. Tạm thời v1 mình làm Academic trước, nhưng engine phải config được."*
- *"Nhiều khi trung tâm chỉ tạo một Mini Test có 20 câu (chứ không phải full 40 câu). Hệ thống phải tự động quy đổi số câu đúng ra thang 40 (ví dụ 15/20 -> 30/40) rồi mới tra bảng Band Score."*
- *"Phải lưu chi tiết lại từng câu học viên đã gõ gì, đáp án đúng là gì, để lúc học viên mở lại lịch sử xem thì biết tại sao mình sai."*
- *"Tuyệt đối không được trả về đáp án đúng (Answer Key) qua API lúc học viên nộp bài, đề phòng học viên dùng tools lấy đáp án. Chỉ được phép trả về tổng số câu đúng/sai và Band Score. Chi tiết chỉ xem được ở trang kết quả."*
- *"Đối với câu hỏi Matching hoặc Multiple Choice (đáp án là A, B, C, D), phải match chính xác chữ cái. Đừng để học viên điền nguyên cả câu text thay vì chữ cái."*

### Từ Đội ngũ Kỹ thuật (Góc nhìn hệ thống):
- *"Engine chấm điểm cần tách rời, nhận input là JSON câu trả lời của học viên và đáp án chuẩn, trả ra JSON kết quả. Đừng code dính cứng vào Database để sau này dễ test unit."*
- *"Phải xử lý cẩn thận transaction. Nộp bài xong phải lưu `test_attempts` và lưu `attempt_answers` thành công thì mới commit, tránh tình trạng có attempt mà mất answer."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Nếu học viên nộp bài mà không trả lời câu nào (answers rỗng `{}`), hệ thống xử lý thế nào?*  
   **Trả lời**: *Vẫn cho submit bình thường, điểm raw score = 0, Band = 0. Không cần cảnh báo hay chặn. Đây là bài thi, không làm thì 0 điểm.*

2. **Hỏi**: *Nếu học viên double-click nút Nộp bài nhiều lần, có bị tính thành 2 lượt thi không?*  
   **Trả lời**: *Cần gắn idempotency key hoặc disable nút Nộp bài ngay sau lần click đầu tiên để tránh duplicate record trong database.*

3. **Hỏi**: *Quy tắc chuẩn hoá đáp án điền từ (Fill-in-the-blank) cụ thể là gì?*  
   **Trả lời**: *Trim khoảng trắng hai đầu, thay thế nhiều khoảng trắng liên tiếp bằng 1 khoảng trắng (replace `/\s+/g, ' '`), chuyển tất cả về chữ thường (lowercase) trước khi so sánh.*

4. **Hỏi**: *Quy tắc xử lý đáp án có ngoặc đơn (optional words) ví dụ `(the) local government`?*  
   **Trả lời**: *Engine cần tự generate ra 2 đáp án hợp lệ: `the local government` và `local government`. Nếu user nhập đúng 1 trong 2 thì cho điểm.*

5. **Hỏi**: *Quy tắc xử lý đáp án có dấu gạch chéo (alternative words) ví dụ `cars / automobiles`?*  
   **Trả lời**: *Cắt chuỗi theo dấu `/`, trim khoảng trắng. Sẽ thành mảng `['cars', 'automobiles']`. Trùng 1 trong các phần tử là đúng.*

6. **Hỏi**: *Bài thi rỗng (không có câu hỏi nào) được lưu vào DB trước đó, giờ user nộp bài thì sao?*  
   **Trả lời**: *Trả về HTTP 400 Bad Request ngay. Không cố tính điểm cho bài thi bị lỗi rỗng từ phía Admin.*

7. **Hỏi**: *Band score quy đổi cho partial test (ví dụ 10 câu, 20 câu) tính theo công thức nào?*  
   **Trả lời**: `Raw_40 = Math.round((Correct_count / Total_questions) * 40)`. Sau đó lấy `Raw_40` đem dò trong bảng Cambridge Band Score tiêu chuẩn của bài Academic Reading/Listening.

8. **Hỏi**: *Chấm điểm bài thi có câu hỏi dạng Short Answer (yêu cầu NO MORE THAN 3 WORDS), nếu học viên gõ đúng ý nhưng dư từ (4 từ) thì tính sao?*  
   **Trả lời**: *Phase 1 tạm thời chỉ so sánh khớp chuỗi (exact match) sau khi chuẩn hoá. Việc đếm từ (word count limit) nếu sai thì tự động đánh văng (chấm sai). Tức là nếu đáp án của Admin ghi là `red car` mà học viên ghi `a beautiful red car` (4 chữ) thì sẽ bị sai.*
