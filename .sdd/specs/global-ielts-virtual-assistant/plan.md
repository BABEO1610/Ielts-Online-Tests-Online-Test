# Kế hoạch triển khai: Trợ lý ảo IELTS toàn cục

**Nhánh**: `feature-global-ielts-virtual-assistant/Datnt` | **Ngày**: 2026-07-21 | **Đặc tả**: [spec.md](./spec.md)

**Đầu vào**: Đặc tả tính năng theo hiện trạng từ `.sdd/specs/global-ielts-virtual-assistant/spec.md`

**Phạm vi tài liệu**: Chuẩn hóa tài liệu hiện trạng của tính năng dựa trên mã nguồn và các bài kiểm thử. Kế hoạch này không cho phép thay đổi mã nguồn, chạy migration trên môi trường vận hành (production), gọi trực tiếp nhà cung cấp AI hoặc truy cập bí mật.

## Tóm tắt

Trợ lý ảo IELTS toàn cục là một tiện ích (widget) chỉ dành cho học viên, được vận hành bởi chuỗi xử lý (pipeline) định hướng theo ý định (intent):

```text
Xác thực yêu cầu
  → phân giải cookie/JWT + phiên đăng nhập đang hoạt động + vai trò học viên
  → đánh giá các rào chắn tiền kiểm
  → phân giải cuộc trò chuyện đang hoạt động thuộc quyền sở hữu
  → đi theo lối tắt tùy chọn xưng hô hoặc định tuyến intent
  → ngữ cảnh phiên có giới hạn + kiến thức tĩnh hoặc dữ liệu nền từ cơ sở dữ liệu
  → phản hồi tức thời, phản hồi từ nhà cung cấp hoặc phương án dự phòng tất định
  → tự kiểm tra phản hồi
  → lưu dữ liệu thuộc quyền sở hữu theo cơ chế nỗ lực tối đa
  → trả phản hồi JSON hoặc SSE của ứng dụng
```

Tính năng sử dụng kiến thức tĩnh dạng JSON và các truy vấn PostgreSQL được tham số hóa. Tính năng không dùng truy xuất vectơ và không thực hiện chấm điểm Writing/Speaking chính thức. Điểm cuối truyền luồng hiện lưu đệm toàn bộ câu trả lời rồi phát một phần dữ liệu chứa toàn bộ câu trả lời; việc truyền từng `token` tới trình duyệt vẫn là công việc trong tương lai.

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Phía máy chủ (backend) dùng Node.js `>=20`; phía giao diện (frontend) dùng JavaScript/JSX; React và ReactDOM `19.2.6`; dải phiên bản Vite `^8.0.12` (được phân giải thành `8.0.16` khi kiểm chứng)

**Các phụ thuộc chính**: Express `5.2.1`, `pg 8.21.0`, `express-rate-limit 8.5.2`, `jsonwebtoken 9.0.3`, `ioredis 5.11.0`, React Router `7.17.0`, Axios `1.17.0`, Bootstrap `5.3.8`, Lucide React `1.22.0`. Các lời gọi tới nhà cung cấp dùng hàm `fetch` gốc của Node; kho mã không cài OpenAI/Gemini SDK hoặc `sanitize-html`.

**Lưu trữ**: PostgreSQL 16 thông qua các truy vấn `pg` thuần. Các bảng do trợ lý sở hữu là `chatbot_sessions` và `chatbot_messages`; siêu dữ liệu nhà cung cấp dùng `ai_usage_logs`; các lượt đọc dữ liệu nền dùng `mock_tests`, `library_resources`, `test_attempts`, `questions` và `question_answers`. Migration `024_create_chatbot_history_tables.sql` đã tồn tại nhưng vẫn cần được áp dụng và xác minh riêng trên từng môi trường.

**Kiểm thử**: Phía máy chủ (backend) dùng Jest `29.7.0` và phía giao diện (frontend) dùng dải phiên bản Vitest `^4.1.7` (được phân giải thành `4.1.8` khi kiểm chứng). Bộ kiểm thử hành vi chứa 561 trường hợp duy nhất. `eval-set.md` chứa 115 dòng bảng trước phần nhật ký (97 dòng thông thường cùng PM-01–PM-18) và các nhật ký kiểm chứng lịch sử; các số liệu lịch sử này chỉ là bản ghi, không thay thế được một lệnh hiện tại có thể tái lập.

