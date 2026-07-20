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
- Nhớ cách xưng hô do student đặt trong active conversation; hỗ trợ đặt, hỏi lại và
  xóa preference bằng tiếng Việt hoặc tiếng Anh.
- Dùng các lượt user/assistant gần nhất để giải tham chiếu như “hai cái này”, “phần
  này”, “chúng” và nối mục tiêu học sang yêu cầu tìm đề/tài liệu.
- Ghi log metadata AI qua `ai_usage_logs`.

### Ngoài scope:

- Tutor AI support.
- Chấm điểm Writing/Speaking trong chatbot.
- Tiết lộ đáp án/hint khi đang thi.
- Bảng chatbot thứ hai trùng lặp `chatbot_sessions`/`chatbot_messages`.
- Full vector RAG / embedding. Hiện tại dùng static JSON knowledge chunks.
- Hồ sơ preference dài hạn dùng chung giữa nhiều conversation hoặc nhiều tài khoản.

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

Frontend gửi page context kèm mỗi tin nhắn và ưu tiên gọi
`/assistant/chat/stream`. Frontend không tự POST lại cùng message qua `/assistant/chat`
khi kết quả stream không chắc chắn, vì backend có thể đã persist response trước lúc kết
nối rớt; thay vào đó UI hiển thị lỗi để tránh ghi trùng và làm nhiễu conversation memory.
SSE parser vẫn xử lý frame cuối ngay cả khi stream kết thúc không có blank line.

Sau response đầu tiên, frontend giữ `conversationId` ở component nút bao ngoài và gửi
lại cho cả JSON/SSE request. Đóng rồi mở lại panel không làm mất ID này; khi student
đổi tài khoản, frontend remount panel để xóa cả ID lẫn history state của tài khoản cũ.
History endpoint chỉ trả message của một owned conversation. Khi frontend chưa có ID,
backend chọn active conversation có message mới nhất (không chỉ dựa vào `started_at`)
và trả ID đó cùng history để phần UI đang hiển thị trùng với phần AI dùng làm memory.

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
- `conversationId`: tùy chọn, phải là UUID hợp lệ. Alias cũ `sessionId` chỉ được giữ
  để tương thích; service luôn resolve lại active session thuộc student hiện tại.

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
- `assistant.memory.js` — nhận diện và sanitize cách xưng hô theo conversation.
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
  -> assistantApi.streamChat (sendChat vẫn tồn tại cho JSON caller tường minh)
  -> POST /api/v1/assistant/chat/stream
  -> assistantLimiter (rate limit)
  -> validateChatPayload
  -> resolveAuthenticatedUser + ensureStudent
  -> evaluateGuardrails
  -> resolve owned active conversation + preference memory
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

- `chatbot_sessions`: `id`, `user_id`, `preferred_address`, `started_at`, `ended_at`
- `chatbot_messages`: `id`, `session_id`, `role`, `content`, `tokens_used`, `created_at`

Repository kiểm tra động các cột trước khi insert/update. Các cột tùy chọn như
rating fields được xử lý best-effort (có thì lưu, không thì bỏ qua).

`preferred_address` tối đa 60 ký tự, được trích xuất chỉ từ message role `user`, tối đa
8 từ và loại bỏ nội dung giống prompt injection. Giá trị mới nhất trong active
conversation thắng; lệnh xóa đặt giá trị về `NULL`. Đây là dữ liệu không tin cậy khi
inject vào prompt và không được phép ghi đè system/safety rules.

AI provider calls được ghi log vào `ai_usage_logs` gồm: user, feature, provider,
model, token counts, success flag, error, latency, created_at. Prompt và câu trả lời
không lưu vào `ai_usage_logs`.

## 10. AI Provider và Deterministic Fallback

Global Assistant mặc định dùng Gemini khi có Gemini key, kể cả khi OpenAI key cũng tồn
tại cho tính năng khác như transcription. `AI_PROVIDER` được đặt tường minh vẫn có độ
ưu tiên cao nhất. Model được tách theo provider qua `GEMINI_MODEL` và `OPENAI_MODEL`;
`AI_MODEL` chỉ là alias tương thích và model của provider này không được gửi sang
provider kia. Gemini key được gửi bằng header `x-goog-api-key`, không nằm trong URL.

