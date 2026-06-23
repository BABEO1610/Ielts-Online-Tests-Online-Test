# Feature Specification: Trợ lý ảo IELTS toàn hệ thống

**Feature Branch**: `feature/global-ielts-virtual-assistant`  
**Feature Directory**: `.sdd/specs/global-ielts-virtual-assistant`  
**Created**: 2026-06-19  
**Status**: Draft  
**Feature Name**: `global-ielts-virtual-assistant`

---

## 1. Mục tiêu Feature

Hệ thống cần có một **Global IELTS Virtual Assistant** xuất hiện ở hầu hết các trang của website để hỗ trợ Student đã đăng nhập tìm nội dung IELTS, hỏi study tips cơ bản, điều hướng trong website và hỏi giải thích đáp án sau khi đã hoàn thành bài.

Guest vẫn nhìn thấy nút trợ lý ảo để biết website có tính năng hỗ trợ, nhưng Guest chưa đăng nhập **không được gửi message**. Khi Guest bấm vào assistant, hệ thống phải hiển thị `LoginRequiredPrompt` hoặc redirect sang Login/Register.

Assistant phải bảo vệ tính toàn vẹn bài test: hidden hoặc disabled ở `Active Test Page`, không trả hint, answer hoặc explanation khi Student đang làm bài, không chấm Writing/Speaking và không generate band score trong phase này.

Implementation approach cho phase nâng cấp chất lượng assistant là **Controlled Context Injection**, không phải full vector RAG. Backend phải phân loại intent, query database có kiểm soát, inject context chính thức vào mode-based prompt, dùng session memory ở mức phiên chat, hỗ trợ streaming response và feedback rating đơn giản.

---

## 2. Bối cảnh

Website IELTS có các trang học tập và luyện thi như Home Page, Test List, Lesson Detail, Result Page, Review Answer Page và Active Test Page. Student cần một trợ lý chung để:

- Tìm đề IELTS theo `skill`, `topic`, `level`.
- Tìm bài học hoặc tài nguyên trong website.
- Hỏi study tips cơ bản.
- Hỏi cách điều hướng website.
- Hỏi giải thích đáp án sau khi đã nộp bài.

Trợ lý chỉ được trả lời trong phạm vi **IELTS website content**. Trợ lý không được bịa test, lesson, explanation, answer hoặc band score; không được tiết lộ dữ liệu private; không được hỗ trợ gian lận khi user đang làm bài.

Feature này tuân thủ hướng **Spec-Driven Development**: thống nhất `spec.md`, `plan.md`, `tasks.md` trước khi implementation.

Tài liệu approach chi tiết nằm tại:

```text
.sdd/specs/global-ielts-virtual-assistant/implementation-approach.md
```

---

## 3. User Story chính

Là một Student đã đăng nhập, tôi muốn mở trợ lý IELTS ở các trang bình thường của website để tìm đề, tìm bài học, hỏi study tips, hỏi navigation và hỏi giải thích đáp án sau khi đã nộp bài, để học hiệu quả hơn mà không làm lộ dữ liệu riêng tư hoặc ảnh hưởng tính công bằng của bài test.

---

## 4. Actors

### 4.1 Guest

Guest là người dùng chưa đăng nhập.

Guest được phép:

- Nhìn thấy assistant button ở các trang phù hợp.
- Bấm vào assistant button.
- Nhận `LoginRequiredPrompt` hoặc được redirect sang Login/Register.

Guest không được phép:

- Gửi message vào assistant.
- Gọi `POST /api/assistant/chat` thành công khi không có auth token.
- Gọi `GET /api/assistant/history` thành công khi không có auth token.
- Hỏi tìm đề, tìm lesson, study tips, navigation hoặc review answer nếu chưa đăng nhập.
- Truy cập explanation hoặc dữ liệu bài làm cá nhân.

### 4.2 Student

Student là người dùng đã đăng nhập.

Student được phép:

