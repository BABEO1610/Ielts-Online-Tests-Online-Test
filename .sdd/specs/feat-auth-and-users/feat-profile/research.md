# Nghiên cứu (Research): User Profile

## Quyết định: Sử dụng `/users/me` làm ranh giới cho hồ sơ (profile boundary)

**Lý do (Rationale)**: Route hiện tại suy ra `userId` từ middleware auth và trả về một đối tượng user an toàn không chứa `password_hash`.

**Các giải pháp thay thế đã xem xét**: Cho phép truyền id của người dùng vào request body/query; bị từ chối vì hiến pháp cấm việc tin tưởng định danh do phía client cung cấp (client input).

## Quyết định: Lưu trữ các mục tiêu học tập (learning goals) trong bảng `users`

**Lý do**: `target_band_score` và `target_test_date` đã tồn tại sẵn trong bảng `users`; các trường này thuộc về hồ sơ lưu trữ lâu dài của người dùng.

**Các giải pháp thay thế đã xem xét**: Tạo một bảng `learning_goals` riêng biệt; bị từ chối trong phạm vi hiện tại vì chỉ cần một mục tiêu (goal) duy nhất cho mỗi user.

## Quyết định: Hỗ trợ cả cung cấp URL cho avatar và upload

**Lý do**: Giao diện (UI) cho phép người dùng nhập một URL hoặc upload một file; tính năng upload sẽ trả về một `avatar_url` mà người dùng sẽ xác nhận khi lưu hồ sơ (saving the profile).

**Các giải pháp thay thế đã xem xét**: Chỉ hỗ trợ upload; bị từ chối vì giao diện và đặc tả (spec) hiện tại đã hỗ trợ dùng URL thủ công.

## Quyết định: Tái sử dụng tính năng đổi mật khẩu (password change) của auth

**Lý do**: Validation khi đổi mật khẩu, cách xử lý Google-only, việc băm (hashing) mật khẩu, và lưu vết (audit logging) hiện đã có trong `auth.service.changePassword`.

**Các giải pháp thay thế đã xem xét**: Viết lặp lại một service xử lý mật khẩu riêng cho tính năng profile; bị từ chối nhằm tránh các hành vi bảo mật không nhất quán.

## Quyết định: Hiển thị lịch sử hỗ trợ (support history) dưới dạng ngữ cảnh hồ sơ chỉ đọc (read-only)

**Lý do**: Đặc tả (Spec) chỉ yêu cầu người dùng có thể xem các yêu cầu hỗ trợ cũ và phản hồi của admin; việc tạo/cập nhật (creation/update) thuộc về tính năng hỗ trợ/liên hệ (support/contact feature).

**Các giải pháp thay thế đã xem xét**: Thêm các endpoints thay đổi dữ liệu (mutation) hỗ trợ riêng cho profile; bị từ chối vì nằm ngoài phạm vi (out of scope).
