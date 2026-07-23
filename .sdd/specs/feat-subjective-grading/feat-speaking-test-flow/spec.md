# Đặc tả tính năng: Luồng thi và nộp bài Speaking 3 Parts

**Ngày tạo**: 2026-07-23

**Trạng thái**: Bản nháp

**Đầu vào**: Phân rã từ `feat-subjective-grading`; AI Engine/Pipeline (ASR, Audio evidence, Async Worker) thuộc phạm vi `ai-fast-grading`.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Học viên thực hiện thu âm 3 Part Speaking (Ưu tiên: P1)

Là học viên, tôi muốn trải nghiệm luồng thi Speaking chuẩn IELTS gồm 3 phần (Part 1: Trả lời câu hỏi ngắn, Part 2: Đọc Cue Card và nói liên tục 2 phút sau 1 phút chuẩn bị, Part 3: Thảo luận chuyên sâu) với giao diện thu âm trực quan, bộ đếm thời gian cho từng câu/part và đếm ngược tổng để tôi hoàn thành bài nói của mình.

**Lý do ưu tiên**: Thu âm đủ 3 Part Speaking là điều kiện tiên quyết bắt buộc để có dữ liệu đầu vào cho việc chấm điểm (cả AI và Tutor).

**Kiểm thử độc lập**: Mở đề Speaking trên trình duyệt, trải nghiệm từ màn hình Intro qua Part 1, Part 2, Part 3; thu âm trực tiếp từng part, xác minh âm thanh được ghi thành công và tải lên kho lưu trữ tạm thời (`speaking/{userId}/`).

**Kịch bản chấp nhận**:

1. **Cho trước** học viên mở đề thi Speaking hợp lệ, **khi** học viên bắt đầu, **thì** màn hình hướng dẫn xuất hiện cho phép học viên kiểm tra micro và xem tổng quan thông tin đề thi.
2. **Cho trước** học viên ở Part 1 hoặc Part 3, **khi** câu hỏi hiển thị, **thì** bộ đếm ngược theo câu đếm chính xác; hết giờ tự động chuyển câu hỏi tiếp theo mà không ngắt đoạn âm thanh đang thu.
3. **Cho trước** học viên ở Part 2, **khi** bước vào chuẩn bị, **thì** có 60 giây chuẩn bị kèm hiển thị bài nói mẫu/cue card; hết 60 giây tự động chuyển sang 120 giây thu âm bài nói chính.
4. **Cho trước** học viên hoàn thành thu âm một Part, **khi** file audio được tạo xong ở trình duyệt, **thì** hệ thống tự động tải file lên qua API `POST /api/v1/submissions/speaking/upload` và nhận lại `temp_s3_key`.

---

### Câu chuyện người dùng 2 — Nộp bài thi Speaking trọn bộ 3 Parts và chọn người chấm (Ưu tiên: P1)

Là học viên, tôi muốn nộp bài thi Speaking với đúng 3 phần đã thu âm và lựa chọn `AI chấm điểm` hoặc `Giảng viên chấm` tại màn hình tổng kết để hệ thống xử lý theo đúng nguyện vọng.

**Lý do ưu tiên**: Việc nộp nguyên tử 3 Parts cùng quyết định `grader` quyết định bài thi đi vào luồng chấm AI bất đồng bộ hay hàng đợi chấm thủ công của Tutor.

**Kiểm thử độc lập**: Thu âm xong 3 Parts, tại màn hình Summary chọn `grader = ai` và xác nhận nộp, kiểm tra API `POST /api/v1/submissions/speaking/full` lưu 3 bản ghi `speaking_submissions` cùng `speaking_group_id` và kích hoạt công việc chấm AI.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên hoàn thành cả 3 Parts với 3 khóa tạm `temp_s3_key`, **khi** chọn `AI chấm điểm` và xác nhận nộp, **thì** hệ thống xác minh tính hợp lệ của 3 file audio (`speaking/{userId}/`), lưu 3 bản ghi trong 1 DB transaction với `speaking_group_id` duy nhất và khởi tạo công việc chấm AI.
2. **Cho trước** học viên hoàn thành cả 3 Parts, **khi** chọn `Giảng viên chấm` và nộp bài, **thì** hệ thống lưu 3 bản ghi với `grader = 'tutor'` và `status = 'pending'`, bài hiển thị trong hàng đợi bài chờ chấm của Tutor.
3. **Cho trước** request nộp bài thiếu Part (ít hơn 3 parts) hoặc trùng lặp part, **khi** nộp đến API `/speaking/full`, **thì** hệ thống từ chối với lỗi 400 Bad Request.
4. **Cho trước** đường dẫn file audio chứa đường dẫn bất hợp pháp (path traversal `..` hoặc không bắt đầu bằng `speaking/{userId}/`), **khi** nộp, **thì** hệ thống từ chối ngay lập tức để bảo vệ an toàn hệ thống.

