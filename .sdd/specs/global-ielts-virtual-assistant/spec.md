# Đặc tả tính năng: Trợ lý ảo IELTS toàn cục

**Nhánh tính năng**: `feature-global-ielts-virtual-assistant/Datnt`

**Ngày tạo**: 2026-06-24

**Trạng thái**: Đã triển khai — vẫn còn công việc gia cố và xác thực trên môi trường thực tế

**Đầu vào**: Trợ lý hội thoại toàn cục dành cho học viên IELTSZone, có khả năng trả lời câu hỏi về IELTS/việc học tiếng Anh, tìm bài thi và tài nguyên học tập đã xuất bản, xem lại các lượt làm bài đã nộp, hỗ trợ điều hướng trang web và ghi nhớ tùy chọn trong phạm vi cuộc hội thoại mà không thay thế các luồng chấm điểm Writing/Speaking chính thức.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 - Hỏi về IELTS và việc học tiếng Anh (Ưu tiên: P1)

Một học viên đã xác thực đặt câu hỏi về kỹ năng IELTS, ngữ pháp, từ vựng, cách diễn đạt lại, tiêu chí band điểm hoặc chiến lược học tập và nhận được câu trả lời an toàn bằng ngôn ngữ của câu hỏi.

**Lý do chọn mức ưu tiên này**: Đây là hành trình học tập độc lập có phạm vi rộng nhất và mang lại giá trị mà không cần tra cứu nội dung hoặc có sẵn một lượt làm bài.

**Kiểm thử độc lập**: Hỏi “Cohesion và coherence khác nhau thế nào?” và nhận được lời giải thích phù hợp, không kèm mức điểm cá nhân, nội dung chính thức bịa đặt hoặc thao tác tra cứu trang web không liên quan.

**Các kịch bản chấp nhận**:

1. **Với điều kiện** học viên đã xác thực và không ở trong một bài thi đang diễn ra, **Khi** họ hỏi cách làm dạng True/False/Not Given, **Thì** trợ lý coi yêu cầu đó là kiến thức IELTS và trả lời dựa trên kiến thức đã được phê duyệt cùng kiến thức mô hình an toàn.
2. **Với điều kiện** học viên hỏi yêu cầu của Writing Band 7, **Khi** trợ lý phản hồi, **Thì** trợ lý giải thích các tiêu chí chung và không khẳng định bài làm của học viên đạt band điểm cụ thể nào.
3. **Với điều kiện** không có đoạn kiến thức tĩnh nào khớp nhưng nhà cung cấp câu trả lời đang khả dụng, **Khi** học viên đặt câu hỏi ngữ pháp hoặc từ vựng trong phạm vi, **Thì** trợ lý vẫn đưa ra câu trả lời hữu ích thay vì thông báo kỹ thuật của nhà cung cấp.
4. **Với điều kiện** nhà cung cấp câu trả lời không khả dụng, **Khi** câu hỏi rõ ràng liên quan đến Reading, Writing Task 1, Speaking Part 2, Skimming hoặc Scanning, **Thì** trợ lý trả về hướng dẫn xác định trước tương ứng; các chủ đề khác trong phạm vi nhận phương án dự phòng chung an toàn.
5. **Với điều kiện** các lượt hội thoại gần đây thuộc quyền sở hữu đề cập đến Skimming và Scanning, **Khi** học viên hỏi cách kết hợp “hai cái này”, **Thì** trợ lý sử dụng cả hai đối tượng được nhắc đến; nếu không có đối tượng tham chiếu rõ ràng, trợ lý đặt câu hỏi làm rõ.

---

### Câu chuyện người dùng 2 - Tìm bài thi đã xuất bản và tài nguyên học tập (Ưu tiên: P2)

Một học viên đã xác thực yêu cầu bài thi thử hoặc tài nguyên thư viện và chỉ nhận được nội dung đã xuất bản, thực sự tồn tại trong IELTSZone.

**Lý do chọn mức ưu tiên này**: Hành trình này kết nối học viên với nội dung có thể sử dụng ngay trên nền tảng, đồng thời yêu cầu nghiêm ngặt về mức độ bám sát nguồn dữ liệu và tính toàn vẹn của liên kết.

