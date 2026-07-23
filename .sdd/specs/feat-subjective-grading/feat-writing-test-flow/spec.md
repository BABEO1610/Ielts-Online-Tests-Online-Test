# Đặc tả tính năng: Luồng thi và nộp bài Writing

**Ngày tạo**: 2026-07-22

**Trạng thái**: Bản nháp

**Đầu vào**: Phân rã từ `feat-subjective-grading`; AI Engine/Pipeline thuộc phạm vi `ai-fast-grading`.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Học viên làm bài Writing Task 1 và Task 2 (Ưu tiên: P1)

Là học viên, tôi muốn mở một đề thi Writing đã phát hành, viết bài trả lời cho cả Task 1 và Task 2 trong giao diện chia đôi màn hình (đề bên trái, ô soạn thảo bên phải), đếm ngược thời gian và đếm số từ thời gian thực để tôi biết mình đang ở đâu so với yêu cầu tối thiểu.

**Lý do ưu tiên**: Đây là luồng cốt lõi tạo ra bài nộp — nếu không có bước này thì không có gì để chấm.

**Kiểm thử độc lập**: Mở một đề Writing có đủ Task 1 và Task 2 trên trình duyệt, viết văn bản vào cả hai ô soạn thảo, xác minh bộ đếm từ cập nhật đúng, bộ hẹn giờ đếm ngược chính xác và nút nộp bài chỉ kích hoạt khi cả hai Task đều có nội dung.

**Kịch bản chấp nhận**:

1. **Cho trước** đề thi Writing có hai Task đã phát hành, **khi** học viên mở đề, **thì** giao diện hiển thị đề Task 1 bên trái và ô soạn thảo bên phải; học viên có thể chuyển sang Task 2 bằng thanh điều hướng phía dưới.
2. **Cho trước** học viên đang soạn bài, **khi** gõ hoặc xóa văn bản, **thì** bộ đếm từ cập nhật ngay lập tức và hiển thị cảnh báo nếu dưới ngưỡng tối thiểu (150 từ cho Task 1, 250 từ cho Task 2).
3. **Cho trước** bộ hẹn giờ đang chạy, **khi** hết thời gian, **thì** hộp thoại nộp bài xuất hiện tự động và học viên bắt buộc chọn người chấm.
4. **Cho trước** cả hai Task có nội dung, **khi** học viên bấm nộp sớm, **thì** hộp thoại xác nhận hiện ra để chọn người chấm trước khi gửi.

---

### Câu chuyện người dùng 2 — Nộp bài Writing và chọn người chấm (Ưu tiên: P1)

Là học viên, tôi muốn chọn `AI chấm điểm` hoặc `Giảng viên chấm` khi nộp bài để nhận kết quả theo cách tôi mong muốn.

**Lý do ưu tiên**: Quyết định routing (`grader`) xác định toàn bộ luồng xử lý phía sau — AI tự động hoặc hàng đợi giáo viên.

**Kiểm thử độc lập**: Nộp bài với `grader = ai`, xác minh hệ thống trả về kết quả chấm. Nộp bài khác với `grader = tutor`, xác minh bài vào trạng thái chờ.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên đã viết đủ Task 1 và Task 2, **khi** chọn `AI chấm điểm` và xác nhận nộp, **thì** hệ thống lưu hai bản ghi `writing_submissions` cùng `writing_group_id`, gọi dịch vụ chấm AI và trả về kết quả bốn tiêu chí cho mỗi task.
2. **Cho trước** học viên đã viết đủ Task 1 và Task 2, **khi** chọn `Giảng viên chấm` và xác nhận nộp, **thì** hệ thống lưu hai bản ghi với `grader = 'tutor'` và `status = 'pending'`, không gọi dịch vụ AI.
3. **Cho trước** Task 1 dưới 50 từ hoặc Task 2 dưới 100 từ, **khi** nộp bài chọn AI, **thì** hệ thống từ chối trước khi gọi AI hoặc trừ lượt.
4. **Cho trước** request thiếu Task 1 hoặc Task 2, **khi** nộp, **thì** hệ thống trả lỗi 400 với thông báo rõ ràng.
5. **Cho trước** giá trị `grader` không hợp lệ (khác `ai` hoặc `tutor`), **khi** nộp, **thì** hệ thống từ chối.

