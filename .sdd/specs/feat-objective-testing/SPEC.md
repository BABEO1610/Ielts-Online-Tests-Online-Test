# Đặc tả Tính năng: Thi Trắc Nghiệm (feat-objective-testing)

**Nhánh Feature Branch**: `[feat-objective-testing]`

**Ngày tạo**: 2026-07-24

**Trạng thái**: Draft

**Đầu vào**: Bối cảnh dự án IELTSZone. Yêu cầu tách 4 luồng chính: Giao diện Listening, Giao diện Reading, Auto-grading Engine, History & Retrieval.

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(Bắt buộc)*

### Câu chuyện Người dùng 1 - Giao diện thi Listening (Ưu tiên: P1)

Là một học viên, tôi muốn có một giao diện làm bài thi Listening với Audio Player không tự động chuyển bài, và danh sách câu hỏi rõ ràng, để tôi có thể nghe và chọn đáp án dễ dàng.

**Lý do ưu tiên**: Luồng chính để học viên trải nghiệm chức năng cốt lõi của website luyện thi IELTS.

**Kiểm thử độc lập**: Có thể kiểm thử giao diện tĩnh và tương tác chọn đáp án mà không cần API chấm bài.

**Kịch bản nghiệm thu**:
1. **Cho trước** học viên bắt đầu bài thi Listening, **Khi** học viên nhấn "Play" audio, **Thì** audio phát bình thường và học viên có thể chọn đáp án ở các câu hỏi bên dưới.
2. **Cho trước** thời gian đếm ngược về `00:00`, **Khi** hết giờ, **Thì** hệ thống tự động khóa giao diện và submit bài.

---

### Câu chuyện Người dùng 2 - Giao diện thi Reading (Ưu tiên: P1)

Là một học viên, tôi muốn giao diện bài thi Reading được chia đôi màn hình (Split View), một bên là bài đọc, một bên là câu hỏi để không phải cuộn trang lên xuống liên tục.

**Lý do ưu tiên**: Yêu cầu UI cốt lõi để đảm bảo UX cho dạng bài Reading IELTS dài.

**Kiểm thử độc lập**: Có thể kiểm thử bố cục Split View và thanh cuộn độc lập giữa 2 pane.

**Kịch bản nghiệm thu**:
1. **Cho trước** màn hình thi Reading, **Khi** cuộn văn bản bên trái, **Thì** câu hỏi bên phải vẫn đứng yên.
2. **Cho trước** học viên điền text vào câu hỏi điền khuyết (fill-in-blanks), **Khi** chuyển sang câu khác, **Thì** nội dung đã điền được giữ lại.

---

### Câu chuyện Người dùng 3 - Engine Chấm điểm Tự động (Ưu tiên: P1)

Là một hệ thống (Backend), tôi muốn tự động so khớp các câu trả lời của học viên với đáp án đúng, xử lý loại bỏ khoảng trắng, in hoa/thường, và quy đổi điểm thô ra Band Score IELTS Academic.

**Lý do ưu tiên**: Cần thiết để sinh ra kết quả thi. Đây là trái tim của hệ thống đánh giá.

**Kiểm thử độc lập**: Có thể test hàm/module Auto-grading bằng cách truyền vào 1 JSON bài làm (mock data) và kiểm tra output JSON kết quả.

**Kịch bản nghiệm thu**:
1. **Cho trước** đáp án đúng là "apples", **Khi** học viên nhập " Apples ", **Thì** hệ thống chấm đúng (sau khi trim và lowerCase).
2. **Cho trước** bài làm đúng 30/40 câu Reading, **Khi** tính điểm, **Thì** hệ thống trả về Band Score 7.0.

---

### Câu chuyện Người dùng 4 - Lịch sử và Tra cứu kết quả (Ưu tiên: P2)

Là một học viên, sau khi nộp bài xong, tôi muốn xem lại chi tiết bài làm của mình (câu đúng/sai, lời giải thích) và xem danh sách các bài thi đã làm trong trang Dashboard lịch sử.

**Lý do ưu tiên**: Quan trọng để học viên tự học và rút kinh nghiệm, nhưng xếp sau luồng làm bài và chấm bài.

