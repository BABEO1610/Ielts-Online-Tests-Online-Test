# Implementation Plan: CMS & Exam Builder (feat-content-builder)

**Branch**: `feat-content-builder` | **Date**: 2026-07-24 | **Spec**: [SPEC.md](./SPEC.md)

**Input**: Feature specification from `/specs/feat-content-builder/SPEC.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Module CMS & Exam Builder cung cấp cơ sở hạ tầng lưu trữ tài liệu an toàn (Library) và công cụ soạn thảo đề thi động (Exam Builder). Điểm nhấn kỹ thuật của module là cơ chế Bulk Insert và Update đề thi sử dụng chiến lược **Hard Delete & Re-insert** trong một Database Transaction duy nhất, đảm bảo tính nguyên tử (Atomicity) và tốc độ xử lý ưu việt.

## Technical Context

**Language/Version**: Node.js 20, React 18

**Primary Dependencies**: `multer`, `file-type`, PostgreSQL (`pg`), Express, `express-validator`

**Storage**: Supabase Storage, PostgreSQL

**Testing**: Jest, Supertest

**Target Platform**: Web Browser (Desktop/Tablet)

**Project Type**: web-service

**Performance Goals**: Bulk Insert/Update 40 câu hỏi < 2000ms

**Constraints**: Bảo mật file upload bằng Magic Bytes validation

**Scale/Scope**: Hàng ngàn file audio/pdf, hàng trăm đề thi, hàng vạn câu hỏi

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **No ORM**: Toàn bộ code dùng thuần `pg` (parameterized queries `$1, $2`).
- [x] **Error Handling**: Tuân thủ middleware tập trung `errorHandler.js`.
- [x] **API Format**: Response chuẩn `{ success, data, error, meta }`.
- [x] **Auth**: Phân quyền hệ thống sử dụng `authenticate.js` và `authorize(['tutor','admin'])`.
- [x] **Lazy/Ponytail**: Thiết kế theo nguyên tắc tối giản (Boring over clever). Lựa chọn chiến lược Update đề thi bằng Hard Delete thay vì Deep Clone là một ví dụ rõ rệt của nguyên lý *Lazy senior dev*: chọn phương án đơn giản, ít file nhất, xử lý nhanh gọn mà vẫn đáp ứng nhu cầu thay thế nội dung, không bôi vẽ thêm bảng/schema phức tạp.

## Project Structure

### Documentation (this feature)

```text
.sdd/specs/feat-content-builder/
├── SPEC.md              # Feature specification
├── PLAN.md              # This file (/speckit-plan command output)
├── TASKS.md             # Phase 2 output (/speckit-tasks command)
└── CHECKLIST.md         # Custom checklist
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   ├── library.controller.js
│   │   ├── testController.js
│   │   └── adminContent.controller.js
│   ├── services/
│   │   ├── library.service.js
│   │   ├── test.service.js
│   │   ├── content.service.js
│   │   └── audit.service.js
│   ├── db/queries/
│   │   ├── library.queries.js
│   │   ├── content.queries.js
│   │   └── audit.queries.js
│   ├── routes/api/v1/
│   │   ├── library.routes.js
│   │   ├── tests.js
│   │   └── admin.routes.js
│   └── middleware/
│       ├── authenticate.js
│       └── authorize.js
└── tests/

frontend/
├── src/
│   ├── pages/tutor/
│   │   ├── TutorLibraryPage.jsx
│   │   ├── TutorTestManagePage.jsx
│   │   └── ... (form pages)
│   ├── pages/admin/
│   │   └── ContentReviewPage.jsx
│   ├── hooks/
│   │   └── useLibrary.js
│   └── components/library/
│       └── ResourceUploadModal.jsx
└── tests/
```

**Structure Decision**: Sử dụng Option 2 (Web application).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
|           |            |                                     |
