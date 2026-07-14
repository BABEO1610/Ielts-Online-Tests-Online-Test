# RFC.md — Tổng Hợp Tính Năng: Global IELTS Virtual Assistant

**Tài liệu để học và trình bày trước hội đồng bảo vệ đồ án.**

---

## 1. Tổng Quan

Global IELTS Virtual Assistant là chatbot hỗ trợ học viên trên nền tảng IELTSZone.
Chatbot giúp:

- Giải đáp kiến thức IELTS (chiến lược, tiêu chí, ngữ pháp, từ vựng).
- Tìm đề thi và tài liệu có sẵn trong hệ thống.
- Điều hướng website.
- Review bài thi đã nộp.

Chatbot **tách biệt hoàn toàn** khỏi hệ thống AI Writing/Speaking Grading. Chatbot
không chấm điểm và không tạo band score.

## 2. Vì Sao Cần Chatbot?

- Học viên cần hỗ trợ 24/7 mà không cần chờ giảng viên.
- Hệ thống có nhiều trang (test, library, history, review) — chatbot giúp điều hướng
  nhanh.
- Câu hỏi IELTS thường lặp lại (True/False/Not Given khác gì? Writing overview viết
  thế nào?) → chatbot trả lời chuẩn nhờ knowledge base có kiểm soát.
- Tránh để học viên phải rời nền tảng để tìm kiến thức IELTS bên ngoài.

## 3. Kiến Trúc Tổng Quan

```text
┌─────────────────────────────┐
│     Frontend (React)         │
│  GlobalAssistantPanel.jsx    │
│  assistantApi.js             │
└──────────┬──────────────────┘
           │ POST /api/v1/assistant/chat/stream
           ▼
┌─────────────────────────────┐
│     Backend (Express)        │
│  assistant.routes.js         │
│  ├─ Rate Limiter             │
│  ├─ assistant.controller.js  │  ← validate, auth, SSE/JSON
│  ├─ assistant.guardrails.js  │  ← chặn active-test, grading, OOS
│  ├─ assistant.service.js     │  ← pipeline chính
│  │   ├─ assistant.intent.js  │  ← phát hiện ý định (rule + LLM)
│  │   ├─ assistant.context.js │  ← inject knowledge, DB, memory
│  │   ├─ assistant.prompts.js │  ← tạo prompt theo mode
│  │   └─ assistant.selfcheck  │  ← kiểm tra response
│  ├─ ai.service.js            │  ← gọi AI provider (Gemini)
│  └─ assistant.repository.js  │  ← lưu session/message
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│     PostgreSQL Database      │
│  chatbot_sessions            │
│  chatbot_messages            │
│  ai_usage_logs               │
│  mock_tests (đọc)            │
│  library_resources (đọc)     │
│  test_attempts (đọc)         │
│  questions / answers (đọc)   │
└─────────────────────────────┘
```

## 4. Luồng Request Chi Tiết

1. Học viên mở widget chatbot và gửi tin nhắn.
2. Frontend gửi message + page context tới `POST /api/v1/assistant/chat/stream`.
3. **Rate limiter** kiểm tra tần suất (30 req/phút/IP).
4. **Controller** validate payload (message ≤ 2000 ký tự, pageType hợp lệ).
5. **Controller** resolve auth từ cookie JWT → kiểm tra session → yêu cầu role
   student.
6. **Guardrails** chặn: active test, out-of-scope, yêu cầu chấm điểm, prompt
   extraction.
7. **Service** phát hiện intent: greeting, navigation, IELTS knowledge, tìm
   test/lesson, post-test review, clarification.
8. **Context builder** inject ngữ cảnh phù hợp:
   - Static knowledge JSON nếu IELTS_KNOWLEDGE.
   - DB lookup nếu FIND_TEST/FIND_LESSON.
   - Attempt/question data nếu POST_TEST_REVIEW.
   - Session memory (N tin nhắn gần nhất).
9. **AI provider** (Gemini) generate câu trả lời nếu cần.
10. **Selfcheck** kiểm tra: không chứa band score, không bịa test/lesson, không
    trả đáp án khi không có ngữ cảnh.
11. Metadata ghi vào `ai_usage_logs`, tin nhắn ghi vào `chatbot_messages`.
12. Response trả về qua SSE events hoặc JSON.

## 5. Bảo Mật và Guardrails

| Biện pháp | Mô tả |
|---|---|
| Auth | Cookie JWT + active session + role student |
| Rate limit | 30 requests/phút/IP cho /chat và /chat/stream |
| Active test block | Cả frontend (ẩn nút) và backend (guardrail chặn) |
| Chống hallucination | DB lookup chỉ trả dữ liệu published, fallback deterministic |
| Không chấm điểm | Guardrail chặn yêu cầu grading/band score |
| Không leak config | `/status` chỉ trả `{ code: null, status: "ok" }` |
| Input validation | Message trim + max 2000 chars + pageType whitelist |
| Scope giới hạn | Chỉ IELTS/English learning, từ chối nội dung ngoài phạm vi |