**Kiểm thử độc lập**: Hỏi “Có đề Reading về Environment không?” và nhận được các bài thi đã xuất bản phù hợp với liên kết nội bộ có thật, hoặc một phản hồi rõ ràng rằng không có kết quả.

**Các kịch bản chấp nhận**:

1. **Với điều kiện** có các bài thi thử đã xuất bản, **Khi** học viên yêu cầu một bài Reading, **Thì** phản hồi chứa số bài thi phù hợp có thật không vượt quá giới hạn hiển thị đã cấu hình, cùng các liên kết nội bộ tương ứng.
2. **Với điều kiện** có các tài nguyên thư viện đã xuất bản, **Khi** học viên yêu cầu rõ ràng một tài nguyên Listening, **Thì** trợ lý tìm trong thư viện thay vì danh mục bài thi thử.
3. **Với điều kiện** không có mục đã xuất bản nào phù hợp, **Khi** quá trình tra cứu hoàn tất, **Thì** trợ lý thông báo không tìm thấy dữ liệu phù hợp và không bịa đặt tiêu đề, liên kết, đáp án hoặc tài nguyên.
4. **Với điều kiện** phản hồi của nhà cung cấp nêu tên một mục không có trong kết quả tra cứu, **Khi** các bước kiểm tra an toàn cho phản hồi được thực hiện, **Thì** câu trả lời cuối cùng được thay bằng câu trả lời xác định trước, có căn cứ từ cơ sở dữ liệu.
5. **Với điều kiện** có chủ đề, kỹ năng, độ khó, cách sắp xếp hoặc số lượng trong yêu cầu, **Khi** quá trình tra cứu chạy, **Thì** bộ lọc được áp dụng trước mệnh đề giới hạn kết quả ở cơ sở dữ liệu, còn số lượng do người dùng yêu cầu được áp dụng sau khi xếp hạng.
6. **Với điều kiện** ý định trước đó là tra cứu thư viện, **Khi** học viên nói “cái khác đi”, **Thì** việc định tuyến vẫn nằm trong hành trình thư viện; triển khai hiện tại không cam kết kế thừa loại tài nguyên hoặc loại trừ mục trước đó.

---

### Câu chuyện người dùng 3 - Xem lại một lượt làm bài đã nộp (Ưu tiên: P3)

Một học viên trên trang kết quả hoặc xem lại hỏi lý do một đáp án bị sai và nhận được lời giải thích dựa trên lượt làm bài đã nộp thuộc quyền sở hữu cùng dữ liệu câu hỏi chính thức.

**Lý do chọn mức ưu tiên này**: Chức năng này có giá trị học tập cao nhưng phụ thuộc vào quyền sở hữu lượt làm bài, trạng thái đã nộp, ngữ cảnh trang và các lời giải thích hiện có.

**Kiểm thử độc lập**: Trên trang xem lại có một lượt làm bài đã nộp thuộc quyền sở hữu, hỏi “Vì sao câu 5 là B?” và nhận được lời giải thích được suy ra từ lượt làm bài và câu hỏi đó.

**Các kịch bản chấp nhận**:

1. **Với điều kiện** ngữ cảnh yêu cầu chứa một lượt làm bài đã nộp thuộc quyền sở hữu và một câu hỏi có thể nhận diện, **Khi** học viên yêu cầu giải thích, **Thì** trợ lý sử dụng đáp án đã nộp, đáp án chính thức, câu hỏi và lời giải thích hiện có.
2. **Với điều kiện** một lượt làm bài chưa được nộp, **Khi** có yêu cầu xem lại, **Thì** trợ lý từ chối yêu cầu bằng `ATTEMPT_NOT_SUBMITTED` và không làm lộ đáp án.
3. **Với điều kiện** lượt làm bài không thuộc về học viên đã xác thực, **Khi** có yêu cầu xem lại, **Thì** hệ thống coi lượt làm bài là không tồn tại và không làm lộ dữ liệu của lượt làm bài đó.
4. **Với điều kiện** thiếu lời giải thích chính thức, **Khi** có yêu cầu xem lại, **Thì** trợ lý trả về `MISSING_EXPLANATION` thay vì tự bịa ra lời giải thích.
5. **Với điều kiện** học viên vẫn ở cùng trang xem lại/kết quả và ngữ cảnh yêu cầu vẫn mang mã định danh lượt làm bài, **Khi** họ hỏi “còn câu 6?”, **Thì** trợ lý xác định câu 6 bằng ngữ cảnh yêu cầu hiện tại kết hợp với hội thoại gần đây. Mã định danh lượt làm bài không được tái tạo chỉ từ lịch sử trò chuyện.

