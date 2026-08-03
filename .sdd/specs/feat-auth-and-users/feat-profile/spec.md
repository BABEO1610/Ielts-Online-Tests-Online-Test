# Đặc tả Chức năng: Hồ sơ Người dùng (User Profile)

**Nhánh tính năng**: `feat-auth-and-users`

**Ngày tạo**: 24-07-2026

**Trạng thái**: Draft

**Đầu vào**: Mô tả của người dùng: "Tạo tài liệu đặc tả tính năng (backfill) từ ứng dụng web đã hoàn thành cho chức năng quản lý hồ sơ, bao gồm xem danh tính tài khoản, chỉnh sửa chi tiết hồ sơ, ảnh đại diện (avatar), điểm IELTS mục tiêu, ngày thi mục tiêu, thiết lập mục tiêu khi mới onboarding, cài đặt bảo mật, đổi mật khẩu và lịch sử hỗ trợ cá nhân."

## Clarifications

### Session 2026-08-02
- Q: Đối với tính năng upload Avatar (lưu local theo ADR-004), giới hạn dung lượng và định dạng cho phép cụ thể là gì để tránh lạm dụng bộ nhớ? → A: Tối đa 5MB, chỉ cho phép JPG/PNG/WebP/GIF

## Kịch bản Người dùng & Kiểm thử *(bắt buộc)*

### Kịch bản 1 - Xem Hồ sơ Cá nhân (Độ ưu tiên: P1)

Với tư cách là người dùng đã đăng nhập, tôi muốn xem danh tính tài khoản, email, vai trò, trạng thái và hồ sơ học tập của mình để xác nhận hệ thống nhận diện tôi chính xác.

**Lý do ưu tiên**: Người dùng cần sự an tâm rằng tiến độ học tập, bài nộp và cài đặt tài khoản được gắn đúng với danh tính của họ.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách đăng nhập và mở khu vực hồ sơ để xác nhận tên, email, vai trò, trạng thái, avatar, điểm mục tiêu và ngày thi mục tiêu hiển thị đúng với dữ liệu tài khoản.

**Kịch bản nghiệm thu**:

1. **Cho trước** một người dùng đã đăng nhập mở trang hồ sơ, **Khi** tài khoản của họ được tìm thấy, **Thì** hệ thống hiển thị danh tính và các trường hồ sơ học tập của họ.
2. **Cho trước** một người dùng không có ảnh đại diện, **Khi** trang hồ sơ được hiển thị, **Thì** hệ thống hiển thị một ảnh đại diện mặc định (placeholder) dựa trên tên của họ.
3. **Cho trước** người dùng chưa đăng nhập, **Khi** họ cố mở khu vực hồ sơ, **Thì** hệ thống yêu cầu đăng nhập trước.

---

### Kịch bản 2 - Cập nhật Hồ sơ Học tập (Độ ưu tiên: P1)

Với tư cách là người học, tôi muốn cập nhật họ tên, ảnh đại diện, điểm IELTS mục tiêu và ngày thi mục tiêu để hồ sơ và trải nghiệm học tập của tôi luôn được cập nhật.

**Lý do ưu tiên**: Điểm mục tiêu và ngày thi mục tiêu thúc đẩy cá nhân hóa và giúp người học luôn nhìn thấy mục tiêu của mình.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách chỉnh sửa các trường hồ sơ, lưu, làm mới trang và xác nhận các giá trị thay đổi vẫn được hiển thị.

**Kịch bản nghiệm thu**:

1. **Cho trước** một người dùng đã đăng nhập thay đổi họ tên hoặc URL ảnh đại diện, **Khi** họ lưu, **Thì** hệ thống cập nhật hồ sơ và xác nhận thành công.
2. **Cho trước** một người dùng đã đăng nhập chọn điểm IELTS mục tiêu hợp lệ, **Khi** họ lưu, **Thì** điểm mục tiêu được lưu trữ và hiển thị.
3. **Cho trước** một người dùng đã đăng nhập thiết lập hoặc xóa ngày thi mục tiêu, **Khi** họ lưu, **Thì** hồ sơ phản ánh lựa chọn ngày thi mục tiêu mới nhất.

---

### Kịch bản 3 - Tải lên Ảnh đại diện (Độ ưu tiên: P2)

