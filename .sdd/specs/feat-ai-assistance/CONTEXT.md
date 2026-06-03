# CONTEXT.md — feat-ai-assistance
Người viết: Tech Lead / System | Ngày cập nhật: 2026-06-03

## **1. PROBLEM STATEMENT (Nỗi đau & Mục tiêu)**
**Nỗi đau của người dùng:** 
- Chờ đợi chấm điểm Writing/Speaking thủ công tốn rất nhiều thời gian (vài ngày). Người học cần có feedback tức thì (instant feedback) để tối ưu việc luyện tập.
- Lời giải thích của Giáo viên (Tutor) trong các bài Reading/Listening nhiều lúc mang tính học thuật cao, người mới học hoặc ở trình độ thấp khó nắm bắt.
- Trong lúc tự học, người học có nhiều thắc mắc ngữ pháp/từ vựng nhưng Tutor không thể túc trực 24/7.
- Giáo viên chấm bài (Tutor) cũng mất quá nhiều thời gian để chấm Writing/Speaking từ con số 0, họ cần một bản nháp phân tích sơ bộ (pre-check) từ AI để tham khảo.

**Giải pháp (Feature Goal):**
Xây dựng một hệ sinh thái AI Assistance toàn diện phục vụ dự án IELTSZone bao gồm:
1. **AI Grading (Writing & Speaking):** Chấm điểm tự động và nhận xét bài luận/thu âm của Student bằng AI ngay sau khi nộp bài.
2. **Explain with AI:** "Bình dân hóa" lời giải thích của các câu hỏi Objective (Reading/Listening) dựa trên đáp án gốc của Tutor.
3. **AI Chatbot:** Trợ lý ảo túc trực 24/7 giải đáp thắc mắc xoay quanh tiếng Anh học thuật.
4. **Tutor AI Pre-check:** Chấm sơ bộ bài Writing của Student để Tutor lấy làm tham chiếu, giúp giảm thời gian chấm bài thủ công.
5. **Admin Metrics:** Quản lý lượng API Token tiêu thụ để kiểm soát chi phí (AI Cost) hàng ngày của hệ thống.

## **2. DOMAIN KNOWLEDGE (Kiến thức nghiệp vụ)**
**Thuật ngữ & Khái niệm cốt lõi:**
- **IELTS Band Score:** Điểm chuẩn IELTS từ 0.0 - 9.0, bắt buộc làm tròn về bước 0.5.
- **4 Tiêu chí Writing:** Task Achievement (Task 1) hoặc Task Response (Task 2), Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.
- **4 Tiêu chí Speaking:** Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation (tùy thuộc STT provider có hỗ trợ không).
- **Tutor Pre-check:** Bản nháp đánh giá do AI tạo ra dành riêng cho Tutor xem. **Quy tắc sinh tử:** Không được ghi đè điểm chính thức của Tutor và không được update trạng thái bài làm của Student thành `ai_graded`.
- **Token Usage / AI Cost:** Chi phí gọi API LLM. Bắt buộc phải được track để admin quản lý ngân sách.

**Quy tắc nghiệp vụ:**
- AI giữ vai trò hỗ trợ, không làm bài thi hộ Student.
- AI Chatbot bắt buộc phải giới hạn chặt chẽ (Guardrails) trong phạm vi IELTS và tiếng Anh học thuật. Các chủ đề khác phải bị từ chối khéo léo.
- Tính nguyên trạng (Idempotency): Nếu Explain lại một câu hỏi, nên ưu tiên lấy lại đáp án AI cũ trong DB để tiết kiệm chi phí LLM. Tương tự cho Grading.

## **3. STAKEHOLDERS (Ai liên quan?)**
- **Student:** 
  - Nộp bài xin chấm điểm (AI Grading).
  - Yêu cầu giải thích lại câu hỏi (Explain with AI).
  - Hỏi đáp qua AI Chatbot.
- **Tutor:** 
  - Yêu cầu "AI Pre-check" để tham khảo trước khi tự chấm điểm bài Writing của Student.
- **Admin:** 
  - Xem Dashboard Token Usage, kiểm soát chi phí, quyết định cấu hình Daily Limit.

## **4. CONSTRAINTS (Ràng buộc cứng)**
**Kỹ thuật & Kiến trúc:**
- **Không ORM:** Chỉ dùng raw SQL (`pg` module) và parameterized query (`$1, $2`).
- **Provider-Agnostic (ADR-002):** Module AI được đóng gói riêng (`src/backend/src/ai/`), Controller/Service tuyệt đối không gọi thẳng SDK của OpenAI/Anthropic.
- **Async Processing:** Chấm Writing/Speaking mất nhiều thời gian, sử dụng Job Worker chạy ngầm. API trả về HTTP `202 Accepted` và báo kết quả bằng Socket.io.
- **Failure State (IELTS-06):** Nếu AI provider timeout/lỗi, phải update status bài làm thành `grading_failed`. Tuyệt đối không để kẹt ở `pending`.
- **Budget Control:** Mọi request tới AI đều phải check qua hàm kiểm tra ngân sách toàn cầu (`checkGlobalBudget`). Nếu vượt mức `AI_DAILY_TOKEN_LIMIT`, hệ thống trả HTTP `429 Too Many Requests`.

**Bảo mật & An toàn (Guardrails):**
- **Prompt Injection:** Validate và sanitize đầu vào. Không để lộ System Prompt, API Key, hay Stack Trace ra HTTP response.
- **Output Schema Validation:** Kết quả trả về từ LLM phải được parse và validate cấu trúc JSON (bắt buộc ép kiểu, check dải điểm `0.0 - 9.0`) trước khi lưu Database. Không lưu "rác" AI.

## **5. ASSUMPTIONS & RESOLUTIONS**
*(Tất cả những điểm dưới đây đã được chốt và đưa vào thiết kế hệ thống)*
- **Data Storage:** Lịch sử Chatbot được lưu bền vững vào `chatbot_messages`. Token Usage được lưu phân tán trong JSONB của report và `tokens_used` của từng bảng, sau đó Cronjob tính tổng quét hàng ngày vào `platform_metrics_snapshots`.
- **Pronunciation Fallback:** Nếu provider STT chỉ trả về Text mà không đánh giá được phát âm, hệ thống chấp nhận lưu `pronunciation_score = NULL` thay vì báo lỗi.
- **Giới hạn lạm dụng (Abuse Prevention):** Ngoài Budget theo ngày, có Rate Limiting (chống spam API) để bảo vệ túi tiền của dự án.