- Mở Global Assistant ở các trang bình thường.
- Gửi message vào General Assistant.
- Tìm đề IELTS theo `skill`, `topic`, `level`.
- Tìm bài học hoặc tài nguyên học tập.
- Hỏi study tips cơ bản.
- Hỏi navigation trong website.
- Dùng Post-test Review Assistant sau khi đã submitted attempt.
- Hỏi vì sao đáp án đúng, vì sao đáp án đã chọn sai, keyword, paraphrase, evidence, transcript hoặc clue nếu hệ thống có dữ liệu.

Student không được phép:

- Dùng assistant trong `active test-taking mode`.
- Hỏi đáp án, hint hoặc explanation khi chưa nộp bài.
- Yêu cầu trợ lý làm hộ bài.
- Yêu cầu trợ lý bịa test, lesson, answer hoặc explanation.
- Yêu cầu chấm Writing/Speaking bằng AI trong phase này.
- Yêu cầu generate band score.
- Hỏi ngoài phạm vi IELTS website.

### 4.3 Tutor/Admin

Tutor/Admin là người tạo hoặc quản lý nội dung học tập.

Tutor/Admin có thể:

- Nhập explanation gốc cho câu hỏi.
- Quản lý test, lesson, answer, transcript, passage.
- Review chất lượng nội dung hoặc chatbot analytics trong tương lai.

Trong phase này, Tutor/Admin không phải actor chính khi sử dụng assistant. Nội dung do Tutor/Admin nhập là nguồn chính thức để assistant dựa vào khi trả lời.

---

## 5. Phạm vi Feature

### 5.1 In Scope

- Global Assistant button hiển thị ở hầu hết các trang bình thường.
- Guest nhìn thấy button nhưng không chat được.
- Guest bấm assistant sẽ thấy `LoginRequiredPrompt` hoặc được redirect Login/Register.
- Chỉ Student đã đăng nhập mới gửi message được.
- Backend block request không có auth token, kể cả Frontend đã chặn.
- General Assistant cho Student đã đăng nhập:
  - Tìm đề IELTS.
  - Tìm bài học.
  - Tìm theo `skill`, `topic`, `level`.
  - Study tips cơ bản.
  - Navigation trong website.
- Post-test Review Assistant cho Student đã đăng nhập và đã submitted attempt:
  - Giải thích đáp án.
  - Giải thích vì sao đáp án Student chọn sai.
  - Giải thích keyword, paraphrase, evidence trong Reading.
  - Giải thích transcript hoặc clue trong Listening nếu có dữ liệu.
- Assistant hidden hoặc disabled ở `Active Test Page`.
- Assistant từ chối câu hỏi ngoài phạm vi IELTS website.
- Assistant trả lời rõ khi hệ thống thiếu dữ liệu.
- Ưu tiên lưu lịch sử bằng bảng hiện có `chatbot_sessions` và `chatbot_messages`.
- Intent Router để phân loại câu hỏi trước khi build context hoặc gọi AI.
- Controlled Context Injection từ database thay vì full vector RAG trong phase này.
- Mode-based prompting theo intent: Greeting, Navigation, Study Tips, Find Test, Find Lesson, Post-test Review.
- Session memory ở mức phiên chat bằng `chatbot_sessions` và `chatbot_messages`.
- Streaming response cho Student đã đăng nhập ở page bình thường.
- Rating feedback đơn giản cho câu trả lời assistant.

### 5.2 Out of Scope

- Guest sử dụng chat assistant khi chưa đăng nhập.
- Assistant hoạt động trong lúc user đang làm bài test.
- Assistant đưa đáp án, hint hoặc explanation trước khi Student nộp bài.
- AI Writing grading.
- AI Speaking grading.
- Band score prediction hoặc band score generation.
- Pronunciation analysis.
- Grammar correction nâng cao cho essay.
- Tạo đề IELTS mới bằng AI.
- Tạo explanation không có nguồn dữ liệu.
- Tạo bảng mới trùng chức năng với `chatbot_sessions`/`chatbot_messages`.
- Thay thế hoàn toàn Tutor/Admin.
- Personalized roadmap nâng cao dựa trên toàn bộ lịch sử học tập.
- Real-time human tutor chat.
- Payment/subscription logic.
- Fine-tuning model.
- Advanced RAG/vector search trong phase hiện tại.
- Long-term memory/personalization ngoài session hiện tại.
- Feedback analytics dashboard nâng cao.