**Nền tảng đích**: SPA trên trình duyệt, được hỗ trợ bởi REST API Express và endpoint phản hồi tương thích SSE

**Loại dự án**: Ứng dụng web gồm hai dự án `backend/` và `frontend/` tách biệt

**Mục tiêu hiệu năng**: Giới hạn yêu cầu trò chuyện ở mức 30 yêu cầu/IP/phút; giới hạn độ dài tin nhắn ở 2000 ký tự; chấp nhận tối đa 20 mục đang hiển thị trên trang; giới hạn bộ nhớ định tuyến gần nhất ở 12 tin nhắn; mặc định hiển thị 3 đề xuất tra cứu.

**Ràng buộc**: Chỉ dành cho học viên; không hỗ trợ trong lúc làm bài khi ngữ cảnh yêu cầu khai báo `active-test`; không chấm điểm Writing/Speaking chính thức; không dùng RAG dựa trên vector/embedding; không chuyển đổi dự phòng giữa các nhà cung cấp; chỉ dùng SQL thuần được tham số hóa; không đưa bí mật hoặc PII thô vào tài liệu/đầu ra kiểm thử; SSE chỉ phát phản hồi cuối thay vì truyền từng token.

**Quy mô/Phạm vi**: 20 mô-đun JS phía máy chủ (backend) của trợ lý, 10 tệp JSON trong kho kiến thức (9 tệp nội dung và 1 tệp đăng ký — registry), 2 mô-đun dịch vụ AI dùng chung, 1 migration và 10 tệp tính năng phía giao diện (frontend), gồm 7 component, 1 hook, 1 service và 1 tệp CSS.

## Kiểm tra Hiến chương

*CỔNG TUÂN THỦ: **KHÔNG ĐẠT đối với hiện trạng triển khai**. Có thể tiếp tục chuẩn hóa tài liệu, nhưng không được trình bày các sai lệch dưới đây như thể đã tuân thủ. Lần kiểm tra hiện trạng được ghi lại ở đây dùng `.sdd/constitution.md`, `.agents/AGENTS.md` và các tệp trong `.sdd/constraints/` làm nguồn có thẩm quyền; các thay đổi chưa được xác minh trong `.specify/memory/constitution.md` không làm thay đổi kết luận lịch sử này.*

| Quy tắc | Trạng thái | Bằng chứng |
|---|---|---|
| Node.js 20, Express 5.x, PostgreSQL 16, `pg` thuần | ĐẠT | `backend/package.json`, `backend/src/db/pool.js`, các lớp truy cập dữ liệu (repository) của trợ lý |
| SQL được tham số hóa; không dùng ORM | ĐẠT | Các định danh động được giới hạn bằng danh sách cho phép/đặt trong dấu nháy; giá trị người dùng được truyền dưới dạng `$1`, `$2`, v.v. |
| Bí mật chỉ nằm ở phía máy chủ | ĐẠT | Khóa nhà cung cấp được đọc từ môi trường; khóa Gemini được gửi trong `x-goog-api-key`, không nằm trong URL |
| Phụ thuộc Bootstrap 5.x và sử dụng component | ĐẠT | Frontend phụ thuộc vào Bootstrap và không đưa thêm Tailwind hoặc CSS-in-JS |
| Vị trí CSS tùy chỉnh | **KHÔNG ĐẠT** | CSS của tính năng nằm tại `frontend/src/features/global-assistant/globalAssistant.css`, trong khi Hiến chương yêu cầu CSS tùy chỉnh nằm tại `frontend/src/styles/custom.css` |
| React 18 là bất biến | **KHÔNG ĐẠT** | `frontend/package.json` dùng React/ReactDOM `19.2.6`; không có RFC đã được phê duyệt nào được tham chiếu |
| Bao phản hồi API `{success,data,error,meta}` | **KHÔNG ĐẠT** | Bộ điều khiển/lịch sử/trạng thái của trợ lý trả về nhiều cấu trúc phản hồi phẳng; cơ chế giới hạn tần suất dùng một cấu trúc khác |
| Xử lý lỗi tập trung và bộ ghi log (logger) của dự án | **KHÔNG ĐẠT** | `assistant.controller.js` bắt lỗi cục bộ và dùng `console.error`; bộ phân loại phạm vi cũng ghi log bằng `console.error` |
| Xác thực/vai trò thông qua middleware | **KHÔNG ĐẠT** | Các bước kiểm tra xác thực và vai trò của trợ lý được triển khai trực tiếp trong `assistant.controller.js`, không dùng middleware xác thực dùng chung |
| Tối đa 40 dòng/hàm và 300 dòng/tệp | **KHÔNG ĐẠT** | `assistant.service.js`, `assistant.repository.js`, `assistant.context.js` và `ai.service.js` vượt quá giới hạn đã khóa |
| Kiểm thử tích hợp cho endpoint được bảo vệ | **MỘT PHẦN** | Đã có độ bao phủ ở mức kiểm thử đơn vị (unit); kiểm thử tích hợp rõ ràng cho giới hạn tần suất/trạng thái và HTTP E2E có xác thực vẫn còn mở |
| Tối thiểu 80% độ bao phủ service/nghiệp vụ và unit test cho các hàm service/query | **CHƯA XÁC MINH** | Các bộ kiểm thử tập trung đều đạt, nhưng chưa tạo báo cáo độ bao phủ và số lượng bài đạt không chứng minh được ngưỡng của Hiến chương |
| Cách đặt tên nhánh và tạo tác (artifact) đặc tả | **KHÔNG ĐẠT** | Nhánh hiện tại `feature-global-ielts-virtual-assistant/Datnt` không theo dạng `feat/...` hoặc `spec/...`; Speckit dùng `spec.md` thay vì quy ước `[name].spec.md` của Hiến chương |
| Áp dụng migration trước khi phụ thuộc vào tính bền vững dữ liệu | **ĐANG CHỜ** | Tệp migration đã tồn tại; việc áp dụng trên môi trường thật và xác minh `preferred_address` vẫn còn mở |

