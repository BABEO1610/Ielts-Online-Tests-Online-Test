# Implementation Plan: Trợ lý ảo IELTS toàn hệ thống (Global Assistant)

**Feature Branch**: `feature/global-ielts-virtual-assistant`  
**Feature Directory**: `.sdd/specs/global-ielts-virtual-assistant`  
**Spec File**: `.sdd/specs/global-ielts-virtual-assistant/spec.md`  
**Plan File**: `.sdd/specs/global-ielts-virtual-assistant/plan.md`  
**Created**: 2026-06-19  
**Status**: Draft  
**Feature Name**: `global-ielts-virtual-assistant`

---

## 1. Summary

Feature này triển khai một **trợ lý ảo IELTS toàn hệ thống (Global Assistant)** xuất hiện ở hầu hết các trang bình thường của website.

Scope đã chốt:

- Guest thấy assistant button nhưng không được chat.
- Guest bấm assistant sẽ thấy `LoginRequiredPrompt` hoặc được redirect sang Login/Register.
- Chỉ Student đã đăng nhập mới gửi message được.
- Student đã đăng nhập dùng **General Assistant** để tìm đề, tìm lesson, tìm theo `skill`, `topic`, `level`, hỏi study tips và navigation.
- Student đã đăng nhập và đã submitted attempt dùng **Post-test Review Assistant** để hỏi giải thích đáp án.
- Assistant hidden hoặc disabled ở `Active Test Page`.
- Backend luôn kiểm tra auth; request không có valid auth token phải trả `LOGIN_REQUIRED`.
- Phase nâng cấp chất lượng dùng **Controlled Context Injection**, không dùng full vector RAG.
- Assistant sẽ có Intent Router, Mode-based Prompting, Session Memory, Streaming và Rating Feedback đơn giản.

---

## 2. Technical Context

### 2.1 Project Context

- Project là IELTS learning website.
- Hệ thống có Guest, Student, Tutor/Admin.
- Có thư viện đề thi, lessons, questions, answers, passages, attempts và chatbot tables hiện có.
- Feature được phát triển theo hướng **Spec-Driven Development**.

### 2.2 Tech Stack dự kiến

- Frontend: `React`, `React Router`
- Backend: `Node.js` + `Express 5.x`
- Database: `PostgreSQL 16` trên Supabase
- Auth: `Supabase Auth` / JWT hoặc session hiện có của project
- API style: `REST API`

### 2.3 Feature Type

- `Global visibility`
- `Authenticated chat`
- `Context-aware Q&A`
- `Post-test review`
- `Guardrailed AI assistant`
- `Controlled context injection`
- `Session-level memory`
- `Streaming assistant response`
- `Simple rating feedback`

### 2.4 Environment Constraint

Project dùng Supabase và việc pull/inspect database có thể cần VPN. Trong môi trường agent không có VPN:

- Không bắt buộc chạy DB pull, migration apply hoặc runtime flow phụ thuộc Supabase.
- Không tạo migration mới nếu chưa inspect schema thật.
- Khi code/spec xong, agent báo rõ phần test/runtime nào đã skip do Supabase/VPN.

---

## 3. Constitution Check

### 3.1 Spec-Driven Development

Plan này phải căn chỉnh với `.sdd/specs/global-ielts-virtual-assistant/spec.md`. (PASS)

### 3.2 Authentication và Access Control

- Guest không được gọi chat/history thành công. (PASS)
- `POST /api/assistant/chat` yêu cầu valid auth token cho mọi message. (PASS)
- `GET /api/assistant/history` yêu cầu valid auth token. (PASS)
- Student chỉ được hỏi review attempt của chính mình. (PASS)

### 3.3 Test-taking Integrity

- Active Test Page hidden/disabled assistant trên UI. (PASS)
- Backend block request có `pageType === "active-test"`. (PASS)
- Assistant không đưa answer, hint hoặc explanation khi attempt chưa submitted. (PASS)

### 3.4 Database Safety

- Ưu tiên `chatbot_sessions` và `chatbot_messages`. (PASS)
- Không tạo bảng `assistant_chat_interactions` nếu bảng hiện có đủ. (PASS)
- Migration mới chỉ tạo sau khi inspect schema thật. (PASS)

### 3.5 Context Injection over RAG