---

## 6. Business Rules

- **BR-001**: Global Assistant button có thể hiển thị với Guest và Student.
- **BR-002**: Guest không được gửi message vào assistant.
- **BR-003**: Khi Guest bấm vào assistant, hệ thống phải hiển thị `LoginRequiredPrompt` hoặc redirect sang Login/Register.
- **BR-004**: Chỉ Student đã đăng nhập mới được dùng General Assistant.
- **BR-005**: Chỉ Student đã đăng nhập và đã submitted attempt mới được dùng Post-test Review Assistant.
- **BR-006**: Assistant phải hidden hoặc disabled trong `active test-taking mode`.
- **BR-007**: Assistant không được trả answer, hint hoặc explanation khi Student chưa nộp bài.
- **BR-008**: Assistant chỉ trả lời trong phạm vi IELTS website content.
- **BR-009**: Assistant không được bịa dữ liệu.
- **BR-010**: Assistant không được chấm Writing/Speaking hoặc generate band score trong phase này.
- **BR-011**: Backend phải block mọi request assistant không có valid auth token bằng `LOGIN_REQUIRED`.
- **BR-012**: `GET /api/assistant/history` yêu cầu Student đã đăng nhập.
- **BR-013**: Student chỉ được hỏi chi tiết về attempt hoặc nội dung mà Student có quyền truy cập.
- **BR-014**: Assistant không được tiết lộ private data, admin-only data, unpublished content hoặc dữ liệu của Student khác.
- **BR-015**: Assistant phải ưu tiên dữ liệu chính thức trong database như question, answer, explanation, passage, transcript, lesson hoặc tutor/admin content.
- **BR-016**: Nếu thiếu explanation hoặc dữ liệu liên quan, assistant phải nói rõ hệ thống chưa có đủ dữ liệu.
- **BR-017**: Assistant không được thay đổi đáp án chính thức của bài.
- **BR-018**: Trước khi tạo migration mới, phải inspect schema thật; nếu Supabase cần VPN và agent không truy cập được DB, việc inspect/pull DB được deferred cho project owner hoặc môi trường có VPN.
- **BR-019**: Assistant phải phân loại intent trước khi chọn mode xử lý.
- **BR-020**: Assistant dùng Controlled Context Injection từ dữ liệu chính thức; không dùng full vector RAG trong phase này.
- **BR-021**: Với intent `FIND_TEST` hoặc `FIND_LESSON`, nếu database không có kết quả phù hợp thì assistant phải báo chưa có dữ liệu, không gọi AI để bịa dữ liệu.
- **BR-022**: Session memory chỉ được dùng ở mức phiên chat và chỉ lấy dữ liệu của Student đang đăng nhập.
- **BR-023**: Streaming response không được bypass auth, active-test block hoặc guardrails.
- **BR-024**: Rating feedback chỉ được ghi cho message thuộc session của Student đang đăng nhập.

---

## 7. Functional Requirements

