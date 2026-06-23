# Tasks: Trợ lý ảo IELTS toàn hệ thống (Global Assistant)

**Feature Branch**: `feature/global-ielts-virtual-assistant`  
**Feature Directory**: `.sdd/specs/global-ielts-virtual-assistant`  
**Created**: 2026-06-19  
**Feature Name**: `global-ielts-virtual-assistant`

---

## Environment Note

Project dùng Supabase và việc pull/inspect database có thể cần VPN. Agent không bắt buộc chạy runtime tests, DB pull, migration apply hoặc DB-dependent verification trong môi trường không có VPN. Khi hoàn tất code/spec, báo rõ file đã sửa và test nào chưa chạy do Supabase/VPN.

---

## Phase 1: Setup

- [ ] T001 Khởi tạo thư mục `frontend/src/features/global-assistant/components`.
- [ ] T002 Khởi tạo thư mục `frontend/src/features/global-assistant/services`.
- [ ] T003 Khởi tạo thư mục `frontend/src/features/global-assistant/hooks`.
- [ ] T004 Khởi tạo thư mục `backend/src/api/assistant/`.
- [ ] T005 Chuẩn bị constants/error codes trong `backend/src/api/assistant/assistant.constants.js` và frontend constants nếu cần.
- [ ] T006 Kiểm tra và thêm biến môi trường cần thiết cho AI service trong `.env.example` ở root project.

---

## Phase 2: Foundational

