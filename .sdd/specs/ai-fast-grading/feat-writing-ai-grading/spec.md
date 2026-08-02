# Đặc tả tính năng: Chấm nhanh Writing bằng AI

**Ngày tạo**: 2026-08-01  
**Trạng thái**: Đã triển khai phần lớn; còn hai regression T011–T012 trong `tasks.md`  
**Phạm vi nguồn**: Tách từ `ai-fast-grading` và đối chiếu với code hiện tại

## Bối cảnh nghiệp vụ

Học viên nộp trọn bộ Writing Task 1 và Task 2, chọn AI hoặc tutor và nhận một lịch sử bài làm mới. Khi chọn AI, hệ thống cần phản hồi nhanh việc đã nhận bài, chấm độc lập từng Task theo bốn tiêu chí IELTS Writing và chỉ công bố Overall Writing Band khi cả hai Task chấm thành công.

Module này chỉ quản lý AI grading sau khi học viên đã có nội dung Task 1/Task 2. Giao diện soạn bài và điều hướng đề thuộc `feat-subjective-grading/feat-writing-test-flow`; hàng đợi và thao tác chấm của tutor thuộc module tutor grading.

## Kịch bản người dùng và kiểm thử *(bắt buộc)*

### Câu chuyện người dùng 1 — Nộp trọn bộ Writing để AI chấm (Ưu tiên: P1)

Là học viên, tôi muốn nộp đúng một Task 1 và một Task 2 để hệ thống ghi nhận một lần nộp và bắt đầu chấm mà không tạo bài trùng.

**Kiểm thử độc lập**: Dùng provider giả, gửi `POST /api/v1/submissions/writing/full` với hai Task hợp lệ và một `Idempotency-Key`; xác minh hai dòng submission cùng `writing_group_id`, một root grading job và response thành công.

**Kịch bản chấp nhận**:

1. **Cho trước** Task 1 có ít nhất 50 từ và Task 2 có ít nhất 100 từ, **khi** học viên nộp với `grader=ai`, **thì** hệ thống lưu hai Task trong cùng transaction và trả group ở trạng thái chờ.
2. **Cho trước** một Task thiếu, trùng số Task hoặc dưới ngưỡng từ, **khi** nộp, **thì** hệ thống từ chối trước provider call và trước khi trừ quota.
3. **Cho trước** cùng khóa và cùng payload được gửi lại trong cửa sổ idempotency, **khi** xử lý, **thì** hệ thống trả lại group cũ; cùng khóa nhưng payload khác bị từ chối.

---

### Câu chuyện người dùng 2 — Nhận điểm và phản hồi theo đúng rubric (Ưu tiên: P1)

Là học viên, tôi muốn xem bốn tiêu chí của từng Task và Overall Writing Band để biết điểm mạnh, điểm yếu và hướng cải thiện.

**Kiểm thử độc lập**: Cho provider giả trả kết quả hợp lệ cho cả hai Task; xác minh mỗi Task có report đã chuẩn hóa và Overall bằng `Task 1 × 1/3 + Task 2 × 2/3`, làm tròn về nửa band.

**Kịch bản chấp nhận**:

1. **Cho trước** cả hai Task chấm thành công, **khi** kết quả được lưu, **thì** mỗi Task có Task Achievement/Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy và band riêng.
2. **Cho trước** hai band Task hợp lệ, **khi** tổng hợp, **thì** backend tính Overall theo trọng số 33%/67%; frontend chỉ hiển thị giá trị backend đã chuẩn hóa.
3. **Cho trước** một Task chấm thất bại, **khi** xử lý nền kết thúc, **thì** AI status của group là `failed`, Overall là `null` và không công bố kết quả tổng hợp một phần.

---

### Câu chuyện người dùng 3 — Theo dõi kết quả an toàn và nhất quán (Ưu tiên: P2)

Là học viên, tôi muốn xem lại kết quả từ lịch sử hoặc nhận thông báo hoàn tất mà không nhìn thấy dữ liệu nội bộ của provider.

**Kiểm thử độc lập**: Hoàn tất một group, đọc feedback qua API/history và xác minh envelope chuẩn, nội dung tiếng Việt, không có raw AI response, stack trace hoặc khóa nội bộ.

**Kịch bản chấp nhận**:

1. **Cho trước** grading hoàn tất, **khi** học viên mở chi tiết, **thì** hệ thống trả hai report, Overall và metadata an toàn.
2. **Cho trước** provider trả JSON sai hoặc tạm lỗi, **khi** hệ thống lưu lỗi, **thì** người dùng chỉ nhận mã lỗi ổn định và thông báo an toàn.
3. **Cho trước** group đã hoàn tất, **khi** Socket.IO phát sự kiện, **thì** sự kiện tham chiếu `writing_group_id` và band tổng hợp tương ứng.

