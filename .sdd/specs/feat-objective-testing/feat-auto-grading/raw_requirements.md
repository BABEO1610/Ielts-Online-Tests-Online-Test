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

- *"Học viên nộp bài xong thì phải thấy điểm ngay, không cần đợi giáo viên. Band score phải đúng theo thang chuẩn Cambridge, không phải 10 điểm bình thường."*
- *"Câu trả lời fill-in-blank thì phải bỏ qua chữ hoa/thường và khoảng trắng thừa. Học sinh gõ 'APPLES', ' apples ', 'Apples' đều phải tính đúng nếu đáp án là 'apples'."*
- *"Một số câu có nhiều đáp án chấp nhận được, ví dụ câu đó chấp nhận cả 'transport' lẫn'transportation'. Phải hỗ trợ cái này."*
- *"Bài Reading và Listening tính điểm theo thang khác nhau. Anh muốn hệ thống lấy đúng thang chuẩn của Cambridge, không tự làm thang."*
- *"Bài thi có thể không đủ 40 câu, ví dụ chỉ có 20 câu. Lúc đó phải quy đổi ra thang 40 rồi mới tra Band Score."*
- *"Dữ liệu phải được lưu đầy đủ: cả bảng tổng kết (bao nhiêu đúng, bao nhiêu sai, band score) lẫn chi tiết từng câu (câu nào đúng, câu nào sai, học sinh gõ gì)."*
- *"Nếu bài Writing hay Speaking nộp qua đây thì không cần tính điểm tự động — chờ giáo viên chấm tay."*
- *"Phải tuyệt đối không trả về đáp án đúng ngay trong lúc nộp bài — chỉ được xem khi vào trang xem lại."*

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `SPEC.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: *Nếu học viên nộp bài mà không trả lời câu nào (answers rỗng `{}`), hệ thống xử lý thế nào?*  
   **Trả lời**: *Submit bình thường, raw score = 0. Không cần cảnh báo hay chặn. Đây là quyền của học viên.*

2. **Hỏi**: *Nếu xảy ra lỗi database khi đang lưu kết quả (ví dụ DB timeout), hệ thống xử lý thế nào để tránh dữ liệu nửa vời?*  
   **Trả lời**: *Phải dùng transaction — nếu bước nào lỗi thì ROLLBACK toàn bộ. Không được lưu `test_attempts` mà thiếu `attempt_answers`.*

3. **Hỏi**: *Bài thi không có câu hỏi nào (ví dụ Admin tạo đề rỗng) thì sao?*  
   **Trả lời**: *Trả về 400 Bad Request ngay. Không cố tính điểm cho bài rỗng.*
