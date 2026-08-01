---
description: "Bằng chứng HIỆN CÓ và công việc MỤC TIÊU theo thứ tự phụ thuộc cho Trợ lý ảo IELTS toàn cục"
---

# Công việc: Trợ lý ảo IELTS toàn cục

`[x]` nghĩa là hành vi từ route tới dữ liệu/UI và bằng chứng tự động liên quan đã được tìm thấy. `[ ]` nghĩa là triển khai, phê duyệt chính sách, xác minh môi trường, hoặc bằng chứng kiểm thử đầy đủ vẫn còn thiếu. Các đánh dấu này không tuyên bố rằng kiểm thử smoke production hay kiểm thử nhà cung cấp thật đã chạy.

## Giai đoạn 1 - P1: Trợ giúp có xác thực an toàn (US1)

- [x] T001 [US1] Thực thi quyền truy cập phiên đang hoạt động `student` đã xác thực trong `backend/src/api/assistant/assistant.controller.js` và bao phủ hành vi từ chối/trạng thái trong `backend/tests/unit/api/assistant.controller.test.js`
- [x] T002 [P] [US1] Xác thực tin nhắn đã trim, ranh giới 2.000 ký tự, ngữ cảnh trang, và mã cuộc trò chuyện trong `backend/src/api/assistant/assistant.validation.js` và `backend/tests/unit/api/assistant.validation.test.js`
- [x] T003 [P] [US1] Chặn khai báo đang thi, chấm điểm/dự đoán band cá nhân, trích xuất prompt/dữ liệu riêng tư, bịa nội dung chính thức, và yêu cầu không liên quan trong `backend/src/api/assistant/assistant.guardrails.js` và `backend/tests/unit/api/assistant.guardrails.test.js`
- [x] T004 [US1] Định tuyến ý định được hỗ trợ và phản hồi xác định trước khi tạo nhà cung cấp trong `backend/src/api/assistant/assistant.intent.js`, `backend/src/api/assistant/assistant.service.js`, `backend/tests/unit/api/assistant.intent.test.js`, và `backend/tests/unit/api/assistant.service.test.js`
- [x] T005 [P] [US1] Chuẩn hóa và tự kiểm tra đầu ra tạo và dùng dự phòng an toàn được hỗ trợ trong `backend/src/api/assistant/assistant.response.js`, `backend/src/api/assistant/assistant.selfcheck.js`, `backend/tests/unit/api/assistant.response.test.js`, và `backend/tests/unit/api/assistant.selfcheck.test.js`
- [x] T006 [P] [US1] Trả trạng thái tối giản không phụ thuộc nhà cung cấp trong `backend/src/api/assistant/assistant.controller.js` và `backend/tests/unit/api/assistant.controller.test.js`
- [x] T007 [US1] Thực thi 30 yêu cầu chat/stream mỗi IP mỗi phút qua `backend/src/middleware/rateLimit.js` và `backend/src/api/assistant/assistant.routes.js`
- [ ] T008 [US1] Xác minh độc lập bài thi đang hoạt động thuộc sở hữu trên mỗi yêu cầu chat/stream trong `backend/src/api/assistant/assistant.context.js`, `backend/src/api/assistant/assistant.repository.js`, và kiểm thử phân quyền trong `backend/tests/unit/api/`
- [ ] T009 [P] [US1] Định nghĩa và thực thi timeout nhà cung cấp trợ lý với kiểm thử dự phòng xác định trong `backend/src/services/ai.service.js` và `backend/tests/unit/api/assistant.service.test.js`

## Giai đoạn 2 - P1: Khám phá nội dung đã công bố và điều hướng (US2)

- [x] T010 [US2] Truy vấn chỉ bài thi và tài liệu đã công bố/phê duyệt đủ điều kiện với liên kết có kiểm soát trong `backend/src/api/assistant/assistant.repository.js`, `backend/src/api/assistant/assistant.context.js`, và `backend/tests/unit/api/assistant.repository.test.js`
- [x] T011 [P] [US2] Tải kiến thức IELTS/điều hướng tĩnh có phiên bản qua `backend/src/api/assistant/assistant.knowledge-base.js`, `backend/src/api/assistant/assistant.knowledge-retriever.js`, `backend/src/api/assistant/knowledge-base/`, và `backend/tests/unit/api/assistant.knowledge-retriever.test.js`
- [x] T012 [US2] Cung cấp căn cứ cho prompt/phản hồi tra cứu và đầu ra xác định khi nhà cung cấp thất bại trong `backend/src/api/assistant/assistant.prompts.js`, `backend/src/api/assistant/assistant.service.js`, `backend/tests/unit/api/assistant.prompts.test.js`, và `backend/tests/unit/api/assistant.service.test.js`

