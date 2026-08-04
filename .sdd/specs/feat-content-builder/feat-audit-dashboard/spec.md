# Đặc tả tính năng: Dashboard Kiểm toán (Audit Dashboard)

**Ngày tạo**: 2026-07-27 (Cập nhật theo chuẩn mới)
**Trạng thái**: Final
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone yêu cầu một hệ thống kiểm toán (Audit Dashboard) cho phép Admin theo dõi mọi hoạt động trong hệ thống như đăng nhập, tạo/sửa/xóa tài nguyên (đề thi, tài liệu), và thay đổi vai trò (role) người dùng. Tính năng này giúp giám sát chất lượng nội dung, bảo vệ hệ thống khỏi các truy cập trái phép hoặc hành động đáng ngờ, đồng thời cung cấp công cụ Hoàn tác (Undo) mạnh mẽ để khôi phục nhanh chóng các thay đổi nhầm lẫn liên quan đến tài khoản người dùng.

## 2. Phạm vi

- Ghi nhận và hiển thị lịch sử hoạt động tổng quan (Activity Logs) với phân loại mức độ (normal/suspicious).
- Cung cấp tính năng xem chi tiết thay đổi dữ liệu (Change Logs) với giá trị cũ (`old_value`) và mới (`new_value`).
- Hỗ trợ thao tác Hoàn tác (Undo) đối với các thay đổi liên quan đến User (như `role_changed`, `user_deactivated`, `user_updated`).
- Phân quyền truy cập các API đọc/ghi log chỉ dành cho role `admin`.
- Xử lý tranh chấp dữ liệu (Race Condition) khi thực hiện Undo bằng Database Transaction.

## 3. Ngoài phạm vi

- Hỗ trợ Undo cho các thực thể khác ngoài `users` (ví dụ: không hỗ trợ undo đề thi hoặc tài liệu trong phase này).
- Tự động phát hiện bất thường bằng AI (chỉ dựa vào các rule cố định để đánh dấu `suspicious`).
- Thông báo realtime cho Admin khi có hành động `suspicious` xảy ra (chỉ xem trên Dashboard).

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Quản trị viên (Admin) | Xem toàn bộ danh sách Activity Logs và Change Logs. Lọc log theo mức độ. Thực hiện Undo các thay đổi hợp lệ của User (không được Undo chính mình). |
| Học viên/Giảng viên/Khách | Không có quyền truy cập vào bất kỳ API nào của Audit Dashboard. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Giám sát Hệ thống & Activity Log (Ưu tiên: P1)

Với tư cách là một Admin, tôi muốn xem được lịch sử hoạt động tổng quan của mọi thao tác trong hệ thống và dễ dàng phát hiện các hành động đáng ngờ (Suspicious) để kiểm soát chất lượng và bảo mật.

**Kiểm thử độc lập**: Gọi API `GET /api/v1/admin/activity-logs?severity=suspicious` và xác minh kết quả trả về chỉ chứa các log thuộc nhóm nhạy cảm (như `login_failed`, `role_changed`).

**Kịch bản chấp nhận**:

1. **Cho trước** một user đăng nhập sai nhiều lần, **Khi** Admin truy cập trang Activity Log lọc "suspicious", **Thì** Admin nhìn thấy dòng log `login_failed`.
2. **Cho trước** bảng log có 1000 dòng, **Khi** Admin lọc action="content", **Thì** hệ thống map về các action liên quan (tạo/sửa/xóa đề thi và tài liệu) và trả về danh sách tương ứng.

### Câu chuyện 2 — Change Logs & Hoàn tác dữ liệu (Undo) (Ưu tiên: P2)

Với tư cách là một Admin, tôi muốn xem chi tiết dữ liệu cũ trước khi bị sửa và có khả năng hoàn tác (Undo) các thay đổi đối với tài khoản User để sửa sai ngay lập tức khi phát hiện nhầm lẫn.

**Kiểm thử độc lập**: Gọi API `POST /api/v1/admin/change-logs/:id/undo` với ID của log `role_changed` và xác minh DB trả về Role cũ, đồng thời sinh ra một log `change_reverted` mới.

**Kịch bản chấp nhận**:

1. **Cho trước** một log chuyển Role từ `tutor` sang `admin`, **Khi** Admin ấn Undo, **Thì** hệ thống khóa row bằng `FOR UPDATE`, chuyển Role về lại `tutor`, và log ra hành động `change_reverted`.
2. **Cho trước** Admin thao tác Undo thay đổi trên chính tài khoản của mình, **Khi** gửi request, **Thì** hệ thống từ chối (HTTP 403) báo lỗi không cho phép undo tài khoản của chính mình.
3. **Cho trước** một log cũ nhưng dữ liệu User đó đã bị sửa đổi lần 2 sau khi log đó sinh ra, **Khi** Admin ấn Undo, **Thì** hệ thống từ chối (HTTP 409) do phát hiện xung đột dữ liệu (dữ liệu hiện tại khác với `new_value` của log).

