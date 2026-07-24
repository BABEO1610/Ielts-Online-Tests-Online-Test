# Kế hoạch triển khai: Không gian chấm bài dành cho Giáo viên (Tutor Grading Workspace)

**Ngữ cảnh Speckit**: `feat-tutor-grading-workspace` | **Ngày**: 2026-07-23 | **Đặc tả**: [spec.md](./spec.md)

**Đầu vào**: Đặc tả tính năng, mã nguồn as-built và schema cơ sở dữ liệu hiện có.

## Tóm tắt

Triển khai Không gian làm việc cho Giáo viên (Tutor Workspace) gồm: Hàng đợi bài nộp chờ chấm (Tutor Queue), Cơ chế nhận bài khóa nguyên tử (Atomic Lock Claim), Giao diện chấm bài chi tiết Writing & Speaking, Trợ lý gợi ý nháp AI (AI Prelim Assist), Lưu báo cáo chấm điểm độc lập vào `tutor_feedback_reports`, Quản lý lịch sử chấm bài (Grading History & Revoke), và Danh sách tham khảo AI (AI Reference List).

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js ≥20 (CommonJS backend); React 18 + JSX (frontend)

**Phụ thuộc chính**: Express 5.x, `pg` 8.x (raw SQL parameterized), React 18, Vite, Bootstrap 5.x, Axios, Socket.io

**Lưu trữ**: PostgreSQL 16 — bảng `tutor_feedback_reports`, `writing_submissions`, `speaking_submissions`, `audit_logs`, View `v_tutor_grading_queue`

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
| Security & Auth | ✅ | Middleware `authenticate` & `authorize(['tutor', 'admin'])`, check `assigned_tutor_id` |
| Separation of Scores | ✅ | Điểm Tutor lưu `tutor_feedback_reports`, không ghi đè `overall_ai_band` |

## Cấu trúc dự án

### Tài liệu (feature này)

```text
.sdd/specs/feat-subjective-grading/feat-tutor-grading-workspace/
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
│   │   ├── TutorQueuePage.jsx           # Hàng đợi bài chờ chấm (/tutor/queue)
│   │   ├── TutorGradingPage.jsx         # Màn hình chấm bài Writing & Speaking
│   │   ├── TutorGradingHistoryPage.jsx  # Lịch sử bài đã chấm & thu hồi
│   │   ├── TutorAiReferencePage.jsx     # Danh sách tham khảo AI
│   │   └── TutorAiReferenceDetailPage.jsx # Chi tiết tham khảo AI
│   ├── components/grading/
│   │   ├── TutorQueue.jsx               # Component danh sách hàng đợi
│   │   └── TutorGradingPanel.jsx        # Form nhập điểm 4 tiêu chí & nhận xét
│   └── services/
│       ├── grading.service.js           # API calls Tutor Queue, Detail, Grade, AI Prelim
│       └── gradingHistory.service.js    # API calls History & Revoke

backend/
├── src/
│   ├── controllers/
│   ├── tutor.controller.js              # Controller xử lý 14 API Tutor
│   ├── services/
│   │   ├── tutor.service.js             # Business logic Tutor Queue, Claim, Grade, History
│   │   └── audit.service.js             # Ghi log audit hoạt động Tutor
│   ├── routes/api/v1/
│   │   └── tutors.routes.js             # 14 Routes API Tutor với authorize(['tutor', 'admin'])
│   └── middleware/
│       ├── authenticate.js              # req.user.id
│       └── authorize.js                 # Role guard ['tutor', 'admin']
```

**Quyết định cấu trúc**: Sử dụng cấu trúc web app hiện có (frontend/ + backend/). Không tạo thư mục mới.

## Các API Endpoints chính

| Method | Endpoint | Mục đích | Phân quyền |
|---|---|---|---|
| `GET` | `/api/v1/tutors/queue` | Lấy danh sách hàng đợi bài chờ chấm | `tutor`, `admin` |
| `GET` | `/api/v1/tutors/submissions/:type/:submissionId` | Lấy chi tiết bài nộp để chấm | `tutor`, `admin` |
| `POST` | `/api/v1/tutors/submissions/:type/:submissionId/grade` | Nộp điểm và nhận xét của Tutor | `tutor` |
| `POST` | `/api/v1/tutors/submissions/:type/:submissionId/ai-prelim` | Lấy gợi ý bản nháp từ AI | `tutor`, `admin` |
| `POST` | `/api/v1/tutors/submissions/speaking/:partId/transcribe` | Tạo transcript âm thanh Speaking | `tutor`, `admin` |
| `GET` | `/api/v1/tutors/grading-history` | Xem lịch sử các bài đã chấm | `tutor`, `admin` |
| `PATCH` | `/api/v1/tutors/grading-history/:submissionId/revoke` | Thu hồi (soft-delete) kết quả | `tutor`, `admin` |
| `PATCH` | `/api/v1/tutors/grading-history/:submissionId/score` | Cập nhật lại điểm đã chấm | `tutor`, `admin` |
| `GET` | `/api/v1/tutors/ai-reference` | Xem danh sách bài AI chấm tham khảo | `tutor`, `admin` |

## Sơ đồ luồng xử lý chính

### Luồng Chấm bài và Lưu điểm (Grade Submission Flow)

```text
TutorGradingPage
  → Nhập điểm 4 tiêu chí + Written feedback
  → (Tùy chọn) Bấm AI Prelim → POST /submissions/:type/:id/ai-prelim (Điền bản nháp)
  → Bấm "Lưu kết quả" → POST /submissions/:type/:id/grade
  → authenticate & authorize(['tutor'])
  → TutorController.gradeSubmission
  → TutorService.gradeSubmission (BEGIN Transaction)
    → Verify assigned_tutor_id === req.user.id
    → INSERT INTO tutor_feedback_reports
    → UPDATE writing_submissions / speaking_submissions SET tutor_status = 'completed', overall_tutor_band = $band, status = 'tutor_graded'
    → AuditLogService.logAction ('GRADE_SUBMISSION')
    → COMMIT Transaction
  → Emit Socket.io 'grading_completed' tới studentId
  → Response: { success: true, data: { message: 'Grade submitted successfully' } }
```
