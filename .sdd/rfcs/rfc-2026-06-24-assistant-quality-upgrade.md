Bạn hãy debug và nâng cấp Global IELTS Assistant để hỗ trợ multi-turn conversation và AI-generated answer đúng nghĩa.

Vấn đề hiện tại:
Assistant đã trả lời được câu "tip học ielts thế nào", nhưng khi user hỏi tiếp:
"lập cho tôi dàn ý của writing part 2"
thì lại trả:
"Mình đang gặp lỗi khi tạo câu trả lời IELTS. Bạn thử hỏi lại giúp mình nhé."

Expected behavior:
Assistant phải hiểu đây là câu hỏi liên quan IELTS Writing Task 2.
Nếu user chưa cung cấp đề bài cụ thể, assistant không được báo lỗi kỹ thuật.
Assistant nên hỏi lại thông minh:
"Được. Bạn gửi đề Writing Task 2 cụ thể cho mình nhé. Sau đó mình sẽ lập dàn ý gồm introduction, body 1, body 2 và conclusion."

Mục tiêu:

1. Assistant dùng AI API/generator để trả lời mọi câu IELTS/English-learning.
2. Assistant có session-level memory, biết các tin nhắn gần đây trong cùng cuộc hội thoại.
3. Assistant không hardcode câu trả lời theo từng câu.
4. RAG/DB chỉ dùng khi cần dữ liệu website hoặc knowledge base riêng, không bắt buộc cho IELTS general knowledge.

Yêu cầu điều tra:

