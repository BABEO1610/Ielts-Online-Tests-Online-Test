# Đặc tả Chức năng: Xác thực (Authentication)

**Nhánh tính năng**: `feat-auth-and-users`

**Ngày tạo**: 24-07-2026

**Trạng thái**: Draft

**Đầu vào**: Mô tả của người dùng: "Tạo tài liệu đặc tả tính năng (backfill) từ ứng dụng web đã hoàn thành cho chức năng xác thực, bao gồm đăng ký, xác thực email, đăng nhập, đăng xuất, khôi phục mật khẩu, đổi mật khẩu, làm mới phiên (session refresh), điều hướng dựa trên vai trò, và đăng nhập qua Google."

## Clarifications

### Session 2026-08-02
- Q: Đối với chức năng Phiên hoạt động (Session) và Refresh Token, Access Token / Refresh Token sẽ được lưu trữ ở đâu trên Client? → A: Cookie HttpOnly (Chống XSS, tự động đính kèm vào request, bảo mật nhất)
- Q: Nếu người dùng đăng nhập bằng Google nhưng email đó đã từng được đăng ký bằng mật khẩu trước đây, hệ thống sẽ xử lý thế nào? → A: Tự động liên kết (merge) tài khoản Google vào tài khoản email đã có

## Kịch bản Người dùng & Kiểm thử *(bắt buộc)*

### Kịch bản 1 - Đăng ký và Xác thực Tài khoản (Độ ưu tiên: P1)

Với tư cách là khách, tôi muốn tạo tài khoản bằng email, mật khẩu và họ tên của mình, sau đó xác thực email trước khi sử dụng các tính năng học tập được bảo vệ.

**Lý do ưu tiên**: Tạo tài khoản là bước đầu tiên để người học tham gia và cho phép nền tảng gắn kết quá trình học, bài nộp và phản hồi với một danh tính thực.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách đăng ký với một email mới, nhận hướng dẫn xác thực, mở liên kết xác thực và sau đó đạt đến trạng thái cho phép đăng nhập.

**Kịch bản nghiệm thu**:

1. **Cho trước** khách cung cấp họ tên hợp lệ, email, mật khẩu và xác nhận mật khẩu khớp nhau, **Khi** họ gửi yêu cầu đăng ký, **Thì** hệ thống tạo một tài khoản ở trạng thái chờ (pending) và báo khách kiểm tra email để xác thực.
2. **Cho trước** khách mở một liên kết xác thực hợp lệ, chưa sử dụng và còn hạn, **Khi** việc xác thực được xử lý, **Thì** tài khoản trở thành trạng thái hoạt động (active) và khách được mời đăng nhập.
3. **Cho trước** mật khẩu xác nhận khi đăng ký không khớp, **Khi** khách cố gắng gửi biểu mẫu, **Thì** hệ thống ngăn chặn việc gửi và giải thích rằng mật khẩu không khớp.

---

### Kịch bản 2 - Đăng nhập và Đi tới đúng Không gian làm việc (Độ ưu tiên: P1)

Với tư cách là học viên, giảng viên hoặc admin, tôi muốn đăng nhập an toàn và được đưa đến không gian làm việc (workspace) tương ứng với vai trò của mình.

**Lý do ưu tiên**: Mọi tính năng được bảo vệ đều phụ thuộc vào một trạng thái đăng nhập đáng tin cậy và việc điều hướng đúng theo vai trò.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách đăng nhập dưới từng vai trò và xác nhận mỗi người dùng được đưa đến đúng khu vực dành cho học viên, giảng viên hoặc admin.

**Kịch bản nghiệm thu**:

1. **Cho trước** một tài khoản đang hoạt động (active) với thông tin đăng nhập hợp lệ, **Khi** người dùng đăng nhập, **Thì** hệ thống tạo một phiên xác thực và điều hướng người dùng dựa trên vai trò của họ.
2. **Cho trước** một người dùng đã xác thực quay lại trang đăng nhập, **Khi** phiên hiện tại vẫn còn hiệu lực, **Thì** hệ thống điều hướng họ khỏi form đăng nhập và đưa tới không gian làm việc phù hợp.
3. **Cho trước** người dùng nhập sai thông tin đăng nhập, **Khi** xác thực thất bại, **Thì** hệ thống hiển thị thông báo lỗi chung chung mà không làm lộ việc email đó có tồn tại hay không.

