# Đặc tả tính năng: Không gian chấm bài dành cho Giảng viên (Tutor Grading Workspace)

**Ngày tạo**: 2026-07-23
**Trạng thái**: Nền tảng HIỆN CÓ; các cổng phát hành MỤC TIÊU vẫn còn mở
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cung cấp một không gian làm việc chuyên biệt cho Giảng viên (Tutor) để chấm bài thủ công các bài nộp tự luận Writing và Speaking mà học viên đã chọn `grader = 'tutor'`. Giảng viên xem hàng đợi bài chờ chấm, nhận bài (Claim) theo cơ chế khóa nguyên tử để tránh chấm trùng, đọc nội dung Writing hoặc nghe audio Speaking, sử dụng tùy chọn AI Prelim Assist để có bản nháp gợi ý, nhập điểm 4 tiêu chí IELTS theo nấc 0.5 và lưu kết quả chính thức. Điểm Giảng viên lưu riêng biệt với điểm AI, không ghi đè lẫn nhau. Mọi thao tác ghi dữ liệu được kiểm toán tự động.

## 2. Phạm vi

- Hàng đợi bài chờ chấm (`/tutor/queue`): lọc theo kỹ năng, tìm kiếm theo tên học viên.
- Nhận bài (Claim) theo cơ chế khóa nguyên tử — chỉ một Giảng viên nhận thành công khi nhiều Giảng viên cùng bấm.
- Giao diện chấm Writing: đề bài + bài làm Task 1 & Task 2 song song, hiển thị số từ.
- Giao diện chấm Speaking: 3 audio player cho Part 1, 2, 3; yêu cầu tạo transcript (STT) khi cần.
- AI Prelim Assist: tạo bản nháp gợi ý 4 tiêu chí — không tự động lưu kết quả chính thức.
- Form chấm điểm 4 tiêu chí IELTS theo nấc 0.5 (0.0 đến 9.0) và văn bản nhận xét.
- Lưu kết quả chính thức: insert `tutor_feedback_reports`, cập nhật `overall_tutor_band` và `status = 'tutor_graded'` trong một DB transaction.
- Lịch sử chấm bài: danh sách bài đã chấm, sửa điểm, thu hồi (soft-delete) kết quả.
- Tham khảo AI: xem báo cáo AI ở chế độ chỉ đọc (Read-only).

## 3. Ngoài phạm vi

- Thuật toán chấm điểm AI tự động — thuộc `ai-fast-grading`.
- Luồng thi và nộp bài của Học viên — thuộc `feat-writing-test-flow` và `feat-speaking-test-flow`.
- Giao diện xem kết quả phía Học viên — thuộc `feat-student-feedback-history`.
- Phân công Giảng viên bởi Admin — thuộc `feat-admin-tutor-assignment`.
- Xóa vật lý dữ liệu chấm đã thu hồi — chưa được quyết định sản phẩm.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Giảng viên (Tutor) đã xác thực | Xem queue bài được gán hoặc tự do, nhận bài, chấm điểm, dùng AI Prelim, xem lịch sử chấm của mình, sửa điểm, thu hồi kết quả bài của mình. |
| Quản trị viên (Admin) | Xem queue và lịch sử chấm (Read-only giám sát); có thể truy cập chi tiết bài nộp bất kỳ qua quyền Admin. |
| Học viên/Khách | Không có quyền truy cập bất kỳ endpoint Tutor Workspace; bị từ chối với 403 Forbidden. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Giảng viên xem và nhận bài từ Hàng đợi chờ chấm (Ưu tiên: P1)

Với tư cách Giảng viên, tôi muốn xem danh sách các bài nộp Writing và Speaking đang chờ chấm, lọc theo kỹ năng hoặc tìm kiếm theo tên học viên, sau đó bấm nhận bài (Claim) để bắt đầu chấm.

**Kiểm thử độc lập**: Đăng nhập tài khoản Tutor, mở trang Tutor Queue (`/tutor/queue`), lọc theo "Writing", bấm nhận một bài nộp, xác minh bài nộp được khóa nguyên tử cho đúng Tutor đó (`assigned_tutor_id = req.user.id`). Xác minh Tutor thứ 2 bấm nhận cùng bài nhận phản hồi lỗi phù hợp.

