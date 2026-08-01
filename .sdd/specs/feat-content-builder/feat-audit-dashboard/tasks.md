---
description: "Task list for Audit Dashboard"
---

# Tasks: Audit Dashboard (feat-audit-dashboard)

**Input**: Design documents from `spec.md` and `plan.md`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Database Setup

**Purpose**: Khởi tạo cấu trúc

- [ ] T001 [P] Tạo DB schema bảng `audit_logs` (dùng cột `JSONB` cho `old_value` và `new_value`, bổ sung `actor_id`, `target_table`, `can_undo`, `undone_at`).

---

## Phase 2: Core Service (Backend)

**Purpose**: Xây dựng service trung tâm `audit.service.js`

- [ ] T002 Tạo file `audit.queries.js` chứa các lệnh SQL (`insertAuditLog`, `listAuditLogs`, `getAuditLogById`, `markAuditLogUndone`, `getAuditLogSummary`, `getActivityLogStats`).
- [ ] T003 [US1] Viết hàm `listActivityLogs` xử lý logic tính toán mức độ nghiêm trọng (`severity`: 'normal' / 'suspicious') dựa trên mảng `SUSPICIOUS_ACTIONS`.
- [ ] T004 [US2] Viết hàm `listChangeLogs` và `getChangeLogDetail` cho phép xem chi tiết `old_value` và `new_value`.
- [ ] T005 [US2] Viết hàm `undoChangeLog` xử lý Transaction: Kiểm tra `can_undo`, khóa row `FOR UPDATE`, so sánh `expectedCurrentValue` từ `buildUserUndoPlan`, update user, lưu log `change_reverted`.

---

## Phase 3: Cross-Service Integration (Nhúng log)

**Purpose**: Đưa bộ log đi khắp hệ thống (đã implement trong source code)

- [x] T006 [P] Nhúng `logAction` vào `test.service.js` (C/U/D đề thi).
  - `test_created`: `old=null`, `new={title,skill}`, `ip=null` (best-effort, ngoài transaction)
  - `test_updated`: `old=null`, `new={title,skill}`, `ip=null` (best-effort, ngoài transaction)
  - `test_deleted`: `old={title,skill}`, `new=null`, `ip=null` (best-effort, ngoài transaction)
- [x] T009 [P] Nhúng `logAction` vào `content.service.js` (duyệt đề thi, duyệt tài liệu).
  - `test_reviewed`: `old=null`, `new={review_status}`, `ip=req.ip` ✅ (best-effort)
  - `resource_reviewed`: `old=null`, `new={review_status}`, `ip=req.ip` ✅ (best-effort)

---

## Phase 4: Admin API & Routes

**Purpose**: Phơi API cho Client

- [ ] T012 Đấu nối API `GET /api/v1/admin/activity-logs` (và alias `/audit-logs`) cùng với API thống kê `GET /api/v1/admin/activity-logs/stats`.
- [ ] T013 Đấu nối API `GET /api/v1/admin/change-logs`, `GET /api/v1/admin/change-logs/:id` và `POST /api/v1/admin/change-logs/:id/undo`.
- [ ] T014 Đảm bảo toàn bộ endpoint được bảo vệ bởi middleware `authenticate` và `authorize(['admin'])`.

---

## Phase 5: Frontend UI

**Purpose**: Hiển thị bảng điều khiển

- [ ] T015 [US1] Dựng UI `AdminActivityLogPage.jsx` có ô search/dropdown filter theo `severity` ('suspicious' / 'normal').
- [ ] T016 [US2] Dựng UI `AdminChangeLogPage.jsx` để xem chi tiết log thay đổi, hỗ trợ nút "Undo".