---

### Câu chuyện người dùng 4 - Ghi nhớ cách xưng hô mong muốn (Ưu tiên: P4)

Một học viên thiết lập, gọi lại hoặc xóa cách xưng hô mong muốn cho cuộc hội thoại đang hoạt động thuộc quyền sở hữu.

**Lý do chọn mức ưu tiên này**: Chức năng này cải thiện tính liền mạch và cá nhân hóa mà không thay đổi kết quả học tập hoặc dữ liệu hồ sơ trên toàn tài khoản.

**Kiểm thử độc lập**: Gửi “Gọi tôi là Đạt”, xác nhận tùy chọn mà không gọi nhà cung cấp câu trả lời, sau đó gọi lại và xóa tùy chọn trong cùng cuộc hội thoại.

**Các kịch bản chấp nhận**:

1. **Với điều kiện** có một lệnh tùy chọn hợp lệ bằng tiếng Việt hoặc tiếng Anh, **Khi** giá trị không dài quá 60 ký tự và 8 từ, **Thì** giá trị được lưu cho cuộc hội thoại đang hoạt động thuộc quyền sở hữu và được xác nhận mà không gọi nhà cung cấp câu trả lời.
2. **Với điều kiện** đã lưu một tùy chọn, **Khi** học viên hỏi trợ lý gọi mình là gì, **Thì** trợ lý nhắc lại cách xưng hô đã lưu mà không tạo tùy chọn mới.
3. **Với điều kiện** đã lưu một tùy chọn, **Khi** học viên yêu cầu trợ lý ngừng sử dụng tùy chọn đó, **Thì** giá trị có cấu trúc được xóa và các lượt sau không sử dụng giá trị cũ.
4. **Với điều kiện** một giá trị đề xuất vượt quá 60 ký tự hoặc 8 từ, **Khi** quá trình chuẩn hóa chạy, **Thì** quá trình này không trả về tùy chọn hợp lệ và không có cập nhật tùy chọn nào xảy ra.
5. **Với điều kiện** một giá trị đề xuất chứa nội dung ghi đè chỉ dẫn hoặc trích xuất câu lệnh hệ thống, **Khi** quá trình trích xuất hoặc các lớp bảo vệ chạy, **Thì** nội dung đó không được lưu làm tùy chọn và không thể thay đổi các quy tắc an toàn.
6. **Với điều kiện** câu “Câu ‘call me John’ nghĩa là gì?”, **Khi** câu này được xử lý, **Thì** nó vẫn là một câu hỏi học tiếng Anh và không thiết lập `John` làm tùy chọn.
7. **Với điều kiện** Học viên A đăng xuất và Học viên B đăng nhập trong cùng một SPA, **Khi** tiện ích được gắn lại, **Thì** Học viên B không nhận bất kỳ mã cuộc hội thoại, lịch sử hoặc tùy chọn nào của Học viên A.

---

### Câu chuyện người dùng 5 - Thực thi kiểm soát truy cập, xác thực dữ liệu và an toàn (Ưu tiên: P5)

Khách, vai trò không phải học viên, yêu cầu không hợp lệ, yêu cầu trong bài thi đang diễn ra và nội dung bị cấm đều bị từ chối trước khi các tác vụ được bảo vệ của trợ lý chạy.

**Lý do chọn mức ưu tiên này**: Các biện pháp kiểm soát xuyên suốt này xác định ranh giới cho mọi hành trình khác và bảo vệ dữ liệu riêng tư, tính toàn vẹn của bài thi cùng việc sử dụng nhà cung cấp.