**Kịch bản chấp nhận**:

1. **Cho trước** có danh sách bài nộp `grader = 'tutor'` đang chờ chấm, **Khi** Giảng viên truy cập `/tutor/queue`, **Thì** hệ thống hiển thị bảng danh sách gồm tên học viên, tiêu đề đề thi, loại kỹ năng, ngày nộp và trạng thái.
2. **Cho trước** nhiều Giảng viên đồng thời bấm nhận cùng một bài nộp, **Khi** xử lý, **Thì** cơ chế khóa nguyên tử chỉ gán bài cho duy nhất 1 Giảng viên thắng cuộc; các Giảng viên khác nhận thông báo bài đã được nhận.
3. **Cho trước** bài nộp đã được gán cho một Giảng viên, **Khi** Giảng viên khác cố tình mở chi tiết bài nộp qua URL, **Thì** hệ thống từ chối với lỗi 403 Forbidden.

### Câu chuyện 2 — Giảng viên chấm điểm và nhập nhận xét (Ưu tiên: P1)

Với tư cách Giảng viên đã nhận bài, tôi muốn đọc toàn bộ nội dung Writing hoặc nghe 3 file âm thanh Speaking, nhập điểm số cho từng tiêu chí trong 4 tiêu chí IELTS và lưu kết quả chính thức.

**Kiểm thử độc lập**: Mở giao diện chấm bài (`/tutor/submissions/:type/:id`), nhập điểm 4 tiêu chí hợp lệ (nấc 0.5), nhập văn bản nhận xét, bấm "Lưu kết quả", xác minh báo cáo insert vào `tutor_feedback_reports` và trạng thái bài nộp chuyển sang `tutor_graded`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp Writing, **Khi** Giảng viên xem chi tiết, **Thì** giao diện hiển thị đầy đủ đề bài, bài làm Task 1 và Task 2 kèm số từ thực tế.
2. **Cho trước** bài nộp Speaking, **Khi** Giảng viên xem chi tiết, **Thì** giao diện hiển thị 3 trình phát audio cho Part 1, Part 2, Part 3 và nút yêu cầu tạo transcript (STT) nếu cần.
3. **Cho trước** Giảng viên đã nhập đủ điểm 4 tiêu chí hợp lệ và nhận xét văn bản, **Khi** bấm gửi điểm, **Thì** hệ thống lưu kết quả vào `tutor_feedback_reports`, ghi `overall_tutor_band` riêng biệt (KHÔNG ghi đè `overall_ai_band`) và cập nhật trạng thái bài nộp sang `tutor_graded`.

### Câu chuyện 3 — Giảng viên sử dụng AI Prelim Assist (Ưu tiên: P1)

Với tư cách Giảng viên đang chấm bài, tôi muốn bấm nút "Gợi ý AI" để hệ thống tự động sinh bản nháp điểm 4 tiêu chí và nhận xét tham khảo từ AI nhằm tiết kiệm thời gian.

**Kiểm thử độc lập**: Tại màn hình chấm bài, bấm "Gợi ý AI", xác minh hệ thống trả về kết quả gợi ý 4 tiêu chí điền vào form nháp, nhưng bài nộp vẫn giữ `status = 'pending'` và KHÔNG có bản ghi nào insert vào `tutor_feedback_reports`.

**Kịch bản chấp nhận**:

1. **Cho trước** Giảng viên bấm "Gợi ý AI", **Khi** API `/ai-prelim` xử lý xong, **Thì** form chấm điểm được điền sẵn điểm gợi ý 4 tiêu chí và nhận xét bản nháp để Giảng viên xem xét và điều chỉnh.
2. **Cho trước** gợi ý AI đã được tạo, **Khi** Giảng viên chưa bấm "Lưu kết quả", **Thì** trạng thái bài nộp vẫn là `pending` và không có bản ghi nào insert vào `tutor_feedback_reports`.

