# Đặc tả tính năng: Trợ lý ảo IELTS toàn cục

**Ngày tạo**: 2026-08-01
**Trạng thái**: Cốt lõi HIỆN CÓ với việc gia cố MỤC TIÊU và các quyết định vòng đời mở
**Phân loại**: Các mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cung cấp trợ lý hội thoại dành cho học viên đã xác thực để giải đáp câu hỏi IELTS/tiếng Anh, điều hướng trang web, tìm bài thi/tài liệu đã công bố, và xem lại bài thi đã nộp thuộc sở hữu. Trợ lý kết hợp phản hồi xác định/định tuyến, ngữ cảnh CSDL/kiến thức có kiểm soát, và nhà cung cấp AI. Trợ lý tách biệt hoàn toàn với chấm điểm AI và không được chấm hoặc dự đoán band Writing/Speaking cá nhân.

## 2. Phạm vi

- Widget toàn cục dành cho học viên, ngoài bài thi đang làm.
- Tin nhắn tối đa 2.000 ký tự qua endpoint JSON hoặc tương thích SSE.
- Kiến thức IELTS/tiếng Anh, điều hướng, tìm bài thi/tài liệu đã công bố, và xem lại bài thi đã nộp.
- Bộ nhớ gần đây theo phạm vi cuộc trò chuyện và cách xưng hô ưa thích.
- Lịch sử/phiên/đánh giá theo phạm vi chủ sở hữu, dự phòng an toàn, liên kết, và trạng thái tối giản.

## 3. Ngoài phạm vi

- Chấm điểm Writing/Speaking cá nhân hoặc dự đoán band cá nhân.
- Đáp án/gợi ý khi đang làm bài thi, nội dung chưa công bố/riêng tư/nội bộ, hoặc dữ liệu người dùng khác.
- Trợ lý giảng viên/quản trị, RAG vector/embedding, cá nhân hóa dài hạn xuyên cuộc trò chuyện, hoặc chuyển đổi nhà cung cấp dự phòng.
- Chấm điểm Writing bằng AI.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Phân quyền |
|---|---|
| Học viên đã xác thực | Có thể trò chuyện, stream, đọc lịch sử cuộc trò chuyện thuộc sở hữu, và đánh giá tin nhắn trợ lý thuộc sở hữu. |
| Khách | Có thể thấy lời nhắc đăng nhập nhưng không thể gọi thao tác trợ lý thành công. |
| Giảng viên/quản trị/vai trò khác | Không được phép sử dụng trợ lý học viên này chỉ vì có đặc quyền vai trò. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Hỏi câu hỏi IELTS/tiếng Anh an toàn (Ưu tiên: P1)

Với tư cách học viên, tôi muốn được giải đáp ngắn gọn bằng ngôn ngữ của câu hỏi mà trợ lý không chấm bài cá nhân hay tiết lộ dữ liệu nội bộ.

**Kiểm thử độc lập**: Gửi câu hỏi tiếng Việt và tiếng Anh trong phạm vi cùng các yêu cầu chấm điểm, tiêm lệnh, dữ liệu riêng tư, và ngoài phạm vi; xác nhận định tuyến an toàn, trả lời/dự phòng cùng ngôn ngữ, và không có đầu ra bị cấm.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên đã xác thực và câu hỏi trong phạm vi tối đa 2.000 ký tự, **Khi** trợ lý xử lý, **Thì** trả câu trả lời bằng ngôn ngữ câu hỏi qua đường phản hồi được phép.
2. **Cho trước** yêu cầu chấm/dự đoán band Writing/Speaking cá nhân hoặc tiết lộ prompt/khóa/mô hình/dữ liệu riêng tư, **Khi** rào chắn chạy, **Thì** yêu cầu bị từ chối trước khi gọi nhà cung cấp trả lời.
3. **Cho trước** câu hỏi được hỗ trợ và nhà cung cấp thất bại, **Khi** có dự phòng xác định an toàn, **Thì** trả dự phòng đó mà không tiết lộ chẩn đoán nhà cung cấp.

### Câu chuyện 2 — Tìm bài thi/tài liệu đã công bố và điều hướng (Ưu tiên: P1)