## Cấu trúc dự án

### Tài liệu (tính năng này)

```text
.sdd/specs/global-ielts-virtual-assistant/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── assistant-api.md
│   └── assistant.openapi.yaml
├── tasks.md
├── checklist.md
├── CONTEXT.md
├── eval-set.md
├── production-test-suite.md
├── RFC.md
└── archive/
    └── implementation-approach.legacy.md
```

`research.md`, `data-model.md`, `contracts/` và `quickstart.md` là đầu ra Giai đoạn
0/1 theo Speckit. RFC, bản ghi đánh giá và kho lưu trữ cũ là tài liệu giải thích/QA bổ
sung; `production-test-suite.md` là hợp đồng hành vi mở rộng. Các snapshot cũ trong
`eval-set.md` không được dùng làm kết quả hiện hành.

### Mã nguồn (thư mục gốc của kho mã)

```text
backend/
├── src/
│   ├── api/assistant/
│   │   ├── assistant.constants.js
│   │   ├── assistant.context.js
│   │   ├── assistant.controller.js
│   │   ├── assistant.guardrails.js
│   │   ├── assistant.intent.js
│   │   ├── assistant.knowledge-base.js
│   │   ├── assistant.knowledge-retriever.js
│   │   ├── assistant.link-builder.js
│   │   ├── assistant.lookup-parser.js
│   │   ├── assistant.memory.js
│   │   ├── assistant.prompts.js
│   │   ├── assistant.repository.js
│   │   ├── assistant.response.js
│   │   ├── assistant.responses.js
│   │   ├── assistant.routes.js
│   │   ├── assistant.scope-classifier.js
│   │   ├── assistant.selfcheck.js
│   │   ├── assistant.service.js
│   │   ├── assistant.user-resolver.js
│   │   ├── assistant.validation.js
│   │   └── knowledge-base/
│   │       ├── registry.json
│   │       └── 9 tệp nội dung JSON
│   ├── services/
│   │   ├── ai.service.js
│   │   └── aiUsage.service.js
│   └── db/migrations/
│       └── 024_create_chatbot_history_tables.sql
└── tests/unit/
    ├── api/assistant.*.test.js
    └── services/{ai.service,aiUsage.service}.test.js

frontend/
├── src/
│   ├── App.jsx
│   └── features/global-assistant/
│       ├── components/
│       │   ├── AssistantDisabledNotice.jsx
│       │   ├── ChatInputBox.jsx
│       │   ├── ChatMessageItem.jsx
│       │   ├── ChatMessageList.jsx
│       │   ├── GlobalAssistantButton.jsx
│       │   ├── GlobalAssistantPanel.jsx
│       │   └── LoginRequiredPrompt.jsx
│       ├── hooks/useAssistantAvailability.js
│       ├── services/assistantApi.js
│       └── globalAssistant.css
└── tests/
    ├── components/global-assistant/
    └── services/assistantApi.test.js
```

