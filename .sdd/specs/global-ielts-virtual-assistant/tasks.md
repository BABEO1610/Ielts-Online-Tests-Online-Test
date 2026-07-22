---

description: "Bản ghi nhiệm vụ theo hiện trạng, được sắp xếp theo thứ tự phụ thuộc cho Trợ lý ảo IELTS toàn cục"
---

# Nhiệm vụ: Trợ lý ảo IELTS toàn cục

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md), [CONTEXT.md](./CONTEXT.md), [production-test-suite.md](./production-test-suite.md)

**Kiểm thử**: Được đưa vào vì đặc tả xác định kiểm thử hồi quy và xác thực hành vi là tiêu chí phát hành.

**Cách tổ chức**: Các nhiệm vụ được nhóm theo từng câu chuyện người dùng có thể kiểm thử độc lập. Ô đã đánh dấu mô tả hành vi có bằng chứng trong kho mã hiện tại; ô còn mở không mặc nhiên được coi là hoàn thành chỉ vì đã có tài liệu.

## Định dạng: `[ID] [P?] [Câu chuyện?] Mô tả`

- **[P]**: Có thể chạy song song vì thay đổi các tệp khác nhau và không còn phụ thuộc chưa đáp ứng.
- **[Câu chuyện]**: Ánh xạ nhiệm vụ tới một câu chuyện người dùng trong `spec.md`.
- Mỗi nhiệm vụ triển khai đều nêu rõ tệp hoặc thư mục cụ thể.

## Giai đoạn 1: Thiết lập (Hạ tầng dùng chung)

**Mục đích**: Gắn tính năng vào ứng dụng và thiết lập ranh giới giữa phía máy chủ (backend) với phía giao diện (frontend).

- [X] T001 Gắn `backend/src/api/assistant/assistant.routes.js` tại `/api/assistant` trong `backend/src/app.js` và tại `/api/v1/assistant` trong `backend/src/routes/api/v1/index.js`
- [X] T002 [P] Hiển thị toàn cục `frontend/src/features/global-assistant/components/GlobalAssistantButton.jsx` từ `frontend/src/App.jsx`
- [X] T003 [P] Cấu hình bộ giới hạn trò chuyện của trợ lý trong `backend/src/middleware/rateLimit.js` và gắn bộ giới hạn vào `backend/src/api/assistant/assistant.routes.js`

**Điểm kiểm tra**: Hai tiền tố tuyến (route) được hỗ trợ và điểm vào của tiện ích (widget) toàn cục đều tồn tại.

---

## Giai đoạn 2: Nền tảng (Điều kiện tiên quyết có tính chặn)

**Mục đích**: Thiết lập schema, xác thực đầu vào, bảo mật, quyền sở hữu và bộ thuật ngữ phản hồi dùng chung mà mọi câu chuyện đều cần.

**⚠️ QUAN TRỌNG**: Công việc của các câu chuyện người dùng phụ thuộc vào giai đoạn này.

- [X] T004 Định nghĩa các thay đổi cho phiên/tin nhắn chatbot, tùy chọn xưng hô, đánh giá, chỉ mục và trình kích hoạt (trigger) trong `backend/src/db/migrations/024_create_chatbot_history_tables.sql`
- [X] T005 Triển khai các bước kiểm tra cookie/JWT, phiên đang hoạt động, thu hồi trên Redis, yêu cầu đổi mật khẩu và vai trò học viên trong `backend/src/api/assistant/assistant.controller.js`
- [X] T006 [P] Xác thực tin nhắn, ngữ cảnh trang, các mục đang hiển thị và UUID tùy chọn của cuộc trò chuyện trong `backend/src/api/assistant/assistant.validation.js`
- [X] T007 [P] Định nghĩa mã lỗi trợ lý, loại trang, trạng thái đã nộp, giới hạn ngữ cảnh và quy tắc ngữ cảnh ý định (intent) trong `backend/src/api/assistant/assistant.constants.js`
- [X] T008 [P] Triển khai các quy tắc tiền kiểm cho lúc làm bài và an toàn nội dung trong `backend/src/api/assistant/assistant.guardrails.js`
- [X] T009 Thực thi việc phân giải phiên đang hoạt động thuộc quyền sở hữu và các thao tác tin nhắn/lịch sử/đánh giá theo quyền sở hữu trong `backend/src/api/assistant/assistant.repository.js`
- [X] T010 [P] Bao phủ hành vi nền tảng của bộ điều khiển (controller), xác thực đầu vào, rào chắn và lớp truy cập dữ liệu (repository) trong `backend/tests/unit/api/assistant.controller.test.js`, `assistant.validation.test.js`, `assistant.guardrails.test.js` và `assistant.repository.test.js`