### Câu chuyện 4 — Quản lý Lịch sử chấm bài và Thu hồi kết quả (Ưu tiên: P2)

Với tư cách Giảng viên, tôi muốn xem lại danh sách các bài tôi đã chấm, chỉnh sửa điểm số hoặc thu hồi (soft-delete) kết quả khi phát hiện có sai sót.

**Kiểm thử độc lập**: Vào trang Lịch sử chấm bài, bấm "Thu hồi" một kết quả chấm, xác minh kết quả bị soft-delete (ẩn khỏi học viên), bản ghi vật lý còn tồn tại trong DB, và hành động được ghi vào `audit_logs`.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp đã được chấm bởi Giảng viên, **Khi** Giảng viên đó thu hồi kết quả, **Thì** báo cáo trong `tutor_feedback_reports` được đánh dấu xóa mềm (soft-delete) và không hiển thị với học viên; dữ liệu vật lý không bị xóa.
2. **Cho trước** bài nộp thuộc về Giảng viên A, **Khi** Giảng viên B cố gắng thu hồi hoặc sửa điểm bài đó, **Thì** hệ thống từ chối với lỗi 403 Forbidden.

## 6. Trường hợp biên

- Hai Giảng viên bấm nhận cùng bài một miligiây — cơ chế khóa nguyên tử (UPDATE với WHERE điều kiện trạng thái) giải quyết; chỉ 1 người thắng.
- Giảng viên nhập điểm tiêu chí ngoài khoảng 0.0–9.0 hoặc không phải nấc 0.5 — hệ thống từ chối với lỗi 400.
- Bài Speaking bị hỏng audio — Giảng viên báo lỗi bài nộp qua giao diện; Admin có thể can thiệp.
- Giảng viên xem bài AI đã chấm qua `/tutor/ai-reference` — chế độ chỉ đọc, không thể sửa.
- AI Prelim Assist gặp lỗi nhà cung cấp — giao diện hiển thị thông báo lỗi tiếng Việt; form điểm vẫn trống để Giảng viên tự nhập.

## 7. Quy tắc nghiệp vụ

- **BR-TGW-001 [AS-BUILT]**: Chỉ Giảng viên và Admin đã xác thực mới có thể truy cập endpoint Tutor Workspace; học viên và khách bị từ chối với 403.
- **BR-TGW-002 [AS-BUILT]**: Nhận bài (Claim) thực hiện nguyên tử: sau khi nhận, `assigned_tutor_id = req.user.id` và chỉ Giảng viên đó (hoặc Admin) mới truy cập được nội dung bài nộp.
- **BR-TGW-003 [AS-BUILT]**: Điểm 4 tiêu chí phải là số từ 0.0 đến 9.0 theo nấc 0.5. Backend xác thực lại độc lập với client.
- **BR-TGW-004 [AS-BUILT]**: Khi lưu điểm chính thức, insert `tutor_feedback_reports`, cập nhật `overall_tutor_band` và `status = 'tutor_graded'` phải thực hiện trong cùng một DB transaction.
- **BR-TGW-005 [AS-BUILT]**: Điểm Giảng viên (`overall_tutor_band`) lưu ở cột riêng biệt; KHÔNG được ghi đè điểm AI (`overall_ai_band`) và ngược lại.
- **BR-TGW-006 [AS-BUILT]**: AI Prelim Assist chỉ trả về dữ liệu gợi ý bản nháp; không làm thay đổi `grader`, `status` hoặc insert báo cáo Giảng viên.
- **BR-TGW-007 [AS-BUILT]**: Thu hồi kết quả chỉ do chính Giảng viên đã chấm bài đó thực hiện (soft-delete); không xóa vật lý.
- **BR-TGW-008 [AS-BUILT]**: Mọi thao tác ghi dữ liệu (chấm điểm, sửa điểm, thu hồi) phải được ghi vào `audit_logs`.
- **BR-TGW-009 [NEEDS CLARIFICATION]**: Khi Giảng viên thu hồi kết quả, trạng thái bài nộp có tự động quay về `pending` để Admin phân công lại không, hay cần Admin can thiệp thủ công?

