# Implementation Plan: Library Management

**Branch**: `feat-library-management` | **Date**: 2026-07-27 | **Spec**: [SPEC.md](./spec.md)

**Input**: Feature specification from `/specs/feat-content-builder/feat-library-management/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cho phép Tutor/Admin tải các file âm thanh (Audio) và tài liệu đọc (PDF) lên hệ thống một cách an toàn để làm nguyên liệu tạo đề thi. Triển khai dựa trên `multer` (chế độ memoryStorage) và xác thực file bằng `file-type` kết hợp Supabase Storage.

## Technical Context

**Language/Version**: Node.js 20

**Primary Dependencies**: `multer`, `file-type`, `@supabase/supabase-js`, `pg`

**Storage**: PostgreSQL 16 (metadata), Supabase Storage bucket `ieltszone_library` (files)

**Testing**: Jest/Supertest (backend unit + endpoint contract), Vitest (frontend service/UI)

**Target Platform**: Web (React Frontend, Express Backend)

**Project Type**: web-service

**Performance Goals**: N/A

**Constraints**: Tối đa 200MB mỗi file (multer).

**Scale/Scope**: Quản lý file tập trung cho Tutor.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **DB Client**: PASS (Sử dụng `pg`, SQL parameterized `$1, $2`. KHÔNG dùng ORM).
- **Security (Magic Bytes)**: PASS (Sử dụng `file-type` kiểm tra buffer trước khi lưu trữ).
- **Secrets**: PASS (Sử dụng biến môi trường cho Supabase keys).

### Bảng `library_resources`
Lưu trữ meta-data của file.
- `id` (UUID, PK)
- `file_url` (VARCHAR, Not Null)
- `file_size_bytes` (INT, Not Null)
- `resource_type` (VARCHAR) - ENUM: 'audio', 'pdf', 'video', 'other'
- `category` (VARCHAR, Nullable)
- `uploaded_by` (UUID, FK -> users)
- `is_published` (BOOLEAN)
- `review_status` (VARCHAR) - ENUM: 'pending', 'approved', 'rejected'
- `created_at`, `updated_at` (TIMESTAMP).

## Project Structure

### Documentation (this feature)

```text
specs/feat-content-builder/feat-library-management/
├── spec.md              
├── plan.md              # This file
├── tasks.md             
└── checklist.md         
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   │   └── multer.js                  # Cấu hình giới hạn file upload (200MB)
│   ├── controllers/
│   │   └── library.controller.js      # Controller xử lý yêu cầu upload/quản lý file
│   ├── db/
│   │   └── queries/
│   │       └── library.queries.js     # Query Database lấy dữ liệu metadata file
│   ├── routes/
│   │   └── api/
│   │       └── v1/
│   │           └── library.routes.js  # Khai báo API endpoints public & protected
│   └── services/
│       └── library.service.js         # Core Service (Validate type, Supabase upload)
frontend/
└── src/
    ├── pages/
    │   └── tutor/
    │       ├── TutorLibraryPage.jsx           # Giao diện chính của Kho tài liệu
    │       ├── TutorLibraryManagementPage.jsx # Quản lý chi tiết danh sách tài liệu
    │       ├── TutorLibraryCreatePage.jsx     # Trang thêm mới tài liệu
    │       └── TutorLibraryEditPage.jsx       # Trang chỉnh sửa tài liệu hiện có
    └── components/
        └── library/
            ├── ResourceUploadModal.jsx        # Modal upload file mới lên Supabase
            ├── ResourceEditModal.jsx          # Modal chỉnh sửa metadata file
            ├── ResourceCard.jsx               # Thẻ hiển thị thông tin từng tài liệu
            └── DocumentForm.jsx               # Form nhập liệu chung (title, description)
```

**Structure Decision**: Tính năng thuộc backend Node.js, tận dụng kiến trúc controller - service - query có sẵn của hệ thống.

### Upload visibility decision

`GET /api/v1/library` là catalog công khai và chỉ trả về tài liệu `approved`.
Tutor/Admin dùng `GET /api/v1/library/mine` (và `/mine/:id`) để theo dõi tài liệu
đang `pending` hoặc `rejected`. File được xác thực bằng signature thực tế trước khi
đẩy lên bucket; lỗi DB sau upload sẽ dọn object vừa tạo để tránh orphan storage.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Dynamic Import | `file-type` v19 là ESM-only | Không thể dùng `require()` trong CommonJS. |