**Điểm kiểm tra**: Yêu cầu có thể được xác thực đầu vào, xác thực danh tính, tiền kiểm và giới hạn phạm vi trước khi xử lý riêng cho từng câu chuyện.

---

## Giai đoạn 3: Câu chuyện người dùng 1 - Hỏi về IELTS và việc học tiếng Anh (Ưu tiên: P1) 🎯 MVP

**Mục tiêu**: Trả lời các câu hỏi học tập đúng phạm vi bằng định tuyến tất định, kiến thức/ngữ cảnh có giới hạn, sử dụng nhà cung cấp an toàn và phương án dự phòng.

**Kiểm thử độc lập**: Hỏi một khái niệm IELTS được hỗ trợ, buộc nhà cung cấp thất bại và xác minh rằng hệ thống trả phản hồi an toàn, phù hợp mà không chấm điểm cá nhân hoặc bịa dữ liệu nền tảng.

- [X] T011 [US1] Triển khai định tuyến tất định cho nội dung học tập, lời chào, điều hướng tĩnh tức thời/không dùng nhà cung cấp và yêu cầu làm rõ, kèm các tín hiệu hỏi tiếp theo ngữ cảnh trong `backend/src/api/assistant/assistant.intent.js`
- [X] T012 [P] [US1] Nạp tệp đăng ký (registry) và các tệp nội dung của kho kiến thức thông qua `backend/src/api/assistant/assistant.knowledge-base.js` và `backend/src/api/assistant/knowledge-base/`
- [X] T013 [P] [US1] Truy xuất các đoạn kiến thức có giới hạn và được tính điểm mức độ liên quan trong `backend/src/api/assistant/assistant.knowledge-retriever.js`
- [X] T014 [US1] Xây dựng ngữ cảnh kiến thức và phiên gần đây trong `backend/src/api/assistant/assistant.context.js`
- [X] T015 [P] [US1] Xây dựng câu lệnh cho mô hình (prompt) có nhận biết ngôn ngữ và ranh giới dành cho ngữ cảnh không đáng tin cậy trong `backend/src/api/assistant/assistant.prompts.js`
- [X] T016 [P] [US1] Triển khai cấu hình Gemini/OpenAI, cô lập mô hình, lời gọi bằng `fetch` gốc và ghi log mức sử dụng trong `backend/src/services/ai.service.js` và `backend/src/services/aiUsage.service.js`
- [X] T017 [US1] Chuẩn hóa và tự kiểm tra câu trả lời của nhà cung cấp trong `backend/src/api/assistant/assistant.response.js` và `backend/src/api/assistant/assistant.selfcheck.js`
- [X] T018 [US1] Triển khai một lần thử lại bằng văn bản thuần cho phản hồi không hợp lệ, các phương án dự phòng kiến thức tất định, chính xác một cặp tin nhắn người dùng/trợ lý thuộc quyền sở hữu cho mỗi lượt trao đổi thành công khi có lưu trữ, đồng thời thử lưu trước khi phát luồng theo thứ tự start/delta/done trong `backend/src/api/assistant/assistant.service.js`
- [X] T019 [US1] Phân loại phạm vi chưa xác định bằng ngữ cảnh gần đây có giới hạn và phương án yêu cầu làm rõ an toàn trong `backend/src/api/assistant/assistant.scope-classifier.js`
- [X] T020 [P] [US1] Bao phủ ý định (intent), prompt, truy xuất kiến thức, kiểm tra phản hồi, cấu hình nhà cung cấp và phương án dự phòng trong `backend/tests/unit/api/assistant.*.test.js` và `backend/tests/unit/services/ai.service.test.js`

**Điểm kiểm tra**: P1 hoạt động độc lập với việc tra cứu bài thi/tài nguyên/lượt làm bài.

---

## Giai đoạn 4: Câu chuyện người dùng 2 - Tìm bài thi và tài nguyên học tập đã xuất bản (Ưu tiên: P2)

**Mục tiêu**: Chỉ trả về các bài thi/tài nguyên đã xuất bản, có dữ liệu nền từ cơ sở dữ liệu và liên kết nội bộ thực.

