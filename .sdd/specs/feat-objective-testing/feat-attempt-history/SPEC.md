# Đặc tả tính năng: Lịch sử & Tra cứu Kết quả (feat-attempt-history)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Draft
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

Hiện tại hệ thống không có trang lịch sử thi, học viên thi nhiều lần không có nơi liệt kê kết quả cũ, không đánh giá được tiến độ. Ngoài ra, học viên không xem lại được chi tiết câu trả lời đúng sai và phần giải thích, không hợp nhất được bài thi trắc nghiệm và tự luận.
Tính năng này cung cấp Dashboard tổng hợp lịch sử thi và chi tiết từng bài nộp để giúp học viên theo dõi tiến độ và học từ lỗi sai.

## 2. Phạm vi

- Dashboard liệt kê danh sách lượt thi của học viên (cả Objective và Subjective).
- Xem chi tiết từng lượt thi: hiển thị danh sách câu hỏi, câu trả lời, đáp án đúng, highlight đúng/sai và phần giải thích (explanation).
- Chức năng lọc lịch sử theo từng kỹ năng (skill).
- Phân trang dạng Limit/Offset cho danh sách lượt thi.

## 3. Ngoài phạm vi

- Xem lịch sử thi của học viên khác.
- Lịch sử các bài làm dở chưa nộp (nằm ở tính năng Resume).
- Chỉnh sửa lịch sử thi hoặc nộp lại.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Xem danh sách lịch sử thi của chính mình, xem chi tiết và giải thích của các lượt thi đã nộp. |
| Quản trị viên | Không thể xem lịch sử thi trong giao diện học viên (trừ khi có tính năng admin riêng). |
| Khách/không phải học viên | Không có quyền truy cập. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Xem danh sách lịch sử thi (Ưu tiên: P2)

Với tư cách học viên, tôi muốn vào trang Dashboard xem danh sách tất cả lượt thi của mình với thông tin: tên bài thi, thời gian nộp, và Band Score — để theo dõi tiến độ học tập.

**Kiểm thử độc lập**: Với 2 lượt thi trong bảng `test_attempts` và 1 lượt thi tự luận (`subjective`), gọi `GET /api/v1/attempts` → trả về mảng 3 phần tử đã được merge và sort theo thời gian; `TestHistoryPage` render đúng 3 row hiển thị đủ cả Objective và Subjective.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên đã có 2 lượt nộp bài trắc nghiệm và 1 bài tự luận, **Khi** vào trang Dashboard lịch sử, **Thì** thấy danh sách 3 lượt thi hiển thị chung với tên bài, thời gian, Band Score và Loại bài thi.
2. **Cho trước** học viên chưa thi lần nào, **Khi** vào trang lịch sử, **Thì** thấy empty state "Bạn chưa làm bài thi nào".

### Câu chuyện 2 — Xem chi tiết bài làm (Ưu tiên: P2)

Với tư cách học viên, tôi muốn click vào một lượt thi cụ thể để xem chi tiết từng câu: câu nào đúng (highlight xanh), câu nào sai (highlight đỏ), và lời giải thích cho câu sai.

**Kiểm thử độc lập**: Với 1 attempt có 3 câu đúng / 2 câu sai trong DB, gọi `GET /api/v1/attempts/:attemptId/detail` → trả về `details[]` với `is_correct` đúng; `TestResultDetailPage` highlight xanh/đỏ đúng.

**Kịch bản chấp nhận**:

1. **Cho trước** học viên click vào lượt thi trong danh sách, **Khi** mở trang chi tiết, **Thì** thấy từng câu hỏi với: câu trả lời của học viên, đáp án đúng, và highlight xanh nếu đúng / đỏ nếu sai.
2. **Cho trước** câu sai có kèm `explanation` trong DB, **Khi** xem trang chi tiết, **Thì** hiển thị text giải thích phía dưới câu đó.

## 6. Trường hợp biên