**Quyết định cấu trúc**: Giữ các mô-đun HTTP/chuỗi xử lý của trợ lý trong `backend/src/api/assistant/`, các mối quan tâm về nhà cung cấp/mức sử dụng trong các dịch vụ backend dùng chung và tiện ích trong một thư mục tính năng frontend. Công việc tài liệu này không bổ sung kiến trúc mới hoặc tạo bảng chatbot trùng lặp.

## Các quyết định thiết kế theo hiện trạng

### Xác thực và tiền kiểm

- Việc xác thực nội dung yêu cầu (payload) trò chuyện hiện chạy trước bước xác thực danh tính.
- Bộ điều khiển (controller) đọc `accessToken` hoặc `access_token`, xác minh mã truy cập, tùy chọn kiểm tra thu hồi trên Redis khi Redis sẵn sàng, xác nhận phiên cơ sở dữ liệu đang hoạt động, chặn `must_change_password` và yêu cầu vai trò `student`.
- Các rào chắn chạy qua `preflightChatPayload` trước khi phân giải cuộc trò chuyện và trước khi gửi tiêu đề phản hồi SSE.
- Quyết định chặn lúc làm bài dựa trên `context.pageType` do phía máy khách (client) cung cấp và đã qua xác thực; tính năng này không tra cứu lượt làm bài đang hoạt động ở phía máy chủ.

### Ý định (intent) và ngữ cảnh

- Có 12 hằng số ý định được khai báo, nhưng định tuyến xác định trước không tạo ra đủ cả 12. `GENERAL_STUDY_TIPS` và `GRADING_REQUEST_SAFE_FEEDBACK` hiện không thể được trả về từ `detectIntent`; `WEBSITE_HELP` có thể bắt nguồn từ đầu ra của bộ phân loại.
- Ý định chưa xác định có thể gọi bộ phân loại LLM có giới hạn, kèm cuộc trò chuyện gần đây không đáng tin cậy và các gợi ý định tuyến.
- Bộ nhớ định tuyến của phiên lưu các tin nhắn gần đây cùng ý định (intent) trước đó được suy luận, kỹ năng và các chủ đề đã chọn. Bộ nhớ này không lưu loại/ID tài nguyên thư viện trước đó hoặc ID lượt làm bài cần xem lại dưới dạng ô dữ liệu (slot) có cấu trúc.
- Thao tác đặt/nhắc lại/xóa cách xưng hô ưu tiên dùng lối tắt và trả về công khai ý định `IELTS_KNOWLEDGE`, còn chế độ nội bộ cuối cùng là `preference_memory`.

### Dữ liệu nền và phương án dự phòng

- FIND_TEST đọc các bài thi đã xuất bản trong `mock_tests`; FIND_LESSON đọc các tài nguyên đã xuất bản trong `library_resources`; POST_TEST_REVIEW đọc một lượt làm bài đã nộp thuộc quyền sở hữu cùng dữ liệu câu hỏi/câu trả lời.
- Việc lọc từ khóa tra cứu được đưa vào SQL trước `ORDER BY/LIMIT`, sau đó mới xếp hạng và giới hạn số mục hiển thị.
- Đầu ra tra cứu trống, chung chung hoặc không nhắc tới tiêu đề được trả về sẽ được thay bằng phản hồi tất định dựa trên dữ liệu nền.
- Lời gọi kiến thức chỉ có thể thử lại một lần ở chế độ văn bản thuần sau khi nhận phản hồi kiến thức không hợp lệ. Lỗi nhà cung cấp/cấu hình đi thẳng tới phương án dự phòng tất định.
- Phương án dự phòng tất định có các nhánh rõ ràng cho Skimming, Scanning, kết hợp Skimming/Scanning, tổng quan Writing Task 1, Speaking Part 2 và Reading. Không có nhánh dành riêng cho Listening.

### Lưu dữ liệu và truyền luồng