---

### Câu chuyện người dùng 3 — Xem kết quả chấm AI ngay sau khi nộp (Ưu tiên: P2)

Là học viên chọn AI chấm, tôi muốn nhìn thấy điểm bốn tiêu chí Writing (Task Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy) cùng band tổng hợp ngay sau khi bài được chấm xong để biết điểm mạnh, điểm yếu.

**Lý do ưu tiên**: Giá trị cốt lõi của lựa chọn AI là phản hồi tức thì — nếu không hiển thị kết quả thì chọn AI mất ý nghĩa.

**Kiểm thử độc lập**: Sau khi nộp thành công với `grader = ai`, xác minh giao diện chuyển sang màn hình kết quả hiển thị đủ bốn tiêu chí, band tổng hợp theo trọng số 33% (Task 1) / 67% (Task 2), nhãn `AI Estimated Band` và các gợi ý cải thiện.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp đã được AI chấm thành công, **khi** giao diện chuyển sang màn hình kết quả, **thì** hiển thị bốn điểm tiêu chí và band tổng hợp cho mỗi task cùng nhãn `AI Estimated Band`.
2. **Cho trước** AI chấm thất bại cho một hoặc cả hai task, **khi** hiển thị kết quả, **thì** thông báo trạng thái lỗi rõ ràng và giữ bài nộp trong lịch sử để tra cứu sau.

---

### Trường hợp biên

- Học viên làm mới trang giữa chừng khi đang viết (mất bản nháp chưa lưu).
- Mạng bị gián đoạn đúng lúc gửi request nộp bài.
- Học viên nộp cùng một `test_id` nhiều lần liên tiếp (mỗi lần tạo lịch sử mới, không ghi đè).
- Đề thi chỉ có một Task hoặc nhiều hơn hai Task (hệ thống từ chối).
- Trường `test_id` không tồn tại hoặc không phải UUID hợp lệ.
- Hai request nộp đồng thời từ cùng một học viên.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Giao diện thi PHẢI hiển thị đề Task 1 và Task 2 trong bố cục chia đôi màn hình (đề bên trái, soạn thảo bên phải) với thanh điều hướng chuyển task ở phía dưới.
- **FR-002**: Bộ đếm từ PHẢI cập nhật thời gian thực khi học viên gõ văn bản và hiển thị cảnh báo khi dưới ngưỡng tối thiểu.
- **FR-003**: Bộ hẹn giờ PHẢI đếm ngược theo thời lượng đề thi; khi hết giờ, hộp thoại nộp bài PHẢI tự động xuất hiện.
- **FR-004**: Nút nộp bài PHẢI bị vô hiệu hóa khi bất kỳ Task nào còn trống.
- **FR-005**: Hộp thoại nộp bài PHẢI cho phép học viên chọn `AI chấm điểm` hoặc `Giảng viên chấm` trước khi xác nhận.
- **FR-006**: API nộp bài (`POST /api/v1/submissions/writing/full`) PHẢI lấy `user_id` từ `req.user.id` (phiên đăng nhập), KHÔNG tin `req.body.userId`.
- **FR-007**: Service PHẢI validate đúng hai task (task_number 1 và 2), không trùng lặp, `response_text` không rỗng.
- **FR-008**: Service PHẢI tính `word_count` cho mỗi task và từ chối nếu Task 1 dưới 50 từ hoặc Task 2 dưới 100 từ trước khi gọi AI hoặc trừ lượt.
- **FR-009**: Hai bản ghi `writing_submissions` PHẢI được insert trong cùng một DB transaction với chung `writing_group_id`.
- **FR-010**: Nếu `grader = ai`, service PHẢI gọi dịch vụ chấm AI (từ `ai-fast-grading`) sau khi transaction commit thành công; AI thất bại KHÔNG được xóa bài nộp.
- **FR-011**: Nếu `grader = tutor`, bài nộp PHẢI giữ `status = 'pending'` và `grader = 'tutor'` để hiện trong hàng đợi giáo viên.
- **FR-012**: Service PHẢI validate `test_id` tùy chọn — nếu cung cấp thì phải tồn tại trong `mock_tests` và là UUID hợp lệ.
- **FR-013**: Mỗi lần nộp PHẢI tạo lịch sử mới; KHÔNG ghi đè bài nộp cũ.
- **FR-014**: Mọi API response PHẢI tuân thủ envelope `{ success, data, error, meta }`.
- **FR-015**: Màn hình kết quả AI PHẢI hiển thị đủ bốn tiêu chí Writing, band tổng hợp theo trọng số 33%/67%, gợi ý cải thiện và nhãn `AI Estimated Band`.

