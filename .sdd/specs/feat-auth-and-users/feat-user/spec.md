# Đặc tả Chức năng: Quản trị và Phân quyền Người dùng (User Administration and Authorization)

**Nhánh tính năng**: `feat-auth-and-users`

**Ngày tạo**: 24-07-2026

**Trạng thái**: Draft

**Đầu vào**: Mô tả của người dùng: "Tạo tài liệu đặc tả tính năng (backfill) từ ứng dụng web đã hoàn thành cho chức năng quản trị và phân quyền người dùng, bao gồm các bộ bảo vệ vai trò (role guards), danh sách người dùng cho admin, tìm kiếm và bộ lọc, thay đổi vai trò/trạng thái, tự bảo vệ tài khoản của admin, quản lý phiên và thu hồi phiên."

## Clarifications

### Session 2026-08-02
- Q: Nếu Admin hạ vai trò của một Giảng viên (Tutor) xuống thành Học viên (Student), các bài thi đang được giao (assign) cho Giảng viên đó sẽ ra sao? → A: Tự động gỡ bỏ (unassign) các bài chưa chấm để đưa về hàng đợi chung

## Kịch bản Người dùng & Kiểm thử *(bắt buộc)*

### Kịch bản 1 - Bảo vệ Các Khu vực Theo Vai trò (Độ ưu tiên: P1)

Với tư cách là chủ sở hữu nền tảng, tôi muốn học viên, giảng viên và admin chỉ được truy cập vào những khu vực được phép cho vai trò của họ, để đảm bảo các chức năng quản lý nhạy cảm được bảo vệ.

**Lý do ưu tiên**: Việc thực thi vai trò là ranh giới an toàn giữa các khu vực học tập bình thường, công việc của giảng viên và việc quản trị hệ thống.

**Kiểm thử độc lập**: Có thể kiểm thử hoàn toàn bằng cách đăng nhập vào từng vai trò và cố gắng truy cập vào các khu vực của học viên, giảng viên và admin.

**Kịch bản nghiệm thu**:

1. **Cho trước** một học viên đã đăng nhập cố gắng mở một khu vực dành riêng cho admin hoặc giảng viên, **Khi** quyền truy cập được kiểm tra, **Thì** quyền truy cập bị từ chối hoặc người dùng bị điều hướng đến khu vực hợp lệ.
2. **Cho trước** một giảng viên đã đăng nhập mở không gian làm việc của giảng viên, **Khi** quyền truy cập được kiểm tra, **Thì** không gian làm việc hiển thị bình thường.
3. **Cho trước** một admin đã đăng nhập mở bảng điều khiển admin, **Khi** quyền truy cập được kiểm tra, **Thì** khu vực admin hiển thị bình thường.

---

### Kịch bản 2 - Tìm kiếm và Lọc Người dùng (Độ ưu tiên: P1)

Với tư cách là admin, tôi muốn duyệt, tìm kiếm, lọc và phân trang qua danh sách người dùng để có thể nhanh chóng tìm thấy các tài khoản cần xem xét.

**Lý do ưu tiên**: Việc quản trị người dùng bắt đầu từ việc tìm kiếm đúng tài khoản một cách đáng tin cậy và an toàn.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách mở phần quản lý người dùng, áp dụng các bộ lọc vai trò/trạng thái/tìm kiếm, di chuyển giữa các trang và xác nhận bảng dữ liệu được cập nhật đúng.

**Kịch bản nghiệm thu**:

1. **Cho trước** một admin mở quản lý người dùng, **Khi** danh sách tải xong, **Thì** hệ thống hiển thị người dùng cùng với tên, email, vai trò, trạng thái và ngày tạo.
2. **Cho trước** một admin tìm kiếm theo tên hoặc email, **Khi** lệnh tìm kiếm được áp dụng, **Thì** chỉ những người dùng khớp mới được hiển thị.
3. **Cho trước** một admin lọc theo vai trò hoặc trạng thái, **Khi** bộ lọc được áp dụng, **Thì** danh sách chỉ hiển thị những người dùng khớp với tiêu chí đã chọn.
4. **Cho trước** có nhiều người dùng hơn mức có thể hiển thị trên một trang, **Khi** admin chuyển trang, **Thì** hệ thống hiển thị đúng trang danh sách người dùng đó.

