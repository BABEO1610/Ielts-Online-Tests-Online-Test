# Feature Specification: Lịch sử & Tra cứu Kết quả (feat-attempt-history)

**Feature Branch**: `feat/attempt-history`

**Created**: 2026-07-27

**Status**: Draft

**Input**: Tách từ User Story 4 của `feat-objective-testing/SPEC.md` — Xem danh sách lượt thi và review chi tiết câu đúng/sai.

## User Scenarios & Testing *(mandatory)*

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

### Edge Cases

- Học viên truy cập `GET /api/v1/attempts/:attemptId` của người khác → `403 Forbidden` hoặc `404 Not Found` (nhờ IDOR filter).
- Attempt ID không tồn tại → `404 Not Found`.
- `explanation` field là `null` → không render block giải thích (không crash).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp `GET /api/v1/attempts` trả về danh sách attempts (merge từ bài thi Trắc nghiệm - `test_attempts` và Tự luận - `SubmissionService.getHistory`), có hỗ trợ query filter `?skill=`.
- **FR-002**: Hệ thống MUST cung cấp 2 endpoints riêng biệt: `GET /api/v1/attempts/:attemptId` (lấy summary) và `GET /api/v1/attempts/:attemptId/detail` (trả về chi tiết từng câu kèm `is_correct`, `user_answer`, `correct_answer`, `explanation`).
- **FR-003**: Hệ thống MUST filter tất cả query theo `user_id = req.user.id` — ngăn chặn hoàn toàn IDOR.
- **FR-004**: Frontend MUST render `TestHistoryPage` với danh sách row: tên bài, band score, thời gian, Mode (Practice/Timed) — mỗi row là link tới trang kết quả.
- **FR-005**: Frontend MUST render `TestResultDetailPage` dạng Accordion, mỗi item highlight xanh (đúng) / đỏ (sai) cho từng câu.
- **FR-006**: Hệ thống MUST hiển thị `explanation` nếu tồn tại khi user mở rộng (expand) Accordion; hiển thị "Không có giải thích" nếu null.

### Key Entities

- **`test_attempts`** & **`submissions`**: Read — lấy danh sách lịch sử thi.
- **`questions`**: Read — JOIN để lấy `correct_answer`, `explanation` khi xem chi tiết (detail endpoint).
- **`mock_tests`**: Read — JOIN để lấy tên bài thi cho trang danh sách.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `GET /api/v1/attempts` trả về < 500ms với up to 100 attempts (đã merge cả trắc nghiệm và tự luận).
- **SC-002**: `GET /api/v1/attempts/:attemptId/detail` trả về chi tiết 40 câu trong < 800ms.
- **SC-003**: Học viên A KHÔNG BAO GIỜ thấy attempt của học viên B (IDOR security test vượt qua).
- **SC-004**: `TestResultDetailPage` hiển thị đúng màu highlight cho 100% câu hỏi.

## Assumptions

- Bảng `test_attempts` đã có data từ `feat-auto-grading`.
- Bảng `questions` có cột `explanation` (nullable).
- JWT middleware cung cấp `req.user.id` đúng tại mọi protected route.
- Không cần pagination ở MVP — filter theo `user_id` đã giới hạn đủ nhỏ.
