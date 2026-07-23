# Nghiên cứu kỹ thuật: Trợ lý ảo IELTS toàn cục

**Tính năng**: [spec.md](./spec.md)

**Ngày đối chiếu**: 2026-07-22

**Trạng thái**: Hoàn tất nghiên cứu theo hiện trạng mã nguồn; không còn điểm cần làm rõ chưa được xử lý

## Mục tiêu nghiên cứu

Tài liệu này là đầu ra Giai đoạn 0 của Speckit. Các quyết định bên dưới được rút ra từ
mã nguồn hiện tại; chúng mô tả chính xác hệ thống đang chạy, đồng thời tách riêng các
sai lệch Hiến chương chưa được khắc phục.

## R01 — Ranh giới giữa chatbot và AI chấm nhanh

**Quyết định**: Chatbot độc lập về nghiệp vụ, API và dữ liệu kết quả với AI chấm
Writing/Speaking. Hai tính năng dùng chung `backend/src/services/ai.service.js` để gọi
nhà cung cấp và `ai_usage_logs` để lưu siêu dữ liệu sử dụng.

**Lý do**: Chatbot nhận tin nhắn/ngữ cảnh trang và trả văn bản/liên kết; AI chấm nhanh
nhận bài nộp và trả báo cáo band. Chatbot không đọc/ghi `ai_grading_reports` và có rào
chắn cấm band điểm cá nhân.

**Phương án đã cân nhắc**:

- Tách hoàn toàn cả cổng nhà cung cấp và bảng nhật ký: tăng mã trùng lặp, không phản
  ánh code hiện tại.
- Dùng chung báo cáo chấm điểm: sai ranh giới nghiệp vụ và tạo nguy cơ chatbot làm lộ
  kết quả chấm.

## R02 — Hợp đồng HTTP hiện hành

**Quyết định**: Dùng `/api/v1/assistant` làm tiền tố chính của frontend; giữ
`/api/assistant` là bí danh tương thích. Năm endpoint hiện có là `POST /chat`,
`POST /chat/stream`, `GET /history`, `GET /status` và
`POST /messages/{messageId}/rating`.

**Lý do**: Cả hai tiền tố cùng gắn một router trong `backend/src/app.js` và
`backend/src/routes/api/v1/index.js`; frontend gọi tiền tố `/api/v1` qua dịch vụ API
dùng chung.

**Phương án đã cân nhắc**:

- Chỉ tài liệu hóa `/api/assistant`: không đúng đường gọi của frontend.
- Xóa ngay bí danh cũ: là thay đổi code có thể phá tương thích, ngoài phạm vi chuẩn
  hóa tài liệu.

**Khoảng trống production**: JSON hiện là các object phẳng; lỗi giới hạn tần suất lại
có dạng `{success,error}`. Chúng chưa tuân bao `{success,data,error,meta}` của Hiến
chương. T057 vẫn mở để thiết kế chuyển đổi tương thích ngược và kiểm thử hợp đồng.

## R03 — Truyền phản hồi bằng SSE

**Quyết định**: Mô tả SSE theo đúng hiện trạng: hệ thống hoàn tất gọi nhà cung cấp,
chuẩn hóa, tự kiểm tra và cố gắng lưu trước; sau đó phát `assistant.start`, đúng một
`assistant.delta` chứa toàn bộ câu trả lời và `assistant.done`. Lỗi sau khi đã gửi
header được phát qua `assistant.error`.

**Lý do**: `assistant.service.js` không chuyển tiếp từng token tới trình duyệt. Mô tả
“stream từng token” sẽ sai với code và làm sai kịch bản kiểm thử.

**Phương án đã cân nhắc**:

- Gọi đây là token streaming: bị loại vì không đúng triển khai.
- Bỏ SSE và chỉ dùng JSON: bị loại vì frontend đang ưu tiên endpoint stream.

**Khoảng trống production**: truyền từng token, ngữ nghĩa hủy/ngắt kết nối và bộ phân
tích SSE nhiều dòng/CRLF thuộc T059, chưa hoàn thành.

## R04 — Xác thực và quyền sở hữu

**Quyết định**: Mọi endpoint đều yêu cầu cookie `accessToken` hoặc `access_token`, JWT
hợp lệ, phiên CSDL đang hoạt động, không bị thu hồi trên Redis khi Redis sẵn sàng,
không bị bắt đổi mật khẩu và có vai trò `student`. Quyền sở hữu cuộc trò chuyện và
lượt làm bài luôn lấy từ người dùng đã xác thực.

**Lý do**: Đây là chuỗi kiểm tra thực trong `assistant.controller.js` và các truy vấn
tham số hóa trong `assistant.repository.js`/`assistant.context.js`.

**Phương án đã cân nhắc**:

- Nhận `userId` từ body: bị loại vì vi phạm bảo mật.
- Mô tả middleware dùng chung như đã có: bị loại vì code đang kiểm tra trực tiếp trong
  controller.

**Khoảng trống production**: xác thực/xử lý lỗi chưa đi qua middleware và error handler
dùng chung; chưa có HTTP E2E dùng cookie thật (T057, T060).

## R05 — Kiến trúc trả lời kết hợp

