# Mô hình dữ liệu: Trợ lý ảo IELTS toàn cục

**Tính năng**: [spec.md](./spec.md)

**Nguồn schema**: `backend/src/db/migrations/024_create_chatbot_history_tables.sql`,
`backend/src/db/migrations/022_create_ai_usage_logs.sql`

**Ngày đối chiếu**: 2026-07-22

## Phạm vi

Tính năng chỉ tạo hai bảng `chatbot_sessions` và `chatbot_messages`. Bảng
`ai_usage_logs` là hạ tầng dùng chung đã có; các bảng đề thi, thư viện và bài làm chỉ
được đọc để tạo ngữ cảnh. Không cần tạo thêm bảng chatbot nào.

## Quan hệ tổng quát

```text
users (1) ─────< chatbot_sessions (1) ─────< chatbot_messages
   │
   └───────────< ai_usage_logs (metadata dùng chung, user_id có thể null)

users (1) ─────< test_attempts >───── mock_tests
                       │
                       └────< question_answers >──── questions

mock_tests và library_resources ──(chỉ đọc, phải đạt điều kiện công bố)──> ngữ cảnh
```

## Thực thể do tính năng sở hữu

### `chatbot_sessions`

Đại diện cho một cuộc trò chuyện của một học viên.

| Trường | Kiểu | Ràng buộc/ý nghĩa |
|---|---|---|
| `id` | UUID | Khóa chính, mặc định `gen_random_uuid()` |
| `user_id` | UUID | Bắt buộc; khóa ngoại `users(id)`, `ON DELETE CASCADE` |
| `preferred_address` | VARCHAR(60) | Có thể null; cách xưng hô trong phạm vi cuộc trò chuyện |
| `started_at` | TIMESTAMPTZ | Bắt buộc, mặc định `NOW()` |
| `ended_at` | TIMESTAMPTZ | Null nghĩa là phiên đang hoạt động |

**Chỉ mục**: `idx_chatbot_sessions_user_started(user_id, started_at DESC)`.

**Quy tắc nghiệp vụ**:

- Chỉ chọn phiên có `user_id` bằng người dùng đã xác thực và `ended_at IS NULL`.
- Nếu `conversationId` không thuộc người dùng/đã đóng, repository không cấp quyền cho
  phiên đó; nó chọn phiên đang hoạt động hợp lệ khác hoặc tạo phiên mới.
- `preferred_address` còn được lớp ứng dụng giới hạn tối đa 60 ký tự, 8 từ và từ chối
  nội dung giống chỉ thị. Giá trị null biểu thị chưa đặt/đã xóa.
- Khi có nhiều phiên hoạt động cũ, code ưu tiên phiên có hoạt động tin nhắn mới nhất,
  rồi mới xét thời điểm phiên.

### `chatbot_messages`

Đại diện cho một tin nhắn người dùng hoặc trợ lý trong một phiên.

| Trường | Kiểu | Ràng buộc/ý nghĩa |
|---|---|---|
| `id` | UUID | Khóa chính, mặc định `gen_random_uuid()` |
| `session_id` | UUID | Bắt buộc; khóa ngoại `chatbot_sessions(id)`, `ON DELETE CASCADE` |
| `role` | VARCHAR(20) | Bắt buộc; chỉ `user` hoặc `assistant` |
| `content` | TEXT | Bắt buộc; nội dung tin nhắn |
| `tokens_used` | INT | Có thể null; cột tương thích lịch sử, pipeline hiện không dựa vào cột này để tính quota |
| `rating` | VARCHAR(10) | Có thể null; chỉ `up` hoặc `down` |
| `rating_reason` | TEXT | Có thể null; lý do đánh giá |
| `created_at` | TIMESTAMPTZ | Bắt buộc, mặc định `NOW()` |
| `updated_at` | TIMESTAMPTZ | Bắt buộc, mặc định `NOW()`; trigger cập nhật trước mỗi `UPDATE` |

**Chỉ mục/trigger**:

- `idx_chatbot_msg_session(session_id, created_at)`.
- `trg_chatbot_messages_updated_at` gọi `set_updated_at()` trước cập nhật.

**Quy tắc nghiệp vụ**:

- Chèn tin nhắn bằng `INSERT ... SELECT` chỉ khi phiên đang hoạt động thuộc đúng học
  viên đã xác thực.
- Một lượt thành công cố gắng lưu đúng một tin nhắn `user` rồi một tin nhắn
  `assistant`. Cơ chế lưu hiện là nỗ lực tối đa; thiếu migration có thể trả lời nhưng
  không có `messageId`/lịch sử bền vững.