- Phase này không dùng vector database hoặc embeddings. (PASS)
- Backend query dữ liệu chính thức bằng SQL/filter rồi inject vào prompt. (PASS)
- Nếu DB không có result cho `FIND_TEST`/`FIND_LESSON`, assistant không được bịa. (PASS)

### 3.6 Streaming và Feedback

- Streaming không được bypass auth, active-test block hoặc guardrails. (PASS)
- Rating feedback chỉ ghi cho message thuộc session của Student đang đăng nhập. (PASS)

---

## 4. Architecture Overview

### 4.1 Guest Flow

```text
Guest sees assistant button
-> Guest clicks assistant
-> Show LoginRequiredPrompt or redirect Login/Register
-> Guest cannot send message
```

Frontend không hiển thị input chat có thể gửi message cho Guest. Backend vẫn phải block request trực tiếp từ Guest bằng `LOGIN_REQUIRED`.

### 4.2 Student General Assistant Flow

```text
Student login
-> Student opens assistant
-> Student asks general IELTS question
-> Backend checks auth
-> Backend detects intent
-> Backend applies guardrails
-> Backend builds controlled context injection
-> Backend routes to mode prompt
-> Gemini answers or Backend reports missing data
-> Backend saves session memory
```

General Assistant dùng cho các câu hỏi như tìm test, lesson, skill, topic, level, study tips cơ bản và navigation trong website.

### 4.2.1 Intent Router Flow

```text
message + page context
-> detectIntent()
-> GREETING | NAVIGATION | GENERAL_STUDY_TIPS | FIND_TEST | FIND_LESSON | POST_TEST_REVIEW | OUT_OF_SCOPE | UNKNOWN
-> choose context builder
-> choose mode prompt
```

Intent Router phải deterministic trước; không cần gọi AI để phân loại trong phase này.

### 4.2.2 Controlled Context Injection Flow

```text
intent
-> query database if needed
-> load recent session messages if useful
-> build JSON context contract
-> inject into prompt
```

Context contract:

```json
{
  "mode": "FIND_TEST",
  "databaseResults": [],
  "sessionMemory": [],
  "allowedActions": ["recommend_existing_tests", "say_missing_data"],
  "forbiddenActions": ["invent_tests", "invent_links", "generate_band_score"],
  "suggestedLinks": []
}
```

For `FIND_TEST` and `FIND_LESSON`, empty database results should usually return a missing-data answer without relying on Gemini to invent content.

### 4.3 Student Post-test Review Flow

```text
Student login
-> Student opens assistant on result/review page
-> Student asks review question
-> Backend checks auth
-> Backend checks attempt owner
-> Backend checks attempt submitted/completed
-> Backend loads question, answer, explanation, passage/transcript
-> Assistant answers from official data or reports missing data
```

### 4.4 Active Test-taking Flow

```text
Student enters Active Test Page
-> Assistant hidden or disabled on UI
-> Direct API request with pageType active-test is blocked
-> Backend returns ASSISTANT_DISABLED_DURING_TEST or ATTEMPT_NOT_SUBMITTED
```

### 4.5 Streaming Flow

```text
Student sends valid message
-> Backend checks auth/guardrails/context
-> Backend starts Gemini streaming
-> Frontend renders partial chunks
-> Backend saves final assistant message when stream completes
```

Streaming endpoint must not stream blocked requests.

### 4.6 Rating Feedback Flow

```text
Student receives assistant message
-> Student clicks useful/not useful
-> Frontend sends rating
-> Backend checks auth + message ownership
-> Backend stores rating if schema supports it
```

---

## 5. Frontend Plan

### 5.1 File Structure

```text
frontend/src/features/global-assistant/
  components/
    GlobalAssistantButton.jsx
    GlobalAssistantPanel.jsx
    ChatMessageList.jsx
    ChatMessageItem.jsx
    ChatInputBox.jsx
    LoginRequiredPrompt.jsx
    AssistantDisabledNotice.jsx
  services/
    assistantApi.js
  hooks/
    useAssistantAvailability.js
```

### 5.2 Components