**Quyết định**: Dùng định tuyến tất định, kho kiến thức JSON tĩnh, SQL có kiểm soát và
nhà cung cấp AI theo từng intent. Các nhánh tức thời/phương án dự phòng có thể trả lời
không gọi AI; phản hồi nhà cung cấp phải được chuẩn hóa và tự kiểm tra.

**Lý do**: Dữ liệu nền tảng có cấu trúc nằm trong PostgreSQL, còn các chủ đề IELTS phổ
biến có tập JSON được quản lý phiên bản. Cách này giảm nguy cơ bịa đề, liên kết và đáp
án.

**Phương án đã cân nhắc**:

- RAG vector/embedding: không cần cho phạm vi hiện tại và làm tăng hạ tầng.
- Cho mô hình tự tìm/đặt liên kết: bị loại vì không có dữ liệu nền xác thực.
- Tự động chuyển nhà cung cấp khi lỗi: bị loại; code chỉ dùng nhà cung cấp đã cấu hình.

## R06 — Cấu hình nhà cung cấp

**Quyết định**: Chatbot dùng `AI_PROVIDER` và `AI_MODEL`; có thể chọn Gemini hoặc
OpenAI. Với Gemini, khóa được đọc theo thứ tự `GEMINI_API_KEY`,
`GOOGLE_AI_API_KEY`, `GOOGLE_API_KEY`; với OpenAI dùng `OPENAI_API_KEY`. Các biến
`AI_GRADING_PROVIDER`/`AI_GRADING_MODEL` không điều khiển chatbot.

Model chuyên biệt `GEMINI_MODEL` hoặc `OPENAI_MODEL` được ưu tiên trước `AI_MODEL`
cho provider tương ứng; nếu không cấu hình model hợp lệ, code dùng model mặc định của
provider.

**Lý do**: Đây là thứ tự và ranh giới cấu hình trong `ai.service.js`.

**Phương án đã cân nhắc**:

- Dùng chung biến model với AI chấm nhanh: bị loại vì hai feature có vòng đời và hạn
  mức khác nhau.
- Ghi khóa cụ thể vào tài liệu: bị loại vì vi phạm bảo mật.

## R07 — Mô hình lưu trữ

**Quyết định**: Migration 024 là nguồn schema cho `chatbot_sessions` và
`chatbot_messages`; migration 022 là nguồn schema dùng chung cho `ai_usage_logs`.
Không tạo thêm bảng riêng cho chatbot.

**Lý do**: Hai bảng chatbot đã đủ cho phiên, cách xưng hô, lịch sử và đánh giá. Nhật ký
AI chỉ lưu metadata, không lưu prompt/câu trả lời.

**Phương án đã cân nhắc**:

- Tạo bảng preference/rating riêng: dư thừa so với các cột hiện có.
- Lưu hội thoại trong `ai_usage_logs`: sai mục đích và làm lẫn dữ liệu nội dung với
  telemetry.

**Khoảng trống production**: repository có cơ chế tương thích schema cũ và bỏ qua lưu
khi schema thiếu. Vì vậy migration 024 phải được áp dụng/xác minh trên từng môi trường
trước khi cam kết tính bền vững (T058).

## R08 — Dữ liệu nền và giới hạn

**Quyết định**: Tra cứu chính trong `assistant.context.js` chỉ đọc bài thi/tài nguyên
đạt điều kiện công bố mà schema cung cấp (`is_published = TRUE` hoặc cột tương đương,
và `review_status = 'approved'` nếu tồn tại). Xem lại bài chỉ đọc `test_attempts` có
`user_id` đúng người dùng và `submitted_at` khác null, sau đó nối
`question_answers`/`questions`.

**Lý do**: Đây là điều kiện SQL của pipeline đang được `assistant.service.js` sử dụng;
mọi giá trị người dùng được truyền bằng tham số vị trí.

**Phương án đã cân nhắc**:

- Dùng các mục đang nhìn thấy trên frontend làm nguồn sự thật: bị loại; chúng chỉ là
  ngữ cảnh không đáng tin cậy.
- Cho phép đọc bài chưa nộp hoặc bài người khác: bị loại vì quyền riêng tư và chống
  gian lận.

## R09 — Cổng xác minh hiện hành

**Quyết định**: Ghi nhận riêng bằng chứng tự động và bằng chứng môi trường. Đường cơ sở
ngày 2026-07-22 là backend 15 bộ/265 ca đạt, frontend 3 tệp/7 ca đạt. Backend lint còn
1 lỗi `no-useless-escape`; migration thật, HTTP E2E thật, nhà cung cấp thật và
PM-01–PM-18 chưa chạy.

**Lý do**: Số ca unit test đạt không chứng minh coverage 80%, tính đúng của migration
trên từng môi trường hoặc hành vi nhà cung cấp thực.

**Phương án đã cân nhắc**:

- Dùng snapshot cũ trong `eval-set.md` làm kết quả hiện hành: bị loại vì số lượng đã
  thay đổi và các ca thủ công vẫn đang chờ.
- Đánh dấu feature production-ready: bị loại vì T056–T061 và các cổng Hiến chương còn
  mở.

## Kết luận Giai đoạn 0

Không còn quyết định kỹ thuật chưa rõ cần hỏi thêm để tài liệu hóa hiện trạng. Các
nội dung chưa hoàn tất đều là công việc triển khai/xác minh đã được giữ mở trong
[tasks.md](./tasks.md), không phải giả định ngầm.
