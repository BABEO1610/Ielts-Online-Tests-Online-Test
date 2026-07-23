# Kế hoạch triển khai: Luồng thi và nộp bài Writing

**Ngữ cảnh Speckit**: `feat-writing-test-flow` | **Ngày**: 2026-07-22 | **Đặc tả**: [spec.md](./spec.md)

**Đầu vào**: Đặc tả tính năng, mã nguồn as-built và schema cơ sở dữ liệu hiện có.

## Tóm tắt

Triển khai luồng thi Writing hoàn chỉnh cho học viên: từ giao diện chia đôi màn hình (đề bên trái, soạn thảo bên phải) với đếm ngược thời gian và đếm từ thời gian thực, qua API nộp bài đảm bảo tính toàn vẹn dữ liệu bằng DB transaction, đến phân luồng `grader` (AI hoặc giáo viên) và hiển thị kết quả chấm AI tức thì. Dịch vụ chấm AI bên trong được cung cấp sẵn bởi `ai-fast-grading`.

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js ≥20 (CommonJS backend); React 18 + JSX (frontend)

**Phụ thuộc chính**: Express 5.x, `pg` 8.x (raw SQL parameterized), React 18, Vite, Bootstrap 5.x, Axios

**Lưu trữ**: PostgreSQL 16 — bảng `writing_submissions`, `ai_grading_reports`, `mock_tests`

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
| Auth — req.user.id | ✅ | Lấy từ `authenticate` middleware, không tin `req.body.userId` |

## Cấu trúc dự án

### Tài liệu (feature này)

```text
.sdd/specs/feat-writing-test-flow/
├── spec.md           # Đặc tả tính năng
├── plan.md           # File này
└── tasks.md          # Danh sách công việc
```

### Mã nguồn (file liên quan)

```text
frontend/
├── src/
│   ├── pages/subjective-testing/
│   │   ├── WritingPage.jsx            # Trang danh sách đề Writing
│   │   └── WritingTestPage.jsx        # Trang thi Writing (split-view)
│   ├── components/grading/
│   │   ├── WritingEditor.jsx          # Ô soạn thảo + đếm từ
│   │   └── FeedbackReport.jsx         # Hiển thị kết quả chấm AI
│   └── services/
│       └── grading.service.js         # API calls: submitFullWriting

backend/
├── src/
│   ├── controllers/
│   │   └── submission.controller.js   # submitFullWriting handler
│   ├── services/
│   │   └── submission.service.js      # submitFullWriting business logic
│   ├── routes/api/v1/
│   │   └── submissions.routes.js      # POST /writing/full route
│   ├── ai/
│   │   ├── grading.service.js         # gradeWriting (thuộc ai-fast-grading)
│   │   ├── grading.validator.js       # Validate 4 tiêu chí Writing
│   │   └── grading.prompt.js          # Prompt template Writing
│   ├── middleware/
│   │   └── authenticate.js            # req.user.id
│   └── utils/
│       └── scoring.js                 # calcWeightedWritingOverall (33/67%)
```

**Quyết định cấu trúc**: Sử dụng cấu trúc web app hiện có (frontend/ + backend/). Không tạo thư mục hoặc module mới — tất cả file cần sửa đã tồn tại.

## Ranh giới với các spec khác

### Phụ thuộc vào `ai-fast-grading`

Feature này **gọi** nhưng **không sửa** các module sau (thuộc phạm vi `ai-fast-grading`):

- `backend/src/ai/grading.service.js` — hàm `gradeWriting()`
- `backend/src/ai/grading.validator.js` — validate 4 tiêu chí IELTS Writing
- `backend/src/ai/grading.prompt.js` — prompt template cho AI
- `backend/src/services/aiQuota.service.js` — quota 10 lượt/ngày
- `backend/src/ai/aiGrading.constants.js` — `REPORT_STATUS`

### Đầu ra cho các spec khác

Feature này **tạo ra dữ liệu** được tiêu thụ bởi:

- `feat-tutor-grading-workspace`: Bài nộp có `grader = 'tutor'` xuất hiện trong hàng đợi giáo viên.
- `feat-student-feedback-history`: Bài nộp và báo cáo AI hiển thị trong lịch sử học viên.

## Luồng dữ liệu chi tiết

### Luồng nộp bài Writing (as-built)

```text
WritingTestPage
  → collectWritingTasks (validate 2 tasks client-side)
  → gradingService.submitFullWriting (POST /writing/full)
  → authenticate middleware → req.user.id
  → SubmissionController.submitFullWriting
  → SubmissionService.submitFullWriting(userId, testId, grader, tasks)
    → normalizeWritingTasks: validate task_number {1,2}, no duplicate, non-empty
    → normalizeOptionalUuid(testId) → query mock_tests if provided
    → BEGIN transaction
      → insertWritingTask × 2 (cùng writing_group_id)
    → COMMIT
    → if grader === 'ai':
      → gradeWriting(task1) → saveCompletedAiReport / saveFailedAiReport
      → gradeWriting(task2) → saveCompletedAiReport / saveFailedAiReport
      → calcWeightedWritingOverall(task1Band, task2Band) [33%/67%]
    → UPDATE writing_submissions SET ai_status, overall_ai_band, status
  → Response: { writing_group_id, aiStatus, overallAiBand, tasks, aiResults }
```

### Luồng hiển thị kết quả

```text
WritingTestPage
  → onSubmitSuccess(response)
  → setSubmittedId(writing_group_id)
  → render FeedbackReport(submissionId, type='writing')
  → FeedbackReport gọi GET /:id/feedback?type=writing
```
