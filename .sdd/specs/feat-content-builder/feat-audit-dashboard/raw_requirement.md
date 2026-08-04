# Yêu cầu thô — Dashboard Kiểm toán (Audit Dashboard)

* [ ] **Ngày ghi nhận**: 2026-05-20
  **Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ với Admin vận hành hệ thống IELTSZone
  **Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
  **Người được phỏng vấn**: Nhóm Admin vận hành (2 người) — quản lý người dùng và nội dung hệ thống hàng ngày
  **Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, nhóm Admin phản ánh các vấn đề sau trong quá trình vận hành hệ thống IELTSZone:

1. **Không biết ai đã làm gì**: Khi có sự cố (tài liệu bị xóa nhầm, vai trò người dùng bị đổi sai), Admin không có cách nào truy vết lại được ai đã thực hiện hành động đó và lúc nào.
2. **Không phát hiện được truy cập bất thường**: Hệ thống không có cơ chế cảnh báo khi có đăng nhập thất bại nhiều lần, hoặc có tài khoản bị đổi quyền một cách đột ngột.
3. **Không thể sửa sai nhanh**: Khi Admin vô tình đổi role của một Giảng viên thành Học viên, phải vào database trực tiếp để sửa lại — rủi ro cao và mất thời gian.
4. **Không có lịch sử thay đổi dữ liệu**: Không biết được giá trị trước khi thay đổi là gì, chỉ thấy trạng thái hiện tại trong DB. Điều này gây khó khăn khi cần kiểm tra hoặc audit.
5. **Khó phân biệt hành động bình thường và bất thường**: Mọi hành động hiện tại đều được ghi như nhau, không có cách phân loại để tập trung vào các trường hợp rủi ro cao.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Admin vận hành (Quản trị viên hệ thống — phụ trách user management và nội dung):

- "Tôi cần biết ai đã đăng nhập, lúc mấy giờ, từ IP nào. Đặc biệt là khi có tài khoản đăng nhập sai nhiều lần — phải có cảnh báo hoặc đánh dấu rõ ràng."
- "Khi tôi đổi role của ai đó nhầm, tôi muốn có nút Hoàn tác (Undo) ngay trên trang quản trị, không phải vào database sửa tay."
- "Nút Undo phải hiển thị rõ: trước khi thay đổi là gì, sau khi thay đổi là gì. Tôi phải thấy được để quyết định có nên hoàn tác không."
- "Nếu tôi Undo một thay đổi, hệ thống phải ghi lại rằng đã Undo — tức là lịch sử phải trung thực, không được xóa dấu vết."
- "Tôi không muốn Undo nhầm vào tài khoản của chính mình. Phải có cơ chế chặn điều đó."
- "Danh sách hoạt động phải có bộ lọc: tôi muốn chỉ xem các hành động 'nguy hiểm' (đổi role, xóa user, đăng nhập thất bại nhiều lần) mà không phải cuộn qua hàng nghìn dòng log bình thường."
- "Lịch sử thay đổi phải lưu đủ lâu — ít nhất 6 tháng — để khi có tranh chấp tôi vẫn còn bằng chứng."
- "Nếu hai Admin cùng Undo một thay đổi, chỉ một người thành công thôi — hệ thống phải xử lý được trường hợp này."

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: Những hành động nào được coi là "bất thường" (suspicious)?
   **Trả lời**: Các hành động như `login_failed`, `role_changed`, `user_deactivated`, `resource_deleted`. Không cần AI — dùng rule cố định để đánh dấu.

2. **Hỏi**: Tính năng Undo hỗ trợ những đối tượng nào? Có Undo đề thi hay tài liệu không?
   **Trả lời**: Phase 1 chỉ Undo các thay đổi liên quan đến `users` (role, trạng thái tài khoản). Undo đề thi và tài liệu để sau.

3. **Hỏi**: Admin có được Undo chính tài khoản của mình không?
   **Trả lời**: Không. Phải chặn để tránh leo thang đặc quyền. Trả HTTP 403 nếu Actor ID trùng Target ID.

4. **Hỏi**: Nếu dữ liệu đã bị thay đổi lần 2 sau khi log được ghi ra, có Undo được không?
   **Trả lời**: Không. Phải kiểm tra xem giá trị hiện tại có khớp với `new_value` trong log không. Nếu không khớp → trả HTTP 409.

5. **Hỏi**: Hai Admin Undo cùng lúc thì xử lý sao?
   **Trả lời**: Dùng `SELECT FOR UPDATE` trong transaction để khóa dòng. Chỉ một request thành công, request kia nhận lỗi.

6. **Hỏi**: Sau khi Undo thành công, có ghi log không?
   **Trả lời**: Bắt buộc. Phải sinh ra log mới với action `change_reverted` — không được âm thầm sửa DB mà không có dấu vết.

7. **Hỏi**: Có chính sách xóa log cũ không (retention policy)?
   **Trả lời**: Chưa quyết định. Tạm thời giữ toàn bộ. Đây là câu hỏi mở cần quyết định sau. (*→ Ghi nhận vào spec mục "NEEDS CLARIFICATION"*)

8. **Hỏi**: Học viên và Giảng viên có thấy được log của mình không?
   **Trả lời**: Không. Dashboard Kiểm toán là công cụ nội bộ, chỉ Admin mới truy cập được.

9. **Hỏi**: Log có cần lưu IP address không?
   **Trả lời**: Có. Lưu IP của người thực hiện hành động. Cần hỗ trợ cả IPv4 và IPv6.

10. **Hỏi**: Hành động ghi log có làm chậm API nghiệp vụ không?
    **Trả lời**: Phải đảm bảo không block API chính. Ưu tiên ghi log xong trước khi trả response, nhưng không được làm timeout các request quan trọng.
