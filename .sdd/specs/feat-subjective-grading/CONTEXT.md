# CONTEXT.md — Subjective Grading System (Writing & Speaking)
# Status: Active, As-built

## 1. PROBLEM STATEMENT
- Học viên luyện thi IELTS cần feedback chi tiết cho bài Writing và Speaking nhưng giáo viên không thể chấm bài 24/7.
- Hệ thống tự động hóa việc chấm điểm tức thì qua dịch vụ AI, đồng thời hỗ trợ luồng chấm bài thủ công bởi Tutor khi học viên yêu cầu nhận xét chuyên sâu.
- Admin quản lý và phân công Giảng viên phụ trách bài nộp để đảm bảo khối lượng công việc được điều phối hợp lý.

## 2. DOMAIN KNOWLEDGE
- **Writing Criteria (4 tiêu chí):** Task Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
- **Speaking Criteria (4 tiêu chí):** Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation.
- **AI Evaluation Pipeline:** Tích hợp kiểm tra số từ tối thiểu, kiểm tra Idempotency Cached Report, tính band tổng hợp trọng số (33%/67% Writing), lưu `ai_grading_reports`, log `ai_usage_logs` và phát sự kiện Socket.io.
- **Admin Assignment:** Admin phân công Giảng viên qua API `/admin/tutor-assignments`, tự động cập nhật `assigned_tutor_id` và ghi log `audit_logs` với action `'tutor_assigned'`.

## 3. STAKEHOLDERS
- **Student:** Người gửi bài, chọn người chấm (AI hoặc Tutor), nhận feedback.
- **Admin:** Quản trị viên phân công bài nộp cho Giảng viên phụ trách.
- **Tutor:** Người chấm điểm thủ công qua hàng đợi riêng (nếu được phân công hoặc bài tự do).
- **AI System:** LLM Provider wrapper được gọi trực tiếp trong service để sinh điểm số và nhận xét.

## 4. CONSTRAINTS
- **Tutor Boundary:** Nếu học viên chọn `grader = ai`, bài sẽ chỉ có AI feedback (reference) và không hiện trong pending queue của Tutor hay Admin Assignment.
- **Audio Verification:** Với Speaking, hệ thống bắt buộc đủ 3 phần (Part 1, 2, 3) và audio upload phải được verify quyền sở hữu (`speaking/{userId}/`).
- **Data Persistence:** Nếu AI provider thất bại, submission vẫn được lưu trữ, hệ thống không tự động chuyển sang Tutor hay xóa bài. Điểm số band từ AI được lưu độc lập, không ghi đè điểm của Tutor.