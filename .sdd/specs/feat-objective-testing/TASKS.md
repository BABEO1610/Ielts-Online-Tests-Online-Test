---
description: "Task list template for feature implementation"
---

# Tasks: Thi Trắc Nghiệm (feat-objective-testing)

**Input**: Design documents from `/specs/feat-objective-testing/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Setup cấu trúc bảng `test_attempts` trong DB (sử dụng `.sql` migration file).
- [x] T002 Khởi tạo các file Route và Controller: `api/v1/tests.js`, `api/v1/attempts.routes.js` và `attempt.controller.js`.
- [x] T003 Cấu trúc thư mục và component ở Frontend (`ListeningTestPage.jsx`, `ReadingTestPage.jsx`, `TestHistoryPage.jsx`, `TestResultDetailPage.jsx`).

---

## Phase 2: Foundational (Blocking Prerequisites) & User Story 3 - Auto Grading (P1)

**Purpose**: Core infrastructure and logic for scoring that MUST be complete before ANY user story can be implemented

- [x] T004 [US3] Triển khai logic Auto-grading (trim khoảng trắng, lowerCase, xóa dấu câu) vào hàm `normalizeAnswer` trong `backend/src/services/attempt.service.js`.
- [x] T005 [US3] Triển khai logic tính Band Score (từ `getBandScore`) vào `backend/src/services/attempt.service.js`.
- [x] T006 [US3] Triển khai API `POST /api/v1/tests/:id/attempts` trong `attempt.controller.js` gọi qua `attempt.service.js` để lưu DB và chấm điểm.

---

## Phase 3: User Story 1 - Giao diện Listening (Priority: P1)

**Goal**: Luồng thi Listening

- [x] T007 [US1] Xây dựng quản lý state câu trả lời bằng `useState` cục bộ trong `frontend/src/pages/objective-testing/ListeningTestPage.jsx`.
- [x] T008 [P] [US1] Hoàn thiện Component `QuestionNavigation.jsx` và `TimerBar.jsx`.
- [x] T009 [US1] Nhúng Audio Player tĩnh (không tự qua bài) và render giao diện trong `ListeningTestPage.jsx`.
- [x] T010 [US1] Tích hợp hàm `attemptService.submitAttempt` gọi API `POST /api/v1/tests/:id/attempts` khi hết giờ hoặc bấm nộp.

---

## Phase 4: User Story 2 - Giao diện Reading (Priority: P1)

**Goal**: Luồng thi Reading

- [x] T011 [P] [US2] Code luồng `ReadingTestPage.jsx`: Thiết kế CSS Grid/Flexbox dạng Split View.
- [x] T012 [US2] Tái sử dụng `QuestionNavigation.jsx` và `TimerBar.jsx` từ US1 ghép vào layout Split View.
- [x] T013 [US2] Quản lý state câu trả lời bằng `useState` trong `ReadingTestPage.jsx` đảm bảo nội dung được giữ nguyên khi cuộn văn bản.

---

## Phase 5: User Story 4 - Lịch sử và Tra cứu kết quả (Priority: P2)

**Goal**: Lịch sử thi

- [x] T014 [P] [US4] Backend: Viết logic lấy danh sách lượt thi API `GET /api/v1/attempts` trong `attempt.service.js`.
- [x] T015 [P] [US4] Backend: Viết logic trả về chi tiết câu đúng/sai API `GET /api/v1/attempts/:id` trong `attempt.service.js`.
- [x] T016 [US4] Frontend: Build UI trang `TestHistoryPage.jsx`.
- [x] T017 [US4] Frontend: Build UI trang `TestResultDetailPage.jsx` (review câu trả lời highlight xanh/đỏ).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 Tối ưu hóa API trả về (API call chạy tốt trong thực tế).
- [x] T019 Clean code và đồng bộ các file tài liệu SPEC, PLAN, TASKS theo đúng thực tế implementation.

---

## Notes

- Trạng thái tất cả các task hiện tại là **Đã hoàn thành `[x]`** do dự án đã hoàn thiện.
- Các yêu cầu trong bản SPEC cũ chưa được code (Zustand `useExamStore`, LocalStorage auto-save, Unit Tests cho service) đã được gỡ bỏ khỏi file TASKS này để phản ánh đúng 100% source code thực tế.
