# Đặc tả tính năng: Không gian chấm bài dành cho Giáo viên (Tutor Grading Workspace)

**Ngày tạo**: 2026-07-23

**Trạng thái**: Bản nháp

**Đầu vào**: Phân rã từ `feat-subjective-grading`; phục vụ giáo viên (Tutor) chấm bài thủ công cho các bài nộp học viên chọn `grader = 'tutor'`.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Giáo viên xem và nhận bài từ Hàng đợi bài chờ chấm (Ưu tiên: P1)

Là giáo viên (Tutor), tôi muốn xem danh sách các bài nộp Writing và Speaking đang ở trạng thái chờ chấm (`grader = 'tutor'` và `status = 'pending'`), lọc theo kỹ năng hoặc tìm kiếm theo tên học viên, sau đó bấm nhận bài (Claim) để bắt đầu chấm bài cho học viên đó.

**Lý do ưu tiên**: Hàng đợi bài chờ chấm là cửa ngõ để giáo viên tiếp cận bài làm của học viên và đảm bảo phân công công việc không bị trùng lặp.

**Kiểm thử độc lập**: Đăng nhập tài khoản Tutor, mở trang Tutor Queue (`/tutor/queue`), lọc theo "Writing" hoặc "Speaking", bấm nhận một bài nộp, xác minh bài nộp được khóa nguyên tử cho đúng Tutor đó (`assigned_tutor_id`) và chuyển sang giao diện chấm bài.

**Kịch bản chấp nhận**:

1. **Cho trước** có danh sách bài nộp `grader = 'tutor'` đang chờ chấm, **khi** giáo viên truy cập `/tutor/queue`, **thì** hệ thống hiển thị bảng danh sách gồm tên học viên, tiêu đề đề thi, loại kỹ năng, ngày nộp và trạng thái.
2. **Cho trước** nhiều giáo viên đồng thời bấm nhận cùng một bài nộp, **khi** xử lý, **thì** cơ chế khóa nguyên tử (Atomic Lock) chỉ gán bài cho duy nhất 1 giáo viên thắng cuộc; các giáo viên khác nhận thông báo bài đã được nhận.
3. **Cho trước** bài nộp đã được gán cho một giáo viên, **khi** giáo viên khác cố tình mở chi tiết bài nộp qua URL, **thì** hệ thống từ chối truy cập với lỗi 403 Forbidden.

---

### Câu chuyện người dùng 2 — Giáo viên chấm điểm và nhập nhận xét chi tiết (Ưu tiên: P1)

Là giáo viên đã nhận bài, tôi muốn đọc toàn bộ nội dung Writing (Task 1 + Task 2) hoặc nghe 3 file âm thanh Speaking, nhập điểm số cho từng tiêu chí trong 4 tiêu chí IELTS, viết nhận xét chi tiết (kèm link nhận xét âm thanh nếu có) và lưu kết quả chính thức cho học viên.

**Lý do ưu tiên**: Đây là hoạt động cốt lõi của giáo viên nhằm cung cấp phản hồi chuyên sâu cho học viên.

**Kiểm thử độc lập**: Mở giao diện chấm bài (`/tutor/submissions/:type/:id`), nhập điểm 4 tiêu chí (từ 0.0 đến 9.0 theo nấc 0.5), nhập nhận xét văn bản, bấm "Lưu kết quả", xác minh báo cáo được insert vào `tutor_feedback_reports` và trạng thái bài nộp chuyển sang `tutor_graded`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp Writing, **khi** giáo viên xem chi tiết, **thì** giao diện hiển thị đầy đủ đề bài, đáp án Task 1 và Task 2 kèm số từ thực tế.
2. **Cho trước** bài nộp Speaking, **khi** giáo viên xem chi tiết, **thì** giao diện hiển thị 3 trình phát audio cho Part 1, Part 2, Part 3 kèm nút yêu cầu tạo transcript (STT) nếu cần.
3. **Cho trước** giáo viên đã nhập đủ điểm 4 tiêu chí hợp lệ và nhận xét văn bản, **khi** bấm gửi điểm, **thì** hệ thống lưu kết quả vào `tutor_feedback_reports`, ghi điểm `overall_tutor_band` riêng biệt (KHÔNG ghi đè điểm `overall_ai_band`) và phát sự kiện cập nhật trạng thái bài nộp sang `tutor_graded`.

---

### Câu chuyện người dùng 3 — Giáo viên sử dụng tính năng "Gợi ý AI (AI Prelim)" (Ưu tiên: P1)

