# Kế hoạch triển khai: Admin Phân công Giảng viên chấm bài (Admin Tutor Assignment)

**Ngữ cảnh Speckit**: `feat-admin-tutor-assignment` | **Ngày**: 2026-07-23 | **Đặc tả**: [spec.md](./spec.md)

**Đầu vào**: Đặc tả tính năng, mã nguồn as-built và schema cơ sở dữ liệu hiện có.

## Tóm tắt

Triển khai giao diện và API phân công Giảng viên phụ trách cho từng bài nộp tự luận: bao gồm API lấy danh sách bài nộp và danh sách tutor (`GET /api/v1/admin/tutor-assignments`), API cập nhật phân công (`PUT /api/v1/admin/tutor-assignments/:submissionId`), giao diện danh sách phân công Admin (`TutorAssignmentPage`), tự động cập nhật cột `assigned_tutor_id` trong database và ghi log `audit_logs` với action `'tutor_assigned'`.

## Bối cảnh kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js ≥20 (CommonJS backend); React 18 + JSX (frontend)

**Phụ thuộc chính**: Express 5.x, `pg` 8.x (raw SQL parameterized), React 18, Vite, Bootstrap 5.x, Axios

**Lưu trữ**: PostgreSQL 16 — bảng `writing_submissions`, `speaking_submissions`, `users`, `audit_logs`

**Kiểm thử**: Jest (backend), Vitest + Testing Library (frontend)

**Nền tảng đích**: React SPA + Express REST API

## Kiểm tra Constitution

| Điều khoản | Tuân thủ | Ghi chú |
|---|---|---|
| Article 1 — Tech Stack | ✅ | Node 20, Express 5, React 18, Vite, Bootstrap 5, `pg` raw SQL |
| Article 2 — Coding Standards | ✅ | PascalCase components, camelCase services, snake_case DB |
| Article 3 — API Format | ✅ | Envelope `{ success, data, error, meta }` |
| DB Access — No ORM | ✅ | Parameterized queries qua `pg` |
| Security & RBAC | ✅ | Middleware `authorize('admin')` bảo vệ 100% routes phân công |

## Cấu trúc dự án

### Mã nguồn (file liên quan)

```text
frontend/
├── src/
│   ├── pages/admin/
│   │   └── TutorAssignmentPage.jsx    # Trang Admin phân công giảng viên
│   └── services/
│       └── adminOps.service.js        # API calls fetchTutorAssignments, assignTutor

backend/
├── src/
│   ├── controllers/
│   │   └── adminTutor.controller.js   # Handlers getTutorAssignments, assignTutor
│   ├── services/
│   │   └── adminTutor.service.js      # Business logic getAssignmentData, assignSubmission
│   ├── db/queries/
│   │   └── tutorAssignment.queries.js # Parameterized SQL queries assignTutorToSubmission
│   └── routes/api/v1/
│       └── admin.routes.js            # GET /admin/tutor-assignments, PUT /admin/tutor-assignments/:submissionId
```

## Sơ đồ luồng xử lý chính

```text
TutorAssignmentPage (Admin SPA)
  → fetchTutorAssignments({ page, limit })
  → GET /api/v1/admin/tutor-assignments
  → authenticate & authorize('admin')
  → AdminTutorController.getTutorAssignments
  → AdminTutorService.getAssignmentData
    ├── queries.getTutors() (role = 'tutor')
    ├── queries.getPendingSubmissions()
    └── queries.getPendingSubmissionsCount()
  → Response: { success: true, data: { tutors, assignments }, meta }

Admin select Tutor from Dropdown
  → assignTutor(submissionId, type, tutorId)
  → PUT /api/v1/admin/tutor-assignments/:submissionId
  → authenticate & authorize('admin')
  → AdminTutorController.assignTutor
  → AdminTutorService.assignSubmission
    ├── verify submission & tutor role
    ├── queries.assignTutorToSubmission (UPDATE assigned_tutor_id)
    └── AuditLogService.logAction ('tutor_assigned')
  → Response: { success: true, data: updatedSubmission }
```