## 6. Fallback Khi AI Lỗi

Khi AI provider gặp sự cố:

- **Không gọi AI lần thứ hai.**
- Trả text cố định (deterministic fallback) theo kỹ năng:
  - Hỏi về Writing Task 1 → tips overview.
  - Hỏi về Speaking Part 2 → tips cue card.
  - Hỏi về Reading / TFNG → chiến lược Reading.
  - Không nhận diện skill → IELTS tips chung.
- Đảm bảo người dùng luôn nhận được phản hồi, không bị treo/lỗi trắng.

## 7. Vì Sao Không Dùng Vector RAG?

- Dữ liệu hiện tại nằm trong PostgreSQL, đã có cấu trúc rõ ràng → SQL query có
  kiểm soát đủ đáp ứng.
- Vector RAG cần thêm pgvector extension, embedding service, chunking pipeline →
  phức tạp và rủi ro cho đồ án.
- Static JSON knowledge base đáp ứng nhu cầu kiến thức IELTS thường gặp với chi phí
  triển khai thấp.
- Roadmap tương lai có thể nâng cấp nếu cần, nhưng phase hiện tại ưu tiên ổn định
  và đúng đắn.

## 8. Chatbot Khác Gì AI Grading?

| Tiêu chí | Chatbot (Virtual Assistant) | AI Grading |
|---|---|---|
| Mục đích | Hỗ trợ học, điều hướng, giải thích | Chấm điểm Writing/Speaking chính thức |
| Đầu vào | Tin nhắn chat + page context | Bài nộp Writing/Speaking |
| Đầu ra | Text trả lời + suggested links | Band score + criteria scores + feedback |
| Lưu trữ | `chatbot_messages` | `ai_grading_reports` |
| Endpoint | `/api/v1/assistant/chat` | `/api/v1/submissions/writing/:id/ai-grade` |
| Guardrails | Không cho chấm điểm | Không liên quan chatbot |

## 9. Giới Hạn Đã Biết (Known Limitations)

- Migration tạo `chatbot_sessions`/`chatbot_messages` chưa thấy trong repo — cần
  xác nhận trên DB production.
- Rating persistence là best-effort (phụ thuộc schema có cột rating hay không).
- Streaming hiện tại normalize final response rồi mới gửi SSE, chưa phải
  token-by-token.
- Static knowledge base cần maintain thủ công khi thêm nội dung IELTS mới.

## 10. Cách Trình Bày Trước Hội Đồng

### Đoạn nói mẫu (khoảng 2-3 phút):

> "Hệ thống IELTSZone của nhóm em có tích hợp một Chatbot Trợ Lý Ảo IELTS, được
> thiết kế để hỗ trợ học viên ngay trên nền tảng.
>
> Chatbot này giúp học viên **ba việc chính**: hỏi kiến thức IELTS như chiến lược
> làm bài, tiêu chí chấm điểm; tìm đề thi và tài liệu có sẵn trong hệ thống; và
> review lại bài thi đã nộp.
>
> Về kiến trúc, khi học viên gửi tin nhắn, frontend gửi request kèm page context tới
> backend. Backend sẽ qua nhiều lớp xử lý: **rate limit** chống spam, **validation**
> kiểm tra đầu vào, **authentication** xác thực học viên, **guardrails** chặn các yêu
> cầu không hợp lệ như chấm điểm Writing hay xem đáp án khi đang thi. Sau đó hệ
> thống phát hiện **ý định** của câu hỏi — ví dụ tìm đề hay hỏi kiến thức — rồi
> inject **ngữ cảnh phù hợp** vào prompt trước khi gọi AI.
>
> Điểm quan trọng cần nhấn mạnh: chatbot này **hoàn toàn tách biệt** khỏi hệ thống
> chấm điểm AI Writing/Speaking. Chatbot không chấm điểm, không dự đoán band score,
> và không bịa ra đề thi hay đáp án không tồn tại trong database.
>
> Về bảo mật, chỉ học viên đã đăng nhập mới được chat, có rate limit chống lạm dụng,
> và khi đang làm bài thi thì chatbot bị chặn cả frontend lẫn backend.
>
> Nhóm em chọn **Static Knowledge Base** thay vì Vector RAG vì dữ liệu kiến thức
> IELTS thường gặp có thể kiểm soát bằng JSON files, không cần phức tạp hóa hệ
> thống với embedding hay vector database trong phạm vi đồ án này."