**Kiểm thử độc lập**: Tìm một chủ đề với dữ liệu giả lập gồm cả dòng khớp và tập rỗng; xác minh hệ thống dùng đúng bảng, lọc trước khi giới hạn, trả tiêu đề dựa trên dữ liệu, đúng số lượng và đúng hành vi khi không có kết quả.

- [X] T021 [P] [US2] Phân tích các ô dữ liệu (slot) về hành động tra cứu, kỹ năng, chủ đề, cách sắp xếp và số lượng trong `backend/src/api/assistant/assistant.lookup-parser.js`
- [X] T022 [US2] Truy vấn các bài thi đã xuất bản với bộ lọc được tham số hóa trước bước giới hạn trong `backend/src/api/assistant/assistant.context.js`
- [X] T023 [US2] Truy vấn tài nguyên thư viện đã xuất bản mà không để loại trang khiến yêu cầu bị định tuyến sai trong `backend/src/api/assistant/assistant.context.js`
- [X] T024 [P] [US2] Xây dựng liên kết nội bộ cho bài thi/tài nguyên trong `backend/src/api/assistant/assistant.link-builder.js`
- [X] T025 [US2] Thay đầu ra tra cứu trống, chung chung, lỗi nhà cung cấp hoặc không rõ tiêu đề bằng đầu ra tất định dựa trên dữ liệu nền trong `backend/src/api/assistant/assistant.service.js`
- [X] T026 [P] [US2] Bao phủ việc phân tích tra cứu, lọc SQL, xếp hạng, giới hạn, liên kết và dữ liệu nền trong `backend/tests/unit/api/assistant.context.test.js`, `assistant.intent.test.js`, `assistant.selfcheck.test.js` và `assistant.service.test.js`

**Điểm kiểm tra**: P2 hoạt động với các dòng cơ sở dữ liệu giả lập và không phụ thuộc vào dữ liệu xem lại.

---

## Giai đoạn 5: Câu chuyện người dùng 3 - Xem lại một lượt làm bài đã nộp (Ưu tiên: P3)

**Mục tiêu**: Chỉ giải thích lượt làm bài đã nộp thuộc quyền sở hữu dựa trên ngữ cảnh câu hỏi/câu trả lời chính thức.

**Kiểm thử độc lập**: Thực thi các trường hợp thuộc quyền sở hữu/đã nộp, thuộc người khác, chưa nộp, thiếu câu hỏi và thiếu lời giải thích với ID lượt làm bài do yêu cầu cung cấp.

- [X] T027 [US3] Phân giải POST_TEST_REVIEW từ tin nhắn kết hợp ngữ cảnh xem lại/kết quả hiện tại trong `backend/src/api/assistant/assistant.intent.js`
- [X] T028 [US3] Truy vấn một lượt làm bài thuộc quyền sở hữu và thực thi điều kiện `submitted_at` trong `backend/src/api/assistant/assistant.context.js`
- [X] T029 [US3] Truy vấn câu trả lời đã nộp và các dòng câu hỏi/lời giải thích chính thức trong `backend/src/api/assistant/assistant.context.js`
- [X] T030 [US3] Xây dựng prompt xem lại và từ chối đầu ra xem lại bị thiếu/không an toàn trong `backend/src/api/assistant/assistant.prompts.js` và `backend/src/api/assistant/assistant.selfcheck.js`
- [X] T031 [P] [US3] Bao phủ quyền sở hữu, trạng thái nộp bài, lựa chọn câu hỏi và trường hợp thiếu lời giải thích trong `backend/tests/unit/api/assistant.context.test.js` và `backend/tests/unit/api/assistant.service.test.js`

**Điểm kiểm tra**: P3 không bao giờ suy ra quyền truy cập từ văn bản hội thoại và không bao giờ bịa lời giải thích.

---

## Giai đoạn 6: Câu chuyện người dùng 4 - Ghi nhớ cách xưng hô ưu tiên (Ưu tiên: P4)

**Mục tiêu**: Đặt, nhắc lại, xóa, làm sạch, lưu và cô lập cách xưng hô ưu tiên theo phạm vi cuộc trò chuyện.

