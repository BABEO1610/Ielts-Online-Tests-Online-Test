# Kế hoạch triển khai tổng thể: Hệ thống Chấm bài Tự luận IELTS (Subjective Grading Master Plan)

**Ngữ cảnh Speckit**: `feat-subjective-grading` | **Ngày**: 2026-07-23 | **Đặc tả Master**: [SPEC.md](./SPEC.md)

**Đầu vào**: Đặc tả Master SPEC, cấu trúc phân rã 6 sub-features và mã nguồn as-built.

## 1. Kiến trúc Triển khai Tổng thể (Master Architecture)

Hệ thống được chia thành 6 phân hệ chính hoạt động trên kiến trúc React SPA (Frontend) + Express REST API (Backend) + PostgreSQL 16 (Database):

```text
               ┌─────────────────────────────────────────┐
               │    React SPA Frontend (Vite + JSX)      │
               └────────────────────┬────────────────────┘
                                    │ REST API (Bearer JWT / Session)
                                    ▼
               ┌─────────────────────────────────────────┐
               │    Express 5 Backend (CommonJS)         │
               └────────┬───────────────────────┬────────┘
                        │                       │
      ┌─────────────────┴──────┐      ┌─────────┴──────────────┐
      │ DB Queries (pg raw SQL)│      │ Backend AI Provider    │
      └─────────┬──────────────┘      └─────────┬──────────────┘
                │                               │
                ▼                               ▼
      ┌──────────────────┐            ┌──────────────────┐
      │ PostgreSQL 16 DB │            │ LLM / ASR Engine │
      └──────────────────┘            └──────────────────┘
```

### Mã nguồn Frontend (React 18 + Vite)
- `frontend/src/pages/subjective-testing/WritingTestPage.jsx` — Luồng thi Writing.
- `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx` — Luồng thi Speaking 3 Parts.
- `frontend/src/pages/admin/TutorAssignmentPage.jsx` — Admin Phân công Giảng viên.
- `frontend/src/pages/grading/TutorQueuePage.jsx` — Hàng đợi bài chấm Tutor.
- `frontend/src/pages/grading/TutorGradingPage.jsx` — Giao diện chấm bài của Tutor.
- `frontend/src/pages/grading/StudentHistoryPage.jsx` — Trang Lịch sử bài làm Học viên.
- `frontend/src/pages/grading/StudentFeedbackDetailPage.jsx` — Trang Báo cáo chi tiết.

### Mã nguồn Backend (Express 5 + node-postgres)
- `backend/src/controllers/aiGrading.controller.js` — Core AI Grading Controller.
- `backend/src/services/speakingAiGrading.service.js` — Speaking AI Grading Wrapper.
- `backend/src/ai/grading.service.js` — Writing AI Grading Wrapper.
- `backend/src/controllers/adminTutor.controller.js` — Controller Admin Phân công.
- `backend/src/controllers/submission.controller.js` — Controller Nộp bài Học viên.
- `backend/src/controllers/tutor.controller.js` — Controller Chấm bài Tutor.

---

## 2. Kế hoạch Triển khai 6 Sub-Features

### 2.1. Phân hệ Writing (`feat-writing-test-flow`)
- Nộp bài full Task 1 & 2 qua DB Transaction với `writing_group_id`.

### 2.2. Phân hệ Speaking (`feat-speaking-test-flow`)
- Upload audio an toàn `speaking/{userId}/`, nộp full 3 Parts qua DB Transaction với `speaking_group_id`.

### 2.3. Phân hệ Tích hợp Chấm điểm AI (`feat-ai-grading-integration`)
- Endpoint `POST /api/v1/submissions/writing/:submissionId/ai-grade`.
- Idempotency Cached Report, Word Count Check, 4 criteria validation, weighted band score (33%/67%), `ai_usage_logs` logging và Socket.io realtime events.

### 2.4. Phân hệ Admin Phân công (`feat-admin-tutor-assignment`)
- Phân công Giảng viên phụ trách (`assigned_tutor_id`) cho từng bài nộp và lưu log `audit_logs` với action `'tutor_assigned'`.

### 2.5. Phân hệ Không gian Giáo viên (`feat-tutor-grading-workspace`)
- Tutor Queue hiển thị bài nộp được phân công hoặc chưa phân công. Claim nguyên tử, AI Prelim Assist, lưu báo cáo riêng biệt `tutor_feedback_reports`.

### 2.6. Phân hệ Lịch sử & Báo cáo Học viên (`feat-student-feedback-history`)
- Tra cứu lịch sử gom nhóm theo `group_id`, hiển thị 4 tiêu chí, nhãn `AI Estimated Band` vs `Tutor Grade`, xác minh sở hữu `user_id = req.user.id`.
