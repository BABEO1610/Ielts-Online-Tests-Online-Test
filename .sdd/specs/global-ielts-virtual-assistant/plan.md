# Kế hoạch triển khai: Trợ lý ảo IELTS toàn cục

**Đặc tả**: [spec.md](./spec.md)
**Trạng thái**: Đường cơ sở HIỆN CÓ với gia cố MỤC TIÊU; không tuyên bố sẵn sàng production

## 1. Tóm tắt

Trợ lý là tính năng dành cho học viên đã xác thực để giải đáp IELTS/tiếng Anh, điều hướng, khám phá nội dung đã công bố, và xem lại bài thi đã nộp thuộc sở hữu. Pipeline hiện tại kết hợp phản hồi xác định với ngữ cảnh CSDL/tĩnh có kiểm soát và ngôn ngữ tạo bởi nhà cung cấp. Kế hoạch này ghi nhận triển khai như đã tìm thấy, tách riêng các mục tiêu chưa xây dựng, và hợp nhất các quyết định liên quan từ `CONTEXT.md`, `research.md`, `data-model.md`, `quickstart.md`, và hợp đồng API dạng prose.

## 2. Bối cảnh kỹ thuật

| Lĩnh vực | Bằng chứng hiện tại |
|---|---|
| Backend | Module Node.js/Express trong `backend/src/api/assistant/` |
| AI dùng chung | `backend/src/services/ai.service.js`, `backend/src/services/aiUsage.service.js` |
| Lưu trữ | Truy vấn PostgreSQL trong `assistant.repository.js`; schema trong migration `024_create_chatbot_history_tables.sql` |
| Kiến thức | JSON có quản lý phiên bản trong `backend/src/api/assistant/knowledge/` |
| Frontend | Widget React trong `frontend/src/features/global-assistant/` |
| Kiểm thử | Kiểm thử Jest backend, Vitest frontend, và `backend/scripts/eval-assistant.js` |
| Hợp đồng | `contracts/assistant.openapi.yaml`; không tìm thấy consumer tự động trực tiếp trong đợt đánh giá này |

Dependency frontend đã kiểm tra dùng React 19 và Vite 8. Điều này khác với đường cơ sở React 18 của Hiến chương và cần cập nhật Hiến chương rõ ràng hoặc quyết định tương thích; không được ngầm coi là tuân thủ.

## 3. Kiểm tra Hiến chương

| Nguyên tắc | Đánh giá |
|---|---|
| Bảo mật/quyền riêng tư | MỘT PHẦN: xác thực và lọc chủ sở hữu đã có; trạng thái đang thi khai báo bởi client không phải kiểm tra server có thẩm quyền. |
| Nhất quán API | MỘT PHẦN: phản hồi trợ lý và xác thực thủ công chưa dùng thống nhất quy ước bao/middleware dùng chung. |
| Kiểm thử trước/coverage | MỘT PHẦN: kiểm thử tập trung đã có; phần trăm coverage bắt buộc và bằng chứng smoke production chưa được chứng minh. |
| Migration CSDL | MỘT PHẦN: migration 024 đã tồn tại; sự có mặt trong repository không chứng minh đã áp dụng trên môi trường. |
| Đơn giản | ĐẠT cho thiết kế không-vector hiện tại; kiến thức tĩnh và SQL tham số hóa rõ ràng. |

Cổng phát hành vẫn mở cho ngữ nghĩa hạn mức hàng ngày, lưu giữ/vòng đời, bền vững cặp tin nhắn, thực thi bài thi đang hoạt động phía server, trợ năng, xác minh migration, và xác minh timeout nhà cung cấp.

## 4. Kiến trúc hiện có

```text
GlobalAssistantPanel / assistantApi
  -> /api/v1/assistant (cũng được gắn tại /api/assistant)
  -> assistant.routes.js (giới hạn tần suất trên chat/stream)
  -> assistant.controller.js (kiểm tra cookie/phiên/học viên)
  -> assistant.validation.js + assistant.guardrails.js
  -> assistant.service.js
       -> assistant.intent.js
       -> assistant.context.js
            -> assistant.repository.js (ngữ cảnh SQL đã công bố/thuộc sở hữu)
            -> knowledge/*.json (ngữ cảnh tĩnh có phiên bản)
       -> assistant.memory.js + assistant.prompts.js
       -> ai.service.js khi cần ngôn ngữ tạo
       -> assistant.response.js + assistant.selfcheck.js
       -> lưu tin nhắn nỗ lực tối đa + metadata aiUsage.service.js
  -> phản hồi JSON cuối cùng hoặc SSE start/full delta/done
```

## 5. Luồng yêu cầu và dữ liệu

