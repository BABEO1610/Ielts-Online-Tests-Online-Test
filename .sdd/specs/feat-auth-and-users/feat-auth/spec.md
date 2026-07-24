# Đặc tả Chức năng: Xác thực (Authentication)

**Nhánh tính năng**: `feat-auth-and-users`

**Ngày tạo**: 24-07-2026

**Trạng thái**: Draft

**Đầu vào**: Mô tả của người dùng: "Tạo tài liệu đặc tả tính năng (backfill) từ ứng dụng web đã hoàn thành cho chức năng xác thực, bao gồm đăng ký, xác thực email, đăng nhập, đăng xuất, khôi phục mật khẩu, đổi mật khẩu, làm mới phiên (session refresh), điều hướng dựa trên vai trò, và đăng nhập qua Google."

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

- Đăng ký bằng email đã sử dụng sẽ trả về thông báo lỗi chung chung, không làm lộ quyền sở hữu tài khoản.
- Tài khoản ở trạng thái pending, inactive (không hoạt động) hoặc banned (cấm) không thể hoàn tất đăng nhập bình thường.
- Các nỗ lực đăng nhập sai liên tục sẽ bị khóa (block) tạm thời.
- Nếu có phiên đăng nhập thứ tư đang kích hoạt cho cùng một tài khoản, hệ thống sẽ thu hồi phiên cũ nhất.
- Token xác thực/khôi phục bị hết hạn, tái sử dụng hoặc bị thiếu sẽ bị từ chối với thông báo lỗi thân thiện.
- Người dùng liên kết qua Google (không có mật khẩu cục bộ) sẽ được hướng dẫn dùng tính năng khôi phục mật khẩu thay vì đổi mật khẩu thông thường.
- Người dùng đã đăng xuất hoặc hết hạn phiên sẽ bị chuyển hướng về trang đăng nhập trước khi xem các trang được bảo vệ.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Hệ thống PHẢI cho phép khách đăng ký với họ tên, email hợp lệ, mật khẩu và xác nhận mật khẩu.
- **FR-002**: Hệ thống PHẢI yêu cầu tài khoản email/mật khẩu mới xác thực email trước khi truy cập các quyền xác thực bình thường.
- **FR-003**: Hệ thống PHẢI ngăn chặn việc dò tìm tài khoản trùng lặp bằng cách sử dụng các thông báo chung chung cho kết quả đăng ký và khôi phục mật khẩu.
- **FR-004**: Hệ thống PHẢI cho phép người dùng đang hoạt động (active) đăng nhập bằng email và mật khẩu.
- **FR-005**: Hệ thống PHẢI điều hướng người dùng đã xác thực đến không gian làm việc khớp với vai trò hiện tại của họ.
- **FR-006**: Hệ thống PHẢI từ chối đăng nhập đối với các tài khoản pending, inactive, banned, đang bị khóa tạm thời hoặc không được phép truy cập nền tảng.
- **FR-007**: Hệ thống PHẢI theo dõi các lần đăng nhập thất bại và khóa tạm thời các trường hợp thất bại liên tục.
- **FR-008**: Hệ thống PHẢI duy trì các phiên người dùng an toàn và hỗ trợ gia hạn (refresh) tự động khi phiên đó vẫn còn hiệu lực.
- **FR-009**: Hệ thống PHẢI cho phép người dùng đăng xuất và kết thúc phiên hiện tại.
- **FR-010**: Hệ thống PHẢI giới hạn số lượng phiên hoạt động đồng thời trên mỗi tài khoản và thu hồi phiên cũ nhất khi vượt quá giới hạn.
- **FR-011**: Hệ thống PHẢI cho phép khách yêu cầu khôi phục mật khẩu qua email mà không làm lộ việc tài khoản đó có tồn tại hay không.
- **FR-012**: Hệ thống PHẢI chỉ cho phép đặt lại mật khẩu với một chứng chỉ (token) hợp lệ, chưa sử dụng và chưa hết hạn.
- **FR-013**: Hệ thống PHẢI ngăn người dùng sử dụng lại các mật khẩu đã dùng gần đây trong quá trình đặt lại mật khẩu.
- **FR-014**: Hệ thống PHẢI cho phép người dùng đã đăng nhập (có mật khẩu cục bộ) đổi mật khẩu sau khi xác nhận mật khẩu hiện tại.
- **FR-015**: Hệ thống PHẢI hỗ trợ đăng nhập bằng Google để tạo hoặc truy cập tài khoản, bao gồm xử lý lỗi rõ ràng khi xác thực phía nhà cung cấp thất bại.
- **FR-016**: Hệ thống KHÔNG BAO GIỜ được lộ mật khẩu, mã khôi phục, hay mã bí mật phiên (session secrets) trong bất kỳ phản hồi nào tới người dùng.

