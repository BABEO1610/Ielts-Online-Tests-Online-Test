# tasks.md — Danh Sách Công Việc: Global IELTS Virtual Assistant

Trạng thái: Active — Phản ánh đúng code hiện tại.

## Đã Hoàn Thành

- [X] Mount assistant router tại `/api/assistant`.
- [X] Mount assistant router tại `/api/v1/assistant`.
- [X] Render widget chatbot toàn cục trong ứng dụng React.
- [X] Guest thấy widget nhưng phải đăng nhập mới được chat (login required).
- [X] Ẩn/disable chatbot trên trang active test ở frontend.
- [X] Backend enforce authenticated student cho mọi luồng chat.
- [X] Validate message payload, giới hạn tối đa 2000 ký tự.
- [X] Whitelist `pageType`.
- [X] Chặn chat khi `pageType === 'active-test'` trong backend guardrails.
- [X] Intent routing cho: greeting, clarification, navigation, IELTS knowledge,
  tìm đề thi, tìm tài liệu, post-test review.
- [X] Dùng static IELTS knowledge chunks cho câu hỏi kiến thức IELTS.
- [X] DB lookup cho đề thi (mock_tests) và tài liệu (library_resources) đã published.
- [X] Persist sessions/messages qua `chatbot_sessions` và `chatbot_messages` khi
  schema có sẵn.
- [X] Scope history và rating theo student đang đăng nhập.
- [X] Ghi log metadata AI provider qua `ai_usage_logs`.
- [X] Fix fallback dead code — deterministic fallback theo skill đã hoạt động đúng.
- [X] Thêm rate limit cho `POST /chat` và `POST /chat/stream`.
- [X] Bảo vệ `/status` — không rò rỉ thông tin provider/model/key.
- [X] Tạo RFC tổng hợp tại `.sdd/specs/global-ielts-virtual-assistant/RFC.md`.
- [X] Đồng bộ tài liệu subjective grading với ranh giới AI/tutor hiện tại.
- [X] Chặn legacy one-part speaking endpoint khi `grader='ai'`.
- [X] Deprecated thư mục `.sdd/specs/feat-ai-assistance/` (đã xóa).
- [X] Sửa provider inference: ưu tiên Gemini theo kiến trúc dự án, cô lập
  `GEMINI_MODEL`/`OPENAI_MODEL`, không gửi API key Gemini trong URL.
- [X] Cho knowledge response retry đúng một lần ở plain-text mode trước deterministic
  fallback; static knowledge no-match vẫn dùng safe general IELTS/English knowledge.
- [X] Validate và giữ `conversationId`, resolve session theo ownership, chặn message
  insert vào session của student khác.
- [X] Thêm preferred-address memory theo active conversation: set/recall/clear,
  sanitize input, structured persistence và continuity khi đóng/mở panel.
- [X] Bổ sung regression tests cho provider config, preference memory, chained
  follow-up, ownership và frontend conversation continuity.
- [X] Migration 024 tạo chatbot history schema và bổ sung rating/preference columns.
- [X] Giải tham chiếu nhiều lượt như Skimming + Scanning → “hai cái này”; đưa recent
  conversation vào classifier dưới dạng untrusted data khi rule intent chưa đủ.
- [X] Route “tìm 1 đề phù hợp” sang `FIND_TEST`, kế thừa Reading/topic gần nhất và
  diễn đạt recommendation tự nhiên nhưng chỉ dùng test/link có thật trong DB.
- [X] Scope history theo một owned conversation và resume session theo message activity
  mới nhất để UI history khớp với memory backend sau reload.
- [X] Chỉ nhận diện Library lookup khi có resource noun rõ ràng; câu hỏi kiến thức trên
  trang Library không còn bị từ chung như “có” cướp route.
- [X] Đẩy topic keyword xuống SQL trước `ORDER BY/LIMIT`, rồi xếp hạng và áp quantity;
  không còn chọn đề mới nhất tùy ý trước khi lọc chủ đề.
- [X] Self-check title lookup theo `databaseResults`; provider lỗi hoặc title bịa sẽ dùng
  deterministic DB-grounded answer/link.
- [X] Khóa input đến khi history của canonical conversation tải xong, ổn định callback
  conversation và không tự resubmit JSON sau ambiguous stream failure.
- [X] Parse SSE frame cuối không có blank line và loại bỏ context bị lặp trong prompt.

## Còn Cần Hoàn Thiện (Remaining Hardening)

- [ ] Thêm integration tests cho rate limit và `/status` khi auth test helpers ổn
  định.
- [ ] Apply migration 024 trên database Supabase đã preflight; hiện hai bảng/rating/
  index/trigger đã có nhưng còn thiếu `chatbot_sessions.preferred_address`.
- [ ] Cân nhắc streaming token-by-token về UI sau khi hành vi SSE final-response
  hiện tại được chấp nhận.
- [ ] Test HTTP thật với auth cookie để verify luồng end-to-end.
- [ ] Apply migration 024 và chạy live smoke test trên database/provider của từng
  environment; không đưa key hoặc secret vào test log.

## Đã Loại Khỏi Kế Hoạch (Removed From Active Plan)

Các công việc sau **không thuộc** chatbot hiện tại:

- Tạo bảng chatbot thứ hai (ví dụ `assistant_chat_interactions`).
- Xây dựng tutor AI support.
- Biến chatbot thành công cụ chấm Writing/Speaking.
- Full vector RAG / embedding implementation.
- Expose thông tin provider/model/API-key qua `/status`.