Với tư cách học viên, tôi muốn nhận liên kết có căn cứ tới nội dung thực sự đã công bố trên IELTSZone.

**Kiểm thử độc lập**: Gieo dữ liệu đã công bố/phê duyệt và chưa công bố/chưa phê duyệt, yêu cầu tìm bài thi/tài liệu/điều hướng, và xác nhận chỉ các bản ghi đủ điều kiện/route đã biết xuất hiện; mô phỏng lỗi nhà cung cấp và xác nhận đầu ra xác định có căn cứ.

**Kịch bản chấp nhận**:

1. **Cho trước** nội dung đã công bố phù hợp, **Khi** học viên tìm kiếm, **Thì** chỉ trả bản ghi CSDL đủ điều kiện và liên kết nội bộ.
2. **Cho trước** không có kết quả khớp chính xác, **Khi** có kết quả thay thế đủ điều kiện, **Thì** trình bày rõ ràng là gợi ý thay thế chứ không phải kết quả khớp bịa ra.
3. **Cho trước** nhà cung cấp thất bại sau tra cứu có căn cứ, **Khi** hình thành kết quả, **Thì** văn bản xác định chỉ dùng kết quả CSDL đã biết.

### Câu chuyện 3 — Xem lại bài thi đã nộp thuộc sở hữu (Ưu tiên: P1)

Với tư cách học viên, tôi muốn ngữ cảnh giải thích chính thức cho bài thi đã nộp của mình sau khi thi.

**Kiểm thử độc lập**: Truy vấn bài đã nộp thuộc sở hữu, bài chưa nộp thuộc sở hữu, bài người khác, bài thiếu, và bài thiếu giải thích; xác nhận chỉ trường hợp bài đã nộp thuộc sở hữu mới có thể dùng dữ liệu câu hỏi/đáp án/giải thích chính thức.

**Kịch bản chấp nhận**:

1. **Cho trước** bài đã nộp thuộc sở hữu có dấu thời gian nộp và giải thích chính thức, **Khi** yêu cầu xem lại từ ngữ cảnh kết quả/review, **Thì** trợ lý chỉ dùng ngữ cảnh chính thức đó.
2. **Cho trước** bài chưa nộp hoặc bài người khác, **Khi** yêu cầu xem lại, **Thì** không tiết lộ dữ liệu đáp án/giải thích.

### Câu chuyện 4 — Tiếp tục cuộc trò chuyện thuộc sở hữu (Ưu tiên: P2)

Với tư cách học viên, tôi muốn các lượt gần đây và cách xưng hô ưa thích chỉ được nhớ trong cuộc trò chuyện của tôi.

**Kiểm thử độc lập**: Tạo hai học viên/hai cuộc trò chuyện, đặt cách xưng hô hợp lệ 60 ký tự/tám từ trở xuống, hỏi tiếp, và xác nhận bộ nhớ/lịch sử/tùy chọn không bao giờ vượt ranh giới chủ sở hữu hoặc cuộc trò chuyện.

**Kịch bản chấp nhận**:

1. **Cho trước** cuộc trò chuyện đang hoạt động thuộc sở hữu, **Khi** học viên gửi câu hỏi tiếp, **Thì** các lượt gần đây trong cuộc trò chuyện đó có thể giải quyết tham chiếu.
2. **Cho trước** cách xưng hô ưa thích hợp lệ, **Khi** được đặt/gọi lại/xóa, **Thì** chỉ cuộc trò chuyện thuộc sở hữu đó bị ảnh hưởng.
3. **Cho trước** mã cuộc trò chuyện người khác/đã đóng/sai định dạng, **Khi** được cung cấp, **Thì** không được dùng như cuộc trò chuyện của người yêu cầu.

### Câu chuyện 5 — Đánh giá tin nhắn trợ lý (Ưu tiên: P2)

Với tư cách học viên, tôi muốn đánh giá tin nhắn trợ lý lên/xuống và sửa đổi đánh giá đó.