## 6. Trường hợp biên

- Thao tác Undo được gọi đồng thời (Concurrent requests) trên cùng một log ID.
- Dữ liệu `old_value` hoặc `new_value` trong JSONB bị hỏng hoặc null.
- Thực hiện Undo nhưng tài khoản User mục tiêu đã bị xóa vĩnh viễn khỏi hệ thống.
- Độ dài của IP address thay đổi giữa IPv4 và IPv6.

## 7. Quy tắc nghiệp vụ

- **BR-AUD-001 [TARGET]**: Mọi API liên quan đến đọc/ghi log và Undo phải được khóa hoàn toàn và chỉ cho phép role `admin` truy cập.
- **BR-AUD-002 [TARGET]**: Không một Admin nào được phép thực hiện thao tác Undo trên chính tài khoản của mình để tránh leo thang đặc quyền rủi ro.
- **BR-AUD-003 [TARGET]**: Chỉ hỗ trợ tính năng Undo đối với các hành động liên quan đến `users` bao gồm: `role_changed`, `user_deactivated`, `user_updated`.
- **BR-AUD-004 [TARGET]**: Khi thực hiện Undo thành công, hệ thống phải tự động sinh ra một dòng log mới với action là `change_reverted` để đảm bảo tính minh bạch của lịch sử.

## 8. Yêu cầu chức năng

- **FR-AUD-001 [TARGET]**: Hệ thống phải cung cấp API `activity-logs` hỗ trợ lọc theo severity (normal/suspicious). Tự động đánh dấu suspicious cho các hành động như xóa/sửa account, khóa thẻ, login failed.
- **FR-AUD-002 [TARGET]**: Hệ thống phải cung cấp API `change-logs` trả về chi tiết thay đổi gồm `old_value` và `new_value` định dạng JSON.
- **FR-AUD-003 [TARGET]**: API Undo phải bọc logic trong Database Transaction, sử dụng `FOR UPDATE` trên dòng dữ liệu tương ứng để chống Race Condition.
- **FR-AUD-004 [TARGET]**: API Undo phải thực hiện đối chiếu (Current Value == Expected Value từ `new_value` của log). Nếu không khớp, phải từ chối thao tác và ném lỗi HTTP 409.

## 9. Yêu cầu phi chức năng

- **NFR-AUD-001 [TARGET]**: Quá trình lưu log `logAction` không được làm chậm đáng kể các API nghiệp vụ chính (nên xử lý bất đồng bộ hoặc tối ưu truy vấn).
- **NFR-AUD-002 [TARGET]**: JSONB payload cho `old_value` và `new_value` không được chứa thông tin nhạy cảm dạng plaintext như mật khẩu hoặc secret keys.
- **NFR-AUD-003 [TARGET]**: Hệ thống phải ghi nhận chính xác địa chỉ IP của người gọi (hỗ trợ cả IPv4/IPv6).

## 10. Thực thể chính

- **Bảng `audit_logs`**: Lưu lịch sử thay đổi và hoạt động.
  - `id` (PK)
  - `actor_id` (Người thực hiện)
  - `action` (Ví dụ: `test_deleted`, `role_changed`, `change_reverted`)
  - `target_table` (Ví dụ: `mock_tests`, `users`)
  - `target_id`
  - `old_value` (JSONB)
  - `new_value` (JSONB)
  - `ip_address`
  - `can_undo` (BOOLEAN)
  - `undone_at` (TIMESTAMP)

## 11. Tiêu chí thành công

- **SC-AUD-001 [TARGET]**: API sinh log hoạt động mượt mà ở production, lưu chính xác địa chỉ IPv4/IPv6 mà không cản trở flow của người dùng.
- **SC-AUD-002 [TARGET]**: Cơ chế bảo vệ Undo hoạt động an toàn: Test case đồng thời hoặc thay đổi dữ liệu lần 2 chặn 100% các xung đột, trả về HTTP 409.

## 12. Giả định

- Quản trị viên (Admin) được coi là nhóm người dùng có độ tin cậy cao, có thẩm quyền quyết định việc Undo dữ liệu.
- Cấu trúc các entity chính như `users`, `mock_tests` có định dạng schema tương đối ổn định để lưu JSONB log.

## 13. Phụ thuộc

- Module Authentication & Authorization để xác thực quyền `admin`.
- PostgreSQL với khả năng hỗ trợ kiểu dữ liệu JSONB tốt và khóa row `FOR UPDATE`.

## 14. Câu hỏi mở

1. Có chính sách dọn dẹp/lưu trữ (retention policy) nào cho bảng `audit_logs` khi dữ liệu phình to không (ví dụ: tự động xóa log cũ hơn 6 tháng)?
2. Cơ chế ghi log hiện tại có nên áp dụng hàng đợi Message Queue (như Redis/RabbitMQ) để tối ưu performance cho các request tạo log tần suất cao không?
