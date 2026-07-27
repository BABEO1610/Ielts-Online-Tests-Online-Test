# RFC: Audit Dashboard & System Logging (feat-audit-dashboard)

**Tài liệu chuẩn bị bảo vệ trước Hội đồng chuyên môn**
**Ngày cập nhật:** 2026-07-27

---

## 1. Phân Tích Luồng Hệ Thống Theo Từng File (Source Code Flow Analysis)

Hệ thống Audit Dashboard được thiết kế theo mô hình **Cross-cutting concern**, nơi một service trung tâm (`audit.service`) đóng vai trò thu thập log từ mọi nơi, và cung cấp API cho Admin giám sát. 

Dưới đây là vai trò chi tiết của từng file trong kiến trúc:

### 1.1. Backend - Data Access & Controller Layer
*   `src/routes/api/v1/admin.routes.js`: Định tuyến (Router) cho các API của Admin Dashboard. Chặn quyền truy cập bằng middleware `authorize(['admin'])`, đảm bảo chỉ Admin mới gọi được các endpoint xem log và undo.
*   `src/controllers/admin.controller.js`: Tiếp nhận HTTP Request từ frontend (query params để phân trang, lọc theo severity). Gọi xuống `audit.service` để lấy dữ liệu, sau đó format HTTP Response trả về client. Xử lý bắt lỗi (catch error) và đẩy cho Global Error Handler.
*   `src/db/queries/audit.queries.js`: Chứa các raw SQL query (dùng `pg`). Cung cấp các hàm tương tác với DB:
    *   `insertAuditLog`: Chèn log mới (nhận `JSONB` cho `old_value`, `new_value`).
    *   `listAuditLogs`: Lọc log kết hợp phân trang, search ILIKE và filter theo target/action.
    *   `markAuditLogUndone`: Đánh dấu một log đã bị hoàn tác (cập nhật `undone_at`).

### 1.2. Backend - Service Layer (Phần Cốt Lõi)
*   **`src/services/audit.service.js`**: **Linh hồn của hệ thống Log.** 
    *   Cung cấp hàm `logAction()` để các service khác gọi vào ghi log.
    *   Phân loại log thành 2 luồng logic: `listActivityLogs` (tính toán `severity: suspicious` dựa trên array `SUSPICIOUS_ACTIONS` như login_failed, role_changed) và `listChangeLogs` (chứa dữ liệu `old_value`, `new_value`).
    *   **Thực thi logic Undo an toàn** (sẽ phân tích kỹ ở mục 2).

### 1.3. Backend - Integration Layer (Các service "Nhúng" log)
Đây là các service thực hiện nghiệp vụ chính, chúng gọi `AuditLogService.logAction()` theo cơ chế **Best-effort** (có `try/catch` bọc lại, nếu lỗi log cũng không làm chết tính năng chính):
*   `test.service.js`: Nhúng log khi Tạo/Sửa/Xóa đề thi. Đặc biệt khi Update/Delete, phải query lấy `oldSnapshot` (title, skill, description...) trước khi thay đổi DB để lưu vào `old_value`.
*   `content.service.js`: Nhúng log khi Admin Duyệt/Từ chối đề thi, tài liệu (`test_reviewed`, `resource_reviewed`).
*   `users.service.js`: Ghi log khi đổi role, khóa/mở khóa tài khoản người dùng (Đây là các action hỗ trợ tính năng Undo).
*   `auth.service.js`: Theo dõi bảo mật: Đăng nhập thành công, đăng nhập thất bại (rất quan trọng cho activity log), đổi mật khẩu.
*   `sessions.service.js`: Ghi nhận việc thu hồi phiên đăng nhập.
*   `tutor.service.js` & `adminTutor.service.js`: Ghi log phân công giảng viên chấm bài, hoặc khi giảng viên chấm bài xong.

### 1.4. Frontend Layer
*   `AdminActivityLogPage.jsx`: Giao diện **giám sát thời gian thực**. Hiển thị các hành động hệ thống. Cung cấp bộ lọc xem nhanh các hành động khả nghi (`severity: suspicious`) để phát hiện tấn công (vd: spam login lỗi).
*   `AdminChangeLogPage.jsx`: Giao diện **quản trị dữ liệu**. Hiển thị bảng so sánh chi tiết Dữ liệu cũ - Dữ liệu mới. Cung cấp nút bấm "Hoàn tác (Undo)" cho các log hợp lệ.

---

## 2. Phần Xử Lý Khó Nhất & Phức Tạp Nhất: Hàm `undoChangeLog`

Nếu hội đồng hỏi phần nào khó nhất, câu trả lời chắc chắn là: **Hàm `undoChangeLog` trong `audit.service.js`**. 

