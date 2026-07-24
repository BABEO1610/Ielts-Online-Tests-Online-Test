---
description: "Danh sách công việc triển khai Admin Phân công Giảng viên chấm bài"
---

# Công việc: Admin Phân công Giảng viên chấm bài (Admin Tutor Assignment)

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md)

**Điều kiện tiên quyết**: Bảng `writing_submissions`, `speaking_submissions`, `users`, `audit_logs` có cột `assigned_tutor_id`. Middleware `authenticate` và `authorize('admin')` đã hoạt động.

## Giai đoạn 1: Thiết lập

- [x] T001 Xác minh cột `assigned_tutor_id` trong `writing_submissions` và `speaking_submissions` từ `backend/src/db/migrations/016_add_tutor_to_submissions.sql`
- [x] T002 [P] Xác minh route `GET /api/v1/admin/tutor-assignments` và `PUT /api/v1/admin/tutor-assignments/:submissionId` trong `backend/src/routes/api/v1/admin.routes.js`
- [x] T003 [P] Xác minh `adminOpsService` export `fetchTutorAssignments` và `assignTutor` trong `frontend/src/services/adminOps.service.js`

---

## Giai đoạn 2: Nền tảng (Bảo mật RBAC & Database Queries)

- [x] T004 Chuẩn hóa kiểm tra quyền Admin: Đảm bảo chỉ vai trò `admin` mới được truy cập các endpoint phân công giảng viên trong `backend/src/routes/api/v1/admin.routes.js`
- [x] T005 [P] Chuẩn hóa truy vấn SQL cập nhật `assigned_tutor_id` theo `submissionId` và `type` trong `backend/src/db/queries/tutorAssignment.queries.js`
- [x] T006 [P] Đảm bảo ghi nhật ký `audit_logs` với action `'tutor_assigned'` ghi nhận tên Admin, tên Tutor và tên Học viên trong `backend/src/services/adminTutor.service.js`
- [x] T007 Viết unit test cho admin tutor assignment queries và authorization checks trong `backend/tests/unit/services/adminTutor.service.test.js`

---

## Giai đoạn 3: Câu chuyện người dùng 1 — Giao diện Admin Phân công (P1) 🎯 MVP

- [x] T008 [P] [US1] Rà soát `TutorAssignmentPage` hiển thị danh sách bài nộp, Dropdown chọn Giảng viên, trạng thái chưa gán và phân trang trong `frontend/src/pages/admin/TutorAssignmentPage.jsx`
- [x] T009 [US1] Rà soát controller `adminTutorController.getTutorAssignments` parse query params (`page`, `limit`) và trả dữ liệu trong `backend/src/controllers/adminTutor.controller.js`
- [x] T010 [US1] Rà soát service `adminTutorService.getAssignmentData` truy vấn danh sách Giảng viên và Bài nộp chờ gán trong `backend/src/services/adminTutor.service.js`

---

## Giai đoạn 4: Câu chuyện người dùng 2 — Thực thi Phân công & Hủy gán (P1)

- [x] T011 [P] [US2] Rà soát hàm `onAssign` tại `TutorAssignmentPage` gọi `assignTutor` và cập nhật state giao diện trong `frontend/src/pages/admin/TutorAssignmentPage.jsx`
- [x] T012 [US2] Rà soát controller `adminTutorController.assignTutor` đọc `submissionId`, `type`, `tutor_id` và `req.user.id` trong `backend/src/controllers/adminTutor.controller.js`
- [x] T013 [US2] Rà soát service `adminTutorService.assignSubmission` thực thi phân công và lưu log `audit_logs` trong `backend/src/services/adminTutor.service.js`
- [x] T014 [US2] Viết integration test cho API `PUT /api/v1/admin/tutor-assignments/:submissionId` trong `backend/tests/integration/admin/tutorAssignment.test.js`

---

## Giai đoạn 5: Hoàn thiện và Kiểm tra chéo

- [x] T015 [P] Rà soát trạng thái tải (Loading state) và thông báo dữ liệu mẫu trên `TutorAssignmentPage.jsx`
- [x] T016 Kiểm tra chéo spec ↔ plan ↔ tasks: xác minh mỗi FR trong spec.md có ít nhất một task đảm nhận

---

## Ma trận FR ↔ Task

| FR | Task(s) | Ghi chú |
|---|---|---|
| FR-001 | T004, T009 | RBAC authorize('admin') for assignment list |
| FR-002 | T010 | Get available tutors list (role = 'tutor') |
| FR-003 | T005, T013 | Update assigned_tutor_id in DB |
| FR-004 | T006, T013 | Audit logging with action 'tutor_assigned' |
| FR-005 | T005 | Tutor assignment filtering rules |
| FR-006 | T009, T012 | Standard API Envelope response |