- Chỉ tin nhắn vai trò `assistant` thuộc phiên của học viên mới được đánh giá.
- Lịch sử công khai lấy tối đa 100 tin nhắn gần nhất của một phiên, rồi trả theo thứ tự
  thời gian tăng dần.

## Thực thể dùng chung

### `ai_usage_logs`

Lưu metadata của lời gọi nhà cung cấp, không lưu prompt hoặc câu trả lời.

| Nhóm trường | Trường chính | Ý nghĩa |
|---|---|---|
| Danh tính | `id`, `user_id` | UUID log; người dùng có thể null, xóa user thì `SET NULL` |
| Phân loại | `feature`, `provider`, `model` | Chatbot thường dùng `feature='chatbot'`; ngữ cảnh review/result có thể dùng `explain_with_ai` |
| Tương quan | `response_id`, `entity_type`, `entity_id` | ID nhà cung cấp/thực thể nếu có |
| Mức dùng | `prompt_tokens`, `completion_tokens`, `thinking_tokens`, `cached_tokens`, `total_tokens` | Số token, mặc định 0 |
| Kết quả | `success`, `error_code`, `error_message`, `latency_ms`, `created_at` | Telemetry thành công/thất bại đã được làm sạch |

Chatbot chia sẻ bảng này với AI chấm nhanh nhưng không chia sẻ bảng kết quả chấm.

## Thực thể chỉ đọc để tạo ngữ cảnh

| Thực thể | Điều kiện truy cập hiện hành | Dữ liệu được dùng |
|---|---|---|
| `mock_tests` | Điều kiện công bố theo schema: `is_published = TRUE` (hoặc cột tương đương) và `review_status='approved'` nếu có | ID, tiêu đề, mô tả, kỹ năng, độ khó, thời lượng, liên kết nội bộ |
| `library_resources` | Điều kiện công bố tương tự | ID, tiêu đề, mô tả, loại tài nguyên, danh mục, liên kết thư viện |
| `test_attempts` | `id` và `user_id` phải khớp; `submitted_at IS NOT NULL` trước khi giải thích | ID bài làm, bài thi, trạng thái đã nộp |
| `question_answers` | Thuộc `attempt_id` hợp lệ | Câu trả lời đã chọn, tính đúng/sai |
| `questions` | Nối từ `question_answers`; lọc `questionId`/thứ tự câu nếu có | Nội dung, lựa chọn, đáp án đúng, lời giải thích chính thức |

`context.visibleItems` từ frontend chỉ là ngữ cảnh không đáng tin cậy; nó không thay
thế các điều kiện công bố hoặc quyền sở hữu ở CSDL.

## Chuyển trạng thái

### Phiên trò chuyện

```text
không có phiên
    │ POST chat/stream hợp lệ
    ▼
đang hoạt động (ended_at = null)
    │ thao tác kết thúc ngoài phạm vi feature hiện tại
    ▼
đã đóng (ended_at != null) ── không được dùng lại
```

### Một lượt trò chuyện

```text
đầu vào hợp lệ + đã xác thực
  → tiền kiểm/rào chắn
  → định tuyến + tạo ngữ cảnh
  → phản hồi tất định hoặc provider
  → chuẩn hóa/tự kiểm tra
  → cố gắng lưu user message
  → cố gắng lưu assistant message
  → trả JSON hoặc start/delta/done
```

Nếu rào chắn/lỗi trả `code`, lượt đó không được xem là kết quả thành công để lưu cặp
tin nhắn. Nếu lưu thất bại sau khi đã có phản hồi an toàn, code vẫn có thể trả câu trả
lời với `messageId=null`.

## Quy tắc xóa và lưu giữ

- Xóa `users` làm xóa dây chuyền phiên và tin nhắn chatbot theo migration 024.
- Xóa phiên làm xóa dây chuyền tin nhắn.
- `ai_usage_logs.user_id` chuyển thành null khi người dùng bị xóa.
- Feature hiện chưa định nghĩa API xóa/đóng phiên hoặc thời hạn lưu giữ riêng; không
  được khẳng định có chính sách retention khi chưa được phê duyệt.

## Điều kiện triển khai

Migration 024 phải được áp dụng và xác minh trên từng môi trường trước khi coi lịch
sử, cách xưng hô và đánh giá là bền vững. Công việc này đang mở tại T058; tài liệu này
không xác nhận migration đã chạy trên production.
