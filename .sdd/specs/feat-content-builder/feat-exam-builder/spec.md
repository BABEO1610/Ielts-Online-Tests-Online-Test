# Feature Specification: Exam Builder (feat-exam-builder)

**Feature Branch**: `feat-exam-builder`

**Created**: 2026-07-27

**Status**: Final

**Input**: User description: "Khung Đề thi & Công cụ Soạn thảo Câu hỏi Động bằng Hard Delete + Bulk Insert"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Khung Đề thi & Cập nhật nội dung (Priority: P1)

Là một Tutor, tôi muốn cập nhật nội dung của một đề thi nhanh chóng và an toàn bằng cách thay thế toàn bộ câu hỏi cũ bằng câu hỏi mới, mà không phải lo lắng về việc dữ liệu bị rác.

**Why this priority**: Giáo viên thường xuyên phải cập nhật hoặc sửa lỗi sai trong đề thi. Hệ thống phải đảm bảo việc update không làm hỏng cấu trúc lồng ghép phức tạp của bài Listening/Reading.

**Independent Test**: Gọi `PUT /api/v1/tests/:id` với danh sách câu hỏi mới → verify dữ liệu cũ trong bảng `questions` và `test_passages` bị xóa, dữ liệu mới được chèn vào thông qua 1 transaction.

**Acceptance Scenarios**:

1. **Given** một đề thi đang tồn tại với 40 câu hỏi, **When** Tutor ấn cập nhật với danh sách 40 câu hỏi mới, **Then** hệ thống thực hiện `DELETE FROM questions` (Hard Delete), sau đó `INSERT` toàn bộ dữ liệu mới trong một Database Transaction duy nhất.
2. **Given** đang trong quá trình update, **When** có lỗi database xảy ra ở giữa chừng, **Then** hệ thống gọi `ROLLBACK` và dữ liệu đề thi gốc vẫn giữ nguyên.
3. **Given** một đề thi có một câu hỏi bị bỏ trống đáp án đúng, **When** Tutor cố tình xuất bản (publish), **Then** hệ thống sẽ bắt lỗi trước khi bắt đầu transaction và ném ra HTTP 400.

---

### User Story 2 - Công cụ Soạn thảo Câu hỏi Động (Priority: P1)

Là một Tutor, tôi muốn thêm/sửa/xóa các đoạn văn (Passages) và hàng loạt nhóm câu hỏi (Blocks) vào một đề thi thông qua một giao diện kéo thả hoặc form điền động.

**Why this priority**: Bắt buộc phải có form nhập liệu thì giáo viên mới có thể tạo được số lượng lớn câu hỏi cùng lúc.

**Independent Test**: Gọi `POST /api/v1/tests` với JSON chứa mảng lồng nhau (Passage -> Block -> Question) → verify tất cả được lưu đúng thứ tự (`question_order`) vào DB và có Audio URL nếu là Listening.

**Acceptance Scenarios**:

1. **Given** JSON chứa 10 câu hỏi Multiple Choice, **When** Tutor gọi `POST /api/v1/tests`, **Then** hệ thống lặp qua mảng, tính toán `question_order` tăng dần và lưu toàn bộ vào DB.
2. **Given** một hành động tạo/sửa/xóa đề thi, **When** thành công, **Then** hệ thống gọi tự động gọi hàm ghi log (`AuditLogService.logAction`) để lưu lại vết thao tác.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST sử dụng cơ chế **Hard Delete** thay vì Versioning để cập nhật cấu trúc đề thi.
- **FR-002**: Việc thao tác Bulk Insert/Update MUST được bọc trong một **Database Transaction** (`BEGIN`, `COMMIT`, `ROLLBACK`).
- **FR-003**: Hệ thống MUST tự động tính toán lại số thứ tự (`question_order`) của các câu hỏi dựa trên vị trí của chúng trong mảng gửi lên.
- **FR-004**: Không được sử dụng ORM để thực thi Bulk Insert, MUST dùng Raw SQL `pg` để tối ưu hiệu năng.
- **FR-005**: Hệ thống MUST kiểm tra vòng lặp validation, cản không cho xuất bản đề thi nếu phát hiện thiếu đáp án (`correctAnswer`).
- **FR-006**: Hệ thống MUST ghi log mọi hành động thay đổi dữ liệu đề thi thông qua module `AuditLogService`.

### Key Entities

- **mock_tests**: Bảng chứa thông tin vỏ đề (test_id, name, skill, difficulty, audio_url).
- **test_passages**: Đoạn văn/Bài đọc của đề.
- **question_blocks**: Các nhóm câu hỏi (ví dụ: True/False/Not Given) nằm trong đoạn văn.
- **questions**: Từng câu hỏi chi tiết chứa đáp án.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bulk Insert & Bulk Update 40 câu hỏi được thực thi và hoàn tất dưới 2000 mili-giây (2s).
- **SC-002**: Không có dữ liệu mồ côi (orphan records) bị bỏ lại khi thực hiện Update đề thi (phải được xóa sạch nhờ lệnh `DELETE FROM ... WHERE test_id`).
- **SC-003**: Log hệ thống (Audit Logs) ghi nhận đầy đủ 100% các thao tác create, update, delete đề thi.