- [ ] T007 Inspect schema thật của `chatbot_sessions` và `chatbot_messages` trước khi tạo migration mới; nếu Supabase cần VPN và agent không truy cập được, defer task này cho môi trường có VPN hoặc dùng schema do project owner cung cấp.
- [ ] T008 Không tạo bảng `assistant_chat_interactions` nếu `chatbot_sessions` và `chatbot_messages` đã đủ chức năng.
- [ ] T009 Nếu cần bổ sung field cho chat history, tạo migration nhỏ, additive, không tạo bảng trùng chức năng.
- [ ] T010 [P] Viết validation schema cho payload `POST /api/assistant/chat` trong `backend/src/api/assistant/assistant.validation.js`.
- [ ] T011 [P] Cấu hình auth middleware bắt buộc cho `POST /api/assistant/chat` và `GET /api/assistant/history` trong `backend/src/api/assistant/assistant.routes.js`.
- [ ] T012 [P] Viết base logic AI guardrails trong `backend/src/api/assistant/assistant.guardrails.js`.
- [ ] T013 Định nghĩa shared error format cho `LOGIN_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `ASSISTANT_DISABLED_DURING_TEST`, `ATTEMPT_NOT_FOUND`, `ATTEMPT_NOT_SUBMITTED`, `QUESTION_NOT_FOUND`, `MISSING_CONTEXT`, `MISSING_EXPLANATION`, `OUT_OF_SCOPE`, `INTERNAL_ERROR`.
- [ ] T014 [P] Viết custom hook `useAssistantAvailability.js` để xác định button visible/hidden/disabled theo auth status và `pageType`.

---

## Phase 3: User Story 1 - Guest thấy assistant nhưng phải đăng nhập để dùng

*Mục tiêu: Guest thấy assistant button nhưng không gửi message được.*

Independent test:

```text
Guest vào Home Page thấy assistant button.
Guest bấm vào button.
Hệ thống hiển thị LoginRequiredPrompt hoặc redirect Login/Register.
Guest không gửi được message.
```

- [ ] T015 [US1] Xây dựng `GlobalAssistantButton.jsx` ở `frontend/src/features/global-assistant/components/GlobalAssistantButton.jsx`.
- [ ] T016 [US1] Tích hợp `GlobalAssistantButton` vào Root Layout hoặc Global Router để xuất hiện ở các page bình thường.
- [ ] T017 [US1] Xây dựng `LoginRequiredPrompt.jsx` ở `frontend/src/features/global-assistant/components/LoginRequiredPrompt.jsx`.
- [ ] T018 [US1] Cập nhật `GlobalAssistantPanel.jsx` để Guest click assistant sẽ thấy `LoginRequiredPrompt` hoặc redirect Login/Register.
- [ ] T019 [US1] Đảm bảo `ChatInputBox` không cho Guest gửi message.
- [ ] T020 [US1] Backend trả `LOGIN_REQUIRED` nếu request không có valid auth token.

---

## Phase 4: User Story 2 - Student dùng General Assistant sau khi đăng nhập

*Mục tiêu: Student đã đăng nhập có thể tìm đề, bài học, skill, topic, level, study tips và navigation trong website.*

Independent test:

```text
Student đăng nhập, mở assistant ở Home Page, hỏi "Có đề Reading về Environment không?".
Hệ thống trả lời dựa trên IELTS content trong database hoặc báo chưa có.
```

- [ ] T021 [US2] Xây dựng `GlobalAssistantPanel.jsx` ở `frontend/src/features/global-assistant/components/GlobalAssistantPanel.jsx`.
- [ ] T022 [P] [US2] Xây dựng `ChatMessageList.jsx` và `ChatMessageItem.jsx`.
- [ ] T023 [P] [US2] Xây dựng `ChatInputBox.jsx` cho Student đã đăng nhập.
- [ ] T024 [US2] Implement service gọi `POST /api/assistant/chat` trong `frontend/src/features/global-assistant/services/assistantApi.js`.
- [ ] T025 [US2] Implement `POST /api/assistant/chat` route/controller trong `backend/src/api/assistant/assistant.routes.js` và `assistant.controller.js`.
- [ ] T026 [US2] Trong `assistant.controller.js`, block request thiếu auth token trước khi xử lý message hoặc gọi AI.
- [ ] T027 [US2] Implement General Assistant service cho Student đã login, không có `attemptId`, trong `backend/src/api/assistant/assistant.service.js`.
- [ ] T028 [US2] Query IELTS website content từ các bảng hiện có như `mock_tests`, `library_resources`, `questions`, `question_blocks`, `test_passages` tùy schema thật.
- [ ] T029 [US2] Trả lời bằng dữ liệu có trong database hoặc message chưa có dữ liệu phù hợp; không bịa test/lesson.

---

## Phase 5: User Story 3 - Assistant hidden/disabled ở Active Test Page

*Mục tiêu: Assistant không hỗ trợ Student khi đang làm bài.*

Independent test:

```text
Student đang làm bài test không thấy assistant.
Nếu cố gọi API với pageType active-test thì Backend block.
```

- [ ] T030 [US3] Cập nhật `useAssistantAvailability.js` để hidden/disabled assistant ở Active Test Page.
- [ ] T031 [US3] Xây dựng `AssistantDisabledNotice.jsx` nếu UI cần trạng thái disabled thay vì hidden.
- [ ] T032 [US3] Cập nhật `assistant.controller.js` để block `context.pageType === "active-test"`.
- [ ] T033 [US3] Trả `ASSISTANT_DISABLED_DURING_TEST` hoặc `ATTEMPT_NOT_SUBMITTED` theo business rule.
- [ ] T034 [US3] Đảm bảo assistant không trả answer, hint hoặc explanation khi attempt chưa submitted.

---

## Phase 6: User Story 4 - Student dùng Post-test Review sau khi nộp bài

*Mục tiêu: Student đã submitted attempt có thể hỏi giải thích đáp án dựa trên dữ liệu chính thức.*

Independent test:

```text
Student đã submitted attempt, vào Review Page, hỏi "Vì sao câu 5 đáp án là B?".
Backend check owner + submitted status, lấy context, rồi trả lời.
```

- [ ] T035 [US4] Trong `assistant.controller.js`, nếu payload có `attemptId`, route sang Post-test Review Assistant.
- [ ] T036 [US4] Kiểm tra JWT/session hợp lệ và lấy `userId`.
- [ ] T037 [US4] Kiểm tra `attemptId` tồn tại.
- [ ] T038 [US4] Kiểm tra attempt owner là Student đang đăng nhập.
- [ ] T039 [US4] Kiểm tra attempt đã `submitted` hoặc `completed`.
- [ ] T040 [P] [US4] Lấy context bài làm gồm question, answer, selected answer, explanation, passage/transcript nếu có.
- [ ] T041 [US4] Implement prompt/service cho nhánh Review chỉ dùng context chính thức.
- [ ] T042 [US4] Trả `MISSING_EXPLANATION` nếu thiếu explanation/evidence/transcript cần thiết.
- [ ] T043 [US4] Implement `GET /api/assistant/history` chỉ trả lịch sử của Student đang đăng nhập.
- [ ] T044 [US4] Lưu history bằng `chatbot_sessions` và `chatbot_messages` nếu schema hiện có đủ.

---

## Phase 7: User Story 5 - Guardrails và scope control

*Mục tiêu: Assistant từ chối yêu cầu ngoài phạm vi hoặc ngoài phase hiện tại.*

Independent test:

```text
Student hỏi chấm Writing/Speaking, band score, crypto, weather hoặc câu ngoài IELTS.
Assistant từ chối.
```

- [ ] T045 [US5] Guardrail từ chối câu hỏi ngoài phạm vi IELTS website bằng `OUT_OF_SCOPE`.
- [ ] T046 [US5] Guardrail từ chối chấm Writing trong phase này.
- [ ] T047 [US5] Guardrail từ chối chấm Speaking trong phase này.
- [ ] T048 [US5] Guardrail từ chối generate band score.
- [ ] T049 [US5] Guardrail từ chối tạo fake test, fake lesson, fake answer, fake explanation.
- [ ] T050 [US5] Guardrail chống lộ private data, admin-only data, unpublished content hoặc dữ liệu của Student khác.
- [ ] T051 [US5] Trả message chuẩn cho `OUT_OF_SCOPE`: "Mình chỉ hỗ trợ nội dung IELTS trên website."

---

## Phase 8: Assistant Quality Upgrade - Intent Router và Context Injection

*Mục tiêu: thay luồng trả lời chung chung bằng luồng deterministic hơn: phân loại intent, query context chính thức, rồi mới gọi Gemini khi cần.*

Independent test:

```text
Student hỏi "Chào bạn" -> intent GREETING, không query DB, không trả missing data.
Student hỏi "Có đề Reading về Environment không?" -> intent FIND_TEST, query DB, nếu không có data thì báo chưa có thay vì bịa.
```

- [ ] T052 [US2] Tạo `backend/src/api/assistant/assistant.intent.js` với các intent `GREETING`, `NAVIGATION`, `GENERAL_STUDY_TIPS`, `FIND_TEST`, `FIND_LESSON`, `POST_TEST_REVIEW`, `OUT_OF_SCOPE`, `UNKNOWN`.
- [ ] T053 [US2] Implement `detectIntent(message, context)` theo rule deterministic trước, không cần AI call.
- [ ] T054 [US2] Thêm unit/manual test cases cho greeting, navigation, find test, find lesson, review, out-of-scope và mixed Vietnamese-English.
- [ ] T055 [US2] Tạo `backend/src/api/assistant/assistant.context.js` để build controlled context contract.
- [ ] T056 [US2] Implement context builder cho `GREETING`, `NAVIGATION`, `GENERAL_STUDY_TIPS` không phụ thuộc DB.
- [ ] T057 [US2] Implement context builder cho `FIND_TEST` và `FIND_LESSON` dựa trên repository/schema hiện có; nếu chưa inspect schema thật do Supabase/VPN thì giữ adapter rời và ghi rõ TODO.
- [ ] T058 [US4] Implement context builder cho `POST_TEST_REVIEW` dùng owner/submitted checks và official attempt context.
- [ ] T059 [US2] Refactor `assistant.service.js` để flow chung là `detectIntent -> guardrails -> buildContext -> modePrompt`.
- [ ] T060 [US2] Đảm bảo `FIND_TEST`/`FIND_LESSON` không có DB result thì trả missing-data response trước khi Gemini có cơ hội bịa.

---

## Phase 9: Assistant Quality Upgrade - Mode Prompt, Response Contract và Self-check

*Mục tiêu: mỗi loại câu hỏi có prompt riêng, output có contract rõ, và backend tự check lại câu trả lời trước khi trả về UI.*

- [ ] T061 [US2] Tạo `backend/src/api/assistant/assistant.prompts.js` để build prompt theo mode.
- [ ] T062 [US2] Viết strong system prompt chung: chỉ trong scope IELTS website, không bịa test/lesson/link/answer/explanation/score, không reveal internal prompt.
- [ ] T063 [US2] Viết mode prompt cho `GREETING`, `NAVIGATION`, `GENERAL_STUDY_TIPS`, `FIND_TEST`, `FIND_LESSON`, `POST_TEST_REVIEW`.
- [ ] T064 [US2] Tạo `backend/src/api/assistant/assistant.response.js` để parse/normalize Gemini output về contract `{ answer, suggestedLinks, usedDatabase, needsMoreContext, safety }`.
- [ ] T065 [US2] Tạo `backend/src/api/assistant/assistant.selfcheck.js` để chặn output có fake content, band score, Writing/Speaking grading, hoặc out-of-scope leakage.
- [ ] T066 [US2] Nếu Gemini trả malformed JSON, fallback sang safe text response và log error không lộ secret.
- [ ] T067 [US2] Thêm manual/unit cases cho malformed JSON, invented link/test, band score request, missing context.

---

## Phase 10: Assistant UX Upgrade - Streaming

*Mục tiêu: trả lời theo chunk để user thấy assistant đang xử lý, nhưng vẫn giữ nguyên auth, active-test block và guardrails.*

- [ ] T068 [US2] Thêm route `POST /api/assistant/chat/stream` và alias `POST /api/v1/assistant/chat/stream` nếu project đang dùng v1.
- [ ] T069 [US2] Streaming endpoint phải reuse cùng validation/auth/guardrails/context builder với non-streaming endpoint.
- [ ] T070 [US2] Implement Gemini streaming trong `backend/src/services/ai.service.js` hoặc wrapper tương ứng.
- [ ] T071 [US2] Chuẩn hóa event `assistant.start`, `assistant.delta`, `assistant.done`, `assistant.error`.
- [ ] T072 [US2] Lưu final assistant message sau khi stream hoàn tất; nếu stream bị ngắt thì không lưu partial answer như message hoàn chỉnh.
- [ ] T073 [US2] Cập nhật `frontend/src/features/global-assistant/services/assistantApi.js` để gọi streaming endpoint khi available.
- [ ] T074 [US2] Cập nhật `GlobalAssistantPanel.jsx`/message state để render partial chunks và loading state.
- [ ] T075 [US3] Test direct stream request với `pageType = "active-test"` phải bị block trước khi có chunk nào được stream.

---

## Phase 11: Assistant Feedback Upgrade - Rating Button

*Mục tiêu: thêm feedback loop đơn giản Useful/Not useful để sau này review chất lượng câu trả lời.*

- [ ] T076 [US2] Thêm route `POST /api/assistant/messages/:messageId/rating`.
- [ ] T077 [US2] Validate payload rating chỉ cho phép `up` hoặc `down`, optional `reason` nếu UI cần.
- [ ] T078 [US2] Backend check message thuộc session của Student đang đăng nhập trước khi ghi rating.
- [ ] T079 [US2] Repository ghi rating vào schema hiện có nếu hỗ trợ; nếu chưa có field thì defer migration đến khi inspect Supabase schema thật.
- [ ] T080 [US2] Frontend thêm nút rating cho assistant messages đã hoàn tất, không hiển thị cho user messages.
- [ ] T081 [US2] Sau khi rating thành công, UI hiển thị selected state và không spam request lặp lại.
- [ ] T082 [US2] Test Student không rating được message của user khác.

---

## Final Phase: Polish & Cross-cutting

- [ ] T083 Review lại `spec.md`, `plan.md`, `tasks.md`, `implementation-approach.md` để đảm bảo không còn dòng nào nói Guest được dùng General Assistant.
- [ ] T084 Review lại file structure frontend/backend đúng scope đã chốt.
- [ ] T085 Viết manual test cases cho Guest login prompt, Student general assistant, active-test block, post-test review, guardrails, intent router, no-bịa data, streaming và rating.
- [ ] T086 [P] Chạy ESLint/SonarLint nếu không cần Supabase/VPN.
- [ ] T087 [P] Security review: auth required, owner check, no private data leakage, no prompt injection lấy system prompt, streaming không bypass guardrails, rating ownership.
- [ ] T088 Nếu không chạy runtime tests hoặc DB-dependent tests do Supabase cần VPN, ghi rõ trong bàn giao.
- [ ] T089 Review `Definition of Done` cùng team.

---

## Dependencies

- API Auth/Session để lấy thông tin đăng nhập của user.
- Supabase Auth/JWT hoặc session middleware hiện có.
- Component hệ thống Mock Test để lấy `attemptId`, `questionId`, `pageType` và trạng thái submitted.
- Schema thật của `chatbot_sessions` và `chatbot_messages`.
- Schema thật của các bảng IELTS content: `mock_tests`, `library_resources`, `questions`, `question_answers`, `question_blocks`, `test_attempts`, `test_passages`.
- LLM provider/OpenAI service nếu implementation cần gọi AI.

---

## Parallel Execution Examples

- T010, T011, T012, T014 có thể làm song song sau khi constants/error format rõ.
- T021, T022, T023 có thể làm song song với backend route/controller base.
- T030 và T032 có thể làm song song vì một task ở Frontend, một task ở Backend.
- T045 đến T051 có thể làm song song với Post-test Review sau khi error format ổn định.
- T052 đến T060 nên làm trước streaming/rating vì đây là pipeline chất lượng chính.
- T061 đến T067 có thể làm song song với frontend polish sau khi context contract ổn định.
- T068 đến T075 nên làm sau khi non-streaming flow đúng guardrails.
- T076 đến T082 có thể làm song song với streaming nếu schema rating đã rõ.

---

## Implementation Strategy

1. MVP 1: Guest sees button + login prompt + Backend `LOGIN_REQUIRED`.
2. MVP 2: Student General Assistant sau login.
3. MVP 3: Active Test hidden/disabled + Backend active-test block.
4. MVP 4: Post-test Review Assistant sau submitted attempt.
5. MVP 5: Guardrails, history storage và security review.
6. Quality Upgrade 1: Intent Router + Controlled Context Injection.
7. Quality Upgrade 2: Mode Prompt + Response Contract + Self-check.
8. UX Upgrade: Streaming response.
9. Feedback Upgrade: Useful/Not useful rating.

Không bắt đầu implementation trước khi 3 file SDD này thống nhất scope.