- **FR-001**: Hệ thống phải hiển thị assistant button ở các trang bình thường cho Guest và Student.
- **FR-002**: Guest thấy button nhưng không chat được.
- **FR-003**: Khi Guest bấm assistant, hệ thống phải hiển thị `LoginRequiredPrompt` hoặc redirect sang Login/Register.
- **FR-004**: Student đã đăng nhập phải có thể mở và đóng assistant.
- **FR-005**: Student đã đăng nhập phải có thể gửi câu hỏi dạng text.
- **FR-006**: General Assistant không còn public cho Guest.
- **FR-007**: Backend phải block request từ Guest dù Frontend đã chặn.
- **FR-008**: Nếu request không có valid auth token, Backend phải trả `LOGIN_REQUIRED`.
- **FR-009**: `POST /api/assistant/chat` phải yêu cầu login cho mọi message.
- **FR-010**: `GET /api/assistant/history` phải yêu cầu login.
- **FR-011**: Assistant phải nhận payload context gồm `pageType`, `attemptId`, `questionId`.
- **FR-012**: Nếu `context.pageType === "active-test"`, Backend phải block request.
- **FR-013**: Assistant phải hidden hoặc disabled ở Active Test Page.
- **FR-014**: Student đã đăng nhập và không có `attemptId` sẽ được xử lý bằng General Assistant.
- **FR-015**: General Assistant phải hỗ trợ tìm test, lesson, skill, topic, level, study tips và navigation trong website.
- **FR-016**: Student đã đăng nhập và có `attemptId` sẽ được xử lý bằng Post-test Review Assistant.
- **FR-017**: Post-test Review phải check attempt owner.
- **FR-018**: Post-test Review phải check attempt đã submitted/completed.
- **FR-019**: Post-test Review phải lấy question, answer, explanation, passage/transcript nếu có.
- **FR-020**: Assistant phải trả explanation nếu có dữ liệu chính thức.
- **FR-021**: Assistant phải trả `ATTEMPT_NOT_SUBMITTED` nếu attempt chưa nộp.
- **FR-022**: Assistant phải trả `MISSING_EXPLANATION` nếu thiếu dữ liệu giải thích.
- **FR-023**: Assistant phải từ chối câu hỏi ngoài phạm vi IELTS website bằng `OUT_OF_SCOPE`.
- **FR-024**: Assistant không được chấm Writing/Speaking trong phase này.
- **FR-025**: Assistant không được generate band score trong phase này.
- **FR-026**: Assistant không được tự tạo fake test, fake lesson, fake answer hoặc fake explanation.
- **FR-027**: Assistant phải hỗ trợ câu hỏi tiếng Việt, tiếng Anh cơ bản hoặc mixed Vietnamese-English.
- **FR-028**: Assistant phải trả lời ngắn gọn, dễ hiểu, phù hợp với Student beginner đến intermediate.
- **FR-029**: Assistant nên lưu lịch sử tương tác bằng `chatbot_sessions` và `chatbot_messages` nếu schema hiện có đáp ứng đủ.
- **FR-030**: Không tạo bảng `assistant_chat_interactions` nếu `chatbot_sessions` và `chatbot_messages` đã đủ chức năng.
- **FR-031**: Backend phải có Intent Router phân loại `GREETING`, `NAVIGATION`, `GENERAL_STUDY_TIPS`, `FIND_TEST`, `FIND_LESSON`, `POST_TEST_REVIEW`, `OUT_OF_SCOPE`, `UNKNOWN`.
- **FR-032**: Backend phải build Context Injection theo intent trước khi gọi AI.
- **FR-033**: Backend phải dùng mode-based prompt tương ứng với intent.
- **FR-034**: Backend phải hỗ trợ session memory bằng các message gần nhất trong cùng chatbot session nếu schema hiện có cho phép.
- **FR-035**: Backend nên hỗ trợ streaming endpoint cho chat response.
- **FR-036**: Frontend nên render streaming response từng phần nếu endpoint streaming khả dụng.
- **FR-037**: Frontend nên hiển thị rating button cho assistant message.
- **FR-038**: Backend phải kiểm tra quyền sở hữu session/message trước khi lưu rating.
- **FR-039**: Backend phải có self-check hoặc response validation để chặn câu trả lời bịa test, lesson, answer, explanation hoặc band score.

---

## 8. User Scenarios và Acceptance Criteria

### Scenario 1: Guest thấy assistant nhưng phải đăng nhập để dùng

**Given** Guest vào Home Page  
**When** Guest thấy assistant button và bấm vào button  
**Then** hệ thống hiển thị `LoginRequiredPrompt` hoặc redirect sang Login/Register  
**And** Guest không gửi được message.

### Scenario 2: Guest gọi trực tiếp API

**Given** request không có auth token  
**When** request gọi `POST /api/assistant/chat` hoặc `GET /api/assistant/history`  
**Then** Backend trả `LOGIN_REQUIRED`  
**And** không xử lý message  
**And** không gọi AI.

### Scenario 3: Student dùng General Assistant

**Given** Student đã đăng nhập  
**When** Student mở assistant ở Home Page và hỏi "Có đề Reading về Environment không?"  
**Then** hệ thống trả lời dựa trên IELTS content trong database hoặc báo chưa có dữ liệu phù hợp.

