# Đặc tả tính năng: Luồng thi và nộp bài Writing

**Ngày tạo**: 2026-07-22
**Trạng thái**: Nền tảng HIỆN CÓ; các cổng phát hành MỤC TIÊU vẫn còn mở
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cho phép học viên đã xác thực chọn một đề thi Writing đã công bố, viết bài trả lời cho Task 1 và Task 2 trong giao diện chia đôi màn hình có đếm thời gian và đếm từ thời gian thực, sau đó nộp bài và chọn người chấm (AI hoặc Giảng viên). Khi chọn AI, học viên nhận kết quả ước tính 4 tiêu chí IELTS Writing được gắn nhãn rõ ràng là ước tính AI. Khi chọn Giảng viên, bài nộp vào hàng đợi chấm thủ công. Mỗi lần nộp tạo lịch sử riêng biệt để học viên theo dõi tiến bộ.

## 2. Phạm vi

- Giao diện thi Writing: đề bài song song với ô soạn thảo, đếm ngược thời gian, đếm từ thời gian thực, cảnh báo thiếu số từ.
- Nộp bài đầy đủ (Task 1 và Task 2) trong một DB transaction với `writing_group_id` chung.
- Lựa chọn người chấm tại thời điểm nộp (`grader = 'ai'` hoặc `grader = 'tutor'`).
- Kích hoạt luồng chấm AI bất đồng bộ sau transaction commit khi `grader = 'ai'`.
- Hiển thị kết quả 4 tiêu chí và band tổng hợp ngay sau khi AI chấm thành công (Writing đồng bộ trong phiên học).
- Bảo vệ dữ liệu học viên: AI thất bại không xóa bài nộp, không chuyển bài sang hàng đợi Giảng viên.

## 3. Ngoài phạm vi

- Pipeline AI nội bộ (prompt engineering, validator, retry, caching) — thuộc `ai-fast-grading`.
- Luồng chấm Giảng viên (Tutor Queue, Claim, Grade form) — thuộc `feat-tutor-grading-workspace`.
- Lịch sử bài nộp và trang báo cáo chi tiết — thuộc `feat-student-feedback-history`.
- Luồng thi và nộp bài Speaking — thuộc `feat-speaking-test-flow`.
- Xóa vật lý bài nộp hoặc chính sách lưu giữ — chưa được quyết định sản phẩm.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Làm bài, nộp bài, xem kết quả AI ngay, chọn người chấm. Mỗi lần nộp tạo lịch sử mới. |
| Khách/chưa đăng nhập | Xem đề thi (nếu công bố), bị điều hướng đến trang đăng nhập khi bấm bắt đầu. |
| Giảng viên/Admin | Không có tác nhân trực tiếp trong luồng này; Giảng viên chỉ tiếp nhận bài qua `feat-tutor-grading-workspace`. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Học viên làm bài Writing Task 1 và Task 2 (Ưu tiên: P1)

Với tư cách học viên, tôi muốn mở một đề thi Writing đã công bố, viết bài trả lời cho cả Task 1 và Task 2 trong giao diện chia đôi màn hình (đề bên trái, ô soạn thảo bên phải), đếm ngược thời gian và đếm số từ thời gian thực để biết mình đang ở đâu so với yêu cầu tối thiểu.

**Kiểm thử độc lập**: Mở một đề Writing có đủ Task 1 và Task 2, viết văn bản vào cả hai ô soạn thảo, xác minh bộ đếm từ cập nhật đúng (±2 từ so với backend), bộ hẹn giờ đếm ngược chính xác, và nút nộp bài chỉ kích hoạt khi cả hai Task đều có nội dung.

**Kịch bản chấp nhận**:

1. **Cho trước** đề thi Writing có hai Task đã công bố, **Khi** học viên mở đề, **Thì** giao diện hiển thị đề Task 1 bên trái và ô soạn thảo bên phải; học viên chuyển sang Task 2 qua thanh điều hướng phía dưới.
2. **Cho trước** học viên đang soạn bài, **Khi** gõ hoặc xóa văn bản, **Thì** bộ đếm từ cập nhật ngay lập tức và hiển thị cảnh báo nếu dưới ngưỡng tối thiểu (150 từ cho Task 1, 250 từ cho Task 2 theo khuyến nghị IELTS).
3. **Cho trước** bộ hẹn giờ đang chạy, **Khi** hết thời gian, **Thì** hộp thoại chọn người chấm xuất hiện tự động và học viên buộc phải chọn người chấm.
4. **Cho trước** cả hai Task có nội dung, **Khi** học viên bấm nộp sớm, **Thì** hộp thoại xác nhận chọn người chấm hiện ra trước khi gửi.