1. Đọc các file:

   - backend/src/api/assistant/assistant.service.js
   - backend/src/api/assistant/assistant.response.js
   - backend/src/api/assistant/assistant.intent.js
   - backend/src/api/assistant/assistant.context.js
   - backend/src/services/ai.service.js
   - frontend/src/features/global-assistant/*
   - models/tables liên quan chatbot_sessions, chatbot_messages nếu có
2. Trace flow cho các câu:

   - "tip học ielts thế nào"
   - "lập cho tôi dàn ý của writing part 2"
   - "what are you doing là gì"
   - "skimming là gì trong ielts"

Báo cáo:

- finalIntent
- answerProviderCalled
- dbLookupCalled
- aiResponseValid
- aiRetryUsed
- fallbackReason
- finalResponseMode
- Có truyền chat history vào AI prompt không?
- Có lấy previous messages từ chatbot_messages không?
- AI prompt hiện tại có chứa session context không?

Yêu cầu fix:

A. Add conversation memory / session context

- Khi user gửi message mới, backend phải lấy N tin nhắn gần nhất trong cùng session.
- N có thể là 6 hoặc 10 messages gần nhất.
- Chỉ lấy role + content, không cần metadata dài.
- Truyền recentConversation vào AI generator prompt.
- Không truyền quá dài gây tốn token.
- Nếu có message dài, truncate an toàn.

Expected prompt context:
Recent conversation:
User: tip học ielts thế nào
Assistant: Để học IELTS hiệu quả...
User: lập cho tôi dàn ý của writing part 2

B. Improve AI generator prompt
Prompt phải nói rõ:
You are an IELTS and English learning assistant.
Answer IELTS and English-learning questions in Vietnamese.
Use the recent conversation to understand follow-up questions.
For IELTS Writing Task 2 outline requests, if the user has not provided a specific essay question/topic, ask them to send the topic instead of producing a fake outline.
Do not return technical error unless the AI provider actually fails.
Do not require database context for general IELTS/English knowledge.

C. Improve missing-information handling
Với câu IELTS-related nhưng thiếu dữ liệu cần thiết:

- "lập cho tôi dàn ý của writing part 2" nhưng chưa có đề bài
- "chữa bài này giúp tôi" nhưng chưa gửi bài
- "dịch câu này" nhưng chưa gửi câu

Assistant phải hỏi lại cụ thể, không báo lỗi kỹ thuật.

D. Fix fallback behavior
Không dùng fallback technical error cho các câu thiếu thông tin.
Phân biệt:

- AI provider failure thật: trả technical fallback nhẹ.
- User thiếu thông tin: trả clarification thông minh.
- Out of scope: refusal.
- DB no result: no-result message.
- IELTS/English question: AI answer.

E. Không hardcode answer
Không viết if message === "lập cho tôi dàn ý..."
Chỉ được thêm rule theo nhóm intent:

- WRITING_TASK_OUTLINE_REQUEST
- ENGLISH_MEANING_REQUEST
- IELTS_SKILL_ADVICE
  hoặc xử lý bằng classifier/prompt.

F. Tests cần thêm

1. Multi-turn memory:
   History:
   User: "tip học ielts thế nào"
   Assistant: "..."
   Current: "lập cho tôi dàn ý của writing part 2"
   Expected:

- answerProviderCalled = true
- dbLookupCalled = false
- không trả technical fallback
- response hỏi user gửi đề bài cụ thể nếu chưa có topic

2. English meaning:
   Input: "what are you doing là gì"
   Expected:

- answerProviderCalled = true
- response giải thích nghĩa tiếng Việt

3. IELTS term:
   Input: "skimming là gì trong ielts"
   Expected:

- answerProviderCalled = true
- response giải thích skimming

4. Missing content:
   Input: "dịch câu này giúp tôi"
   Expected:

- không technical fallback
- hỏi user gửi câu cần dịch

5. DB lookup:
   Input: "có đề reading nào không"
   Expected:

- dbLookupCalled = true

6. Out-of-scope:
   Input: "giá bitcoin hôm nay"
   Expected:

- refusal

Output sau khi làm:
A. Root cause summary
B. Files changed
C. Session memory implementation
D. Prompt changes
E. Fallback changes
F. Tests added/updated
G. Manual test checklist

Bạn hãy debug và nâng cấp Global IELTS Assistant để hỗ trợ multi-turn conversation và AI-generated answer đúng nghĩa.

Vấn đề hiện tại:
Assistant đã trả lời được câu "tip học ielts thế nào", nhưng khi user hỏi tiếp:
"lập cho tôi dàn ý của writing part 2"
thì lại trả:
"Mình đang gặp lỗi khi tạo câu trả lời IELTS. Bạn thử hỏi lại giúp mình nhé."

Expected behavior:
Assistant phải hiểu đây là câu hỏi liên quan IELTS Writing Task 2.
Nếu user chưa cung cấp đề bài cụ thể, assistant không được báo lỗi kỹ thuật.
Assistant nên hỏi lại thông minh:
"Được. Bạn gửi đề Writing Task 2 cụ thể cho mình nhé. Sau đó mình sẽ lập dàn ý gồm introduction, body 1, body 2 và conclusion."

Mục tiêu:

1. Assistant dùng AI API/generator để trả lời mọi câu IELTS/English-learning.
2. Assistant có session-level memory, biết các tin nhắn gần đây trong cùng cuộc hội thoại.
3. Assistant không hardcode câu trả lời theo từng câu.
4. RAG/DB chỉ dùng khi cần dữ liệu website hoặc knowledge base riêng, không bắt buộc cho IELTS general knowledge.

Yêu cầu điều tra:

1. Đọc các file:

   - backend/src/api/assistant/assistant.service.js
   - backend/src/api/assistant/assistant.response.js
   - backend/src/api/assistant/assistant.intent.js
   - backend/src/api/assistant/assistant.context.js
   - backend/src/services/ai.service.js
   - frontend/src/features/global-assistant/*
   - models/tables liên quan chatbot_sessions, chatbot_messages nếu có
2. Trace flow cho các câu:

   - "tip học ielts thế nào"
   - "lập cho tôi dàn ý của writing part 2"
   - "what are you doing là gì"
   - "skimming là gì trong ielts"

Báo cáo:

- finalIntent
- answerProviderCalled
- dbLookupCalled
- aiResponseValid
- aiRetryUsed
- fallbackReason
- finalResponseMode
- Có truyền chat history vào AI prompt không?
- Có lấy previous messages từ chatbot_messages không?
- AI prompt hiện tại có chứa session context không?

Yêu cầu fix:

A. Add conversation memory / session context

- Khi user gửi message mới, backend phải lấy N tin nhắn gần nhất trong cùng session.
- N có thể là 6 hoặc 10 messages gần nhất.
- Chỉ lấy role + content, không cần metadata dài.
- Truyền recentConversation vào AI generator prompt.
- Không truyền quá dài gây tốn token.
- Nếu có message dài, truncate an toàn.

Expected prompt context:
Recent conversation:
User: tip học ielts thế nào
Assistant: Để học IELTS hiệu quả...
User: lập cho tôi dàn ý của writing part 2

B. Improve AI generator prompt
Prompt phải nói rõ:
You are an IELTS and English learning assistant.
Answer IELTS and English-learning questions in Vietnamese.
Use the recent conversation to understand follow-up questions.
For IELTS Writing Task 2 outline requests, if the user has not provided a specific essay question/topic, ask them to send the topic instead of producing a fake outline.
Do not return technical error unless the AI provider actually fails.
Do not require database context for general IELTS/English knowledge.

C. Improve missing-information handling
Với câu IELTS-related nhưng thiếu dữ liệu cần thiết:

- "lập cho tôi dàn ý của writing part 2" nhưng chưa có đề bài
- "chữa bài này giúp tôi" nhưng chưa gửi bài
- "dịch câu này" nhưng chưa gửi câu

Assistant phải hỏi lại cụ thể, không báo lỗi kỹ thuật.

D. Fix fallback behavior
Không dùng fallback technical error cho các câu thiếu thông tin.
Phân biệt:

- AI provider failure thật: trả technical fallback nhẹ.
- User thiếu thông tin: trả clarification thông minh.
- Out of scope: refusal.
- DB no result: no-result message.
- IELTS/English question: AI answer.

E. Không hardcode answer
Không viết if message === "lập cho tôi dàn ý..."
Chỉ được thêm rule theo nhóm intent:

- WRITING_TASK_OUTLINE_REQUEST
- ENGLISH_MEANING_REQUEST
- IELTS_SKILL_ADVICE
  hoặc xử lý bằng classifier/prompt.

F. Tests cần thêm

1. Multi-turn memory:
   History:
   User: "tip học ielts thế nào"
   Assistant: "..."
   Current: "lập cho tôi dàn ý của writing part 2"
   Expected:

- answerProviderCalled = true
- dbLookupCalled = false
- không trả technical fallback
- response hỏi user gửi đề bài cụ thể nếu chưa có topic

2. English meaning:
   Input: "what are you doing là gì"
   Expected:

- answerProviderCalled = true
- response giải thích nghĩa tiếng Việt

3. IELTS term:
   Input: "skimming là gì trong ielts"
   Expected:

- answerProviderCalled = true
- response giải thích skimming

4. Missing content:
   Input: "dịch câu này giúp tôi"
   Expected:

- không technical fallback
- hỏi user gửi câu cần dịch

5. DB lookup:
   Input: "có đề reading nào không"
   Expected:

- dbLookupCalled = true

6. Out-of-scope:
   Input: "giá bitcoin hôm nay"
   Expected:

- refusal

Output sau khi làm:
A. Root cause summary
B. Files changed
C. Session memory implementation
D. Prompt changes
E. Fallback changes
F. Tests added/updated
G. Manual test checklist

Bạn hãy debug và nâng cấp Global IELTS Assistant để hỗ trợ multi-turn conversation và AI-generated answer đúng nghĩa.

Vấn đề hiện tại:
Assistant đã trả lời được câu "tip học ielts thế nào", nhưng khi user hỏi tiếp:
"lập cho tôi dàn ý của writing part 2"
thì lại trả:
"Mình đang gặp lỗi khi tạo câu trả lời IELTS. Bạn thử hỏi lại giúp mình nhé."

Expected behavior:
Assistant phải hiểu đây là câu hỏi liên quan IELTS Writing Task 2.
Nếu user chưa cung cấp đề bài cụ thể, assistant không được báo lỗi kỹ thuật.
Assistant nên hỏi lại thông minh:
"Được. Bạn gửi đề Writing Task 2 cụ thể cho mình nhé. Sau đó mình sẽ lập dàn ý gồm introduction, body 1, body 2 và conclusion."

Mục tiêu:

1. Assistant dùng AI API/generator để trả lời mọi câu IELTS/English-learning.
2. Assistant có session-level memory, biết các tin nhắn gần đây trong cùng cuộc hội thoại.
3. Assistant không hardcode câu trả lời theo từng câu.
4. RAG/DB chỉ dùng khi cần dữ liệu website hoặc knowledge base riêng, không bắt buộc cho IELTS general knowledge.

Yêu cầu điều tra:

1. Đọc các file:

   - backend/src/api/assistant/assistant.service.js
   - backend/src/api/assistant/assistant.response.js
   - backend/src/api/assistant/assistant.intent.js
   - backend/src/api/assistant/assistant.context.js
   - backend/src/services/ai.service.js
   - frontend/src/features/global-assistant/*
   - models/tables liên quan chatbot_sessions, chatbot_messages nếu có
2. Trace flow cho các câu:

   - "tip học ielts thế nào"
   - "lập cho tôi dàn ý của writing part 2"
   - "what are you doing là gì"
   - "skimming là gì trong ielts"

Báo cáo:

- finalIntent
- answerProviderCalled
- dbLookupCalled
- aiResponseValid
- aiRetryUsed
- fallbackReason
- finalResponseMode
- Có truyền chat history vào AI prompt không?
- Có lấy previous messages từ chatbot_messages không?
- AI prompt hiện tại có chứa session context không?

Yêu cầu fix:

A. Add conversation memory / session context

- Khi user gửi message mới, backend phải lấy N tin nhắn gần nhất trong cùng session.
- N có thể là 6 hoặc 10 messages gần nhất.
- Chỉ lấy role + content, không cần metadata dài.
- Truyền recentConversation vào AI generator prompt.
- Không truyền quá dài gây tốn token.
- Nếu có message dài, truncate an toàn.

Expected prompt context:
Recent conversation:
User: tip học ielts thế nào
Assistant: Để học IELTS hiệu quả...
User: lập cho tôi dàn ý của writing part 2

B. Improve AI generator prompt
Prompt phải nói rõ:
You are an IELTS and English learning assistant.
Answer IELTS and English-learning questions in Vietnamese.
Use the recent conversation to understand follow-up questions.
For IELTS Writing Task 2 outline requests, if the user has not provided a specific essay question/topic, ask them to send the topic instead of producing a fake outline.
Do not return technical error unless the AI provider actually fails.
Do not require database context for general IELTS/English knowledge.

C. Improve missing-information handling
Với câu IELTS-related nhưng thiếu dữ liệu cần thiết:

- "lập cho tôi dàn ý của writing part 2" nhưng chưa có đề bài
- "chữa bài này giúp tôi" nhưng chưa gửi bài
- "dịch câu này" nhưng chưa gửi câu

Assistant phải hỏi lại cụ thể, không báo lỗi kỹ thuật.

D. Fix fallback behavior
Không dùng fallback technical error cho các câu thiếu thông tin.
Phân biệt:

- AI provider failure thật: trả technical fallback nhẹ.
- User thiếu thông tin: trả clarification thông minh.
- Out of scope: refusal.
- DB no result: no-result message.
- IELTS/English question: AI answer.

E. Không hardcode answer
Không viết if message === "lập cho tôi dàn ý..."
Chỉ được thêm rule theo nhóm intent:

- WRITING_TASK_OUTLINE_REQUEST
- ENGLISH_MEANING_REQUEST
- IELTS_SKILL_ADVICE
  hoặc xử lý bằng classifier/prompt.

F. Tests cần thêm

1. Multi-turn memory:
   History:
   User: "tip học ielts thế nào"
   Assistant: "..."
   Current: "lập cho tôi dàn ý của writing part 2"
   Expected:

- answerProviderCalled = true
- dbLookupCalled = false
- không trả technical fallback
- response hỏi user gửi đề bài cụ thể nếu chưa có topic

2. English meaning:
   Input: "what are you doing là gì"
   Expected:

- answerProviderCalled = true
- response giải thích nghĩa tiếng Việt

3. IELTS term:
   Input: "skimming là gì trong ielts"
   Expected:

- answerProviderCalled = true
- response giải thích skimming

4. Missing content:
   Input: "dịch câu này giúp tôi"
   Expected:

- không technical fallback
- hỏi user gửi câu cần dịch

5. DB lookup:
   Input: "có đề reading nào không"
   Expected:

- dbLookupCalled = true

6. Out-of-scope:
   Input: "giá bitcoin hôm nay"
   Expected:

- refusal

Output sau khi làm:
A. Root cause summary
B. Files changed
C. Session memory implementation
D. Prompt changes
E. Fallback changes
F. Tests added/updated
G. Manual test checklist

Bạn hãy debug và nâng cấp Global IELTS Assistant để hỗ trợ multi-turn conversation và AI-generated answer đúng nghĩa.

Vấn đề hiện tại:
Assistant đã trả lời được câu "tip học ielts thế nào", nhưng khi user hỏi tiếp:
"lập cho tôi dàn ý của writing part 2"
thì lại trả:
"Mình đang gặp lỗi khi tạo câu trả lời IELTS. Bạn thử hỏi lại giúp mình nhé."

Expected behavior:
Assistant phải hiểu đây là câu hỏi liên quan IELTS Writing Task 2.
Nếu user chưa cung cấp đề bài cụ thể, assistant không được báo lỗi kỹ thuật.
Assistant nên hỏi lại thông minh:
"Được. Bạn gửi đề Writing Task 2 cụ thể cho mình nhé. Sau đó mình sẽ lập dàn ý gồm introduction, body 1, body 2 và conclusion."

Mục tiêu:

1. Assistant dùng AI API/generator để trả lời mọi câu IELTS/English-learning.
2. Assistant có session-level memory, biết các tin nhắn gần đây trong cùng cuộc hội thoại.
3. Assistant không hardcode câu trả lời theo từng câu.
4. RAG/DB chỉ dùng khi cần dữ liệu website hoặc knowledge base riêng, không bắt buộc cho IELTS general knowledge.

Yêu cầu điều tra:

1. Đọc các file:

   - backend/src/api/assistant/assistant.service.js
   - backend/src/api/assistant/assistant.response.js
   - backend/src/api/assistant/assistant.intent.js
   - backend/src/api/assistant/assistant.context.js
   - backend/src/services/ai.service.js
   - frontend/src/features/global-assistant/*
   - models/tables liên quan chatbot_sessions, chatbot_messages nếu có
2. Trace flow cho các câu:

   - "tip học ielts thế nào"
   - "lập cho tôi dàn ý của writing part 2"
   - "what are you doing là gì"
   - "skimming là gì trong ielts"

Báo cáo:

- finalIntent
- answerProviderCalled
- dbLookupCalled
- aiResponseValid
- aiRetryUsed
- fallbackReason
- finalResponseMode
- Có truyền chat history vào AI prompt không?
- Có lấy previous messages từ chatbot_messages không?
- AI prompt hiện tại có chứa session context không?

Yêu cầu fix:

A. Add conversation memory / session context

- Khi user gửi message mới, backend phải lấy N tin nhắn gần nhất trong cùng session.
- N có thể là 6 hoặc 10 messages gần nhất.
- Chỉ lấy role + content, không cần metadata dài.
- Truyền recentConversation vào AI generator prompt.
- Không truyền quá dài gây tốn token.
- Nếu có message dài, truncate an toàn.

Expected prompt context:
Recent conversation:
User: tip học ielts thế nào
Assistant: Để học IELTS hiệu quả...
User: lập cho tôi dàn ý của writing part 2

B. Improve AI generator prompt
Prompt phải nói rõ:
You are an IELTS and English learning assistant.
Answer IELTS and English-learning questions in Vietnamese.
Use the recent conversation to understand follow-up questions.
For IELTS Writing Task 2 outline requests, if the user has not provided a specific essay question/topic, ask them to send the topic instead of producing a fake outline.
Do not return technical error unless the AI provider actually fails.
Do not require database context for general IELTS/English knowledge.

C. Improve missing-information handling
Với câu IELTS-related nhưng thiếu dữ liệu cần thiết:

- "lập cho tôi dàn ý của writing part 2" nhưng chưa có đề bài
- "chữa bài này giúp tôi" nhưng chưa gửi bài
- "dịch câu này" nhưng chưa gửi câu

Assistant phải hỏi lại cụ thể, không báo lỗi kỹ thuật.

D. Fix fallback behavior
Không dùng fallback technical error cho các câu thiếu thông tin.
Phân biệt:

- AI provider failure thật: trả technical fallback nhẹ.
- User thiếu thông tin: trả clarification thông minh.
- Out of scope: refusal.
- DB no result: no-result message.
- IELTS/English question: AI answer.

E. Không hardcode answer
Không viết if message === "lập cho tôi dàn ý..."
Chỉ được thêm rule theo nhóm intent:

- WRITING_TASK_OUTLINE_REQUEST
- ENGLISH_MEANING_REQUEST
- IELTS_SKILL_ADVICE
  hoặc xử lý bằng classifier/prompt.

F. Tests cần thêm

1. Multi-turn memory:
   History:
   User: "tip học ielts thế nào"
   Assistant: "..."
   Current: "lập cho tôi dàn ý của writing part 2"
   Expected:

- answerProviderCalled = true
- dbLookupCalled = false
- không trả technical fallback
- response hỏi user gửi đề bài cụ thể nếu chưa có topic

2. English meaning:
   Input: "what are you doing là gì"
   Expected:

- answerProviderCalled = true
- response giải thích nghĩa tiếng Việt

3. IELTS term:
   Input: "skimming là gì trong ielts"
   Expected:

- answerProviderCalled = true
- response giải thích skimming

4. Missing content:
   Input: "dịch câu này giúp tôi"
   Expected:

- không technical fallback
- hỏi user gửi câu cần dịch

5. DB lookup:
   Input: "có đề reading nào không"
   Expected:

- dbLookupCalled = true

6. Out-of-scope:
   Input: "giá bitcoin hôm nay"
   Expected:

- refusal

Output sau khi làm:
A. Root cause summary
B. Files changed
C. Session memory implementation
D. Prompt changes
E. Fallback changes
F. Tests added/updated
G. Manual test checklist

# RFC: Assistant Quality Upgrade

**Date**: 2026-06-24
**Status**: PENDING
**Feature**: `global-ielts-virtual-assistant`

## Lý Do Thay Đổi

Global Assistant cần trả lời dựa trên dữ liệu thật của hệ thống thay vì chỉ dựa vào prompt hoặc tài liệu SDD. Các cập nhật này bổ sung schema snapshot, feature-to-table mapping, intent context map và golden eval set để giảm rủi ro assistant bịa bảng, bịa test/lesson, hoặc trả lời ngoài phạm vi.

## Những Gì Thay Đổi So Với tasks.md Gốc

- Thêm task: fix dòng changelog cuối bị corrupt/không đúng format trong `.sdd/agents_changelog.md`.
- Thêm task: tạo `.sdd/context/db-schema-snapshot.md` làm snapshot schema thật từ `.sdd/shared_context.md`.
- Thêm task: thêm `Feature-to-Table Mapping` vào `.sdd/shared_context.md`.
- Thêm task: reconcile section Database hiện có trong Global Assistant spec với schema thật.
- Thêm task: thêm `INTENT_CONTEXT_MAP` vào `backend/src/api/assistant/assistant.constants.js`.
- Thêm task: tạo golden eval set tối thiểu 25 câu cho Global Assistant.
- Thêm task: yêu cầu human review trước khi tiếp tục runtime code dựa trên schema mapping.

## Những Gì Giữ Nguyên

- Không thay đổi Constitution.
- Không thêm migration database trong RFC này.
- Không thay đổi business rule Guest không được chat.
- Không thay đổi active-test block.
- Không mở scope AI Writing/Speaking grading cho Global Assistant.
- Không dùng vector database, embeddings hoặc advanced RAG trong phase hiện tại.
- Tiếp tục ưu tiên `chatbot_sessions` và `chatbot_messages` cho session memory.

## Files Bị Ảnh Hưởng

- `.sdd/agents_changelog.md`
- `.sdd/context/db-schema-snapshot.md`
- `.sdd/shared_context.md`
- `.sdd/specs/global-ielts-virtual-assistant/spec.md`
- `.sdd/specs/global-ielts-virtual-assistant/eval-set.md`
- `backend/src/api/assistant/assistant.constants.js`

## Approval Status

PENDING