### Scenario 4: Assistant hidden/disabled ở Active Test Page

**Given** Student đang làm bài trong `active test-taking mode`  
**When** Student vào Active Test Page  
**Then** assistant hidden hoặc disabled  
**And** nếu cố gọi API với `pageType = "active-test"` thì Backend block bằng `ASSISTANT_DISABLED_DURING_TEST` hoặc `ATTEMPT_NOT_SUBMITTED`.

### Scenario 5: Student dùng Post-test Review sau khi nộp bài

**Given** Student đã submitted attempt và vào Review Page  
**When** Student hỏi "Vì sao câu 5 đáp án là B?"  
**Then** Backend check owner và submitted status  
**And** lấy question, answer, explanation, passage/transcript nếu có  
**And** trả lời dựa trên dữ liệu chính thức.

### Scenario 6: Student hỏi review khi chưa nộp bài

**Given** Student chưa submitted attempt  
**When** Student hỏi đáp án, hint hoặc explanation  
**Then** assistant từ chối  
**And** Backend trả `ATTEMPT_NOT_SUBMITTED` hoặc `ASSISTANT_DISABLED_DURING_TEST`.

### Scenario 7: Student hỏi ngoài phạm vi

**Given** Student mở assistant  
**When** Student hỏi về crypto, weather hoặc nội dung ngoài IELTS website  
**Then** assistant từ chối bằng `OUT_OF_SCOPE`.

### Scenario 8: Student yêu cầu chấm Writing/Speaking hoặc band score

**Given** Writing/Speaking grading chưa thuộc phase này  
**When** Student yêu cầu chấm bài hoặc dự đoán band score  
**Then** assistant từ chối và không generate band score.

### Scenario 9: Thiếu dữ liệu explanation

**Given** Student hỏi về một câu đã submitted nhưng hệ thống thiếu explanation/evidence/transcript  
**When** assistant không có đủ dữ liệu chính thức  
**Then** assistant trả `MISSING_EXPLANATION` hoặc message tương ứng  
**And** không bịa explanation.

### Scenario 10: Student hỏi greeting

**Given** Student đã đăng nhập  
**When** Student hỏi "Chào bạn"  
**Then** Intent Router phân loại `GREETING`  
**And** assistant trả lời chào ngắn gọn, gợi ý các việc có thể hỏi  
**And** không cần query test/lesson database.

### Scenario 11: Student tìm test nhưng không có dữ liệu

**Given** Student đã đăng nhập  
**When** Student hỏi "Có đề Reading về Environment không?"  
**And** database không có test phù hợp  
**Then** assistant trả lời chưa tìm thấy dữ liệu phù hợp  
**And** không bịa tên đề hoặc link giả.

### Scenario 12: Student nhận streaming answer

**Given** Student đã đăng nhập và assistant available  
**When** Student gửi câu hỏi general hợp lệ  
**Then** frontend có thể hiển thị câu trả lời theo từng chunk streaming  
**And** final response được lưu vào session history khi stream hoàn tất.

### Scenario 13: Student rating câu trả lời

**Given** Student đã nhận assistant message  
**When** Student bấm useful hoặc not useful  
**Then** hệ thống lưu rating cho message thuộc session của Student đó  
**And** không cho Student rating message của người khác.

---

## 9. Key Entities

### User

- `id`
- `role`
- `login_status`
- `permission`
- `current_page`

### Student Attempt

- `id`
- `student_id`
- `test_id`
- `attempt_status`
- `submitted_at`
- `score`
- `selected_answers`

### IELTS Question

- `id`
- `test_id`
- `question_text`
- `question_type`
- `correct_answer`
- `skill`
- `topic`

### Official Explanation

- `id`
- `question_id`
- `explanation_content`
- `evidence`
- `keywords`
- `created_by`
- `published_status`

### IELTS Passage / Listening Transcript

- `test_id`
- `content`
- `audio_time_range`
- `related_questions`

### Chatbot Session

- Represents a Student assistant session.
- Prefer existing `chatbot_sessions` table.

