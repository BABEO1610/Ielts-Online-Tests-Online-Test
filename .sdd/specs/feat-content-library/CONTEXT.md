# CONTEXT.md — Content Library (Thư viện tài liệu)
# Người viết: Lê Tiến Thành | Ngày: 2026-05-21

## 1. PROBLEM STATEMENT (Nỗi đau của User)
- Student: Không có tài liệu luyện thi chính thống (PDF/Audio) để tự luyện tập offline, dẫn đến việc phải tìm kiếm tài liệu bên ngoài không đảm bảo chất lượng.
- Tutor: Mất thời gian gửi tài liệu thủ công cho từng học viên. Thư viện tập trung giúp Tutor quản lý tài nguyên đồng nhất.

## 2. DOMAIN KNOWLEDGE (Kiến thức nghiệp vụ)
- **Official Material:** Tài liệu phải là tài liệu chính thống của IELTS (Cambridge, Official Guide...).
- **Resource Structure:** Mỗi tài liệu bao gồm: Title, Skill Type (Reading/Listening), Difficulty (Band score), PDF link (đề), và Audio link (cho kỹ năng Listening).
- **Versioning:** Tutor có thể update đề thi cũ, nhưng không được xóa hoàn toàn các lượt làm bài (attempts) cũ của học viên trên đề đó.

## 3. STAKEHOLDERS
- **Student:** Người truy cập thư viện để download đề về máy in hoặc luyện tập.
- **Tutor:** Người duy nhất có quyền upload, edit, delete tài liệu chính thống để đảm bảo chất lượng nội dung.

## 4. CONSTRAINTS (Ràng buộc cứng)
- **Technical:** File PDF và Audio phải được lưu trữ trên Cloud Storage (S3 hoặc tương đương). Đường dẫn trong Database chỉ lưu URL, không lưu file trực tiếp.
- **Security:** Tutor phải có quyền xác thực (Authorized) mới được thực hiện hành động Upload/Delete.
- **Data Integrity:** Khi Tutor edit đáp án của đề đã published, hệ thống không được xóa record `UserAttempt` của học viên (quy tắc bảo toàn dữ liệu lịch sử).

## 5. ASSUMPTIONS (Giả định)
- Giả định hệ thống đã có bộ lưu trữ Cloud Storage (như AWS S3) để chứa file.
- Giả định mỗi đề thi Listening luôn đi kèm một file audio (định dạng mp3/wav).
- Giả định Tutor sử dụng dashboard nội bộ để quản lý tài nguyên này.

## 6. OPEN QUESTIONS (Câu hỏi cần chốt)
- Q: Khi Tutor edit file PDF đề thi, có cần versioning (lưu phiên bản cũ) không?
- Q: Dung lượng tối đa cho mỗi file tài liệu là bao nhiêu để tối ưu hóa chi phí lưu trữ?
- Q: Có cần tính năng xem trước (Preview) PDF ngay trên trình duyệt không, hay chỉ cần Download?