1. Route áp dụng bộ giới hạn trợ lý cho JSON chat và SSE stream.
2. Controller phân giải cookie truy cập, trạng thái phiên/thu hồi đang hoạt động, trạng thái đổi mật khẩu, và vai trò `student`.
3. Xác thực trim và giới hạn tin nhắn 2.000 ký tự và chuẩn hóa ngữ cảnh trang/cuộc trò chuyện.
4. Rào chắn có thể trả từ chối xác định trước khi tạo phiên, lưu trữ, hoặc công việc nhà cung cấp.
5. Service phân giải cuộc trò chuyện đang hoạt động thuộc sở hữu, áp dụng thao tác tùy chọn hoặc định tuyến ý định, rồi tải bộ nhớ giới hạn và ngữ cảnh có kiểm soát.
6. Đường xác định trả lời trực tiếp. Đường được hỗ trợ khác gọi gateway AI đã cấu hình và xác thực/tự kiểm tra đầu ra.
7. Trên các đường thất bại nhà cung cấp/xác thực được hỗ trợ, trả dự phòng xác định.
8. Tin nhắn người dùng và trợ lý được chèn là hai thao tác nỗ lực tối đa riêng biệt. Do đó phản hồi có thể thành công mà không có lịch sử bền vững hay mã tin nhắn trợ lý.
9. JSON trả đối tượng cuối cùng. SSE hiện đệm toàn bộ câu trả lời và phát một `assistant.delta`, không phải streaming từng token.

## 6. Tóm tắt hợp đồng API

| Phương thức/đường dẫn dưới cả hai mount trợ lý | Mục đích | Ràng buộc chính hiện tại |
|---|---|---|
| `POST /chat` | Phản hồi JSON cuối cùng | xác thực học viên; tối đa 2.000 ký tự; 30/IP/phút |
| `POST /stream` | Phản hồi cuối cùng tương thích SSE | cùng xác thực; start, một full-answer delta, done/error |
| `GET /history` | Lịch sử cuộc trò chuyện thuộc sở hữu | phiên đang hoạt động thuộc chủ sở hữu; 100 gần nhất theo thời gian |
| `POST /messages/:messageId/rating` | Đánh giá tin nhắn trợ lý | tin nhắn trợ lý thuộc sở hữu; `up`/`down`; cho phép cập nhật |
| `GET /status` | Khả dụng tối giản | học viên đã xác thực; không nhà cung cấp/mô hình/khóa/cấu hình |

`contracts/assistant.openapi.yaml` được giữ tạm thời là hợp đồng máy đọc được.

## 7. Tóm tắt mô hình dữ liệu

Migration `backend/src/db/migrations/024_create_chatbot_history_tables.sql` định nghĩa mô hình lịch sử phiên/tin nhắn chatbot, chỉ mục, trường cách xưng hô, trường đánh giá, và dấu thời gian vòng đời. Truy vấn repository bổ sung đọc bài thi/tài liệu đã công bố và bài thi đã nộp/câu hỏi thuộc sở hữu.

| Thực thể | Quy tắc sở hữu/toàn vẹn quan trọng |
|---|---|
| `chatbot_sessions` | Thuộc một học viên; trạng thái đang hoạt động/đã đóng; cách xưng hô thuộc phạm vi tại đây. |
| `chatbot_messages` | Thuộc một phiên; vai trò phân biệt người dùng/trợ lý; trường đánh giá áp dụng cho tin nhắn trợ lý. |
| bài thi/tài liệu đã công bố | Chỉ đủ điều kiện qua trường công bố/phê duyệt được nhận dạng. |
| ngữ cảnh bài thi đã nộp | Yêu cầu quyền sở hữu người yêu cầu và trạng thái nộp non-null. |
| nhật ký sử dụng AI | Metadata vận hành giới hạn; không phải nội dung prompt/câu trả lời thô. |

Hai lần chèn tin nhắn hiện không nguyên tử. Lưu giữ, xóa/xuất, hành vi đóng/mở lại, và độ dài `rating_reason` vẫn chưa giải quyết.

## 8. Máy trạng thái

```text
Yêu cầu
  -> rejected_auth | rejected_validation | rejected_guardrail
  -> accepted
       -> deterministic_final
       -> provider_pending -> validated_final
                           -> deterministic_fallback | controlled_error

Cuộc trò chuyện: chưa có -> đang hoạt động -> đã đóng
                               ^
                               | service hiện có thể chọn/tạo phiên đang hoạt động khác

Lưu trữ mỗi lượt được chấp nhận (hiện tại):
  không có -> user_saved -> assistant_saved
           \-> response_returned_without_complete_pair
```

Chuyển trạng thái đóng/mở lại/xóa cuộc trò chuyện chưa phải vòng đời hoàn chỉnh cho người dùng ngày hôm nay.

## 9. Thiết kế bảo mật và quyền riêng tư