---

### Câu chuyện người dùng 3 — Màn hình xác nhận nộp bài và chuyển tiếp kết quả (Ưu tiên: P2)

Là học viên sau khi nộp thành công bài Speaking, tôi muốn nhận được màn hình thông báo kết quả nộp thành công rõ ràng và có thể chuyển hướng về trang danh sách hoặc xem lịch sử bài nộp.

**Lý do ưu tiên**: Đảm bảo trải nghiệm người dùng không bị hẫng hoặc hoang mang sau khi gửi bài nộp bất đồng bộ.

**Kiểm thử độc lập**: Nộp bài Speaking thành công, xác minh giao diện chuyển sang màn hình thông báo hoàn thành với biểu tượng tích xanh, hướng dẫn kiểm tra kết quả trong lịch sử.

**Kịch bản chấp nhận**:

1. **Cho trước** API nộp bài trả về thành công, **khi** màn hình kết thúc hiển thị, **thì** xuất hiện biểu tượng xác nhận thành công cùng thông điệp "Bài đã được nộp" bằng tiếng Việt.
2. **Cho trước** bài nộp được chọn `AI chấm điểm`, **khi** AI hoàn tất phân tích bất đồng bộ, **thì** kết quả cập nhật trạng thái `ai_graded` và học viên có thể xem 4 tiêu chí trong trang lịch sử.
3. **Cho trước** bài nộp gặp lỗi AI trong quá trình phân tích, **khi** xử lý, **thì** bài nộp vẫn được giữ nguyên trong cơ sở dữ liệu và KHÔNG tự động chuyển sang hàng đợi giáo viên.

---

### Trường hợp biên

- File thu âm audio bị hỏng hoặc rỗng (kích thước 0 byte).
- Đóng hoặc làm mới trình duyệt giữa các Part (hệ thống hủy phiên thu âm chưa hoàn tất).
- Quyền micro bị từ chối trên trình duyệt của học viên.
- Gọi endpoint legacy `POST /speaking` (1 part) với `grader = ai` (hệ thống từ chối và yêu cầu dùng `/speaking/full`).
- Mã `test_id` không tồn tại hoặc sai định dạng UUID.
- Gián đoạn kết nối internet khi tải file audio tạm thời.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Giao diện thi Speaking PHẢI quản lý luồng 3 Parts theo mô hình trạng thái (Intro → Part 1 → Part 2 → Part 3 → Summary → Result).
- **FR-002**: Trình thu âm `ExamRecorder` PHẢI tự động tải file âm thanh lên qua `POST /api/v1/submissions/speaking/upload` và nhận `temp_s3_key`.
- **FR-003**: API Upload audio PHẢI lưu file vào đường dẫn an toàn `speaking/{userId}/{uuid}.{ext}` trong kho lưu trữ.
- **FR-004**: Part 1 và Part 3 PHẢI hỗ trợ danh sách câu hỏi với bộ đếm ngược từng câu; bấm "Hoàn thành sớm" PHẢI cho phép nhảy sang câu tiếp theo mà không dừng ghi âm toàn Part.
- **FR-005**: Part 2 PHẢI đếm ngược 60 giây thời gian chuẩn bị kèm nội dung Cue Card, sau đó tự động chuyển sang 120 giây thời gian nói.
- **FR-006**: Màn hình Summary PHẢI hiển thị danh sách 3 Parts đã thu âm và cho phép học viên chọn người chấm (`grader = ai` hoặc `grader = tutor`).
- **FR-007**: API nộp bài `POST /api/v1/submissions/speaking/full` PHẢI yêu cầu mảng `parts` có đúng 3 phần (`parts.length === 3`).
- **FR-008**: Backend PHẢI xác minh mọi đường dẫn `temp_s3_key` bắt đầu bằng `speaking/{userId}/` và không chứa ký tự bất hợp pháp (`..`).
- **FR-009**: Backend PHẢI lưu 3 bản ghi `speaking_submissions` trong cùng 1 DB transaction với chung một `speaking_group_id`.
- **FR-010**: Endpoint legacy `POST /api/v1/submissions/speaking` PHẢI từ chối nếu `grader = ai` và yêu cầu học viên nộp đủ 3 phần qua endpoint full.
- **FR-011**: Nếu `grader = ai`, backend PHẢI kích hoạt luồng chấm AI Speaking (từ `ai-fast-grading`); lỗi AI KHÔNG được xóa bài nộp hoặc chuyển tự động sang tutor.
- **FR-012**: Nếu `grader = tutor`, 3 bản ghi PHẢI giữ `status = 'pending'` để xuất hiện trong hàng đợi chấm thủ công của Tutor.
- **FR-013**: Backend PHẢI validate `test_id` tùy chọn — nếu cung cấp thì phải tồn tại trong `mock_tests`.
- **FR-014**: Mọi API response PHẢI tuân thủ cấu trúc envelope `{ success, data, error, meta }`.
- **FR-015**: Màn hình hoàn thành PHẢI hiển thị thông báo tiếng Việt rõ ràng, cung cấp nút quay lại danh sách đề thi Speaking.

