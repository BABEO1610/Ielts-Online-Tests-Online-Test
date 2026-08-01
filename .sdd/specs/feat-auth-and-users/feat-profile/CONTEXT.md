# Bối cảnh — Quản lý Hồ sơ Người dùng (User Profile)

Trạng thái: Đang áp dụng — Đây là bối cảnh nghiệp vụ chính thức của tính năng Hồ sơ cá nhân.

## 1. Vấn đề cần giải quyết

Người dùng trong nền tảng IELTSZone (chủ yếu là Học viên) cần một không gian cá nhân để:
- Xem và chỉnh sửa các thông tin cơ bản: Tên hiển thị (full name), Ảnh đại diện (avatar).
- Khai báo và theo dõi mục tiêu học tập cốt lõi của họ: Điểm mục tiêu IELTS (Target Band Score) và Ngày dự thi (Target Test Date).
- Quản lý thiết lập bảo mật: Đổi mật khẩu nếu họ dùng tài khoản cục bộ (local password).
- Theo dõi các vấn đề họ đã gửi cho đội ngũ hỗ trợ: Xem lại lịch sử các yêu cầu hỗ trợ (Support Request) và phản hồi của quản trị viên (Admin replies).

## 2. Kiến thức chuyên ngành

- **Chuẩn hóa dữ liệu IELTS:** Điểm IELTS tổng quát (Band Score) được đo trên thang điểm từ 0.0 đến 9.0 và phải là bước nhảy 0.5. Mọi cập nhật liên quan đến điểm số này đều phải được xác thực theo chuẩn.
- **Xử lý tệp tin (File Upload):** Tải lên ảnh đại diện đòi hỏi cấu hình kiểm tra MIME type (định dạng tệp hỗ trợ), giới hạn dung lượng (giảm thiểu rủi ro bảo mật & chi phí lưu trữ), và các cơ chế tương tác với dịch vụ Object Storage (ví dụ AWS S3, Cloudinary hoặc lưu cục bộ).
- **Phân tách Ranh giới API:** Việc tải tệp lên (`multipart/form-data`) và cập nhật thông tin (`JSON`) thường được tách thành các endpoint khác nhau để xử lý an toàn hơn.

## 3. Các bên liên quan

- **Tất cả người dùng đã xác thực (Học viên, Giảng viên, Quản trị viên):** Được phép sử dụng chức năng Profile để đổi tên và avatar.
- **Học viên (`student`):** Đối tượng chính sử dụng tính năng khai báo mục tiêu học tập (Target Band/Date) để hệ thống cá nhân hóa hành trình luyện thi sau này.

## 4. Ràng buộc và bảo mật

- **Ranh giới Cập nhật:** Các API cập nhật hồ sơ (`/users/me`) không cho phép truyền ID của người dùng vào request body hay query. Định danh phải luôn luôn được lấy từ middleware xác thực (token) để tránh lỗ hổng Insecure Direct Object Reference (IDOR).
- **Bảo vệ Avatar Upload:** Kích thước tệp không được vượt quá 5MB. Chỉ chấp nhận các định dạng ảnh phổ biến (JPG, PNG, WebP).
- **Thay đổi Mật khẩu:** Người dùng bắt buộc phải cung cấp mật khẩu cũ đang sử dụng (current password) mới được phép thiết lập mật khẩu mới. Tài khoản chỉ sử dụng Google OAuth sẽ không được phép gọi API này.

## 5. Giả định

- Bảng `users` đã chứa các cột cần thiết cho việc lưu trữ hồ sơ: `full_name`, `avatar_url`, `target_band_score`, `target_test_date`.
- Hệ thống hỗ trợ xử lý file upload (như thư viện `multer`) đã được cài đặt và thiết lập middleware.
- View hoặc cơ chế truy vấn lịch sử `support.queries` đã sẵn sàng cho việc đọc dữ liệu hỗ trợ cá nhân.

## 6. Quyết định đã chốt

- *Hỏi: Mục tiêu học tập lưu ở đâu?*
  → Lưu trực tiếp trên bảng `users` vì mỗi người dùng hiện tại chỉ cần khai báo một mục tiêu duy nhất ở một thời điểm.
- *Hỏi: Tính năng Avatar hỗ trợ gì?*
  → Hỗ trợ đồng thời việc truyền URL có sẵn (nếu người dùng có link) và tính năng tải tệp lên từ máy tính. Upload sẽ trả về 1 URL, sau đó user phải bấm lưu Profile thì URL đó mới được cập nhật.
- *Hỏi: Lịch sử hỗ trợ có cho phép chỉnh sửa không?*
  → Không. Tính năng này trên trang Profile chỉ ở mức độ Xem (Read-only). Việc tạo mới hoặc trả lời yêu cầu hỗ trợ thuộc về module Contact/Support.

## 7. Ngoài phạm vi

- Hồ sơ công khai (Public Profile) để người dùng khác xem.
- Quản lý ví điện tử, thanh toán hoặc lịch sử khóa học.
- Đổi địa chỉ Email đang sử dụng (vì email được dùng như định danh chính và liên quan đến nhiều luồng hệ thống khác).