### Câu chuyện 2 — Nộp bài Writing và chọn người chấm (Ưu tiên: P1)

Với tư cách học viên, tôi muốn chọn `AI chấm điểm` hoặc `Giảng viên chấm` khi nộp bài để nhận kết quả theo cách tôi mong muốn.

**Kiểm thử độc lập**: Nộp bài với `grader = ai` — xác minh tạo 2 bản ghi `writing_submissions` cùng `writing_group_id`, trạng thái `ai_status` cập nhật sau chấm. Nộp bài khác với `grader = tutor` — xác minh bài ở trạng thái `status = 'pending'` và không gọi AI.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên đã viết đủ Task 1 và Task 2, **Khi** chọn `AI chấm điểm` và xác nhận nộp, **Thì** hệ thống lưu hai bản ghi `writing_submissions` cùng `writing_group_id` trong một transaction và kích hoạt luồng chấm AI.
2. **Cho trước** học viên đã viết đủ Task 1 và Task 2, **Khi** chọn `Giảng viên chấm` và xác nhận nộp, **Thì** hệ thống lưu hai bản ghi với `grader = 'tutor'` và `status = 'pending'`, không gọi dịch vụ AI.
3. **Cho trước** Task 1 dưới 50 từ hoặc Task 2 dưới 100 từ, **Khi** nộp bài chọn AI, **Thì** hệ thống từ chối với mã lỗi trước khi gọi AI hoặc trừ hạn mức.
4. **Cho trước** request thiếu Task 1 hoặc Task 2, hoặc `grader` không hợp lệ (khác `ai`/`tutor`), **Khi** nộp, **Thì** hệ thống trả lỗi 400 với thông báo rõ ràng.
5. **Cho trước** cùng một học viên nộp cùng đề thi nhiều lần liên tiếp, **Khi** nộp, **Thì** mỗi lần tạo lịch sử mới độc lập, không ghi đè bài cũ.

### Câu chuyện 3 — Xem kết quả chấm AI ngay sau khi nộp (Ưu tiên: P2)

Với tư cách học viên chọn AI chấm, tôi muốn nhìn thấy điểm bốn tiêu chí Writing (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) cùng band tổng hợp ngay sau khi bài được chấm xong.

**Kiểm thử độc lập**: Sau khi nộp thành công với `grader = ai`, xác minh giao diện chuyển sang màn hình kết quả hiển thị đủ bốn tiêu chí, band tổng hợp theo trọng số 33% (Task 1) / 67% (Task 2), nhãn `AI Estimated Band` và các gợi ý cải thiện.

**Kịch bản chấp nhận**:

1. **Cho trước** bài nộp đã được AI chấm thành công, **Khi** giao diện chuyển sang màn hình kết quả, **Thì** hiển thị bốn điểm tiêu chí và band tổng hợp cho mỗi task cùng nhãn `AI Estimated Band`.
2. **Cho trước** AI chấm thất bại cho một hoặc cả hai task, **Khi** hiển thị kết quả, **Thì** thông báo trạng thái lỗi rõ ràng và giữ bài nộp trong lịch sử để tra cứu sau; bài nộp KHÔNG bị xóa và KHÔNG tự chuyển sang hàng đợi Giảng viên.

## 6. Trường hợp biên

- Học viên tải lại trang (F5) giữa chừng khi đang viết — bản nháp chưa lưu bị mất; đây là thiết kế cố ý để tái hiện điều kiện thi thật.
- Mạng bị gián đoạn đúng lúc gửi request nộp bài — client phải hiển thị thông báo lỗi mạng và giữ dữ liệu chờ người dùng thử lại.
- Đề thi chỉ có một Task hoặc nhiều hơn hai Task — hệ thống từ chối; chỉ chấp nhận đúng 2 Tasks (task_number 1 và 2).
- Trường `test_id` không tồn tại hoặc không phải UUID hợp lệ — trả lỗi 400.
- Hai request nộp bài đồng thời từ cùng một học viên với cùng idempotency key — chỉ một request được xử lý, request còn lại nhận lại kết quả của request đầu tiên.
- Học viên cố ý gửi `userId` trong request body — hệ thống bỏ qua và chỉ lấy `user_id` từ phiên đăng nhập (`req.user.id`).

## 7. Quy tắc nghiệp vụ

