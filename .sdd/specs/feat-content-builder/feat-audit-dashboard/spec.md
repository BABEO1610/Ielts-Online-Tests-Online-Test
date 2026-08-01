# Feature Specification: Audit Dashboard (feat-audit-dashboard)

**Feature Branch**: `feat-audit-dashboard`

**Created**: 2026-07-27

**Status**: Final

**Input**: User description: "Admin xem log chỉnh sửa, xóa đề thi"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Giám sát Hệ thống & Activity Log (Priority: P1)

Là một Admin, tôi muốn xem được lịch sử (log) hoạt động tổng quan (Activity Logs) của mọi thao tác trong hệ thống (như đăng nhập, tạo tài nguyên), và dễ dàng phát hiện các hành động đáng ngờ (Suspicious).

**Why this priority**: Cần thiết để kiểm soát chất lượng nội dung và bảo vệ hệ thống khỏi truy cập trái phép.

**Independent Test**: API `GET /api/v1/admin/activity-logs?severity=suspicious` → verify trả về các log thuộc nhóm nhạy cảm (như `login_failed`, `role_changed`).

**Acceptance Scenarios**:

1. **Given** một user đăng nhập sai nhiều lần, **When** Admin truy cập trang Activity Log lọc "suspicious", **Then** Admin nhìn thấy dòng log `login_failed`.
2. **Given** bảng log có 1000 dòng, **When** Admin lọc action="content", **Then** hệ thống map về các action liên quan (tạo/sửa/xóa đề thi và tài liệu) và trả về danh sách.

---

### User Story 2 - Change Logs & Hoàn tác dữ liệu (Undo) (Priority: P2)

Là một Admin, tôi muốn xem chi tiết dữ liệu cũ (old_value) trước khi bị sửa và có khả năng hoàn tác (Undo) các thay đổi đối với tài khoản User (đổi Role, khóa tài khoản).

**Why this priority**: Admin cần một công cụ mạnh để sửa sai ngay lập tức khi phát hiện có ai đó bị phân quyền nhầm hoặc khóa nhầm.

**Independent Test**: Gọi API `POST /api/v1/admin/change-logs/:id/undo` với ID của log `role_changed` → verify DB trả về Role cũ, đồng thời sinh ra log `change_reverted`.

**Acceptance Scenarios**:

1. **Given** một log chuyển Role từ `tutor` sang `admin`, **When** Admin ấn Undo, **Then** hệ thống khóa row `FOR UPDATE`, chuyển Role về lại `tutor`, và log ra hành động `change_reverted`.
2. **Given** Admin ấn Undo thay đổi trên chính tài khoản của mình, **When** gửi request, **Then** hệ thống từ chối (403) báo lỗi không cho phép undo tài khoản của chính mình.
3. **Given** một log cũ, nhưng dữ liệu User đó đã bị sửa đổi lần 2 sau khi log đó sinh ra, **When** Admin ấn Undo, **Then** hệ thống từ chối (HTTP 409) vì phát hiện xung đột dữ liệu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp API danh sách `activity-logs` với các nhãn severity (normal/suspicious). Các hành động như xóa/sửa account, khóa thẻ... bị đánh dấu là suspicious.
- **FR-002**: Hệ thống MUST cung cấp API danh sách `change-logs` hiển thị chi tiết thay đổi dữ liệu cũ và mới (`old_value`, `new_value`).
- **FR-003**: Hệ thống MUST hỗ trợ API Undo cho `users` (chỉ áp dụng với `role_changed`, `user_deactivated`, `user_updated`).
- **FR-004**: Logic Undo MUST bọc trong Database Transaction với câu lệnh `FOR UPDATE` để chống Race Condition và MUST kiểm tra tính nguyên vẹn (current value == expected value).
- **FR-005**: Mọi API đọc/ghi log MUST bị khóa bởi role `admin`.

### Key Entities

- **audit_logs**: Bảng lưu lịch sử.
  - `id` (PK)
  - `actor_id` (Người thực hiện)
  - `action` (e.g., 'test_deleted', 'role_changed', 'change_reverted')
  - `target_table` (e.g., 'mock_test', 'users')
  - `target_id`
  - `old_value` (JSONB)
  - `new_value` (JSONB)
  - `ip_address`
  - `can_undo` (BOOLEAN)
  - `undone_at` (TIMESTAMP)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quá trình lưu log `logAction` xử lý mượt mà, lưu chính xác IPv4.
- **SC-002**: Undo an toàn: Hệ thống bảo vệ chặt chẽ 100% các case conflict dữ liệu và ném lỗi 409 khi attempt undo một record đã thay đổi.
