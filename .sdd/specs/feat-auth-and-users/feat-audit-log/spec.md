# Đặc tả Chức năng: Nhật ký Hệ thống và Lịch sử Thay đổi (Audit Log and Change History)

**Nhánh tính năng**: `feat-auth-and-users`

**Ngày tạo**: 24-07-2026

**Trạng thái**: Draft

**Đầu vào**: Mô tả của người dùng: "Tạo tài liệu đặc tả tính năng (backfill) từ ứng dụng web đã hoàn thành cho chức năng nhật ký hệ thống (audit logging), bao gồm nhật ký bảo mật/hoạt động, nhật ký thay đổi của admin, bộ lọc, hiển thị các hành động đáng ngờ, xem chi tiết, hoàn tác (undo) các thay đổi được hỗ trợ, và thống kê audit."

## Clarifications

### Session 2026-08-02
- Q: Audit Log sẽ sinh ra lượng dữ liệu rất lớn theo thời gian. Chính sách lưu trữ (retention policy) của hệ thống là gì? → A: Lưu vĩnh viễn trong PostgreSQL chính (Thiết kế đơn giản, chấp nhận DB lớn)

## Kịch bản Người dùng & Kiểm thử *(bắt buộc)*

### Kịch bản 1 - Ghi lại các hành động nhạy cảm (Độ ưu tiên: P1)

Với tư cách là chủ sở hữu nền tảng, tôi muốn các hành động nhạy cảm liên quan đến tài khoản, bảo mật và quản trị được ghi lại để đội ngũ có thể điều tra sự cố và truy cứu trách nhiệm.

**Lý do ưu tiên**: Khả năng kiểm toán là bắt buộc đối với một hệ thống quản trị và định danh an toàn.

**Kiểm thử độc lập**: Có thể kiểm thử hoàn toàn bằng cách thực hiện đăng nhập thất bại, đăng nhập thành công, thay đổi vai trò, thay đổi trạng thái, thay đổi mật khẩu hoặc thu hồi phiên hoạt động và xác nhận mỗi hành động đều tạo ra một mục nhật ký.

**Kịch bản nghiệm thu**:

1. **Cho trước** một người dùng đăng nhập thành công, **Khi** phiên hoạt động bắt đầu, **Thì** hành động đó được ghi lại cùng với người thực hiện (actor), đối tượng chịu tác động (target), thời gian và ngữ cảnh.
2. **Cho trước** một nỗ lực đăng nhập thất bại, **Khi** lỗi này được xử lý, **Thì** sự cố thất bại đó được ghi lại như một sự kiện liên quan đến bảo mật.
3. **Cho trước** một admin thay đổi vai trò hoặc trạng thái của người dùng khác, **Khi** thay đổi thành công, **Thì** giá trị cũ và giá trị mới được ghi lại.
4. **Cho trước** một admin thu hồi một phiên hoạt động, **Khi** việc thu hồi thành công, **Thì** hành động thu hồi đó được ghi lại.

---

### Kịch bản 2 - Theo dõi Nhật ký Hoạt động (Độ ưu tiên: P1)

Với tư cách là admin, tôi muốn xem nhật ký hoạt động và làm nổi bật các sự kiện đáng ngờ để có thể nhanh chóng nhận ra các hành vi rủi ro.

**Lý do ưu tiên**: Admin cần một góc nhìn tổng quan về các lần đăng nhập thất bại, thay đổi quyền hạn, vô hiệu hóa tài khoản và các hoạt động nhạy cảm bảo mật khác.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách mở nhật ký hoạt động, chuyển đổi giữa các bộ lọc tất cả/bình thường/đáng ngờ, và xác nhận các hàng cũng như số lượng được cập nhật chính xác.

**Kịch bản nghiệm thu**:

