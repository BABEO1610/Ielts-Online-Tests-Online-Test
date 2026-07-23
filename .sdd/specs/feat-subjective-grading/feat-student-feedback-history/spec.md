# Đặc tả tính năng: Lịch sử nộp bài và Báo cáo kết quả của Học viên (Student Feedback & History)

**Ngày tạo**: 2026-07-23

**Trạng thái**: Bản nháp

**Đầu vào**: Phân rã từ `feat-subjective-grading`; phục vụ học viên tra cứu danh sách lịch sử bài nộp Writing & Speaking và xem chi tiết báo cáo phản hồi từ AI hoặc Giáo viên.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Học viên tra cứu Danh sách Lịch sử bài nộp (Ưu tiên: P1)

Là học viên, tôi muốn truy cập trang Lịch sử bài nộp (`/student/profile/practice-history`) để xem toàn bộ danh sách các bài thi Writing và Speaking tôi đã thực hiện, lọc theo kỹ năng, theo dõi trạng thái chấm điểm (Đang chấm, AI đã chấm, Giáo viên đã chấm, Chấm thất bại) và xem điểm Band số thu gọn.

**Lý do ưu tiên**: Lịch sử bài nộp là trung tâm điều hướng giúp học viên theo dõi tiến trình học tập và xem lại kết quả của các bài làm cũ.

**Kiểm thử độc lập**: Đăng nhập tài khoản học viên, mở trang Lịch sử làm bài, kiểm tra API `GET /api/v1/submissions/history` trả về đúng danh sách bài nộp của chính học viên đó, phân loại và nhóm đúng theo `writing_group_id` / `speaking_group_id`.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên đã thực hiện các bài nộp Writing và Speaking, **khi** truy cập trang Lịch sử, **thì** hệ thống hiển thị danh sách xếp theo thời gian nộp mới nhất lên đầu, bao gồm tên đề thi, ngày nộp, kỹ năng, trạng thái và điểm số thu gọn.
2. **Cho trước** danh sách bài nộp, **khi** học viên lọc theo "Writing" hoặc "Speaking", **thì** danh sách lập tức lọc theo kỹ năng tương ứng mà không cần tải lại trang.
3. **Cho trước** một bài nộp đang ở trạng thái `pending`, **khi** hiển thị, **thì** badge trạng thái thể hiện rõ "Đang chấm" và nút "Xem chi tiết" bị vô hiệu hóa cho đến khi bài được chấm xong.

---

### Câu chuyện người dùng 2 — Học viên xem Báo cáo phản hồi chi tiết (Ưu tiên: P1)

Là học viên có bài làm đã được chấm thành công, tôi muốn mở trang báo cáo chi tiết (`StudentFeedbackDetailPage`) để xem phân tích điểm 4 tiêu chí IELTS, nhận xét tổng quan, các đoạn lỗi sai kèm gợi ý sửa (Error Highlights), phiên bản bài viết cải thiện (Improved Version) hoặc các ghi chú âm thanh từ giáo viên.

**Lý do ưu tiên**: Báo cáo phản hồi chi tiết mang lại giá trị học tập cốt lõi giúp học viên nhận biết điểm mạnh, điểm yếu và cải thiện kỹ năng.

**Kiểm thử độc lập**: Mở một bài nộp đã chấm (`/submissions/:id/feedback`), kiểm tra giao diện hiển thị đủ 4 tiêu chí IELTS, phân biệt rõ nhãn `AI Estimated Band` (nếu là bài AI chấm) hoặc `Tutor Grade` (nếu là bài Giáo viên chấm), danh sách gợi ý từ vựng/ngữ pháp và đoạn bài làm đã sửa.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp được chấm bởi AI, **khi** học viên xem chi tiết, **thì** báo cáo hiển thị 4 tiêu chí IELTS kèm nhãn nổi bật `AI Estimated Band` và ghi chú súc tích về giới hạn của AI.
2. **Cho trước** bài nộp được chấm bởi Giáo viên, **khi** học viên xem chi tiết, **thì** báo cáo hiển thị điểm số chính thức từ Giáo viên (`Tutor Grade`), nhận xét riêng của Giáo viên và file ghi âm nhận xét (nếu có).
3. **Cho trước** bài nộp Writing, **khi** xem chi tiết, **thì** hiển thị song song nội dung bài làm của học viên và bài viết đã được AI/Giáo viên biên tập cải thiện (`improvedVersion`).
4. **Cho trước** học viên cố gắng xem báo cáo bài nộp thuộc về học viên khác, **khi** truy cập, **thì** hệ thống từ chối truy cập với lỗi 403 Forbidden.

---

### Câu chuyện người dùng 3 — Gửi lại yêu cầu chấm AI khi xảy ra sự cố (Ưu tiên: P2)

Là học viên có bài nộp gặp sự cố chấm AI hoặc chưa hoàn tất, tôi muốn bấm nút "Yêu cầu chấm lại AI" từ trang Lịch sử để hệ thống thử lại luồng chấm AI mà không cần phải thực hiện lại toàn bộ bài thi.

**Lý do ưu tiên**: Tăng khả năng tự phục hồi sự cố cho học viên và giảm áp lực hỗ trợ kỹ thuật.

**Kiểm thử độc lập**: Tại trang Lịch sử bài làm, với bài nộp có trạng thái lỗi/chưa chấm AI, bấm "Chấm lại bằng AI", kiểm tra API `POST /submissions/writing/:id/ai-grade` được gọi và cập nhật lại trạng thái bài nộp.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp AI đang ở trạng thái lỗi hoặc chưa có báo cáo, **khi** học viên bấm nút "Yêu cầu chấm lại AI", **thì** hệ thống kiểm tra quota và gửi lại công việc chấm AI cho bài đó.
2. **Cho trước** học viên đã hết lượt chấm AI trong ngày, **khi** bấm yêu cầu chấm lại, **thì** hệ thống hiển thị thông báo vượt quá hạn mức quota bằng tiếng Việt.