## Giai đoạn 3 - P1: Xem lại bài thi đã nộp thuộc sở hữu (US3)

- [x] T013 [US3] Yêu cầu quyền sở hữu người yêu cầu và trạng thái đã nộp trước khi đọc ngữ cảnh bài thi chính thức trong `backend/src/api/assistant/assistant.repository.js` và `backend/tests/unit/api/assistant.repository.test.js`
- [x] T014 [P] [US3] Xây dựng ngữ cảnh câu hỏi/đáp án/giải thích chính thức giới hạn và phản hồi an toàn khi thiếu ngữ cảnh trong `backend/src/api/assistant/assistant.context.js` và `backend/tests/unit/api/assistant.context.test.js`
- [x] T015 [US3] Giữ xem lại bài thi đã nộp tách biệt với chấm điểm Writing/Speaking cá nhân trong `backend/src/api/assistant/assistant.guardrails.js`, `backend/src/api/assistant/assistant.intent.js`, và kiểm thử unit trong `backend/tests/unit/api/`

## Giai đoạn 4 - P2: Bộ nhớ cuộc trò chuyện và lịch sử (US4)

- [x] T016 [US4] Định nghĩa schema phiên/tin nhắn/tùy chọn/đánh giá trong `backend/src/db/migrations/024_create_chatbot_history_tables.sql` và truy vấn theo phạm vi chủ sở hữu trong `backend/src/api/assistant/assistant.repository.js`
- [x] T017 [P] [US4] Giới hạn bộ nhớ gần đây theo cuộc trò chuyện thuộc sở hữu và cách xưng hô ưa thích 60 ký tự/tám từ trong `backend/src/api/assistant/assistant.memory.js`, `backend/tests/unit/api/assistant.memory.test.js`, và `backend/tests/unit/api/assistant.repository.test.js`
- [x] T018 [US4] Trả tối đa 100 tin nhắn cuộc trò chuyện đang hoạt động thuộc sở hữu theo thời gian qua `backend/src/api/assistant/assistant.controller.js`, `backend/src/api/assistant/assistant.repository.js`, và kiểm thử unit trong `backend/tests/unit/api/`
- [ ] T019 [US4] Lưu mỗi cặp người dùng/trợ lý thành công nguyên tử với bao phủ tiêm lỗi trong `backend/src/api/assistant/assistant.repository.js`, `backend/src/api/assistant/assistant.service.js`, và kiểm thử tích hợp mới trong `backend/tests/integration/assistant/`
- [ ] T020 [US4] Phê duyệt chính sách lưu giữ, đóng/mở lại, xuất, và xóa trong `.sdd/specs/global-ielts-virtual-assistant/spec.md`, sau đó triển khai trong `backend/src/api/assistant/assistant.repository.js`, migration trong `backend/src/db/migrations/`, và điều khiển frontend trong `frontend/src/features/global-assistant/`
- [ ] T021 [P] [US4] Xác minh migration 024 đã áp dụng trên từng môi trường đích và bổ sung kiểm thử tích hợp schema không phá hủy trong `backend/tests/integration/assistant/`

## Giai đoạn 5 - P2: Đánh giá (US5)

- [x] T022 [US5] Xác thực `up/down` và cho phép thay thế đánh giá trước trong `backend/src/api/assistant/assistant.validation.js`, `backend/src/api/assistant/assistant.repository.js`, và kiểm thử unit tập trung trong `backend/tests/unit/api/`
- [ ] T023 [US5] Bổ sung bao phủ endpoint rõ ràng cho chéo chủ sở hữu, tin nhắn người dùng, và đánh giá lại trong `backend/tests/unit/api/assistant.controller.test.js` và `backend/tests/unit/api/assistant.repository.test.js`
- [ ] T024 [US5] Phê duyệt và thực thi chính sách tối đa/nội dung cho `rating_reason` trong `.sdd/specs/global-ielts-virtual-assistant/spec.md`, `backend/src/api/assistant/assistant.validation.js`, và `frontend/src/features/global-assistant/`

## Giai đoạn 6 - Mục tiêu xuyên suốt và cổng phát hành