**Kiểm thử độc lập**: Test dựa trên data mock lưu sẵn ở bảng test_attempts.

**Kịch bản nghiệm thu**:
1. **Cho trước** học viên đã có 2 lần nộp bài, **Khi** vào trang Dashboard, **Thì** thấy danh sách 2 lượt thi với thời gian và điểm số.
2. **Cho trước** học viên click vào chi tiết 1 bài thi, **Khi** xem danh sách câu hỏi, **Thì** thấy highlight xanh cho câu đúng, đỏ cho câu sai kèm text giải thích.

---

### Các trường hợp ngoại lệ (Edge Cases)

- Điều gì xảy ra khi học viên mất kết nối mạng giữa chừng? -> Lưu tạm câu trả lời vào LocalStorage (auto-save mỗi 30s) và đồng bộ khi có mạng lại.
- Hệ thống xử lý thế nào khi payload nộp bài bị thiếu field? -> Trả về `400 Bad Request` yêu cầu chuẩn JSON.
- Xử lý thế nào nếu Token hết hạn khi nộp bài? -> Hiển thị pop-up nhỏ yêu cầu đăng nhập lại (giữ nguyên state bài làm) thay vì refresh trang.

## Yêu cầu (Requirements) *(Bắt buộc)*

### Yêu cầu chức năng (Functional Requirements)

- **FR-001**: Hệ thống MUST hỗ trợ giao diện làm bài Split View (Reading) và Single Scroll (Listening).
- **FR-002**: Hệ thống MUST có thanh điều hướng (40 ô tròn) hiển thị trạng thái câu hỏi đã làm/chưa làm.
- **FR-003**: Hệ thống MUST tự động đếm ngược và gọi API submit khi thời gian = 0.
- **FR-004**: Hệ thống MUST xử lý chấm điểm chuỗi (String Matching) linh hoạt cho dạng điền từ: loại bỏ khoảng trắng thừa, quy về chữ thường, lờ đi các dấu câu đặc biệt ở đầu/cuối.
- **FR-005**: Hệ thống MUST chuyển đổi điểm raw (0-40) thành Band Score chuẩn IELTS (1.0 - 9.0) tùy theo kỹ năng Reading (có thang Academic riêng) / Listening.
- **FR-006**: Hệ thống MUST lưu lại chi tiết câu trả lời của từng học viên (user_answers) vào cơ sở dữ liệu.

### Các thực thể chính (Key Entities)

- **`test_attempts`**: Đại diện cho 1 lượt làm bài của học viên (lưu thời gian bắt đầu, nộp bài, tổng điểm, band score).
- **`user_answers`**: Bảng liên kết lưu trữ đáp án chi tiết học viên nhập cho từng câu hỏi, kèm trạng thái đúng/sai.
- **`mock_tests`, `questions`**: Lấy read-only để lấy thông tin đề và cấu trúc đề.

## Tiêu chí Thành công (Success Criteria) *(Bắt buộc)*

### Kết quả đo lường được (Measurable Outcomes)

- **SC-001**: API chấm điểm (Auto-grading) trả về kết quả trong thời gian dưới 1 giây với payload 40 câu hỏi.
- **SC-002**: UI không bị giật lag khi chuyển đổi qua lại giữa 40 câu hỏi (Render tối ưu trên React).
- **SC-003**: 100% các câu hỏi điền khuyết bị thừa khoảng trắng nhưng đúng từ vựng đều được hệ thống chấp nhận là đúng.
- **SC-004**: Lưu trữ dữ liệu an toàn, đảm bảo nếu F5 lại trang lúc đang thi, dữ liệu nháp ở LocalStorage vẫn tự load lại.

## Giả định (Assumptions)

- Hệ thống Auth đã hoạt động trơn tru (để cấp JWT token khi gọi API submit).
- Database đã có sẵn đầy đủ dữ liệu cấu trúc đề thi, câu hỏi và đáp án để module này gọi ra (được chuẩn bị từ `feat-content-builder`).
- Người dùng làm bài IELTS chủ yếu trên màn hình Tablet và Desktop (Tạm không cần thiết kế layout tối ưu cho Mobile ở tính năng Split View).