- **BR-WTF-001 [AS-BUILT]**: Chỉ học viên đã xác thực mới có thể nộp bài Writing; `user_id` phải được lấy từ `req.user.id` (phiên JWT), không tin dữ liệu client.
- **BR-WTF-002 [AS-BUILT]**: Một lần nộp bài Writing đầy đủ chứa đúng Task 1 (task_number = 1) và Task 2 (task_number = 2), không trùng lặp.
- **BR-WTF-003 [AS-BUILT]**: Hai bản ghi `writing_submissions` phải được insert trong cùng một DB transaction với chung một `writing_group_id` mới được tạo (UUID).
- **BR-WTF-004 [AS-BUILT]**: Ngưỡng từ tối thiểu để gọi AI là Task 1 ≥ 50 từ và Task 2 ≥ 100 từ. Bài không đủ từ bị từ chối trước khi tiêu tốn hạn mức AI.
- **BR-WTF-005 [AS-BUILT]**: Mỗi lần nộp bài tạo lịch sử mới độc lập; không có cơ chế ghi đè bài nộp cũ.
- **BR-WTF-006 [AS-BUILT]**: Khi `grader = 'ai'`, luồng chấm AI được kích hoạt sau khi transaction commit thành công. Lỗi AI KHÔNG được xóa bài nộp hoặc tự động chuyển bài sang hàng đợi Giảng viên.
- **BR-WTF-007 [AS-BUILT]**: Khi `grader = 'tutor'`, bài nộp giữ `status = 'pending'` và `grader = 'tutor'` để hiển thị trong hàng đợi Giảng viên; không gọi AI.
- **BR-WTF-008 [AS-BUILT]**: Điểm tổng hợp Writing AI được tính theo trọng số 33% Task 1 + 67% Task 2 và làm tròn theo quy tắc IELTS nấc 0.5.
- **BR-WTF-009 [AS-BUILT]**: Kết quả AI Writing được gắn nhãn `AI Estimated Band` để phân biệt rõ với điểm IELTS chính thức. Điểm AI và điểm Giảng viên lưu ở cột riêng biệt, không ghi đè lẫn nhau.
- **BR-WTF-010 [NEEDS CLARIFICATION]**: Chính sách lưu giữ và xóa bài nộp (bao gồm bản nháp chưa nộp và bài nộp cũ) chưa được phê duyệt.

## 8. Yêu cầu chức năng

- **FR-WTF-001 [AS-BUILT]**: Giao diện thi PHẢI hiển thị đề Task 1 và Task 2 trong bố cục chia đôi màn hình (đề bên trái, soạn thảo bên phải) với thanh điều hướng chuyển task ở phía dưới.
- **FR-WTF-002 [AS-BUILT]**: Bộ đếm từ PHẢI cập nhật thời gian thực khi học viên gõ văn bản và hiển thị cảnh báo khi dưới ngưỡng khuyến nghị (150 từ Task 1, 250 từ Task 2). Sai số tối đa ±2 từ so với backend.
- **FR-WTF-003 [AS-BUILT]**: Bộ hẹn giờ PHẢI đếm ngược theo thời lượng đề thi; khi hết giờ, hộp thoại chọn người chấm PHẢI tự động xuất hiện và học viên không thể bỏ qua.
- **FR-WTF-004 [AS-BUILT]**: Nút nộp bài PHẢI bị vô hiệu hóa khi bất kỳ Task nào còn trống.
- **FR-WTF-005 [AS-BUILT]**: Hộp thoại nộp bài PHẢI cho phép học viên chọn `AI chấm điểm` hoặc `Giảng viên chấm` trước khi xác nhận.
- **FR-WTF-006 [AS-BUILT]**: API nộp bài (`POST /api/v1/submissions/writing/full`) PHẢI lấy `user_id` từ `req.user.id`, KHÔNG tin `req.body.userId`. Phải validate đúng hai task (task_number 1 và 2), không trùng lặp, `response_text` không rỗng.
- **FR-WTF-007 [AS-BUILT]**: Service PHẢI kiểm tra ngưỡng từ tối thiểu (Task 1 ≥ 50, Task 2 ≥ 100) và từ chối trước khi gọi AI hoặc trừ hạn mức nếu không đạt.
- **FR-WTF-008 [AS-BUILT]**: Hai bản ghi `writing_submissions` PHẢI được insert trong cùng một DB transaction với `writing_group_id` chung.
- **FR-WTF-009 [AS-BUILT]**: Nếu `grader = 'ai'`, service PHẢI kích hoạt dịch vụ chấm AI sau khi transaction commit thành công; lỗi AI KHÔNG được xóa bài nộp hay chuyển bài sang Giảng viên.
- **FR-WTF-010 [AS-BUILT]**: Nếu `grader = 'tutor'`, bài nộp PHẢI giữ `status = 'pending'` để hiển thị trong hàng đợi Giảng viên mà không gọi AI.
- **FR-WTF-011 [AS-BUILT]**: Service PHẢI validate `test_id` tùy chọn — nếu cung cấp thì phải tồn tại trong `mock_tests` và là UUID hợp lệ.
- **FR-WTF-012 [AS-BUILT]**: Màn hình kết quả AI PHẢI hiển thị đủ bốn tiêu chí Writing, band tổng hợp theo trọng số 33%/67%, gợi ý cải thiện và nhãn `AI Estimated Band`.
- **FR-WTF-013 [AS-BUILT]**: Mọi API response PHẢI tuân thủ envelope `{ success, data, error, meta }`.
- **FR-WTF-014 [TARGET]**: Giao diện PHẢI hiển thị cảnh báo rõ ràng trước khi học viên rời trang khi đang có bài viết chưa nộp (unload guard).

