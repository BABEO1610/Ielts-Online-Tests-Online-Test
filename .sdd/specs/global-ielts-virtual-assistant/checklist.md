# Danh sách kiểm tra chất lượng yêu cầu: Trợ lý ảo IELTS toàn cục

Đây là đánh giá chất lượng yêu cầu, không phải bản ghi rằng triển khai hay kiểm thử production đã chạy. Mục đã đánh dấu nghĩa là bốn tạo vật quy chuẩn làm yêu cầu có thể kiểm thử được và phân loại bằng chứng trung thực.

## Cấu trúc và tính rõ ràng

- [x] CHK-CHAT-001 `spec.md` nêu bối cảnh, phạm vi, ngoài phạm vi, tác nhân, ưu tiên, giả định, phụ thuộc, và câu hỏi mở.
- [x] CHK-CHAT-002 Mỗi câu chuyện người dùng có kiểm thử độc lập và kịch bản chấp nhận Cho trước/Khi/Thì.
- [x] CHK-CHAT-003 Quy tắc nghiệp vụ, Yêu cầu chức năng, NFR, và Tiêu chí thành công dùng mã ID ổn định `BR-CHAT`, `FR-CHAT`, `NFR-CHAT`, và `SC-CHAT`.
- [x] CHK-CHAT-004 Mỗi phát biểu quy chuẩn được phân loại `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION` khi bằng chứng hoặc phê duyệt chưa đầy đủ.
- [x] CHK-CHAT-005 Không có Quy tắc nghiệp vụ nào dựa vào tên file mã nguồn, tên lớp/hàm, cú pháp SQL, mô hình nhà cung cấp, header API, tên migration, lịch sử bug, hoặc số lượng kiểm thử.

## Quy tắc nghiệp vụ và hành vi biên

- [x] CHK-CHAT-006 Xác thực giới hạn cho học viên và quyền sở hữu được nêu rõ cho cuộc trò chuyện, lịch sử, bài thi xem lại, tin nhắn, tùy chọn, và đánh giá.
- [x] CHK-CHAT-007 Phạm vi hỗ trợ IELTS/tiếng Anh/điều hướng/nội dung đã công bố/xem lại và loại trừ chấm điểm Writing/Speaking được nêu rõ ràng.
- [x] CHK-CHAT-008 Hành vi đang thi ghi nhận hạn chế tin-tưởng-client hiện tại là khoảng trống thay vì tuyên bố có xác minh server.
- [x] CHK-CHAT-009 Tra cứu chỉ-đã-công-bố và quy tắc xem lại bài thi chủ sở hữu-cộng-đã-nộp có thể kiểm thử độc lập.
- [x] CHK-CHAT-010 Phạm vi bộ nhớ, giới hạn cách xưng hô 60 ký tự/tám từ, thứ tự nguồn, hành vi ngôn ngữ, đường xác định, dự phòng nhà cung cấp, và trạng thái tối giản đều rõ ràng.
- [x] CHK-CHAT-011 Giới hạn tần suất được phân biệt với hạn mức 50/ngày chưa triển khai, bao gồm ngữ nghĩa yêu cầu tính phí chưa giải quyết.
- [x] CHK-CHAT-012 Ghi tin nhắn riêng biệt nỗ lực tối đa và yêu cầu cặp nguyên tử MỤC TIÊU không bị nhầm lẫn.
- [x] CHK-CHAT-013 Đánh giá giới hạn cho tin nhắn trợ lý thuộc sở hữu, chấp nhận `up/down`, và cho phép cập nhật rõ ràng; `rating_reason` vẫn là chính sách mở.
- [x] CHK-CHAT-014 Lưu giữ, vòng đời đóng/xóa/xuất, và quyết định giống hủy được đánh dấu mở thay vì bịa ra.
- [x] CHK-CHAT-015 Trường hợp biên bao gồm đầu vào rỗng/ranh giới, phân loại sai đang thi, dữ liệu chưa công bố, lỗi nhà cung cấp, lưu trữ một phần, EOF SSE, lạm dụng tùy chọn, và lý do đánh giá dài.

## Chất lượng NFR

- [x] CHK-CHAT-016 Xác thực/quyền sở hữu, giới hạn tần suất, timeout/dự phòng nhà cung cấp, ghi nhật ký quyền riêng tư, và bảo mật trạng thái có kiểm tra đo lường được hoặc xác minh mục tiêu rõ ràng.
- [x] CHK-CHAT-017 Tương thích SSE mô tả hành vi one-full-delta hiện tại và không gọi đó là token streaming.
- [x] CHK-CHAT-018 Trợ năng, coverage, hạn mức hàng ngày, lưu giữ, và nguyên tử được đánh dấu TARGET/NEEDS CLARIFICATION khi không có bằng chứng.
- [x] CHK-CHAT-019 Không có SLA, thời hạn lưu giữ, số đồng thời, hoặc đảm bảo nhà cung cấp bịa ra nào xuất hiện trong yêu cầu quy chuẩn.

## Nhất quán và truy vết

- [x] CHK-CHAT-020 `plan.md` xác định route, controller, service, repository, migration, cơ sở kiến thức, frontend, kiểm thử, và khoảng trống thực tế.
- [x] CHK-CHAT-021 `tasks.md` dùng định dạng Spec Kit `- [ ] Txxx [P?] [USx] ...`, đường dẫn cụ thể, và giữ công việc chưa hoàn thành ở trạng thái chưa đánh dấu.
- [x] CHK-CHAT-022 Ma trận yêu cầu-tới-tác-vụ-tới-kiểm-thử bao phủ mọi họ BR/FR/NFR/SC và chỉ ra bằng chứng còn mở.
- [x] CHK-CHAT-023 `eval-set.md` hiện có được giữ vì `backend/scripts/eval-assistant.js` phụ thuộc trực tiếp.
- [x] CHK-CHAT-024 OpenAPI được giữ tạm thời; tạo vật prose trùng lặp/QA lớn đã được xóa sau khi kiểm toán tham chiếu.
- [x] CHK-CHAT-025 Không tuyên bố sẵn sàng production nào mà không có cổng migration, smoke, nhà cung cấp, trợ năng, timeout, hạn mức, lưu giữ, và hợp đồng.
- [x] CHK-CHAT-026 Không có placeholder cố ý, xung đột chưa giải quyết, hay yêu cầu AI Writing ngoài phạm vi nào bị ẩn trong bốn file quy chuẩn.