**Kiểm thử độc lập**: Đánh giá và đánh giá lại tin nhắn trợ lý thuộc sở hữu, sau đó thử đánh giá tin nhắn người dùng và tin nhắn người khác; xác nhận chỉ hàng trợ lý thuộc sở hữu bị thay đổi.

**Kịch bản chấp nhận**:

1. **Cho trước** tin nhắn trợ lý thuộc sở hữu, **Khi** gửi đánh giá `up` hoặc `down`, **Thì** đánh giá được lưu và đánh giá hợp lệ sau có thể thay thế.
2. **Cho trước** tin nhắn người dùng, tin nhắn trợ lý người khác, giá trị không hợp lệ, hoặc thiếu mã định danh, **Khi** cố đánh giá, **Thì** không có hàng nào ngoài tin nhắn trợ lý được ủy quyền bị thay đổi.

## 6. Trường hợp biên

- Tin nhắn rỗng/khoảng trắng, đúng 2.000 ký tự, và trên 2.000 ký tự.
- Client khai báo `active-test` so với client bỏ sót/phân loại sai trong khi bài thi thực sự đang hoạt động.
- Cờ đã công bố tồn tại mà không có cờ phê duyệt, hoặc schema bảng thiếu trường công bố được nhận dạng.
- Nhà cung cấp trả đầu ra rỗng/sai định dạng/không an toàn/không có căn cứ hoặc timeout.
- Schema phiên/tin nhắn không khả dụng; chỉ một trong hai lần chèn tin nhắn người dùng/trợ lý thành công.
- Kết nối SSE kết thúc với frame cuối chưa hoàn chỉnh hoặc ngắt sau khi nhà cung cấp hoàn tất.
- Cách xưng hô ưa thích chứa trên 60 ký tự, trên tám từ, văn bản giống chỉ thị, hoặc yêu cầu xóa/đặt lại.
- Lý do đánh giá cực dài vì chưa có giới hạn tối đa được định nghĩa.

## 7. Quy tắc nghiệp vụ

