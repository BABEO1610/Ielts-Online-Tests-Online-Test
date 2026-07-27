# Implementation Plan: Audit Dashboard (feat-audit-dashboard)

**Branch**: `feat-audit-dashboard` | **Date**: 2026-07-27 | **Spec**: [SPEC.md](./spec.md)

**Input**: Feature specification từ `/specs/feat-content-builder/feat-audit-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Hệ thống Audit Logging tập trung ở Backend. Ghi chép mọi thay đổi quan trọng và cho phép Admin truy xuất thông qua hai luồng: Activity Logs (giám sát hành động khả nghi) và Change Logs (lưu vết thay đổi dữ liệu kèm chức năng Hoàn tác/Undo an toàn).

## Technical Context

**Language/Version**: Node.js 20

**Primary Dependencies**: `pg`

**Storage**: PostgreSQL 16 (No ORM)

**Testing**: N/A

**Target Platform**: Web (React Frontend, Express Backend)

**Project Type**: web-service

**Performance Goals**: N/A

**Constraints**: Bảng logs sẽ phình to nhanh, dùng JSONB.

**Scale/Scope**: Giám sát log toàn hệ thống.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **DB Client**: PASS (Sử dụng `pg`, SQL parameterized).
- **Security (Undo Locking)**: PASS (Sử dụng `FOR UPDATE` trong transaction để chống Race Condition khi Undo).
- **Secrets**: PASS (IP logging tuân thủ quy chuẩn).

## Project Structure

### Documentation (this feature)

```text
specs/feat-content-builder/feat-audit-dashboard/
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
│   │   └── admin.controller.js        # Controller lấy dữ liệu log & undo
│   ├── db/
│   │   └── queries/
│   │       └── audit.queries.js       # Query Database lọc logs theo module
│   ├── routes/
│   │   └── api/
│   │       └── v1/
│   │           └── admin.routes.js    # Routing API cho Admin Dashboard
│   └── services/
│       ├── audit.service.js           # Core Audit Service (Thực thi undo transaction)
│       ├── content.service.js         # Tích hợp AuditLog (Duyệt đề thi, tài liệu)
│       └── test.service.js            # Tích hợp AuditLog (Tạo/sửa/xóa đề thi)
frontend/
└── src/
    └── pages/
        ├── AdminActivityLogPage.jsx   # Trang giám sát hoạt động hệ thống (Activity)
        └── AdminChangeLogPage.jsx     # Trang quản lý lịch sử chỉnh sửa (Change Logs & Undo)
```

**Structure Decision**: Cấu trúc Data tách biệt rõ ràng ở layer Service (`audit.service.js`) thành hai luồng Activity Logs và Change Logs. Hàm Undo thực thi logic Transaction khép kín.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Phân loại Action/Severity cứng | Logic tập trung ở Backend Service | Nếu query Database Join phức tạp sẽ chậm, map logic ở tầng Service JS giúp query DB nhanh hơn. |
