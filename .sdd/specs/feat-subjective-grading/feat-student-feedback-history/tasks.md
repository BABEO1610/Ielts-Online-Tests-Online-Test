---
description: "Danh sách công việc triển khai Lịch sử nộp bài và Báo cáo kết quả của Học viên"
---

# Công việc: Lịch sử nộp bài và Báo cáo kết quả của Học viên (Student Feedback & History)

**Đầu vào**: [spec.md](./spec.md), [plan.md](./plan.md)

**Điều kiện tiên quyết**: Các tệp bảng `writing_submissions`, `speaking_submissions`, `ai_grading_reports`, `tutor_feedback_reports` đã tồn tại. Middleware `authenticate` đã hoạt động.

**Kiểm thử**: Bắt buộc cho service layer (≥80% coverage).

## Định dạng: `[ID] [P?] [Story] Mô tả`

- **[P]**: Có thể làm song song (khác file, không phụ thuộc)
- **[USn]**: Liên kết câu chuyện người dùng trong spec.md
- Mỗi task có đường dẫn file chính xác

## Giai đoạn 1: Thiết lập

**Mục đích**: Xác nhận cấu trúc hiện có và đảm bảo sẵn sàng trước khi sửa code.

- [x] T001 Xác minh bảng `writing_submissions`, `speaking_submissions`, `ai_grading_reports`, `tutor_feedback_reports` trong `backend/src/db/pool.js`
- [x] T002 [P] Xác minh route `GET /api/v1/submissions/history` và `GET /api/v1/submissions/:id/feedback` tồn tại trong `backend/src/routes/api/v1/submissions.routes.js`
- [x] T003 [P] Xác minh `gradingService` export `getSubmissionHistory` và `getFeedback` trong `frontend/src/services/grading.service.js`

**Điểm kiểm tra**: Schema và API routing đã sẵn sàng.

---

## Giai đoạn 2: Nền tảng (Bảo mật Sở hữu & Grouping SQL)

**Mục đích**: Các điều kiện bảo mật và truy vấn gom nhóm dữ liệu mà mọi User Story phụ thuộc.

**⚠️ QUAN TRỌNG**: Không triển khai User Story nào trước khi giai đoạn này hoàn tất.

- [x] T004 Chuẩn hóa kiểm tra quyền sở hữu bài nộp: Lọc đúng `user_id = req.user.id` và trả về 403 Forbidden khi truy cập bài của người khác trong `backend/src/services/submission.service.js`
- [x] T005 [P] Chuẩn hóa truy vấn SQL gom nhóm `writing_group_id` / `speaking_group_id` cho API lịch sử bài làm trong `backend/src/services/submission.service.js`
- [x] T006 [P] Đảm bảo logic ưu tiên điểm số: Hiển thị `overall_tutor_band` nếu có, fallback về `overall_ai_band` trong `backend/src/services/submission.service.js`
- [x] T007 Viết unit test cho history grouping query và ownership validation trong `backend/tests/unit/services/historyValidation.test.js`

**Điểm kiểm tra**: Ownership guards và history SQL grouping đã có test pass.

---

## Giai đoạn 3: Câu chuyện người dùng 1 — Giao diện Lịch sử nộp bài (P1) 🎯 MVP

**Mục tiêu**: Học viên xem danh sách lịch sử nộp bài, lọc theo kỹ năng và xem điểm Band số thu gọn.

**Kiểm thử độc lập**: Truy cập `/student/profile/practice-history`, lọc theo "Writing" / "Speaking", kiểm tra danh sách hiển thị đúng bài của học viên.

- [x] T008 [P] [US1] Rà soát `StudentHistoryPage` hiển thị danh sách bài nộp, bộ lọc type (`all`, `writing`, `speaking`), status badge tiếng Việt và điểm band thu gọn trong `frontend/src/pages/grading/StudentHistoryPage.jsx`
- [x] T009 [US1] Rà soát `SubmissionController.getHistory` đọc `req.user.id` và trả dữ liệu danh sách lịch sử trong `backend/src/controllers/submission.controller.js`
- [x] T010 [US1] Rà soát `SubmissionService.getHistory` thực thi query parameterized SQL với `GROUP BY COALESCE(ws.writing_group_id::text, ws.id::text)` trong `backend/src/services/submission.service.js`
- [x] T011 [US1] Viết unit test cho `StudentHistoryPage` component trong `frontend/tests/pages/grading/StudentHistoryPage.test.jsx`

**Điểm kiểm tra**: Giao diện Lịch sử bài làm hiển thị đúng bài nộp và bộ lọc.

---

## Giai đoạn 4: Câu chuyện người dùng 2 — Trang báo cáo kết quả chi tiết (P1)

**Mục tiêu**: Học viên mở xem chi tiết báo cáo phản hồi 4 tiêu chí IELTS, phân biệt nhãn `AI Estimated Band` vs `Tutor Grade`.