- **BR-CHAT-001 [AS-BUILT]**: Chỉ người dùng đã xác thực có vai trò `student` mới được sử dụng các thao tác chat, stream, lịch sử, trạng thái, hoặc đánh giá.
- **BR-CHAT-002 [AS-BUILT]**: Tin nhắn chứa 1–2.000 ký tự đã trim và ngữ cảnh trang hợp lệ.
- **BR-CHAT-003 [AS-BUILT]**: Phạm vi hỗ trợ là học IELTS/tiếng Anh, điều hướng IELTSZone, bài thi/tài liệu đã công bố, và xem lại bài thi đã nộp. Chấm điểm Writing/Speaking cá nhân và dự đoán band cá nhân bị từ chối.
- **BR-CHAT-004 [AS-BUILT]**: Trợ lý không được dùng khi đang làm bài thi. Server hiện tin tưởng loại trang do client cung cấp; xác minh bài thi đang hoạt động phía server chưa được triển khai cho mọi yêu cầu.
- **BR-CHAT-005 [AS-BUILT]**: Gợi ý bài thi/tài liệu chỉ dùng nội dung thỏa mãn điều kiện công bố/phê duyệt được nhận dạng. Các mục hiển thị trên trang client là ngữ cảnh không đáng tin cậy, không phải nguồn công bố.
- **BR-CHAT-006 [AS-BUILT]**: Xem lại bài thi yêu cầu bài thuộc sở hữu người yêu cầu và đã nộp; chỉ ngữ cảnh câu hỏi/đáp án/giải thích chính thức đã lưu mới được dùng làm căn cứ xem lại.
- **BR-CHAT-007 [AS-BUILT]**: Phiên, bộ nhớ gần đây, cách xưng hô ưa thích, lịch sử, tạo tin nhắn, và đánh giá đều thuộc phạm vi chủ sở hữu.
- **BR-CHAT-008 [AS-BUILT]**: Bộ nhớ gần đây và cách xưng hô ưa thích thuộc phạm vi cuộc trò chuyện, không phải cá nhân hóa bền vững chia sẻ xuyên cuộc trò chuyện. Cách xưng hô tối đa 60 ký tự và tám từ, từ chối nội dung giống chỉ thị.
- **BR-CHAT-009 [AS-BUILT]**: Thứ tự nguồn phản hồi là rào chắn/phản hồi xác định tức thì, điều hướng có kiểm soát hoặc ngữ cảnh CSDL, kiến thức IELTS tĩnh có phiên bản khi liên quan, tạo AI đã cấu hình khi cần, xác thực/tự kiểm tra, rồi dự phòng xác định an toàn khi được hỗ trợ.
- **BR-CHAT-010 [AS-BUILT]**: Nhà cung cấp AI chỉ được dùng cho ý định cần ngôn ngữ tạo sau rào chắn/ngữ cảnh. Lời chào, thao tác tùy chọn, điều hướng, phản hồi thiếu ngữ cảnh, và một số đường tra cứu/thất bại là xác định.
- **BR-CHAT-011 [AS-BUILT]**: Lưu tin nhắn thành công theo cơ chế nỗ lực tối đa: tin nhắn người dùng và tin nhắn trợ lý là hai lần ghi riêng biệt. Lỗi lưu trữ không ngăn trả câu trả lời an toàn và có thể dẫn đến không có lịch sử/mã tin nhắn bền vững.
- **BR-CHAT-012 [TARGET]**: Một lượt thành công nên lưu cặp người dùng/trợ lý nguyên tử hoặc cho biết rõ kết quả bền vững; cặp một phần không nên bị ngầm coi là bền vững.
- **BR-CHAT-013 [AS-BUILT]**: Đánh giá chỉ áp dụng cho tin nhắn trợ lý thuộc sở hữu, chấp nhận `up` hoặc `down`, và có thể được cập nhật bởi đánh giá hợp lệ sau.
- **BR-CHAT-014 [AS-BUILT]**: Giới hạn tần suất và hạn mức hàng ngày là hai kiểm soát riêng biệt. Triển khai hiện tại thực thi 30 yêu cầu chat/stream mỗi IP mỗi phút; không thực thi giới hạn 50 tin nhắn mỗi người dùng mỗi ngày UTC đã tài liệu hóa.
- **BR-CHAT-015 [TARGET]**: Thực thi hạn mức 50 tin nhắn mỗi học viên mỗi ngày UTC chỉ sau khi ngữ nghĩa tính toán hàng ngày được phê duyệt và kiểm thử.
- **BR-CHAT-016 [AS-BUILT]**: Ngôn ngữ phản hồi theo ngôn ngữ câu hỏi hiện tại cho các đường tạo/dự phòng được hỗ trợ.
- **BR-CHAT-017 [AS-BUILT]**: Trạng thái chỉ trả thông tin khả dụng tối giản và không được tiết lộ nhà cung cấp, mô hình, khóa, prompt, hoặc cấu hình nội bộ.
- **BR-CHAT-018 [AS-BUILT]**: Dữ liệu riêng tư, chưa công bố, nội bộ, chéo chủ sở hữu, prompt, thông tin xác thực, nhà cung cấp/mô hình, và dữ liệu CSDL thô không được tiết lộ.
- **BR-CHAT-019 [NEEDS CLARIFICATION]**: Thời hạn lưu giữ, ngữ nghĩa đóng/mở lại, xóa/xuất dữ liệu người dùng, và xóa lịch sử cuộc trò chuyện chưa được phê duyệt thành vòng đời hoàn chỉnh.
- **BR-CHAT-020 [NEEDS CLARIFICATION]**: Độ dài tối đa và chính sách nội dung cho phép của `rating_reason` chưa được định nghĩa.
- **BR-CHAT-021 [NEEDS CLARIFICATION]**: Tính toán hạn mức hàng ngày cho yêu cầu bị rào chắn chặn, lỗi nhà cung cấp, dự phòng xác định, và lỗi lưu trữ chưa được quyết định.

## 8. Yêu cầu chức năng

