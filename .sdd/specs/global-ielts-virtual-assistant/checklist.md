# Danh sách kiểm tra triển khai thực tế: Trợ lý ảo IELTS toàn cục

**Mục đích**: Đánh giá bảo mật, mức độ bám sát dữ liệu, hành vi AI, tính liên tục của phía giao diện, độ chính xác của tài liệu và bằng chứng phát hành dựa trên kho mã hiện tại

**Ngày tạo**: 2026-07-21

**Đặc tả**: [spec.md](./spec.md) | **Kế hoạch**: [plan.md](./plan.md) | **Nhiệm vụ**: [tasks.md](./tasks.md)

**Quy tắc trạng thái**: `[x]` nghĩa là đã tìm thấy bằng chứng trong mã nguồn/tài liệu hiện tại. `[ ]` vẫn để mở khi chưa hoàn tất việc xác thực tích hợp, môi trường thực tế hoặc phát hành.

## Bảo mật

- [x] CHK001 Tất cả tuyến của trợ lý yêu cầu mã truy cập lấy từ cookie đã được xác minh, phiên đăng nhập đang hoạt động và vai trò học viên trong `assistant.controller.js`; kế hoạch ghi nhận rằng các bước kiểm tra này được thực hiện trực tiếp thay vì qua phần mềm trung gian dùng chung.
- [x] CHK002 Việc thu hồi qua Redis được kiểm tra khi Redis sẵn sàng, phiên cơ sở dữ liệu không hoạt động bị từ chối và `must_change_password` bị chặn trước quy trình xử lý của trợ lý.
- [x] CHK003 `GET /status` được bảo vệ và phản hồi thành công chỉ chứa `code: null` cùng `status: "ok"`, không có thông tin nhà cung cấp/mô hình/khóa.
- [x] CHK004 Cả hai điểm cuối trò chuyện đều sử dụng `assistantLimiter` với giới hạn 30 yêu cầu/IP/phút trước khi bộ điều khiển thực thi.
- [x] CHK005 Khóa nhà cung cấp được giữ trong cấu hình máy chủ dựa trên biến môi trường; yêu cầu Gemini sử dụng `x-goog-api-key` và tài liệu không chứa giá trị bí mật nào.

## Các lớp bảo vệ

- [x] CHK006 Yêu cầu có ngữ cảnh đầu vào đã qua kiểm tra và khai báo `active-test` bị chặn ở bước kiểm tra trước khi tạo cuộc hội thoại, gọi nhà cung cấp, lưu dữ liệu hoặc gửi tiêu đề SSE.
- [x] CHK007 Yêu cầu chấm điểm và dự đoán band điểm Writing/Speaking cá nhân bị chặn, trong khi câu hỏi học tập/tiêu chí chung vẫn có thể nhận hỗ trợ kiến thức an toàn.
- [x] CHK008 Yêu cầu bịa bài thi chính thức, đáp án hoặc lời giải thích bị từ chối trước khi gọi nhà cung cấp và thực hiện tác vụ cơ sở dữ liệu không cần thiết.
- [x] CHK009 Yêu cầu trích xuất câu lệnh/cấu hình và yêu cầu dữ liệu chưa xuất bản, riêng tư hoặc của người dùng khác nhận phản hồi từ chối an toàn.
- [x] CHK010 Đặc tả và bộ kiểm thử dành cho môi trường vận hành bao quát cả chủ đề ngoài phạm vi lẫn yêu cầu xin đáp án/gợi ý ngoài ngữ cảnh xem lại hoặc kết quả được phép.

## Tính toàn vẹn dữ liệu

- [x] CHK011 Giá trị người dùng trong truy vấn/kho dữ liệu của trợ lý sử dụng tham số SQL theo vị trí; các định danh động chỉ đến từ cột lược đồ đã kiểm tra/được cho phép và được đặt trong dấu nháy.
- [x] CHK012 Việc xác định phiên, chèn tin nhắn, lấy tin nhắn gần đây, lịch sử, tùy chọn và đánh giá đều có điều kiện về quyền sở hữu của người dùng đã xác thực.
- [x] CHK013 Việc chuẩn hóa cách xưng hô mong muốn áp dụng giới hạn 60 ký tự, 8 từ, loại bỏ các hậu tố được hỗ trợ và từ chối nội dung giống chỉ dẫn.
- [x] CHK014 Xác thực dữ liệu trò chuyện từ chối giá trị `conversationId` sai định dạng trước khi dịch vụ xử lý và chỉ hỗ trợ bí danh cũ `sessionId` thông qua quá trình chuẩn hóa.
- [x] CHK015 Mã cuộc hội thoại của người khác, không tồn tại hoặc đã đóng không thể cấp quyền cho phiên đó; dịch vụ chọn một phiên đang hoạt động khác thuộc quyền sở hữu hoặc tạo phiên mới.

## Chất lượng AI