- Học viên truy cập `GET /api/v1/attempts/:attemptId` của người khác → `403 Forbidden` hoặc `404 Not Found` (nhờ IDOR filter).
- Attempt ID không tồn tại → `404 Not Found`.
- `explanation` field là `null` → không render block giải thích (không crash).
- Bài thi bị admin xoá (soft-delete) → Dữ liệu bài làm vẫn được giữ lại để tra cứu.

## 7. Quy tắc nghiệp vụ

- **BR-ATH-001 [TARGET]**: Lịch sử thi (attempt) không bao giờ được phép xoá, kể cả khi đề thi gốc bị xoá.
- **BR-ATH-002 [TARGET]**: Các bài thi tự luận chưa được chấm điểm hiển thị trạng thái "Đang chấm" thay vì Band Score.
- **BR-ATH-003 [TARGET]**: Dữ liệu thi được phân quyền theo người dùng, tuyệt đối không trả về dữ liệu của người khác (Ngăn chặn IDOR).
- **BR-ATH-004 [TARGET]**: Trang Lịch sử chỉ hiển thị bài thi đã hoàn thành (`is_completed = true`).

## 8. Yêu cầu chức năng

- **FR-ATH-001 [TARGET]**: Hệ thống MUST cung cấp `GET /api/v1/attempts` trả về danh sách attempts, hỗ trợ query filter `?skill=`.
- **FR-ATH-002 [TARGET]**: Danh sách trả về MUST được phân trang (Limit/Offset, 20 bản ghi/trang).
- **FR-ATH-003 [TARGET]**: Hệ thống MUST cung cấp 2 endpoints riêng biệt: summary `GET /api/v1/attempts/:attemptId` và detail `GET /api/v1/attempts/:attemptId/detail`.
- **FR-ATH-004 [TARGET]**: Hệ thống MUST filter tất cả query theo `user_id = req.user.id`.
- **FR-ATH-005 [TARGET]**: Frontend MUST render `TestHistoryPage` với danh sách row, có link tới trang kết quả.
- **FR-ATH-006 [TARGET]**: Frontend MUST render `TestResultDetailPage` dạng Accordion, highlight xanh (đúng) / đỏ (sai).
- **FR-ATH-007 [TARGET]**: Hệ thống MUST hiển thị `explanation` nếu tồn tại; hiển thị "Không có giải thích" nếu null.
- **FR-ATH-008 [TARGET]**: Trải nghiệm xem lại kết quả (Review) phải giống lúc thi (hiển thị Reading passage hoặc Listening audio để đối chiếu).

## 9. Yêu cầu phi chức năng

- **NFR-ATH-001 [TARGET]**: `GET /api/v1/attempts` phản hồi < 500ms với số lượng 100 attempts.
- **NFR-ATH-002 [TARGET]**: `GET /api/v1/attempts/:attemptId/detail` trả về < 800ms cho 40 câu hỏi.
- **NFR-ATH-003 [TARGET]**: Bảo mật IDOR: 100% request khác `user_id` phải bị từ chối.

## 10. Thực thể chính

- **`test_attempts`** & **`submissions`**: Lịch sử lượt thi tổng quan.
- **`attempt_answers`**: Chi tiết câu trả lời của từng attempt.
- **`questions`**: Chứa `correct_answer` và `explanation`.
- **`mock_tests`**: Metadata đề thi.

## 11. Tiêu chí thành công

- **SC-ATH-001 [TARGET]**: `GET /api/v1/attempts` trả về danh sách đã merge hợp lệ trong < 500ms.
- **SC-ATH-002 [TARGET]**: 100% kiểm thử bảo mật IDOR vượt qua.
- **SC-ATH-003 [TARGET]**: `TestResultDetailPage` hiển thị đúng màu highlight cho mọi trường hợp đúng/sai.

## 12. Giả định

- Bảng `test_attempts` đã có data.
- Bảng `questions` có cột `explanation`.
- JWT middleware cung cấp `req.user.id`.

## 13. Phụ thuộc

- `feat-auto-grading` để có dữ liệu `test_attempts`.
- UI bài thi từ `feat-reading-ui` và `feat-listening-ui` để render Review View.

## 14. Câu hỏi mở
- None.
