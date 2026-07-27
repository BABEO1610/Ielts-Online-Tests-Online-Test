# Implementation Plan: Exam Builder

**Branch**: `feat-exam-builder` | **Date**: 2026-07-27 | **Spec**: [SPEC.md](./spec.md)

**Input**: Feature specification từ `/specs/feat-content-builder/feat-exam-builder/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Công cụ soạn thảo đề thi động hỗ trợ lồng ghép nhiều tầng (Passage -> Block -> Question) bằng giải pháp Hard Delete + Bulk Insert trong Database Transaction (PostgreSQL raw query). Có validation trước khi xuất bản và tích hợp Audit Logging.

## Technical Context

**Language/Version**: Node.js 20

**Primary Dependencies**: `pg`

**Storage**: PostgreSQL 16 (No ORM)

**Testing**: N/A

**Target Platform**: Web (React Frontend, Express Backend)

**Project Type**: web-service

**Performance Goals**: N/A

**Constraints**: Bulk Insert phải hoàn tất nhanh (dưới 2s).

**Scale/Scope**: Soạn thảo hàng chục câu hỏi cùng lúc lồng nhau 3 tầng.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **DB Client**: PASS (Sử dụng `pg`, SQL parameterized `$1, $2`. KHÔNG dùng ORM).
- **Transaction**: PASS (`BEGIN`, `COMMIT`, `ROLLBACK` an toàn).
- **Audit Logging**: PASS (Tích hợp `AuditLogService`).

## Project Structure

### Documentation (this feature)

```text
specs/feat-content-builder/feat-exam-builder/
├── spec.md              
├── plan.md              # This file
├── tasks.md             
└── checklist.md         
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   └── testController.js          # Controller xử lý logic HTTP request
│   ├── routes/
│   │   └── api/
│   │       └── v1/
│   │           └── tests.js           # Khai báo các API endpoints (C/U/D, Take test)
│   └── services/
│       ├── test.service.js            # Core Service (Chứa raw SQL Transaction BEGIN/COMMIT)
│       └── audit.service.js           # Dependency: Gọi logAction khi tạo/sửa/xóa đề thi
frontend/
└── src/
    ├── services/
    │   └── test.service.js            # Frontend API client (gọi API backend C/U/D đề thi)
    ├── pages/
    │   └── tutor/
    │       ├── TutorTestManagePage.jsx      # Trang danh sách quản lý tất cả đề thi
    │       ├── TutorTestFormPage.jsx        # Trang Wrapper chung cho Form đề thi
    │       ├── TutorReadingFormPage.jsx     # Trang tạo/sửa đề thi Reading (Tutor)
    │       ├── TutorListeningFormPage.jsx   # Trang tạo/sửa đề thi Listening (Tutor)
    │       ├── TutorWritingFormPage.jsx     # Trang tạo/sửa đề thi Writing (Tutor)
    │       └── TutorSpeakingFormPage.jsx    # Trang tạo/sửa đề thi Speaking (Tutor)
    └── components/
        └── tutor/
            ├── BulkAddModal.jsx               # Modal hỗ trợ thêm nhiều câu hỏi cùng lúc (Bulk Insert)
            └── reading/
                ├── SmartModeBlockEditor.jsx   # Component nhập liệu thông minh (tự sinh HTML)
                ├── QuestionBlockEditor.jsx    # Component quản lý Block câu hỏi (nhóm câu hỏi)
                └── ReadingTestPreviewModal.jsx # Modal xem trước đề thi (Preview)
```

**Structure Decision**: Tính năng thuộc backend Node.js. Logic Transaction vô cùng phức tạp được nhúng trực tiếp vào layer service (`test.service.js`) thay vì tách riêng query files để dùng chung 1 kết nối `client.query`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Viết Raw SQL trong Service thay vì DB layer riêng | Tối ưu Transaction Client | Cần giữ chung kết nối `client = await pool.connect()` xuyên suốt nhiều bảng liên tiếp. |
