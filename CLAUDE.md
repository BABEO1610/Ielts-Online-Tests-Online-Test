# CLAUDE.md — Tính năng Admin (Nền tảng luyện thi IELTS)

## Tổng quan dự án

Đây là nền tảng luyện thi IELTS online có 5 loại người dùng: Guest, Student, Tutor, Admin, AI System.
File này mô tả riêng phần **Admin** — người có quyền cao nhất trong hệ thống.

**Stack công nghệ:**
- Frontend: React + TypeScript + Tailwind CSS + React Router v6 + TanStack Query + Recharts
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL (dùng thư viện `pg`, viết raw SQL — không dùng ORM)
- Auth: JWT (access token 15 phút + refresh token 7 ngày)

**Quy tắc quan trọng khi code:**
- Chỉ chỉnh sửa code liên quan đến Admin, không được đụng vào phần Student, Tutor, Guest, AI System trừ khi có yêu cầu rõ ràng.
- Mọi API của Admin đều phải đi qua 2 middleware: xác thực JWT và kiểm tra role là ADMIN.
- Không dùng ORM — chỉ viết raw SQL với `pg`.
- Không dùng `any` trong TypeScript.

---

## Các màn hình và chức năng

### 1. Dashboard tổng quan (ADM-01)

Admin vào trang chủ thì thấy ngay các con số quan trọng của hệ thống:
- Tổng số người dùng đã đăng ký (kèm % tăng/giảm so với tuần trước).
- Số đề thi đang được publish.
- Số lần AI được gọi trong tháng và chi phí ước tính (USD).
- Danh sách 20 hoạt động gần nhất trong hệ thống (ai làm gì, lúc nào).

Dữ liệu trên dashboard tự động làm mới sau mỗi 60 giây, hoặc admin nhấn nút Refresh thủ công.

---

### 2. Quản lý người dùng

#### 2a. Xem danh sách người dùng (ADM-02)

Hiển thị bảng danh sách tất cả tài khoản trong hệ thống với các thông tin: ID, họ tên, email, role, trạng thái, ngày đăng ký.

Admin có thể:
- Tìm kiếm theo tên hoặc email.
- Lọc theo role (Guest / Student / Tutor / Admin) và trạng thái (Active / Inactive).
- Sắp xếp theo tên hoặc ngày đăng ký.
- Phân trang, mặc định 20 người mỗi trang.
- Nhấn vào một dòng để xem chi tiết tài khoản đó.

#### 2b. Tạo và chỉnh sửa tài khoản (ADM-03)

Admin có thể tạo tài khoản mới bằng cách điền: họ tên, email, mật khẩu, role.
Sau khi tạo xong, hệ thống tự gửi email chào mừng đến người dùng mới.

Admin cũng có thể chỉnh sửa thông tin của tài khoản bất kỳ: tên, email, role, điểm mục tiêu (với Student).
Khi đổi role, hệ thống hiện hộp thoại xác nhận trước khi thực hiện, và hành động này được ghi vào Audit Log ngay lập tức.

**Giới hạn:** Admin không được tự đổi role của chính mình, và không được hạ cấp Admin cuối cùng còn lại trong hệ thống.

#### 2c. Khoá, mở khoá, xoá tài khoản (ADM-04)

- **Deactivate (Khoá):** Tài khoản bị khoá sẽ không đăng nhập được, nhưng toàn bộ dữ liệu vẫn còn nguyên.
- **Activate (Mở khoá):** Khôi phục tài khoản đã bị khoá.
- **Delete (Xoá):** Xoá cứng, yêu cầu admin gõ chữ `DELETE` vào ô xác nhận mới thực hiện được. Khi xoá, thông tin cá nhân bị xoá nhưng lịch sử làm bài thi vẫn được giữ lại dạng ẩn danh để phục vụ thống kê.

**Giới hạn:** Admin không được tự khoá hoặc xoá tài khoản của chính mình.

Tất cả thao tác khoá, mở khoá, xoá đều được ghi vào Audit Log.

---

### 3. Báo cáo và thống kê (ADM-05)

Admin có thể xem 3 loại báo cáo, lọc theo khoảng thời gian tùy chọn (hôm nay / 7 ngày / 30 ngày / tùy chỉnh):

- **Báo cáo tăng trưởng người dùng:** Số người đăng ký mới mỗi ngày, chia theo role (Student, Tutor).
- **Báo cáo lượt làm bài thi:** Số lượt thi theo từng đề, điểm trung bình của mỗi đề.
- **Báo cáo sử dụng AI:** Số lần gọi AI mỗi ngày, chia theo tính năng (chấm Writing, chấm Speaking, Chatbot, Explain with AI) và chi phí tương ứng.

Mỗi báo cáo hiển thị dạng biểu đồ (dùng Recharts) kèm bảng tổng hợp phía dưới.
Admin có thể xuất báo cáo ra file CSV hoặc PDF.