1. **Cho trước** một admin mở nhật ký hoạt động, **Khi** nhật ký tải xong, **Thì** hệ thống hiển thị thời gian, người thực hiện, hành động, đối tượng chịu tác động, IP, mức độ nghiêm trọng và ghi chú.
2. **Cho trước** một admin lọc theo hoạt động đáng ngờ, **Khi** bộ lọc được áp dụng, **Thì** chỉ các hành động liên quan đến bảo mật và đáng ngờ mới được hiển thị.
3. **Cho trước** không có nhật ký nào khớp, **Khi** bộ lọc được áp dụng, **Thì** hệ thống hiển thị trạng thái trống (empty state).

---

### Kịch bản 3 - Xem lại Lịch sử Thay đổi (Độ ưu tiên: P1)

Với tư cách là admin, tôi muốn kiểm tra nhật ký thay đổi quản trị với các giá trị trước/sau để có thể hiểu chính xác những gì đã thay đổi.

**Lý do ưu tiên**: Lịch sử thay đổi là cần thiết để chẩn đoán các sai sót về quyền hạn hoặc trạng thái tài khoản.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách thay đổi vai trò/trạng thái của một người dùng, mở lịch sử thay đổi, xem chi tiết và xác nhận các trường dữ liệu trước/sau đều hiển thị.

**Kịch bản nghiệm thu**:

1. **Cho trước** một admin mở lịch sử thay đổi, **Khi** nhật ký tải xong, **Thì** hệ thống hiển thị thời gian, admin, hành động, đối tượng tác động và trạng thái.
2. **Cho trước** một admin mở chi tiết một thay đổi, **Khi** chi tiết tải xong, **Thì** hệ thống hiển thị giá trị cũ và mới ở mức độ từng trường (field-level).
3. **Cho trước** một admin tìm kiếm theo hành động, **Khi** tìm kiếm được áp dụng, **Thì** các thay đổi khớp với từ khóa được hiển thị kèm phân trang.

---

### Kịch bản 4 - Hoàn tác (Undo) Thay đổi Người dùng Được hỗ trợ (Độ ưu tiên: P2)

Với tư cách là admin, tôi muốn hoàn tác các thay đổi về vai trò hoặc trạng thái người dùng (nằm trong danh sách hỗ trợ) để có thể khắc phục an toàn những thao tác quản lý tài khoản sai sót.

**Lý do ưu tiên**: Các thay đổi quản trị có thể đảo ngược giúp giảm rủi ro vận hành trong khi vẫn duy trì khả năng truy vết.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách thay đổi vai trò/trạng thái của người dùng, mở chi tiết thay đổi, hoàn tác thay đổi, và xác nhận nhật ký gốc được đánh dấu là đã hoàn tác (undone), đồng thời một nhật ký hoàn tác mới được tạo ra.

**Kịch bản nghiệm thu**:

1. **Cho trước** một nhật ký thay đổi được đánh dấu là có thể hoàn tác (undoable) và chưa bị hoàn tác, **Khi** admin yêu cầu hoàn tác, **Thì** hệ thống khôi phục lại giá trị được hỗ trợ trước đó và đánh dấu nhật ký gốc là đã hoàn tác.
2. **Cho trước** một nhật ký thay đổi không thể hoàn tác, đã được hoàn tác từ trước, hoặc trạng thái của đối tượng đã thay đổi, **Khi** yêu cầu hoàn tác được gửi đi, **Thì** hệ thống từ chối hoàn tác và giải thích lý do.
3. **Cho trước** một admin cố gắng hoàn tác một thay đổi trên chính tài khoản của họ, **Khi** yêu cầu hoàn tác, **Thì** hệ thống từ chối hành động này.

### Các trường hợp ngoại lệ (Edge Cases)

