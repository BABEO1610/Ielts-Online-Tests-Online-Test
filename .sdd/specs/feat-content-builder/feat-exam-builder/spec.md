# Đặc tả tính năng: Công cụ Xây dựng Đề thi (Exam Builder)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Final
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cho phép Giảng viên (Tutor) xây dựng và cập nhật nội dung đề thi (Reading, Listening) một cách an toàn và hiệu quả. Tính năng Exam Builder cung cấp cơ chế Hard Delete + Bulk Insert để đảm bảo tính nhất quán dữ liệu: khi cập nhật đề thi, toàn bộ câu hỏi cũ được xóa sạch và câu hỏi mới được chèn nguyên tử trong cùng một Database Transaction. Mọi hành động tạo/sửa/xóa đề thi đều được ghi log kiểm toán tự động để phục vụ quản trị hệ thống.

## 2. Phạm vi

- Tạo mới đề thi (mock_tests) với cấu trúc lồng ghép gồm Passage → Block → Question.
- Cập nhật toàn bộ nội dung câu hỏi của một đề thi bằng cơ chế Hard Delete + Bulk Insert trong một Transaction duy nhất.
- Tự động tính lại số thứ tự (`question_order`) dựa trên vị trí trong mảng dữ liệu gửi lên.
- Kiểm tra validation toàn diện (correctAnswer, cấu trúc) trước khi bắt đầu ghi DB.
- Ghi log kiểm toán (Audit Log) tự động cho mọi thao tác thay đổi dữ liệu đề thi.
- Cung cấp giao diện nhập liệu động (form/JSON) hỗ trợ cấu trúc đề Listening (có audio) và Reading (có passage văn bản).

## 3. Ngoài phạm vi

- Chấm điểm tự động và AI grading cho câu hỏi Speaking/Writing.
- Versioning (lưu nhiều phiên bản) đề thi — hệ thống chỉ giữ phiên bản mới nhất.
- Chức năng kéo thả giao diện (drag-and-drop UI) trong phiên này; mục tiêu là form nhập JSON/động.
- Phân quyền phê duyệt đề thi đa cấp (multi-level approval) nằm ngoài phạm vi Exam Builder.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Giảng viên (Tutor) | Tạo mới, xem, cập nhật toàn bộ nội dung đề thi và xuất bản đề thi của mình. |
| Quản trị viên (Admin) | Có thể xem và xóa bất kỳ đề thi nào; xem Audit Log liên quan. |
| Học viên/Khách | Chỉ xem đề thi đã được xuất bản (is_published = true); không thể tạo hoặc sửa. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Cập nhật nội dung đề thi an toàn (Ưu tiên: P1)

Với tư cách Giảng viên, tôi muốn cập nhật toàn bộ câu hỏi của một đề thi nhanh chóng mà không lo dữ liệu cũ còn sót lại, để đề thi luôn nhất quán sau mỗi lần chỉnh sửa.

**Kiểm thử độc lập**: Gọi `PUT /api/v1/tests/:id` với danh sách câu hỏi mới và xác minh dữ liệu cũ trong bảng `questions` và `test_passages` bị xóa sạch, dữ liệu mới được chèn thành công trong một Database Transaction duy nhất.

**Kịch bản chấp nhận**:

1. **Cho trước** một đề thi đang tồn tại với 40 câu hỏi, **Khi** Tutor gọi API cập nhật với danh sách 40 câu hỏi mới, **Thì** hệ thống thực hiện `DELETE FROM questions WHERE test_id = :id`, sau đó `INSERT` toàn bộ dữ liệu mới trong một Transaction, và trả về đề thi đã cập nhật.
2. **Cho trước** đang trong quá trình Bulk Insert và có lỗi database xảy ra giữa chừng (ví dụ: vi phạm constraint), **Khi** lỗi được ném ra, **Thì** hệ thống tự động gọi `ROLLBACK` và dữ liệu đề thi gốc (40 câu hỏi cũ) vẫn giữ nguyên.
3. **Cho trước** một đề thi có ít nhất một câu hỏi bị thiếu `correctAnswer`, **Khi** Tutor cố gắng xuất bản (is_published = true), **Thì** hệ thống từ chối với HTTP 400 và trả về danh sách các câu hỏi lỗi trước khi bắt đầu bất kỳ thao tác ghi DB nào.

### Câu chuyện 2 — Soạn thảo câu hỏi động theo cấu trúc lồng ghép (Ưu tiên: P1)

