# plan.md — Kiến Trúc Hiện Tại (As-built): Global IELTS Virtual Assistant

Trạng thái: Active — Mô tả kiến trúc đang chạy, không phải proposal.

## 1. Kiến Trúc Frontend

- `frontend/src/App.jsx` — render widget chatbot toàn cục.
- `frontend/src/features/global-assistant/components/GlobalAssistantButton.jsx` — nút
  mở chatbot.
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
  context injection, gọi AI, selfcheck, persistence.

### Repository:

- `assistant.repository.js` — persist sessions/messages, đọc history, kiểm tra cột
  động trước khi insert.

### Intent & Classifier:

- `assistant.intent.js` — rule-based regex phát hiện intent từ message.
- `assistant.scope-classifier.js` — LLM scope classifier chạy khi rule intent trả
  UNKNOWN, trả JSON gồm intent, allowed, confidence, skill, needsUserInput.

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
  pageType whitelist, normalize attemptId/questionId/route/visibleItems.

### AI Provider:

- `backend/src/services/ai.service.js` — wrapper gọi AI provider (Gemini).
- `backend/src/services/aiUsage.service.js` — ghi log metadata vào `ai_usage_logs`.

## 3. Database

Bảng chatbot dùng trực tiếp:

- `chatbot_sessions` — lưu phiên chat: id, user_id, started_at, ended_at.
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

NEEDS_MANUAL_CHECK: Code repository dùng bảng `chatbot_sessions` và
`chatbot_messages` nhưng repo hiện không thấy dedicated migration file tạo các bảng
này.

## 4. Luồng Request

### Chat:

```text
GlobalAssistantPanel
  -> assistantApi.streamChat / sendChat
  -> POST /api/v1/assistant/chat/stream hoặc /chat
  -> assistantLimiter (rate limit)
  -> validateChatPayload
  -> resolveAuthenticatedUser + ensureStudent
  -> evaluateGuardrails
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
- Session memory → lấy N tin nhắn gần nhất để hiểu follow-up.

Hiện tại **không dùng** vector database hay external RAG service.

## 7. AI Provider và Fallback

AI calls đi qua `backend/src/services/ai.service.js`. Metadata được ghi vào
`ai_usage_logs`.

Khi AI provider lỗi ở câu hỏi kiến thức IELTS, `assistant.service.js` trả
deterministic fallback:

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

- `chatbot_sessions` và `chatbot_messages` được dùng bởi repository code nhưng repo
  không chứa dedicated migration file tạo bảng.
- Rating persistence là best-effort: `assistant.repository.js` chỉ update rating
  columns nếu schema `chatbot_messages` có cột tương ứng.
- Stream endpoint trả SSE events nhưng backend normalize final response trước khi gửi
  về UI (chưa phải token-by-token streaming).
- Full vector RAG / knowledge-base nâng cao chưa được triển khai.