- Mọi thao tác phân giải danh tính học viên đã xác thực; đọc/ghi repository bao gồm điều kiện chủ sở hữu.
- Rào chắn từ chối chấm điểm/dự đoán band cá nhân, khai báo đang thi, trích xuất prompt/cấu hình, bịa nội dung chính thức, và yêu cầu dữ liệu riêng tư/chưa công bố/chéo chủ sở hữu.
- Tra cứu đã công bố có căn cứ server; mục hiển thị trên client không phải bằng chứng công bố có thẩm quyền.
- Xem lại bài thi kiểm tra cả quyền sở hữu bài và trạng thái đã nộp.
- Trạng thái cố ý tối giản. Lỗi nhà cung cấp phải được chuẩn hóa thay vì trả thô.
- Ngăn chặn đang thi hiện chưa hoàn chỉnh vì server tin tưởng `context.pageType`; công việc MỤC TIÊU phải truy vấn trạng thái bài thi đang hoạt động có thẩm quyền.
- Nhật ký/đo lường phải giảm thiểu PII và loại trừ prompt, câu trả lời, thông tin xác thực, và cấu hình nội bộ.

## 10. Chiến lược nhà cung cấp và dự phòng

Xử lý xác định được ưu tiên cho từ chối rào chắn, lời chào/tùy chọn, điều hướng, làm rõ, thiếu ngữ cảnh xem lại, và trình bày tra cứu có căn cứ. Tạo nhà cung cấp dành cho ý định được hỗ trợ cần ngôn ngữ soạn thảo. Đầu ra tạo được chuẩn hóa và tự kiểm tra. Thất bại được hỗ trợ dùng văn bản xác định có căn cứ trong ngữ cảnh đã biết; chẩn đoán nhà cung cấp thô không bao giờ là đầu ra client. Ngân sách timeout tạo trợ lý rõ ràng và kiểm thử của nó là khoảng trống MỤC TIÊU.

## 11. Chiến lược lưu trữ

- Kiến thức tĩnh vẫn là JSON có quản lý phiên bản với registry.
- Lịch sử và đánh giá cuộc trò chuyện dùng PostgreSQL sau migration 024.
- Bộ nhớ gần đây được xây dựng lại từ cuộc trò chuyện đang hoạt động thuộc sở hữu; cách xưng hô chỉ lưu trên cuộc trò chuyện đó.
- Ghi vẫn nỗ lực tối đa và độc lập. Thiết kế MỤC TIÊU nên làm cặp giao dịch hoặc cho biết bền vững rõ ràng.
- Không có vector store hay chỉ mục embedding trong tính năng này.

## 12. Thiết kế thử lại, idempotency, và đồng thời

- Thao tác HTTP chat không có khóa idempotency client; client không được tự động phát lại yêu cầu không chắc chắn.
- Frontend tránh phát lại JSON tự động sau thất bại SSE không chắc chắn.
- Đánh giá có chủ đích cho phép cập nhật; ghi hợp lệ lặp lại thay thế giá trị/lý do hiện có.
- Hạn mức hàng ngày chưa có triển khai. Tính toán MỤC TIÊU cần bộ đếm nguyên tử mỗi học viên mỗi ngày UTC và định nghĩa đã phê duyệt cho yêu cầu tính phí.
- Lưu cặp tin nhắn cần một kiểm thử giao dịch/đồng thời để ngăn lượt một phần.

## 13. Quan sát được

- Đo lường sử dụng AI dùng chung ghi metadata thời gian/token/trạng thái/lỗi giới hạn.
- Không ghi nhật ký tin nhắn thô, câu trả lời tạo, lịch sử phiên, prompt, khóa, hay cấu hình nhà cung cấp.
- Bổ sung chỉ số cho đường xác định so với nhà cung cấp, timeout/dự phòng nhà cung cấp, lớp rào chắn, từ chối giới hạn tần suất, kết quả lưu trữ, và hạn mức hàng ngày chỉ sau khi nhãn được đánh giá PII/cardinality.
- Phản hồi thành công không phải bằng chứng lưu trữ phiên/tin nhắn thành công; kết quả này cần chỉ số rõ ràng sau khi thiết kế bền vững được phê duyệt.

## 14. Chiến lược kiểm thử