**Kiểm thử độc lập**: Gửi dữ liệu yêu cầu trò chuyện hợp lệ nhưng không có cookie chứa mã truy cập và nhận `LOGIN_REQUIRED` mà không tạo cuộc hội thoại hoặc gọi nhà cung cấp câu trả lời.

**Các kịch bản chấp nhận**:

1. **Với điều kiện** dữ liệu yêu cầu hợp lệ đến từ khách, mã truy cập không hợp lệ, mã truy cập hết hạn hoặc phiên đã bị thu hồi, **Khi** một điểm cuối được bảo vệ của trợ lý được gọi, **Thì** điểm cuối trả về `LOGIN_REQUIRED` và không đi vào quy trình xử lý của trợ lý.
2. **Với điều kiện** người dùng đã xác thực có vai trò không phải học viên hoặc mã truy cập yêu cầu đổi mật khẩu, **Khi** trợ lý được gọi, **Thì** trợ lý trả về `FORBIDDEN`.
3. **Với điều kiện** ngữ cảnh yêu cầu có `pageType=active-test`, **Khi** yêu cầu trò chuyện hoặc luồng SSE được gửi, **Thì** hệ thống trả về `ASSISTANT_DISABLED_DURING_TEST` trước khi mở SSE hoặc gọi nhà cung cấp.
4. **Với điều kiện** có hơn 30 yêu cầu trò chuyện từ một IP trong vòng một phút, **Khi** yêu cầu tiếp theo đến, **Thì** hệ thống trả về HTTP 429 với `RATE_LIMIT_EXCEEDED`.
5. **Với điều kiện** tin nhắn rỗng, tin nhắn dài hơn 2000 ký tự, loại trang không hợp lệ hoặc mã cuộc hội thoại sai định dạng, **Khi** quá trình xác thực dữ liệu chạy, **Thì** hệ thống trả về `VALIDATION_ERROR` trước khi xử lý qua trợ lý.
6. **Với điều kiện** một mã cuộc hội thoại hợp lệ thuộc sở hữu của người dùng khác, **Khi** mã này được cung cấp, **Thì** trợ lý bỏ qua mã đó rồi xác định hoặc tạo một cuộc hội thoại đang hoạt động thuộc quyền sở hữu mà không đọc hay ghi phiên của người khác.
7. **Với điều kiện** có một yêu cầu trạng thái được bảo vệ, **Khi** học viên đã xác thực gọi yêu cầu này, **Thì** hệ thống chỉ trả về thông tin tình trạng hoạt động tối thiểu; khách bị từ chối và không có thông tin chi tiết nào về nhà cung cấp, mô hình, khóa hoặc môi trường bị lộ.
8. **Với điều kiện** có yêu cầu chấm một bài Writing/Speaking cụ thể, tiết lộ cấu hình riêng tư, bịa nội dung chính thức, lấy đáp án trong khi thi hoặc thảo luận một chủ đề ngoài phạm vi bị chặn, **Khi** các lớp bảo vệ chạy, **Thì** yêu cầu bị từ chối trước các thao tác cơ sở dữ liệu/nhà cung cấp/lưu trữ không cần thiết.

### Các trường hợp biên

