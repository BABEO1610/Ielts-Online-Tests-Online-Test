# CONTEXT.md — Luồng Thi Trắc nghiệm & Quản lý Đề (feat-objective-testing)
# Người viết: Nguyen Tien Dat | Ngày: 21/05/2026

## 1. PROBLEM STATEMENT (Nỗi đau & Mục tiêu)
- **Vấn đề:** Học viên cần một môi trường luyện tập Reading và Listening sát với thực tế (có bấm giờ, tính điểm chuẩn xác). Việc đối chiếu đáp án thủ công rất mất thời gian và thường không hiểu tại sao sai nếu không có giải thích. Giáo viên (Tutor) gặp khó khăn khi phát hiện đề có lỗi sai (typo đáp án) nhưng không dám sửa vì sợ làm hỏng/mất lịch sử điểm của các học viên đã thi trước đó.
- **Mục tiêu:** Xây dựng luồng thi trắc nghiệm mượt mà, tự động chấm điểm (Auto-grading) ngay lập tức và cho phép Tutor cập nhật đáp án linh hoạt mà không gây xung đột dữ liệu cũ.

## 2. DOMAIN KNOWLEDGE (Kiến thức nghiệp vụ IELTS)
- **Cấu trúc bài test:** Một bài Reading hoặc Listening tiêu chuẩn luôn có đúng 40 câu hỏi.
- **Raw Score to Band Score:** Điểm thô (từ 0-40) phải được quy đổi ra Band Score (từ 1.0 đến 9.0) theo bảng quy đổi chuẩn của IELTS Academic. (Ví dụ: Đúng 30-32 câu Reading = 7.0).
- **Dạng câu hỏi đặc thù:** Ngoài Trắc nghiệm (A, B, C, D), bài thi IELTS có dạng *Điền từ vào chỗ trống (Fill in the blanks)*. Hệ thống chấm điểm phải xử lý được tính chất không phân biệt chữ hoa/chữ thường (Case-insensitive) và khoảng trắng thừa.
- **Tính bất biến của lịch sử (Historical Immutability):** Khi một bài nộp (Submission) đã được chấm, điểm số và bài làm đó phải được "đóng băng". Nếu Tutor sửa đáp án của đề thi gốc, điểm của những người đã nộp bài trước đó KHÔNG được tự động thay đổi.

## 3. STAKEHOLDERS (Đối tượng tương tác)
- **Guest (Khách vãng lai):** Được phép xem danh sách đề thi (Mock tests) để đánh giá tài nguyên của nền tảng nhưng không được làm bài.
- **Student (Học viên):** Làm bài thi ở chế độ tính giờ (Timed) hoặc luyện tập (Untimed), xem kết quả, đọc giải thích.
- **Tutor (Giáo viên / Content Manager):** Cập nhật đáp án (Answer Key), nhập text giải thích (Explanations) cho từng câu, hẹn giờ công bố đề thi mới.

## 4. CONSTRAINTS (Ràng buộc cứng)
- **Performance:** Việc chấm điểm (Auto-grading) đối với 40 câu trắc nghiệm/điền từ phải diễn ra ngay lập tức (Synchronous) và trả về kết quả dưới 1 giây. Không dùng AI để chấm luồng này nhằm tiết kiệm chi phí và tăng tốc độ.
- **Bảo toàn dữ liệu (Data Integrity):** Hành động "Xóa" hoặc "Cập nhật" đề thi của Tutor thực chất chỉ là `soft-delete` (xóa mềm) hoặc tạo ra một version mới của đề thi trong Database, tuyệt đối không được xóa cứng (hard-delete) làm mồ côi (orphan) bài làm của Student.
- **Auto-submit:** Ở chế độ Timed, khi đồng hồ đếm ngược về 00:00, giao diện (Frontend) phải tự động khóa màn hình và kích hoạt API nộp bài, không cho phép học viên thao tác thêm.

## 5. ASSUMPTIONS (Giả định kỹ thuật)
- Giả định rằng giai đoạn MVP này chỉ hỗ trợ chuẩn bài thi IELTS Academic (không làm General Training vì bảng quy đổi điểm khác nhau).
- Giả định phần Audio của Listening là một file MP3/WAV tổng kéo dài khoảng 11-15 phút, học viên tự thao tác Play/Pause, hệ thống không tự động cắt nhỏ file audio theo từng section.

## 6. OPEN QUESTIONS 
- *Q1: Đối với câu điền từ (Fill in the blanks), nếu đáp án đúng là "apples" mà học viên nhập "apple" (thiếu s), hệ thống có dùng thuật toán so khớp chuỗi (như Levenshtein distance) để du di tính điểm không, hay bắt buộc sai tuyệt đối?*
- *Q2: Khi Student đang làm bài mà bị mất mạng hoặc lỡ F5 trình duyệt, hệ thống có lưu tạm (Auto-save/Draft) các câu đã đánh dấu vào Local Storage hoặc Database không?*