### Thực thể chính

- **Bài nộp Writing (writing_submissions)**: Chứa `user_id`, `test_id`, `task_number` (1 hoặc 2), `prompt_text`, `response_text`, `word_count`, `grader`, `status`, `writing_group_id`.
- **Đề thi (mock_tests)**: Đề Writing đã phát hành với `skill = 'writing'`, chứa metadata thời lượng và danh sách task.
- **Báo cáo AI (ai_grading_reports)**: Kết quả chấm theo bốn tiêu chí IELTS Writing, được tạo bởi dịch vụ AI từ `ai-fast-grading`.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả đo lường được

- **SC-001**: 100% bài nộp Writing thành công PHẢI có đúng hai bản ghi (Task 1 và Task 2) cùng `writing_group_id` trong cơ sở dữ liệu.
- **SC-002**: 100% bài nộp với Task dưới ngưỡng từ tối thiểu PHẢI bị từ chối trước khi tiêu thụ lượt AI hoặc tạo công việc chấm.
- **SC-003**: Bộ đếm từ trên giao diện PHẢI có sai số không quá ±2 từ so với kết quả đếm phía backend.
- **SC-004**: Thời gian từ lúc bấm nộp đến khi nhận kết quả AI (Writing đồng bộ) PHẢI dưới 30 giây ở điều kiện mạng bình thường.
- **SC-005**: 100% bài chọn `grader = tutor` KHÔNG được gọi dịch vụ AI và PHẢI giữ `status = 'pending'`.
- **SC-006**: 100% bài chọn `grader = ai` khi AI thất bại vẫn giữ bài nộp trong cơ sở dữ liệu, có báo cáo lỗi và KHÔNG tự chuyển sang hàng đợi giáo viên.

## Giả định và phụ thuộc

- Đã có bảng `writing_submissions`, `ai_grading_reports`, `mock_tests` trong cơ sở dữ liệu với các cột mở rộng (`writing_group_id`, `ai_status`, `overall_ai_band`, `word_count`).
- Dịch vụ chấm AI Writing (prompt, validator, scoring) thuộc phạm vi `ai-fast-grading` và đã sẵn sàng để gọi.
- Hệ thống xác thực (`authenticate` middleware) đã hoạt động và cung cấp `req.user.id`.
- Frontend dùng React 18 + Vite + Bootstrap 5 theo Constitution.
- Backend dùng Express 5 + `pg` (raw SQL parameterized) theo Constitution.

## Ngoài phạm vi

- Pipeline AI Engine nội bộ (prompt engineering, validator, retry, caching) — thuộc `ai-fast-grading`.
- Luồng chấm giáo viên (Tutor Queue, Claim, Grade) — thuộc `feat-tutor-grading-workspace`.
- Lịch sử bài nộp và trang feedback chi tiết — thuộc `feat-student-feedback-history`.
- Luồng thi và nộp bài Speaking — thuộc `feat-speaking-test-flow`.