### Chatbot Message

- Represents a single user/assistant message.
- Prefer existing `chatbot_messages` table.

### Assistant Intent

- `intent`: GREETING, NAVIGATION, GENERAL_STUDY_TIPS, FIND_TEST, FIND_LESSON, POST_TEST_REVIEW, OUT_OF_SCOPE, UNKNOWN
- `confidence`
- `requiresDatabaseContext`
- `requiresAttemptContext`

### Assistant Context Injection

- `mode`
- `databaseResults`
- `sessionMemory`
- `allowedActions`
- `forbiddenActions`
- `suggestedLinks`

### Assistant Feedback Rating

- `message_id`
- `student_id`
- `rating`: up, down
- `reason`
- `created_at`

---

## 10. Database hiện có

Database đã có các bảng:

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

Yêu cầu database:

- Ưu tiên dùng `chatbot_sessions` và `chatbot_messages`.
- Không tạo bảng `assistant_chat_interactions` nếu `chatbot_sessions` và `chatbot_messages` đã đủ.
- Trước khi tạo migration mới, phải inspect schema thật.
- Nếu cần bổ sung field, tạo migration nhỏ, không tạo bảng trùng chức năng.
- Project dùng Supabase và việc pull/inspect database có thể cần VPN; khi agent không có VPN, không bắt buộc chạy DB pull/test, cần báo rõ phần kiểm thử DB được skip/deferred.

---

## 11. Error Codes và Messages

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

## 12. Edge Cases

- Guest thấy assistant button nhưng chưa đăng nhập.
- Guest bấm assistant nhiều lần.
- Guest cố gửi message bằng API trực tiếp.
- Request thiếu hoặc sai auth token.
- Student đang làm bài nhưng cố mở assistant.
- Student chưa nộp bài nhưng hỏi đáp án.
- Student hỏi về attempt của Student khác.
- Student hỏi một câu không tồn tại.
- Student hỏi "giải thích câu này" nhưng không có context.
- Student hỏi bài Reading nhưng hệ thống chưa có passage/evidence.
- Student hỏi bài Listening nhưng chưa có transcript.
- Explanation do Tutor/Admin chưa được published.
- Student hỏi ngoài phạm vi IELTS.
- Student yêu cầu tạo đề giả hoặc đáp án giả.
- Student yêu cầu band score Writing/Speaking.
- Student gửi câu hỏi rỗng.
- Student spam hoặc gửi nội dung vô nghĩa.
- Student hỏi bằng tiếng Việt pha tiếng Anh.
- Supabase schema cần VPN nên agent không pull được schema trong môi trường hiện tại.
- Intent Router phân loại sai câu hỏi mixed Vietnamese-English.
- Gemini trả malformed JSON hoặc output không theo expected contract.
- Streaming bị ngắt giữa chừng.
- Student bấm rating nhiều lần.
- Rating field chưa tồn tại trong schema thật của `chatbot_messages`.

---

## 13. Assumptions

- Website có hệ thống Login/Register.
- Website có vai trò Guest và Student.
- Website có trang làm bài và trang kết quả/review đáp án.
- Hệ thống có thể phân biệt `active test-taking mode` và `submitted/review mode`.
- Auth dùng Supabase Auth/JWT hoặc cơ chế tương đương.
- Student chỉ được hỏi Post-test Review sau khi đã submitted/completed attempt.
- Một số câu hỏi có explanation do Tutor/Admin nhập.
- Một số bài Listening có transcript, nhưng không bắt buộc tất cả đều có trong phase đầu.
- Một số bài Reading có passage và evidence.
- AI Writing/Speaking grading sẽ là feature riêng trong tương lai.
- Trợ lý ưu tiên an toàn, đúng phạm vi và không bịa dữ liệu.
- Do Supabase cần VPN để pull/inspect database, agent không cần chạy thử DB-dependent flow trong môi trường không có VPN; khi hoàn tất code/spec, agent báo lại thay vì cố chạy.
- Context Injection đủ cho phase hiện tại; vector RAG/embedding sẽ chỉ xem xét khi database content lớn hơn và cần semantic search.
- Gemini streaming API có thể dùng được với provider config hiện tại.
- Nếu schema `chatbot_messages` chưa có rating fields, rating storage cần migration nhỏ sau khi inspect schema thật.

