# Yêu cầu thô — Xác thực (Authentication)

  **Ngày ghi nhận**: 2026-05-15
  **Nguồn**: Buổi phỏng vấn nhu cầu nghiệp vụ với Học viên và Đội ngũ vận hành
  **Người phỏng vấn**: Nhóm phân tích BA (Team IELTSZone)
  **Người được phỏng vấn**: Nguyễn Duy Mạnh (Học viên), Product Owner
  **Tình trạng**: Đã tiếp nhận → Dùng làm đầu vào để chuẩn hoá thành `spec.md`

---

## 1. Bối cảnh & Vấn đề thực tế (Pain Points)

Qua phỏng vấn, khách hàng và đội ngũ phát triển phản ánh các vấn đề sau trong quy trình đăng nhập và quản lý tài khoản:

1. **Khó khăn trong việc phân quyền truy cập**: Nền tảng cần cung cấp không gian riêng biệt cho Học viên (Student), Giảng viên (Tutor) và Quản trị (Admin), nhưng hiện tại chưa có luồng đăng nhập chuẩn để định danh, phân quyền và điều hướng người dùng về đúng không gian làm việc của họ.
2. **Rủi ro bảo mật và quá tải hỗ trợ**: Học viên thường quên mật khẩu nhưng nếu không có cách nào tự khôi phục, họ phải liên hệ bộ phận hỗ trợ khách hàng gây quá tải. Hơn nữa, việc thiếu xác thực email dẫn đến nhiều tài khoản "rác" hoặc tài khoản giả mạo.
3. **Trải nghiệm đăng nhập chưa tối ưu**: Việc chỉ có đăng nhập bằng email/mật khẩu truyền thống đôi khi gây bất tiện, nhiều người dùng muốn đăng nhập nhanh bằng tài khoản Google (Social Login) để tiết kiệm thời gian.

---

## 2. Ghi chép yêu cầu thô từ khách hàng (Customer Voice / Raw Notes)

Dưới đây là nguyên văn các yêu cầu được ghi lại trong buổi phỏng vấn nhu cầu nghiệp vụ:

### Từ Nguyễn Duy Mạnh (Học viên — góc nhìn người dùng cuối):

- "Tạo tài liệu đặc tả tính năng (backfill) từ ứng dụng web đã hoàn thành cho chức năng xác thực, bao gồm đăng ký, xác thực email, đăng nhập, đăng xuất, khôi phục mật khẩu, đổi mật khẩu, làm mới phiên (session refresh), điều hướng dựa trên vai trò, và đăng nhập qua Google."
- "Em muốn đăng ký xong thì phải có email báo về để kích hoạt, cảm giác tài khoản an toàn và chính chủ hơn."
- "Nếu em quên mật khẩu, hệ thống phải cho em nhập email để gửi link đặt lại mật khẩu, em tự làm chứ không muốn gọi điện nhờ trung tâm hỗ trợ."
- "Mỗi lần em hay bấm đăng nhập bằng Google cho nhanh, nhưng nếu email đó em từng đăng ký bằng mật khẩu rồi thì hệ thống tự gộp lại giúp em nhé, đừng tạo ra hai tài khoản khác nhau."

### Từ Product Owner (góc nhìn bảo mật và vận hành):

- "Sau khi đăng nhập thành công, tuỳ vào vai trò của họ mà hệ thống phải chuyển hướng đúng: Student thì về trang chủ học tập, Tutor thì vào dashboard chấm bài, Admin thì vào trang quản trị."
- "Mật khẩu lúc nhập phải có biểu tượng con mắt để bật/tắt (show/hide visibility) cho người dùng dễ kiểm tra, tránh gõ sai."
- "Để bảo vệ hệ thống khỏi tấn công dò mật khẩu (brute-force), nếu ai đó nhập sai 5 lần liên tiếp thì khoá tạm thời 15 phút. Mỗi tài khoản chỉ cho đăng nhập tối đa 3 phiên (session) cùng lúc, ai đăng nhập máy thứ 4 thì tự động đăng xuất máy cũ nhất."

---

## 3. Các câu hỏi làm rõ phát sinh trong quá trình phân tích (Clarification Questions)

Trước khi viết `spec.md`, nhóm phân tích đã đặt lại các câu hỏi sau cho khách hàng để làm rõ yêu cầu:

1. **Hỏi**: Đối với chức năng Phiên hoạt động (Session) và Refresh Token, Access Token / Refresh Token sẽ được lưu trữ ở đâu trên Client?
   **Trả lời**: Lưu trong Cookie HttpOnly (Chống XSS, tự động đính kèm vào request, bảo mật nhất). Không lưu ở Local Storage.
2. **Hỏi**: Nếu người dùng đăng nhập bằng Google nhưng email đó đã từng được đăng ký bằng mật khẩu trước đây, hệ thống sẽ xử lý thế nào?
   **Trả lời**: Tự động liên kết (merge) tài khoản Google vào tài khoản email cục bộ đã có.
3. **Hỏi**: Tại tính năng Quên mật khẩu, nếu người dùng nhập một email không tồn tại trên hệ thống thì có báo lỗi là "Email không tồn tại" không?
   **Trả lời**: Tuyệt đối không báo lỗi chi tiết. Luôn báo thành công chung chung (ví dụ: "Nếu email hợp lệ, link hướng dẫn đã được gửi") để chống kẻ xấu dò tìm xem email nào đã có tài khoản (Anti-enumeration).
4. **Hỏi**: Thời hạn của các loại token xác thực là bao lâu?
   **Trả lời**: Verification Token để xác nhận email là 24 giờ. Token đặt lại mật khẩu là 1 giờ. Access Token là 15 phút. Refresh Token (Session) là 7 ngày.
