# Kế hoạch triển khai: Luồng thi và nộp bài Speaking 3 Parts

**Ngữ cảnh Speckit**: `feat-speaking-test-flow` | **Ngày**: 2026-07-23 | **Đặc tả**: [spec.md](./spec.md)

**Đầu vào**: Đặc tả tính năng, mã nguồn as-built và schema cơ sở dữ liệu hiện có.

## Tóm tắt

Triển khai luồng thi Speaking 3 Parts hoàn chỉnh cho học viên: Quản lý trạng thái thi (Intro → Part 1 → Part 2 → Part 3 → Summary → Result), thu âm và tải lên kho lưu trữ tạm thời (`speaking/{userId}/`), nộp bài trọn bộ 3 Parts qua DB Transaction với `speaking_group_id`, phân luồng `grader` (AI hoặc Giáo viên) và hiển thị thông báo hoàn thành. Dịch vụ chấm AI Speaking bên trong thuộc về `ai-fast-grading`.

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js ≥20 (CommonJS backend); React 18 + JSX (frontend)

**Phụ thuộc chính**: Express 5.x, `pg` 8.x (raw SQL parameterized), Supabase Storage / S3 Adapter, Multer, React 18, Vite, Bootstrap 5.x, Axios

**Lưu trữ**: PostgreSQL 16 — bảng `speaking_submissions`, `ai_grading_reports`, `mock_tests`, Kho chứa Audio Storage

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
| Audio Privacy | ✅ | File lưu dưới `speaking/{userId}/`, xác minh sở hữu path |

## Cấu trúc dự án

### Tài liệu (feature này)

```text
.sdd/specs/feat-speaking-test-flow/
├── spec.md           # Đặc tả tính năng
├── plan.md           # File này
├── tasks.md          # Danh sách công việc
└── checklist.md      # Kiểm định chất lượng yêu cầu
```

### Mã nguồn (file liên quan)

```text
frontend/
├── src/
│   ├── pages/subjective-testing/
│   │   ├── SpeakingPage.jsx           # Trang danh sách đề Speaking
│   │   └── SpeakingTestPage.jsx       # Trang thi Speaking (State Machine 3 Parts)
│   ├── components/grading/
│   │   ├── ExamRecorder.jsx           # Component thu âm và upload
│   │   ├── SpeakingIntroScreen.jsx    # Màn hình bắt đầu & micro test
│   │   ├── Part2Screen.jsx            # Màn hình Part 2 (Cue Card & Prep timer)
│   │   ├── SpeakingSummaryScreen.jsx  # Màn hình nộp bài & chọn Grader
│   │   └── SpeakingProgressBar.jsx    # Thanh tiến trình Part
│   └── services/
│       └── grading.service.js         # API calls: uploadAudio, submitFullSpeaking

backend/
├── src/
│   ├── controllers/
│   │   └── submission.controller.js   # uploadSpeakingAudio, submitFullSpeaking
│   ├── services/
│   │   ├── submission.service.js      # submitFullSpeaking business logic & validation
│   │   └── speakingAiGrading.service.js # Tích hợp gọi AI Speaking (từ ai-fast-grading)
│   ├── routes/api/v1/
│   │   └── submissions.routes.js      # POST /speaking/upload, POST /speaking/full
│   ├── middleware/
│   │   ├── authenticate.js            # req.user.id
│   │   └── upload.middleware.js       # Multer audio handler
│   └── config/
│       └── supabase.js                # Supabase storage client
```

**Quyết định cấu trúc**: Sử dụng cấu trúc web app hiện có (frontend/ + backend/). Không tạo thư mục mới.

## Ranh giới với các spec khác

### Phụ thuộc vào `ai-fast-grading`

Feature này **gọi** nhưng **không sửa** các module sau (thuộc phạm vi `ai-fast-grading`):

- `backend/src/services/speakingAiGrading.service.js` — hàm `gradeSpeakingGroup()`
- `backend/src/ai/speakingGrading.prompt.js` — prompt template Speaking
- `backend/src/ai/speakingGrading.validator.js` — validate 4 tiêu chí Speaking (FC, LR, GRA, Pronunciation)
- `backend/src/storage/objectStorage.adapter.js` — storage adapter

### Đầu ra cho các spec khác

Feature này **tạo ra dữ liệu** được tiêu thụ bởi:

- `feat-tutor-grading-workspace`: Bài nộp Speaking có `grader = 'tutor'` xuất hiện trong hàng đợi Tutor Queue (`v_tutor_grading_queue`).
- `feat-student-feedback-history`: Bài nộp Speaking và kết quả AI/Tutor hiển thị trong trang lịch sử học viên.

## Luồng dữ liệu chi tiết

### 1. Luồng Upload Audio tạm thời

```text
ExamRecorder (WebRTC/MediaRecorder Blob)
  → gradingService.uploadAudio (FormData: audio_file)
  → POST /api/v1/submissions/speaking/upload
  → uploadMiddleware (Multer in-memory/disk buffer)
  → SubmissionController.uploadSpeakingAudio
  → Validate mimeType & generate storagePath: speaking/{userId}/{uuid}.webm
  → Upload buffer to Supabase/S3 Storage
  → Response: { temp_s3_key: "speaking/{userId}/{uuid}.webm", audio_url }
```

### 2. Luồng Nộp bài Full 3 Parts

```text
SpeakingSummaryScreen
  → Select grader ('ai' or 'tutor')
  → gradingService.submitFullSpeaking({ test_id, grader, parts })
  → POST /api/v1/submissions/speaking/full
  → authenticate middleware → req.user.id
  → SubmissionController.submitFullSpeaking
  → SubmissionService.submitFullSpeaking(userId, testId, grader, parts)
    → Validate parts.length === 3
    → Validate grader in ['ai', 'tutor']
    → Validate optional test_id
    → Verify storagePath.startsWith(`speaking/${userId}/`) & no '..'
    → BEGIN transaction
      → INSERT INTO speaking_submissions × 3 (cùng speaking_group_id)
    → COMMIT
    → if grader === 'ai':
      → gradeSpeakingGroup(speakingGroupId)
      → UPDATE speaking_submissions SET status = 'ai_graded' WHERE speaking_group_id
  → Response: { speaking_group_id, aiStatus, overallAiBand, parts, aiReports }
```
