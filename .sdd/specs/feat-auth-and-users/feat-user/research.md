# Nghiên cứu (Research): User Administration and Authorization

## Quyết định: Phân quyền phía backend (Backend authorization) là yếu tố quyết định (authoritative)

**Lý do (Rationale)**: `ProtectedRoute` phía frontend giúp cải thiện điều hướng người dùng (navigation), nhưng các endpoint backend `/api/v1/admin/*` mới thực sự thi hành (enforce) bảo mật thông qua `authenticate` và `authorize('admin')`.

**Các giải pháp thay thế đã xem xét**: Chỉ phân quyền bảo vệ route trên frontend; bị từ chối bởi vì API phải duy trì bảo mật mà không được tin tưởng vào trình duyệt (browser).

## Quyết định: Danh sách người dùng được lọc phía server (server-side filters)

**Lý do**: Truy vấn hiện tại `usersQueries.listUsers` đã hỗ trợ các bộ lọc `page`, `limit`, `role`, `status`, và `search` thông qua parameterized SQL và truy vấn đếm (count query).

**Các giải pháp thay thế đã xem xét**: Tải tất cả user về và lọc ở phía client; bị từ chối vì lý do riêng tư (privacy), quy mô mở rộng (scale), và tính chính xác của phân trang.

## Quyết định: Ngăn chặn tự thay đổi role/status ở service layer

**Lý do**: Các hàm `users.service.changeUserRole` và `changeUserStatus` kiểm tra so sánh id của người thực hiện (actor) và người bị tác động (target) trước khi thực hiện thay đổi dữ liệu (mutation).

**Các giải pháp thay thế đã xem xét**: Chỉ ẩn thao tác tác động vào chính mình (self action) trên UI; bị từ chối vì các lời gọi gọi trực tiếp (direct API calls) cũng phải được bảo vệ.

## Quyết định: Thu hồi phiên đăng nhập (Revoke sessions) sau khi thay đổi role/status

**Lý do**: Lời gọi service hiện tại đã kích hoạt thu hồi session nên các đặc quyền cũ (old privileges) không thể tiếp tục tồn tại sau khi có sự thay đổi từ cấp quản trị (administrative changes).

**Các giải pháp thay thế đã xem xét**: Để sessions hết hạn tự nhiên; bị từ chối vì quyền hạn đã cũ (stale permissions) là một rủi ro bảo mật.

## Quyết định: Chức năng quản lý Session đọc từ view `v_active_sessions`

**Lý do**: View này kết nối (joins) các dòng session đang hoạt động với users và tự động loại trừ các records đã bị thu hồi/hết hạn, điều này hoàn toàn khớp với giao diện active-session của admin.

**Các giải pháp thay thế đã xem xét**: Truy vấn thẳng bảng `user_sessions` trên frontend; bị từ chối vì frontend không được truy cập trực tiếp DB và view giúp tập trung (centralizes) các quy tắc về active-session.

## Quyết định: Ghi nhận các thay đổi có đặc quyền vào nhật ký kiểm toán (audit trail)

**Lý do**: Thay đổi role, thay đổi status, và thu hồi session đều là các hành động admin nhạy cảm đã được ghi log thông qua `audit.service`.

**Các giải pháp thay thế đã xem xét**: Chỉ dựa vào server logs; bị từ chối vì admin UI và các luồng chức năng undo yêu cầu các dòng audit có cấu trúc và bền vững (durable structured audit rows).
