# Đặc tả tính năng: Luồng thi và nộp bài Speaking 3 Parts

**Ngày tạo**: 2026-07-23
**Trạng thái**: Nền tảng HIỆN CÓ; các cổng phát hành MỤC TIÊU vẫn còn mở
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cho phép học viên đã xác thực thực hiện buổi luyện Speaking hoàn chỉnh theo đúng cấu trúc IELTS 3 Part (Part 1: câu hỏi ngắn, Part 2: cue card + 1 phút chuẩn bị + 2 phút nói, Part 3: thảo luận chuyên sâu) với giao diện thu âm trực tiếp trên trình duyệt. Sau khi hoàn thành cả 3 Part, học viên chọn người chấm (AI hoặc Giảng viên) và nộp toàn bộ bài trong một thao tác nguyên tử. AI thất bại không xóa bài nộp và không tự động chuyển bài sang hàng đợi Giảng viên.

## 2. Phạm vi

- Giao diện thi Speaking theo mô hình trạng thái: Intro → Part 1 → Part 2 → Part 3 → Summary → Result.
- Thu âm trực tiếp trên trình duyệt, tự động tải file âm thanh lên kho lưu trữ tạm thời riêng tư sau mỗi Part.
- Bộ đếm thời gian theo Part và theo từng câu hỏi (Part 1 và 3), bộ đếm ngược chuẩn bị và thu âm (Part 2).
- Màn hình Summary: hiển thị 3 Part đã thu âm, cho phép chọn người chấm (`grader = 'ai'` hoặc `grader = 'tutor'`).
- Nộp bài nguyên tử 3 Part trong một DB transaction với `speaking_group_id` chung.
- Xác minh bảo mật đường dẫn audio: ngăn path traversal, chỉ chấp nhận đường dẫn thuộc sở hữu học viên đó.

## 3. Ngoài phạm vi

- Thuật toán ASR/Speech-to-text và AI Scoring Engine nội bộ — thuộc `ai-fast-grading`.
- Hàng đợi và không gian chấm của Giảng viên — thuộc `feat-tutor-grading-workspace`.
- Trang tra cứu lịch sử và báo cáo kết quả chi tiết — thuộc `feat-student-feedback-history`.
- Luồng thi và nộp bài Writing — thuộc `feat-writing-test-flow`.
- Endpoint legacy 1 Part Speaking (`POST /speaking`) với `grader = 'ai'` — bị từ chối và yêu cầu dùng endpoint full.
- Chính sách lưu giữ/xóa file audio — chưa được quyết định sản phẩm.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Thu âm, tải file audio lên kho tạm thời, nộp phiên Speaking đầy đủ 3 Part, xem xác nhận nộp. |
| Khách/chưa đăng nhập | Xem đề thi (nếu công bố), bị điều hướng đến trang đăng nhập khi bấm bắt đầu. |
| Giảng viên/Admin | Không có tác nhân trực tiếp trong luồng nộp bài này. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Học viên thực hiện thu âm 3 Part Speaking (Ưu tiên: P1)

Với tư cách học viên, tôi muốn trải nghiệm luồng thi Speaking chuẩn IELTS gồm 3 phần với giao diện thu âm trực quan, bộ đếm thời gian cho từng câu/part và đếm ngược tổng để tôi hoàn thành bài nói của mình.

**Kiểm thử độc lập**: Mở đề Speaking trên trình duyệt, trải nghiệm từ màn hình Intro qua Part 1, Part 2, Part 3; thu âm từng part, xác minh file audio được ghi thành công và tải lên kho lưu trữ tạm thời an toàn thuộc đường dẫn `speaking/{userId}/`.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên mở đề thi Speaking hợp lệ, **Khi** học viên bắt đầu, **Thì** màn hình hướng dẫn xuất hiện cho phép học viên kiểm tra micro và xem tổng quan thông tin đề thi.
2. **Cho trước** học viên ở Part 1 hoặc Part 3, **Khi** câu hỏi hiển thị, **Thì** bộ đếm ngược theo câu đếm chính xác; hết giờ tự động chuyển câu hỏi tiếp theo mà không ngắt đoạn audio đang ghi.
3. **Cho trước** học viên ở Part 2, **Khi** bước vào chuẩn bị, **Thì** có 60 giây chuẩn bị kèm hiển thị Cue Card; hết 60 giây tự động chuyển sang 120 giây thu âm bài nói chính.
4. **Cho trước** học viên hoàn thành thu âm một Part, **Khi** file audio được tạo xong ở trình duyệt, **Thì** hệ thống tự động tải file lên và nhận lại token xác nhận (`upload_token`) để dùng khi nộp bài full.