## 8. Yêu cầu chức năng

- **FR-TGW-001 [AS-BUILT]**: API Hàng đợi bài chờ chấm (`GET /api/v1/tutors/queue`) PHẢI chỉ trả về bài `grader = 'tutor'` và `status = 'pending'`, hỗ trợ lọc theo `submission_type` và tìm kiếm theo tên học viên.
- **FR-TGW-002 [AS-BUILT]**: Nhận bài (Claim) PHẢI thực hiện nguyên tử; sau khi nhận, `assigned_tutor_id = req.user.id`.
- **FR-TGW-003 [AS-BUILT]**: Chi tiết bài nộp (`GET /api/v1/tutors/submissions/:type/:submissionId`) PHẢI giới hạn quyền truy cập cho đúng Giảng viên được gán hoặc Admin.
- **FR-TGW-004 [AS-BUILT]**: Giao diện chấm Writing PHẢI hiển thị đầy đủ đề thi và bài làm Task 1 và Task 2 kèm số từ thực tế.
- **FR-TGW-005 [AS-BUILT]**: Giao diện chấm Speaking PHẢI cung cấp 3 trình phát audio (Part 1, 2, 3) và API yêu cầu tạo transcript (`POST /transcribe`) khi cần.
- **FR-TGW-006 [AS-BUILT]**: Form chấm PHẢI yêu cầu đủ 4 điểm tiêu chí IELTS (0.0–9.0, nấc 0.5) và văn bản nhận xét (`written_feedback`) không rỗng.
- **FR-TGW-007 [AS-BUILT]**: API Lưu điểm (`POST /api/v1/tutors/submissions/:type/:submissionId/grade`) PHẢI thực thi trong 1 DB transaction: insert `tutor_feedback_reports`, cập nhật `overall_tutor_band` và `status = 'tutor_graded'`.
- **FR-TGW-008 [AS-BUILT]**: Điểm Giảng viên PHẢI lưu độc lập; KHÔNG ghi đè các cột điểm AI (`overall_ai_band`).
- **FR-TGW-009 [AS-BUILT]**: Endpoint AI Prelim (`POST /ai-prelim`) PHẢI chỉ trả về dữ liệu gợi ý bản nháp; KHÔNG làm thay đổi `grader`, `status` hoặc insert báo cáo Giảng viên.
- **FR-TGW-010 [AS-BUILT]**: Trang Lịch sử chấm bài (`GET /api/v1/tutors/grading-history`) PHẢI chỉ hiển thị bài chấm bởi chính Giảng viên đang đăng nhập.
- **FR-TGW-011 [AS-BUILT]**: Thu hồi kết quả (`PATCH /grading-history/:submissionId/revoke`) PHẢI thực hiện soft-delete và chỉ cho phép chính Giảng viên đó thực hiện.
- **FR-TGW-012 [AS-BUILT]**: Sửa điểm (`PATCH /grading-history/:submissionId/score`) PHẢI cập nhật lại `tutor_feedback_reports` và tính lại `overall_tutor_band`.
- **FR-TGW-013 [AS-BUILT]**: Tham khảo AI (`GET /tutors/ai-reference`) PHẢI cho phép Giảng viên xem bài đã AI chấm ở chế độ chỉ đọc.
- **FR-TGW-014 [AS-BUILT]**: Mọi thao tác ghi dữ liệu của Giảng viên PHẢI được ghi vào `audit_logs`.
- **FR-TGW-015 [AS-BUILT]**: Mọi API response PHẢI tuân thủ chuẩn envelope `{ success, data, error, meta }`.

## 9. Yêu cầu phi chức năng