**Kiểm thử độc lập**: Mở một bài đã chấm, xác minh hiển thị đủ 4 tiêu chí, nhãn nguồn điểm, error highlights và bài làm cải thiện.

- [x] T012 [P] [US2] Rà soát `FeedbackReport` component hiển thị 4 tiêu chí IELTS, điểm tổng hợp, nhãn `AI Estimated Band` / `Tutor Grade`, summary và suggestions trong `frontend/src/components/grading/FeedbackReport.jsx`
- [x] T013 [US2] Rà soát `StudentFeedbackDetailPage` truyền đúng `submissionId` và `type` cho `FeedbackReport` trong `frontend/src/pages/grading/StudentFeedbackDetailPage.jsx`
- [x] T014 [US2] Rà soát controller `SubmissionController.getFeedback` đọc `req.params.id`, `req.query.type` và `req.user.id` trong `backend/src/controllers/submission.controller.js`
- [x] T015 [US2] Rà soát `SubmissionService.getWritingFeedbackDetail` và `getSpeakingFeedbackDetail` map chi tiết báo cáo AI/Tutor trong `backend/src/services/submission.service.js`
- [x] T016 [US2] Viết integration test cho API `GET /api/v1/submissions/:id/feedback` trong `backend/tests/integration/submissions/feedbackDetail.test.js`

**Điểm kiểm tra**: Trang báo cáo chi tiết hiển thị đầy đủ phản hồi 4 tiêu chí.

---

## Giai đoạn 5: Câu chuyện người dùng 3 — Chấm lại AI & Xử lý lỗi (P2)

**Mục tiêu**: Học viên bấm "Yêu cầu chấm lại AI" cho các bài lỗi/chưa chấm.

**Kiểm thử độc lập**: Tại trang Lịch sử, bấm Chấm lại AI, kiểm tra API gửi lại request chấm và cập nhật trạng thái.

- [x] T017 [P] [US3] Rà soát hàm `handleAiGrading` tại `StudentHistoryPage` gọi `gradingService.requestAiGrading` trong `frontend/src/pages/grading/StudentHistoryPage.jsx`
- [x] T018 [US3] Rà soát `AiGradingController.requestAiGrade` kiểm tra Quota và gửi lại công việc chấm AI trong `backend/src/controllers/aiGrading.controller.js`

**Điểm kiểm tra**: Tính năng chấm lại AI khi gặp sự cố hoạt động an toàn.

---

## Giai đoạn 6: Hoàn thiện và Kiểm tra chéo

**Mục đích**: Cải thiện chất lượng trải nghiệm người dùng và kiểm tra chéo.

- [x] T019 [P] Rà soát trạng thái tải (Loading state) và giao diện rỗng (Zero state) khi học viên chưa có bài nộp trong `frontend/src/pages/grading/StudentHistoryPage.jsx`
- [x] T020 [P] Đảm bảo không trả error stack trace trong API response khi gặp lỗi trong `backend/src/middleware/errorHandler.js`
- [x] T021 Kiểm tra chéo spec ↔ plan ↔ tasks: xác minh mỗi FR trong spec.md có ít nhất một task đảm nhận

---

## Phụ thuộc và thứ tự thực thi

### Phụ thuộc giữa các giai đoạn

- **Giai đoạn 1 (Thiết lập)**: Bắt đầu ngay.
- **Giai đoạn 2 (Nền tảng)**: CHẶN tất cả User Story.
- **Giai đoạn 3 (US1 — Practice History)**: Phụ thuộc giai đoạn 2.
- **Giai đoạn 4 (US2 — Feedback Detail)**: Phụ thuộc giai đoạn 2 + 3.
- **Giai đoạn 5 (US3 — Re-grade AI)**: Phụ thuộc giai đoạn 3.
- **Giai đoạn 6 (Hoàn thiện)**: Phụ thuộc tất cả giai đoạn trước.

---

## Ma trận FR ↔ Task

| FR | Task(s) | Ghi chú |
|---|---|---|
| FR-001 | T004, T009 | Scope history to req.user.id |
| FR-002 | T005, T010 | Group by writing_group_id / speaking_group_id |
| FR-003 | T008 | History UI filter by type (all/writing/speaking) |
| FR-004 | T006, T008 | Score priority: tutor_band > ai_band |
| FR-005 | T004, T014, T015 | Verify ownership for feedback detail |
| FR-006 | T012, T015 | Writing feedback 4 criteria, error highlights & improved version |
| FR-007 | T012, T015 | Speaking feedback 4 criteria, transcript & audio player |
| FR-008 | T012 | Display distinct badges for AI Estimated Band vs Tutor Grade |
| FR-009 | T017, T018 | AI Re-grade retry with Quota check |
| FR-010 | T009, T014 | Standard API Envelope response |
| FR-011 | T019, T020 | Loading spinner & friendly error messages |

---

## Ghi chú

- [P] = khác file, không phụ thuộc trực tiếp
- [USn] = liên kết câu chuyện người dùng