- Việc xác thực dữ liệu chạy trước xác thực danh tính đối với dữ liệu yêu cầu trò chuyện; vì vậy, dữ liệu yêu cầu không hợp lệ từ khách có thể nhận lỗi xác thực dữ liệu trước `LOGIN_REQUIRED`.
- Tiện ích trong bài thi đang diễn ra bị ẩn trong giao diện hiện tại. `AssistantDisabledNotice` có trong mã nguồn nhưng không được kết xuất vì tiện ích thoát sớm khi không hiển thị.
- SSE của ứng dụng truyền phản hồi cuối cùng, không truyền theo từng token: phía máy chủ hoàn tất kết quả cuối cùng, cố gắng lưu theo cơ chế nỗ lực tối đa, sau đó phát `assistant.start`, một `assistant.delta` chứa toàn bộ câu trả lời và `assistant.done`. Lỗi lưu trữ không ngăn việc gửi câu trả lời cuối cùng an toàn.
- Nếu luồng của nhà cung cấp phát một phần văn bản nội bộ rồi gặp lỗi, phần văn bản đó không được phát tới trình duyệt; phương án dự phòng xác định trước đã hoàn tất sẽ được lưu và phát.
- Phía giao diện phân tích được khung SSE cuối cùng ngay cả khi không có dòng trống kết thúc và không tự động lặp lại một yêu cầu luồng không chắc chắn thông qua điểm cuối JSON.
- Nếu bộ phân loại phạm vi gặp lỗi, trợ lý yêu cầu làm rõ thay vì phỏng đoán.
- Mã cuộc hội thoại của người khác, không tồn tại hoặc đã đóng không bao giờ cấp quyền cho cuộc hội thoại đó; dịch vụ xác định một cuộc hội thoại đang hoạt động thuộc quyền sở hữu hoặc tạo mới.
- Bộ nhớ định tuyến gần đây lưu ý định, kỹ năng, chủ đề và tin nhắn, nhưng hiện chưa lưu loại tài nguyên thư viện/mã mục trước đó hoặc mã lượt làm bài cần xem lại dưới dạng các trường có cấu trúc.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Hệ thống PHẢI yêu cầu mã truy cập hợp lệ lấy từ cookie và một phiên đăng nhập đang hoạt động cho tất cả điểm cuối của trợ lý.
- **FR-002**: Hệ thống PHẢI giới hạn các điểm cuối của trợ lý cho người dùng đã xác thực có vai trò `student`.
- **FR-003**: Giao diện PHẢI hiển thị lời nhắc đăng nhập cho khách, ẩn tiện ích trên các tuyến của bài thi đang diễn ra và duy trì mã cuộc hội thoại thuộc quyền sở hữu khi bảng trò chuyện được đóng rồi mở lại.
- **FR-004**: Phía máy chủ PHẢI từ chối các yêu cầu trò chuyện có ngữ cảnh khai báo `active-test`, độc lập với quy tắc hiển thị của phía giao diện.
- **FR-005**: Hệ thống PHẢI xác thực tin nhắn không rỗng và dài tối đa 2000 ký tự, loại trang được cho phép, ngữ cảnh tùy chọn đã chuẩn hóa và mã cuộc hội thoại UUID tùy chọn.
- **FR-006**: Hai điểm cuối trò chuyện PHẢI áp dụng giới hạn 30 yêu cầu trên mỗi IP trong một phút và từ chối yêu cầu vượt giới hạn trước khi bộ điều khiển xử lý.
- **FR-007**: Hệ thống PHẢI phân biệt lời chào, điều hướng, kiến thức IELTS, tra cứu bài thi, tra cứu tài nguyên, xem lại sau bài thi, ngoài phạm vi, yêu cầu làm rõ và yêu cầu không xác định; các giá trị ý định nội bộ đã khai báo nhưng hiện không được bất kỳ nhánh định tuyến nào trả về KHÔNG ĐƯỢC mô tả trong tài liệu như kết quả công khai có thể đạt tới.
- **FR-008**: Khi định tuyến xác định trước trả về không xác định, hệ thống PHẢI chỉ truyền phần hội thoại gần đây không đáng tin cậy đã được giới hạn và các gợi ý định tuyến do máy chủ suy ra cho bộ phân loại phạm vi, đồng thời chuyển sang yêu cầu làm rõ nếu bộ phân loại gặp lỗi.
- **FR-009**: Hệ thống PHẢI trả lời lời chào, thao tác tùy chọn, yêu cầu làm rõ an toàn và điều hướng tĩnh mà không gọi nhà cung cấp câu trả lời.
- **FR-010**: Hệ thống PHẢI truy xuất các đoạn kiến thức IELTS tĩnh có giới hạn cho yêu cầu kiến thức phù hợp và CÓ THỂ sử dụng kiến thức mô hình an toàn về IELTS/tiếng Anh nói chung khi không có đoạn nào khớp.
- **FR-011**: Đối với phản hồi kiến thức không hợp lệ, hệ thống PHẢI thử lại tối đa một lần ở chế độ văn bản thuần; lỗi truyền tải/cấu hình của nhà cung cấp PHẢI sử dụng phương án dự phòng kiến thức xác định trước mà không chuyển đổi nhà cung cấp.
- **FR-012**: Phương án dự phòng kiến thức xác định trước PHẢI hỗ trợ Skimming, Scanning, sự kết hợp của hai kỹ năng này, phần tổng quan Writing Task 1, Speaking Part 2 và Reading; kỹ năng không khớp sử dụng phản hồi chung an toàn.
- **FR-013**: Việc tra cứu bài thi PHẢI chỉ sử dụng các bản ghi đã xuất bản từ danh mục bài thi, áp dụng bộ lọc phù hợp trước khi giới hạn, xếp hạng kết quả và chỉ hiển thị liên kết nội bộ được tạo từ các bản ghi trả về.
- **FR-014**: Việc tra cứu tài nguyên PHẢI chỉ sử dụng các bản ghi đã xuất bản từ danh mục thư viện và KHÔNG ĐƯỢC kích hoạt chỉ vì học viên đang xem trang Library.
- **FR-015**: Phản hồi tra cứu PHẢI chỉ nêu tên các mục được cơ sở dữ liệu trả về; kết quả rỗng hoặc không có căn cứ PHẢI được thay bằng phản hồi xác định trước về việc không có kết quả hoặc phản hồi có căn cứ từ cơ sở dữ liệu.
- **FR-016**: Việc xem lại sau bài thi PHẢI yêu cầu mã lượt làm bài thuộc quyền sở hữu được cung cấp trong yêu cầu, lượt làm bài đã nộp, câu hỏi có thể nhận diện và ngữ cảnh đáp án/lời giải thích chính thức.
- **FR-017**: Các lớp bảo vệ PHẢI chạy trước quy trình xử lý của trợ lý và chặn việc sử dụng trong bài thi đang diễn ra, chấm điểm Writing/Speaking cá nhân, bịa nội dung chính thức, trích xuất dữ liệu riêng tư/nội bộ, các yêu cầu ngoài phạm vi đã chỉ định và yêu cầu đáp án/gợi ý sớm.
- **FR-018**: Việc tự kiểm tra phản hồi PHẢI từ chối dự đoán band điểm cá nhân, tuyên bố chấm điểm Writing/Speaking, nội dung chính thức giả, rò rỉ câu lệnh hệ thống và liên kết ngoài không an toàn.
- **FR-019**: Các lượt trao đổi thành công NÊN được lưu dưới dạng một tin nhắn người dùng và một tin nhắn trợ lý trong cuộc hội thoại đang hoạt động thuộc quyền sở hữu khi lược đồ trợ lý hội thoại khả dụng.
- **FR-020**: Việc xác định cuộc hội thoại, chèn tin nhắn, lấy lịch sử gần đây, truy cập tùy chọn và cập nhật đánh giá PHẢI bị giới hạn theo học viên đã xác thực và một cuộc hội thoại đang hoạt động.
- **FR-021**: Các thao tác cách xưng hô mong muốn PHẢI hỗ trợ thiết lập, gọi lại và xóa bằng tiếng Việt lẫn tiếng Anh; áp dụng giới hạn 60 ký tự/8 từ; loại bỏ các hậu tố lịch sự được hỗ trợ; và từ chối nội dung giống chỉ dẫn.
- **FR-022**: Việc xác định tên dùng trong lời chào PHẢI ưu tiên tùy chọn có cấu trúc của cuộc hội thoại đang hoạt động, sau đó là tên hồ sơ/tài khoản hợp lệ, tiếp theo là các giá trị siêu dữ liệu/tên người dùng an toàn và cuối cùng là cách gọi chung `bạn`; giá trị có dạng địa chỉ thư điện tử KHÔNG ĐƯỢC dùng làm tên.
- **FR-023**: Điểm cuối luồng SSE PHẢI xác thực danh tính, xác thực dữ liệu và chạy các lớp bảo vệ trước tiêu đề SSE; sau khi hoàn thành kết quả và cố gắng lưu theo cơ chế nỗ lực tối đa, điểm cuối PHẢI phát sự kiện bắt đầu, một phần dữ liệu chứa câu trả lời cuối cùng và sự kiện hoàn tất, hoặc phát sự kiện lỗi nếu tiêu đề đã được gửi.
- **FR-024**: Trình khách luồng SSE phía giao diện PHẢI xử lý khung cuối còn trong bộ đệm tại EOF và KHÔNG ĐƯỢC tự động gửi lại một yêu cầu luồng không chắc chắn thông qua điểm cuối JSON.
- **FR-025**: Việc lựa chọn nhà cung cấp PHẢI tuân theo nhà cung cấp được chỉ định rõ; nếu không có thì ưu tiên Gemini đã cấu hình cho tác vụ trợ lý, cô lập mô hình riêng của từng nhà cung cấp và chỉ gửi khóa Gemini trong tiêu đề HTTP `x-goog-api-key`.
- **FR-026**: Mọi lần gọi nhà cung cấp PHẢI ghi lại siêu dữ liệu sử dụng có giới hạn mà không lưu câu lệnh đầu vào, câu trả lời, khóa hoặc dữ liệu cá nhân không cần thiết dưới dạng thô trong nhật ký sử dụng.
- **FR-027**: Điểm cuối trạng thái được bảo vệ PHẢI trả về thông tin hoạt động tối thiểu và KHÔNG ĐƯỢC tiết lộ nhà cung cấp, mô hình, mô hình được yêu cầu/thực tế, tên khóa, khóa hoặc cấu hình môi trường.
- **FR-028**: Tính năng KHÔNG ĐƯỢC thực hiện chấm điểm Writing/Speaking chính thức, thay thế quy trình của giảng viên, tiết lộ đáp án của bài thi đang diễn ra, làm lộ bản ghi chưa xuất bản/riêng tư hoặc bổ sung cơ chế truy xuất dựa trên vectơ/phép nhúng.