- **FR-CHAT-001 [AS-BUILT]**: Mọi endpoint phải phân giải token/phiên cookie hợp lệ và vai trò học viên trước hành vi được bảo vệ.
- **FR-CHAT-002 [AS-BUILT]**: Xác thực payload chat phải thực thi hình dạng tin nhắn/ngữ cảnh/mã cuộc trò chuyện và giới hạn 2.000 ký tự.
- **FR-CHAT-003 [AS-BUILT]**: Rào chắn phải chặn khai báo đang thi, chấm điểm/dự đoán band cá nhân, nội dung giả, yêu cầu prompt/dữ liệu riêng tư, và chủ đề rõ ràng ngoài phạm vi trước công việc phiên/nhà cung cấp.
- **FR-CHAT-004 [TARGET]**: Server phải độc lập phát hiện bài thi đang hoạt động thuộc sở hữu cho mỗi yêu cầu chat thay vì chỉ dựa vào loại trang client.
- **FR-CHAT-005 [AS-BUILT]**: Định tuyến ý định phải hỗ trợ kiến thức IELTS, mẹo học, điều hướng, tra cứu bài thi, tra cứu tài liệu, xem lại bài thi đã nộp, lời chào/tùy chọn, làm rõ, và xử lý ngoài phạm vi an toàn.
- **FR-CHAT-006 [AS-BUILT]**: Truy vấn tra cứu phải áp dụng vị từ công bố/phê duyệt được nhận dạng và chỉ trả liên kết nội bộ có kiểm soát.
- **FR-CHAT-007 [AS-BUILT]**: Truy vấn xem lại phải thực thi quyền sở hữu bài thi và dấu thời gian nộp trước khi đọc hàng đáp án/giải thích.
- **FR-CHAT-008 [AS-BUILT]**: Bộ nhớ gần đây phải giới hạn theo các lượt cuộc trò chuyện gần đây, và cách xưng hô ưa thích phải được xác thực/lưu/đọc chỉ cho cuộc trò chuyện đang hoạt động thuộc sở hữu.
- **FR-CHAT-009 [AS-BUILT]**: Đầu ra nhà cung cấp phải được chuẩn hóa, có căn cứ khi cần, tự kiểm tra nội dung bị cấm, và thay bằng dự phòng an toàn được hỗ trợ khi không hợp lệ hoặc không khả dụng.
- **FR-CHAT-010 [AS-BUILT]**: Chat JSON phải trả kết quả cuối cùng; SSE hiện phát `assistant.start`, một `assistant.delta` chứa toàn bộ câu trả lời cuối cùng, rồi `assistant.done` (hoặc `assistant.error`).
- **FR-CHAT-011 [AS-BUILT]**: Frontend phải phân tích frame SSE cuối cùng đã đệm tại EOF, tránh phát lại JSON tự động không chắc chắn, và cập nhật mã tin nhắn/đánh giá trợ lý từ sự kiện done.
- **FR-CHAT-012 [AS-BUILT]**: Lịch sử phải trả tối đa 100 tin nhắn gần nhất từ cuộc trò chuyện đang hoạt động thuộc sở hữu theo thứ tự thời gian.
- **FR-CHAT-013 [AS-BUILT]**: Xác thực/cập nhật đánh giá repository chỉ chấp nhận `up/down`, vai trò trợ lý, và phạm vi phiên thuộc sở hữu; cập nhật sau có thể ghi đè đánh giá/lý do.
- **FR-CHAT-014 [AS-BUILT]**: Endpoint chat và stream phải thực thi 30 yêu cầu mỗi IP mỗi cửa sổ một phút.
- **FR-CHAT-015 [TARGET]**: Triển khai hạn mức 50/ngày theo chủ sở hữu với bộ đếm nguyên tử và xử lý đã tài liệu hóa cho yêu cầu bị chặn/thất bại/dự phòng sau khi BR-CHAT-021 được giải quyết.
- **FR-CHAT-016 [TARGET]**: Lưu cặp người dùng/trợ lý thành công nguyên tử với kết quả thất bại rõ ràng, thay thế hành vi hai-lần-ghi nỗ lực tối đa hiện tại.
- **FR-CHAT-017 [TARGET]**: Bổ sung hành vi vòng đời đóng/xóa/xuất hoàn chỉnh sau khi BR-CHAT-019 được giải quyết.
- **FR-CHAT-018 [TARGET]**: Giới hạn và xác thực lý do đánh giá sau khi BR-CHAT-020 được giải quyết.

