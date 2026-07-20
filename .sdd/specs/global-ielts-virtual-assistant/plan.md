# plan.md — Kiến Trúc Hiện Tại (As-built): Global IELTS Virtual Assistant

Trạng thái: Active — Mô tả kiến trúc đang chạy, không phải proposal.

## 1. Kiến Trúc Frontend

- `frontend/src/App.jsx` — render widget chatbot toàn cục.
- `frontend/src/features/global-assistant/components/GlobalAssistantButton.jsx` — nút
  mở chatbot và giữ `conversationId` khi panel đóng/mở.
- `frontend/src/features/global-assistant/components/GlobalAssistantPanel.jsx` — panel
  chat, gửi/nhận tin nhắn, auto-scroll.
- `frontend/src/features/global-assistant/hooks/useAssistantAvailability.js` — quyết
  định hiển thị/ẩn chatbot, đánh dấu trang active-test.
- `frontend/src/features/global-assistant/services/assistantApi.js` — gọi API
  `/assistant/chat/stream`, `/assistant/chat`, `/assistant/history`,
  `/assistant/messages/:messageId/rating` qua API base chung.
- `frontend/src/services/api.js` — Axios instance dùng chung.

## 2. Kiến Trúc Backend

### Routes:

- `backend/src/app.js` mount assistant router tại `/api/assistant`.
- `backend/src/routes/api/v1/index.js` mount cùng router tại `/api/v1/assistant`.
- `backend/src/api/assistant/assistant.routes.js` định nghĩa 5 endpoint và áp dụng
  rate limit cho `/chat` và `/chat/stream`.

### Controller:

- `assistant.controller.js` — validate payload, resolve auth, gửi JSON hoặc SSE
  response, xử lý `/status` (trả health tối giản).

### Service:

- `assistant.service.js` — chạy pipeline chính: tạo/reuse session, intent routing,
  recent-topic/reference memory, preference memory, context injection, gọi AI,
  selfcheck, persistence.

### Repository:

- `assistant.repository.js` — persist sessions/messages, đọc history đúng owned
  conversation, chọn active session theo message activity, kiểm tra cột động trước
  khi insert và enforce ownership khi resolve session/insert message.

### Intent & Classifier:

- `assistant.intent.js` — rule-based regex phát hiện intent từ message.
- `assistant.memory.js` — parse/sanitize preferred address và hỗ trợ set/recall/clear.
- `assistant.scope-classifier.js` — LLM scope classifier chạy khi rule intent trả
  UNKNOWN; nhận recent conversation dưới dạng untrusted reference context và trả JSON
  gồm intent, allowed, confidence, skill, needsUserInput.

### Context:

- `assistant.context.js` — xây dựng context injection gồm: static IELTS knowledge
  chunks, DB lookup (tests, library, review), session memory (N tin nhắn gần nhất).

### Prompt & Response:

- `assistant.prompts.js` — tạo prompt theo intent/mode, inject knowledge chunks và
  DB results.
- `assistant.response.js` — normalize response từ AI, xử lý JSON malformed.
- `assistant.selfcheck.js` — kiểm tra response (band score, fake test/lesson,
  grading claim) trước khi trả về.

### Guardrails:

- `assistant.guardrails.js` — chặn active-test, out-of-scope, grading request,
  answer/hint request, prompt extraction.

### Validation:

- `assistant.validation.js` — validate message (trim, 2000 ký tự), context,
  `conversationId` UUID, pageType whitelist, normalize attemptId/questionId/route/visibleItems.

### AI Provider:

- `backend/src/services/ai.service.js` — wrapper Gemini/OpenAI, chọn provider mặc định,
  cô lập model theo provider và hỗ trợ structured/plain-text mode.
- `backend/src/services/aiUsage.service.js` — ghi log metadata vào `ai_usage_logs`.

## 3. Database

Bảng chatbot dùng trực tiếp:

- `chatbot_sessions` — lưu phiên chat: id, user_id, preferred_address, started_at,
  ended_at.
- `chatbot_messages` — lưu tin nhắn: id, session_id, role, content, tokens_used,
  created_at.

Bảng ghi log AI:

- `ai_usage_logs` — metadata: user, feature, provider, model, token counts, success,
  error, latency.

Bảng DB lookup (chỉ đọc):

- `mock_tests` — tra cứu đề thi, lọc `is_published = true`.
- `library_resources` — tra cứu tài liệu, lọc `is_published = true`.
- `test_attempts` — kiểm tra ownership bài thi đã nộp.
- `question_answers` — đọc câu trả lời đã nộp cho review.
- `questions` — đọc câu hỏi và explanation chính thức.

Migration `024_create_chatbot_history_tables.sql` tạo/đồng bộ hai bảng chatbot,
rating fields và structured `preferred_address`. Migration phải được apply ở từng
environment trước khi kỳ vọng memory persistence hoạt động.

## 4. Luồng Request

### Chat:

```text
GlobalAssistantPanel
  -> assistantApi.streamChat; không tự resubmit JSON khi delivery chưa chắc chắn
  -> gửi lại conversationId do backend cấp
  -> POST /api/v1/assistant/chat/stream hoặc /chat
  -> assistantLimiter (rate limit)
  -> validateChatPayload
  -> resolveAuthenticatedUser + ensureStudent
  -> evaluateGuardrails
  -> resolve active conversation thuộc authenticated student
  -> runAssistantPipeline
     -> detect intent (rule-based, fallback LLM classifier)
     -> buildContextInjection
     -> AI provider nếu cần
     -> selfcheck
  -> ai_usage_logs ghi metadata
  -> chatbot_sessions / chatbot_messages lưu tin nhắn
  -> trả response về UI
```

### History:

```text
GET /api/v1/assistant/history
  -> resolveAuthenticatedUser + ensureStudent
  -> assistantService.getHistory(user.id)
  -> repository join chatbot_messages với chatbot_sessions, scoped by user_id
```

### Status:

```text
GET /api/v1/assistant/status
  -> resolveAuthenticatedUser + ensureStudent
  -> trả { code: null, status: "ok" }
```

## 5. Các Điểm Validation

- Frontend chặn guest gửi tin nhắn và ẩn chatbot khi active test.
- Backend vẫn enforce: đăng nhập, role student, pageType whitelist, message tối đa
  2000 ký tự, active-test block.
- Rate limiter chỉ bảo vệ `/chat` và `/chat/stream`.
- Rating validation chấp nhận giá trị rating hợp lệ và reason text tùy chọn.

## 6. Chiến Lược Context

Assistant dùng context nhỏ nhất có thể:

- Greeting/thanks/clarification → response tức thì, không cần DB/AI.
- Tìm test/tài liệu → DB query `mock_tests` hoặc `library_resources` rồi inject
  vào context.
- Kiến thức IELTS → static JSON knowledge chunks từ
  `backend/src/api/assistant/knowledge-base/`, inject vào prompt.
- Post-test review → query `test_attempts`, `questions`, `question_answers` với
  ownership check.
- Session memory → lấy 12 tin nhắn user/assistant gần nhất, giữ topic/skill gần đây để
  hiểu follow-up, đại từ chỉ định và yêu cầu recommendation nối tiếp.
- Preferred address → lưu có cấu trúc trên active conversation; dùng tự nhiên, có thể
  recall/clear và luôn được coi là untrusted prompt data.

Hiện tại **không dùng** vector database hay external RAG service.

## 7. AI Provider và Fallback

AI calls đi qua `backend/src/services/ai.service.js`. Metadata được ghi vào
`ai_usage_logs`.

Nếu `AI_PROVIDER` không đặt, Gemini key có độ ưu tiên cho Global Assistant; nếu không
có Gemini key mới dùng OpenAI key. `GEMINI_MODEL`/`OPENAI_MODEL` được tách riêng và
Gemini API key đi qua `x-goog-api-key` header.

Knowledge response sai structured format được retry đúng một lần dưới dạng plain text.
Khi provider hoặc retry vẫn lỗi, `assistant.service.js` trả deterministic fallback:

- Writing Task 1 overview.
- Speaking Part 2.
- Reading / True False Not Given / Matching Headings.
- Generic IELTS fallback.

Không gọi AI thêm lần nào trong fallback.

## 8. Bảo Mật (Security Plan)

Các biện pháp đã triển khai:

- Cookie-based auth resolution.
- Kiểm tra active session.
- Kiểm tra Redis revoked-session khi Redis sẵn sàng.
- Yêu cầu role student.
- Validate đầu vào.
- Backend active-test guardrail.
- Rate limiting cho chat endpoints.
- Endpoint `/status` đã được bảo vệ, không expose config.
- Không rò rỉ raw API key.
- DB queries dùng parameterized SQL.
- History và rating scoped theo sessions của student đang đăng nhập.

## 9. Ghi Chú Triển Khai

- Rate limiting dùng `express-rate-limit` đã có sẵn trong `backend/package.json`,
  không cần thêm dependency mới.
- Cùng một router mount ở cả `/api/assistant` và `/api/v1/assistant`, nên mọi thay
  đổi route áp dụng cho cả hai API shape.

## 10. Giới Hạn Đã Biết (Known Limits)

- Migration 024 cần được apply ở environment đang chạy; repository giữ best-effort
  compatibility nếu schema cũ chưa có preference/rating columns.
- Rating persistence là best-effort: `assistant.repository.js` chỉ update rating
  columns nếu schema `chatbot_messages` có cột tương ứng.
- Stream endpoint trả SSE events nhưng backend normalize final response trước khi gửi
  về UI (chưa phải token-by-token streaming).
- Chưa có durable request-id idempotency ở DB; frontend vì vậy không retry tự động một
  stream request có thể đã được backend persist.
- Full vector RAG / knowledge-base nâng cao chưa được triển khai.