Với tư cách Giảng viên, tôi muốn tạo một đề thi hoàn chỉnh với cấu trúc Passage → Block → Question và hệ thống tự động sắp xếp thứ tự câu hỏi, giúp tôi không phải tính toán thủ công `question_order`.

**Kiểm thử độc lập**: Gọi `POST /api/v1/tests` với JSON chứa mảng lồng nhau (Passage → Block → Question) và xác minh tất cả entity được lưu đúng thứ tự `question_order` tăng dần vào DB, kèm `audio_url` đúng nếu là đề Listening.

**Kịch bản chấp nhận**:

1. **Cho trước** JSON chứa 10 câu hỏi Multiple Choice trong 2 passage, **Khi** Tutor gọi `POST /api/v1/tests`, **Thì** hệ thống lặp qua mảng, tự động gán `question_order` tăng dần từ 1 và lưu toàn bộ vào DB với đúng mối quan hệ cha-con (test → passage → block → question).
2. **Cho trước** Tutor tạo/sửa/xóa đề thi thành công, **Khi** transaction hoàn tất, **Thì** hệ thống tự động gọi `AuditLogService.logAction` để ghi log vết thao tác trước khi trả response.

## 6. Trường hợp biên

- Bulk Insert bị gián đoạn giữa chừng do mất kết nối DB — Transaction phải tự ROLLBACK.
- Mảng câu hỏi gửi lên có thứ tự không tuần tự hoặc bị thiếu `question_order` — hệ thống phải tính lại.
- Đề thi Listening có `audio_url` nhưng file trỏ đến không tồn tại trên storage.
- Hai Tutor đồng thời cập nhật cùng một đề thi (Concurrent PUT) — cần xử lý tranh chấp.
- Xuất bản đề thi có Passage nhưng không có câu hỏi nào bên trong.
- Bulk Insert số lượng rất lớn (hơn 200 câu hỏi) gây timeout.

## 7. Quy tắc nghiệp vụ

- **BR-EXB-001 [AS-BUILT]**: Cơ chế cập nhật cấu trúc đề thi là Hard Delete (DELETE toàn bộ câu hỏi/passage cũ) + Bulk Insert (INSERT câu hỏi mới), tất cả trong một Database Transaction. Không dùng Versioning.
- **BR-EXB-002 [AS-BUILT]**: Mọi thao tác Bulk Insert và Bulk Delete phải được bọc trong một Database Transaction duy nhất (`BEGIN ... COMMIT / ROLLBACK`). Không cho phép ghi từng phần.
- **BR-EXB-003 [AS-BUILT]**: `question_order` phải được tính lại tự động dựa trên vị trí của từng câu hỏi trong mảng gửi lên. Giá trị do client gửi bị bỏ qua và ghi đè.
- **BR-EXB-004 [AS-BUILT]**: Không được dùng ORM để thực thi Bulk Insert/Delete. Bắt buộc dùng Raw SQL với Parameterized Query (`$1`, `$2`, ...) thông qua thư viện `pg`.
- **BR-EXB-005 [AS-BUILT]**: Phải kiểm tra validation toàn bộ câu hỏi (đặc biệt là `correctAnswer`) trước khi bắt đầu Transaction. Đề thi có câu hỏi thiếu đáp án đúng không được xuất bản.
- **BR-EXB-006 [AS-BUILT]**: Mọi hành động tạo, cập nhật, xóa đề thi thành công phải ghi log kiểm toán thông qua `AuditLogService.logAction`. Log phải ghi trước khi trả response về client.
- **BR-EXB-007 [NEEDS CLARIFICATION]**: Chưa có chính sách xử lý tranh chấp khi hai Tutor đồng thời cập nhật cùng một đề thi. Cần quyết định dùng Optimistic Locking hay Last-Write-Wins.

## 8. Yêu cầu chức năng

- **FR-EXB-001 [AS-BUILT]**: API `POST /api/v1/tests` phải nhận JSON lồng ghép (test → passages → blocks → questions) và lưu nguyên tử toàn bộ cấu trúc vào DB.
- **FR-EXB-002 [AS-BUILT]**: API `PUT /api/v1/tests/:id` phải thực thi Hard Delete toàn bộ câu hỏi/passage cũ rồi Bulk Insert nội dung mới trong cùng một Transaction.
- **FR-EXB-003 [AS-BUILT]**: Hệ thống phải tự động tính lại và ghi đè `question_order` cho tất cả câu hỏi dựa trên vị trí trong mảng. Client không được kiểm soát giá trị này.
- **FR-EXB-004 [AS-BUILT]**: Validation phải kiểm tra toàn bộ câu hỏi trong mảng trước khi ghi DB. Bất kỳ câu hỏi nào thiếu `correctAnswer` phải dừng toàn bộ request và trả HTTP 400.
- **FR-EXB-005 [AS-BUILT]**: Sau mỗi thao tác ghi thành công (create/update/delete), hệ thống phải gọi `AuditLogService.logAction` đồng bộ trước khi trả response.
- **FR-EXB-006 [TARGET]**: Giao diện (Frontend) phải hỗ trợ form nhập liệu động cho phép thêm/xóa Passage và Question Block mà không cần tải lại trang.