### Các thực thể chính

- **Cuộc hội thoại với trợ lý**: Cuộc hội thoại thuộc sở hữu của học viên, có mã định danh, cách xưng hô mong muốn tùy chọn, thời gian bắt đầu và thời gian kết thúc tùy chọn.
- **Tin nhắn trợ lý**: Tin nhắn của người dùng hoặc trợ lý thuộc một cuộc hội thoại, có nội dung, thời gian, số `token` tùy chọn và dữ liệu đánh giá tùy chọn.
- **Bản ghi sử dụng AI**: Siêu dữ liệu về một lần gọi nhà cung cấp, bao gồm ngữ cảnh tính năng/thực thể, nhà cung cấp/mô hình, số `token` nếu có, trạng thái thành công/lỗi và độ trễ.
- **Bài thi đã xuất bản**: Một mục trong danh mục bài thi chỉ có thể được đề xuất khi đã xuất bản và có thể được lọc theo tiêu đề, mô tả, kỹ năng, độ khó cùng các trường tra cứu được hỗ trợ.
- **Tài nguyên thư viện đã xuất bản**: Một mục trong thư viện chỉ có thể được đề xuất khi đã xuất bản và có thể được lọc theo tiêu đề, mô tả, loại tài nguyên, danh mục nếu có và các cụm từ tìm kiếm.
- **Lượt làm bài**: Lượt làm bài thuộc sở hữu của học viên, có trạng thái nộp quyết định việc xem lại có được phép hay không.
- **Câu hỏi và đáp án đã nộp**: Nội dung câu hỏi chính thức, đáp án học viên đã nộp, đáp án đúng và lời giải thích hiện có được dùng làm căn cứ cho phần giải thích khi xem lại.
- **Phiên học viên đã xác thực**: Phiên đăng nhập và danh tính học viên đã xác minh được dùng để giới hạn phạm vi của mọi thao tác trợ lý.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả có thể đo lường