**Kiểm thử độc lập**: Đặt một tùy chọn hợp lệ, nhắc lại tùy chọn đó sau khi tin nhắn thiết lập đã ra khỏi phạm vi lịch sử gần đây, xóa tùy chọn, từ chối giá trị quá dài/giống chỉ thị và chuyển đổi người dùng.

- [X] T032 [P] [US4] Triển khai các mẫu đặt, nhắc lại và xóa bằng tiếng Việt/tiếng Anh trong `backend/src/api/assistant/assistant.memory.js`
- [X] T033 [P] [US4] Thực thi chuẩn hóa, giới hạn 60 ký tự/8 từ, loại bỏ hậu tố và từ chối mẫu giống chỉ thị trong `backend/src/api/assistant/assistant.memory.js`
- [X] T034 [US4] Chỉ đọc và cập nhật tùy chọn có cấu trúc trên một phiên đang hoạt động thuộc quyền sở hữu trong `backend/src/api/assistant/assistant.repository.js`
- [X] T035 [US4] Triển khai lối tắt tùy chọn không dùng nhà cung cấp và phân giải tên hiển thị ưu tiên tùy chọn trước trong `backend/src/api/assistant/assistant.service.js`
- [X] T036 [P] [US4] Phân giải tên hiển thị an toàn từ hồ sơ/siêu dữ liệu và giá trị dự phòng chung trong `backend/src/api/assistant/assistant.user-resolver.js`
- [X] T037 [P] [US4] Bao phủ việc phân tích bộ nhớ, phương án dự phòng khi lưu dữ liệu, tên hiển thị và tính liên tục phía giao diện khi chuyển đổi người dùng trong `backend/tests/unit/api/assistant.memory.test.js`, `assistant.user-resolver.test.js`, `assistant.service.test.js` và `frontend/tests/components/global-assistant/GlobalAssistantButton.test.jsx`

**Điểm kiểm tra**: P4 được cô lập theo người dùng và cuộc trò chuyện, đồng thời không thể ghi đè các chỉ dẫn an toàn.

---

## Giai đoạn 7: Câu chuyện người dùng 5 - Thực thi kiểm soát truy cập, xác thực đầu vào và an toàn (Ưu tiên: P5)

**Mục tiêu**: Chặn các yêu cầu không được cấp quyền, khi đang làm bài, không hợp lệ, vượt giới hạn tần suất, chấm điểm, truy cập dữ liệu riêng tư, nội dung giả và các yêu cầu bị cấm khác trước khi thực hiện công việc được bảo vệ.

**Kiểm thử độc lập**: Gửi yêu cầu đại diện cho từng nhóm bị chặn và xác minh không phát sinh tác dụng phụ không cần thiết lên cơ sở dữ liệu/nhà cung cấp/lưu dữ liệu.

- [X] T038 [US5] Trả lỗi đăng nhập/vai trò cho các endpoint trợ lý được bảo vệ trong `backend/src/api/assistant/assistant.controller.js`
- [X] T039 [P] [US5] Ẩn tiện ích trên các tuyến lúc làm bài và cung cấp trạng thái khách/đăng nhập trong `frontend/src/features/global-assistant/hooks/useAssistantAvailability.js`
- [X] T040 [US5] Thực thi tiền kiểm ở backend cho lúc làm bài và nội dung bị cấm trong `backend/src/api/assistant/assistant.guardrails.js` và `assistant.service.js`
- [X] T041 [P] [US5] Thực thi giới hạn 30 yêu cầu/IP/phút trên các tuyến chat và stream trong `backend/src/middleware/rateLimit.js` và `backend/src/api/assistant/assistant.routes.js`
- [X] T042 [P] [US5] Bảo vệ `/status` và chỉ trả thông tin tình trạng tối thiểu trong `backend/src/api/assistant/assistant.controller.js`
- [X] T043 [P] [US5] Bao phủ xác thực danh tính, vai trò, quyền riêng tư của trạng thái, chặn lúc làm bài, quy tắc về prompt/dữ liệu riêng tư và xác thực đầu vào trong `backend/tests/unit/api/assistant.controller.test.js`, `assistant.guardrails.test.js` và `assistant.validation.test.js`

**Điểm kiểm tra**: Các biện pháp kiểm soát P5 có thể được kiểm thử độc lập mà không cần truy cập nhà cung cấp/cơ sở dữ liệu thật.

---

## Giai đoạn 8: Tích hợp phía giao diện (frontend)