Với tư cách là người dùng, tôi muốn tải lên ảnh đại diện để tài khoản cá nhân hóa hơn mà không cần tự cung cấp URL hình ảnh.

**Lý do ưu tiên**: Tính năng upload avatar cải thiện tính tiện dụng của hồ sơ và giảm bớt khó khăn so với việc yêu cầu cung cấp URL thủ công.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách tải lên một hình ảnh được hỗ trợ, nhận URL tải lên, lưu hồ sơ và thấy ảnh đại diện khi tải lại trang.

**Kịch bản nghiệm thu**:

1. **Cho trước** người dùng đã đăng nhập chọn một hình ảnh được hỗ trợ trong kích thước cho phép, **Khi** tải lên thành công, **Thì** hệ thống điền ảnh đại diện vào trường thông tin và nhắc người dùng lưu thay đổi hồ sơ.
2. **Cho trước** một tệp ảnh đại diện được chọn quá lớn hoặc không hợp lệ, **Khi** người dùng cố gắng tải lên, **Thì** hệ thống từ từ chối và giải thích vấn đề.

---

### Kịch bản 4 - Quản lý Cài đặt Bảo mật (Độ ưu tiên: P2)

Với tư cách là người dùng đã đăng nhập, tôi muốn đổi mật khẩu từ khu vực hồ sơ của mình để duy trì bảo mật tài khoản.

**Lý do ưu tiên**: Đổi mật khẩu là thao tác quản lý tài khoản cốt lõi và hỗ trợ người dùng khi nghi ngờ bị lộ thông tin.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách mở cài đặt bảo mật, gửi mật khẩu hiện tại cùng với mật khẩu mới hợp lệ, và sau đó dùng mật khẩu mới cho lần đăng nhập tiếp theo.

**Kịch bản nghiệm thu**:

1. **Cho trước** người dùng đã đăng nhập có mật khẩu cục bộ, **Khi** họ gửi đúng mật khẩu hiện tại và mật khẩu mới khớp với xác nhận, **Thì** mật khẩu được thay đổi và người dùng nhận được xác nhận.
2. **Cho trước** xác nhận mật khẩu mới không khớp, **Khi** người dùng gửi yêu cầu, **Thì** hệ thống ngăn cản thay đổi và hiển thị lỗi không khớp.
3. **Cho trước** người dùng đăng ký qua Google và không có mật khẩu cục bộ, **Khi** họ mở mục đổi mật khẩu, **Thì** hệ thống giải thích rằng họ nên sử dụng tính năng khôi phục mật khẩu để tạo mới.

---

### Kịch bản 5 - Xem Lịch sử Hỗ trợ (Độ ưu tiên: P3)

Với tư cách là người dùng đã đăng nhập, tôi muốn xem các yêu cầu hỗ trợ trước đây và phản hồi của admin để theo dõi xem sự cố của tôi đã được giải quyết chưa.

**Lý do ưu tiên**: Lịch sử hỗ trợ giúp người dùng tự cập nhật trạng thái mà không cần hỏi lại đội ngũ.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách mở lịch sử hỗ trợ và xác nhận mỗi yêu cầu hiển thị nội dung, trạng thái, thời gian tạo và mọi phản hồi từ admin.

**Kịch bản nghiệm thu**:

1. **Cho trước** người dùng có các yêu cầu hỗ trợ, **Khi** họ mở lịch sử hỗ trợ, **Thì** hệ thống liệt kê các yêu cầu cùng trạng thái và phản hồi.
2. **Cho trước** người dùng không có yêu cầu hỗ trợ nào, **Khi** họ mở lịch sử hỗ trợ, **Thì** hệ thống hiển thị trạng thái trống.

### Các trường hợp ngoại lệ (Edge Cases)