---

### Kịch bản 3 - Khôi phục hoặc Đổi Mật khẩu (Độ ưu tiên: P2)

Với tư cách là người dùng, tôi muốn khôi phục quyền truy cập qua email và đổi mật khẩu khi đã đăng nhập, để tôi có thể tự kiểm soát quyền truy cập tài khoản của mình.

**Lý do ưu tiên**: Khôi phục mật khẩu giúp giảm gánh nặng hỗ trợ mở khóa tài khoản và đổi mật khẩu là kỳ vọng bảo mật cơ bản.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách yêu cầu khôi phục mật khẩu, hoàn tất đặt lại bằng token hợp lệ, sau đó đăng nhập bằng mật khẩu mới; ngoài ra, người dùng đã đăng nhập có thể đổi mật khẩu sau khi xác nhận mật khẩu cũ.

**Kịch bản nghiệm thu**:

1. **Cho trước** khách yêu cầu khôi phục mật khẩu cho bất kỳ email nào, **Khi** yêu cầu được gửi đi, **Thì** hệ thống hiển thị cùng một thông báo thành công chung chung bất kể email đó có tồn tại hay không.
2. **Cho trước** người dùng có một token đặt lại mật khẩu hợp lệ, **Khi** họ gửi mật khẩu mới và xác nhận mật khẩu đáp ứng các quy tắc bảo mật, **Thì** mật khẩu được cập nhật và người dùng được hướng dẫn quay lại trang đăng nhập.
3. **Cho trước** một người dùng đã đăng nhập nhập đúng mật khẩu hiện tại và mật khẩu mới hợp lệ, **Khi** họ lưu thay đổi, **Thì** hệ thống cập nhật mật khẩu và xác nhận thành công.

---

### Kịch bản 4 - Tiếp tục với Google (Độ ưu tiên: P3)

Với tư cách là khách, tôi muốn đăng nhập bằng Google để có thể tham gia nền tảng mà không cần tạo mật khẩu riêng biệt.

**Lý do ưu tiên**: Đăng nhập mạng xã hội tăng tính tiện lợi khi tiếp cận nền tảng nhưng đường dẫn email/mật khẩu vẫn là phương thức truy cập chính.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách chọn đăng nhập Google, chấp thuận luồng xác thực của nhà cung cấp, và xác nhận người dùng được đưa đến không gian làm việc phù hợp.

**Kịch bản nghiệm thu**:

1. **Cho trước** khách chọn đăng nhập bằng Google, **Khi** nhà cung cấp xác nhận một hồ sơ hợp lệ, **Thì** hệ thống tạo mới hoặc cập nhật tài khoản và bắt đầu một phiên xác thực.
2. **Cho trước** phản hồi từ nhà cung cấp không hợp lệ hoặc hết hạn, **Khi** người dùng quay lại trang đăng nhập, **Thì** hệ thống hiển thị lỗi đăng nhập rõ ràng và cho phép thử lại.

### Các trường hợp ngoại lệ (Edge Cases)