- **NFR-TGW-001 [AS-BUILT]**: Mọi endpoint Tutor Workspace phải xác thực JWT và phân quyền (`tutor` hoặc `admin`) trước khi xử lý.
- **NFR-TGW-002 [AS-BUILT]**: Nhật ký audit phải ghi đủ thông tin để xác định ai thực hiện hành động gì, trên bài nào, lúc nào.
- **NFR-TGW-003 [TARGET]**: Thời gian phản hồi API lưu điểm chấm Giảng viên dưới 1.5 giây ở điều kiện baseline; bằng chứng đo lường chưa có.
- **NFR-TGW-004 [TARGET]**: Khi 20 Giảng viên cùng nhận một bài nộp đồng thời, đúng 1 Giảng viên nhận thành công và 19 Giảng viên nhận phản hồi phù hợp; cần kiểm thử tải trọng để xác nhận.

## 10. Thực thể chính

- **Báo cáo nhận xét Giảng viên (tutor_feedback_reports)**: Chứa `tutor_id`, `writing_submission_id`, `speaking_submission_id`, điểm 4 tiêu chí, `overall_tutor_band`, `written_feedback`, `audio_feedback_url`, `deleted_at` (soft-delete).
- **Bài nộp (writing_submissions / speaking_submissions)**: Chứa `assigned_tutor_id`, `tutor_status`, `overall_tutor_band`, `status`.
- **Nhật ký kiểm toán (audit_logs)**: Ghi vết chấm điểm, sửa điểm, thu hồi kết quả của Giảng viên.

## 11. Tiêu chí thành công

- **SC-TGW-001 [AS-BUILT]**: 100% bài nộp trong Tutor Queue có `grader = 'tutor'` và `status = 'pending'`; 0% bài `grader = 'ai'` xuất hiện trong queue này.
- **SC-TGW-002 [TARGET]**: Khi 20 Giảng viên cùng bấm nhận 1 bài nộp đồng thời, đúng 1 Giảng viên nhận thành công và 19 Giảng viên nhận thông báo phản hồi phù hợp.
- **SC-TGW-003 [AS-BUILT]**: 100% kết quả chấm Giảng viên lưu riêng trong `tutor_feedback_reports` và không ghi đè điểm AI.
- **SC-TGW-004 [AS-BUILT]**: 100% thao tác bấm "Gợi ý AI" KHÔNG làm thay đổi `status` bài nộp từ `pending` sang `tutor_graded`.
- **SC-TGW-005 [AS-BUILT]**: 100% yêu cầu truy cập bài nộp hoặc thu hồi điểm từ Giảng viên không được gán bị từ chối với lỗi 403 Forbidden.
- **SC-TGW-006 [TARGET]**: Thời gian phản hồi API lưu điểm chấm Giảng viên dưới 1.5 giây ở điều kiện baseline.

## 12. Giả định

- Bảng `tutor_feedback_reports`, `writing_submissions`, `speaking_submissions`, `audit_logs` đã tồn tại với cột `assigned_tutor_id`, `tutor_status`, `overall_tutor_band`.
- View `v_tutor_grading_queue` hoặc tương đương đã được định nghĩa trong cơ sở dữ liệu.
- Dịch vụ AI Prelim gọi qua wrapper `ai-fast-grading`.
- Middleware `authenticate` và `authorize(['tutor', 'admin'])` đã sẵn sàng.

## 13. Phụ thuộc

- `AuditLogService` (`audit.service.js`) — phải hoạt động trước khi kiểm thử bất kỳ thao tác ghi.
- Dịch vụ AI Prelim (`ai-fast-grading`) — phải sẵn sàng trước khi kiểm thử Câu chuyện 3.
- Schema PostgreSQL cho `tutor_feedback_reports`, `audit_logs`.
- Dịch vụ STT (Speech-to-Text) — phải sẵn sàng cho chấm Speaking khi cần transcript.

## 14. Câu hỏi mở

1. **BR-TGW-009**: Khi Giảng viên thu hồi kết quả chấm, trạng thái bài nộp có tự động quay về `pending` không, hay Admin cần phân công lại thủ công?
2. Giảng viên có được phép đính kèm file ghi âm nhận xét (audio feedback) không, và nếu có thì giới hạn kích thước và định dạng là gì?
3. Thời hạn Giảng viên hoàn thành chấm bài sau khi nhận bài (SLA) có được kiểm soát bởi hệ thống không, hay chỉ là quy trình nội bộ?