- **SC-001**: 100% yêu cầu hợp lệ từ người chưa xác thực và người không có vai trò học viên bị từ chối trước khi tạo cuộc hội thoại, tra cứu nội dung hoặc gọi nhà cung cấp câu trả lời.
- **SC-002**: 100% yêu cầu khai báo ngữ cảnh bài thi đang diễn ra bị từ chối trước khi SSE bắt đầu và trước mọi lần gọi nhà cung cấp câu trả lời hoặc lưu tin nhắn.
- **SC-003**: 100% tiêu đề và liên kết bài thi/tài nguyên được hiển thị bắt nguồn từ kết quả tra cứu đã xuất bản; không chấp nhận bất kỳ mục danh mục hoặc liên kết ngoài bịa đặt nào.
- **SC-004**: 100% câu trả lời xem lại yêu cầu một lượt làm bài đã nộp thuộc quyền sở hữu và dữ liệu câu hỏi chính thức; các trường hợp thuộc người khác, chưa nộp hoặc thiếu lời giải thích không được bịa đặt hoặc làm lộ đáp án.
- **SC-005**: Lỗi nhà cung cấp/cấu hình đối với câu hỏi kiến thức trong phạm vi tạo ra phản hồi xác định trước an toàn thay vì HTTP 500 chưa xử lý hoặc cấu hình bị rò rỉ.
- **SC-006**: Các thao tác thiết lập, gọi lại và xóa một cách xưng hô hợp lệ hoàn tất mà không gọi nhà cung cấp câu trả lời và không bao giờ vượt qua ranh giới quyền sở hữu cuộc hội thoại hoặc tài khoản.
- **SC-007**: Việc đóng/mở lại bảng trò chuyện và tải lại lịch sử duy trì cuộc hội thoại hiện hành thuộc quyền sở hữu, trong khi thay đổi người dùng sẽ xóa tính liên tục của cuộc hội thoại phía trình khách.
- **SC-008**: Bộ kiểm thử hành vi trên môi trường thực tế chứa chính xác 561 ca duy nhất, liên tục (`TC-001` đến `TC-561`), và mọi kiểm thử hồi quy trợ lý tự động được chọn đều vượt qua trước khi phát hành; các ca trên môi trường thực tế vẫn được đánh dấu rõ là đang chờ cho đến khi được thực thi.