- `GlobalAssistantButton`: Nút nổi mở trợ lý, hiển thị ở các trang bình thường.
- `GlobalAssistantPanel`: Cửa sổ assistant.
- `ChatMessageList`, `ChatMessageItem`: Hiển thị hội thoại.
- `ChatInputBox`: Chỉ enabled khi Student đã đăng nhập và assistant available.
- `LoginRequiredPrompt`: Hiển thị cho Guest khi bấm assistant.
- `AssistantDisabledNotice`: Hiển thị nếu cần khi assistant disabled.

### 5.3 Page Placement

- Xuất hiện: Home Page, Test List, Lesson Page, Skill Page, Result Page, Review Answer Page và các page bình thường khác.
- Hidden/Disabled: Active Test Page.

### 5.4 Frontend Auth Behavior

- Guest:
  - Thấy button.
  - Click button -> show `LoginRequiredPrompt` hoặc redirect Login/Register.
  - Không render/send `ChatInputBox` ở trạng thái có thể gửi.
- Student:
  - Thấy button ở page bình thường.
  - Có thể gửi message.
  - Nếu API trả `LOGIN_REQUIRED`, panel chuyển sang login prompt.

---

## 6. Backend Plan

### 6.1 File Structure

```text
backend/src/api/assistant/
  assistant.routes.js
  assistant.controller.js
  assistant.service.js
  assistant.guardrails.js
  assistant.validation.js
  assistant.constants.js
  assistant.intent.js
  assistant.context.js
  assistant.prompts.js
  assistant.response.js
  assistant.selfcheck.js
```

### 6.2 API Endpoints

```text
POST /api/assistant/chat
POST /api/assistant/chat/stream
GET /api/assistant/history
POST /api/assistant/messages/:messageId/rating
```

Versioned aliases should also exist under:

```text
POST /api/v1/assistant/chat
POST /api/v1/assistant/chat/stream
GET /api/v1/assistant/history
POST /api/v1/assistant/messages/:messageId/rating
```

### 6.3 Request Payload

```json
{
  "message": "string",
  "context": {
    "pageType": "home | test-list | lesson | result | review | active-test",
    "attemptId": "string | null",
    "questionId": "string | null"
  }
}
```

### 6.4 POST /api/assistant/chat Logic

1. Validate payload.
2. Check valid auth token.
3. If user is not authenticated:
   - Return `LOGIN_REQUIRED`.
   - Do not process message.
   - Do not call AI.
   - Do not create chat message.
4. If `context.pageType === "active-test"`:
   - Block request.
   - Return `ASSISTANT_DISABLED_DURING_TEST` or `ATTEMPT_NOT_SUBMITTED`.
5. If Student is authenticated and `attemptId` is missing:
   - Detect intent.
   - Build context injection.
   - Route to correct mode handler.
   - Query public IELTS website content only when needed.
   - Answer from available data or return a missing-data response.
6. If Student is authenticated and `attemptId` is present:
   - Route to Post-test Review Assistant.
   - Check attempt exists.
   - Check attempt owner.
   - Check attempt submitted/completed.
   - Load question, answer, explanation, passage/transcript if available.
   - Return explanation from official data or `MISSING_EXPLANATION`.

### 6.5 GET /api/assistant/history Logic

1. Check valid auth token.
2. If user is not authenticated, return `LOGIN_REQUIRED`.
3. Return only the authenticated Student's assistant history.
4. Never return another user's sessions/messages.

### 6.6 POST /api/assistant/chat/stream Logic

Same validation/auth/guardrail/context rules as `POST /api/assistant/chat`, then:

1. Start Gemini stream only after request is allowed.
2. Send partial chunks to frontend.
3. Save final assistant message after stream completes.
4. Return/emit safe error event if AI provider fails.

### 6.7 POST /api/assistant/messages/:messageId/rating Logic

1. Check valid auth token.
2. Check Student role.
3. Check message belongs to Student's own assistant session.
4. Save rating `up` or `down`.
5. If schema lacks rating fields, fail gracefully or defer storage until additive migration is approved.

---

## 7. Permission Plan

- **Guest**:
  - May see assistant button.
  - May click assistant button.
  - Cannot send messages.
  - Cannot call chat/history API successfully.
- **Student**:
  - May use General Assistant after login.
  - May use Post-test Review Assistant after submitted attempt.
  - Cannot use assistant in active-test mode.
  - Cannot access other users' attempts/history.
- **Tutor/Admin**:
  - Not main actors for this phase.
  - Their managed content can be used as official source if published/accessible.