---

### Kịch bản 3 - Thay đổi Vai trò hoặc Trạng thái Người dùng (Độ ưu tiên: P1)

Với tư cách là admin, tôi muốn cập nhật vai trò hoặc trạng thái tài khoản của người dùng khác để có thể cấp quyền truy cập giảng viên/admin hoặc hạn chế các tài khoản không an toàn.

**Lý do ưu tiên**: Các thay đổi về vai trò và trạng thái trực tiếp kiểm soát quyền truy cập và trách nhiệm vận hành trên nền tảng.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách chọn một người dùng khác, thay đổi vai trò và trạng thái, lưu, và xác nhận dòng dữ liệu người dùng phản ánh giá trị mới.

**Kịch bản nghiệm thu**:

1. **Cho trước** một admin chọn một người dùng khác, **Khi** họ đổi vai trò của người dùng đó và lưu lại, **Thì** người dùng nhận được vai trò mới và các phiên hoạt động hiện tại của người đó bị chấm dứt.
2. **Cho trước** một admin chọn một người dùng khác, **Khi** họ đổi trạng thái của người dùng đó thành inactive (không hoạt động) hoặc banned (cấm), **Thì** người dùng nhận được trạng thái mới và các phiên hoạt động hiện tại bị chấm dứt.
3. **Cho trước** một admin cố gắng tự sửa vai trò hoặc trạng thái của chính mình, **Khi** họ gửi yêu cầu thay đổi, **Thì** hệ thống từ chối hành động.

---

### Kịch bản 4 - Quản lý Các Phiên Hoạt động (Độ ưu tiên: P2)

Với tư cách là admin, tôi muốn kiểm tra các phiên hoạt động và thu hồi (revoke) các phiên đáng ngờ để có thể phản ứng nhanh chóng với các hoạt động đăng nhập bị lộ hoặc thay đổi vai trò/trạng thái.

**Lý do ưu tiên**: Tính năng thu hồi phiên cấp cho admin quyền kiểm soát vận hành trực tiếp sau khi có hành vi đáng ngờ.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách mở danh sách các phiên hoạt động, lọc/tìm kiếm theo người dùng hoặc loại đăng nhập, thu hồi một phiên, và xác nhận phiên đó biến mất khỏi danh sách.

**Kịch bản nghiệm thu**:

1. **Cho trước** một admin mở danh sách phiên hoạt động, **Khi** danh sách tải xong, **Thì** hệ thống hiển thị người dùng, email, thiết bị, IP, kiểu đăng nhập, hoạt động cuối cùng và thời gian hết hạn.
2. **Cho trước** một admin lọc các phiên theo đăng nhập mật khẩu hoặc bên ngoài (External), **Khi** bộ lọc được áp dụng, **Thì** chỉ các phiên khớp mới được hiển thị.
3. **Cho trước** một admin thu hồi một phiên hoạt động, **Khi** thao tác thành công, **Thì** phiên đó không còn có thể sử dụng được nữa.

### Các trường hợp ngoại lệ (Edge Cases)