- Điểm IELTS mục tiêu phải nằm trong dải điểm chuẩn của IELTS (0.0–9.0) và là bội số của 0.5.
- Các trường không bắt buộc bị để trống (như avatar, ngày thi mục tiêu) vẫn được cho phép mà không chặn việc lưu hồ sơ.
- Các bản tải lên ảnh đại diện vượt quá giới hạn kích thước (5MB) hoặc định dạng không hỗ trợ sẽ bị từ chối trước khi lưu hồ sơ. Định dạng MIME hợp lệ: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Tên field multipart form: `avatar`.
- Việc cập nhật hồ sơ cho một tài khoản không tồn tại sẽ trả HTTP 404 với mã lỗi `NOT_FOUND`.
- Người dùng không thể truy cập hồ sơ hoặc cài đặt bảo mật mà không có phiên đăng nhập hợp lệ. Controller chỉ đọc user id từ `req.user.id` (middleware authenticate), KHÔNG chấp nhận user id từ request body/query.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại trừ khi tài khoản đó không có mật khẩu cục bộ (xác định bằng trường `has_password` trong response profile).
- Lịch sử hỗ trợ có thể trống và vẫn phải render giao diện sử dụng được (empty state thân thiện).
- Avatar upload theo luồng 2 bước: (1) POST /me/avatar → nhận `avatar_url`, (2) PATCH /me với `avatar_url` mới. Nếu user bỏ bước 2, avatar cũ trong DB được giữ nguyên.
- Khi cập nhật hồ sơ, để "xóa" một trường tùy chọn (như `target_test_date`), frontend gửi giá trị `null` rõ ràng. Nếu omit trường, giá trị cũ được giữ nguyên (COALESCE behavior).
- Tên file avatar upload được hệ thống tự động sinh ngẫu nhiên (`crypto.randomBytes`) để tránh xung đột và path traversal.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Hệ thống PHẢI cho phép người dùng đã đăng nhập xem danh tính và các thiết lập học tập của họ bao gồm: `full_name`, `email`, `role`, `status`, `avatar_url`, `target_band_score`, `target_test_date`, `created_at`, `updated_at`, và `has_password` (boolean cho biết tài khoản có mật khẩu cục bộ hay không).
- **FR-002**: Hệ thống PHẢI loại bỏ `password_hash` và các dữ liệu xác thực nhạy cảm khác khỏi dữ liệu hồ sơ trả về cho người dùng. Trường `has_password` được tính từ `!!password_hash` trước khi loại bỏ.
- **FR-003**: Hệ thống PHẢI cho phép người dùng cập nhật họ tên (`full_name`), không được rỗng và tối đa 100 ký tự.
- **FR-004**: Hệ thống PHẢI cho phép người dùng cập nhật ảnh đại diện bằng cách nhập URL hình ảnh hoặc tải lên hình ảnh qua endpoint POST /me/avatar (field name: `avatar`). Sau khi upload thành công, frontend nhận `avatar_url` và phải gọi PATCH /me riêng để lưu vào hồ sơ.
- **FR-005**: Hệ thống PHẢI từ chối việc tải lên các ảnh đại diện vượt quá kích thước 5MB hoặc có định dạng MIME không được hỗ trợ. Chỉ chấp nhận: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- **FR-006**: Hệ thống PHẢI cho phép người dùng đặt, cập nhật hoặc xóa ngày thi mục tiêu. Giá trị `null` explicit xóa ngày hiện tại; omit trường giữ giá trị cũ. Ngày được lưu dạng DATE (không timestamp) để tránh lệch timezone.
- **FR-007**: Hệ thống PHẢI cho phép người dùng đặt điểm IELTS mục tiêu từ 0.0 đến 9.0 với các mức tăng 0.5. Validation phải thực hiện ở cả frontend (form) và backend (service).
- **FR-008**: Hệ thống PHẢI từ chối điểm mục tiêu không hợp lệ kèm theo thông báo rõ ràng cho người dùng (HTTP 400, code `AUTH_PROF_001`).
- **FR-009**: Hệ thống PHẢI làm mới dữ liệu hồ sơ hiển thị sau khi lưu thành công (thông qua AuthContext.refreshUser gọi GET /users/me).
- **FR-010**: Hệ thống PHẢI cho phép người dùng lần đầu hoặc trong quá trình onboarding thiết lập điểm mục tiêu trước khi tiếp tục. Luồng onboarding áp dụng cho student; điều kiện hoàn thành là khi `target_band_score` đã được thiết lập.
- **FR-011**: Hệ thống PHẢI cho phép người dùng đã đăng nhập có mật khẩu cục bộ đổi mật khẩu sau khi xác nhận mật khẩu hiện tại. Tính năng này tái sử dụng auth change-password endpoint, bao gồm kiểm tra lịch sử 3 mật khẩu gần nhất.
- **FR-012**: Hệ thống PHẢI ngăn thay đổi mật khẩu khi mật khẩu mới quá ngắn (< 8 ký tự) hoặc xác nhận mật khẩu mới không khớp. Client-side (ChangePwdModal) chặn trước khi gửi request.
- **FR-013**: Hệ thống PHẢI giải thích cho người dùng chỉ đăng nhập qua Google (không có mật khẩu cục bộ, `has_password = false`) rằng họ nên sử dụng tính năng khôi phục mật khẩu (forgot-password) để tạo mật khẩu mới.
- **FR-014**: Hệ thống PHẢI cho phép người dùng xem lịch sử yêu cầu hỗ trợ của họ (lọc theo email người dùng). Mỗi yêu cầu hiển thị: `subject`, `message`, `status`, `reply_message`, `created_at`, `resolved_at`.