## 9. Yêu cầu phi chức năng

- **NFR-CHAT-001 [AS-BUILT]**: Cách ly xác thực và quyền sở hữu phải bao phủ chat, stream, lịch sử, trạng thái, bộ nhớ/tùy chọn cuộc trò chuyện, lưu trữ, và đánh giá.
- **NFR-CHAT-002 [TARGET]**: Độ trễ phản hồi xác định và hỗ trợ AI phải được đo riêng biệt tại p50/p95 dưới tải đã phê duyệt; không tuyên bố SLA phát hành cho đến khi ngưỡng được phê duyệt.
- **NFR-CHAT-003 [AS-BUILT]**: Bảo vệ lạm dụng chat/stream là 30 yêu cầu mỗi IP mỗi phút và trả phản hồi giới hạn tần suất mà không thực hiện công việc nhà cung cấp.
- **NFR-CHAT-004 [TARGET]**: Lời gọi nhà cung cấp phải có ngân sách timeout đã phê duyệt và hành vi dự phòng/lỗi an toàn; hành vi timeout tạo trợ lý hiện tại cần xác minh rõ ràng và kiểm thử.
- **NFR-CHAT-005 [AS-BUILT]**: Phản hồi/trạng thái không được tiết lộ prompt hệ thống, khóa API, chi tiết nhà cung cấp/mô hình/cấu hình, dữ liệu chưa công bố/riêng tư, hoặc chẩn đoán nhà cung cấp/CSDL thô.
- **NFR-CHAT-006 [AS-BUILT]**: Nhật ký sử dụng lưu metadata thời gian/token/lỗi giới hạn và phải giảm thiểu PII; nội dung prompt/câu trả lời thô không được ghi vào đo lường sử dụng.
- **NFR-CHAT-007 [TARGET]**: Bền vững cặp cuộc trò chuyện phải nguyên tử hoặc được báo cáo rõ ràng; áp dụng migration phải được xác minh trước khi tuyên bố bền vững lịch sử/đánh giá.
- **NFR-CHAT-008 [AS-BUILT]**: Client SSE phải chấp nhận thứ tự sự kiện single-delta đã tài liệu hóa và xử lý frame cuối tại EOF; hành vi phân tích streaming/nhiều dòng thực sự không được tuyên bố.
- **NFR-CHAT-009 [TARGET]**: Điều khiển widget, cập nhật tin nhắn, trạng thái đăng nhập/lỗi/vô hiệu, và đánh giá phải vận hành được bằng bàn phím, có nhãn cho công nghệ hỗ trợ, và được bao phủ bởi kiểm thử trợ năng.
- **NFR-CHAT-010 [TARGET]**: Thay đổi service/truy vấn/API phải có kiểm thử happy, negative, phân quyền, thất bại, và dự phòng với ít nhất 80% coverage logic service/nghiệp vụ; phần trăm hiện tại chưa được chứng minh.
- **NFR-CHAT-011 [TARGET]**: Hạn mức hàng ngày và kiểm soát lưu giữ/vòng đời không thể vượt qua đánh giá phát hành cho đến khi BR-CHAT-019/021 được giải quyết và xác minh.

## 10. Thực thể chính

- **Cuộc trò chuyện**: Phiên đang hoạt động thuộc sở hữu học viên chứa cách xưng hô ưa thích tùy chọn và dấu thời gian vòng đời.
- **Tin nhắn chat**: Tin nhắn người dùng hoặc trợ lý trong một cuộc trò chuyện, tùy chọn mang đánh giá/lý do trợ lý.
- **Bộ nhớ cuộc trò chuyện**: Phép chiếu giới hạn của các lượt gần đây cộng tùy chọn xưng hô theo phạm vi cuộc trò chuyện.
- **Kết quả nội dung đã công bố**: Bản ghi bài thi/tài liệu có kiểm soát đủ điều kiện gợi ý.
- **Ngữ cảnh bài thi đã nộp**: Bài thi đã nộp thuộc sở hữu cùng dữ liệu câu hỏi/đáp án/giải thích chính thức.
- **Bản ghi sử dụng AI**: Metadata cho sử dụng nhà cung cấp không chứa nội dung prompt/câu trả lời thô.