- Nếu một Giảng viên (Tutor) bị giáng quyền xuống Học viên (Student), mọi bài thi đang được giao (assigned) cho họ chưa chấm xong sẽ tự động bị gỡ bỏ (unassigned) và đưa về hàng đợi chung.
- Người dùng không phải admin không thể truy cập quản lý người dùng, quản lý phiên hoặc các tính năng kiểm soát chỉ dành cho admin. Nếu cố truy cập route API sẽ nhận HTTP 403 `AUTH_PERM_001`; nếu truy cập UI sẽ bị `ProtectedRoute` điều hướng. Nếu user có role không xác định (ví dụ `user` legacy), cũng sẽ bị từ chối truy cập.
- Admin không thể tự đổi vai trò hoặc trạng thái của chính mình. Cơ chế tự bảo vệ (self-protection) được thực thi ở cả tầng Controller và Service để đảm bảo an toàn tuyệt đối, trả về lỗi 403 `AUTH_PERM_001`.
- Thay đổi vai trò hoặc trạng thái (thành inactive/banned) sẽ tự động gọi hàm `revokeAllSessionsForUser` để chấm dứt các phiên hoạt động hiện tại (thiết lập `revoked_at = NOW()`).
- Các tìm kiếm (search) danh sách người dùng sử dụng `ILIKE` (case-insensitive) áp dụng cho cả `full_name` và `email`.
- Các tìm kiếm hoặc lọc không có kết quả, hoặc khi admin yêu cầu trang phân trang (page) vượt quá tổng số bản ghi, sẽ trả về mảng rỗng và hiển thị trạng thái trống (empty state) thay vì bị lỗi. Mặc định phân trang là `page = 1, limit = 10`.
- Thu hồi một phiên (session) thủ công bằng API `DELETE /admin/sessions/:id`. Nếu session không tồn tại hoặc đã bị thu hồi trước đó, API sẽ trả về HTTP 404 lỗi `SES_ADM_001`.
- Khi thay đổi role/status mà giá trị truyền lên giống hệt giá trị hiện tại ở database, API vẫn thực hiện xử lý và ghi log bình thường.
- API cập nhật role và status sử dụng method `PUT`. Trước khi cập nhật, service phải kiểm tra người dùng mục tiêu có tồn tại hay không (trả về 404 nếu không).
- Danh sách active sessions được lấy từ view `v_active_sessions` (đã join với bảng users), không select trực tiếp từ bảng `user_sessions`. Device info hiển thị cho admin được parse từ chuỗi `user_agent`.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Hệ thống PHẢI thực thi kiểm soát truy cập dựa trên vai trò (`student`, `tutor`, `admin`). Backend sử dụng middleware `authorize` (hỗ trợ array roles), frontend sử dụng `ProtectedRoute`. Ngoài ra middleware `authenticate` cũng phải kiểm tra trạng thái active/inactive của user.
- **FR-002**: Hệ thống PHẢI từ chối cấp quyền truy cập khu vực quản lý admin cho những người dùng không phải admin.
- **FR-003**: Hệ thống PHẢI cho phép admin xem danh sách người dùng có phân trang (trả về meta data gồm `{ page, limit, total }`).
- **FR-004**: Hệ thống PHẢI cho phép admin tìm kiếm người dùng theo tên hoặc email (truy vấn ILIKE).
- **FR-005**: Hệ thống PHẢI cho phép admin lọc người dùng theo vai trò (`student`, `tutor`, `admin`) và trạng thái tài khoản (`pending`, `active`, `inactive`, `banned`).
- **FR-006**: Hệ thống PHẢI hiển thị các trường: vai trò (`role`), trạng thái (`status`), `email`, tên hiển thị (`full_name`) và ngày tạo (`created_at`) trong danh sách người dùng. Trường `password_hash` PHẢI bị loại bỏ khỏi mọi response danh sách.
- **FR-007**: Hệ thống PHẢI cho phép admin đổi vai trò của một người dùng khác (chỉ sang các vai trò: `student`, `tutor`, `admin`).
- **FR-008**: Hệ thống PHẢI cho phép admin đổi trạng thái tài khoản của một người dùng khác (chỉ sang các trạng thái: `pending`, `active`, `inactive`, `banned`).
- **FR-009**: Hệ thống PHẢI ngăn không cho admin thay đổi vai trò hoặc trạng thái của chính mình (actor id lấy từ `req.user.id`).
- **FR-010**: Hệ thống PHẢI tự động chấm dứt các phiên đang kích hoạt (thiết lập `revoked_at = NOW()`) khi vai trò của một người dùng thay đổi.
- **FR-011**: Hệ thống PHẢI tự động chấm dứt các phiên đang kích hoạt (thiết lập `revoked_at = NOW()`) khi trạng thái của người dùng trở thành inactive hoặc banned.
- **FR-012**: Hệ thống PHẢI cho phép admin xem các phiên đang kích hoạt với thông tin: người dùng (`user`/`full_name`), `email`, thiết bị (`device` parse từ user_agent), IP (`ip_address`), kiểu đăng nhập (`is_oauth`/`oauth_provider`), thời gian hoạt động (`last_active_at`) và thời gian hết hạn (`expires_at`).
- **FR-013**: Hệ thống PHẢI cho phép admin chủ động thu hồi một phiên hoạt động cụ thể (thiết lập `revoked_at = NOW()`).
- **FR-014**: Hệ thống PHẢI lưu vết (record) việc thay đổi vai trò, trạng thái và thu hồi phiên quản trị vào nhật ký hệ thống (audit trail) kèm theo tham số scope `sensitive: true` và dữ liệu `old_data`, `new_data`.
- **FR-015**: Hệ thống PHẢI trả về các lỗi quyền truy cập rõ ràng (HTTP 403, code `AUTH_PERM_001`) khi người dùng không đủ quyền thực hiện một thao tác.
- **FR-016**: Hệ thống PHẢI tự động thu hồi (unassign) các bài kiểm tra chưa chấm của Giảng viên và đưa vào hàng đợi chung nếu Giảng viên đó bị thay đổi vai trò xuống Học viên. Logic này yêu cầu tương tác chéo module (cross-module interaction).

