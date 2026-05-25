# feat-ai-assistance Spec

# Duy Mạnh


# 1. Context & Goal

Feature `AI Assistance` hỗ trợ Student học IELTS realtime trong hệ thống.

Hệ thống cung cấp:

- Explain with AI
- AI Chatbot hỗ trợ học thuật
- Context-aware learning support

Feature này giúp Student:

- hiểu Tutor explanation dễ hơn,
- học tập hiệu quả hơn,
- nhận hỗ trợ nhanh trong quá trình self-learning.

AI chỉ đóng vai trò hỗ trợ học tập và không thay thế Tutor chính thức.



# 2. Actors & Roles

## Student

- Sử dụng Explain with AI.
- Chat với AI Assistant.
- Xem AI responses và conversation history.



## Tutor

- Cung cấp explanation gốc.
- Cung cấp academic context cho AI.



## Admin

- Theo dõi AI usage.
- Quản lý AI API quota.
- Monitor AI system health.



## AI System

- Generate AI responses.
- Inject learning context.
- Store AI interaction logs.
- Filter unsafe outputs.



# 3. Functional Requirements

## 3.1 Explain with AI

WHEN Student click "Explain with AI",  
THE SYSTEM SHALL collect:

- question content
- correct answer
- tutor explanation

và gửi tới AI Service.



WHEN AI Service nhận đủ context,  
THE SYSTEM SHALL generate simplified explanation phù hợp IELTS learning context.



WHEN AI explanation được generate thành công,  
THE SYSTEM SHALL hiển thị AI response trong study workspace.



WHEN Student gửi request Explain with AI,  
THE SYSTEM SHALL lưu request vào `ai_explain_requests`.



WHEN AI explanation được generate,  
THE SYSTEM SHALL log `tokens_used` cho AI cost tracking.



## 3.2 AI Chatbot

WHEN Student gửi message trong chatbot workspace,  
THE SYSTEM SHALL generate realtime AI response.



WHEN Student mở AI chatbot lần đầu,  
THE SYSTEM SHALL tạo mới `chatbot_session`.



WHEN Student tiếp tục conversation cũ,  
THE SYSTEM SHALL load previous chatbot messages theo session.



WHEN AI response được generate thành công,  
THE SYSTEM SHALL lưu conversation vào `chatbot_messages`.



WHEN Student gửi empty prompt,  
THE SYSTEM SHALL reject request và hiển thị validation message.



WHEN Student gửi prompt ngoài phạm vi IELTS learning,  
THE SYSTEM SHALL từ chối phản hồi một cách lịch sự.



## 3.3 Conversation History

WHEN chatbot message được lưu,  
THE SYSTEM SHALL persist:

- role
- content
- tokens_used
- created_at



WHEN Student truy cập chat history,  
THE SYSTEM SHALL chỉ trả về dữ liệu thuộc account hiện tại.



## 3.4 Safety & Moderation

WHEN AI response chứa unsafe content,  
THE SYSTEM SHALL filter response trước khi hiển thị.



WHEN request chứa sensitive information,  
THE SYSTEM SHALL tránh log raw sensitive data.



WHEN Student spam AI requests,  
THE SYSTEM SHALL temporary block requests.



## 3.5 Authentication & Authorization

WHEN unauthenticated user truy cập AI Assistance,  
THE SYSTEM SHALL yêu cầu login trước khi sử dụng feature.



WHEN Student truy cập AI session của user khác,  
THE SYSTEM SHALL deny access.



# 4. Non-functional Requirements

## Performance

- AI response time < 5 seconds.
- AI responses phải hỗ trợ realtime streaming.
- Hệ thống phải support tối thiểu 300 concurrent AI requests.



## Reliability

- Retry AI request tối đa 3 lần nếu timeout.
- AI requests phải được log để phục vụ monitoring.
- Chat history phải persist sau page refresh.



## Security

- AI API key không được expose frontend.
- Student chỉ truy cập được dữ liệu của chính mình.
- Chỉ gửi dữ liệu cần thiết tới AI provider.



## Scalability

- Chatbot architecture phải support future streaming expansion.
- AI provider phải replaceable mà không ảnh hưởng business flow.



# 5. Data Model

## 5.1 chatbot_sessions

Lưu AI conversation sessions của Student.

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| started_at | TIMESTAMPTZ |
| ended_at | TIMESTAMPTZ |

### Relationships

- `user_id -> users.id`



## 5.2 chatbot_messages

Lưu conversation giữa Student và AI Assistant.

| Field | Type |
|---|---|
| id | UUID |
| session_id | UUID |
| role | VARCHAR(20) |
| content | TEXT |
| tokens_used | INT |
| created_at | TIMESTAMPTZ |

### Relationships

- `session_id -> chatbot_sessions.id`

### Constraints

- role chỉ chấp nhận:
  - user
  - assistant



## 5.3 ai_explain_requests

Lưu Explain with AI requests.

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| question_id | UUID |
| tutor_explanation | TEXT |
| ai_response | TEXT |
| tokens_used | INT |
| created_at | TIMESTAMPTZ |

### Relationships

- `user_id -> users.id`
- `question_id -> questions.id`



## 5.4 questions

Nguồn learning context cho AI explanation.

| Field | Type |
|---|---|
| id | UUID |
| test_id | UUID |
| question_text | TEXT |
| correct_answer | TEXT |
| explanation | TEXT |

### Relationships

- `test_id -> mock_tests.id`



## 5.5 users

Quản lý Student accounts sử dụng AI Assistance.

| Field | Type |
|---|---|
| id | UUID |
| email | VARCHAR(255) |
| role | user_role |
| status | account_status |



# 6. Error Handling

WHERE AI API timeout,  
THE SYSTEM SHALL retry request tối đa 3 lần.



WHERE AI Service unavailable,  
THE SYSTEM SHALL hiển thị:

> "Xin lỗi, Tutor AI đang gặp chút trục trặc, vui lòng thử lại sau."



WHERE AI response empty hoặc invalid,  
THE SYSTEM SHALL hiển thị fallback error message.



WHERE Student spam requests vượt quota,  
THE SYSTEM SHALL block requests trong 5 phút.



WHERE database persistence fail,  
THE SYSTEM SHALL log system error để phục vụ debugging.



# 7. Acceptance Criteria

- [ ] Student click "Explain with AI" → nhận AI explanation.
- [ ] AI explanation bám sát Tutor explanation.
- [ ] AI response trả về dưới 5 giây.
- [ ] Chatbot hỗ trợ realtime streaming.
- [ ] Conversation history được lưu đúng session.
- [ ] Student không xem được dữ liệu user khác.
- [ ] AI requests được log token usage.
- [ ] Unsafe AI responses bị filter.
- [ ] Spam AI requests bị block đúng policy.



# 8. Out of Scope

- AI official IELTS grading.
- AI thay thế Tutor.
- AI-generated full essay writing.
- Voice chatbot.
- AI avatar assistant.
- Human-like emotional counseling.



# Notes / Open Questions

- Có cần giới hạn số AI requests mỗi ngày không?
- Có cần lưu long-term chatbot history không?
- Có cần report button cho hallucination không?
- Có cần cache AI responses để giảm AI cost không?
- Có cần support multilingual AI explanations không?