### Câu chuyện 2 — Nộp bài thi Speaking trọn bộ 3 Parts và chọn người chấm (Ưu tiên: P1)

Với tư cách học viên, tôi muốn nộp bài thi Speaking với đúng 3 phần đã thu âm và lựa chọn `AI chấm điểm` hoặc `Giảng viên chấm` tại màn hình tóm tắt.

**Kiểm thử độc lập**: Thu âm xong 3 Parts, tại màn hình Summary chọn `grader = ai` và xác nhận nộp, kiểm tra API `POST /api/v1/submissions/speaking/full` lưu 3 bản ghi `speaking_submissions` cùng `speaking_group_id` và kích hoạt công việc chấm AI. Xác minh request nộp thiếu Part nhận lỗi 400.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên hoàn thành cả 3 Parts với 3 upload token hợp lệ, **Khi** chọn `AI chấm điểm` và xác nhận nộp, **Thì** hệ thống xác minh tính hợp lệ của 3 file audio, lưu 3 bản ghi trong 1 DB transaction với `speaking_group_id` duy nhất và khởi tạo công việc chấm AI.
2. **Cho trước** học viên hoàn thành cả 3 Parts, **Khi** chọn `Giảng viên chấm` và nộp bài, **Thì** hệ thống lưu 3 bản ghi với `grader = 'tutor'` và `status = 'pending'`, bài hiển thị trong hàng đợi Giảng viên, không gọi AI.
3. **Cho trước** request nộp bài thiếu Part (ít hơn 3 parts) hoặc trùng lặp part number, **Khi** nộp đến API `/speaking/full`, **Thì** hệ thống từ chối với lỗi 400 Bad Request.
4. **Cho trước** đường dẫn file audio chứa ký tự bất hợp pháp (`..` hoặc không bắt đầu bằng đường dẫn thuộc sở hữu học viên), **Khi** nộp, **Thì** hệ thống từ chối ngay lập tức.

### Câu chuyện 3 — Màn hình xác nhận nộp bài và chuyển tiếp kết quả (Ưu tiên: P2)

Với tư cách học viên sau khi nộp thành công bài Speaking, tôi muốn nhận màn hình thông báo kết quả nộp thành công rõ ràng và có thể chuyển hướng về trang danh sách hoặc xem lịch sử bài nộp.

**Kiểm thử độc lập**: Nộp bài Speaking thành công, xác minh giao diện chuyển sang màn hình thông báo hoàn thành với biểu tượng tích xanh và thông điệp tiếng Việt rõ ràng.

**Kịch bản chấp nhận**:

1. **Cho trước** API nộp bài trả về thành công, **Khi** màn hình kết thúc hiển thị, **Thì** xuất hiện biểu tượng xác nhận thành công cùng thông điệp "Bài đã được nộp thành công" và nút điều hướng về danh sách đề thi Speaking.
2. **Cho trước** bài nộp được chọn `AI chấm điểm` và AI xảy ra lỗi trong quá trình xử lý, **Khi** xử lý thất bại, **Thì** bài nộp vẫn được giữ nguyên trong cơ sở dữ liệu và KHÔNG tự động chuyển sang hàng đợi Giảng viên.

## 6. Trường hợp biên

- File thu âm audio bị hỏng hoặc rỗng (kích thước 0 byte) — bị từ chối khi xác minh phía server.
- Đóng hoặc làm mới trình duyệt giữa các Part — phiên thu âm chưa hoàn tất bị hủy; học viên phải bắt đầu lại từ đầu.
- Quyền micro bị từ chối trên trình duyệt — giao diện hiển thị hướng dẫn bật lại quyền; không báo lỗi kỹ thuật khó hiểu.
- Gọi endpoint legacy `POST /speaking` với `grader = 'ai'` — hệ thống từ chối và yêu cầu dùng `/speaking/full`.
- `test_id` không tồn tại hoặc sai định dạng UUID — trả lỗi 400.
- Gián đoạn kết nối internet khi tải file audio tạm thời — client thông báo lỗi; audio đã thu chưa được lưu phải thu lại.

## 7. Quy tắc nghiệp vụ