### Các thực thể chính (Key Entities)

- **Account (Tài khoản)**: Danh tính trên nền tảng với email, tên hiển thị, vai trò, trạng thái, ảnh đại diện tùy chọn và trạng thái bảo mật.
- **Session (Phiên hoạt động)**: Một thiết bị hoặc trình duyệt đã đăng nhập liên kết với một tài khoản, bao gồm trạng thái hoạt động và thời gian hết hạn.
- **Verification Credential (Chứng chỉ xác thực)**: Một token có giới hạn thời gian dùng để kích hoạt tài khoản email mới đăng ký.
- **Password Reset Credential (Chứng chỉ Đặt lại Mật khẩu)**: Một token có giới hạn thời gian dùng để chứng minh quyền kiểm soát email trong quá trình khôi phục mật khẩu.
- **Password History Entry (Lịch sử Mật khẩu)**: Bản ghi các thay đổi mật khẩu trước đó dùng để ngăn chặn việc sử dụng lại các mật khẩu cũ kém an toàn.
- **External Login Account (Tài khoản Đăng nhập Ngoài)**: Liên kết giữa tài khoản nền tảng và nhà cung cấp danh tính bên thứ ba (Google).

## Tiêu chí Thành công *(bắt buộc)*

### Kết quả có thể đo lường

- **SC-001**: Ít nhất 95% các đăng ký hợp lệ hiển thị hướng dẫn xác thực email trong vòng dưới 5 giây.
- **SC-002**: Ít nhất 95% các lần đăng nhập hợp lệ truy cập đúng workspace trong vòng dưới 3 giây sau khi gửi yêu cầu.
- **SC-003**: 100% các trang được bảo vệ điều hướng người dùng chưa xác thực về trang đăng nhập trước khi hiển thị nội dung.
- **SC-004**: 100% các yêu cầu khôi phục mật khẩu hiển thị thông báo chống dò tìm bất kể tài khoản có tồn tại hay không.
- **SC-005**: Các nỗ lực nhập sai mật khẩu liên tục sẽ bị khóa hoặc giới hạn lưu lượng (throttle) trong vòng 5 lần thất bại liên tiếp.
- **SC-006**: Không người dùng nào duy trì hơn 3 phiên hoạt động cùng một lúc.
- **SC-007**: 100% các nỗ lực đặt lại mật khẩu bằng các chứng chỉ hết hạn, đã sử dụng hoặc không hợp lệ đều thất bại và không làm đổi mật khẩu.
- **SC-008**: Người dùng có thể hoàn tất quy trình đặt lại mật khẩu hoặc đổi mật khẩu trong dưới 2 phút khi họ có đầy đủ thông tin yêu cầu.

## Giả định

- Người dùng có quyền truy cập vào hộp thư email liên kết với tài khoản của họ để xác thực và khôi phục mật khẩu.
- Đăng nhập bằng Email/mật khẩu vẫn là đường dẫn xác thực chính; Đăng nhập Google là một phương thức tiện ích bổ sung.
- Vai trò do nền tảng ấn định và quyết định workspace (trang đích) sau khi đăng nhập.
- Thời lượng phiên và thời lượng khóa tài khoản tuân theo chính sách bảo mật đã triển khai trong ứng dụng web.
- Độ mạnh mật khẩu được ép buộc ở mức tối thiểu 8 ký tự trong ứng dụng hiện tại.