### Thực thể chính

- **Bài nộp Speaking (speaking_submissions)**: Chứa `user_id`, `test_id`, `part_number` (1, 2, 3), `prompt_text`, `audio_url`, `transcript`, `grader`, `status`, `speaking_group_id`.
- **Đề thi Speaking (mock_tests)**: Đề thi kỹ năng `speaking` chứa 3 phần (passages/parts) và danh sách câu hỏi.
- **Báo cáo AI (ai_grading_reports)**: Kết quả đánh giá 4 tiêu chí IELTS Speaking (Fluency, Lexical, Grammar, Pronunciation), được tạo bởi `ai-fast-grading`.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả đo lường được

- **SC-001**: 100% bài nộp Speaking full thành công PHẢI có đủ 3 bản ghi (Part 1, 2, 3) chia sẻ cùng một `speaking_group_id`.
- **SC-002**: 100% request nộp audio có đường dẫn không thuộc về `speaking/{userId}/` PHẢI bị từ chối với mã lỗi 400.
- **SC-003**: 100% request nộp Speaking thiếu Part (dưới 3 parts) đến `/speaking/full` PHẢI bị từ chối ngay lập tức.
- **SC-004**: 100% bài nộp với `grader = tutor` KHÔNG kích hoạt dịch vụ AI và xuất hiện chính xác trong hàng đợi Tutor.
- **SC-005**: 100% bài nộp chọn `grader = ai` khi xảy ra lỗi provider vẫn bảo tồn bài nộp trong DB và ghi nhận trạng thái lỗi công khai.
- **SC-006**: Thời gian phản hồi của API nộp bài `/speaking/full` (enqueue/trigger async) PHẢI dưới 1 giây ở điều kiện baseline.

## Giả định và phụ thuộc

- Đã có bảng `speaking_submissions`, `ai_grading_reports`, `mock_tests` trong CSDL với cột `speaking_group_id`.
- Dịch vụ chấm AI Speaking (`gradeSpeakingGroup`) thuộc phạm vi `ai-fast-grading` đã sẵn sàng.
- Kho lưu trữ Supabase Storage / S3 riêng tư đã sẵn sàng cho file audio.
- Middleware `authenticate` cung cấp `req.user.id`.
- Frontend xây dựng bằng React 18 + Bootstrap 5 theo Hiến pháp.

## Ngoài phạm vi

- Thuật toán ASR/Speech-to-text và AI Scoring Engine nội bộ — thuộc `ai-fast-grading`.
- Hàng đợi và không gian chấm của Tutor — thuộc `feat-tutor-grading-workspace`.
- Trang tra cứu lịch sử và báo cáo kết quả chi tiết — thuộc `feat-student-feedback-history`.
- Luồng thi và nộp bài Writing — thuộc `feat-writing-test-flow`.
