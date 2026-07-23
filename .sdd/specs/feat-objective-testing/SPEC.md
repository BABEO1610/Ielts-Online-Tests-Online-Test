# Feature Specification: Thi Trắc Nghiệm (feat-objective-testing)

**Feature Branch**: `[feat-objective-testing]`

**Created**: 2026-07-24

**Status**: Completed

**Input**: Bối cảnh dự án IELTSZone. Yêu cầu tách 4 luồng chính: Giao diện Listening, Giao diện Reading, Auto-grading Engine, History & Retrieval. Đã cập nhật theo source code thực tế.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Giao diện thi Listening (Priority: P1)

Là một học viên, tôi muốn có một giao diện làm bài thi Listening với Audio Player không tự động chuyển bài, và danh sách câu hỏi rõ ràng, để tôi có thể nghe và chọn đáp án dễ dàng.

**Why this priority**: Luồng chính để học viên trải nghiệm chức năng cốt lõi của website luyện thi IELTS.

**Independent Test**: Có thể kiểm thử giao diện tĩnh và tương tác chọn đáp án thông qua local state mà không cần gọi API nộp bài.

**Acceptance Scenarios**:

1. **Given** học viên bắt đầu bài thi Listening, **When** học viên nhấn "Play" audio, **Then** audio phát bình thường và học viên có thể chọn đáp án ở các câu hỏi bên dưới (state được lưu cục bộ trong component).
2. **Given** thời gian đếm ngược về `00:00`, **When** hết giờ, **Then** hệ thống tự động gọi API `/api/v1/tests/:id/attempts` để submit bài.

---

### User Story 2 - Giao diện thi Reading (Priority: P1)

Là một học viên, tôi muốn giao diện bài thi Reading được chia đôi màn hình (Split View), một bên là bài đọc, một bên là câu hỏi để không phải cuộn trang lên xuống liên tục.

**Why this priority**: Yêu cầu UI cốt lõi để đảm bảo UX cho dạng bài Reading IELTS dài.

**Independent Test**: Có thể kiểm thử bố cục Split View và thanh cuộn độc lập giữa 2 pane.

**Acceptance Scenarios**:

1. **Given** màn hình thi Reading, **When** cuộn văn bản bên trái, **Then** câu hỏi bên phải vẫn đứng yên.
2. **Given** học viên điền text vào câu hỏi điền khuyết (fill-in-blanks), **When** chuyển sang câu khác, **Then** nội dung đã điền được giữ lại trong state cục bộ của component.

---

### User Story 3 - Engine Chấm điểm Tự động (Priority: P1)

Là một hệ thống (Backend), tôi muốn tự động so khớp các câu trả lời của học viên với đáp án đúng, xử lý loại bỏ khoảng trắng, in hoa/thường, và quy đổi điểm thô ra Band Score IELTS Academic thông qua service `attempt.service.js`.

**Why this priority**: Cần thiết để sinh ra kết quả thi. Đây là trái tim của hệ thống đánh giá.

**Independent Test**: Có thể test API nộp bài bằng cách gửi 1 JSON chứa payload answers lên endpoint `/api/v1/tests/:id/attempts`.

**Acceptance Scenarios**:

1. **Given** đáp án đúng là "apples", **When** học viên nhập " Apples ", **Then** hệ thống chấm đúng (sau khi trim và lowerCase trong logic `normalizeAnswer`).
2. **Given** bài làm đúng 30/40 câu Reading, **When** tính điểm, **Then** hệ thống trả về Band Score 7.0.

---

### User Story 4 - Lịch sử và Tra cứu kết quả (Priority: P2)

Là một học viên, sau khi nộp bài xong, tôi muốn xem lại chi tiết bài làm của mình (câu đúng/sai, lời giải thích) và xem danh sách các bài thi đã làm trong trang Dashboard lịch sử.

**Why this priority**: Quan trọng để học viên tự học và rút kinh nghiệm, nhưng xếp sau luồng làm bài và chấm bài.

**Independent Test**: Test dựa trên data lưu sẵn ở bảng `test_attempts`.

**Acceptance Scenarios**:

1. **Given** học viên đã có 2 lần nộp bài, **When** vào trang Dashboard lịch sử, **Then** thấy danh sách 2 lượt thi với thời gian và điểm số.
2. **Given** học viên click vào chi tiết 1 bài thi, **When** xem danh sách câu hỏi, **Then** thấy highlight xanh cho câu đúng, đỏ cho câu sai kèm text giải thích.

---

### Edge Cases

- Hệ thống xử lý thế nào khi payload nộp bài bị thiếu field `answers`? -> Trả về `400 Bad Request` yêu cầu chuẩn JSON.
- Xử lý thế nào nếu Token hết hạn khi nộp bài? -> Block luồng và yêu cầu đăng nhập lại (được handle qua JWT middleware chung của hệ thống).
- (Lưu ý) Trạng thái hiện tại không có chức năng auto-save khi mất mạng, nếu refresh trang sẽ bị mất dữ liệu nháp đang làm.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST hỗ trợ giao diện làm bài Split View (Reading) và Single Scroll (Listening).
- **FR-002**: Hệ thống MUST có thanh điều hướng hiển thị trạng thái câu hỏi đã làm/chưa làm.
- **FR-003**: Hệ thống MUST tự động đếm ngược và gọi API `POST /api/v1/tests/:id/attempts` khi thời gian = 0.
- **FR-004**: Hệ thống MUST xử lý chấm điểm chuỗi (String Matching) linh hoạt cho dạng điền từ: loại bỏ khoảng trắng thừa, quy về chữ thường, lờ đi các dấu câu đặc biệt ở đầu/cuối (thực hiện ở `attempt.service.js`).
- **FR-005**: Hệ thống MUST chuyển đổi điểm raw (0-40) thành Band Score chuẩn IELTS (1.0 - 9.0) tùy theo kỹ năng Reading / Listening.
- **FR-006**: Hệ thống MUST lưu lại chi tiết câu trả lời của từng học viên vào cơ sở dữ liệu (bảng `test_attempts` và các bảng liên quan).

### Key Entities

- **`test_attempts`**: Đại diện cho 1 lượt làm bài của học viên (lưu thời gian bắt đầu, nộp bài, tổng điểm, band score).
- **`mock_tests`, `questions`**: Lấy read-only để lấy thông tin đề và cấu trúc đề.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: API chấm điểm (Auto-grading) trả về kết quả trong thời gian dưới 1 giây với payload 40 câu hỏi.
- **SC-002**: UI không bị giật lag khi chuyển đổi qua lại giữa 40 câu hỏi.
- **SC-003**: 100% các câu hỏi điền khuyết bị thừa khoảng trắng nhưng đúng từ vựng đều được hệ thống chấp nhận là đúng.

## Assumptions

- Hệ thống Auth đã hoạt động trơn tru (để cấp JWT token khi gọi API submit).
- Database đã có sẵn đầy đủ dữ liệu cấu trúc đề thi, câu hỏi và đáp án để module này gọi ra (được chuẩn bị từ `feat-content-builder`).
- Người dùng làm bài IELTS chủ yếu trên màn hình Tablet và Desktop.