- Lỗi không tạo được audit log được coi là lỗi hệ thống đối với các hành động yêu cầu tính truy vết.
- Các nhật ký có thể có `actor` là system (hệ thống, actor_id = null) khi không có người dùng cụ thể thao tác (ví dụ: cron jobs).
- Một số hành động không có giá trị trước/sau nhưng vẫn cần một dòng nhật ký có thể đọc được (hỗ trợ lưu JSONB).
- Phân loại mức độ nghiêm trọng (severity) chỉ gồm 2 mức: `normal` và `suspicious`. Các hành động `suspicious` (đáng ngờ) bao gồm: `login_failed`, `account_locked`, `user_deactivated`, `role_changed`, `password_changed_by_admin`, và `permission_denied`.
- Chức năng Hoàn tác (Undo) chỉ được hỗ trợ cho các hành động thay đổi trạng thái và vai trò: `role_changed`, `user_deactivated`, `user_updated` (chỉ khi đổi status).
- Chức năng Hoàn tác phát hiện xung đột nếu đối tượng đã bị thay đổi lần nữa (stale state) bằng cách so sánh giá trị hiện tại của user với `new_value` trong log gốc bằng row-level lock (`FOR UPDATE`). Nếu không khớp, từ chối undo.
- Phân trang và bộ lọc vẫn hoạt động ổn định khi lượng nhật ký lớn.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Hệ thống PHẢI ghi lại các hành động hệ thống (auth, admin, content, grading) với người thực hiện, hành động, đối tượng, thời gian, và IP (client IP hoặc proxy IP, được chuẩn hóa về IPv4).
- **FR-002**: Hệ thống PHẢI ghi lại các giá trị cũ và mới bằng định dạng JSONB cho những thay đổi có cập nhật trường dữ liệu (ví dụ: role, status).
- **FR-003**: Hệ thống PHẢI cho phép admin xem nhật ký hoạt động có phân trang (mặc định page=1, limit=20).
- **FR-004**: Hệ thống PHẢI cho phép admin lọc nhật ký hoạt động theo mức độ nghiêm trọng (`normal` hoặc `suspicious`).
- **FR-005**: Hệ thống PHẢI gắn nhãn (label) các hành động audit bằng ngôn ngữ thân thiện (Tiếng Việt, ví dụ: 'Đăng nhập thất bại', 'Sửa đề thi').
- **FR-006**: Hệ thống PHẢI hiển thị các dòng nhật ký hoạt động với thời gian, người thực hiện, hành động, đối tượng, IP, mức độ nghiêm trọng và ghi chú.
- **FR-007**: Hệ thống PHẢI cho phép admin xem nhật ký thay đổi có phân trang (mặc định page=1, limit=20).
- **FR-008**: Hệ thống PHẢI cho phép admin tìm kiếm hoặc lọc nhật ký thay đổi theo hành động.
- **FR-009**: Hệ thống PHẢI cho phép admin mở chi tiết một nhật ký thay đổi với các giá trị trước/sau.
- **FR-010**: Hệ thống PHẢI tóm tắt tổng số thay đổi, số thay đổi có thể hoàn tác, và số thay đổi đã hoàn tác trên trang lịch sử.
- **FR-011**: Hệ thống PHẢI cho phép hoàn tác (undo) chỉ với những thay đổi về người dùng được hỗ trợ (`role_changed`, `user_deactivated`, `user_updated`), có thể hoàn tác (`can_undo=true`) và chưa bị hoàn tác (`undone_at` is null).
- **FR-012**: Hệ thống PHẢI ngăn chặn hoàn tác khi trạng thái của đối tượng không còn khớp với thay đổi đã ghi log, hoặc khi user mục tiêu không còn tồn tại (ví dụ: soft-deleted).
- **FR-013**: Hệ thống PHẢI ngăn chặn admin hoàn tác các thay đổi trên chính tài khoản của họ (ngăn self-undo).
- **FR-014**: Hệ thống PHẢI tạo ra một mục nhật ký audit mới (`change_reverted`) mỗi khi một thay đổi bị hoàn tác, và trả về cho client object `{ source_log, undo_log, target }`.
- **FR-015**: Hệ thống PHẢI giữ nguyên mục nhật ký gốc và chỉ cập nhật metadata (`undone_at`, `undone_by`, `undo_log_id`) thay vì xóa nó.
- **FR-016**: Hệ thống PHẢI cung cấp số liệu thống kê hoạt động cho tổng số nhật ký, nhật ký đáng ngờ và đăng nhập thất bại.