### Các thực thể chính (Key Entities)

- **Profile (Hồ sơ)**: Thông tin tài khoản hướng tới người dùng, bao gồm họ tên, email, ảnh đại diện, vai trò, trạng thái, và mục tiêu học tập.
- **Learning Goal (Mục tiêu Học tập)**: Điểm IELTS mục tiêu và ngày thi mục tiêu tùy chọn, được dùng để cá nhân hóa trải nghiệm học.
- **Avatar Image (Ảnh đại diện)**: Một URL hình ảnh được chọn hoặc một tham chiếu tới ảnh tải lên.
- **Security Setting (Cài đặt Bảo mật)**: Trạng thái kiểm soát việc thay đổi mật khẩu và nhận diện phương thức đăng nhập của tài khoản.
- **Support Request History (Lịch sử Hỗ trợ)**: Nội dung hỗ trợ trước đây của người dùng, trạng thái, timestamp và phản hồi từ admin.

## Tiêu chí Thành công *(bắt buộc)*

### Kết quả có thể đo lường

- **SC-001**: Ít nhất 95% người dùng đã đăng nhập có thể tải hồ sơ (API response GET /users/me) trong dưới 3 giây.
- **SC-002**: Ít nhất 95% cập nhật hồ sơ hợp lệ được lưu và phản ánh sau khi AuthContext refresh trong dưới 5 giây.
- **SC-003**: 100% điểm mục tiêu không hợp lệ bị từ chối trước khi lưu.
- **SC-004**: 100% bản tải lên ảnh đại diện vượt quá kích thước cho phép (5MB) bị từ chối kèm thông báo rõ ràng ("File too large (Max 5MB)").
- **SC-005**: Người dùng có thể cập nhật tên, ảnh, điểm mục tiêu và ngày thi trong dưới 2 phút (UX end-to-end bao gồm upload avatar).
- **SC-006**: 100% nỗ lực đổi mật khẩu với thông tin xác nhận không khớp bị chặn trước khi request được gửi đi (client-side validation ở ChangePwdModal).
- **SC-007**: Người dùng không có lịch sử hỗ trợ sẽ thấy trạng thái trống (empty state) thay vì gặp lỗi.

## Giả định

- Việc quản lý hồ sơ áp dụng cho mọi vai trò đã đăng nhập trừ khi một trang riêng biệt của vai trò đó ghi đè cách hiển thị. Các trường mục tiêu học tập (`target_band_score`, `target_test_date`) chủ yếu dành cho student.
- Email được coi là danh tính tài khoản và không thể chỉnh sửa trong chức năng hồ sơ này.
- Việc tải lên ảnh đại diện và nhập URL ảnh đại diện đều được chấp nhận, nhưng việc "Lưu hồ sơ" sẽ xác nhận lựa chọn ảnh đại diện cuối cùng.
- Mức điểm mục tiêu mặc định có thể được hiển thị để định hướng người dùng, nhưng họ có thể thay đổi mục tiêu.
- Việc tạo yêu cầu hỗ trợ thuộc về chức năng hỗ trợ (feat-support); tính năng này chỉ bao gồm việc xem lịch sử hỗ trợ cá nhân.
- Avatar upload sử dụng Supabase Storage; khi storage không khả dụng, API trả lỗi 500.
- Tính năng đổi mật khẩu từ profile tái sử dụng endpoint auth change-password (feat-auth dependency). AuthContext.refreshUser tái sử dụng endpoint GET /users/me.
- Lịch sử hỗ trợ đọc từ bảng `contact_submissions` và lọc theo email người dùng.
- Tất cả API response profile tuân theo format chuẩn `{ success, data, error, meta }`.