## 11. Tiêu chí thành công

- **SC-CHAT-001 [TARGET]**: 100% nỗ lực lịch sử/phiên/đánh giá của khách/không-học-viên và chéo chủ sở hữu bị từ chối mà không tiết lộ dữ liệu được bảo vệ.
- **SC-CHAT-002 [TARGET]**: Kiểm thử biên chấp nhận tin nhắn 2.000 ký tự và từ chối đầu vào rỗng hoặc 2.001 ký tự trước công việc nhà cung cấp.
- **SC-CHAT-003 [TARGET]**: Kiểm thử nội dung đã công bố trả không có bản ghi chưa công bố/chưa phê duyệt/riêng tư xuyên suốt đường tra cứu bài thi và tài liệu.
- **SC-CHAT-004 [TARGET]**: Kiểm thử xem lại bài thi tiết lộ ngữ cảnh chính thức chỉ cho bài đã nộp thuộc sở hữu và từ chối bài người khác/chưa nộp.
- **SC-CHAT-005 [TARGET]**: Fixture nhà cung cấp rỗng/sai định dạng/không an toàn/thất bại chỉ tạo đầu ra an toàn đã xác thực hoặc lỗi có kiểm soát, không rò rỉ prompt/khóa/mô hình/cấu hình.
- **SC-CHAT-006 [TARGET]**: Kiểm thử tương thích SSE quan sát đúng start → một full-answer delta → done cho hợp đồng hiện tại và phân tích frame EOF cuối cùng.
- **SC-CHAT-007 [TARGET]**: Kiểm thử đánh giá cho phép đánh giá lại tin nhắn trợ lý thuộc sở hữu và từ chối tin nhắn người dùng/người khác không có cập nhật trái phép.
- **SC-CHAT-008 [TARGET]**: Trước phát hành, coverage tự động tập trung đạt ít nhất 80%, kiểm tra trợ năng đạt, và cổng hạn mức hàng ngày/lưu giữ/nguyên tử hoặc được triển khai hoặc bị loại rõ ràng theo phạm vi đã phê duyệt.

## 12. Giả định

- Xác thực cookie/phiên hiện có vẫn là nguồn danh tính.
- Cờ đã công bố/trường phê duyệt và dấu thời gian nộp bài vẫn khả dụng trong schema CSDL.
- JSON kiến thức tĩnh là nội dung đáng tin cậy có quản lý phiên bản; tin nhắn gần đây, cách xưng hô ưa thích, ngữ cảnh trang, và mục hiển thị vẫn là đầu vào không đáng tin cậy.
- Sự có mặt migration trong repository không chứng minh đã áp dụng trên bất kỳ môi trường nào.

## 13. Phụ thuộc

- Kho phiên xác thực, PostgreSQL, và migration cho lịch sử/đánh giá chatbot.
- Bài thi/tài liệu đã công bố và dữ liệu bài thi đã nộp/câu hỏi.
- Gateway AI dùng chung/đo lường sử dụng và nhà cung cấp đã cấu hình cho các đường tạo.
- Widget frontend toàn cục, API client, và API trình duyệt tương thích SSE.
- [eval-set.md](./eval-set.md), được giữ vì `backend/scripts/eval-assistant.js` đọc và cập nhật trực tiếp.

## 14. Câu hỏi mở

1. **BR-CHAT-019**: Hành vi lưu giữ, đóng/mở lại, xuất, và xóa áp dụng cho cuộc trò chuyện, tin nhắn, tùy chọn, và đánh giá là gì?
2. **BR-CHAT-020**: Chính sách độ dài tối đa/nội dung nào áp dụng cho `rating_reason`?
3. **BR-CHAT-021**: Yêu cầu nào tiêu tốn hạn mức 50/ngày MỤC TIÊU: chỉ lượt được chấp nhận, chặn rào chắn, lỗi nhà cung cấp, dự phòng xác định, và/hoặc lỗi lưu trữ?
