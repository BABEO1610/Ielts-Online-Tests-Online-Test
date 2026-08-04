# Đặc tả tính năng: Engine Chấm điểm Tự động (feat-auto-grading)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Completed
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

Hiện tại hệ thống chưa có cơ chế chấm điểm tự động cho bài thi trắc nghiệm (Reading & Listening), gây trễ trong trả kết quả, thiếu nhất quán do giáo viên chấm tay, và dễ tính sai Band Score.
Tính năng này cung cấp một Engine chấm điểm tự động, hoạt động nhanh chóng, so khớp chính xác đáp án (bao gồm điền từ có khoảng trắng, chữ hoa, đáp án thay thế, v.v.), và tự động tính chuẩn Band Score dựa trên bảng IELTS Academic chuẩn.

## 2. Phạm vi

- Endpoint nộp bài và chấm điểm API `POST /api/v1/tests/:id/attempts`.
- Logic chuẩn hóa đáp án (trim, lowercase, punctuation).
- Xử lý các quy tắc đáp án IELTS: ngoặc đơn (optional), dấu gạch chéo (alternative).
- Tính điểm raw và quy đổi ra Band Score IELTS Academic.
- Lưu trữ kết quả (test_attempts và attempt_answers) nguyên tử.

## 3. Ngoài phạm vi

- Chấm điểm bài thi Speaking / Writing.
- Đếm số từ cho câu Short Answer (giới hạn ở exact match sau chuẩn hóa).
- Quản lý đề thi hay giao diện làm bài.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Nộp bài thi của mình để hệ thống tự động chấm và nhận lại tổng điểm/Band. |
| Hệ thống (Backend) | Đọc đáp án chuẩn, chuẩn hóa, tính điểm, ghi log vào database. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Chấm điểm tự động khi học viên nộp bài (Ưu tiên: P1)

Với tư cách hệ thống, tôi muốn nhận câu trả lời từ Frontend, so khớp với đáp án đúng trong DB, tính điểm và lưu kết quả.

**Kiểm thử độc lập**: Gửi request với JSON payload `{ "answers": { "1": " Apples ", "2": "B" }, "timeSpent": 3600 }` → kiểm tra response chứa `bandScore` và `rawScore` đúng.

**Kịch bản chấp nhận**:

1. **Cho trước** đáp án đúng là `"apples"`, **Khi** học viên gửi `" Apples "`, **Thì** hệ thống chuẩn hóa và chấm ĐÚNG.
2. **Cho trước** đáp án đúng là `"transport/transportation"`, **Khi** học viên gửi `"transport"`, **Thì** hệ thống chấm ĐÚNG.
3. **Cho trước** bài Reading có 40 câu, đúng 30 câu, **Khi** API tính điểm, **Thì** trả về `bandScore: 7.0` theo thang chuẩn.

### Câu chuyện 2 — Validate payload và xử lý lỗi (Ưu tiên: P1)

Với tư cách hệ thống, tôi muốn reject các request thiếu hoặc sai format để bảo vệ DB.

**Kiểm thử độc lập**: Gửi request thiếu field `answers` → API trả về `400 Bad Request`.

**Kịch bản chấp nhận**:

1. **Cho trước** request body không có `answers`, **Khi** gọi API, **Thì** response `400 Bad Request`.
2. **Cho trước** bài thi không có câu hỏi nào trong DB, **Khi** người dùng nộp bài, **Thì** trả về HTTP 400.

## 6. Trường hợp biên

- `answers` rỗng `{}` → Submit bình thường, raw score = 0, Band = 0.
- `answers` là null/Array → Controller trả `400 INVALID_PAYLOAD`.
- Bài thi `skill` là writing/speaking → không chấm điểm tự động, gán status `submitted`.
- User double-click Nộp bài → Chống duplicate ở FE và/hoặc BE (idempotency).

## 7. Quy tắc nghiệp vụ

- **BR-AG-001 [AS-BUILT]**: Hệ thống không phân biệt chữ hoa chữ thường, khoảng trắng thừa ở hai đầu, thay nhiều khoảng trắng bằng 1 khoảng trắng trước khi so khớp.
- **BR-AG-002 [AS-BUILT]**: Đáp án chứa dấu `/` nghĩa là 1 trong các tùy chọn đều được chấp nhận.
- **BR-AG-003 [AS-BUILT]**: Đáp án chứa ngoặc đơn `()` nghĩa là từ đó có thể có hoặc không.
- **BR-AG-004 [AS-BUILT]**: Band Score dựa trên bảng chuẩn Cambridge. Reading và Listening khác nhau.
- **BR-AG-005 [AS-BUILT]**: Nếu bài thi ít hơn 40 câu (partial test), điểm được scale `Raw_40 = round((Correct / Total) * 40)` rồi tra bảng.
- **BR-AG-006 [AS-BUILT]**: Tuyệt đối không trả về `correct_answer` trong response nộp bài để ngăn gian lận.

## 8. Yêu cầu chức năng

- **FR-AG-001 [AS-BUILT]**: Hệ thống MUST implement `normalizeAnswer(str)` để chuẩn hóa chuỗi.
- **FR-AG-002 [AS-BUILT]**: Hệ thống MUST implement `isAnswerCorrect()` hỗ trợ logic mảng (dấu `/`) và từ tùy chọn (ngoặc đơn).
- **FR-AG-003 [AS-BUILT]**: Hệ thống MUST implement `getBandScore(skill, rawScore)`.
- **FR-AG-004 [AS-BUILT]**: Hệ thống MUST lưu `test_attempts` và `attempt_answers` trong một transaction nguyên tử duy nhất.
- **FR-AG-005 [AS-BUILT]**: Hệ thống MUST xử lý lỗi payload (400 Bad Request) hoặc lỗi DB (500).
- **FR-AG-006 [AS-BUILT]**: Hệ thống MUST KHÔNG trả về chi tiết đáp án chuẩn ngay sau khi chấm xong.

## 9. Yêu cầu phi chức năng

- **NFR-AG-001 [AS-BUILT]**: Engine chấm điểm không chứa logic DB trực tiếp để dễ viết Unit Test.
- **NFR-AG-002 [AS-BUILT]**: Chống SQL injection bằng tham số hóa (Parameterized Queries).
- **NFR-AG-003 [AS-BUILT]**: API trả kết quả dưới 1000ms.

## 10. Thực thể chính

- **`test_attempts`**: Bảng tổng kết lần thi.
- **`attempt_answers`**: Bảng chi tiết câu trả lời.
- **`questions`**: Danh sách câu hỏi.
- **`mock_tests`**: Đề thi.

## 11. Tiêu chí thành công

- **SC-AG-001 [AS-BUILT]**: 100% câu trả lời có khoảng trắng/chữ hoa chữ thường hợp lệ được chấm đúng.
- **SC-AG-002 [AS-BUILT]**: Transaction DB được đảm bảo, không bao giờ có `test_attempts` mồ côi không có `attempt_answers`.
- **SC-AG-003 [AS-BUILT]**: Response time < 1000ms.

## 12. Giả định

- Bài học viên gửi không bị thay đổi định dạng key.
- DB chứa đủ thông tin câu hỏi để chấm.
- Hệ thống hỗ trợ xử lý mảng JSONB cho đáp án chuẩn (correct_answers).

## 13. Phụ thuộc

- Cần schema DB chuẩn bị sẵn từ `feat-content-builder`.

## 14. Câu hỏi mở
- None.