- **BR-STF-001 [AS-BUILT]**: Chỉ học viên đã xác thực mới có thể tải audio lên và nộp bài Speaking; `user_id` được lấy từ `req.user.id`.
- **BR-STF-002 [AS-BUILT]**: Một phiên Speaking hoàn chỉnh chứa đúng một Part 1, một Part 2 và một Part 3 gắn với một đề thi Speaking đã công bố.
- **BR-STF-003 [AS-BUILT]**: 3 bản ghi `speaking_submissions` phải được insert trong cùng một DB transaction với `speaking_group_id` chung. Nếu bất kỳ bước nào thất bại, toàn bộ transaction được rollback.
- **BR-STF-004 [AS-BUILT]**: Đường dẫn đối tượng audio phải bắt đầu bằng `speaking/{userId}/` (hoặc vùng cách ly tương đương) và không chứa ký tự bất hợp pháp như `..`. Backend xác minh lại độc lập với client.
- **BR-STF-005 [AS-BUILT]**: Endpoint legacy `POST /api/v1/submissions/speaking` với `grader = 'ai'` phải bị từ chối; yêu cầu sử dụng `/speaking/full`.
- **BR-STF-006 [AS-BUILT]**: Lỗi AI sau khi nộp bài thành công KHÔNG được xóa bài nộp hoặc tự động chuyển bài sang hàng đợi Giảng viên.
- **BR-STF-007 [AS-BUILT]**: Khi `grader = 'tutor'`, 3 bản ghi giữ `status = 'pending'` và không kích hoạt bất kỳ dịch vụ AI nào.
- **BR-STF-008 [NEEDS CLARIFICATION]**: Chính sách lưu giữ/xóa file audio tạm thời và audio đã cam kết (bao gồm vòng đời khóa mã hóa) chưa được phê duyệt.

## 8. Yêu cầu chức năng

- **FR-STF-001 [AS-BUILT]**: Giao diện thi Speaking PHẢI quản lý luồng 3 Parts theo mô hình trạng thái: Intro → Part 1 → Part 2 → Part 3 → Summary → Result.
- **FR-STF-002 [AS-BUILT]**: Sau mỗi Part thu âm, hệ thống PHẢI tải file audio lên kho lưu trữ an toàn và nhận lại upload token (`upload_token`) để dùng khi nộp bài full.
- **FR-STF-003 [AS-BUILT]**: API Upload audio PHẢI lưu file vào đường dẫn an toàn thuộc sở hữu học viên (`speaking/{userId}/{uuid}.{ext}`) và từ chối MIME không được hỗ trợ hoặc file vượt kích thước tối đa (50 MiB).
- **FR-STF-004 [AS-BUILT]**: Part 1 và Part 3 PHẢI hỗ trợ danh sách câu hỏi với bộ đếm ngược từng câu; bấm "Hoàn thành sớm" cho phép chuyển câu tiếp theo mà không dừng ghi âm toàn Part.
- **FR-STF-005 [AS-BUILT]**: Part 2 PHẢI đếm ngược 60 giây thời gian chuẩn bị kèm nội dung Cue Card, sau đó tự động chuyển sang 120 giây thời gian nói.
- **FR-STF-006 [AS-BUILT]**: Màn hình Summary PHẢI hiển thị danh sách 3 Parts đã thu âm và cho phép học viên chọn người chấm (`grader = 'ai'` hoặc `grader = 'tutor'`).
- **FR-STF-007 [AS-BUILT]**: API nộp bài `POST /api/v1/submissions/speaking/full` PHẢI yêu cầu mảng `parts` có đúng 3 phần (`parts.length === 3`) và không có part number trùng lặp.
- **FR-STF-008 [AS-BUILT]**: Backend PHẢI xác minh mọi đường dẫn audio thuộc đúng sở hữu học viên đó và không chứa ký tự bất hợp pháp (`..`).
- **FR-STF-009 [AS-BUILT]**: Backend PHẢI lưu 3 bản ghi `speaking_submissions` trong cùng 1 DB transaction với chung một `speaking_group_id`.
- **FR-STF-010 [AS-BUILT]**: Endpoint legacy `POST /api/v1/submissions/speaking` PHẢI từ chối nếu `grader = 'ai'` và yêu cầu học viên nộp đủ 3 phần qua endpoint full.
- **FR-STF-011 [AS-BUILT]**: Nếu `grader = 'ai'`, backend PHẢI kích hoạt luồng chấm AI Speaking sau khi transaction commit thành công; lỗi AI KHÔNG xóa bài nộp hoặc chuyển tự động sang Giảng viên.
- **FR-STF-012 [AS-BUILT]**: Nếu `grader = 'tutor'`, 3 bản ghi PHẢI giữ `status = 'pending'` và không kích hoạt AI.
- **FR-STF-013 [AS-BUILT]**: Backend PHẢI validate `test_id` tùy chọn — nếu cung cấp thì phải tồn tại trong `mock_tests`.
- **FR-STF-014 [AS-BUILT]**: Mọi API response PHẢI tuân thủ cấu trúc envelope `{ success, data, error, meta }`.
- **FR-STF-015 [AS-BUILT]**: Màn hình hoàn thành PHẢI hiển thị thông báo tiếng Việt rõ ràng và nút điều hướng về danh sách đề thi Speaking.

