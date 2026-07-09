# tasks.md — Danh Sách Công Việc: Global IELTS Virtual Assistant

Trạng thái: Active — Phản ánh đúng code hiện tại.

## Đã Hoàn Thành

- [x] Mount assistant router tại `/api/assistant`.
- [x] Mount assistant router tại `/api/v1/assistant`.
- [x] Render widget chatbot toàn cục trong ứng dụng React.
- [x] Guest thấy widget nhưng phải đăng nhập mới được chat (login required).
- [x] Ẩn/disable chatbot trên trang active test ở frontend.
- [x] Backend enforce authenticated student cho mọi luồng chat.
- [x] Validate message payload, giới hạn tối đa 2000 ký tự.
- [x] Whitelist `pageType`.
- [x] Chặn chat khi `pageType === 'active-test'` trong backend guardrails.
- [x] Intent routing cho: greeting, clarification, navigation, IELTS knowledge,
      tìm đề thi, tìm tài liệu, post-test review.
- [x] Dùng static IELTS knowledge chunks cho câu hỏi kiến thức IELTS.
- [x] DB lookup cho đề thi (mock_tests) và tài liệu (library_resources) đã published.
- [x] Persist sessions/messages qua `chatbot_sessions` và `chatbot_messages` khi
      schema có sẵn.
- [x] Scope history và rating theo student đang đăng nhập.
- [x] Ghi log metadata AI provider qua `ai_usage_logs`.
- [x] Fix fallback dead code — deterministic fallback theo skill đã hoạt động đúng.
- [x] Thêm rate limit cho `POST /chat` và `POST /chat/stream`.
- [x] Bảo vệ `/status` — không rò rỉ thông tin provider/model/key.
- [x] Tạo RFC tổng hợp tại `.sdd/specs/global-ielts-virtual-assistant/RFC.md`.
- [x] Đồng bộ tài liệu subjective grading với ranh giới AI/tutor hiện tại.
- [x] Chặn legacy one-part speaking endpoint khi `grader='ai'`.
- [x] Deprecated thư mục `.sdd/specs/feat-ai-assistance/` (đã xóa).

## Còn Cần Hoàn Thiện (Remaining Hardening)

- [ ] Thêm integration tests cho rate limit và `/status` khi auth test helpers ổn
      định.
- [ ] Xác nhận database production có `chatbot_sessions` và `chatbot_messages` khớp
      schema snapshot.
- [ ] Thêm migration nhỏ cho rating columns nếu `chatbot_messages` chưa hỗ trợ lưu
      rating.
- [ ] Cân nhắc streaming token-by-token về UI sau khi hành vi SSE final-response
      hiện tại được chấp nhận.
- [ ] Test HTTP thật với auth cookie để verify luồng end-to-end.

## Đã Loại Khỏi Kế Hoạch (Removed From Active Plan)

Các công việc sau **không thuộc** chatbot hiện tại:

- Tạo bảng chatbot thứ hai (ví dụ `assistant_chat_interactions`).
- Xây dựng tutor AI support.
- Biến chatbot thành công cụ chấm Writing/Speaking.
- Full vector RAG / embedding implementation.
- Expose thông tin provider/model/API-key qua `/status`.
