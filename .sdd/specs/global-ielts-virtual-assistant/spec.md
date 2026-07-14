# spec.md — Đặc Tả Chức Năng: Global IELTS Virtual Assistant

Trạng thái: Active — Source of truth cho tính năng chatbot học viên.

## 1. Mục Đích

Global IELTS Virtual Assistant là chatbot hỗ trợ học viên trên nền tảng IELTSZone.
Chatbot giúp học viên:

- Hỏi kiến thức IELTS (ngữ pháp, từ vựng, chiến lược làm bài, tiêu chí chấm điểm).
- Tìm đề thi (mock tests) và tài liệu (library resources) có sẵn trong hệ thống.
- Nhận hỗ trợ điều hướng website.
- Review bài thi đã nộp khi có đủ ngữ cảnh.

Chatbot **không thay thế** hệ thống AI Writing/Speaking grading. Chatbot **không thay
thế** tutor. Tutor AI support nằm ngoài scope.

## 2. Phạm Vi

### Trong scope:

- Widget chatbot toàn cục trong ứng dụng React.
- Guest thấy widget nhưng phải đăng nhập mới được chat.
- Chỉ authenticated student được chat.
- Chat bị chặn khi đang làm bài thi (active test).
- Trả lời theo ngữ cảnh: page context, DB lookup có kiểm soát, static IELTS
  knowledge, AI generation.
- Deterministic fallback khi AI provider lỗi.
- Lưu lịch sử chat qua `chatbot_sessions` và `chatbot_messages`.
- Ghi log metadata AI qua `ai_usage_logs`.

### Ngoài scope:

- Tutor AI support.
- Chấm điểm Writing/Speaking trong chatbot.
- Tiết lộ đáp án/hint khi đang thi.
- Bảng chatbot thứ hai trùng lặp `chatbot_sessions`/`chatbot_messages`.
- Full vector RAG / embedding. Hiện tại dùng static JSON knowledge chunks.

## 3. Routes

Assistant router được mount ở hai nơi:

- `/api/assistant` từ `backend/src/app.js`
- `/api/v1/assistant` từ `backend/src/routes/api/v1/index.js`

### Danh sách endpoint:

| Phương thức | Đường dẫn | Xác thực | Ghi chú |
|---|---|---|---|
| POST | `/chat` | Student bắt buộc | Rate limited, validate payload, trả JSON |
| POST | `/chat/stream` | Student bắt buộc | Rate limited, trả SSE events |
| GET | `/history` | Student bắt buộc | Trả lịch sử chat của user hiện tại |
| GET | `/status` | Student bắt buộc | Chỉ trả health tối giản, không leak config |
| POST | `/messages/:messageId/rating` | Student bắt buộc | Lưu rating nếu schema hỗ trợ |

`POST /chat` và `POST /chat/stream` áp dụng rate limit khoảng 30 requests/phút/IP
qua middleware `express-rate-limit`.

## 4. Xác Thực và Phân Quyền (Auth & Authorization)

Controller tự resolve xác thực:

- Đọc cookie `accessToken` hoặc `access_token`.
- Verify JWT bằng `verifyAccessToken`.
- Kiểm tra phiên hoạt động qua `findActiveSession`.
- Kiểm tra Redis revoked-session khi Redis sẵn sàng.
- Chặn user có `must_change_password`.
- Yêu cầu `role === 'student'`.

Guest nhận response `LOGIN_REQUIRED`. Role khác student nhận response `FORBIDDEN`.

## 5. Hành Vi Frontend

Các file liên quan:

- `frontend/src/App.jsx` — render widget toàn cục.
- `frontend/src/features/global-assistant/components/GlobalAssistantButton.jsx`
- `frontend/src/features/global-assistant/components/GlobalAssistantPanel.jsx`
- `frontend/src/features/global-assistant/hooks/useAssistantAvailability.js`
- `frontend/src/features/global-assistant/services/assistantApi.js`
- `frontend/src/services/api.js`

Widget được render bởi `App.jsx`. Hook `useAssistantAvailability` ẩn chatbot khi
`pageType === 'active-test'`. Guest thấy widget nhưng panel hiện login prompt, không
gửi request.

Frontend gửi page context kèm mỗi tin nhắn. API service ưu tiên gọi
`/assistant/chat/stream`, fallback sang `/assistant/chat` nếu streaming thất bại
trước khi nhận được delta đầu tiên.

## 6. Validation Đầu Vào

File: `backend/src/api/assistant/assistant.validation.js`

Quy tắc hiện tại:

- `message`: bắt buộc, trim, tối đa 2000 ký tự.
- `context`: bắt buộc.
- `pageType`: whitelist gồm `home`, `test`, `test-list`, `library`, `lesson`,
  `profile`, `result`, `review`, `active-test`, `practice_history`,
  `post_test_review`, `unknown`.
- `attemptId`, `questionId`, `route`, `visibleItems` được normalize trước khi
  chuyển vào service.

