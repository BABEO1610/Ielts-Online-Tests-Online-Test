# Đặc tả Chức năng: Hồ sơ Người dùng (User Profile)

**Nhánh tính năng**: `feat-auth-and-users`

**Ngày tạo**: 24-07-2026

**Trạng thái**: Draft

**Đầu vào**: Mô tả của người dùng: "Tạo tài liệu đặc tả tính năng (backfill) từ ứng dụng web đã hoàn thành cho chức năng quản lý hồ sơ, bao gồm xem danh tính tài khoản, chỉnh sửa chi tiết hồ sơ, ảnh đại diện (avatar), điểm IELTS mục tiêu, ngày thi mục tiêu, thiết lập mục tiêu khi mới onboarding, cài đặt bảo mật, đổi mật khẩu và lịch sử hỗ trợ cá nhân."

## Clarifications

### Session 2026-08-02
- Q: Đối với tính năng upload Avatar (lưu local theo ADR-004), giới hạn dung lượng và định dạng cho phép cụ thể là gì để tránh lạm dụng bộ nhớ? → A: Tối đa 2MB, chỉ cho phép JPG/PNG/WebP

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

- Điểm IELTS mục tiêu phải nằm trong dải điểm chuẩn của IELTS và là bội số của 0.5.
- Các trường không bắt buộc bị để trống (như avatar, ngày thi mục tiêu) vẫn được cho phép mà không chặn việc lưu hồ sơ.
- Các bản tải lên ảnh đại diện vượt quá giới hạn kích thước sẽ bị từ chối trước khi lưu hồ sơ.
- Việc cập nhật hồ sơ cho một tài khoản không tồn tại hoặc không hoạt động (inactive) sẽ bị lỗi một cách an toàn.
- Người dùng không thể truy cập hồ sơ hoặc cài đặt bảo mật mà không có phiên đăng nhập hợp lệ.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại trừ khi tài khoản đó không có mật khẩu cục bộ.
- Lịch sử hỗ trợ có thể trống và vẫn phải render giao diện sử dụng được.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Hệ thống PHẢI cho phép người dùng đã đăng nhập xem danh tính và các thiết lập học tập của họ.
- **FR-002**: Hệ thống PHẢI loại bỏ thông tin mật khẩu và các dữ liệu xác thực nhạy cảm khác khỏi dữ liệu hồ sơ hiển thị cho người dùng.
- **FR-003**: Hệ thống PHẢI cho phép người dùng cập nhật họ tên.
- **FR-004**: Hệ thống PHẢI cho phép người dùng cập nhật ảnh đại diện bằng cách nhập URL hình ảnh hoặc tải lên một hình ảnh được hỗ trợ.
- **FR-005**: Hệ thống PHẢI từ chối việc tải lên các ảnh đại diện vượt quá kích thước 5MB hoặc có định dạng không được hỗ trợ (chỉ chấp nhận JPG/PNG/WebP/GIF).
- **FR-006**: Hệ thống PHẢI cho phép người dùng đặt, cập nhật hoặc xóa ngày thi mục tiêu.
- **FR-007**: Hệ thống PHẢI cho phép người dùng đặt điểm IELTS mục tiêu từ 0.0 đến 9.0 với các mức tăng 0.5.
- **FR-008**: Hệ thống PHẢI từ chối điểm mục tiêu không hợp lệ kèm theo thông báo rõ ràng cho người dùng.
- **FR-009**: Hệ thống PHẢI làm mới dữ liệu hồ sơ hiển thị sau khi lưu thành công.
- **FR-010**: Hệ thống PHẢI cho phép người dùng lần đầu hoặc trong quá trình onboarding thiết lập điểm mục tiêu trước khi tiếp tục.
- **FR-011**: Hệ thống PHẢI cho phép người dùng đã đăng nhập có mật khẩu cục bộ đổi mật khẩu sau khi xác nhận mật khẩu hiện tại.
- **FR-012**: Hệ thống PHẢI ngăn thay đổi mật khẩu khi mật khẩu mới quá ngắn hoặc xác nhận không khớp.
- **FR-013**: Hệ thống PHẢI giải thích phương pháp tạo mật khẩu thay thế cho những người dùng chỉ đăng nhập qua bên thứ 3 (Google).
- **FR-014**: Hệ thống PHẢI cho phép người dùng xem lịch sử yêu cầu hỗ trợ của họ và phản hồi từ admin.

### Các thực thể chính (Key Entities)

- **Profile (Hồ sơ)**: Thông tin tài khoản hướng tới người dùng, bao gồm họ tên, email, ảnh đại diện, vai trò, trạng thái, và mục tiêu học tập.
- **Learning Goal (Mục tiêu Học tập)**: Điểm IELTS mục tiêu và ngày thi mục tiêu tùy chọn, được dùng để cá nhân hóa trải nghiệm học.
- **Avatar Image (Ảnh đại diện)**: Một URL hình ảnh được chọn hoặc một tham chiếu tới ảnh tải lên.
- **Security Setting (Cài đặt Bảo mật)**: Trạng thái kiểm soát việc thay đổi mật khẩu và nhận diện phương thức đăng nhập của tài khoản.
- **Support Request History (Lịch sử Hỗ trợ)**: Nội dung hỗ trợ trước đây của người dùng, trạng thái, timestamp và phản hồi từ admin.

## Tiêu chí Thành công *(bắt buộc)*

### Kết quả có thể đo lường

- **SC-001**: Ít nhất 95% người dùng đã đăng nhập có thể tải hồ sơ của họ trong dưới 3 giây.
- **SC-002**: Ít nhất 95% cập nhật hồ sơ hợp lệ được lưu và phản ánh sau khi refresh trong dưới 5 giây.
- **SC-003**: 100% điểm mục tiêu không hợp lệ bị từ chối trước khi lưu.
- **SC-004**: 100% bản tải lên ảnh đại diện vượt quá kích thước cho phép bị từ chối kèm thông báo rõ ràng.
- **SC-005**: Người dùng có thể cập nhật tên, ảnh, điểm mục tiêu và ngày thi trong dưới 2 phút.
- **SC-006**: 100% nỗ lực đổi mật khẩu với thông tin xác nhận không khớp bị chặn trước khi yêu cầu hoàn tất.
- **SC-007**: Người dùng không có lịch sử hỗ trợ sẽ thấy trạng thái trống (empty state) thay vì gặp lỗi.

## Giả định

- Việc quản lý hồ sơ áp dụng cho mọi vai trò đã đăng nhập trừ khi một trang riêng biệt của vai trò đó ghi đè cách hiển thị.
- Email được coi là danh tính tài khoản và không thể chỉnh sửa trong chức năng hồ sơ này.
- Việc tải lên ảnh đại diện và nhập URL ảnh đại diện đều được chấp nhận, nhưng việc "Lưu hồ sơ" sẽ xác nhận lựa chọn ảnh đại diện cuối cùng.
- Mức điểm mục tiêu mặc định có thể được hiển thị để định hướng người dùng, nhưng họ có thể thay đổi mục tiêu.
- Việc tạo yêu cầu hỗ trợ thuộc về chức năng hỗ trợ; tính năng này chỉ bao gồm việc xem lịch sử hỗ trợ cá nhân.