**Mục đích**: Cung cấp tiện ích học viên toàn cục, đồng bộ lịch sử, xử lý SSE chỉ phát phản hồi cuối, liên kết và đánh giá.

- [X] T044 [P] Triển khai bật/tắt tiện ích và trạng thái cuộc trò chuyện ràng buộc với chủ sở hữu trong `frontend/src/features/global-assistant/components/GlobalAssistantButton.jsx`
- [X] T045 Triển khai tải lịch sử, trạng thái gửi, hàm gọi lại (callback) của luồng, liên kết, lỗi và luồng đánh giá trong `frontend/src/features/global-assistant/components/GlobalAssistantPanel.jsx`
- [X] T046 [P] Hiển thị tin nhắn và bộ điều khiển đánh giá trong `frontend/src/features/global-assistant/components/ChatMessageList.jsx` và `ChatMessageItem.jsx`
- [X] T047 [P] Vô hiệu hóa gửi cho tới khi xác thực danh tính, tính sẵn sàng và lịch sử chính thức từ máy chủ đều sẵn sàng trong `frontend/src/features/global-assistant/components/ChatInputBox.jsx`
- [X] T048 [P] Hiển thị lời nhắc đăng nhập cho khách và giữ lại component thông báo bị vô hiệu hóa hiện chưa thể truy cập trong `frontend/src/features/global-assistant/components/LoginRequiredPrompt.jsx` và `AssistantDisabledNotice.jsx`
- [X] T049 [P] Suy ra loại trang, trạng thái hiển thị lúc làm bài, ID lượt làm bài, tuyến và tính sẵn sàng của người dùng trong `frontend/src/features/global-assistant/hooks/useAssistantAvailability.js`
- [X] T050 Triển khai lời gọi JSON, phân tích khung dữ liệu SSE cuối, hành vi không tự động thử lại và kiểu hiển thị của tính năng trong `frontend/src/features/global-assistant/services/assistantApi.js` và `frontend/src/features/global-assistant/globalAssistant.css`

**Điểm kiểm tra**: Phía giao diện giữ một cuộc trò chuyện hiện hành thuộc quyền sở hữu và không nhân đôi các yêu cầu truyền luồng có kết quả chưa chắc chắn.

---

## Giai đoạn 9: Tài liệu, hồi quy và kiểm tra phát hành

**Mục đích**: Giữ hợp đồng theo hiện trạng ở trạng thái có thể tái lập và công khai thay vì che giấu các khoảng trống còn lại.

- [X] T051 [P] Giữ nguyên bản ghi đánh giá đã tuyển chọn và RFC trong `.sdd/specs/global-ielts-virtual-assistant/eval-set.md` và `RFC.md`
- [X] T052 Mở rộng và đổi tên hợp đồng hành vi thành 561 trường hợp liên tục trong `.sdd/specs/global-ielts-virtual-assistant/production-test-suite.md`
- [X] T053 Chuẩn hóa câu chuyện người dùng, yêu cầu, kiến trúc và nhiệm vụ theo thứ tự phụ thuộc trong `.sdd/specs/global-ielts-virtual-assistant/spec.md`, `plan.md` và `tasks.md`
- [X] T054 Tạo và hoàn thành danh sách kiểm tra xem xét theo hiện trạng trong `.sdd/specs/global-ielts-virtual-assistant/checklist.md`
- [X] T055 Chạy tập bài Jest tập trung cho trợ lý/nhà cung cấp/mức sử dụng ở backend từ `backend/tests/unit/api/` và `backend/tests/unit/services/`, rồi ghi lại kết quả có thể tái lập
- [ ] T056 [P] Chạy ba tệp Vitest của trợ lý ở frontend, ESLint tập trung cho trợ lý, bản dựng frontend, kiểm tra cú pháp backend, kiểm tra Markdown và `git diff --check`

---

## Giai đoạn 10: Gia cố còn lại

**Mục đích**: Các công việc được để mở có chủ đích; chúng yêu cầu thay đổi mã nguồn, quyền truy cập môi trường hoặc cả hai. Các nhiệm vụ này không mặc nhiên giải quyết mọi sai lệch Hiến chương được liệt kê trong `plan.md`; việc khắc phục React/CSS/cách đặt tên và tệp lớn cần một phạm vi quản trị/tái cấu trúc được phê duyệt riêng.