## Các giả định

- Tính năng tái sử dụng hạ tầng cookie/JWT và phiên hoạt động hiện có của dự án; không đưa vào phương thức xác thực mới.
- Việc hỗ trợ lược đồ trợ lý hội thoại PostgreSQL phụ thuộc vào tệp di trú `024_create_chatbot_history_tables.sql` được áp dụng trong từng môi trường đích. Tệp di trú tồn tại trong kho mã nguồn; sự hiện diện trong kho mã không chứng minh rằng nó đã được áp dụng trên môi trường.
- Cho đến khi lược đồ đó khả dụng, việc lưu tin nhắn thành công được thực hiện theo cơ chế nỗ lực tối đa; phản hồi an toàn vẫn có thể được gửi với mã tin nhắn `null` khi không thể sử dụng kho lưu trữ.
- Khóa AI là tùy chọn đối với các luồng xác định trước/tức thời. Câu trả lời dựa trên nhà cung cấp cần một khóa được hỗ trợ và đã cấu hình, trong khi yêu cầu kiến thức được hỗ trợ sẽ chuyển sang phương án dự phòng an toàn khi thiếu cấu hình.
- Nguồn kiến thức hiện tại là cơ sở kiến thức JSON tĩnh có quản lý phiên bản kết hợp với kiến thức mô hình có giới hạn; tìm kiếm dựa trên vectơ và phép nhúng nằm ngoài phạm vi.
- Cách xưng hô mong muốn nằm trong phạm vi cuộc hội thoại, không phải tùy chọn hồ sơ dài hạn dùng xuyên nhiều cuộc hội thoại.
- Các câu hỏi tiếp nối về việc xem lại dựa vào ngữ cảnh trang phía giao diện hiện tại để tiếp tục cung cấp mã lượt làm bài.
- Phía máy chủ hiện tin cậy giá trị `pageType` đã qua kiểm tra dữ liệu được gửi trong ngữ cảnh yêu cầu để áp dụng lớp bảo vệ bài thi đang diễn ra; việc xác minh lượt làm bài đang hoạt động do máy chủ suy ra không thuộc tính năng này.
- SSE hiện truyền câu trả lời cuối cùng đã chuẩn hóa thay vì từng `token` từ nhà cung cấp.
