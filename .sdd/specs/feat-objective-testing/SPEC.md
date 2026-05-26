# SPEC.md — Đặc tả Kỹ thuật: Luồng Thi Trắc nghiệm & Quản lý Đề (feat-objective-testing)
# Dự án: IELTS Learning Website | Ngày: 25/05/2026

Dựa trên cấu trúc chuẩn từ phương pháp Spec-Driven Development (SDD), đây là tài liệu đặc tả thực thi cho tính năng Thi Trắc Nghiệm.

---

## 1. Context & Goal (Bối cảnh & Mục tiêu)
- **Bối cảnh:** Website luyện thi IELTS cần một môi trường thi mô phỏng thực tế (bấm giờ, chấm điểm tự động chuẩn Academic). Ngoài ra, Giáo viên (Tutor) cần cập nhật/sửa lỗi các đề thi cũ đã publish mà không làm hỏng dữ liệu điểm của học viên đã thi.
- **Mục tiêu:** 1. Xây dựng luồng thi Reading/Listening trượt tru với tính năng đếm ngược và tự động nộp bài (auto-submit).
  2. Implement cơ chế chấm điểm tự động (Auto-grading) có xử lý chuỗi.
  3. Xây dựng cơ chế Versioning (Soft-delete) cho đề thi để bảo toàn lịch sử.
  4. Ghi log kiểm toán (Audit Logging) mọi thao tác thay đổi đề.

## 2. Actors & Roles (Tác nhân & Vai trò)
- **Student (Học viên):** Người tham gia làm bài test, xem điểm số và giải thích đáp án.
- **Tutor (Giáo viên / Người tạo đề):** Người tạo mới đề thi, cập nhật đáp án và cấu hình bài thi.
- **Admin (Quản trị viên):** Người có quyền theo dõi hệ thống và xem Audit Logs.

## 3. Functional Requirements (Yêu cầu Chức năng)
- **REQ-01 (Giao diện thi):** - Reading: Chia màn hình (Split View) bên trái là đoạn văn, phải là câu hỏi.
  - Listening: Player âm thanh cố định phía trên, không tự động qua bài.
  - Cả hai: Có thanh điều hướng 40 câu hỏi (hiển thị trạng thái làm/chưa làm).
- **REQ-02 (Auto-submit):** Hệ thống đếm ngược thời gian. Khi về `00:00`, tự động khóa màn hình, hiển thị popup và gọi API nộp bài (không cần user bấm nút).
- **REQ-03 (Auto-grading):**
  - Trắc nghiệm (Multiple Choice): So khớp ID đáp án (Exact match).
  - Điền khuyết (Fill-in-blanks): Phải tiền xử lý `trim()`, `toLowerCase()`, loại bỏ dấu câu thừa trước khi so sánh chuỗi.
  - Quy đổi điểm thô (0-40) ra Band Score (1.0 - 9.0) theo chuẩn IELTS Academic.
- **REQ-04 (Versioning đề thi):** Khi Tutor cập nhật câu hỏi/đáp án của một đề đã publish, hệ thống KHÔNG cập nhật đè (override) dữ liệu cũ, mà tạo ra bản ghi mới (`version += 1`). Đề cũ được chuyển thành `is_active = false`.
- **REQ-05 (Audit Logging):** Mọi hành động `CREATE`, `UPDATE`, `SOFT_DELETE` trên Đề thi (Exam) và Câu hỏi (Question) đều phải lưu vào bảng Audit Log.

## 4. Non-functional Requirements (Yêu cầu Phi chức năng)
- **Performance:** Khi nộp bài, API trả về kết quả trong thời gian < 1 giây để không làm gián đoạn trải nghiệm.
- **Security & Integrity:** Không được phép xóa cứng (Hard-delete) bất kỳ bản ghi Đề thi/Câu hỏi nào đã có người thi.
- **UI/UX:** Responsive hoạt động tốt trên Tablet và Desktop (Tạm thời không tối ưu cho Mobile vì tính chất chia đôi màn hình bài Reading).

## 5. Data Model (Mô hình Dữ liệu)
Cơ sở dữ liệu: PostgreSQL 

