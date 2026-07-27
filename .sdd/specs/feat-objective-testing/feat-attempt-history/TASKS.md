---
description: "Task list for feat-attempt-history"
---

# Tasks: Lịch sử & Tra cứu Kết quả (feat-attempt-history)

**Input**: `feat-objective-testing/SPEC.md` — User Story 4

**Prerequisites**: PLAN.md (required), SPEC.md (required), `feat-auto-grading` hoàn thành (bảng `test_attempts` có data)

## Format: `[ID] [P?] [US4] Description`

- **[P]**: Chay song song (khac file, khong phu thuoc nhau)
- **[US4]**: Task thuoc User Story 4 - Lich su & Tra cuu
- Include duong dan file cu the trong mo ta

## Path Conventions

- **Backend**: `backend/src/services/`, `backend/src/controllers/`, `backend/src/routes/api/v1/`
- **Frontend**: `frontend/src/pages/objective-testing/`, `frontend/src/services/`
- Paths tuan theo cau truc trong PLAN.md

---

## Phase 1: Setup

- [x] T001 [P] Xác nhận route file `backend/src/routes/api/v1/attempts.routes.js` tồn tại và được mount
- [x] T002 [P] Tạo skeleton `frontend/src/pages/objective-testing/TestHistoryPage.jsx` + đăng ký route
- [x] T003 [P] Tạo skeleton `frontend/src/pages/objective-testing/TestResultDetailPage.jsx` + đăng ký route

---

## Phase 2: User Story 4 — Lịch sử & Tra cứu (P2)

**Goal**: Học viên xem danh sách các lượt thi và xem lại chi tiết câu đúng/sai kèm giải thích

**Independent Test**: Với data sẵn trong `test_attempts`: (1) `GET /api/v1/attempts` trả đúng danh sách; (2) `GET /api/v1/attempts/:id` trả chi tiết đúng/sai; (3) `TestResultDetailPage` hiển thị highlight xanh/đỏ

### Backend

- [x] T004 [P] [US4] Implement `getAttemptHistory` trong `attempt.service.js`: SELECT từ `test_attempts`
- [x] T004b [US4] Implement logic merge Subjective Submissions (tự luận) vào chung mảng History trong `AttemptController.getHistory`
- [x] T005 [P] [US4] Implement `getAttemptById` và `getAttemptDetail` trong `attempt.service.js`: Trả về summary và chi tiết (JOIN `questions`)
- [x] T006 [US4] Implement 3 controller handlers `getHistory`, `getAttempt`, `getAttemptDetail` trong `attempt.controller.js`
- [x] T007 [US4] Đăng ký routes: `GET /`, `GET /:attemptId`, `GET /:attemptId/detail` trong `attempts.routes.js`
- [x] T008 [US4] Bảo vệ các routes bằng JWT auth middleware; filter `user_id` từ `req.user.id`

**Checkpoint Backend**: 3 APIs hoạt động mượt mà, history merge được cả Objective & Subjective.

### Frontend

- [x] T009 [P] [US4] Build `TestHistoryPage.jsx`: gọi API getHistory, hỗ trợ filter `?skill=`, render table/list bao gồm hiển thị mode Practice/Timed.
- [x] T010 [P] [US4] Build `TestResultDetailPage.jsx`: render UI dạng Accordion, highlight xanh/đỏ, hiển thị explanation khi expand.
- [x] T011 [US4] Cập nhật 3 hàm API `getAttemptHistory`, `getAttempt`, `getAttemptDetail` vào `frontend/src/services/attempt.service.js`

**Checkpoint**: Flow hoàn chỉnh — nộp bài → redirect → xem kết quả → vào lịch sử → xem chi tiết

---

## Phase 3: Polish

- [x] T012 Loading state khi fetch danh sách (skeleton/spinner)
- [x] T013 Empty state khi chưa có lượt thi nào (Kèm nút điều hướng sang làm bài)
- [x] T014 Table responsive và Badge styling đẹp mắt

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Khong phu thuoc - bat dau ngay
- **Phase 2 - History & Detail**: Phu thuoc Phase 1 hoan thanh
- **Phase 3 - Polish**: Phu thuoc Phase 2 hoan thanh

### User Story Dependencies

- **US4 (P2)**: Phu thuoc `feat-auto-grading` (can `test_attempts` co data that)
- Phu thuoc `feat-listening-ui` hoac `feat-reading-ui` da co submit flow (moi co data de test)
- JWT middleware da hoat dong (`req.user.id` available)

### Within Each Phase

- T004 (`getAttemptList`) va T005 (`getAttemptDetail`) chay song song
- T004, T005 truoc T006 (controller handlers)
- T006 truoc T007 (register routes), T007 truoc T008 (auth middleware)
- T009 (`TestHistoryPage`) va T010 (`TestResultDetailPage`) chay song song
- T011 (frontend service) co the chay song song voi T009+T010

### Parallel Opportunities

- T001-T003 Phase 1: tat ca song song
- T004, T005: song song (2 functions doc lap trong cung file)
- T009, T010, T011: song song (khac file)

---

## Implementation Strategy

### MVP First (History List Only)

1. Complete Phase 1: Setup (T001-T003)
2. Implement Backend: `getAttemptList` + controller + route (T004-T008)
3. Implement Frontend: `TestHistoryPage` (T009, T011)
4. **STOP va VALIDATE**: Danh sach hien thi dung voi data that
5. Mo rong sang trang chi tiet (T005, T010)

### Incremental Delivery

1. Setup -> Backend API `GET /api/v1/attempts` -> test bang curl
2. Frontend `TestHistoryPage` fetch + render -> kiem tra danh sach
3. Backend `GET /api/v1/attempts/:attemptId/detail` -> test bang curl
4. Frontend `TestResultDetailPage` highlight -> kiem tra xanh/do dung
5. Polish (loading, empty state) -> merge

### Parallel Team Strategy

- **Developer Backend**: T004-T008 (2 API endpoints)
- **Developer Frontend**: T009-T011 (2 pages + service) sau khi Backend xong
- Hoac: Backend mock API truoc, Frontend dev song song voi mock

---

## Notes

- ponytail: `getAttemptDetail` JOIN trực tiếp trong SQL — không cần query riêng rồi merge trong JS
- `correct_answer` có thể expose ở đây vì user đã nộp bài xong
- Filter `user_id` BẮT BUỘC trong mọi query — không để user xem attempt của người khác
