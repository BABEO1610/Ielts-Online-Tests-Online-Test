# Đặc tả tính năng: Lịch sử & Tra cứu Kết quả (feat-attempt-history)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Draft
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cung cấp trang lịch sử thi cho học viên để theo dõi tiến độ học tập. Danh sách merge tất cả lượt thi — cả trắc nghiệm (`test_attempts`) lẫn tự luận (`submissions`) — vào một trang duy nhất, sắp xếp theo thời gian mới nhất. Học viên có thể lọc theo Skill và click vào từng lượt để xem chi tiết từng câu (highlight xanh/đỏ, đáp án đúng, giải thích) theo dạng Accordion. Toàn bộ dữ liệu có scope `user_id` chặt chẽ — ngăn IDOR.

**Input**: Tách từ User Story 4 của `feat-objective-testing/SPEC.md`.

## 2. Phạm vi

- `GET /api/v1/attempts`: Trả về danh sách attempts (merge trắc nghiệm + tự luận), filter `?skill=`.
- `GET /api/v1/attempts/:attemptId`: Summary một lượt thi.
- `GET /api/v1/attempts/:attemptId/detail`: Chi tiết từng câu (`is_correct`, `user_answer`, `correct_answer`, `explanation`).
- Frontend `TestHistoryPage`: danh sách lượt thi, mỗi row là link tới trang kết quả.
- Frontend `TestResultDetailPage`: hiển thị chi tiết dạng Accordion, highlight xanh (đúng) / đỏ (sai).
- Empty state khi học viên chưa thi lần nào.
- IDOR filter: mọi query scope theo `user_id = req.user.id`.

## 3. Ngoài phạm vi

- Pagination danh sách lịch sử — không cần trong MVP.
- Chỉnh sửa hoặc xóa lượt thi.
- Export PDF/Excel kết quả thi.
- So sánh kết quả giữa các lần thi dưới dạng biểu đồ.
- Trang cài đặt quyền xem cá nhân.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Xem danh sách và chi tiết lượt thi của chính mình; lọc theo skill. |
| Học viên khác | Không được phép truy cập attempt của người khác — `403 Forbidden` hoặc `404 Not Found`. |
| Giảng viên / Admin | Không sử dụng trang này — có trang quản lý riêng. |
| Khách / chưa xác thực | Không được phép — yêu cầu JWT hợp lệ. |


## 5. Câu chuyện người dùng và kiểm thử độc lập

### User Story 1 - Xem danh sách lịch sử thi (Priority: P2)

Là một học viên, sau khi đã làm nhiều bài thi, tôi muốn vào trang Dashboard xem danh sách tất cả lượt thi của mình với thông tin: tên bài thi, thời gian nộp, và Band Score — để theo dõi tiến độ học tập.

**Why this priority**: Quan trọng để học viên theo dõi progress, nhưng xếp sau luồng làm bài và chấm bài (P1).

**Independent Test**: Với 2 lượt thi trong bảng `test_attempts` và 1 lượt thi tự luận (`subjective`), gọi `GET /api/v1/attempts` → trả về mảng 3 phần tử đã được merge và sort theo thời gian; `TestHistoryPage` render đúng 3 row hiển thị đủ cả Objective và Subjective.

**Acceptance Scenarios**:

1. **Given** học viên đã có 2 lượt nộp bài trắc nghiệm và 1 bài tự luận, **When** vào trang Dashboard lịch sử, **Then** thấy danh sách 3 lượt thi hiển thị chung với tên bài, thời gian, Band Score và Loại bài thi (Skill).
2. **Given** học viên chưa thi lần nào, **When** vào trang lịch sử, **Then** thấy empty state "Bạn chưa làm bài thi nào".

---

### User Story 2 - Xem chi tiết bài làm (Priority: P2)

Là một học viên, tôi muốn click vào một lượt thi cụ thể để xem chi tiết từng câu: câu nào đúng (highlight xanh), câu nào sai (highlight đỏ), và lời giải thích cho câu sai.

**Why this priority**: Tính năng học từ lỗi sai — quan trọng với học viên nhưng phụ thuộc US1.

**Independent Test**: Với 1 attempt có 3 câu đúng / 2 câu sai trong DB, gọi `GET /api/v1/attempts/:attemptId/detail` → trả về `details[]` với `is_correct` đúng; `TestResultDetailPage` highlight xanh/đỏ đúng.

**Acceptance Scenarios**:

1. **Given** học viên click vào lượt thi trong danh sách, **When** mở trang chi tiết, **Then** thấy từng câu hỏi với: câu trả lời của học viên, đáp án đúng, và highlight xanh nếu đúng / đỏ nếu sai.
2. **Given** câu sai có kèm `explanation` trong DB, **When** xem trang chi tiết, **Then** hiển thị text giải thích phía dưới câu đó.

---

## 6. Trường hợp biên

- Học viên truy cập `GET /api/v1/attempts/:attemptId` của người khác → `403 Forbidden` hoặc `404 Not Found` (nhờ IDOR filter).
- Attempt ID không tồn tại → `404 Not Found`.
- `explanation` field là `null` → không render block giải thích (không crash).

## 7. Quy tắc nghiệp vụ