### 2.1. Tại sao nó khó?
Việc "Undo" dữ liệu trong một hệ thống nhiều người dùng (Concurrent System) đối mặt với 2 rủi ro chí mạng:
1.  **Race Condition (Cạnh tranh tranh chấp):** Hai Admin cùng bấm Undo một dòng log cùng 1 mili-giây. Nếu không cẩn thận, hành động undo sẽ chạy 2 lần.
2.  **Lost Update (Ghi đè dữ liệu mất kiểm soát - Conflict):** 
    *   Giả sử: Log cũ lưu "Role từ User -> Tutor". Admin A xem log này.
    *   Trong lúc đó, Admin B đã đổi role người này thành "Admin".
    *   Admin A bấm Undo. Nếu code lấy `old_value` (User) đè thẳng vào DB, ta sẽ vô tình tước quyền Admin mà Admin B vừa cấp. Đây là xung đột dữ liệu.

### 2.2. Giải phẫu Logic xử lý trong `undoChangeLog`
Hàm này giải quyết bài toán trên bằng mô hình **Pessimistic Locking kết hợp Optimistic Verification** bên trong một SQL Transaction khép kín.

**Bước 1: Khởi tạo Transaction & Khóa Log (`Pessimistic Lock`)**
```javascript
await client.query('BEGIN');
const lockedLogResult = await client.query(
    `SELECT id, can_undo, undone_at FROM audit_logs WHERE id = $1 FOR UPDATE`, 
    [sourceLog.id]
);
```
*   `FOR UPDATE` ép Database khóa dòng log này lại ở mức Row-level. Nếu Admin thứ 2 cũng gọi API lúc này, request thứ 2 sẽ phải đứng chờ (block) cho đến khi Transaction 1 kết thúc. Điều này diệt tận gốc rủi ro Double-Undo.

**Bước 2: Khóa Target Record**
```javascript
const currentResult = await client.query(
    `SELECT id, role, status FROM users WHERE id = $1 FOR UPDATE`, 
    [sourceLog.target_id]
);
```
*   Tương tự, khóa dòng dữ liệu của user đang bị thao tác để đảm bảo không ai khác được update user này trong lúc ta đang Undo.

**Bước 3: Xác minh tính toàn vẹn (Optimistic Verification)**
```javascript
if (String(currentUser[undoPlan.field]) !== String(undoPlan.expectedCurrentValue)) {
    throw new AppError('The target has changed again after this log was created...', 409);
}
```
*   Đây là **"Chốt chặn vàng"**. Ta lấy `new_value` của dòng log (tức là giá trị mà ta *nghĩ* là user đang có - `expectedCurrentValue`) so sánh với giá trị *thực tế* trong DB lúc này (`currentUser[undoPlan.field]`). 
*   Nếu chúng khác nhau, chứng tỏ dữ liệu đã bị ai đó sửa sau khi log này được tạo ra -> Ném lỗi `409 Conflict`, từ chối Undo để bảo vệ dữ liệu.

**Bước 4: Thực thi & Ghi Log đệ quy**
*   Update lại user với giá trị `restoreValue` (old_value).
*   Đánh dấu log gốc là `undone_at = NOW()`.
*   Tạo ra một dòng Log mới (`change_reverted`) để ghi nhận chính hành động Undo này. Cuối cùng gọi `COMMIT`.

---

## 3. 10 Câu Hỏi Giả Lập Từ Hội Đồng Chuyên Môn (Kèm Trả Lời)

**Q1: Trong hàm `undoChangeLog`, tại sao em phải dùng lệnh SQL `FOR UPDATE`? Không dùng có sao không?**
> **Trả lời:** Lệnh `FOR UPDATE` tạo ra Pessimistic Lock (khóa bi quan) ở cấp độ dòng (row-level lock) trong PostgreSQL. Nếu không có nó, ta sẽ bị dính lỗi Race Condition. Ví dụ: 2 admin cùng click Undo một log. Cả 2 request cùng đọc thấy log chưa bị undo (`undone_at` is null), cùng vượt qua validation và cùng thực thi update. Điều này làm sai lệch trạng thái logic và sinh ra 2 log `change_reverted` thừa thãi. `FOR UPDATE` ép request đến sau phải đứng chờ request trước commit/rollback xong mới được đọc dữ liệu.

**Q2: Giải thích ý nghĩa của biến `expectedCurrentValue` trong logic Undo. Tại sao em lại trả về HTTP status 409?**
> **Trả lời:** `expectedCurrentValue` chính là `new_value` được lưu trong log. Mục đích là để kiểm tra xem từ lúc log này được tạo ra đến hiện tại, bản ghi đó đã bị thay đổi thêm lần nào nữa chưa. Nếu `giá trị thực tế trong DB !== expectedCurrentValue`, nghĩa là bản ghi đã bị sửa đổi tiếp. Em trả về HTTP 409 (Conflict) để chặn không cho Undo đè lên dữ liệu mới, yêu cầu Admin phải review lại log mới nhất.

**Q3: Tại sao trong `test.service.js` và `content.service.js`, khi gọi `AuditLogService.logAction`, em lại phải bọc nó trong `try { ... } catch (err) { console.warn(...) }`?**
> **Trả lời:** Đây là design pattern "Best-effort Logging". Ghi log là tác vụ phụ (Side-effect). Tác vụ chính là tạo/sửa đề thi. Nếu database gặp trục trặc nhẹ (vd: timeout khi insert log) thì không được phép làm chết tính năng chính của hệ thống. Do đó, em catch lỗi log lại, in ra warning cho developer debug, nhưng luồng chính vẫn return thành công cho user.

