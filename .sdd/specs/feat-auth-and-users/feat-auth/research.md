# Nghiên cứu (Research): Authentication

## Quyết định: Tài khoản email/mật khẩu bắt đầu ở trạng thái pending

**Lý do (Rationale)**: Code `createUser` hiện tại chèn (inserts) mặc định role `student` và status `pending`; `verifyEmail` kích hoạt (activates) tài khoản sau khi có một token hợp lệ.

**Các giải pháp thay thế đã xem xét**: Kích hoạt ngay lập tức; bị từ chối vì đặc tả (spec) yêu cầu xác thực email trước khi được truy cập thông thường vào vùng bảo vệ.

## Quyết định: Sử dụng opaque token hashes cho việc xác thực và đặt lại (reset)

**Lý do**: Code hiện tại băm (hashes) các giá trị xác thực/đặt lại được tạo ra bằng `hashOTP` và chỉ lưu `token_hash`, `expires_at`, và `used_at`.

**Các giải pháp thay thế đã xem xét**: Lưu token dạng thô (raw tokens); bị từ chối vì lý do bảo mật.

## Quyết định: JWT access/refresh tokens gắn liền với DB sessions

**Lý do**: Access và refresh token mang các claims về người dùng/session, trong khi đó `authenticate` kiểm tra trạng thái session đang hoạt động thông qua bảng `user_sessions`.

**Các giải pháp thay thế đã xem xét**: Chỉ dùng JWT không trạng thái (stateless JWT); bị từ chối vì tính năng đăng xuất, thu hồi (revocation), và giới hạn session đòi hỏi trạng thái session ở phía server (server-side).

## Quyết định: Tối đa 3 sessions hoạt động cho mỗi người dùng

**Lý do**: Service hiện tại đếm số lượng `v_active_sessions` và thu hồi session cũ nhất trước khi tạo session thứ tư.

**Các giải pháp thay thế đã xem xét**: Số lượng sessions không giới hạn; bị từ chối vì spec và yêu cầu bảo mật quy định số lượng thiết bị hoạt động phải có giới hạn.

## Quyết định: Đăng nhập Google OAuth liên kết tới bản ghi người dùng cục bộ (local user records)

**Lý do**: `handleGoogleCallback` trao đổi mã (code), lấy thông tin hồ sơ Google, upsert vào bảng `users`, lưu vào `oauth_accounts`, và khởi tạo một session được đánh dấu là OAuth.

**Các giải pháp thay thế đã xem xét**: Lưu trữ định danh bên ngoài tách biệt hoàn toàn; bị từ chối vì logic về role/status/workspace phụ thuộc vào bảng `users` cục bộ.

## Quyết định: Chỉ ngăn chặn việc dò tìm tài khoản (account enumeration) ở chức năng khôi phục mật khẩu

**Lý do**: Luồng quên mật khẩu sử dụng một thông báo thành công chung chung bất kể email có tồn tại hay không, giúp ngăn chặn lộ lọt việc tài khoản có tồn tại. Tính năng đăng ký đặc biệt KHÔNG áp dụng mẫu này (FR-003): đăng ký trùng email sẽ trả về HTTP 400 kèm theo thông báo rõ ràng để người dùng biết nên đăng nhập thay vì đăng ký lại. Việc lộ email tồn tại lúc đăng ký là một sự đánh đổi về UX (trải nghiệm người dùng) có chủ ý đã được ghi trong đặc tả.

**Các giải pháp thay thế đã xem xét**: Trả về lỗi chung chung khi đăng ký trùng email; bị từ chối vì FR-003 yêu cầu rõ ràng phải có thông báo rõ ràng nhằm giảm nhầm lẫn cho người dùng cũ khi họ cố gắng đăng ký lại.
