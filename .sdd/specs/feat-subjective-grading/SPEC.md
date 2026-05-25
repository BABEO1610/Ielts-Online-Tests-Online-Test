# SPEC.md — Đặc tả luồng chấm điểm tự luận (feat-subjective-grading)
# Version: 1.1.0 APPROVED | Owner: Tech Lead (Minh)

## 1. Context & Goal (Bối cảnh & Mục tiêu)
Học viên cần nộp bài Writing (Gõ chữ/Upload) và Speaking (Ghi âm) để nhận kết quả đánh giá chi tiết theo thang điểm IELTS (Band 0-9) từ dịch vụ AI hoặc từ giáo viên (Tutor).

## 2. Actors & Roles (Tác nhân hệ thống)
- **Student:** Người nộp bài làm và chọn phương thức chấm (`ai` hoặc `tutor`).
- **Tutor:** Giáo viên nhận bài từ View hàng đợi (`v_tutor_grading_queue`), chấm thủ công và nhận xét.
- **AI System:** Dịch vụ ngầm (External LLM) chấm điểm tự động.

## 3. Functional Requirements (FR — Áp dụng EARS Notation)
- **FR-01 (Event-driven):** WHEN Student nộp bài, THE hệ thống SHALL chèn (insert) vào bảng `writing_submissions` hoặc `speaking_submissions` tương ứng, lưu mặc định `status = 'pending'` và `grader` tùy theo lựa chọn của Student.
- **FR-02 (State-driven):** WHILE bài làm có `status = 'pending'`, THE hệ thống SHALL vô hiệu hóa nút "Nộp lại" hoặc "Chỉnh sửa" của bài thi đó trên giao diện.
- **FR-03 (Event-driven):** WHEN AI chấm điểm thành công, THE hệ thống SHALL insert kết quả vào bảng `ai_feedback_reports` và cập nhật `status` của submission thành `ai_graded`.
- **FR-04 (Event-driven):** WHEN Tutor chấm điểm thành công, THE hệ thống SHALL insert kết quả vào bảng `tutor_feedback_reports` và cập nhật `status` của submission thành `tutor_graded`.

## 4. Non-Functional Requirements (NFR — Yêu cầu phi chức năng)
- **NFR-01 (Performance):** Quá trình gọi AI chấm điểm Writing/Speaking SHALL phản hồi kết quả trong tối đa 30 giây.
- **NFR-02 (Realtime):** Hệ thống SHALL sử dụng `Socket.io` để bắn event `grading_completed` về client của Student ngay khi có điểm, tuyệt đối không dùng HTTP Polling.
- **NFR-03 (Security):** Backend SHALL sử dụng thư viện `file-type` để xác thực MIME type thật của file upload (audio/mp3, audio/wav), từ chối file giả mạo extension.

## 5. Data Model Schema (Mapping với Shared Context)
*Luồng tính năng này thao tác trực tiếp lên 4 bảng vật lý và 1 View trong CSDL:*
- **Bảng bài nộp (Submissions):** `writing_submissions` và `speaking_submissions`. Cột liên kết là `user_id`. Trạng thái chấm thi lấy từ ENUM `submission_status` và `grader_type`.
- **Bảng báo cáo (Feedback Reports):** `ai_feedback_reports` và `tutor_feedback_reports`. Các tiêu chí điểm IELTS (Fluency, Grammar, Lexical, Task Achievement...) được lưu thành các cột `NUMERIC(3,1)` độc lập.
- **View xếp hàng (Queue):** `v_tutor_grading_queue`. Trích xuất bài nộp có `status = 'pending'` và `grader = 'tutor'` bằng cơ chế UNION ALL hai bảng submission.

## 6. Error Handling (Xử lý lỗi & Điều kiện biên)
- **ERR-01 (File Size):** WHERE file ghi âm > 10MB, THE hệ thống SHALL ngắt stream và từ chối request với mã HTTP 413 (Payload Too Large).
- **ERR-02 (AI Fallback):** WHERE External LLM quá tải (Timeout > 30s) hoặc trả về JSON lỗi, THE hệ thống SHALL giữ nguyên `status = 'pending'` nhưng cập nhật `grader = 'tutor'` để tự động đẩy bài vào View hàng đợi cho giáo viên chấm bù, đồng thời báo lỗi qua Socket cho Student.

## 7. Acceptance Criteria (AC — Tiêu chí nghiệm thu)
- [ ] AC-01: Bài thi chọn AI chấm (`grader = 'ai'`) tuyệt đối không xuất hiện trên bảng `v_tutor_grading_queue` của Tutor.
- [ ] AC-02: Điểm số lưu trong DB bắt buộc phải gán đúng vào các cột NUMERIC độc lập của bảng report tương ứng.
- [ ] AC-03: Sinh viên nhận được popup thông báo điểm Realtime (qua Socket.io) ngay sau khi AI/Tutor chấm xong mà không cần F5 trình duyệt.

## 8. Out of Scope (Ngoài phạm vi thực hiện Sprint này)
- Tính năng tự động ngắt ghi âm khi hết giờ.
- Hệ thống gửi email thông báo điểm (Chỉ dùng Socket.io & Notification in-app).

---

## 9. Agent Steering Instructions (Chỉ thị điều khiển AI)
### 9.1. Transaction & Race Conditions
- BẮT BUỘC dùng Database Transaction khi chuyển trạng thái bài thi (`ai_graded` hoặc `tutor_graded`) và insert vào bảng báo cáo tương ứng (`ai_feedback_reports` hoặc `tutor_feedback_reports`). Lỗi 1 trong 2 bước phải `ROLLBACK` toàn bộ.
### 9.2. Query Constraints
- KHÔNG sử dụng ORM. Sử dụng thuần thư viện `pg` với cơ chế Parameterized Query (`$1, $2`) để chống SQL Injection.
### 9.3. Structured Output LLM
- Prompt gửi sang LLM phải khai báo cấu trúc trả về dạng JSON. Sử dụng `try...catch` để bóc tách kết quả. Nếu `JSON.parse` văng lỗi, phải trigger logic ERR-02 (chuyển cho Tutor chấm).