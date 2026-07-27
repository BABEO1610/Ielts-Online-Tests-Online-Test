# Bối cảnh — Nhật ký Kiểm toán và Lịch sử Thay đổi (Audit Log and Change History)

Trạng thái: Đang áp dụng — Đây là bối cảnh nghiệp vụ chính thức của tính năng Audit Log.

## 1. Vấn đề cần giải quyết

Nền tảng IELTSZone yêu cầu mức độ truy xuất nguồn gốc và minh bạch cao đối với các thao tác quản trị, nhằm:
- Ghi nhận lại mọi thay đổi nhạy cảm trong hệ thống như: Admin đổi Role/Status của người dùng, admin thu hồi phiên đăng nhập, người dùng đổi mật khẩu, hoặc đăng nhập thất bại nhiều lần.
- Cung cấp cho Admin một giao diện để thanh tra (inspect), tìm kiếm và theo dõi các hoạt động đáng ngờ.
- Đặc biệt, hệ thống cần hỗ trợ tính năng hoàn tác (Undo) đối với một số thay đổi quản trị bị thực hiện sai (như đổi nhầm quyền hoặc trạng thái của người dùng), giúp quản trị viên dễ dàng sửa lỗi mà không cần can thiệp trực tiếp vào Database.

## 2. Kiến thức chuyên ngành

- **Nhật ký kiểm toán (Audit Trail):** Là kho lưu trữ bất biến (immutable), chỉ cho phép ghi nối (append-only), mọi hành động thay đổi, cập nhật hay xóa dữ liệu nhạy cảm đều phải sinh ra một bản ghi trong nhật ký này.
- **Kiểm soát phiên bản dữ liệu (Data Versioning):** Các bản ghi audit không chỉ lưu hành động mà còn chụp lại trạng thái dữ liệu (snapshots) trước và sau (old_value / new_value).
- **Hoàn tác (Undo):** Sử dụng `old_value` từ log để phục hồi trạng thái dữ liệu, nhưng không xóa log bị sai, mà tạo thêm một log mới (Undo Log) để giữ nguyên tính lịch sử.

## 3. Các bên liên quan

- **Quản trị viên (`admin`):** Đối tượng sử dụng tính năng này để xem danh sách lịch sử, tìm kiếm, đánh giá và thực hiện thao tác hoàn tác (undo).
- **Hệ thống (System):** Thành phần chạy ngầm (backend services) chịu trách nhiệm tự động sinh ra các dòng log khi các service khác (như thay đổi thông tin người dùng, auth) được gọi.

## 4. Ràng buộc và bảo mật

- **Tính bất biến:** Không có bất kỳ endpoint API nào cho phép sửa hay xóa bản ghi `audit_logs`.
- **Giới hạn hiển thị:** Chỉ có tài khoản mang quyền `admin` mới được truy cập các endpoint lấy dữ liệu audit. Dữ liệu này tuyệt đối không được lộ ra cho học viên hay giảng viên.
- **Hoàn tác an toàn (Safe Undo):**
  - Chỉ cho phép hoàn tác các thay đổi được hỗ trợ (role và status).
  - Không được hoàn tác nếu trạng thái mục tiêu đã bị thay đổi bởi thao tác khác sau đó (dữ liệu đã cũ / stale data).
  - Không cho phép admin hoàn tác một thay đổi do chính admin đó tự nhắm vào mình (self-targeted).

## 5. Giả định

- Bảng `audit_logs` đã được định nghĩa trong CSDL với các cột hỗ trợ việc hoàn tác (như `can_undo`, `undo_log_id`, `undone_by`).
- Các hàm service thực hiện tác vụ nhạy cảm (như đổi quyền, đổi trạng thái, thu hồi session) đã được tích hợp việc gọi `AuditLogService.logAction`.

## 6. Quyết định đã chốt

- *Hỏi: Hành động Undo sẽ xử lý dòng log gốc như thế nào?*
  → Cập nhật cờ `change_reverted` và ghi chú id của log gốc vào, đồng thời tạo mới 1 dòng log "Undo" để minh bạch quá trình sửa sai. Dòng log cũ không bị xóa.
- *Hỏi: Người dùng có xem được lịch sử của chính họ không?*
  → Không. Audit Log là tính năng dành riêng cho quản trị viên (Admin) để phục vụ giám sát vận hành.
- *Hỏi: Có ghi log đối với các tác vụ đọc dữ liệu (GET) không?*
  → Không. Để đảm bảo hiệu suất lưu trữ, tính năng này chỉ ghi log đối với các thao tác thay đổi dữ liệu (Mutations) và các thao tác đăng nhập.

## 7. Ngoài phạm vi

- Lưu trữ nhật ký cho toàn bộ các thao tác không nhạy cảm (như sửa tên, đổi ảnh đại diện cá nhân, xem khóa học).
- Hoàn tác toàn bộ dữ liệu (Database Snapshot Rollback).
- Bảng điều khiển (Dashboard) phân tích, vẽ biểu đồ cho các log này (ngoài phạm vi MVP, hiện tại chỉ hiển thị số đếm cơ bản).