---

## 8. AI Guardrails Plan

- Refuse out-of-scope questions outside IELTS website content.
- Refuse Writing/Speaking grading in this phase.
- Refuse band score generation.
- Refuse answer/hint/explanation during active test or before submitted attempt.
- Do not invent tests, lessons, answers, explanations or scores.
- Prefer official database content.
- If data is missing, say missing instead of guessing.
- Keep responses concise and beginner/intermediate friendly.
- Run hard guardrails before context injection.
- Run response self-check after AI output.
- Block malformed/unsafe AI output for strict modes.

---

## 8.1 Intent and Mode Plan

### Intents

```text
GREETING
NAVIGATION
GENERAL_STUDY_TIPS
FIND_TEST
FIND_LESSON
POST_TEST_REVIEW
OUT_OF_SCOPE
UNKNOWN
```

### Modes

Each intent maps to one mode prompt:

```text
GREETING -> greeting prompt
NAVIGATION -> website navigation prompt
GENERAL_STUDY_TIPS -> study tips prompt
FIND_TEST -> test search prompt
FIND_LESSON -> lesson/resource search prompt
POST_TEST_REVIEW -> review explanation prompt
OUT_OF_SCOPE -> refusal
UNKNOWN -> clarification or safe general response
```

---

## 8.2 Response Contract Plan

Preferred Gemini output:

```json
{
  "answer": "string",
  "suggestedLinks": [],
  "usedDatabase": true,
  "needsMoreContext": false,
  "safety": {
    "inventedContent": false,
    "outOfScope": false,
    "containsBandScore": false,
    "containsWritingSpeakingGrading": false
  }
}
```

Backend parses and normalizes response before returning to frontend.

---

## 9. Data Model Plan

### 9.1 Existing Tables

Database hiện có:

```text
ai_explain_requests
ai_feedback_reports
audit_logs
chatbot_messages
chatbot_sessions
contact_submissions
email_verification_tokens
library_resources
mock_tests
oauth_accounts
password_history
password_reset_tokens
platform_metrics_snapshots
question_answers
question_blocks
questions
speaking_submissions
test_attempts
test_passages
tutor_feedback_reports
tutor_student_notes
user_sessions
users
v_active_sessions
writing_submissions
```

### 9.2 Chat Storage Decision

- Prefer `chatbot_sessions` and `chatbot_messages`.
- Do not create `assistant_chat_interactions` while existing tables can represent sessions/messages.
- Use recent messages in `chatbot_messages` as session-level memory only.
- Store rating feedback in existing chatbot message/session schema if possible.
- Before any migration, inspect real schema of `chatbot_sessions` and `chatbot_messages`.
- If missing fields are required, create a small additive migration only.
- If Supabase access requires VPN and agent cannot inspect schema, DB migration work must be deferred or based on schema supplied by project owner.

---

## 10. API Contract

### 10.1 Success Response

```json
{
  "answer": "string",
  "suggestedLinks": [],
  "conversationId": "string | null",
  "code": null
}
```

### 10.2 Error Response

```json
{
  "answer": null,
  "suggestedLinks": [],
  "code": "LOGIN_REQUIRED",
  "message": "Bạn cần đăng nhập để sử dụng trợ lý IELTS."
}
```

### 10.2.1 Streaming Event Contract

Recommended event types:

```text
assistant.start
assistant.delta
assistant.done
assistant.error
```

Final non-streaming shape should remain compatible with current `answer`, `suggestedLinks`, `conversationId`, `code`.

### 10.2.2 Rating Response

```json
{
  "success": true,
  "messageId": "string",
  "rating": "up | down",
  "code": null
}
```

### 10.3 Error Codes

```text
LOGIN_REQUIRED
FORBIDDEN
VALIDATION_ERROR
ASSISTANT_DISABLED_DURING_TEST
ATTEMPT_NOT_FOUND
ATTEMPT_NOT_SUBMITTED
QUESTION_NOT_FOUND
MISSING_CONTEXT
MISSING_EXPLANATION
OUT_OF_SCOPE
INTERNAL_ERROR
```

Required messages:

```text
LOGIN_REQUIRED: "Bạn cần đăng nhập để sử dụng trợ lý IELTS."
ASSISTANT_DISABLED_DURING_TEST: "Trợ lý IELTS không khả dụng trong lúc làm bài."
ATTEMPT_NOT_SUBMITTED: "Bạn chỉ có thể hỏi trợ lý sau khi nộp bài."
OUT_OF_SCOPE: "Mình chỉ hỗ trợ nội dung IELTS trên website."
MISSING_EXPLANATION: "Hiện tại hệ thống chưa có đủ dữ liệu để giải thích câu này."
```

---

## 11. Testing Plan

### 11.1 Manual / Acceptance Cases

- Guest vào Home Page thấy assistant button.
- Guest bấm assistant thấy `LoginRequiredPrompt` hoặc redirect Login/Register.
- Guest không gửi được message.
- Request không có auth token gọi `POST /api/assistant/chat` nhận `LOGIN_REQUIRED`.
- Request không có auth token gọi `GET /api/assistant/history` nhận `LOGIN_REQUIRED`.
- Student đăng nhập, mở assistant ở Home Page, hỏi "Có đề Reading về Environment không?".
- Student ở Active Test Page không thấy assistant hoặc assistant disabled.
- Direct API với `pageType = "active-test"` bị block.
- Student đã submitted attempt, vào Review Page, hỏi "Vì sao câu 5 đáp án là B?".
- Student hỏi Writing/Speaking grading, band score, crypto, weather hoặc câu ngoài IELTS thì assistant từ chối.
- Student hỏi "Chào bạn" -> assistant route `GREETING`, không trả missing data.
- Student hỏi navigation -> assistant route `NAVIGATION`, trả route website phù hợp.
- Student hỏi tìm test/lesson không có DB result -> assistant không bịa item.
- Streaming chat render từng phần và lưu final message.
- Student rating message của chính mình thành công.
- Student không rating được message của user khác.

### 11.2 Supabase/VPN Note

Do Supabase cần VPN để pull/inspect database, agent không bắt buộc chạy runtime tests hoặc DB-dependent tests trong môi trường không có VPN. Khi hoàn tất code/spec, agent chỉ cần báo các phần đã sửa và ghi rõ test nào chưa chạy.

---

## 12. Implementation Strategy

1. Đồng bộ `spec.md`, `plan.md`, `tasks.md`.
2. Xây frontend shell: button, panel, login prompt, disabled state, availability hook.
3. Xây backend route/controller/validation/constants.
4. Thêm auth guard bắt buộc cho chat/history.
5. Thêm active-test block.
6. Implement Intent Router.
7. Implement Controlled Context Injection.
8. Implement mode-based prompt builder.
9. Implement response normalization and self-check.
10. Implement General Assistant cho Student đã login.
11. Implement Post-test Review Assistant với owner/submitted checks.
12. Tích hợp session memory bằng `chatbot_sessions`/`chatbot_messages`.
13. Implement streaming endpoint/UI.
14. Implement simple rating feedback.
15. Document manual test cases và phần skip do Supabase/VPN nếu không chạy được.

---

## 13. Definition of Done

1. Guest thấy assistant button nhưng không chat được.
2. Guest click assistant thấy `LoginRequiredPrompt` hoặc redirect Login/Register.
3. `POST /api/assistant/chat` yêu cầu login cho mọi message.
4. `GET /api/assistant/history` yêu cầu login.
5. Request không có auth token trả `LOGIN_REQUIRED`.
6. Student login dùng được General Assistant ở page bình thường.
7. Student đã submitted attempt dùng được Post-test Review Assistant.
8. Assistant hidden/disabled ở Active Test Page.
9. Backend block `pageType = "active-test"`.
10. Assistant không bịa dữ liệu.
11. Assistant không chấm Writing/Speaking hoặc generate band score.
12. Assistant từ chối câu hỏi ngoài phạm vi IELTS website.
13. Chat history ưu tiên dùng `chatbot_sessions` và `chatbot_messages`.
14. Không tạo bảng trùng chức năng với bảng chatbot hiện có.
15. Assistant dùng Context Injection thay vì full vector RAG trong phase này.
16. Intent Router và mode-based prompt đã có test coverage.
17. Streaming không bypass auth/guardrails.
18. Rating feedback kiểm tra ownership.
19. Nếu không chạy test/runtime do Supabase cần VPN, trạng thái skip được báo rõ khi bàn giao.