## 9. Yêu cầu phi chức năng

- **NFR-WTF-001 [AS-BUILT]**: Tất cả API endpoints xử lý bài nộp phải xác thực JWT và phạm vi vai trò trước khi xử lý.
- **NFR-WTF-002 [AS-BUILT]**: `user_id` luôn được lấy từ phiên server; client không thể tự khai báo hoặc giả mạo danh tính.
- **NFR-WTF-003 [TARGET]**: Thời gian từ lúc bấm nộp đến khi nhận kết quả AI (Writing đồng bộ) PHẢI dưới 30 giây ở điều kiện mạng bình thường; bằng chứng đo lường chưa có.
- **NFR-WTF-004 [TARGET]**: Bộ đếm từ phía client và phía server không được lệch quá ±2 từ; cần kiểm thử cross-browser.

## 10. Thực thể chính

- **Bài nộp Writing (writing_submissions)**: Chứa `user_id`, `test_id`, `task_number` (1 hoặc 2), `prompt_text`, `response_text`, `word_count`, `grader`, `status`, `writing_group_id`, `ai_status`, `overall_ai_band`, `assigned_tutor_id`.
- **Đề thi (mock_tests)**: Đề Writing đã công bố với `skill = 'writing'`, chứa metadata thời lượng và danh sách task.
- **Báo cáo AI (ai_grading_reports)**: Kết quả chấm theo bốn tiêu chí IELTS Writing, được tạo bởi dịch vụ AI từ `ai-fast-grading`.

## 11. Tiêu chí thành công

- **SC-WTF-001 [AS-BUILT]**: 100% bài nộp Writing thành công có đúng hai bản ghi (Task 1 và Task 2) cùng `writing_group_id` trong cơ sở dữ liệu.
- **SC-WTF-002 [AS-BUILT]**: 100% bài nộp với Task dưới ngưỡng từ tối thiểu bị từ chối trước khi tiêu tốn hạn mức AI hoặc tạo công việc chấm.
- **SC-WTF-003 [TARGET]**: Bộ đếm từ trên giao diện có sai số không quá ±2 từ so với kết quả đếm phía server.
- **SC-WTF-004 [TARGET]**: Thời gian từ lúc bấm nộp đến khi nhận kết quả AI (Writing) dưới 30 giây ở điều kiện mạng bình thường.
- **SC-WTF-005 [AS-BUILT]**: 100% bài chọn `grader = 'tutor'` KHÔNG gọi dịch vụ AI và giữ `status = 'pending'`.
- **SC-WTF-006 [AS-BUILT]**: 100% bài chọn `grader = 'ai'` khi AI thất bại vẫn tồn tại trong cơ sở dữ liệu và KHÔNG tự chuyển sang hàng đợi Giảng viên.

## 12. Giả định

- Danh tính học viên đã xác thực qua middleware `authenticate` cung cấp `req.user.id` hợp lệ.
- Dịch vụ chấm AI Writing thuộc phạm vi `ai-fast-grading` đã sẵn sàng và có thể gọi.
- Bảng `writing_submissions`, `ai_grading_reports`, `mock_tests` đã có trong cơ sở dữ liệu với các cột mở rộng cần thiết.
- Frontend dùng React 18 + Vite + Bootstrap 5 theo Hiến pháp dự án.

## 13. Phụ thuộc

- Dịch vụ chấm AI Writing (`gradeWriting`) thuộc `ai-fast-grading` — phải sẵn sàng trước khi kiểm thử luồng `grader = 'ai'`.
- Middleware `authenticate` và `authorize` của Express backend.
- Schema PostgreSQL cho `writing_submissions`, `writing_group_id`, `ai_usage_logs`.

## 14. Câu hỏi mở

1. **BR-WTF-010**: Chính sách lưu giữ và xóa bài nộp Writing (vòng đời dữ liệu) chưa được phê duyệt — cần Product Owner quyết định trước phát hành production.
2. Học viên có được phép xem lại bài nộp Writing trong giao diện chấm bài của chính mình (chỉ đọc) sau khi đã nộp không?
3. Cơ chế idempotency cho request nộp bài Writing (nếu mạng gián đoạn và client gửi lại) — hiện có hay chưa?