- Việc tra cứu phiên ưu tiên cuộc trò chuyện đang hoạt động thuộc quyền sở hữu có tin nhắn được gửi gần đây nhất.
- Việc chèn tin nhắn dùng `INSERT ... SELECT` với các điều kiện về chủ sở hữu và phiên đang hoạt động.
- Lịch sử trả về tối đa 100 tin nhắn từ một cuộc trò chuyện đang hoạt động thuộc quyền sở hữu theo thứ tự thời gian.
- Các thao tác của lớp truy cập dữ liệu (repository) được thực hiện theo cơ chế nỗ lực tối đa khi cột/bảng của lược đồ (schema) cũ không tồn tại; vì vậy, áp dụng migration là điều kiện triển khai tiên quyết để bảo đảm tính bền vững dữ liệu.
- Luồng từ nhà cung cấp được tiêu thụ nội bộ. Ứng dụng cố gắng lưu kết quả hoàn chỉnh theo cơ chế nỗ lực tối đa trước khi phát `assistant.start`, một `assistant.delta` chứa toàn bộ câu trả lời và `assistant.done`; lỗi lưu dữ liệu có thể khiến ID tin nhắn là null nhưng không ngăn việc trả câu trả lời an toàn.
- Bộ phân tích ở trình duyệt xử lý được khung dữ liệu cuối không có dòng trống kết thúc và tránh tự động thử lại JSON, nhưng chưa phải bộ phân tích SSE tổng quát hỗ trợ nhiều dòng/CRLF.

## Theo dõi độ phức tạp

| Sai lệch | Lý do tồn tại trong mã nguồn hiện tại | Việc cần làm tiếp theo |
|---|---|---|
| React 19 so với React 18 đã khóa | Các phụ thuộc frontend được nâng cấp nhưng không tham chiếu sửa đổi Hiến chương | Nhóm cần quyết định: cập nhật RFC/Hiến chương đã được phê duyệt hoặc hạ phiên bản phụ thuộc |
| CSS tùy chỉnh đặt trong thư mục tính năng | Kiểu hiển thị (style) được đặt cùng trợ lý thay vì trong một stylesheet CSS tùy chỉnh duy nhất theo Hiến chương | Chuyển các quy tắc sang stylesheet bắt buộc hoặc phê duyệt RFC thay đổi quy ước |
| Nhiều cấu trúc phản hồi trợ lý | Bộ điều khiển riêng của tính năng phát triển độc lập với bao phản hồi API toàn cục | Xác định một hợp đồng trợ lý tương thích ngược, sau đó bổ sung kiểm thử hợp đồng |
| Xác thực và xử lý lỗi trực tiếp trong bộ điều khiển | Bộ điều khiển của trợ lý lặp lại các mối quan tâm của route được bảo vệ | Chuyển sang luồng middleware/xử lý lỗi dùng chung mà không thay đổi ngữ nghĩa phân quyền |
| Các tệp điều phối/lớp truy cập dữ liệu quá lớn | Tính năng tích lũy định tuyến, phương án dự phòng, lưu dữ liệu và theo dấu (tracing) trong một số ít mô-đun | Tái cấu trúc phía sau các bài kiểm thử hiện có; không đưa thêm lớp trừu tượng (abstraction) mới khi chưa có nhiệm vụ xác định phạm vi |
| Chưa chứng minh cổng độ bao phủ | Các bộ kiểm thử tập trung đạt cung cấp bằng chứng hồi quy nhưng không có tỷ lệ phần trăm/danh mục hàm | Tạo báo cáo độ bao phủ và khép các khoảng trống service/query trước khi coi cổng Hiến chương là đạt |
| Tên nhánh/đặc tả hiện tại khác quy ước quản trị | Tính năng có trước đợt chuẩn hóa Speckit hiện tại và dùng tạo tác `spec.md` cố định của Speckit | Nhóm cần quyết định: đồng bộ tên trong một thay đổi phối hợp hoặc phê duyệt ngoại lệ quy ước có tài liệu |
| Cơ chế truyền luồng giả lập chỉ phát phản hồi cuối | Ứng dụng ưu tiên chuẩn hóa/tự kiểm tra và lưu dữ liệu trước khi gửi tới trình duyệt | Chỉ bổ sung truyền từng `token` sau khi xác định ngữ nghĩa lỗi một phần và lưu dữ liệu |
| Thiếu các ô dữ liệu (slot) theo dõi có cấu trúc | Bộ nhớ định tuyến theo dõi ý định/kỹ năng/chủ đề nhưng không theo dõi loại/ID tài nguyên hoặc ID lượt làm bài | Chỉ bổ sung nếu hành vi sản phẩm cần các lượt hỏi tiếp đó; phải bao phủ trường hợp quyền sở hữu và ngữ cảnh cũ |