### Các thực thể chính (Key Entities)

- **Audit Log Entry (Mục Nhật ký Kiểm toán)**: Bản ghi bền vững về một hành động nhạy cảm, bao gồm người thực hiện, hành động, đối tượng, ngữ cảnh và thời gian.
- **Activity Log View (Giao diện Nhật ký Hoạt động)**: Giao diện hiển thị thân thiện của các mục nhật ký để theo dõi các sự kiện bình thường và đáng ngờ.
- **Change Log View (Giao diện Nhật ký Thay đổi)**: Giao diện hiển thị thân thiện của các thay đổi quản trị trước/sau.
- **Undo Record (Bản ghi Hoàn tác)**: Một mục nhật ký audit mới ghi lại việc đảo ngược một thay đổi trước đó (nằm trong danh sách hỗ trợ undo).
- **Severity Classification (Phân loại Mức độ Nghiêm trọng)**: Việc phân loại đánh dấu một số hành động là đáng ngờ để admin theo dõi.

## Tiêu chí Thành công *(bắt buộc)*

### Kết quả có thể đo lường

- **SC-001**: 100% các thay đổi vai trò, trạng thái, mật khẩu, đăng nhập thất bại, đăng nhập thành công và thu hồi phiên đều tạo ra một mục nhật ký audit.
- **SC-002**: Admin có thể tải nhật ký hoạt động mới nhất trong dưới 3 giây đối với dung lượng nhật ký bình thường.
- **SC-003**: Admin có thể thấy số lượng hoạt động đáng ngờ và số lần đăng nhập thất bại trong vòng 10 giây kể từ khi mở trang hoạt động.
- **SC-004**: Ít nhất 95% các truy vấn tìm kiếm hành động trong lịch sử thay đổi trả về kết quả đã lọc trong dưới 3 giây.
- **SC-005**: 100% các hành động hoàn tác được hỗ trợ đều giữ nguyên nhật ký gốc và tạo ra một nhật ký hoàn tác riêng.
- **SC-006**: 100% các nỗ lực hoàn tác không được hỗ trợ, bị xung đột, đã hoàn tác rồi hoặc thao tác trên chính mình đều bị từ chối mà không làm thay đổi trạng thái đối tượng.
- **SC-007**: Admin có thể kiểm tra các giá trị trước/sau cho một thay đổi trong dưới 30 giây từ trang lịch sử thay đổi.

## Giả định

- Dữ liệu nhật ký Audit được lưu trữ vĩnh viễn trong cơ sở dữ liệu PostgreSQL chính mà không có cơ chế tự động xóa (retention policy vô hạn), chấp nhận sự gia tăng dung lượng dữ liệu theo thời gian.
- Quyền truy cập vào nhật ký Audit chỉ dành cho admin.
- Nhật ký Audit có tính chất nối thêm (append-only); việc xóa lịch sử nhật ký nằm ngoài phạm vi của tính năng này.
- Chỉ một số thay đổi về vai trò/trạng thái người dùng được chọn lọc mới có thể hoàn tác trong phạm vi hiện tại.
- Các hành động chấm điểm và đánh giá tài liệu cũng có thể xuất hiện trong nhật ký audit, nhưng trọng tâm cốt lõi ở đây là định danh, truy cập và trách nhiệm của admin.
- Ứng dụng coi phân loại "đáng ngờ" (suspicious) như một công cụ hỗ trợ vận hành, không phải là một kết luận gian lận mang tính pháp lý.