Với câu hỏi kiến thức, JSON endpoint yêu cầu structured response còn stream endpoint
yêu cầu final answer text. Nếu normalize/selfcheck xác định response không hợp lệ,
assistant retry đúng một lần ở plain-text mode. Retry vẫn nhận structured conversation
preference và đánh dấu toàn bộ recent
conversation/preference là untrusted; nhánh retry không được nới lỏng safety rules.

Chỉ khi provider/retry thất bại mới trả safe deterministic response từ
`buildIeltsKnowledgeFallback(message, contextInjection)`:

- Writing Task 1 / overview tips khi message đề cập `overview` hoặc `task 1`.
- Speaking Part 2 tips khi message đề cập `speaking` hoặc `part 2`.
- Reading tips khi message đề cập `reading`, `true false not given`, hoặc
  `matching headings`.
- Giải thích trực tiếp Skimming/Scanning và có thể dùng hai topic gần nhất để trả câu
  follow-up “kết hợp hai cái này”.
- Generic fallback ngắn khi chưa đủ căn cứ, không lộ câu kỹ thuật “chưa gọi được AI”.

Với `FIND_TEST`/`FIND_LESSON`, keyword được áp dụng trong SQL trước `ORDER BY/LIMIT`;
quantity chỉ cắt kết quả sau bước xếp hạng topic. Câu trả lời AI phải nhắc đúng ít nhất
một title trong `databaseResults`; nếu provider lỗi hoặc nêu title không có trong DB,
service thay bằng deterministic answer/link đã grounded từ DB.

Static knowledge không match nhưng provider khỏe **không** phải lỗi: assistant phải
trả lời hữu ích từ kiến thức IELTS/English an toàn của model, không được phát canned
message “Mình chưa gọi được AI”.

## 11. Yêu Cầu Bảo Mật

- Authenticated student bắt buộc cho mọi endpoint: chat, stream, history, rating, status.
- Chat endpoints có rate limit.
- `/status` không expose: provider, model, requested model, effective model,
  key configuration, key variable names, raw API keys.
- Active test bị chặn bằng backend guardrail, không chỉ dựa vào frontend.
- Input được validate trước khi service xử lý.
- DB queries dùng parameterized SQL.
- Chat history, preference và message insert scoped theo active session thuộc student
  đang đăng nhập. Foreign/closed `conversationId` không được đọc hoặc ghi.
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
- Cấu hình chỉ có Gemini key (không có `AI_PROVIDER`) chọn Gemini cùng model Gemini;
  cấu hình không được gửi GPT model sang Gemini hoặc Gemini model sang OpenAI.
- Static knowledge no-match + provider khỏe vẫn trả lời được kiến thức IELTS/English
  cụ thể, cùng ngôn ngữ với student.
- Câu “gọi tôi là Siêu nhân Đạt” được xác nhận không cần AI; các lượt sau trong cùng
  conversation có thể dùng/nhắc lại cách gọi này tự nhiên, kể cả sau hơn 8 message.
- Student có thể xóa cách gọi; preference không đi qua conversation/tài khoản khác và
  không thể ghi đè system/safety rules.
- Sau chuỗi Skimming → Scanning, câu “kết hợp 2 cái này” phải dùng được cả hai lượt
  hỏi/đáp gần nhất; nếu không có referent rõ ràng thì hỏi lại thay vì đoán.
- Sau lời mời luyện tập, “tìm 1 đề phù hợp với mình” phải route `FIND_TEST`, kế thừa
  skill/topic gần nhất và chỉ đề xuất test published/approved có thật trong DB; không
  được route sang Library hoặc suy đoán band/năng lực chưa được cung cấp.
- `conversationId` sai định dạng bị reject; ID hợp lệ nhưng không thuộc student không
  được dùng để đọc/ghi message.
- IELTS fallback dùng skill/topic và recent conversation khi có thể, không trả thông báo
  kỹ thuật “chưa gọi được AI”.
- Lookup theo topic lọc DB trước `LIMIT`; output theo đúng quantity và không chấp nhận
  title test/tài liệu do model tự đặt.
- Stream failure không được tự động gửi lại cùng message qua JSON, tránh lưu trùng cặp
  user/assistant và làm sai recent memory.
- Chat history chỉ trả records của student hiện tại và đúng owned conversation.