### Trường hợp biên

- Hai request đồng thời khi người dùng chỉ còn một lượt quota trong ngày UTC.
- Khóa idempotency hết hạn hoặc bị tái sử dụng cho payload khác.
- Nội dung chứa markup, ký tự điều khiển hoặc khoảng trắng bất thường.
- Provider trả band ngoài thang 0–9, không theo bước 0.5 hoặc thiếu một criterion.
- API process dừng sau khi commit submission nhưng trước khi xử lý nền hoàn tất.
- Một Task thành công và Task còn lại thất bại.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

- **FR-001**: Mọi endpoint ghi dữ liệu PHẢI xác thực học viên và lấy `user_id` từ phiên đăng nhập.
- **FR-002**: Full submission PHẢI có đúng Task 1 và Task 2, không thiếu hoặc trùng `task_number`.
- **FR-003**: AI submission PHẢI kiểm tra tối thiểu 50 từ cho Task 1 và 100 từ cho Task 2 trước quota và provider call.
- **FR-004**: Nội dung Writing PHẢI được chuẩn hóa/sanitize nhưng không được làm thay đổi ý nghĩa bài viết.
- **FR-005**: AI submission PHẢI có `Idempotency-Key`; replay cùng payload trả kết quả cũ, còn cùng khóa khác payload hoặc cùng fingerprint khác khóa bị từ chối.
- **FR-006**: Hai submission cùng group và root grading job PHẢI được tạo nguyên tử; bài tutor không tạo AI job.
- **FR-007**: Original AI group PHẢI dùng quota chung tối đa 10 lượt/người/ngày UTC; replay hợp lệ không tính thêm.
- **FR-008**: Mọi lời gọi chấm PHẢI đi qua `backend/src/ai/grading.service.js`, có timeout, validate output và usage metadata an toàn.
- **FR-009**: Mỗi Task PHẢI có bốn criterion band hợp lệ và band tổng; không lưu raw provider output làm response công khai.
- **FR-010**: Overall Writing Band PHẢI do backend tính từ Task 1/Task 2 theo trọng số 1/3 và 2/3, làm tròn nửa band.
- **FR-011**: Chỉ khi cả hai Task thành công, group mới chuyển `ai_graded`; nếu có lỗi, `ai_status=failed` và Overall `null`.
- **FR-012**: API PHẢI dùng envelope `{ success, data, error, meta }`; chi tiết validation thuộc `error.details`, request ID thuộc `meta`.
- **FR-013**: Lịch sử và feedback PHẢI giới hạn theo owner/role và không trả stack trace, prompt thô, khóa provider hoặc diagnostic nhạy cảm.
- **FR-014**: Luồng chấm Writing hiện tại là xử lý nền trong API process; tài liệu không được mô tả nó như worker bền vững của Speaking khi chưa có thay đổi code tương ứng.

### Thực thể chính

- **Writing Group**: Một lần nộp gồm đúng hai `writing_submissions` dùng chung `writing_group_id`.
- **Writing Submission**: Nội dung, số Task, số từ, grader và trạng thái của từng Task.
- **AI Grading Job**: Root record phục vụ idempotency, quota và trạng thái tổng của group Writing.
- **AI Grading Report**: Kết quả đã validate cho một Task, gồm criteria, feedback, band, model và prompt version.

## Tiêu chí thành công *(bắt buộc)*

- **WSC-001**: 100% payload thiếu/trùng Task hoặc dưới ngưỡng từ bị chặn trước provider call và quota.
- **WSC-002**: 20 request đồng thời cùng khóa/payload chỉ tạo một group gồm hai submission và một root job.
- **WSC-003**: 100% kết quả hoàn tất có đủ bốn tiêu chí cho từng Task; Overall khớp trọng số 1/3–2/3.
- **WSC-004**: Không response/log nào chứa API key, raw AI response, stack trace hoặc nội dung bài viết ngoài nơi lưu trữ được phép.
- **WSC-005**: Unit/integration test cho business logic Writing mới đạt tối thiểu 80% coverage.
- **WSC-006**: Regression API lỗi ngắn và màn hình Overall Writing Band đều đạt trước khi phát hành.

## Giả định và phụ thuộc

- Provider được cấu hình qua gateway AI hiện có và được mock trong automated test.
- Schema từ migrations `020`, `021`, `022` và `025` đã được áp dụng.
- Socket.IO chỉ là kênh thông báo; database vẫn là nguồn sự thật cho trạng thái/kết quả.

## Ngoài phạm vi

- Màn hình soạn bài/đếm giờ và cấp đề Writing.
- Quy trình tutor claim, chấm tay, revoke hoặc admin oversight.
- Chuyển Writing sang worker queue bền vững; đây là cải tiến kiến trúc riêng nếu được duyệt.
- Tuyên bố AI band là điểm IELTS chính thức.