## Chiến lược xác thực

1. Xác thực rằng toàn bộ 561 ID trong bộ kiểm thử production là duy nhất, liên tục và mỗi dòng có tám cột.
2. Đối chiếu mọi hành vi mới được ghi nhận với hàm hoặc bài kiểm thử sở hữu hành vi đó, đặc biệt là intent tùy chọn xưng hô, phân giải tên, cấu hình nhà cung cấp, quyền sở hữu cuộc trò chuyện và thứ tự SSE.
3. Chạy các bài kiểm thử tập trung cho trợ lý/nhà cung cấp/mức sử dụng ở backend mà không gọi mạng thật hoặc ghi cơ sở dữ liệu.
4. Chạy ba tệp kiểm thử frontend tập trung cho trợ lý.
5. Chạy ESLint tập trung cho trợ lý, bản dựng (build) production của frontend, kiểm tra cú pháp backend, kiểm tra tính nhất quán Markdown và `git diff --check`.
6. Không chạy migration 024, kiểm thử nhanh có xác thực trên môi trường thật hoặc lời gọi nhà cung cấp thật khi chưa có ủy quyền riêng cho môi trường.

## Kết quả kiểm chứng — test/lint cập nhật 2026-07-22

- Jest tập trung cho backend ngày 2026-07-22: ĐẠT — 15 bộ kiểm thử, 265 bài kiểm thử, 0 bỏ qua, 0 thất bại.
- Vitest tập trung cho frontend ngày 2026-07-22: ĐẠT — 3 tệp, 7 bài kiểm thử, 0 bỏ qua, 0 thất bại.
- ESLint tập trung cho trợ lý ở frontend ngày 2026-07-22: ĐẠT.
- Bản dựng (build) production của frontend ngày 2026-07-22: ĐẠT với Vite 8.0.16; bundle JavaScript 2.886,27 kB (gzip 814,40 kB) vẫn có cảnh báo không chặn về kích thước phân đoạn (chunk).
- Xác thực cú pháp backend ngày 2026-07-22: ĐẠT cho toàn bộ 22 tệp JavaScript của trợ lý/AI dùng chung.
- ESLint tập trung cho trợ lý ở backend hiện đã chạy được vì `@eslint/js` đã có; lần đối chiếu 2026-07-22 còn 1 lỗi `no-useless-escape` tại `backend/src/api/assistant/assistant.response.js:24`, nên cổng lint vẫn CHƯA ĐẠT.
- Khả năng truy vết chéo giữa các tạo tác (artifact): ĐẠT — toàn bộ 28 yêu cầu chức năng và 8 tiêu chí thành công được ánh xạ tới một hoặc nhiều nhiệm vụ trong tổng số 61 nhiệm vụ, không còn mâu thuẫn hành vi chưa giải quyết giữa đặc tả/kế hoạch/nhiệm vụ. Cổng Hiến chương được liệt kê riêng vẫn KHÔNG ĐẠT.
- Kiểm tra hợp đồng tài liệu: ĐẠT — 561 trường hợp production duy nhất và liên tục trong 21 nhóm, 61 nhiệm vụ duy nhất, 30 mục trong danh sách kiểm tra (checklist) duy nhất, không còn chỗ giữ chỗ (placeholder) của mẫu và tất cả đường dẫn được tham chiếu bởi nhiệm vụ đã hoàn thành đều tồn tại. Thư mục đích của T060 đang mở là `backend/tests/integration/assistant/` chưa tồn tại; đích `frontend/src/styles/custom.css` bắt buộc theo Hiến chương cũng chưa tồn tại và đã được ghi nhận ở trên như một sai lệch.
- Việc áp dụng migration 024, kiểm thử nhanh HTTP có xác thực/cơ sở dữ liệu thật/nhà cung cấp thật và PM-01–PM-18 vẫn CHƯA CHẠY vì cần quyền môi trường và thông tin xác thực.
