# CONTEXT.md — Global IELTS Virtual Assistant

Trạng thái: Active — Đây là bối cảnh nghiệp vụ chính thức của tính năng chatbot.

## 1. Vấn Đề Cần Giải Quyết

Học viên luyện thi IELTS trên nền tảng IELTSZone cần:

- Được giải đáp nhanh các thắc mắc về kiến thức IELTS (ngữ pháp, từ vựng, chiến
  lược làm bài, tiêu chí chấm điểm).
- Tìm kiếm đề thi (mock tests) và tài liệu (library resources) có sẵn trong hệ thống.
- Được hỗ trợ điều hướng các trang trên website.
- Review lại bài thi đã nộp khi có đủ ngữ cảnh (attempt đã submitted, ownership
  hợp lệ).

Tính năng này **không được phép** thay thế hệ thống chấm điểm Writing/Speaking
chính thức và **không được tiết lộ đáp án** khi học viên đang làm bài thi.

## 2. Kiến Thức Chuyên Ngành

- **Global Assistant:** Chatbot toàn cục dành cho học viên, hiển thị trên mọi trang
  (trừ khi đang thi). Hoạt động dựa trên intent routing, context injection có kiểm
  soát, và AI provider wrapper.
- **Cơ chế fallback:** Khi AI provider gặp sự cố ở câu hỏi kiến thức IELTS, assistant
  trả về text deterministic (cố định) theo từng kỹ năng: Writing Task 1 overview,
  Speaking Part 2, Reading (True False Not Given / Matching Headings), hoặc
  fallback chung.
- **Static Knowledge Base:** Dùng các file JSON tĩnh trong
  `backend/src/api/assistant/knowledge-base/` để inject kiến thức IELTS chuẩn vào
  prompt. Không dùng vector database hay embedding ở phase hiện tại.

## 3. Các Bên Liên Quan

- **Student (Học viên):** Người trực tiếp sử dụng chatbot. Chỉ authenticated student
  mới được chat.
- **Guest (Khách):** Thấy được widget chatbot nhưng bị yêu cầu đăng nhập nếu muốn
  gửi tin nhắn.
- **Tutor (Giảng viên):** Không dùng chatbot này. Tutor AI support nằm ngoài scope.

## 4. Ràng Buộc và Bảo Mật

- **Active Test Block:** Chatbot bị chặn hoàn toàn (cả UI lẫn API) khi học viên đang
  trong bài thi (`pageType = active-test`).
- **Rate Limit:** API `/chat` và `/chat/stream` bị giới hạn khoảng 30 requests/phút
  qua `express-rate-limit`.
- **Bảo mật API `/status`:** Chỉ trả về health status tối giản (`{ code: null, status: "ok" }`),
  không rò rỉ thông tin provider, model, hay API key.
- **Scope giới hạn:** Chatbot không chấm điểm Writing/Speaking, không dự đoán band
  score cá nhân, không bịa đề thi/đáp án/tài liệu.

## 5. Giả Định

- Bảng `chatbot_sessions` và `chatbot_messages` đã tồn tại trong database để lưu trữ
  lịch sử chat.
- Bảng `ai_usage_logs` đã tồn tại để ghi log metadata các lần gọi AI provider.
- NEEDS_MANUAL_CHECK: Code repository đang dùng các bảng trên nhưng repo hiện
  không thấy dedicated migration file tạo bảng `chatbot_sessions`/`chatbot_messages`.

## 6. Quyết Định Đã Chốt

- *Hỏi: Nếu AI provider bị lỗi thì xử lý thế nào?*
  → Sử dụng deterministic fallback theo từng skill thay vì gọi LLM khác.
- *Hỏi: Chatbot có dùng để chấm điểm thay tutor không?*
  → Không. Tutor AI flow nằm ngoài scope chatbot.
- *Hỏi: Có dùng vector RAG/embedding không?*
  → Không ở phase hiện tại. Dùng static JSON knowledge chunks + rule/metadata
  matching.

## 7. Ngoài Phạm Vi (Out of Scope)

- Tutor AI support.
- Chấm điểm Writing/Speaking chính thức.
- Tiết lộ đáp án/hint khi đang thi.
- Full vector RAG / embedding.
- Long-term personalization.
- Expose provider/model/API-key configuration qua API.