- [x] CHK016 Cấu hình nhà cung cấp ưu tiên `AI_PROVIDER` được chỉ định rõ; nếu không có thì ưu tiên Gemini đã cấu hình và ngăn sử dụng chéo mô hình GPT/Gemini.
- [x] CHK017 Việc tự kiểm tra kết quả tra cứu từ chối đầu ra rỗng, chung chung, không an toàn hoặc nêu tiêu đề không có trong kết quả tra cứu và thay thế bằng nội dung xác định trước có căn cứ từ cơ sở dữ liệu.
- [x] CHK018 Phản hồi kiến thức chỉ thử lại tối đa một lần ở chế độ văn bản thuần khi đầu ra sau chuẩn hóa/tự kiểm tra vẫn không hợp lệ; lỗi truyền tải/cấu hình sử dụng trực tiếp phương án dự phòng.
- [x] CHK019 Phạm vi phương án dự phòng xác định trước được mô tả đúng như triển khai: Skimming, Scanning, sự kết hợp của hai kỹ năng này, Writing Task 1, Speaking Part 2, Reading, sau đó là phương án chung — không có nhánh riêng cho Listening trong mã.
- [x] CHK020 Tài liệu phân biệt 12 hằng số ý định đã khai báo với các nhánh xử lý có thể được kích hoạt bằng định tuyến xác định trước/bộ phân loại và không trình bày nhánh chết `GRADING_REQUEST_SAFE_FEEDBACK` như một ý định thành công công khai thông thường.

## Trải nghiệm người dùng phía giao diện

- [x] CHK021 Tiện ích toàn cục được gắn từ `App.jsx`; khách nhìn thấy tiện ích/lời nhắc đăng nhập trên các trang thông thường và không thể gửi tin nhắn trò chuyện.
- [x] CHK022 Các tuyến của bài thi đang diễn ra ẩn tiện ích. Kế hoạch ghi nhận `AssistantDisabledNotice` hiện không bao giờ được kết xuất thay vì khẳng định thông báo này được hiển thị.
- [x] CHK023 Trạng thái cuộc hội thoại được ghép với `ownerId`, tồn tại sau khi đóng/mở bảng trò chuyện và được đặt lại khi người dùng đã xác thực thay đổi.
- [x] CHK024 Ô nhập liệu vẫn bị vô hiệu hóa cho đến khi lịch sử chính thức từ máy chủ được tải; lịch sử và các yêu cầu sau đó sử dụng cùng mã cuộc hội thoại được trả về.
- [x] CHK025 Phía giao diện xử lý khung SSE cuối cùng dù không có dòng trống kết thúc và không bao giờ tự động gửi lại qua điểm cuối JSON một yêu cầu truyền luồng có trạng thái kết quả không chắc chắn.

## Kiểm thử và mức độ sẵn sàng phát hành

- [x] CHK026 Kiểm thử Jest tập trung cho các mô-đun phía máy chủ của trợ lý, nhà cung cấp AI và ghi nhận mức sử dụng đã vượt qua: 15 bộ, 261 ca, 0 bị bỏ qua, 0 thất bại.
- [x] CHK027 Ba tệp Vitest tập trung cho trợ lý phía giao diện đã vượt qua (3 tệp, 7 ca, 0 bị bỏ qua), ESLint phần trợ lý phía giao diện vượt qua và bản dựng cho môi trường thực tế vượt qua, chỉ có cảnh báo kích thước phân đoạn đã tồn tại.
- [x] CHK028 `production-test-suite.md` chứa chính xác 561 ID duy nhất, liên tục (`TC-001`–`TC-561`), 21 nhóm chủ đề, tổng số được nêu rõ và không còn tham chiếu cũ “500 ca kiểm thử”.
- [ ] CHK029 Áp dụng tệp di trú 024 trong từng môi trường được cấp quyền và hoàn tất các ca kiểm tra nhanh HTTP có xác thực/cơ sở dữ liệu thực/nhà cung cấp thực mà không làm lộ bí mật hoặc PII.
- [x] CHK030 `plan.md` ghi nhận các điểm sai lệch hiện tại so với hiến chương dự án (phiên bản React, vị trí CSS tùy chỉnh, cấu trúc bao phản hồi, xác thực/xử lý lỗi trực tiếp, cách dùng bộ ghi nhật ký, kích thước tệp/hàm, bằng chứng độ bao phủ và cách đặt tên nhánh/đặc tả) thay vì đánh dấu sai rằng cổng kiểm tra đã đạt.

## Ghi chú

- `eval-set.md`, `RFC.md` và `archive/implementation-approach.legacy.md` được giữ lại dưới dạng các tài liệu lịch sử/QA riêng biệt.
- ESLint phần trợ lý phía máy chủ vẫn bị chặn vì `eslint.config.js` nhập gói phụ thuộc phát triển `@eslint/js` còn thiếu; không có thao tác cài gói hoặc thay đổi mã nguồn nào được cấp quyền trong lượt cập nhật tài liệu này.
- Các mục còn mở được ánh xạ tới T056–T061 trong [tasks.md](./tasks.md).
- Danh sách kiểm tra này không cấp quyền thực thi di trú, gọi nhà cung cấp thực, gửi lưu lượng thực đã xác thực, tạo commit hoặc đẩy mã.