Là giáo viên đang chấm bài, tôi muốn bấm nút "Gợi ý AI" để hệ thống tự động sinh bản nháp điểm 4 tiêu chí và nhận xét tham khảo từ AI nhằm tiết kiệm thời gian chấm bài, nhưng quyết định cuối cùng vẫn hoàn toàn do tôi làm chủ.

**Lý do ưu tiên**: AI Prelim đóng vai trò trợ lý tăng năng suất cho giáo viên mà không làm thay đổi ranh giới chấm điểm thủ công.

**Kiểm thử độc lập**: Tại màn hình chấm bài của Tutor, bấm nút "Gợi ý AI", xác minh hệ thống trả về kết quả gợi ý 4 tiêu chí điền vào form chấm nháp, nhưng bài nộp vẫn giữ nguyên trạng thái `pending` và KHÔNG tự động lưu báo cáo Tutor.

**Kịch bản chấp nhận**:

1. **Cho trước** giáo viên bấm nút "Gợi ý AI", **khi** API `/ai-prelim` xử lý xong, **thì** biểu mẫu chấm điểm được điền sẵn điểm gợi ý 4 tiêu chí và nhận xét bản nháp để giáo viên xem xét và điều chỉnh.
2. **Cho trước** gợi ý AI được tạo ra, **khi** giáo viên chưa bấm "Lưu kết quả", **thì** trạng thái bài nộp vẫn là `pending`, không có bản ghi nào bị insert vào `tutor_feedback_reports`.

---

### Câu chuyện người dùng 4 — Quản lý Lịch sử chấm bài và Thu hồi kết quả (Ưu tiên: P2)

Là giáo viên, tôi muốn xem lại danh sách các bài tôi đã chấm (`/tutor/grading-history`), chỉnh sửa điểm số hoặc thu hồi (soft-delete) kết quả chấm khi phát hiện có sai sót.

**Lý do ưu tiên**: Đảm bảo quyền kiểm soát chất lượng và sửa lỗi nghiệp vụ cho giáo viên đối với các bài chấm của chính mình.

**Kiểm thử độc lập**: Vào trang Lịch sử chấm bài, bấm "Thu hồi" một kết quả chấm, xác minh kết quả bị soft-delete (ẩn khỏi học viên) và ghi log audit hành động.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp đã được chấm bởi giáo viên, **khi** giáo viên chủ động thu hồi (Revoke), **thì** báo cáo trong `tutor_feedback_reports` được đánh dấu ẩn/xóa mềm, không xóa vật lý dữ liệu.
2. **Cho trước** bài nộp thuộc về giáo viên A, **khi** giáo viên B cố gắng thu hồi hoặc chỉnh sửa điểm bài đó, **thì** hệ thống từ chối với lỗi 403 Forbidden.

---

### Trường hợp biên

