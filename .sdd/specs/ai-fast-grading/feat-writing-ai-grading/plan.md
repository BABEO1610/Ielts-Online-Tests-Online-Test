# Kế hoạch triển khai: Chấm nhanh Writing bằng AI

**Đặc tả**: [spec.md](./spec.md)  
**Công việc**: [tasks.md](./tasks.md)  
**Checklist chất lượng**: [checklist.md](./checklist.md)

## Tóm tắt

Giữ nguyên modular monolith và luồng Writing đang chạy: frontend nộp trọn hai Task, backend validate/idempotency/quota rồi commit hai submission cùng root job; sau response, API process gọi `processWritingTasksAsync()` để chấm tuần tự từng Task, lưu report và tổng hợp band 1/3–2/3. Không mô tả Writing như dùng durable worker của Speaking vì code hiện tại chưa làm vậy.

## Bối cảnh kỹ thuật

- **Backend**: Node.js 20, Express 5, CommonJS, PostgreSQL qua `pg`, không ORM.
- **Frontend**: React 18, Vite, Bootstrap 5, Axios service wrapper.
- **AI gateway**: `backend/src/ai/grading.service.js` với Gemini qua gateway dùng chung.
- **Realtime**: Socket.IO phát `grading_complete` hoặc `grading_failed`.
- **Kiểm thử**: Jest/Supertest backend; Vitest/Testing Library frontend.

## Kiểm tra Constitution

- SQL dùng tham số và transaction; UUID làm khóa group/submission.
- API dùng kebab-case path và envelope chuẩn.
- Provider call đi qua AI grading gateway, được validate trước khi lưu.
- Automated test dùng fake/mock provider, không gọi Internet thật.
- Nội dung bài và raw response không được ghi vào log vận hành.

## Ranh giới module

| Thuộc module này | Thuộc module khác |
|---|---|
| Validation full Writing, idempotency, quota | UI làm bài: `feat-writing-test-flow` |
| Chấm từng Task, report, Overall AI band | Tutor workflow và admin oversight |
| Trạng thái AI, history/feedback projection | Speaking audio/evidence/worker |

## Luồng code hiện tại *(as-built)*

```text
WritingTestPage
  → gradingService.submitFullWriting()
  → POST /api/v1/submissions/writing/full + Idempotency-Key
  → SubmissionController.submitFullWriting()
  → SubmissionService.submitFullWriting()
      1. validate grader, Task set, word threshold và test_id
      2. replay/fingerprint check
      3. transaction: reserve quota + root ai_grading_job + 2 writing_submissions
      4. commit và gọi processWritingTasksAsync() không chờ
  → HTTP 201 với writing_group_id
  → gradeWriting(Task 1), gradeWriting(Task 2)
  → validate + save ai_grading_reports
  → tính Overall = Task 1 × 1/3 + Task 2 × 2/3
  → update cả group và phát Socket.IO event
  → FeedbackReport/history đọc kết quả từ database
```

### Điểm cần hiểu đúng

- Root record trong `ai_grading_jobs` đang phục vụ quota/idempotency/status projection cho Writing.
- `AiGradingWorker` chỉ claim `submission_type='speaking'`; Writing chấm bằng tác vụ nền trong API process.
- Nếu process chết sau commit, Writing chưa có watchdog/lease recovery tương đương Speaking. Việc bền vững hóa là ngoài phạm vi split tài liệu này.

## Hợp đồng API

| Method | Path | Vai trò | Hành vi chính |
|---|---|---|---|
| `POST` | `/api/v1/submissions/writing/full` | student | Nộp Task 1+2; AI cần `Idempotency-Key`; trả `writing_group_id` |
| `POST` | `/api/v1/submissions/writing/:submissionId/ai-grade` | student | Entry point chấm lại một submission hiện có theo policy legacy |
| `GET` | `/api/v1/submissions/:id/feedback` | authenticated | Đọc feedback theo scope owner/role |
| `GET` | `/api/v1/submissions/history` | authenticated | Đọc lịch sử group Writing/Speaking |

Response thành công và lỗi phải giữ bốn trường `{ success, data, error, meta }`. `POST /writing` hiện chủ động trả `WRITING_FULL_SUBMISSION_REQUIRED` và không còn là entry point hợp lệ cho bài mới.

## Mô hình dữ liệu

### `writing_submissions`

- Hai dòng cho một `writing_group_id`, phân biệt bằng `task_number` 1/2.
- Các trường quan trọng: `response_text`, `word_count`, `grader`, `status`, `ai_status`, `overall_ai_band`.
- Cập nhật status áp dụng cho toàn group sau khi hai Task xử lý xong.

### `ai_grading_jobs`

- Root job `submission_type='writing'` khóa idempotency/fingerprint và tính original quota.
- Job được cập nhật `completed|failed` bởi `processWritingTasksAsync`; không được worker Speaking claim.

### `ai_grading_reports`

- Một report trên từng submission/Task, chứa criteria/feedback đã normalize, `computed_band`, model và prompt version.
- Report lỗi không được giả lập band thành công.

### `ai_usage_logs`

- Ghi feature/provider/model/token/latency/diagnostic đã sanitize; không ghi nội dung bài hoặc secret.

## Trạng thái

```text
pending
  ├─ cả hai Task thành công → ai_status=completed → status=ai_graded
  └─ bất kỳ Task thất bại  → ai_status=failed    → status=pending, overall_ai_band=null
```

Trạng thái `pending` sau lỗi là hành vi code hiện tại; frontend phải dựa thêm vào `ai_status`/report để không hiển thị như đang chạy vô hạn.

## Cấu trúc mã nguồn liên quan

```text
backend/src/
├── routes/api/v1/submissions.routes.js
├── controllers/
│   ├── submission.controller.js
│   └── aiGrading.controller.js
├── services/
│   ├── submission.service.js
│   ├── aiQuota.service.js
│   └── aiUsage.service.js
├── ai/
│   ├── grading.service.js
│   ├── grading.prompt.js
│   └── grading.validator.js
└── db/migrations/
    ├── 020_add_ai_grading_columns.sql
    ├── 021_writing_group_feedback_refactor.sql
    ├── 022_create_ai_usage_logs.sql
    └── 025_harden_ai_grading_schema.sql

frontend/src/
├── pages/subjective-testing/WritingTestPage.jsx
├── services/grading.service.js
└── components/grading/FeedbackReport.jsx
```

## Chiến lược kiểm thử

- Unit: word threshold, sanitizer, response validator, scoring 1/3–2/3, quota/replay.
- Integration: full submit, transaction, idempotency conflict, provider success/failure, feedback projection.
- Frontend: double-submit guard, lựa chọn grader, Overall/Task detail và lỗi an toàn.
- Release gate: targeted lint/build/test và coverage ≥80% cho business logic mới.

## Khoảng trống đã xác nhận

1. Error envelope cho bài dưới ngưỡng chưa đặt `word_count`/`required_words` đúng trong `error.details` và `request_id` đúng trong `meta`.
2. `FeedbackReport.jsx` chưa hiển thị lại Overall Writing Band theo trọng số 33%/67% trong regression hiện hành.
3. Xử lý nền Writing chưa bền vững qua API process restart; chỉ lập kế hoạch chuyển worker nếu phạm vi được duyệt riêng.

## Quyết định artifact

Module giữ bốn artifact lõi `spec.md`, `plan.md`, `tasks.md`, `checklist.md`. Research, data model, quickstart và contract dạng prose đã được cô đọng vào `plan.md`; không tạo file phụ rỗng chỉ để đủ tên.
