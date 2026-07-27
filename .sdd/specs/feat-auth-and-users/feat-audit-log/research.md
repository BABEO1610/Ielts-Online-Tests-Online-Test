# Nghiên cứu (Research): Audit Log and Change History

## Quyết định: Giữ nguyên việc lưu trữ audit trong `audit_logs`

**Lý do (Rationale)**: Các migrations hiện tại tạo ra bảng `audit_logs` với actor, action, target, old/new JSONB values, IP address, undo flags, và timestamps. Điều này khớp với đặc tả (spec) mà không cần giới thiệu một bảng mới hay dùng ORM.

**Các giải pháp thay thế đã xem xét**: Tách riêng các bảng cho activity và change-log; bị từ chối vì cả hai views đều là hình chiếu (projections) của cùng một luồng sự kiện (event stream).

## Quyết định: Sử dụng các REST endpoints chỉ dành cho admin

**Lý do**: Các tuyến (routes) hiện tại dưới `/api/v1/admin` đã áp dụng `authenticate` và `authorize('admin')` cho việc lấy danh sách (lists), thống kê (stats), chi tiết (details), và hoàn tác (undo) audit.

**Các giải pháp thay thế đã xem xét**: Filtering ở phía client từ một audit endpoint mở rộng; bị từ chối vì dữ liệu audit là nhạy cảm và việc filtering/pagination phải được đặt ở phía server (server-side).

## Quyết định: Thể hiện các sự kiện đáng ngờ (suspicious events) thông qua phân loại ở cấp độ service (service-level classification)

**Lý do**: `audit.service.js` ánh xạ (maps) các actions được chọn như `login_failed`, `account_locked`, `user_deactivated`, `role_changed`, `password_changed_by_admin`, và `permission_denied` thành mức độ nghiêm trọng suspicious.

**Các giải pháp thay thế đã xem xét**: Lưu severity thành một cột (column) trong database; bị từ chối trong phạm vi hiện tại vì dữ liệu enum/action hiện có đã đủ dùng và giúp tránh việc phải thay đổi cấu trúc bảng (schema churn).

## Quyết định: Chỉ cho phép undo những thay đổi về user role/status được hỗ trợ

**Lý do**: Logic undo hiện tại xây dựng một kế hoạch undo cho user từ `old_value` và `new_value`, khóa dòng audit và target user trong một transaction, từ chối các thay đổi stale/self/unsupported, cập nhật user, chèn dòng `change_reverted`, và đánh dấu source log là undone.

**Các giải pháp thay thế đã xem xét**: Undo dựa trên JSON dùng chung (Generic JSON-based undo) cho tất cả các target tables; bị từ chối vì nó sẽ mang lại rủi ro đảo ngược dữ liệu không an toàn trên các domains không liên quan.

## Quyết định: Đạt hiệu suất truy vấn thông qua indexes và giới hạn phân trang (bounded pagination)

**Lý do**: Các migrations hiện tại đã tạo index cho actor, target, thời gian tạo (created time), `can_undo`, và `undone_at`. Hàm `listAuditLogs` giới hạn số lượng tối đa (clamps limits) ở mức 100.

**Các giải pháp thay thế đã xem xét**: Sử dụng bảng tìm kiếm toàn văn (Full-text search table); bị từ chối cho đến khi lượng dữ liệu audit trong thực tế (operational audit volume) chứng minh rằng các bộ lọc index đơn giản là không đủ.