- Đăng nhập bằng Google bằng email đã có tài khoản (đăng ký bằng mật khẩu) sẽ tự động liên kết (merge) tài khoản Google vào tài khoản mật khẩu đó. Nếu là tài khoản Google mới, hệ thống sẽ gửi email chào mừng.
- Đăng ký bằng email đã sử dụng sẽ thông báo rõ ràng cho người dùng rằng tài khoản đã tồn tại. Việc ngăn chặn dò tìm tài khoản (Enumeration) bằng thông báo chung chung CHỈ áp dụng cho chức năng khôi phục mật khẩu.
- Tài khoản ở trạng thái `pending`, `banned` không thể hoàn tất đăng nhập (trả về lỗi phân quyền 403). Tài khoản `inactive` cũng không thể đăng nhập cho đến khi được admin kích hoạt lại hoặc tự đổi mật khẩu thành công.
- Các nỗ lực đăng nhập sai liên tục (5 lần) sẽ bị khóa (block) tạm thời trong 15 phút.
- Nếu có phiên đăng nhập thứ tư đang kích hoạt cho cùng một tài khoản, hệ thống sẽ tự động thu hồi phiên cũ nhất (duy trì tối đa 3 phiên).
- Token xác thực/khôi phục bị hết hạn, tái sử dụng hoặc bị thiếu sẽ bị từ chối với thông báo lỗi rõ ràng. Thời hạn token: Verification (24h), Reset Password (1h), Access Token (15m), Refresh Token/Session (7 ngày).
- Người dùng liên kết qua Google (không có mật khẩu cục bộ) sẽ được hướng dẫn dùng tính năng khôi phục mật khẩu thay vì đổi mật khẩu thông thường.
- Người dùng đã đăng xuất hoặc hết hạn phiên sẽ bị chuyển hướng về trang đăng nhập trước khi xem các trang được bảo vệ.
- Khi người dùng `inactive` đặt lại mật khẩu thành công bằng token, hệ thống tự động chuyển trạng thái tài khoản sang `active`.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Hệ thống PHẢI cho phép khách đăng ký với `full_name`, `email` hợp lệ (bất kỳ domain nào), `password` tối thiểu 8 ký tự và xác nhận mật khẩu.
- **FR-002**: Hệ thống PHẢI yêu cầu tài khoản email/mật khẩu mới xác thực email trước khi truy cập các quyền xác thực bình thường (verification token có hạn 24h).
- **FR-003**: Hệ thống PHẢI thông báo rõ ràng lỗi khi người dùng đăng ký bằng email đã tồn tại. Việc ngăn chặn dò tìm tài khoản (Anti-enumeration) CHỈ áp dụng cho chức năng khôi phục mật khẩu.
- **FR-004**: Hệ thống PHẢI cho phép người dùng đang hoạt động (`active`) đăng nhập bằng email và mật khẩu.
- **FR-005**: Hệ thống PHẢI điều hướng người dùng đã xác thực đến không gian làm việc khớp với vai trò hiện tại (Student -> `/`, Tutor -> `/tutor/dashboard`, Admin -> `/admin`).
- **FR-006**: Hệ thống PHẢI từ chối đăng nhập đối với các tài khoản `pending`, `inactive`, `banned` hoặc đang bị khóa tạm thời.
- **FR-007**: Hệ thống PHẢI theo dõi các lần đăng nhập thất bại và khóa tạm thời (15 phút) sau 5 lần đăng nhập thất bại liên tiếp.
- **FR-008**: Hệ thống PHẢI duy trì các phiên người dùng an toàn (sử dụng JWT lưu trong HttpOnly cookie) và hỗ trợ gia hạn tự động qua endpoint `/refresh-token` (kiểm tra refresh token và trạng thái tài khoản active).
- **FR-009**: Hệ thống PHẢI cho phép người dùng đăng xuất (xóa cookie `accessToken` và `refreshToken`) và kết thúc phiên hiện tại.
- **FR-010**: Hệ thống PHẢI giới hạn số lượng phiên hoạt động đồng thời trên mỗi tài khoản là 3 và thu hồi phiên cũ nhất khi vượt quá.
- **FR-011**: Hệ thống PHẢI cho phép khách yêu cầu khôi phục mật khẩu qua email mà không làm lộ việc tài khoản đó có tồn tại hay không (trả về HTTP 200 kèm thông báo chung chung).
- **FR-012**: Hệ thống PHẢI chỉ cho phép đặt lại mật khẩu với một chứng chỉ (token) hợp lệ, chưa sử dụng và chưa hết hạn (thời hạn 1 giờ).
- **FR-013**: Hệ thống PHẢI ngăn người dùng sử dụng lại 3 mật khẩu đã dùng gần nhất trong quá trình đặt lại mật khẩu bằng giao dịch (atomic transaction).
- **FR-014**: Hệ thống PHẢI cho phép người dùng đã đăng nhập (có mật khẩu cục bộ) đổi mật khẩu sau khi xác nhận mật khẩu hiện tại.
- **FR-015**: Hệ thống PHẢI hỗ trợ đăng nhập bằng Google để tạo hoặc truy cập tài khoản, bao gồm xử lý lỗi mạng/callback bằng cách điều hướng về trang đăng nhập với mã lỗi rõ ràng.
- **FR-016**: Hệ thống KHÔNG BAO GIỜ được lộ `password_hash`, mã khôi phục, hay mã bí mật phiên (session secrets) trong bất kỳ phản hồi nào tới người dùng. Token phải được băm SHA-256 trước khi lưu vào database.
- **FR-017**: Hệ thống PHẢI cung cấp tính năng bật/tắt hiển thị mật khẩu tại tất cả các ô nhập mật khẩu trên giao diện (login, register, reset, change password).
- **FR-018**: Hệ thống PHẢI lưu trữ Access Token và Refresh Token sử dụng cơ chế HttpOnly, Secure, SameSite Cookie (Strict cho form login thông thường, Lax cho OAuth callback).