---

### Trường hợp biên

- Học viên xem lịch sử bài nộp khi chưa có bất kỳ bài thi nào (hiển thị giao diện rỗng - Zero state thân thiện).
- Báo cáo AI chỉ hoàn thành cho Task 1 nhưng Task 2 bị lỗi (hệ thống hiển thị trạng thái đang xử lý hoặc báo lỗi một phần).
- Bài nộp Speaking được giáo viên thu hồi kết quả (trạng thái quay lại `pending` hoặc ẩn báo cáo đã thu hồi).
- Gián đoạn mạng khi tải dữ liệu báo cáo chi tiết.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: API Lịch sử bài nộp (`GET /api/v1/submissions/history`) PHẢI lấy danh tính học viên từ `req.user.id` và chỉ trả về các bài nộp thuộc về chính học viên đó.
- **FR-002**: API Lịch sử PHẢI tự động nhóm các task/parts theo `writing_group_id` hoặc `speaking_group_id` để trả về bản ghi bài thi tổng hợp cho học viên.
- **FR-003**: Giao diện Lịch sử bài nộp (`StudentHistoryPage`) PHẢI cho phép lọc theo kỹ năng (`all`, `writing`, `speaking`) và hiển thị trạng thái chuẩn hóa bằng tiếng Việt.
- **FR-004**: Điểm số hiển thị trên danh sách Lịch sử PHẢI ưu tiên hiển thị `overall_tutor_band` nếu có; nếu không thì hiển thị `overall_ai_band`.
- **FR-005**: API Phản hồi chi tiết (`GET /api/v1/submissions/:id/feedback`) PHẢI xác minh quyền sở hữu `user_id === req.user.id` trước khi trả về chi tiết báo cáo.
- **FR-006**: Báo cáo chi tiết Writing PHẢI bao gồm: Điểm 4 tiêu chí (TR/TA, CC, LR, GRA) từng task, band tổng hợp, summary, strengths, weaknesses, error_highlights, gợi ý từ vựng/ngữ pháp và `improvedVersion`.
- **FR-007**: Báo cáo chi tiết Speaking PHẢI bao gồm: Điểm 4 tiêu chí (Fluency, Lexical, Grammar, Pronunciation), band tổng hợp, summary, transcript và file audio thu âm của 3 Parts.
- **FR-008**: Giao diện báo cáo PHẢI hiển thị nhãn nổi bật `AI Estimated Band` cho bài chấm AI và nhãn `Tutor Grade` cho bài chấm của Giáo viên.
- **FR-009**: Endpoint yêu cầu chấm lại AI (`POST /submissions/writing/:id/ai-grade`) PHẢI kiểm tra hạn mức Quota sử dụng AI trước khi thực thi.
- **FR-010**: Mọi API response PHẢI tuân thủ cấu trúc envelope `{ success, data, error, meta }`.
- **FR-011**: Giao diện PHẢI hiển thị trạng thái tải (Loading spinner) và thông báo lỗi bằng tiếng Việt thân thiện khi gặp sự cố mạng.

### Thực thể chính

- **Lịch sử bài nộp (Practice History Item)**: Nhóm thông tin tổng hợp gồm `id`, `type`, `test_title`, `submitted_at`, `status`, `ai_status`, `tutor_status`, `band_score`, `ai_band_score`, `tutor_band_score`.
- **Báo cáo phản hồi AI (ai_grading_reports)**: Báo cáo chứa chi tiết điểm số 4 tiêu chí và phân tích từ AI.
- **Báo cáo nhận xét Tutor (tutor_feedback_reports)**: Báo cáo chứa chi tiết điểm số và nhận xét từ Giáo viên.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả đo lường được

- **SC-001**: 100% kết quả truy vấn Lịch sử bài nộp PHẢI thuộc về đúng học viên đang đăng nhập (`user_id === req.user.id`).
- **SC-002**: 100% yêu cầu xem chi tiết báo cáo từ học viên không phải chủ sở hữu bài nộp PHẢI bị từ chối với lỗi 403 Forbidden.
- **SC-003**: 100% bài nộp Writing 2 tasks hoặc Speaking 3 parts PHẢI được gom nhóm chính xác theo `group_id` trên giao diện danh sách.
- **SC-004**: 100% báo cáo AI hiển thị trên UI PHẢI đính kèm nhãn `AI Estimated Band` để không gây hiểu nhầm với điểm thi IELTS chính thức.
- **SC-005**: Thời gian tải trang danh sách Lịch sử bài làm PHẢI dưới 800ms ở điều kiện mạng baseline.

## Giả định và phụ thuộc

- Đã có dữ liệu bài nộp trong `writing_submissions` và `speaking_submissions`.
- Báo cáo kết quả lưu trong `ai_grading_reports` và `tutor_feedback_reports`.
- Middleware `authenticate` cung cấp `req.user.id`.
- Dịch vụ frontend sử dụng React 18, Vite và Bootstrap 5 theo Hiến pháp.

## Ngoài phạm vi

- Thuật toán chấm điểm AI tự động — thuộc `ai-fast-grading`.
- Không gian làm việc và giao diện chấm của Giáo viên — thuộc `feat-tutor-grading-workspace`.
- Màn hình thi và thu âm của học viên — thuộc `feat-writing-test-flow` và `feat-speaking-test-flow`.