- [ ] T057 Xác định quá trình chuyển đổi tương thích ngược từ các phản hồi trợ lý phẳng hiện tại sang bao phản hồi của dự án trong `backend/src/api/assistant/assistant.controller.js` và `backend/src/api/assistant/assistant.responses.js`; bao phủ giới hạn tần suất từ `backend/src/middleware/rateLimit.js`, `/status` được bảo vệ, tính tương thích phản hồi và thứ tự sự kiện SSE thành công trong `backend/tests/integration/`; sau đó tạo bằng chứng độ bao phủ tập trung và khép các khoảng trống cần thiết cho cổng 80% của Hiến chương
- [ ] T058 Áp dụng `backend/src/db/migrations/024_create_chatbot_history_tables.sql` trên từng môi trường được ủy quyền và xác minh `chatbot_sessions.preferred_address`, các cột đánh giá, chỉ mục và trigger mà không ghi log bí mật
- [ ] T059 Xác định và phê duyệt hợp đồng truyền luồng (streaming) đã cập nhật trong `spec.md`, sau đó triển khai và kiểm thử truyền từng token, ngữ nghĩa ngắt kết nối/hủy từ phía máy khách (client) và phân tích SSE nhiều dòng/CRLF tuân thủ tiêu chuẩn trên `backend/src/api/assistant/assistant.service.js` và `frontend/src/features/global-assistant/services/assistantApi.js`
- [ ] T060 Bổ sung luồng HTTP E2E dùng cookie đã xác thực cho chat, stream, lịch sử, đánh giá, ID cuộc trò chuyện của người khác và từ chối lúc làm bài trong `backend/tests/integration/assistant/`
- [ ] T061 Chạy các trường hợp kiểm thử nhanh PM-01–PM-18 trên cơ sở dữ liệu/nhà cung cấp thật đã được ủy quyền, ghi kết quả thực tế vào `.sdd/specs/global-ielts-virtual-assistant/eval-set.md` và không đưa khóa, token, cookie hoặc PII vào log

---

## Phụ thuộc và thứ tự thực thi

### Phụ thuộc giữa các giai đoạn

- **Thiết lập (Giai đoạn 1)** → **Nền tảng (Giai đoạn 2)**.
- **US1–US5 (Giai đoạn 3–7)** phụ thuộc vào Nền tảng. Công việc ở mức kiểm thử đơn vị (unit) của chúng có thể tách biệt sau khi các hợp đồng ý định/ngữ cảnh/lớp truy cập dữ liệu dùng chung ổn định.
- **Frontend (Giai đoạn 8)** phụ thuộc vào hành vi route và phản hồi từ Giai đoạn 2–7.
- **Tài liệu/Hồi quy (Giai đoạn 9)** phụ thuộc vào mã nguồn theo hiện trạng và bộ kiểm thử hành vi.
- **Gia cố còn lại (Giai đoạn 10)** bắt đầu sau khi đường cơ sở hồi quy hiện tại có thể tái lập. T058 cần ủy quyền môi trường rõ ràng; T059 cần thay đổi đặc tả/hợp đồng đã được phê duyệt; T061 phụ thuộc vào T058 và thông tin xác thực kiểm thử. Các sai lệch Hiến chương ngoài năm nhiệm vụ này cần một kế hoạch khắc phục được phê duyệt riêng.

### Phụ thuộc giữa các câu chuyện người dùng

- **US1 (P1)**: MVP độc lập sau giai đoạn Nền tảng.
- **US2 (P2)**: Tái sử dụng nền tảng định tuyến/nhà cung cấp/tự kiểm tra nhưng có thể kiểm thử độc lập bằng các dòng tra cứu giả lập.
- **US3 (P3)**: Tái sử dụng nền tảng định tuyến/nhà cung cấp/tự kiểm tra; có thể kiểm thử độc lập nhưng cần dữ liệu mẫu về lượt làm bài đã nộp thuộc quyền sở hữu.
- **US4 (P4)**: Tái sử dụng tính bền vững dữ liệu của cuộc trò chuyện thuộc quyền sở hữu và có thể kiểm thử độc lập mà không cần nhà cung cấp câu trả lời.
- **US5 (P5)**: Cổng xuyên suốt cho mọi câu chuyện; bài kiểm thử phải khẳng định cổng chạy trước các tác dụng phụ riêng của từng câu chuyện.

### Bên trong mỗi câu chuyện người dùng

