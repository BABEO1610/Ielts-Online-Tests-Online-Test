# CONTEXT.md — Subjective Grading System (Writing & Speaking)
# Status: Active, As-built

## 1. PROBLEM STATEMENT
- Học viên luyện thi IELTS cần feedback chi tiết cho bài Writing và Speaking nhưng giáo viên không thể chấm bài 24/7.
- Hệ thống cần tự động hóa việc chấm điểm (AI) để có kết quả ngay lập tức, đồng thời vẫn giữ lựa chọn chấm thủ công bởi Tutor khi học viên cần nhận xét chuyên sâu.

## 2. DOMAIN KNOWLEDGE
- **Writing Criteria (4 tiêu chí):** Task Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
- **Speaking Criteria (4 tiêu chí):** Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation.
- **Synchronous AI Processing:** Quá trình chấm điểm AI được thực hiện đồng bộ (synchronous) ngay trong request HTTP thông qua controller/service (không dùng background worker/async job pipeline như BullMQ/Redis Queue).

## 3. STAKEHOLDERS
- **Student:** Người gửi bài, chọn người chấm (AI hoặc Tutor), nhận feedback.
- **Tutor:** Người chấm điểm thủ công qua hàng đợi riêng (nếu student chọn `grader = tutor`).
- **AI System:** LLM Provider wrapper được gọi trực tiếp trong service để sinh điểm số và nhận xét.

## 4. CONSTRAINTS
- **Tutor Boundary:** Nếu học viên chọn `grader = ai`, bài sẽ chỉ có AI feedback (reference) và không hiện trong pending queue của Tutor. Tutor grading là flow riêng.
- **Audio Verification:** Với Speaking, hệ thống bắt buộc đủ 3 phần (Part 1, 2, 3) và audio upload phải được verify quyền sở hữu (`speaking/{userId}/`).
- **Data Persistence:** Nếu AI provider thất bại, submission vẫn được lưu trữ, hệ thống không tự động chuyển sang Tutor hay xóa bài. Điểm số band từ AI được lưu độc lập, không ghi đè điểm của Tutor (nếu có).

## 5. ASSUMPTIONS
- Đã có bảng `ai_grading_reports`, `writing_submissions`, `speaking_submissions` và `tutor_feedback_reports` trong CSDL.
- Frontend đã upload trực tiếp file audio qua API `/upload` trước khi gọi submit Speaking full.

## 6. OPEN QUESTIONS & DECISIONS
- *Q: AI có dùng Whisper/OpenAI để STT không?*
  -> *Decision:* Hiện tại không implement Whisper local/queue. Gọi thẳng AI provider wrapper của backend.
- *Q: Kết quả trả về qua WebSocket không?*
  -> *Decision:* Flow hiện tại là API request/response đồng bộ. Không dùng WebSocket grading_complete/grading_failed.
- *Q: Legacy Speaking API xử lý thế nào?*
  -> *Decision:* Endpoint `/submissions/speaking` (1 part) đã khóa `grader = ai` vì AI bắt buộc phải nộp đủ 3 part qua `/submissions/speaking/full`.