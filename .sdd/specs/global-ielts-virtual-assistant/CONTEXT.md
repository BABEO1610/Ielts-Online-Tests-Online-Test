# Bối cảnh — Trợ lý ảo IELTS toàn cục

Trạng thái: Đang áp dụng — Đây là bối cảnh nghiệp vụ chính thức của tính năng trợ lý hội thoại.

## 1. Vấn đề cần giải quyết

Học viên luyện thi IELTS trên nền tảng IELTSZone cần:

- Được giải đáp nhanh các thắc mắc về kiến thức IELTS (ngữ pháp, từ vựng, chiến
  lược làm bài, tiêu chí chấm điểm).
- Tìm kiếm đề thi thử và tài liệu thư viện có sẵn trong hệ thống.
- Được hỗ trợ điều hướng các trang trên trang web.
- Xem lại bài thi đã nộp khi có đủ ngữ cảnh (lượt làm bài đã nộp và thuộc đúng
  học viên).

Tính năng này **không được phép** thay thế hệ thống chấm điểm Writing/Speaking
chính thức và **không được tiết lộ đáp án** khi học viên đang làm bài thi.

## 2. Kiến thức chuyên ngành

- **Trợ lý toàn cục:** Trợ lý hội thoại dành cho học viên, hiển thị trên mọi trang
  (trừ khi đang thi). Hệ thống hoạt động dựa trên định tuyến ý định, chèn ngữ cảnh
  có kiểm soát và lớp tích hợp nhà cung cấp AI.
- **Cơ chế dự phòng:** Khi nhà cung cấp AI gặp sự cố ở câu hỏi kiến thức IELTS, trợ
  lý trả về nội dung xác định trước cho Skimming, Scanning, cách kết hợp hai kỹ
  thuật này, tổng quan Writing Task 1, Speaking Part 2 và Reading; các chủ đề khác
  dùng nội dung dự phòng chung.
- **Cơ sở tri thức tĩnh:** Dùng các tệp JSON tĩnh trong
  `backend/src/api/assistant/knowledge-base/` để đưa kiến thức IELTS chuẩn vào câu
  lệnh cho mô hình. Giai đoạn hiện tại không dùng cơ sở dữ liệu vectơ hay phép nhúng
  vectơ.

## 3. Các bên liên quan

- **Học viên (`student`):** Người trực tiếp sử dụng trợ lý. Chỉ học viên đã xác thực
  mới được trò chuyện.
- **Khách (`guest`):** Thấy tiện ích trợ lý nhưng phải đăng nhập trước khi gửi tin
  nhắn.
- **Giảng viên (`tutor`):** Không sử dụng trợ lý này. Chức năng AI hỗ trợ giảng viên
  nằm ngoài phạm vi.

## 4. Ràng buộc và bảo mật

- **Chặn khi đang thi:** Trợ lý bị chặn hoàn toàn ở cả giao diện lẫn API khi học viên
  đang làm bài (`pageType = active-test`).
- **Giới hạn tần suất:** API `/chat` và `/chat/stream` bị giới hạn tối đa 30 yêu cầu
  trên mỗi địa chỉ IP mỗi phút thông qua `express-rate-limit`.
- **Bảo mật API `/status`:** Chỉ trả về trạng thái hoạt động tối giản
  (`{ code: null, status: "ok" }`), không làm lộ nhà cung cấp, mô hình hay khóa API.
- **Phạm vi giới hạn:** Trợ lý không chấm điểm Writing/Speaking, không dự đoán điểm
  band cá nhân và không bịa đề thi, đáp án hay tài liệu.

## 5. Giả định

- Các bảng `chatbot_sessions` và `chatbot_messages` là các bảng đích trong lược đồ, dùng để lưu lịch
  sử trò chuyện sau khi tệp di trú 024 được áp dụng; không giả định mọi môi trường
  hiện đã có các bảng này.
- Bảng `ai_usage_logs` là bảng đích trong lược đồ, dùng để ghi siêu dữ liệu của các lần gọi nhà
  cung cấp AI; việc bảng tồn tại trên từng môi trường vẫn phải được xác minh.
- Tệp di trú `024_create_chatbot_history_tables.sql` đã tồn tại trong kho mã nguồn;
  việc áp dụng và xác minh lược đồ vẫn phải thực hiện riêng cho từng môi trường.

## 6. Quyết định đã chốt

- *Hỏi: Nếu nhà cung cấp AI bị lỗi thì xử lý thế nào?*
  → Sử dụng nội dung dự phòng xác định trước theo từng kỹ năng thay vì gọi mô hình
  ngôn ngữ lớn khác.
- *Hỏi: Trợ lý có dùng để chấm điểm thay giảng viên không?*
  → Không. Luồng AI dành cho giảng viên nằm ngoài phạm vi của trợ lý này.
- *Hỏi: Có dùng RAG dựa trên vectơ hoặc phép nhúng vectơ không?*
  → Không ở giai đoạn hiện tại. Hệ thống dùng các đoạn tri thức JSON tĩnh kết hợp
  quy tắc và đối sánh siêu dữ liệu.

## 7. Ngoài phạm vi

- Chức năng AI hỗ trợ giảng viên.
- Chấm điểm Writing/Speaking chính thức.
- Tiết lộ đáp án hoặc gợi ý khi đang thi.
- RAG dựa trên vectơ hoặc phép nhúng vectơ đầy đủ.
- Cá nhân hóa dài hạn.
- Làm lộ cấu hình nhà cung cấp, mô hình hoặc khóa API qua API.