- Bài kiểm thử và dữ liệu mẫu cho hợp đồng thay đổi nên được viết hoặc cập nhật trước thay đổi triển khai tương ứng.
- Kiểm tra quyền sở hữu/xác thực đầu vào phải có trước truy cập dữ liệu.
- Xác lập dữ liệu nền phải có trước việc chấp nhận đầu ra của nhà cung cấp.
- Chỉ lưu dữ liệu cho kết quả cuối thành công.
- Các nhiệm vụ chạm vào cùng một tệp phải chạy tuần tự ngay cả khi công việc liền kề được đánh dấu `[P]`.

## Cơ hội thực hiện song song

- T006–T008 có thể chạy song song sau khi đã biết giao diện lập trình (interface) của T004/T005.
- T012, T013, T015 và T016 chạm vào các tệp kiến thức/prompt/nhà cung cấp riêng biệt.
- Công việc phân tích tra cứu/liên kết của US2 và công việc bộ nhớ/tên hiển thị của US4 dùng các tệp riêng sau giai đoạn Nền tảng.
- T044, T046–T049 là các component/hook frontend có thể tách biệt; T045/T050 được tích hợp sau đó.
- T055 và phần frontend của T056 có thể chạy song song; kiểm tra diff/tài liệu cuối cùng chạy sau cả hai.

## Ví dụ thực hiện song song: Câu chuyện người dùng 4

```text
Nhiệm vụ T032: các mẫu yêu cầu về tùy chọn xưng hô trong assistant.memory.js
Nhiệm vụ T036: phân giải tên hiển thị tài khoản an toàn trong assistant.user-resolver.js
Nhiệm vụ T037: các bài kiểm thử cô lập cho bộ nhớ/bộ phân giải người dùng/tính liên tục phía giao diện
```

## Chiến lược triển khai

### Ưu tiên MVP

1. Hoàn thành Thiết lập và Nền tảng.
2. Cung cấp kiến thức/lời chào/yêu cầu làm rõ của US1 cùng phương án dự phòng tất định.
3. Chạy kiểm thử đơn vị (unit test) của US1 mà không gọi nhà cung cấp/cơ sở dữ liệu thật.
4. Bổ sung dần các câu chuyện về tra cứu dựa trên dữ liệu, xem lại lượt làm bài, tùy chọn xưng hô và an toàn.

### Bàn giao tăng dần

1. Thiết lập + Nền tảng → chuỗi xử lý được bảo vệ và ràng buộc quyền sở hữu.
2. US1 → trợ lý học tập độc lập.
3. US2 → khám phá nền tảng dựa trên dữ liệu.
4. US3 → xem lại lượt làm bài đã nộp thuộc quyền sở hữu.
5. US4 → cá nhân hóa theo phạm vi cuộc trò chuyện.
6. US5 + Frontend → hành vi phát hành xuyên suốt.
7. Hồi quy/tài liệu → đường cơ sở theo hiện trạng có thể tái lập.
8. Gia cố còn lại → công việc mã nguồn/môi trường được ủy quyền riêng.

## Ghi chú

- `[X]` nghĩa là đã có bằng chứng từ mã nguồn/bài kiểm thử; không có nghĩa mọi trường hợp trực tiếp/thủ công trên môi trường production đều đã chạy.
- T056 còn mở vì ESLint trợ lý ở backend không thể nạp cấu hình kho mã cho tới khi phụ thuộc phát triển `@eslint/js` còn thiếu được khôi phục; kiểm tra lint tập trung cho frontend, dựng ứng dụng, kiểm thử, kiểm tra cú pháp backend và kiểm tra tài liệu đều đạt.
- Mục lịch sử ngày 2026-07-21 trong `eval-set.md` được giữ nguyên. Lần kiểm chứng hiện tại phải báo cáo riêng lệnh chính xác và số lượng đạt/bỏ qua.
- Các sai lệch Hiến chương hiện tại được ghi lại trong `plan.md`; chúng không mặc nhiên được miễn trừ bởi các nhiệm vụ tính năng đã hoàn thành.
- Số lượng bài kiểm thử đạt không chứng minh cổng độ bao phủ 80% của Hiến chương; T057 tiếp tục để mở việc tạo bằng chứng đó và mọi khoảng trống kiểm thử phát sinh.
- Việc triển khai tài liệu này không bao gồm migration, lời gọi AI thật, yêu cầu HTTP thật có xác thực, commit hoặc push.
