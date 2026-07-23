# Implementation Plan: CMS & Exam Builder (feat-content-builder)

**Branch**: `feat-content-builder` | **Date**: 2026-07-23 | **Spec**: `SPEC.md`

## Summary

Tính năng CMS & Exam Builder là cốt lõi để Tutor sản xuất và quản lý nội dung. Kế hoạch này mô tả cách triển khai Kho tài nguyên (Media Storage) bảo mật và Trình tạo đề thi (Exam Framework) hỗ trợ Data Versioning, đảm bảo tính toàn vẹn dữ liệu điểm số của học viên.

## Technical Context

**Language/Version**: Node.js 20, React 18
**Primary Dependencies**: `multer` (Upload), `file-type` (Security check MIME type), PostgreSQL (`pg`), Express.
**Storage**: PostgreSQL (Metadata), Local Disk/Supabase (Binary Files).
**Testing**: Jest, Supertest.
**Target Platform**: Web Browser (Desktop/Tablet).
**Project Type**: Web application (Frontend + Backend).
**Performance Goals**: API Bulk Insert 40 câu hỏi < 2000ms.
**Constraints**: Bảo mật khắt khe file upload, không overwrite data lịch sử.

## Project Structure

### Documentation (this feature)

```text
.sdd/specs/feat-content-builder/
├── PLAN.md              
├── SPEC.md
└── TASKS.md 
```

### Source Code

```text
# Option 2: Web application
backend/
├── src/
│   ├── db/
│   │   ├── queries/contentBuilder.queries.js
│   │   └── queries/library.queries.js
│   ├── services/
│   │   ├── examBuilder.service.js (Chứa thuật toán Versioning)
│   │   └── library.service.js
│   └── api/
│       ├── examBuilder.routes.js
│       └── library.routes.js
└── tests/
    └── integration/

frontend/
├── src/
│   ├── components/
│   │   └── admin/
│   │       ├── DynamicQuestionForm.jsx
│   │       ├── MediaUploader.jsx
│   │       └── VersionHistoryBadge.jsx
│   ├── pages/
│   │   ├── admin/ExamBuilderPage.jsx
│   │   ├── admin/MediaLibraryPage.jsx
│   │   └── admin/AuditDashboardPage.jsx
│   └── hooks/
│       └── useExamBuilder.js
└── tests/
```

**Structure Decision**: Tuân thủ chuẩn kiến trúc của dự án. Tách biệt rõ ràng phần xử lý thư viện file (`library`) và phần xử lý logic đề thi (`examBuilder`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Deep Clone Versioning (Tạo bản ghi mới thay vì Update đè) | Bảo toàn lịch sử điểm của học viên | Hard-delete hoặc Update đè sẽ làm hỏng dữ liệu điểm của những người đã thi. Nếu câu hỏi bị sửa, bảng điểm trỏ về câu hỏi cũ sẽ bị vô lý. |
| Bulk Insert cho toàn bộ câu hỏi | Đảm bảo Data Consistency và UX | Bắt người dùng lưu từng câu hỏi một qua API sẽ tạo ra hàng chục request, gây chậm và dễ dẫn đến dữ liệu rác nếu rớt mạng giữa chừng. |