- [x] T025 [P] Phát hợp đồng SSE hiện tại (start, một full-answer delta, done/error) trong `backend/src/api/assistant/assistant.controller.js`, phân tích frame EOF trong `frontend/src/features/global-assistant/services/assistantApi.js`, và bao phủ trong `backend/tests/unit/api/assistant.controller.test.js` và `frontend/tests/services/assistantApi.test.js`
- [x] T026 [P] Hiển thị trạng thái xác thực/đăng nhập/lỗi/vô hiệu/lịch sử/đánh giá trong `frontend/src/features/global-assistant/` với kiểm thử hiện có trong `frontend/tests/components/global-assistant/`
- [ ] T027 Triển khai hạn mức nguyên tử 50 tin nhắn mỗi học viên mỗi ngày UTC sau khi BR-CHAT-021 được phê duyệt trong `backend/src/services/aiUsage.service.js` hoặc repository chuyên dụng, `backend/src/api/assistant/assistant.routes.js`, và kiểm thử đồng thời mới trong `backend/tests/integration/assistant/`
- [ ] T028 [P] Bổ sung kiểm tra bàn phím và công nghệ hỗ trợ cho điều khiển widget, tin nhắn động, lỗi, và đánh giá trong `frontend/tests/components/global-assistant/GlobalAssistantPanel.test.jsx`
- [ ] T029 [P] Đo độ trễ p50/p95 xác định/nhà cung cấp và coverage service/nghiệp vụ tập trung mà không dùng nhà cung cấp thật trong `backend/tests/` và ghi lệnh có thể tái tạo trong `.sdd/specs/global-ielts-virtual-assistant/tasks.md`
- [ ] T030 Bổ sung kiểm thử hợp đồng OpenAPI tự động cho `contracts/assistant.openapi.yaml` và phê duyệt một mount/đường dẫn trợ lý chuẩn duy nhất trong `backend/tests/contract/`
- [ ] T031 Chạy xác minh migration môi trường đích, kiểm thử smoke offline, và kiểm thử smoke nhà cung cấp được ủy quyền riêng biệt trước bất kỳ tuyên bố sẵn sàng production nào; ghi bằng chứng ở vị trí QA đã phê duyệt ngoài tài liệu tính năng quy chuẩn

## Ma trận truy vết

| Yêu cầu | Tác vụ | Kiểm thử/bằng chứng |
|---|---|---|
| BR-CHAT-001; FR-CHAT-001; NFR-CHAT-001; SC-CHAT-001 | T001, T023 | `assistant.controller.test.js`, `assistant.repository.test.js`; bao phủ đánh giá chéo chủ sở hữu còn mở |
| BR-CHAT-002; FR-CHAT-002; SC-CHAT-002 | T002 | `assistant.validation.test.js` |
| BR-CHAT-003..004; FR-CHAT-003..004 | T003, T008 | `assistant.guardrails.test.js`; kiểm thử bài thi có thẩm quyền còn mở |
| BR-CHAT-005; FR-CHAT-005..006; SC-CHAT-003 | T010..T012 | kiểm thử unit repository/context/intent/prompt/service |
| BR-CHAT-006; FR-CHAT-007; SC-CHAT-004 | T013..T015 | `assistant.repository.test.js`, `assistant.context.test.js`, kiểm thử rào chắn/ý định |
| BR-CHAT-007..008; FR-CHAT-008,012 | T016..T018, T020 | kiểm thử bộ nhớ/repository/controller; vòng đời còn mở |
| BR-CHAT-009..010,016..018; FR-CHAT-009; NFR-CHAT-005..006; SC-CHAT-005 | T004..T006, T009, T011..T012 | kiểm thử service/response/selfcheck/prompt; timeout còn mở |
| BR-CHAT-011..012; FR-CHAT-016; NFR-CHAT-007 | T019, T021 | kiểm thử giao dịch/tiêm lỗi và schema còn mở |
| BR-CHAT-013,020; FR-CHAT-013,018; SC-CHAT-007 | T022..T024 | kiểm thử xác thực/repository hiện tại; sở hữu endpoint và giới hạn lý do còn mở |
| BR-CHAT-014..015,021; FR-CHAT-014..015; NFR-CHAT-003,011 | T007, T027 | bằng chứng route/limiter; kiểm thử hạn mức hàng ngày còn mở |
| FR-CHAT-010..011; NFR-CHAT-008; SC-CHAT-006 | T025 | kiểm thử controller và frontend API |
| FR-CHAT-017; BR-CHAT-019 | T020 | kiểm thử chính sách và vòng đời còn mở |
| NFR-CHAT-002,004,009,010; SC-CHAT-008 | T009, T028..T031 | bằng chứng độ trễ, timeout, trợ năng, coverage, hợp đồng/smoke còn mở |

## Thứ tự phụ thuộc

1. Giải quyết BR-CHAT-019/020/021 trước T020, T024, và T027.
2. Hoàn thành T008, T009, T019, T023, T028, và T030 trước đánh giá phát hành hợp đồng bảo mật/độ tin cậy.
3. Hoàn thành T021 và T031 trên từng môi trường trước bất kỳ tuyên bố sẵn sàng production nào.