---

## 14. Success Criteria

- **SC-001**: 100% Guest khi bấm assistant sẽ thấy login prompt hoặc redirect Login/Register.
- **SC-002**: 100% Guest không gửi được message vào assistant API.
- **SC-003**: 100% request không có auth token bị chặn với `LOGIN_REQUIRED`.
- **SC-004**: 100% Student đã đăng nhập dùng được assistant ở page bình thường được hỗ trợ.
- **SC-005**: 100% assistant hidden hoặc disabled ở Active Test Page.
- **SC-006**: 100% request có `pageType = "active-test"` bị Backend block.
- **SC-007**: 100% Post-test Review request phải check owner và submitted status.
- **SC-008**: Assistant không tạo fake test, lesson, answer, explanation hoặc band score trong acceptance testing.
- **SC-009**: Assistant từ chối 100% câu hỏi rõ ràng ngoài phạm vi IELTS website.
- **SC-010**: Assistant từ chối 100% yêu cầu chấm Writing/Speaking hoặc generate band score trong phase này.
- **SC-011**: Assistant bảo vệ dữ liệu cá nhân và không trả về dữ liệu của Student khác trong security test cases.
- **SC-012**: 100% câu greeting cơ bản được route sang `GREETING` và không trả missing database message.
- **SC-013**: 100% `FIND_TEST`/`FIND_LESSON` không có DB result không được bịa item.
- **SC-014**: Streaming response không bypass guardrails trong acceptance testing.
- **SC-015**: Rating feedback chỉ ghi được cho message thuộc session của Student đang đăng nhập.

---

## 15. Future Enhancements

- AI Writing grading theo IELTS rubric.
- AI Speaking grading theo fluency, grammar, lexical resource và pronunciation.
- AI feedback chi tiết cho bài làm của Student.
- Personalized roadmap dựa trên learning progress.
- Advanced RAG/vector search cho toàn bộ knowledge base.
- Vector search/embeddings cho semantic retrieval nếu SQL/context injection không còn đủ.
- Feedback analytics dashboard cho admin/tutor.
- Page-aware assistant nâng cao theo từng câu hỏi.
- Admin dashboard để review chatbot analytics.
- Tutor review workflow cho các câu hỏi Student hỏi nhiều.
- Gợi ý lesson tự động dựa trên lỗi sai lặp lại.
- Voice-based assistant cho Speaking practice.

---

## 16. Definition of Done

Feature chỉ được coi là hoàn thành khi:

1. `spec.md`, `plan.md`, `tasks.md` thống nhất cùng scope.
2. Guest thấy assistant button nhưng không chat được.
3. Guest bấm assistant sẽ thấy `LoginRequiredPrompt` hoặc được chuyển đến Login/Register.
4. Request không có auth token bị Backend chặn bằng `LOGIN_REQUIRED`.
5. Student đã đăng nhập có thể dùng General Assistant ở page bình thường.
6. Student đã submitted attempt có thể dùng Post-test Review Assistant.
7. Assistant hidden hoặc disabled trong `active test-taking mode`.
8. Backend block request `active-test`.
9. Assistant trả lời được câu hỏi về test, lesson, skill, topic, level, navigation hoặc study tips nếu có dữ liệu.
10. Assistant trả lời được câu hỏi review answer nếu có dữ liệu chính thức.
11. Assistant trả lời rõ khi thiếu dữ liệu.
12. Assistant từ chối câu hỏi ngoài phạm vi IELTS website.
13. Assistant không chấm Writing/Speaking trong phase này.
14. Assistant không generate band score.
15. Assistant không tự tạo fake data.
16. Manual test cases đã được document; DB/runtime verification có thể được skip trong môi trường agent nếu Supabase cần VPN.
17. Feature không vi phạm business rules trong spec này.
18. Intent Router, Context Injection, Mode Prompt, Streaming và Rating Feedback đã được document/implemented theo phase được duyệt.