---

### 4. Nhật ký hoạt động hệ thống — Audit Log (ADM-06)

Hệ thống tự động ghi lại mọi hành động quan trọng: đăng nhập/đăng xuất, đổi role, tạo/sửa/xoá tài khoản, publish/unpublish đề thi, sửa đáp án, upload/xoá tài liệu, xuất báo cáo.

Mỗi bản ghi gồm: thời gian (UTC), email người thực hiện, loại hành động, đối tượng bị tác động, địa chỉ IP, kết quả (thành công / thất bại).

Admin có thể:
- Tìm kiếm theo email người thực hiện, ID đối tượng, khoảng thời gian.
- Lọc theo loại hành động.
- Xem phân trang, mặc định 50 dòng mỗi trang, mới nhất ở trên cùng.

**Quan trọng:** Audit Log là bất biến — không ai được sửa hoặc xoá, kể cả Admin.

---

## Cấu trúc dữ liệu cần biết

**Bảng `users`:** id, full_name, email, password_hash, role (GUEST/STUDENT/TUTOR/ADMIN), status (ACTIVE/INACTIVE), target_band_score, last_login_at, created_at, updated_at.

**Bảng `audit_logs`:** id, timestamp, actor_id, actor_email, action_type, target_entity_type (USER/TEST/DOCUMENT/ANSWER_KEY/SYSTEM), target_entity_id, ip_address, result (SUCCESS/FAILURE), metadata (JSON — ví dụ: oldRole, newRole).

**Bảng `ai_usage_logs`:** id, user_id, feature (WRITING_EVAL/SPEAKING_EVAL/CHATBOT/EXPLAIN_WITH_AI), input_tokens, output_tokens, cost_usd, called_at.

---

## Cấu trúc API

Tất cả API của Admin đặt dưới prefix `/api/admin`, bắt buộc có header `Authorization: Bearer <token>`, và phải qua middleware kiểm tra role ADMIN.

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin/dashboard` | Lấy toàn bộ metrics và activity feed |
| GET | `/api/admin/users` | Danh sách user (hỗ trợ filter, sort, phân trang) |
| POST | `/api/admin/users` | Tạo user mới |
| GET | `/api/admin/users/:id` | Chi tiết 1 user |
| PATCH | `/api/admin/users/:id` | Cập nhật thông tin hoặc đổi role |
| PATCH | `/api/admin/users/:id/status` | Khoá hoặc mở khoá |
| DELETE | `/api/admin/users/:id` | Xoá user |
| GET | `/api/admin/reports` | Lấy dữ liệu báo cáo (truyền type + from + to) |
| GET | `/api/admin/reports/export` | Xuất báo cáo CSV hoặc PDF |
| GET | `/api/admin/audit-logs` | Danh sách audit log (hỗ trợ filter, phân trang) |

---

## Giao diện và trải nghiệm người dùng

- Layout Admin dùng sidebar cố định bên trái, không dùng chung navigation với Student/Tutor.
- Sidebar có 4 mục: Dashboard, Quản lý người dùng, Báo cáo, Audit Log.
- Badge trạng thái: Active = xanh lá, Inactive = đỏ.
- Badge role: Admin = tím, Tutor = xanh dương, Student = xanh lam nhạt.
- Mọi hành động nguy hiểm (xoá, khoá) đều phải có hộp thoại xác nhận, không được thực hiện chỉ bằng 1 cú click.
- Bảng dữ liệu hiển thị skeleton loading khi đang tải, empty state khi không có kết quả.
- Toast thông báo sau mỗi thao tác thành công hoặc thất bại.
- Thời gian hiển thị theo timezone của trình duyệt (dữ liệu lưu UTC trong DB).

---

## Xử lý lỗi

| Lỗi | Cách xử lý ở frontend |
|-----|-----------------------|
| 401 Unauthorized | Xoá token, chuyển về trang đăng nhập |
| 403 Forbidden | Hiện thông báo "Không có quyền thực hiện", không redirect |
| 404 Not Found | Toast "Không tìm thấy", đóng modal/drawer |
| 422 Validation | Hiện lỗi ngay tại từng field trong form |
| 500 Server Error | Toast "Lỗi hệ thống, vui lòng thử lại" |
| Mất kết nối | Toast kèm nút Retry |

---

## Phạm vi ngoài Admin Feature

Những phần sau **không thuộc phạm vi** file này, không được chỉnh sửa khi làm Admin:
- Logic AI (prompt, đánh giá Writing/Speaking).
- Tạo/chỉnh sửa đề thi IELTS (của Tutor).
- Giao diện học và làm bài của Student.
- Đăng ký, đăng nhập, quên mật khẩu (của Guest).
- Thanh toán, gói subscription (ngoài MVP).