## 9. Yêu cầu phi chức năng

- **NFR-EXB-001 [TARGET]**: Bulk Insert và Bulk Update 40 câu hỏi phải hoàn tất trong vòng 2000 mili-giây (2s) ở môi trường staging với tải thông thường.
- **NFR-EXB-002 [AS-BUILT]**: Không có dữ liệu mồ côi (orphan records) bị bỏ lại sau khi cập nhật đề thi. Lệnh `DELETE FROM questions WHERE test_id = :id` phải xóa sạch trước INSERT.
- **NFR-EXB-003 [AS-BUILT]**: Tất cả SQL phải dùng Parameterized Query. Cấm nối chuỗi SQL trực tiếp. Không dùng ORM.
- **NFR-EXB-004 [TARGET]**: Coverage kiểm thử tự động cho service layer (Transaction logic, validation, audit log trigger) phải đạt tối thiểu 80%, bao gồm happy path và ít nhất 1 error case (rollback scenario).

## 10. Thực thể chính

- **`mock_tests`**: Vỏ đề thi chứa metadata (tên, kỹ năng, độ khó, audio_url, trạng thái xuất bản).
- **`test_passages`**: Đoạn văn bản/bài đọc thuộc một đề thi; có thể rỗng nếu là Listening.
- **`question_blocks`**: Nhóm câu hỏi (ví dụ: True/False/Not Given, Multiple Choice) nằm trong một passage.
- **`questions`**: Từng câu hỏi chi tiết chứa nội dung, các lựa chọn, `correctAnswer` và `question_order`.

## 11. Tiêu chí thành công

- **SC-EXB-001 [TARGET]**: Bulk Insert & Bulk Update 40 câu hỏi thực thi và hoàn tất dưới 2000 mili-giây (2s) trên môi trường staging.
- **SC-EXB-002 [TARGET]**: 100% kịch bản UPDATE đề thi không để lại orphan records — xác minh bằng truy vấn kiểm tra sau mỗi test case.
- **SC-EXB-003 [TARGET]**: 100% thao tác create, update, delete đề thi thành công đều có dòng log tương ứng trong bảng `audit_logs`.
- **SC-EXB-004 [TARGET]**: Kịch bản ROLLBACK (lỗi giữa Bulk Insert) xác minh dữ liệu gốc vẫn còn nguyên sau khi request thất bại.

## 12. Giả định

- Giảng viên đã xác thực và có token hợp lệ trước khi gọi bất kỳ API nào của Exam Builder.
- Schema PostgreSQL cho các bảng `mock_tests`, `test_passages`, `question_blocks`, `questions` đã được tạo và ổn định trước khi triển khai tính năng này.
- Hàm `AuditLogService.logAction` đã có sẵn và hoạt động ổn định; Exam Builder chỉ gọi chứ không tự implement.

## 13. Phụ thuộc

- Module Authentication & Authorization để xác thực quyền `tutor` và `admin`.
- PostgreSQL với hỗ trợ Transaction (`BEGIN/COMMIT/ROLLBACK`) và kiểu dữ liệu JSONB.
- Module `AuditLogService` để ghi log kiểm toán — Exam Builder phụ thuộc vào interface của module này.
- Storage service (nếu là đề Listening) để lưu trữ và phục vụ `audio_url`.

## 14. Câu hỏi mở

1. **BR-EXB-007**: Khi hai Tutor đồng thời cập nhật cùng một đề thi, hệ thống dùng chiến lược nào: Optimistic Locking (phát hiện conflict, trả 409) hay Last-Write-Wins (ghi đè)? Cần quyết định trước khi implement.
2. Có giới hạn số lượng câu hỏi tối đa được phép trong một đề thi không (để kiểm soát timeout Bulk Insert)? Nếu có, giá trị cụ thể là bao nhiêu?