## 9. Yêu cầu phi chức năng

- **NFR-STF-001 [AS-BUILT]**: Tất cả API endpoints xử lý bài nộp phải xác thực JWT và phạm vi vai trò trước khi xử lý.
- **NFR-STF-002 [AS-BUILT]**: File audio phải được lưu trữ riêng tư; URL tải lên có chữ ký hết hạn sau thời gian cấu hình (mặc định 300 giây) và không được lưu trữ lâu dài.
- **NFR-STF-003 [AS-BUILT]**: Nhật ký không được chứa đường dẫn đối tượng audio, URL có chữ ký, hoặc thông tin xác thực.
- **NFR-STF-004 [TARGET]**: Thời gian phản hồi của API nộp bài `/speaking/full` (enqueue/trigger async) PHẢI dưới 1 giây ở điều kiện baseline; bằng chứng đo lường chưa có.

## 10. Thực thể chính

- **Bài nộp Speaking (speaking_submissions)**: Chứa `user_id`, `test_id`, `part_number` (1, 2, 3), `prompt_text`, `audio_url`, `transcript`, `grader`, `status`, `speaking_group_id`, `assigned_tutor_id`.
- **Đề thi Speaking (mock_tests)**: Đề thi kỹ năng `speaking` chứa 3 phần và danh sách câu hỏi.
- **Báo cáo AI (ai_grading_reports)**: Kết quả đánh giá 4 tiêu chí IELTS Speaking, được tạo bởi `ai-fast-grading`.

## 11. Tiêu chí thành công

- **SC-STF-001 [AS-BUILT]**: 100% bài nộp Speaking full thành công có đủ 3 bản ghi (Part 1, 2, 3) cùng một `speaking_group_id`.
- **SC-STF-002 [AS-BUILT]**: 100% request nộp audio có đường dẫn không thuộc sở hữu học viên hoặc chứa ký tự bất hợp pháp bị từ chối với mã lỗi 400.
- **SC-STF-003 [AS-BUILT]**: 100% request nộp Speaking thiếu Part (dưới 3 parts) đến `/speaking/full` bị từ chối ngay lập tức.
- **SC-STF-004 [AS-BUILT]**: 100% bài nộp với `grader = 'tutor'` KHÔNG kích hoạt dịch vụ AI và xuất hiện chính xác trong hàng đợi Giảng viên.
- **SC-STF-005 [AS-BUILT]**: 100% bài nộp chọn `grader = 'ai'` khi xảy ra lỗi provider vẫn bảo tồn bài nộp trong cơ sở dữ liệu và ghi nhận trạng thái lỗi.
- **SC-STF-006 [TARGET]**: Thời gian phản hồi API nộp bài `/speaking/full` (enqueue/trigger async) dưới 1 giây ở điều kiện baseline.

## 12. Giả định

- Danh tính học viên đã xác thực qua middleware `authenticate` cung cấp `req.user.id` hợp lệ.
- Kho lưu trữ đối tượng riêng tư (Supabase Storage/S3) với khả năng tải lên/tải xuống có chữ ký đã sẵn sàng.
- Dịch vụ chấm AI Speaking (`gradeSpeakingGroup`) thuộc phạm vi `ai-fast-grading` đã sẵn sàng.
- Bảng `speaking_submissions`, `ai_grading_reports`, `mock_tests` đã có trong cơ sở dữ liệu với cột `speaking_group_id`.

## 13. Phụ thuộc

- Kho lưu trữ đối tượng riêng tư với khả năng phát sinh URL tải lên có chữ ký.
- Schema PostgreSQL cho `speaking_submissions`, `speaking_group_id`, `ai_grading_jobs`.
- Dịch vụ AI Speaking (`ai-fast-grading`) — phải sẵn sàng trước khi kiểm thử luồng `grader = 'ai'`.
- Middleware `authenticate` của Express backend.

## 14. Câu hỏi mở

1. **BR-STF-008**: Chính sách lưu giữ/xóa file audio (cả tạm thời và đã cam kết) và vòng đời khóa mã hóa chưa được phê duyệt — cần Product Owner quyết định trước phát hành production.
2. Nếu học viên đóng trình duyệt giữa Part 2 thì file audio Part 1 đã tải lên có được giữ lại để tái sử dụng trong phiên mới không, hay phải thu âm lại từ đầu?
3. Cơ chế idempotency cho request nộp bài Speaking (nếu mạng gián đoạn và client gửi lại) — hiện tại có triển khai giống như Speaking AI không?
