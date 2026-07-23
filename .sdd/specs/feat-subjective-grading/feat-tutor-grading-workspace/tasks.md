---
description: "Danh sách công việc triển khai Không gian chấm bài dành cho Giáo viên (Tutor Workspace)"
---

# Công việc: Không gian chấm bài dành cho Giáo viên (Tutor Grading Workspace)

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md)

**Điều kiện tiên quyết**: Bảng `tutor_feedback_reports`, `writing_submissions`, `speaking_submissions`, `audit_logs` và view `v_tutor_grading_queue` đã tồn tại. Middleware `authenticate` và `authorize` đã hoạt động.

**Kiểm thử**: Bắt buộc cho service layer (≥80% coverage). Mock Socket.io & AI Prelim — không gọi dịch vụ ngoài thật.

## Định dạng: `[ID] [P?] [Story] Mô tả`

- **[P]**: Có thể làm song song (khác file, không phụ thuộc)
- **[USn]**: Liên kết câu chuyện người dùng trong spec.md
- Mỗi task có đường dẫn file chính xác

## Giai đoạn 1: Thiết lập

**Mục đích**: Xác nhận cấu trúc hiện có và đảm bảo sẵn sàng trước khi sửa code.

- [x] T001 Xác minh bảng `tutor_feedback_reports`, view `v_tutor_grading_queue` và các cột `assigned_tutor_id`, `tutor_status`, `overall_tutor_band` trong `backend/src/db/pool.js`
- [x] T002 [P] Xác minh 14 route API Tutor trong `backend/src/routes/api/v1/tutors.routes.js` gắn đúng middleware `authenticate` và `authorize(['tutor', 'admin'])`
- [x] T003 [P] Xác minh `AuditLogService` trong `backend/src/services/audit.service.js` sẵn sàng nhận log thao tác của Tutor

**Điểm kiểm tra**: Schema, routes và audit logger đã sẵn sàng.

---

## Giai đoạn 2: Nền tảng (Quyền & Khóa nguyên tử)

**Mục đích**: Các điều kiện bảo mật và kiểm tra quyền hạn mà mọi User Story phụ thuộc.

**⚠️ QUAN TRỌNG**: Không triển khai User Story nào trước khi giai đoạn này hoàn tất.

- [x] T004 Chuẩn hóa kiểm tra quyền truy cập bài nộp: Chỉ cho phép Tutor được gán (`assigned_tutor_id === req.user.id`) hoặc Admin xem chi tiết/chấm bài trong `backend/src/services/tutor.service.js`
- [x] T005 [P] Chuẩn hóa hàm tính điểm trung bình Tutor: Tính trung bình cộng 4 tiêu chí và làm tròn half-band trong `backend/src/utils/scoring.js`
- [x] T006 [P] Đảm bảo kết quả chấm Tutor lưu vào `tutor_feedback_reports` KHÔNG ghi đè cột `overall_ai_band` trong `backend/src/services/tutor.service.js`
- [x] T007 Viết unit test cho authorization checks và scoring logic của Tutor trong `backend/tests/unit/services/tutorValidation.test.js`

**Điểm kiểm tra**: Authorization guards và scoring functions đã có test pass.

---

## Giai đoạn 3: Câu chuyện người dùng 1 — Hàng đợi bài chờ chấm & Claim (P1) 🎯 MVP

**Mục tiêu**: Giáo viên xem danh sách bài chờ chấm (`grader = 'tutor'` & `status = 'pending'`), lọc/tìm kiếm và bấm nhận bài.

**Kiểm thử độc lập**: Truy cập `/tutor/queue`, lọc bài, bấm nhận bài, kiểm tra API trả về gán bài cho đúng Tutor.

- [x] T008 [P] [US1] Rà soát component `TutorQueue` hiển thị danh sách bài chờ chấm, bộ lọc type (writing/speaking) và ô tìm kiếm tên học viên trong `frontend/src/components/grading/TutorQueue.jsx`
- [x] T009 [P] [US1] Rà soát `TutorQueuePage` gọi `gradingService.getTutorQueue` và xử lý chuyển hướng khi nhận bài thành công trong `frontend/src/pages/grading/TutorQueuePage.jsx`
- [x] T010 [US1] Rà soát controller `TutorController.getTutorQueue` đọc `req.user.id`, parse query params và trả danh sách từ `TutorService.getQueue` trong `backend/src/controllers/tutor.controller.js`
- [x] T011 [US1] Rà soát query SQL trong `TutorService.getQueue` lọc đúng `grader = 'tutor'` và `status = 'pending'` từ view `v_tutor_grading_queue` trong `backend/src/services/tutor.service.js`

**Điểm kiểm tra**: Hàng đợi bài chấm Tutor lọc đúng bài và hỗ trợ nhận bài.

---

## Giai đoạn 4: Câu chuyện người dùng 2 & 3 — Màn hình chấm bài, AI Prelim Assist (P1)

**Mục tiêu**: Giáo viên xem chi tiết bài nộp, nghe audio/đọc văn bản, bấm AI Prelim lấy nháp gợi ý, nhập điểm 4 tiêu chí và lưu kết quả.

**Kiểm thử độc lập**: Mở trang chấm bài, bấm AI Prelim nhận nháp, chỉnh sửa điểm, bấm "Lưu kết quả", kiểm tra DB có 1 bản ghi mới trong `tutor_feedback_reports`.