- Hai giáo viên bấm nhận bài cùng một miligiây (Atomic Lock ở CSDL giải quyết nguyên tử).
- Giáo viên chấm bài nhưng nhập điểm tiêu chí ngoài khoảng 0.0 - 9.0 hoặc không phải bội số 0.5.
- Bài Speaking bị hỏng audio hoặc không thể phát (hệ thống cho phép giáo viên báo lỗi bài nộp).
- Giáo viên xem danh sách tham khảo bài AI đã chấm (`/tutor/ai-reference`) ở chế độ chỉ đọc (Read-only).

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: API Hàng đợi bài chờ chấm (`GET /api/v1/tutors/queue`) PHẢI chỉ trả về các bài nộp có `grader = 'tutor'` và `status = 'pending'`, hỗ trợ lọc theo `submission_type` (writing/speaking) và tìm kiếm theo tên học viên.
- **FR-002**: Việc nhận bài (Claim) PHẢI thực hiện nguyên tử; sau khi nhận, bản ghi PHẢI được gán `assigned_tutor_id = req.user.id`.
- **FR-003**: Chi tiết bài nộp (`GET /api/v1/tutors/submissions/:type/:submissionId`) PHẢI giới hạn quyền truy cập cho đúng giáo viên được gán (`assigned_tutor_id`) hoặc tài khoản Admin.
- **FR-004**: Giao diện chấm Writing PHẢI hiển thị đầy đủ đề thi và nội dung trả lời của cả Task 1 và Task 2.
- **FR-005**: Giao diện chấm Speaking PHẢI cung cấp trình phát audio cho cả 3 Parts (Part 1, 2, 3) và API yêu cầu tạo transcript (`POST /transcribe`) khi cần.
- **FR-006**: Form chấm bài PHẢI yêu cầu đủ 4 điểm tiêu chí IELTS (mỗi điểm từ 0.0 đến 9.0, nấc 0.5) và văn bản nhận xét (`written_feedback`).
- **FR-007**: API Lưu điểm (`POST /api/v1/tutors/submissions/:type/:submissionId/grade`) PHẢI thực thi trong 1 DB transaction: insert bản ghi vào `tutor_feedback_reports`, cập nhật `overall_tutor_band` và `status = 'tutor_graded'`.
- **FR-008**: Quyết định và điểm số của Giáo viên PHẢI lưu độc lập; KHÔNG được đè lên các cột điểm số AI (`overall_ai_band`).
- **FR-009**: Endpoint "Gợi ý AI" (`POST /ai-prelim`) PHẢI chỉ trả về dữ liệu gợi ý bản nháp; KHÔNG làm thay đổi `grader`, `status` hoặc insert báo cáo Tutor.
- **FR-010**: Trang Lịch sử chấm bài (`GET /api/v1/tutors/grading-history`) PHẢI chỉ hiển thị các bài nộp được chấm bởi chính giáo viên đang đăng nhập (`tutor_id = req.user.id`).
- **FR-011**: Hành động thu hồi kết quả (`PATCH /grading-history/:submissionId/revoke`) PHẢI thực hiện soft-delete báo cáo và chỉ cho phép chính giáo viên đó thực hiện.
- **FR-012**: Hành động sửa điểm (`PATCH /grading-history/:submissionId/score`) PHẢI cập nhật lại `tutor_feedback_reports` và tính lại `overall_tutor_band`.
- **FR-013**: Tính năng Tham khảo AI (`GET /tutors/ai-reference`) PHẢI cho phép giáo viên xem bài nộp đã được AI chấm ở chế độ chỉ đọc (Read-only).
- **FR-014**: Mọi thao tác ghi dữ liệu của Tutor PHẢI được ghi lại nhật ký hoạt động (`audit_logs`).
- **FR-015**: Mọi API response PHẢI tuân thủ chuẩn envelope `{ success, data, error, meta }`.

### Thực thể chính

- **Báo cáo nhận xét Tutor (tutor_feedback_reports)**: Chứa `tutor_id`, `writing_submission_id`, `speaking_submission_id`, điểm 4 tiêu chí, `band_score`, `written_feedback`, `audio_feedback_url`.
- **Bảng bài nộp (writing_submissions / speaking_submissions)**: Chứa thông tin liên kết `assigned_tutor_id`, `tutor_status`, `overall_tutor_band`.
- **Nhật ký hoạt động (audit_logs)**: Lưu vết các thao tác chấm bài, sửa điểm, thu hồi kết quả của Tutor.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả đo lường được

- **SC-001**: 100% bài nộp xuất hiện trong Tutor Queue PHẢI có `grader = 'tutor'` và `status = 'pending'`; 0% bài `grader = 'ai'` xuất hiện trong queue này.
- **SC-002**: Khi 20 giáo viên cùng bấm nhận 1 bài nộp đồng thời, đúng 1 giáo viên nhận thành công và 19 giáo viên nhận thông báo phản hồi phù hợp.
- **SC-003**: 100% kết quả chấm của Tutor PHẢI được lưu riêng trong `tutor_feedback_reports` và không ghi đè điểm AI.
- **SC-004**: 100% thao tác bấm "Gợi ý AI" KHÔNG làm thay đổi `status` bài nộp từ `pending` sang `tutor_graded`.
- **SC-005**: 100% yêu cầu truy cập bài nộp hoặc thu hồi điểm từ giáo viên không được gán PHẢI bị từ chối với lỗi 403 Forbidden.
- **SC-006**: Thời gian phản hồi API lưu điểm chấm Tutor PHẢI dưới 1.5 giây ở điều kiện baseline.

## Giả định và phụ thuộc

- Đã có bảng `tutor_feedback_reports`, `writing_submissions`, `speaking_submissions`, `audit_logs` trong CSDL.
- View `v_tutor_grading_queue` đã được định nghĩa trong CSDL.
- Dịch vụ AI Prelim gọi qua `ai-fast-grading` wrapper.
- Middleware `authenticate` và `authorize(['tutor', 'admin'])` đã sẵn sàng.

## Ngoài phạm vi

- Thuật toán chấm điểm AI tự động — thuộc `ai-fast-grading`.
- Luồng thi của học viên — thuộc `feat-writing-test-flow` và `feat-speaking-test-flow`.
- Giao diện xem kết quả phía học viên — thuộc `feat-student-feedback-history`.