**Q4: Khi em gọi `updateReadingTest` (sửa đề thi), làm sao em lấy được `old_value` để truyền vào log?**
> **Trả lời:** Trong hàm `updateReadingTest`, ngay TRƯỚC khi mở Transaction và gọi lệnh `UPDATE`, em thực hiện một câu lệnh `SELECT title, skill, description, difficulty, duration_minutes` để lấy ra "snapshot" metadata hiện tại của đề thi. Snapshot này được gán vào biến `oldSnapshot` và truyền vào `old_value` của hàm `logAction`. 

**Q5: Tại sao ở bảng `audit_logs`, em lại dùng kiểu dữ liệu `JSONB` cho `old_value` và `new_value` mà không tạo các bảng phụ, hay dùng kiểu `JSON` thường?**
> **Trả lời:** Em chọn `JSONB` vì tính linh hoạt (Schema-less). Audit log phải lưu sự thay đổi của rất nhiều bảng khác nhau (users, mock_tests, library_resources...), mỗi bảng có cấu trúc cột hoàn toàn khác biệt. Dùng JSONB giúp gom chung vào 1 bảng duy nhất. So với `JSON` thường, `JSONB` lưu dưới dạng nhị phân, loại bỏ khoảng trắng thừa, parse nhanh hơn và hỗ trợ đánh index để query trực tiếp vào các key bên trong JSON nếu cần (ví dụ tìm tất cả log của email XYZ).

**Q6: Trong hàm format của em có hàm `normalizeIp`. Vấn đề `::ffff:` là gì và tại sao phải xử lý?**
> **Trả lời:** Trong môi trường Node.js (Express), nếu server hỗ trợ IPv6, các kết nối IPv4 từ client thường bị hệ điều hành map sang chuẩn IPv6-mapped-IPv4, có dạng `::ffff:192.168.1.1`. Hàm `normalizeIp` dùng regex xóa chuỗi `::ffff:` đi để lưu và hiển thị trên Dashboard giao diện chuẩn IPv4 cho Admin dễ đọc, đồng thời map `::1` về `127.0.0.1` (localhost).

**Q7: Tại sao cột `severity` (mức độ nghiêm trọng) không được lưu cứng vào database mà lại được tính toán ở tầng `audit.service.js` (dựa trên mảng `SUSPICIOUS_ACTIONS`)?**
> **Trả lời:** Đây là quyết định về Maintainability (Khả năng bảo trì). Định nghĩa thế nào là "khả nghi" có thể thay đổi theo thời gian. Nếu lưu cứng chữ 'suspicious' vào DB, sau này muốn đổi luật (vd: coi `password_changed` cũng là khả nghi), ta phải viết script migrate update lại toàn bộ DB cũ. Bằng cách lưu `action` ở DB và map ra `severity` ở tầng code (Runtime), em có thể thay đổi bộ quy tắc linh hoạt chỉ bằng việc sửa mảng config trong JS.

**Q8: Nếu một user cố tình bypass giao diện, dùng postman gọi API Undo với ID log của chính họ (Undo hành động khóa tài khoản của chính mình). Hệ thống xử lý sao?**
> **Trả lời:** Trong hàm `undoChangeLog`, em có đặt một chốt chặn bảo mật tầng logic (Authorization): 
> `if (sourceLog.target_id === actorId) throw new AppError(..., 403)`. 
> Dù user lấy được token Admin, hệ thống cũng sẽ quăng lỗi 403 Forbidden chặn không cho phép Admin hoàn tác các thay đổi trên chính tài khoản của họ (Anti-conflict of interest).

**Q9: Em có thể Undo hành động Xóa đề thi (`test_deleted`) bằng code hiện tại không? Tại sao?**
> **Trả lời:** Code hiện tại KHÔNG hỗ trợ Undo việc Xóa đề thi (Hard delete). Ở hàm `undoChangeLog`, em đã set điều kiện chặn `if (sourceLog.target_table !== 'users') throw AppError`. 
> Để undo việc xóa, kiến trúc DB phải thiết kế theo kiểu Soft Delete (dùng cột `deleted_at`). Vì bảng `mock_tests` đang dùng CASCADE DELETE xóa thật dữ liệu, ta không thể `UPDATE` khôi phục được mà phải dùng lệnh `INSERT` lại toàn bộ nested data (passages, questions), điều này vượt ngoài phạm vi an toàn của hàm undo hiện tại.

**Q10: Làm sao em truyền được địa chỉ IP (ipAddress) từ request của Frontend xuống tận `test.service.js`?**
> **Trả lời:** Địa chỉ IP được Express middleware tự động parse và gán vào biến `req.ip`. Ở tầng Controller (`adminContent.controller` hoặc `testController`), em lấy `req.ip` ra và truyền nó như là một tham số (argument) phụ bổ sung vào các hàm service. Ví dụ: `contentService.reviewTest(testId, action, actorId, req.ip)`. Sau đó service sẽ truyền IP này xuống hàm `logAction` để ghi vào DB.
