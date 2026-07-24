# Kế hoạch triển khai: Lịch sử nộp bài và Báo cáo kết quả của Học viên (Student Feedback & History)

**Ngữ cảnh Speckit**: `feat-student-feedback-history` | **Ngày**: 2026-07-23 | **Đặc tả**: [spec.md](./spec.md)

**Đầu vào**: Đặc tả tính năng, mã nguồn as-built và schema cơ sở dữ liệu hiện có.

## Tóm tắt

Triển khai giao diện và API tra cứu Lịch sử nộp bài & Báo cáo phản hồi chi tiết cho Học viên: bao gồm API lấy danh sách bài nộp gom nhóm theo `group_id` (`GET /api/v1/submissions/history`), API lấy chi tiết báo cáo AI/Tutor (`GET /api/v1/submissions/:id/feedback`), giao diện danh sách Lịch sử (`StudentHistoryPage`), trang báo cáo chi tiết (`StudentFeedbackDetailPage` & `FeedbackReport`), phân biệt nhãn `AI Estimated Band` vs `Tutor Grade`, và khả năng gửi lại yêu cầu AI chấm khi gặp sự cố.

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js ≥20 (CommonJS backend); React 18 + JSX (frontend)

**Phụ thuộc chính**: Express 5.x, `pg` 8.x (raw SQL parameterized), React 18, Vite, Bootstrap 5.x, Axios

**Lưu trữ**: PostgreSQL 16 — các bảng `writing_submissions`, `speaking_submissions`, `ai_grading_reports`, `tutor_feedback_reports`

**Kiểm thử**: Jest (backend), Vitest + Testing Library (frontend)

**Nền tảng đích**: React SPA + Express REST API

**Loại dự án**: Ứng dụng web (frontend + backend)

## Kiểm tra Constitution

| Điều khoản | Tuân thủ | Ghi chú |
|---|---|---|
| Article 1 — Tech Stack | ✅ | Node 20, Express 5, React 18, Vite, Bootstrap 5, `pg` raw SQL |
| Article 2 — Coding Standards | ✅ | PascalCase components, camelCase services, snake_case DB, 40 dòng/hàm, 300 dòng/file |
| Article 3 — API Format | ✅ | Envelope `{ success, data, error, meta }` |
| DB Access — No ORM | ✅ | Parameterized queries `$1, $2` qua `pg` |
| Security & Ownership | ✅ | Truy vấn lọc đúng `user_id = req.user.id`, từ chối 403 khi xem bài của học viên khác |

## Cấu trúc dự án

### Tài liệu (feature này)

```text
.sdd/specs/feat-subjective-grading/feat-student-feedback-history/
├── spec.md           # Đặc tả tính năng
├── plan.md           # File này
├── tasks.md          # Danh sách công việc
└── checklist.md      # Kiểm định chất lượng yêu cầu
```

### Mã nguồn (file liên quan)

```text
frontend/
├── src/
│   ├── pages/grading/
│   │   ├── StudentHistoryPage.jsx        # Trang danh sách Lịch sử bài nộp
│   │   └── StudentFeedbackDetailPage.jsx # Trang chi tiết báo cáo kết quả
│   ├── components/grading/
│   │   ├── FeedbackReport.jsx            # Component hiển thị 4 tiêu chí & nhận xét
│   │   └── AudioPlayer.jsx               # Trình phát audio cho bài Speaking
│   └── services/
│       └── grading.service.js            # API calls getSubmissionHistory, getFeedback

backend/
├── src/
│   ├── controllers/
│   │   └── submission.controller.js      # Handlers getHistory, getFeedback
│   ├── services/
│   │   └── submission.service.js         # Business logic getHistory, getWritingFeedbackDetail, getSpeakingFeedbackDetail
│   ├── routes/api/v1/
│   │   └── submissions.routes.js         # GET /submissions/history, GET /submissions/:id/feedback
│   └── middleware/
│       └── authenticate.js               # req.user.id
```

**Quyết định cấu trúc**: Sử dụng cấu trúc web app hiện có (frontend/ + backend/). Không tạo thư mục mới.

## API Endpoints chính

| Method | Endpoint | Mục đích | Phân quyền |
|---|---|---|---|
| `GET` | `/api/v1/submissions/history` | Lấy danh sách lịch sử bài nộp đã nhóm theo group | Authenticated Student |
| `GET` | `/api/v1/submissions/:id/feedback` | Lấy báo cáo phản hồi chi tiết (AI / Tutor) | Authenticated Owner |
| `POST` | `/api/v1/submissions/writing/:submissionId/ai-grade` | Yêu cầu chấm lại bằng AI khi lỗi | Authenticated Owner |

## Sơ đồ luồng xử lý chính

### 1. Luồng Lấy danh sách Lịch sử (`getHistory`)

```text
StudentHistoryPage
  → gradingService.getSubmissionHistory()
  → GET /api/v1/submissions/history
  → authenticate middleware → req.user.id
  → SubmissionController.getHistory
  → SubmissionService.getHistory(userId)
    → Run parameterized SQL query with GROUP BY COALESCE(ws.writing_group_id::text, ws.id::text)
    → JOIN ai_grading_reports & tutor_feedback_reports
    → Map fields: id, type, submitted_at, status, band_score, ai_band_score, tutor_band_score
  → Response: { success: true, data: [ historyItems... ] }
```

### 2. Luồng Xem chi tiết Báo cáo (`getFeedback`)

```text
StudentFeedbackDetailPage
  → FeedbackReport component
  → gradingService.getFeedback(submissionId, type)
  → GET /api/v1/submissions/:id/feedback?type=writing|speaking
  → authenticate middleware → req.user.id
  → SubmissionController.getFeedback
  → SubmissionService.getFeedback(submissionId, type, userId)
    → Verify user_id === req.user.id (Reject 403 if foreign)
    → Fetch writing/speaking tasks in group
    → Fetch ai_grading_reports & tutor_feedback_reports
    → Map criteria: TR/TA, CC, LR, GRA (Writing) or FC, LR, GRA, Pronunciation (Speaking)
    → Format response: overallBand, criteria, errorHighlights, improvedVersion, tutorFeedback
  → Response: { success: true, data: { feedbackDetail } }
```
