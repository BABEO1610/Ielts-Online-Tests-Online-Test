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
*Cơ sở dữ liệu: PostgreSQL (Giả định)*

- **Table `exams`:** `id` (UUID), `title`, `type` (READING/LISTENING), `duration_minutes`, `version`, `is_active`, `created_by`.
- **Table `questions`:** `id` (UUID), `exam_id` (FK), `question_type` (MULTIPLE_CHOICE, FILL_BLANK), `content`, `correct_answer`, `explanation`.
- **Table `student_attempts`:** `id` (UUID), `student_id` (FK), `exam_id` (FK - trỏ đúng vào version), `start_time`, `end_time`, `raw_score`, `band_score`, `answers_submitted` (JSONB).
- **Table `audit_logs`:** `id` (UUID), `entity_type` (EXAM/QUESTION), `entity_id`, `action`, `changed_by`, `changes` (JSONB - lưu before/after), `created_at`.

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