### Các thực thể chính (Key Entities)

- **User Account (Tài khoản Người dùng)**: Một danh tính người dùng hoặc hệ thống với vai trò, trạng thái, hồ sơ và vòng đời tài khoản.
- **Role (Vai trò)**: Một danh mục quyền hạn như học viên, giảng viên hoặc admin quyết định các khu vực và hành động có thể truy cập.
- **Account Status (Trạng thái Tài khoản)**: Trạng thái vòng đời quyết định xem tài khoản có thể truy cập nền tảng hay không.
- **Admin Action (Hành động Quản trị)**: Một sự thay đổi có đặc quyền được thực hiện bởi admin đối với vai trò, trạng thái hoặc phiên của người dùng khác.
- **Active Session (Phiên Hoạt động)**: Một instance đăng nhập đang hợp lệ có thể được xem xét và thu hồi.

## Tiêu chí Thành công *(bắt buộc)*

### Kết quả có thể đo lường

- **SC-001**: 100% các trang chỉ dành cho admin từ chối truy cập từ các người dùng không phải admin.
- **SC-002**: Admin có thể tìm thấy một người dùng qua email hoặc tên đầy đủ trong dưới 30 giây (tính từ lúc bắt đầu nhập search keyword).
- **SC-003**: Ít nhất 95% API search/filter danh sách người dùng trả về kết quả trong dưới 3 giây.
- **SC-004**: 100% các thay đổi vai trò thành công đều được phản ánh trong danh sách người dùng sau khi tải lại trang.
- **SC-005**: 100% các thay đổi trạng thái thành inactive hoặc banned thành công đều ngăn tài khoản bị ảnh hưởng tiếp tục truy cập (thông qua authenticate middleware).
- **SC-006**: 100% các nỗ lực tự sửa vai trò/trạng thái của admin bị từ chối ở cả API và UI.
- **SC-007**: Admin có thể thu hồi một phiên được chọn trong dưới 10 giây (tính từ lúc nhấn nút revoke đến khi UI cập nhật lại danh sách).

## Giả định

- Các vai trò được hỗ trợ trên nền tảng dành cho service layer là: `student`, `tutor` và `admin`. Database enum có thêm giá trị `user` nhưng đó là legacy và không hiển thị cho phép gán ở Admin UI.
- Trạng thái tài khoản bao gồm `pending`, `active`, `inactive` và `banned`.
- Admin quản lý người dùng khác nhưng không trực tiếp tạo người dùng trong tính năng này; việc tạo tài khoản thuộc về `feat-auth`.
- Hành vi xem chi tiết audit log và hoàn tác thuộc về tính năng `feat-audit-log`, trong khi tính năng này phụ thuộc vào `AuditLogService` để tạo log truy vết cho các hành động có đặc quyền.
- Việc kiểm soát quyền truy cập liên kết chặt chẽ với auth middleware được định nghĩa trong `feat-auth`.
- Mọi API response của controller admin phải tuân thủ nghiêm ngặt định dạng chuẩn: `{ success, data, error, meta }`.
