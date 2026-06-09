# CONTEXT.md — Thư viện Tài liệu (feat-content-library)
# Người viết: Lê Tiến Thành | Ngày: 2026-05-21

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

- **Student:** Không có tài liệu luyện thi chính thống (PDF/Audio) để tự luyện tập offline, dẫn đến việc phải tìm kiếm tài liệu bên ngoài không đảm bảo chất lượng.
- **Tutor:** Mất thời gian gửi tài liệu thủ công cho từng học viên. Thư viện tập trung giúp Tutor quản lý tài nguyên đồng nhất.

## 2. KIẾN THỨC NGHIỆP VỤ

- **Tài liệu chính thống:** Tài liệu phải là tài liệu chính thống của IELTS (Cambridge, Official Guide...).
- **Cấu trúc tài nguyên:** Mỗi tài liệu bao gồm: Tiêu đề, Loại kỹ năng (Reading/Listening), Độ khó (Band score), đường dẫn PDF (đề), và đường dẫn Audio (cho kỹ năng Listening).
- **Phiên bản hoá:** Tutor có thể cập nhật đề thi cũ, nhưng không được xóa hoàn toàn các lượt làm bài (attempts) cũ của học viên trên đề đó.

## 3. CÁC BÊN LIÊN QUAN

- **Student:** Người truy cập thư viện để tải đề về máy in hoặc luyện tập.
- **Tutor:** Người duy nhất có quyền upload, chỉnh sửa, xóa tài liệu chính thống để đảm bảo chất lượng nội dung.

## 4. RÀNG BUỘC CỨNG

- **Kỹ thuật:** File PDF và Audio phải được lưu trữ trên Cloud Storage (S3 hoặc tương đương). Đường dẫn trong Database chỉ lưu URL, không lưu file trực tiếp.
- **Bảo mật:** Tutor phải có quyền xác thực (Authorized) mới được thực hiện hành động Upload/Delete.
- **Toàn vẹn dữ liệu:** Khi Tutor chỉnh sửa đáp án của đề đã published, hệ thống không được xóa record `UserAttempt` của học viên (quy tắc bảo toàn dữ liệu lịch sử).

## 5. GIẢ ĐỊNH

- Giả định hệ thống đã có bộ lưu trữ Cloud Storage (như AWS S3) để chứa file.
- Giả định mỗi đề thi Listening luôn đi kèm một file audio (định dạng mp3/wav).
- Giả định Tutor sử dụng dashboard nội bộ để quản lý tài nguyên này.

## 6. CÂU HỎI CẦN CHỐT

- Q: Khi Tutor chỉnh sửa file PDF đề thi, có cần versioning (lưu phiên bản cũ) không?
- Q: Dung lượng tối đa cho mỗi file tài liệu là bao nhiêu để tối ưu hóa chi phí lưu trữ?
- Q: Có cần tính năng xem trước (Preview) PDF ngay trên trình duyệt không, hay chỉ cần Download?