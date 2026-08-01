# Hợp đồng API (API Contract): Audit Log and Change History

Tất cả các phản hồi theo cấu trúc:

```json
{ "success": true, "data": {}, "error": null, "meta": {} }
```

Các lỗi theo cấu trúc:

```json
{ "success": false, "data": null, "error": { "message": "..." }, "meta": {} }
```

## GET `/api/v1/admin/audit-logs`

Xác thực (Auth): admin.

Query (Tham số):
- `page` số nguyên (integer), mặc định `1`.
- `limit` số nguyên (integer), mặc định `20`, tối đa `100`.
- `severity` tuỳ chọn: `suspicious`.
- `actor_id`, `action`, `target_table`, `target_id`, `from`, `to`, `search` tuỳ chọn.

Dữ liệu phản hồi (Response data): mảng (array) các dòng activity log:

```json
{
  "id": "uuid",
  "created_at": "2026-07-24T00:00:00.000Z",
  "actor": "Admin Name",
  "action": "login_failed",
  "target": "user@example.com",
  "ip": "127.0.0.1",
  "severity": "suspicious",
  "reason": "..."
}
```

Lưu ý: `action_label` **không** được trả về trong phản hồi này. Frontend sẽ tự ánh xạ (maps) `action` thành một nhãn dễ đọc (human-readable label) bằng helper của chính nó. `action_label` chỉ có trong các endpoint của Change Log.

## GET `/api/v1/admin/audit-logs/stats`

Xác thực (Auth): admin.

Dữ liệu phản hồi (Response data):

```json
{ "total": 120, "suspicious": 8, "failed_logins": 5 }
```

## GET `/api/v1/admin/change-logs`

Xác thực (Auth): admin.

Query (Tham số):
- `page`, `limit`, `action`, `status`, `search`, `from`, `to`.

Dữ liệu phản hồi (Response data): mảng các dòng change log.

Meta:

```json
{
  "page": 1,
  "limit": 10,
  "total": 120,
  "summary": { "total": 120, "undoable": 7, "undone": 3 }
}
```

## GET `/api/v1/admin/change-logs/:id`

Xác thực (Auth): admin.

Dữ liệu phản hồi bao gồm `old_value`, `new_value`, `can_undo`, `undone_at`, `undone_by`, và `undo_log_id`.

## POST `/api/v1/admin/change-logs/:id/undo`

Xác thực (Auth): admin.

Hành vi (Behavior):
- Khôi phục `users.role` hoặc `users.status` được hỗ trợ dựa vào giá trị cũ của dòng log gốc (source log old value).
- Từ chối các thay đổi không hỗ trợ, đã bị undo, dữ liệu đã cũ (stale), không tìm thấy mục tiêu (missing target), hoặc thao tác tự nhắm vào chính mình (self-targeted changes).
- Chèn (Insert) log audit `change_reverted`.

Dữ liệu thành công (Success data):

```json
{
  "source_log_id": "uuid",
  "undo_log_id": "uuid",
  "target_id": "uuid",
  "restored": { "role": "student" }
}
```