- Kiểm thử unit backend: ranh giới xác thực, rào chắn, ý định/ngữ cảnh, lọc sở hữu/công bố repository, bộ nhớ/tùy chọn, phản hồi/tự kiểm tra, dự phòng service, xác thực/trạng thái/SSE controller.
- Kiểm thử tích hợp backend: migration 024, cặp tin nhắn giao dịch, kiểm tra bài thi đang hoạt động có thẩm quyền, đồng thời hạn mức hàng ngày, và từ chối chéo chủ sở hữu.
- Kiểm thử frontend: trạng thái đăng nhập/vô hiệu/lỗi, phân tích EOF SSE, hợp đồng single-delta, lịch sử/đánh giá, không phát lại không chắc chắn, và hành vi bàn phím/trình đọc màn hình.
- Kiểm thử hợp đồng: xác thực cả hai mount route và `contracts/assistant.openapi.yaml` hoặc phê duyệt một mount/đường dẫn chuẩn duy nhất.
- Đánh giá: `backend/scripts/eval-assistant.js` tiếp tục sử dụng `eval-set.md`; không gọi nhà cung cấp thật trong xác minh offline thông thường.
- Xác minh phát hành phải dùng stub nhà cung cấp offline. Kiểm thử smoke production/nhà cung cấp là hoạt động có cổng riêng biệt và chưa được chạy tại đây.

## 15. Triển khai và cấu hình

- Dependency runtime bắt buộc bao gồm hạ tầng CSDL/phiên và gateway AI dùng chung đã cấu hình cho đường tạo.
- Giới hạn tần suất hiện tại là 30 yêu cầu mỗi IP mỗi phút cho chat/stream. Hạn mức 50/học viên/ngày UTC được đề xuất chưa được cấu hình hay thực thi.
- Xác minh migration 024 trên từng môi trường mà không chạy lệnh migration phá hủy trong đánh giá tài liệu.
- Xác minh cả hai mount route trợ lý, đường dẫn cơ sở frontend, hành vi CSP/proxy SSE, và cấu hình timeout nhà cung cấp trước phát hành.
- Không tiết lộ giá trị nhà cung cấp/mô hình/khóa qua trạng thái, nhật ký, tài liệu, hoặc cấu hình client.

## 16. Khoảng trống đã biết và cổng phát hành

| Khoảng trống | Phân loại | Cổng |
|---|---|---|
| Hạn mức 50/học viên/ngày và ngữ nghĩa tính toán | TARGET + NEEDS CLARIFICATION | Giải quyết BR-CHAT-021, triển khai bộ đếm nguyên tử, kiểm thử đồng thời. |
| Kiểm tra bài thi đang hoạt động có thẩm quyền | TARGET | Truy vấn server và kiểm thử negative/phân quyền. |
| Cặp tin nhắn người dùng/trợ lý nguyên tử | TARGET | Kiểm thử giao dịch và tiêm lỗi. |
| Lưu giữ và vòng đời cuộc trò chuyện | NEEDS CLARIFICATION | Phê duyệt chính sách trước khi tuyên bố triển khai/phát hành. |
| Giới hạn `rating_reason` | NEEDS CLARIFICATION | Phê duyệt và xác thực giới hạn. |
| Timeout nhà cung cấp | TARGET | Định nghĩa ngân sách và kiểm thử dự phòng an toàn. |
| Trợ năng và ngưỡng coverage | TARGET | Cần bằng chứng tự động. |
| Migration/áp dụng và smoke nhà cung cấp | Chưa xác minh | Cần bằng chứng môi trường; chưa sẵn sàng production. |

## 17. Ánh xạ yêu cầu-thành-phần

| Nhóm yêu cầu | Thành phần |
|---|---|
| BR/FR-001..004 | `assistant.routes.js`, `assistant.controller.js`, `assistant.validation.js`, `assistant.guardrails.js`, truy vấn bài thi đang hoạt động TARGET |
| BR/FR-005..007 | `assistant.intent.js`, `assistant.context.js`, `assistant.repository.js`, JSON kiến thức |
| BR/FR-008 | `assistant.memory.js`, `assistant.repository.js` |
| BR/FR-009..011 | `assistant.service.js`, `assistant.prompts.js`, `ai.service.js`, `assistant.response.js`, `assistant.selfcheck.js` |
| BR/FR-012..013 | `assistant.repository.js`, `assistant.controller.js`, migration 024 |
| BR/FR-014..016 | `backend/src/middleware/rateLimit.js`, kho hạn mức hàng ngày TARGET, lưu trữ giao dịch TARGET |
| FR-017..018 | migration/repository/controller TARGET vòng đời và xác thực đánh giá |
| NFR-001..011 | cách ly controller/repository, đo lường, kiểm thử widget/SSE frontend, kiểm tra migration và phát hành |

## 18. Quyết định tạo vật

- Giữ `spec.md`, `plan.md`, `tasks.md`, và `checklist.md` là bộ tính năng quy chuẩn.
- Giữ `eval-set.md`: `backend/scripts/eval-assistant.js` đọc và cập nhật trực tiếp.
- Giữ tạm `contracts/assistant.openapi.yaml`: đó là hợp đồng máy đọc được khả dụng, mặc dù không tìm thấy consumer tự động trực tiếp.
- Các file đã gộp nội dung (`CONTEXT.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/assistant-api.md`) và file QA (`production-test-suite.md`) đã được xóa theo kế hoạch chuẩn hóa.