### Các thực thể chính (Key Entities)

- **Account (Tài khoản)**: Danh tính trên nền tảng với email, tên hiển thị, vai trò, trạng thái, ảnh đại diện tùy chọn và trạng thái bảo mật.
- **Session (Phiên hoạt động)**: Một thiết bị hoặc trình duyệt đã đăng nhập liên kết với một tài khoản, bao gồm trạng thái hoạt động và thời gian hết hạn.
- **Verification Credential (Chứng chỉ xác thực)**: Một token có giới hạn thời gian dùng để kích hoạt tài khoản email mới đăng ký.
- **Password Reset Credential (Chứng chỉ Đặt lại Mật khẩu)**: Một token có giới hạn thời gian dùng để chứng minh quyền kiểm soát email trong quá trình khôi phục mật khẩu.
- **Password History Entry (Lịch sử Mật khẩu)**: Bản ghi các thay đổi mật khẩu trước đó dùng để ngăn chặn việc sử dụng lại các mật khẩu cũ kém an toàn.
- **External Login Account (Tài khoản Đăng nhập Ngoài)**: Liên kết giữa tài khoản nền tảng và nhà cung cấp danh tính bên thứ ba (Google).

## Tiêu chí Thành công *(bắt buộc)*

### Kết quả có thể đo lường

- **SC-001**: Ít nhất 95% các đăng ký hợp lệ nhận phản hồi API thành công trong vòng dưới 5 giây (chưa tính độ trễ gửi email thực tế).
- **SC-002**: Ít nhất 95% các lần đăng nhập hợp lệ nhận phản hồi API trong vòng dưới 3 giây.
- **SC-003**: 100% các trang được bảo vệ điều hướng người dùng chưa xác thực về trang đăng nhập trước khi hiển thị nội dung (kiểm thử tự động).
- **SC-004**: 100% các yêu cầu khôi phục mật khẩu hiển thị thông báo chống dò tìm bất kể tài khoản có tồn tại hay không.
- **SC-005**: Các nỗ lực nhập sai mật khẩu 5 lần liên tiếp sẽ bị khóa đăng nhập trong 15 phút.
- **SC-006**: Không người dùng nào duy trì hơn 3 phiên hoạt động cùng một lúc.
- **SC-007**: 100% các nỗ lực đặt lại mật khẩu bằng các chứng chỉ hết hạn, đã sử dụng hoặc không hợp lệ đều thất bại.
- **SC-008**: Người dùng có thể hoàn tất quy trình đặt lại mật khẩu hoặc đổi mật khẩu trong dưới 2 phút (tính từ khi mở form có token hợp lệ).

## Giả định

- Người dùng có quyền truy cập vào hộp thư email liên kết với tài khoản của họ để xác thực và khôi phục mật khẩu.
- Hệ thống chấp nhận bất kỳ địa chỉ email hợp lệ nào theo chuẩn RFC (không giới hạn domain cụ thể).
- Đăng nhập bằng Email/mật khẩu vẫn là đường dẫn xác thực chính; Đăng nhập Google là một phương thức tiện ích bổ sung.
- Vai trò do nền tảng ấn định và quyết định workspace (trang đích) sau khi đăng nhập.
- Thời lượng phiên và thời lượng khóa tài khoản tuân theo chính sách bảo mật đã triển khai trong ứng dụng web.
- Độ mạnh mật khẩu được ép buộc ở mức tối thiểu 8 ký tự trong ứng dụng hiện tại.
