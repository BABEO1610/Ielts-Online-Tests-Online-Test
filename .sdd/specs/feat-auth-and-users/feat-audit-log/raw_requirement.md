# Yêu cầu thô — Nhật ký Hệ thống và Lịch sử Thay đổi (Audit Log)

  **Ngày ghi nhận**: 2026-05-15
  **Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ với đội ngũ vận hành hệ thống
  **Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
  **Người được phỏng vấn**: Quản lý, Product Owner
  **Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, đội ngũ vận hành phản ánh các vấn đề sau trong quy trình quản lý hệ thống hiện tại:

1. **Thiếu khả năng truy vết**: Quản trị viên (Admin) hiện tại không thể kiểm soát và theo dõi được ai đã thực hiện các hành động nhạy cảm trên hệ thống (ví dụ: đổi quyền, vô hiệu hóa tài khoản, sửa đổi đề thi).
2. **Khó khăn khi điều tra sự cố bảo mật**: Khi có sự cố bảo mật xảy ra (như có người cố gắng dò mật khẩu, đăng nhập thất bại liên tục, thay đổi mật khẩu bất thường), hệ thống đang thiếu cơ sở dữ liệu lưu vết để điều tra và truy cứu trách nhiệm.
3. **Rủi ro vận hành cao**: Trong quá trình vận hành, đôi khi Admin thực hiện sai thao tác (như thay đổi nhầm vai trò hoặc trạng thái của một người dùng) nhưng hệ thống không có cách nào giúp họ xem lại chi tiết trạng thái cũ hoặc hoàn tác (undo) một cách an toàn.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Quản lý (Quản trị viên hệ thống — phụ trách giám sát bảo mật và user):

- "Tạo tài liệu đặc tả tính năng từ ứng dụng web đã hoàn thành cho chức năng nhật ký hệ thống (audit logging), bao gồm nhật ký bảo mật/hoạt động, nhật ký thay đổi của admin."
- "Tôi cần có bộ lọc (filter) để dễ dàng tìm kiếm, đồng thời hệ thống phải hiển thị và làm nổi bật được các hành động đáng ngờ (suspicious)."
- "Nếu Admin thao tác nhầm, tôi muốn có tính năng xem chi tiết giá trị trước/sau và hỗ trợ hoàn tác (undo) các thay đổi đó trực tiếp trên giao diện."
- "Hệ thống cần cung cấp thêm các số liệu thống kê audit tổng quan (ví dụ tổng số lượng log, số log đáng ngờ)."

### Từ Product Owner (định hướng tính năng):

- "Chức năng audit này trước tiên tập trung vào admin và user, việc thay đổi nội dung (content changes) hay chấm điểm (grading) có thể bổ sung sau, nhưng luồng auth và thay đổi role thì phải làm ngay và chặt chẽ."
- "Giao diện phải chia làm hai phần: một phần xem luồng hoạt động chung (Activity Log) và một phần xem chi tiết lịch sử thay đổi có giá trị cũ/mới (Change Log)."

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: Audit Log sẽ sinh ra lượng dữ liệu rất lớn theo thời gian. Chính sách lưu trữ (retention policy) của hệ thống là gì? Có cần cơ chế tự động xóa log cũ không?
   **Trả lời**: Lưu vĩnh viễn trong PostgreSQL chính (Thiết kế đơn giản, chấp nhận DB lớn, không xóa tự động).
2. **Hỏi**: Tính năng Hoàn tác (Undo) có cần áp dụng cho tất cả mọi hành động thay đổi trên hệ thống không?
   **Trả lời**: Không, chỉ hỗ trợ cho những thay đổi về người dùng (như `role_changed`, `user_deactivated`, `user_updated` phần status). Ngoài ra, nếu đối tượng đã bị thay đổi bởi thao tác khác rồi (stale state) thì không được cho phép undo để tránh xung đột.
3. **Hỏi**: Các hành động nào được coi là "đáng ngờ" (suspicious)?
   **Trả lời**: Các hành động như đăng nhập thất bại, khóa tài khoản, đổi mật khẩu bởi admin, bị từ chối quyền truy cập (permission denied). Còn lại là mức độ bình thường (normal).
4. **Hỏi**: Chức năng hoàn tác (Undo) có cho phép Admin tự hoàn tác các thao tác trên chính tài khoản của họ không?
   **Trả lời**: Không được, hệ thống phải ngăn chặn admin hoàn tác các thay đổi trên chính tài khoản của mình (ngăn self-undo).
5. **Hỏi**: Ai có quyền xem nhật ký Audit?
   **Trả lời**: Chỉ duy nhất Admin. Học viên và Giảng viên hoàn toàn không có quyền xem.
