---
description: "Danh sách công việc triển khai gộp cho 4 luồng thi Trắc Nghiệm"
---

# Danh sách Công việc: Thi Trắc Nghiệm (feat-objective-testing)

**Đầu vào**: Kế hoạch và Đặc tả từ thư mục `feat-objective-testing`.

**Prerequisites**: PLAN.md (bắt buộc), SPEC.md.

## Quy ước Format và Đường dẫn (Path Conventions)

- **Format**: `[ID] [P?] [Story] Description`
  - **[P]**: Có thể chạy song song (không phụ thuộc lẫn nhau).
  - **[Story]**: User Story tương ứng (ví dụ: US1, US2).
- **Đường dẫn**: Sử dụng cấu trúc `backend/src/` và `frontend/src/`.

---

## Giai đoạn 1: Thiết lập (Setup Shared Infrastructure)

**Mục đích**: Cấu trúc DB và khung routes cần thiết trước khi làm tính năng.

- [ ] **T001:** Setup cấu trúc bảng `test_attempts` và `user_answers` trong DB (viết file migration `.sql`).
- [ ] **T002:** [P] Khởi tạo các file Route và Controller: `v1/submissions.routes.js`, `v1/attempts.routes.js` và `submission.controller.js`, `attempt.controller.js`.
- [ ] **T003:** [P] Cấu trúc thư mục và component ở Frontend (`ListeningTestPage.jsx`, `ReadingTestPage.jsx`, `TestHistoryPage.jsx`, `TestResultDetailPage.jsx`).

---

## Giai đoạn 2: Nền tảng (Foundational) & Câu chuyện Người dùng 3 - Auto Grading (Ưu tiên P1)

**Mục đích**: Chức năng cốt lõi bắt buộc phải có để các luồng UI có thể hoạt động (API nộp bài và engine chấm điểm).

- [ ] **T004:** [P] [US3] Viết Unit Test cho `submission.service.js` (Test case cho auto-grading: trim khoảng trắng, lowerCase, xóa dấu câu).
- [ ] **T005:** [US3] Triển khai logic Auto-grading & tính Band Score vào `submission.service.js`. (Phụ thuộc T004).
- [ ] **T006:** [US3] Triển khai API `POST /api/v1/submissions`: Lưu DB dùng `BEGIN/COMMIT`. (Phụ thuộc T001, T005).

**Checkpoint**: Nền tảng Backend (Nộp bài & Chấm điểm - US3) đã sẵn sàng.

---

## Giai đoạn 3: Câu chuyện Người dùng 1 - Giao diện Listening (Ưu tiên P1)

- [ ] **T007:** [P] [US1] Xây dựng store (`useExamStore`) quản lý state answers và auto-save vào `LocalStorage`.
- [ ] **T008:** [US1] Hoàn thiện Component `QuestionNavigation.jsx` và `TimerBar.jsx`.
- [ ] **T009:** [US1] Code luồng `ListeningTestPage.jsx`: Nhúng Audio Player tĩnh (không tự qua bài) và render giao diện.
- [ ] **T010:** [US1] Tích hợp gọi API `POST /api/v1/submissions` khi hết giờ.

**Checkpoint**: User Story 1 có thể hoạt động và test độc lập luồng Listening.

---

## Giai đoạn 4: Câu chuyện Người dùng 2 - Giao diện Reading (Ưu tiên P1)

- [ ] **T011:** [P] [US2] Code luồng `ReadingTestPage.jsx`: Thiết kế CSS Grid/Flexbox dạng Split View.
- [ ] **T012:** [US2] Tái sử dụng `QuestionNavigation.jsx` và `TimerBar.jsx` từ US1 ghép vào layout Split View.
- [ ] **T013:** [US2] Đảm bảo nội dung input của User được giữ nguyên (persistence) khi cuộn đoạn văn.

**Checkpoint**: User Story 2 hoạt động và test độc lập giao diện Reading.

---

## Giai đoạn 5: Câu chuyện Người dùng 4 - Lịch sử và Tra cứu kết quả (Ưu tiên P2)

- [ ] **T014:** [P] [US4] Backend: Viết API `GET /api/v1/attempts` trong `attempt.service.js` lấy danh sách lượt thi.
- [ ] **T015:** [P] [US4] Backend: Viết API `GET /api/v1/attempts/:id` trả về chi tiết câu đúng/sai kèm giải thích.
- [ ] **T016:** [US4] Frontend: Build UI trang `TestHistoryPage.jsx`.
- [ ] **T017:** [US4] Frontend: Build UI trang `TestResultDetailPage.jsx` (review câu trả lời highlight xanh/đỏ).

---

## Giai đoạn Cuối: Đánh bóng & Tối ưu (Polish)

- [ ] **T018:** Tối ưu hóa render Component trên Frontend (React.memo) để tránh lag gõ text.
- [ ] **T019:** Xử lý UX mất mạng: Hiện Toast Notification nhắc nhở.
- [ ] **T020:** Code cleanup và verify JWT Middleware.
- [ ] **T021:** Viết kịch bản test tải (Load Test bằng K6/autocannon) cho API `/api/v1/submissions` đảm bảo phản hồi < 1 giây (Cover SC-001).

---

## Phân chia & Phụ thuộc (Dependencies & Execution Order)

### Phụ thuộc Giai đoạn
- **Giai đoạn 1 & 2 (Setup & Foundational)**: Phải hoàn thành đầu tiên (Blocks Phase 3, 4, 5).
- **Giai đoạn 3, 4, 5 (User Stories)**: Có thể làm song song sau khi Phase 2 xong (ví dụ: Dev A làm Listening, Dev B làm Lịch sử).

### Cơ hội Song song (Parallel Opportunities)
- Các task có đánh dấu `[P]` trong cùng một Giai đoạn có thể làm song song.
- API Backend (US4) có thể được code song song với UI Frontend (US1, US2).

---

## Chiến lược Triển khai (Implementation Strategy)

### MVP First (Cho US1 & US2)
1. Hoàn thành Setup & Foundational (Chấm điểm backend trong `submission.service.js`).
2. Xây dựng Listening UI (US1) -> **Dừng lại để Test tích hợp luồng thi hoàn chỉnh.**
3. Xây dựng Reading UI (US2) -> Test tích hợp.
4. Mở rộng thêm tính năng Lịch sử (US4) ở đợt deploy sau.

---

## Ghi chú (Notes)
- Đảm bảo viết Unit Test (T004) FAIL trước khi code logic chấm bài (T005).
- Tái sử dụng tối đa các file đã có trong `frontend/src/components/objective-testing/`.
- Commit code theo từng Task để dễ quản lý và rollback khi cần.
