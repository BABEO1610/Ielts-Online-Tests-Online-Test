# Kế hoạch triển khai: Luồng Chấm điểm Tự động bằng AI (AI Evaluation & Grading Integration)

**Ngữ cảnh Speckit**: `feat-ai-grading-integration` | **Ngày**: 2026-07-23 | **Đặc tả**: [spec.md](./spec.md)

**Đầu vào**: Đặc tả tính năng, mã nguồn as-built và schema cơ sở dữ liệu hiện có.

## Tóm tắt

Triển khai tích hợp luồng xử lý và chấm điểm AI tự động cho bài thi Writing & Speaking: bao gồm API yêu cầu chấm lại AI (`POST /api/v1/submissions/writing/:submissionId/ai-grade`), kiểm tra số từ tối thiểu, kiểm tra Idempotency (Cached Result), gọi dịch vụ `gradeWriting` / `gradeSpeakingGroup`, validate 4 tiêu chí IELTS, tính điểm Band tổng hợp trọng số, lưu `ai_grading_reports`, ghi nhật ký `ai_usage_logs` và phát sự kiện Socket.io.

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js ≥20 (CommonJS backend); React 18 + JSX (frontend)

**Phụ thuộc chính**: Express 5.x, `pg` 8.x (raw SQL parameterized), Socket.io, LLM Provider Wrapper (`backend/src/ai/grading.service.js`)

**Lưu trữ**: PostgreSQL 16 — bảng `writing_submissions`, `speaking_submissions`, `ai_grading_reports`, `ai_usage_logs`

**Kiểm thử**: Jest (backend), Vitest + Testing Library (frontend)

## Kiểm tra Constitution

| Điều khoản | Tuân thủ | Ghi chú |
|---|---|---|
| Article 1 — Tech Stack | ✅ | Node 20, Express 5, React 18, `pg` raw SQL |
| Article 2 — Coding Standards | ✅ | camelCase services, snake_case DB, error handling tập trung |
| Article 3 — API Format | ✅ | Envelope `{ success, data, error, meta }` |
| DB Access — No ORM | ✅ | Parameterized queries qua `pg` |
| Security & Ownership | ✅ | Verification `sub.user_id === req.user.id` và `sub.grader === 'ai'` |

## Cấu trúc dự án

### Mã nguồn (file liên quan)

```text
backend/
├── src/
│   ├── controllers/
│   │   └── aiGrading.controller.js      # Handlers requestAiGrade, saveGradingResult, handleGradingError
│   ├── services/
│   │   ├── submission.service.js        # Trigger AI grading post-submission
│   │   ├── speakingAiGrading.service.js # Wrapper gradeSpeakingGroup & gradeSpeakingSession
│   │   └── aiUsage.service.js           # Logger logUsage
│   ├── ai/
│   │   ├── grading.service.js           # Core gradeWriting logic & countWords
│   │   ├── grading.validator.js         # Validate 4 Writing criteria & band rounding
│   │   ├── speakingGrading.validator.js # Validate 4 Speaking criteria & band rounding
│   │   └── aiGrading.constants.js       # Constants WORD_COUNT_THRESHOLDS, REPORT_STATUS
│   └── routes/api/v1/
│       └── submissions.routes.js        # POST /writing/:submissionId/ai-grade
```

## Sơ đồ luồng xử lý chính

```text
Student Request (POST /submissions/writing/:submissionId/ai-grade)
  → authenticate middleware -> req.user.id
  → AiGradingController.requestAiGrade
        ├── 1. fetchAndValidateSubmission (Verify user_id & grader === 'ai')
        ├── 2. findExistingReport -> If cached, return cached result (Idempotency)
        ├── 3. countWords -> If under threshold (Task 1 < 50, Task 2 < 100), return AIGRADE_001
        ├── 4. gradeWriting(submission, taskType) -> Call LLM Provider & Validate 4 criteria
        ├── 5. BEGIN DB Transaction
        │     ├── insertAiReport into ai_grading_reports
        │     ├── UPDATE writing_submissions SET ai_status='completed', overall_ai_band
        │     └── updateWritingGroupAiState (Compute weighted band 33% / 67%)
        ├── 6. COMMIT DB Transaction
        ├── 7. emitGradingCompleted via Socket.io
        └── 8. Return Envelope: { success: true, data: report, meta: { request_id } }

On Failure:
  ├── ROLLBACK DB Transaction
  ├── insertAiReport with status='failed' & error_message
  ├── UPDATE writing_submissions SET ai_status='failed', status='pending'
  └── emitGradingFailed via Socket.io
```