## 7. Guardrails

File: `backend/src/api/assistant/assistant.guardrails.js`

Chặn trước khi gọi AI:

- Chat khi đang thi (`active-test`).
- Yêu cầu ngoài phạm vi IELTS/English learning.
- Yêu cầu chấm Writing/Speaking hoặc dự đoán band score trong chatbot.
- Yêu cầu đáp án/hint ngoài ngữ cảnh review/result đã được phép.
- Yêu cầu trích xuất system prompt / dữ liệu nội bộ / dữ liệu riêng tư.

Khi `pageType === 'active-test'`, chat bị chặn ở backend kể cả khi frontend đã
ẩn nút.

## 8. Luồng Backend (Backend Flow)

Các file chính:

- `assistant.routes.js` — định nghĩa route và rate limit.
- `assistant.controller.js` — validate, resolve auth, gửi JSON/SSE.
- `assistant.service.js` — chạy pipeline chính.
- `assistant.repository.js` — persist sessions/messages, đọc history.
- `assistant.validation.js` — validate payload.
- `assistant.guardrails.js` — chặn request không hợp lệ.
- `assistant.intent.js` — phát hiện intent từ message.
- `assistant.scope-classifier.js` — LLM classifier khi rule intent trả UNKNOWN.
- `assistant.context.js` — xây dựng context injection.
- `assistant.prompts.js` — tạo prompt theo intent/mode.
- `assistant.response.js` — normalize response từ AI.
- `assistant.selfcheck.js` — kiểm tra response trước khi trả về.
- `ai.service.js` — wrapper gọi AI provider.
- `aiUsage.service.js` — ghi log metadata AI.

### Luồng xử lý end-to-end:

```text
Frontend GlobalAssistantPanel
  -> assistantApi.streamChat / sendChat
  -> POST /api/v1/assistant/chat/stream hoặc /chat
  -> assistantLimiter (rate limit)
  -> validateChatPayload
  -> resolveAuthenticatedUser + ensureStudent
  -> evaluateGuardrails
  -> runAssistantPipeline
     -> intent/router chọn luồng xử lý
     -> buildContextInjection (page context, DB lookup, static knowledge, session memory)
     -> AI provider nếu cần
     -> selfcheck kiểm tra response
  -> ai_usage_logs ghi metadata
  -> chatbot_sessions / chatbot_messages lưu tin nhắn
  -> trả response về UI
```

## 9. Persistence (Lưu Trữ)

Repository code dùng các bảng:

- `chatbot_sessions`: `id`, `user_id`, `started_at`, `ended_at`
- `chatbot_messages`: `id`, `session_id`, `role`, `content`, `tokens_used`, `created_at`

Repository kiểm tra động các cột trước khi insert/update. Các cột tùy chọn như
rating fields được xử lý best-effort (có thì lưu, không thì bỏ qua).

AI provider calls được ghi log vào `ai_usage_logs` gồm: user, feature, provider,
model, token counts, success flag, error, latency, created_at. Prompt và câu trả lời
không lưu vào `ai_usage_logs`.

## 10. Deterministic Fallback

Khi AI provider lỗi ở câu hỏi kiến thức IELTS, assistant không gọi AI lần nữa.
Trả về text cố định từ `buildIeltsKnowledgeFallback(message)`:

- Writing Task 1 / overview tips khi message đề cập `overview` hoặc `task 1`.
- Speaking Part 2 tips khi message đề cập `speaking` hoặc `part 2`.
- Reading tips khi message đề cập `reading`, `true false not given`, hoặc
  `matching headings`.
- Generic IELTS fallback khi không phát hiện skill cụ thể.

## 11. Yêu Cầu Bảo Mật

- Authenticated student bắt buộc cho mọi endpoint: chat, stream, history, rating, status.
- Chat endpoints có rate limit.
- `/status` không expose: provider, model, requested model, effective model,
  key configuration, key variable names, raw API keys.
- Active test bị chặn bằng backend guardrail, không chỉ dựa vào frontend.
- Input được validate trước khi service xử lý.
- DB queries dùng parameterized SQL.
- Chat history scoped theo user sessions của student đang đăng nhập.
- AI API calls chỉ được thực hiện từ backend services.

## 12. Tiêu Chí Chấp Nhận (Acceptance Criteria)

- Guest gọi `/status` không nhận được thông tin provider/model/key.
- Student nhận status health response tối giản.
- `POST /chat` và `POST /chat/stream` trả HTTP 429 khi vượt rate limit.
- Guest thấy widget trên trang thường nhưng không gửi được message.
- Authenticated student chat được ngoài active test.
- Chat bị chặn khi `pageType === 'active-test'`.
- Message trên 2000 ký tự bị reject.
- `pageType` không hợp lệ bị reject.
- IELTS fallback trả text cố định theo skill (Writing Task 1, Speaking Part 2,
  Reading).
- Chat history chỉ trả records của student hiện tại.