- **BR-HIS-001 [AS-BUILT]**: Mọi query `GET /api/v1/attempts*` PHẢI filter theo `user_id = req.user.id` — không có endpoint nào trả dữ liệu của người khác.
- **BR-HIS-002 [AS-BUILT]**: Attempt của người khác bị truy cập trực tiếp bằng URL → `403 Forbidden` hoặc `404 Not Found` (IDOR filter).
- **BR-HIS-003 [AS-BUILT]**: `explanation` là null → hiển “Không có giải thích” — không crash component.
- **BR-HIS-004 [AS-BUILT]**: Danh sách merge trắc nghiệm (`test_attempts`) và tự luận (`submissions`) sort theo thời gian mới nhất — không tách riêng 2 trang.
- **BR-HIS-005 [AS-BUILT]**: `correct_answer` chỉ được expose tại endpoint `/detail` — không expose trong danh sách.
- **BR-HIS-006 [AS-BUILT]**: Không có pagination MVP — filter theo `user_id` đủ giới hạn kích thước response.
- **BR-HIS-007 [TARGET]**: Bài tự luận chưa được chấm hiển “Đang chờ chấm” thay cho Band Score.

## 8. Yêu cầu chức năng

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp `GET /api/v1/attempts` trả về danh sách attempts (merge từ bài thi Trắc nghiệm - `test_attempts` và Tự luận - `SubmissionService.getHistory`), có hỗ trợ query filter `?skill=`.
- **FR-002**: Hệ thống MUST cung cấp 2 endpoints riêng biệt: `GET /api/v1/attempts/:attemptId` (lấy summary) và `GET /api/v1/attempts/:attemptId/detail` (trả về chi tiết từng câu kèm `is_correct`, `user_answer`, `correct_answer`, `explanation`).
- **FR-003**: Hệ thống MUST filter tất cả query theo `user_id = req.user.id` — ngăn chặn hoàn toàn IDOR.
- **FR-004**: Frontend MUST render `TestHistoryPage` với danh sách row: tên bài, band score, thời gian, Mode (Practice/Timed) — mỗi row là link tới trang kết quả.
- **FR-005**: Frontend MUST render `TestResultDetailPage` dạng Accordion, mỗi item highlight xanh (đúng) / đỏ (sai) cho từng câu.
- **FR-006**: Hệ thống MUST hiển thị `explanation` nếu tồn tại khi user mở rộng (expand) Accordion; hiển thị "Không có giải thích" nếu null.

## 9. Yêu cầu phi chức năng

- **NFR-HIS-001 [AS-BUILT]**: `GET /api/v1/attempts` trả về < 500ms với up to 100 attempts (merge cả trắc nghiệm và tự luận).
- **NFR-HIS-002 [AS-BUILT]**: `GET /api/v1/attempts/:attemptId/detail` trả về chi tiết 40 câu trong < 800ms.
- **NFR-HIS-003 [AS-BUILT]**: Học viên A KHÔNG BAO GIờ thấy attempt của học viên B (IDOR security test vượt qua).
- **NFR-HIS-004 [AS-BUILT]**: `TestResultDetailPage` hiển thị đúng màu highlight cho 100% câu hỏi.
- **NFR-HIS-005 [AS-BUILT]**: Mọi SQL query dùng parameterized `$N` — không có SQL injection vector.

## 10. Thực thể chính

- **`test_attempts`** & **`submissions`**: Read — lấy danh sách lịch sử thi.
- **`questions`**: Read — JOIN để lấy `correct_answer`, `explanation` khi xem chi tiết (detail endpoint).
- **`mock_tests`**: Read — JOIN để lấy tên bài thi cho trang danh sách.

## 11. Tiêu chí thành công

### Measurable Outcomes

- **SC-001**: `GET /api/v1/attempts` trả về < 500ms với up to 100 attempts (đã merge cả trắc nghiệm và tự luận).
- **SC-002**: `GET /api/v1/attempts/:attemptId/detail` trả về chi tiết 40 câu trong < 800ms.
- **SC-003**: Học viên A KHÔNG BAO GIỜ thấy attempt của học viên B (IDOR security test vượt qua).
- **SC-004**: `TestResultDetailPage` hiển thị đúng màu highlight cho 100% câu hỏi.

## 12. Giả định

- Bảng `test_attempts` đã có data từ `feat-auto-grading`.
- Bảng `questions` có cột `explanation` (nullable).
- JWT middleware cung cấp `req.user.id` đúng tại mọi protected route.
- Không cần pagination ở MVP — filter theo `user_id` đã giới hạn đủ nhỏ.

## 13. Phụ thuộc

- **`feat-auto-grading`**: Cung cấp bảng `test_attempts` và `attempt_answers` có data.
- **`feat-content-builder`**: Cung cấp bảng `questions` có cột `explanation` (nullable).
- **JWT middleware**: Cung cấp `req.user.id` đúng tại mọi protected route.
- **`mock_tests`**: Cung cấp tên bài thi cho trang danh sách (JOIN).
- **`SubmissionService.getHistory`**: Cung cấp lịch sử bài tự luận (Writing/Speaking) để merge vào danh sách.

## 14. Câu hỏi mở

1. **NEEDS CLARIFICATION**: Bài tự luận (Writing/Speaking) chưa chấm — hiển thị “Đang chờ chấm” hay ẩn khỏi danh sách cho đến khi có kết quả?
2. **NEEDS CLARIFICATION**: Pagination cần triển khai khi nào? Có ngưỡng số lượng attempt cụ thể nào để trigger pagination không?
3. **NEEDS CLARIFICATION**: `TestHistoryPage` có thêm tính năng so sánh Band Score theo thời gian (chart tiến độ) trong roadmap không?