- [x] T012 [P] [US2] Rà soát component `TutorGradingPanel` chứa form nhập điểm 4 tiêu chí (0.0-9.0), ô nhận xét văn bản và nút "Gợi ý AI" trong `frontend/src/components/grading/TutorGradingPanel.jsx`
- [x] T013 [US2] Rà soát `TutorGradingPage` hiển thị chi tiết Task 1+2 Writing hoặc 3 Parts audio Speaking kèm nút yêu cầu transcribe trong `frontend/src/pages/grading/TutorGradingPage.jsx`
- [x] T014 [US3] Rà soát API AI Prelim (`POST /submissions/:type/:id/ai-prelim`) đảm bảo trả về gợi ý nháp mà KHÔNG đổi status bài nộp hoặc insert báo cáo Tutor trong `backend/src/controllers/tutor.controller.js`
- [x] T015 [US2] Rà soát controller `TutorController.gradeSubmission` và `TutorService.gradeSubmission` thực thi DB transaction insert `tutor_feedback_reports`, update status `tutor_graded` và phát event Socket.io trong `backend/src/services/tutor.service.js`
- [x] T016 [US2] Viết integration test cho API `POST /tutors/submissions/:type/:id/grade` và `POST /ai-prelim` trong `backend/tests/integration/tutors/tutorGrading.test.js`

**Điểm kiểm tra**: Màn hình chấm bài và tính năng AI Prelim hoạt động chuẩn xác.

---

## Giai đoạn 5: Câu chuyện người dùng 4 — Lịch sử chấm bài, Thu hồi & Tham khảo AI (P2)

**Mục tiêu**: Giáo viên xem lịch sử bài đã chấm, sửa điểm, thu hồi kết quả và xem bài AI tham khảo.

**Kiểm thử độc lập**: Mở trang Lịch sử chấm bài, bấm Thu hồi một bài chấm, kiểm tra báo cáo bị soft-delete.

- [x] T017 [P] [US4] Rà soát `TutorGradingHistoryPage` danh sách bài đã chấm, nút Thu hồi (Revoke) và Sửa điểm trong `frontend/src/pages/grading/TutorGradingHistoryPage.jsx`
- [x] T018 [US4] Rà soát controller & service cho Revoke (`PATCH /grading-history/:id/revoke`) thực thi soft-delete và kiểm tra chính giáo viên đó trong `backend/src/services/tutor.service.js`
- [x] T019 [US4] Rà soát controller & service cho Update Score (`PATCH /grading-history/:id/score`) cập nhật điểm và tính lại band trong `backend/src/services/tutor.service.js`
- [x] T020 [P] [US4] Rà soát `TutorAiReferencePage` và `TutorAiReferenceDetailPage` cho phép Tutor xem danh sách bài AI chấm ở chế độ Read-only trong `frontend/src/pages/grading/TutorAiReferencePage.jsx`

**Điểm kiểm tra**: Quản lý lịch sử chấm bài và thu hồi hoạt động an toàn.

---

## Giai đoạn 6: Hoàn thiện và Audit Logging

**Mục đích**: Lưu vết nhật ký hoạt động và kiểm tra chéo.

- [x] T021 [P] Đảm bảo mọi thao tác Grade, Revoke, Score Update đều gọi `AuditLogService.logAction` để ghi vết nhật ký trong `backend/src/services/tutor.service.js`
- [x] T022 [P] Rà soát trang Nhật ký hoạt động Tutor (`TutorActivityLogPage.jsx`) hiển thị đúng log cá nhân của Tutor trong `frontend/src/pages/tutor/TutorActivityLogPage.jsx`
- [x] T023 Kiểm tra chéo spec ↔ plan ↔ tasks: xác minh mỗi FR trong spec.md có ít nhất một task đảm nhận

---

## Phụ thuộc và thứ tự thực thi

### Phụ thuộc giữa các giai đoạn

- **Giai đoạn 1 (Thiết lập)**: Bắt đầu ngay.
- **Giai đoạn 2 (Nền tảng)**: CHẶN tất cả User Story.
- **Giai đoạn 3 (US1 — Tutor Queue)**: Phụ thuộc giai đoạn 2.
- **Giai đoạn 4 (US2 & US3 — Grading Workspace & AI Prelim)**: Phụ thuộc giai đoạn 2 + 3.
- **Giai đoạn 5 (US4 — History & Revoke)**: Phụ thuộc giai đoạn 4.
- **Giai đoạn 6 (Hoàn thiện & Audit)**: Phụ thuộc tất cả giai đoạn trước.

---

## Ma trận FR ↔ Task

| FR | Task(s) | Ghi chú |
|---|---|---|
| FR-001 | T008, T010, T011 | Tutor queue list & filter |
| FR-002 | T009, T011 | Atomic Claim & assigned_tutor_id |
| FR-003 | T004, T007 | Access control check for assigned tutor |
| FR-004 | T013 | Writing task 1 & 2 detail view |
| FR-005 | T013 | Speaking 3 parts audio player & transcribe |
| FR-006 | T012, T015 | 4 criteria scores & written feedback |
| FR-007 | T015, T016 | DB transaction & tutor_feedback_reports |
| FR-008 | T006, T015 | Separate overall_tutor_band, keep overall_ai_band |
| FR-009 | T014, T016 | AI Prelim draft assist (no status change) |
| FR-010 | T017 | Tutor grading history list |
| FR-011 | T018 | Soft-delete revoke result |
| FR-012 | T019 | Update score & recalculate band |
| FR-013 | T020 | Read-only AI reference list & detail |
| FR-014 | T021, T022 | Audit logging for all tutor actions |
| FR-015 | T010, T014, T015 | Standard API Envelope response |

---

## Ghi chú

- [P] = khác file, không phụ thuộc trực tiếp
- [USn] = liên kết câu chuyện người dùng
- Điểm Tutor và điểm AI độc lập hoàn toàn — không đè lên nhau
