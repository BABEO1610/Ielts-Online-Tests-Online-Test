# Bối cảnh — Quản trị Người dùng và Phân quyền (User Administration and Authorization)

Trạng thái: Đang áp dụng — Đây là bối cảnh nghiệp vụ chính thức của tính năng Quản lý người dùng dành cho Admin.

## 1. Vấn đề cần giải quyết

Để duy trì tính toàn vẹn và trật tự trên nền tảng IELTSZone, Quản trị viên (Admin) cần một bộ công cụ mạnh mẽ nhằm:
- Theo dõi danh sách toàn bộ người dùng trong hệ thống với các tính năng: tìm kiếm, lọc theo vai trò (Role), lọc theo trạng thái (Status) và phân trang dữ liệu.
- Quản trị phân quyền bằng cách thăng cấp hoặc giáng cấp người dùng (ví dụ: chuyển Học viên thành Giảng viên, hoặc cấp quyền Admin cho một nhân viên mới).
- Xử lý các tài khoản vi phạm (spam, gian lận) bằng cách vô hiệu hóa (`inactive`) hoặc cấm vĩnh viễn (`banned`).
- Giám sát các thiết bị/phiên đăng nhập đang hoạt động (active sessions) của mọi người dùng và chủ động thu hồi (revoke) phiên đăng nhập đáng ngờ.

## 2. Kiến thức chuyên ngành

- **Role-Based Access Control (RBAC):** Mô hình cấp quyền dựa trên vai trò. Ở nền tảng này, mỗi người dùng có một vai trò cụ thể (`student`, `tutor`, `admin`) quyết định ranh giới không gian làm việc mà họ được truy cập.
- **Session Management:** Các hệ thống hiện đại phải duy trì cơ sở dữ liệu các phiên (sessions) để cho phép thu hồi (revoke) lập tức quyền truy cập khi có sự cố, thay vì chỉ dựa vào JWT không thể thu hồi.
- **Tự Bảo vệ (Self-Protection Principle):** Trong quản trị hệ thống, không một quản trị viên nào được phép tự thay đổi quyền hạn hoặc tự khóa tài khoản của chính mình (nhằm tránh tự "khóa cửa" hệ thống - self-lockout).

## 3. Các bên liên quan

- **Quản trị viên (`admin`):** Đối tượng sử dụng module tính năng này.
- **Người dùng bị tác động (Học viên, Giảng viên):** Những người chịu ảnh hưởng trực tiếp từ các quyết định thay đổi trạng thái hoặc quyền hạn.

## 4. Ràng buộc và bảo mật

- **Nguồn chân lý (Source of Truth):** Frontend `ProtectedRoute` chỉ làm nhiệm vụ chặn luồng UX hiển thị, nhưng middleware `authorize('admin')` ở Backend mới là chốt chặn cuối cùng ngăn mọi thao tác thay đổi dữ liệu (mutations).
- **Khóa tự động:** Ngay khi Admin đổi trạng thái người dùng thành `inactive` hoặc `banned`, tất cả các phiên đăng nhập (sessions) hiện tại của người dùng đó phải lập tức bị thu hồi (revoke).
- **Bảo vệ tự chỉnh sửa:** Admin không được gửi yêu cầu thay đổi Role hay Status nhắm vào `user_id` của chính mình. Hành động này phải bị API từ chối (403 Forbidden).
- **Ghi nhật ký (Audit):** Mọi thao tác do Admin thực hiện (đổi quyền, đổi trạng thái, thu hồi session) bắt buộc phải được ghi lại trong Nhật ký kiểm toán (Audit Trail).

## 5. Giả định

- Bảng `users` hỗ trợ lưu trữ các vai trò `student, tutor, admin` và trạng thái `pending, active, inactive, banned`.
- View `v_active_sessions` đã tồn tại để hợp nhất dữ liệu từ `user_sessions` với `users`, loại bỏ các session đã hết hạn hoặc bị thu hồi (revoked).
- Tính năng Audit Log đã hoàn thiện và sẵn sàng để ghi nhận dữ liệu từ module này.

## 6. Quyết định đã chốt

- *Hỏi: Tìm kiếm và lọc người dùng nên diễn ra ở đâu?*
  → Bắt buộc phải là lọc trên máy chủ (Server-side filters) bằng parameterized SQL, vì lý do bảo mật và độ lớn của dữ liệu, không thể tải tất cả người dùng về máy khách.
- *Hỏi: Xóa phiên đăng nhập (Session) sẽ dùng Hard Delete hay Soft Delete?*
  → Soft Delete thông qua việc cập nhật cột `revoked_at`. Bằng cách này, hệ thống vẫn duy trì lịch sử các phiên để đối chiếu bảo mật sau này.
- *Hỏi: Ai có quyền xem danh sách người dùng?*
  → Chỉ có `admin`. Giảng viên (Tutor) không được cấp quyền này (họ sẽ dùng các view danh sách riêng ở tính năng khóa học/bài chấm).

## 7. Ngoài phạm vi

- Cơ chế phân quyền chi tiết (Fine-Grained Permissions) kiểu phân quyền cho phép xem 1 module cụ thể mà không xem module khác. Hiện tại chỉ có quyền tổng quát cấp Role (Admin/Tutor/Student).
- Chức năng Admin tự tạo (Create) người dùng mới với mật khẩu tạo sẵn qua giao diện quản trị (chỉ hỗ trợ chỉnh sửa user đã đăng ký tự động).
- Xuất danh sách người dùng ra định dạng CSV/Excel.