- **Table `mock_tests` (Đề thi):**
  - `id` (UUID, PK)
  - `title` (VARCHAR)
  - `description` (TEXT)
  - `skill` (Enum: 'reading', 'listening', 'writing', 'speaking')
  - `difficulty` (Enum: 'beginner', 'intermediate', 'advanced')
  - `duration_minutes` (INT, NULL nếu là untimed)
  - `is_published` (BOOLEAN, default FALSE)
  - `publish_at` (TIMESTAMPTZ - dùng cho scheduled publish)
  - `created_by` (UUID, FK -> users.id)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

- **Table `questions` (Câu hỏi):**
  - `id` (UUID, PK)
  - `test_id` (UUID, FK -> mock_tests.id)
  - `question_order` (INT)
  - `question_text` (TEXT)
  - `options` (JSONB) - *Lưu mảng lựa chọn (VD: `[{"label":"A", "text":"..."}]`), NULL nếu là câu điền khuyết*
  - `correct_answer` (TEXT) - *Lưu "A" hoặc chuỗi text chính xác*
  - `explanation` (TEXT)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

- **Table `test_attempts` (Lịch sử làm bài):**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> users.id)
  - `test_id` (UUID, FK -> mock_tests.id)
  - `mode` (Enum: 'timed', 'untimed')
  - `started_at` (TIMESTAMPTZ)
  - `submitted_at` (TIMESTAMPTZ)
  - `band_score` (NUMERIC 3,1)
  - `created_at` (TIMESTAMPTZ)

- **Table `Youtubes` (Chi tiết đáp án học viên nộp):**
  - `id` (UUID, PK)
  - `attempt_id` (UUID, FK -> test_attempts.id)
  - `question_id` (UUID, FK -> questions.id)
  - `given_answer` (TEXT)
  - `is_correct` (BOOLEAN)
  - `created_at` (TIMESTAMPTZ)

- **Table `audit_logs` (Nhật ký hệ thống/Kiểm toán):**
  - `id` (UUID, PK)
  - `actor_id` (UUID, FK -> users.id)
  - `action` (Enum: log_action)
  - `target_table` (VARCHAR)
  - `target_id` (UUID)
  - `old_value` (JSONB)
  - `new_value` (JSONB)
  - `ip_address` (INET)
  - `created_at` (TIMESTAMPTZ)

- **Table `ai_explain_requests` (Yêu cầu AI giải thích câu hỏi):**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> users.id)
  - `question_id` (UUID, FK -> questions.id)
  - `tutor_explanation` (TEXT)
  - `ai_response` (TEXT)
  - `tokens_used` (INT)
  - `created_at` (TIMESTAMPTZ)

## 6. Error Handling (Xử lý Ngoại lệ)
- **Mất kết nối mạng:** Hệ thống lưu nháp tạm thời xuống LocalStorage của trình duyệt mỗi phút 1 lần. Khi có mạng sẽ tự động sync lên.
- **Sai định dạng Submit Payload:** Trả về `400 Bad Request` nếu payload không chứa đủ `answers` array hoặc sai kiểu dữ liệu.
- **Hết hạn Token (Timeout):** Nếu token của học viên hết hạn trong lúc thi, vẫn cho phép nộp bài bằng cách hiển thị popup yêu cầu nhập lại password thay vì refresh trang làm mất bài.

## 7. Acceptance Criteria (Tiêu chí Nghiệm thu - DoD)
- Bài thi được tạo và hiển thị đúng 40 câu hỏi.
- Thuật toán chấm bài chạy đúng với cả trường hợp học viên nhập "apples" (bừa khoảng trắng) với "apples" trong DB.
- Khi thời gian = `00:00`, API nộp bài bắt buộc phải được trigger tự động.
- Sửa đáp án của câu 1 từ "A" thành "B" -> Bảng `exams` tạo version mới, điểm của học viên thi hôm qua không bị thay đổi, bảng `audit_logs` lưu lại record.

## 8. Out of Scope (Ngoài phạm vi thực hiện)
- Tính năng nhận diện giọng nói hoặc chấm Writing (Phạm vi hiện tại chỉ tập trung vào Objective Testing - Trắc nghiệm Khách quan).
- Thang điểm General Training (Chỉ support Academic).
- Tính năng tải file PDF offline.
