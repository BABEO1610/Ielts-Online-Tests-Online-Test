# Hợp đồng API hiện hành: Trợ lý ảo IELTS toàn cục

**Phiên bản tài liệu**: 1.0

**Ngày đối chiếu code**: 2026-07-22

**Máy đọc được**: [assistant.openapi.yaml](./assistant.openapi.yaml)

## Phạm vi hợp đồng

Đây là hợp đồng, không phải hợp đồng đích đã tuân Hiến chương.
Frontend dùng tiền tố `/api/v1/assistant`; backend đồng thời gắn cùng router tại
`/api/assistant` để tương thích. Các ví dụ bên dưới dùng tiền tố chính.

Tất cả endpoint yêu cầu học viên đã xác thực bằng cookie `accessToken` hoặc
`access_token`. Backend tự xác minh JWT, phiên đang hoạt động, trạng thái thu hồi khi
Redis sẵn sàng, `must_change_password` và vai trò `student`.

## Cấu trúc dữ liệu đầu vào dùng chung

### `ChatRequest`

```json
{
  "message": "Skimming khác scanning như thế nào?",
  "context": {
    "pageType": "home",
    "attemptId": null,
    "questionId": null,
    "route": "/",
    "visibleItems": []
  },
  "conversationId": null
}
```

Ràng buộc:

- `message`: chuỗi bắt buộc sau khi trim, tối đa 2000 ký tự.
- `context`: object bắt buộc.
- `context.pageType`: một trong `home`, `test`, `test-list`, `library`, `lesson`,
  `profile`, `result`, `review`, `active-test`, `practice_history`,
  `post_test_review`, `unknown`.
- `attemptId`, `questionId`, `route`: chuỗi hoặc null.
- `visibleItems`: nếu là mảng, chỉ lấy tối đa 20 object; mỗi object giữ `id`, `title`,
  `type`, `route` và phải có ít nhất `id` hoặc `title` sau chuẩn hóa.
- `conversationId`: UUID hoặc null. Body cũ có thể gửi `sessionId`; code chuẩn hóa nó
  thành cùng trường nội bộ nhưng client mới phải dùng `conversationId`.

## Endpoint

### `POST /api/v1/assistant/chat`

Gửi một lượt và nhận JSON sau khi pipeline hoàn tất.

Phản hồi thành công HTTP 200 hiện hành:

```json
{
  "success": true,
  "answer": "Skimming dùng để nắm ý chính...",
  "suggestedLinks": [],
  "linkMeta": null,
  "conversationId": "fdc1b32e-aadb-4e37-bf96-dfb23d45179c",
  "messageId": "f7d76515-5ba1-4fb6-863b-8148f0ea13de",
  "intent": "IELTS_KNOWLEDGE",
  "needsMoreContext": false,
  "grounding": {
    "usedDatabase": false,
    "usedKnowledgeBase": true,
    "usedSessionMemory": false,
    "sourceTables": [],
    "resultCount": 1
  },
  "safety": {
    "outOfScope": false,
    "inventedContent": false,
    "containsBandScore": false,
    "containsWritingSpeakingGrading": false,
    "containsPrivateData": false
  },
  "code": null
}
```

`conversationId` hoặc `messageId` có thể null khi schema/lưu trữ theo cơ chế nỗ lực
tối đa chưa khả dụng. Điều đó không chứng minh dữ liệu đã được lưu.

### `POST /api/v1/assistant/chat/stream`

Nhận cùng `ChatRequest`. Nếu xác thực/xác thực dữ liệu/tiền kiểm thất bại trước khi gửi
header SSE, endpoint trả JSON lỗi. Nếu được chấp nhận, phản hồi HTTP 200 có
`Content-Type: text/event-stream; charset=utf-8`.

Thứ tự thành công hiện tại:

```text
event: assistant.start
data: {"conversationId":"...","intent":"IELTS_KNOWLEDGE"}

event: assistant.delta
data: {"delta":"Toàn bộ câu trả lời hoàn chỉnh, không phải một token."}

event: assistant.done
data: {"answer":"...","suggestedLinks":[],"conversationId":"...","messageId":"...","intent":"IELTS_KNOWLEDGE","code":null,...}
```

`assistant.done` là kết quả nội bộ đầy đủ của service, vì vậy ngoài các trường công
khai của `/chat` còn có metadata như `fallbackUsed`, `finalResponseMode`,
`aiResponseValid`, `aiResponseFormat`, `aiRetryUsed`, `fallbackReason`,
`fallbackType`, `dbLookupCalled`.

Lỗi sau khi đã gửi header:

```text
event: assistant.error
data: {"code":"INTERNAL_ERROR","message":"Trợ lý IELTS đang gặp lỗi. Vui lòng thử lại sau."}
```

Code không tự động gửi lại qua `/chat` khi stream bị ngắt; làm như vậy có thể tạo cặp
tin nhắn trùng.

### `GET /api/v1/assistant/history`

Query tùy chọn: `conversationId=<uuid>`. Code chỉ chọn một phiên đang hoạt động thuộc
người dùng đã xác thực và trả tối đa 100 tin nhắn gần nhất theo thứ tự thời gian.

```json
{
  "history": [
    {
      "id": "...",
      "role": "user",
      "content": "Skimming là gì?",
      "createdAt": "2026-07-22T09:00:00.000Z"
    }
  ],
  "conversationId": "...",
  "code": null
}
```

Nếu ID không thuộc người dùng/đã đóng, repository không trả lịch sử phiên đó; nó có
thể chọn phiên hoạt động hợp lệ khác của cùng người dùng. Hợp đồng hiện tại không trả
403 chỉ vì query chứa ID của phiên khác.

### `GET /api/v1/assistant/status`

Endpoint được bảo vệ như các endpoint khác và không lộ provider/model/key.

```json
{ "code": null, "status": "ok" }
```

### `POST /api/v1/assistant/messages/{messageId}/rating`

Body:

```json
{ "rating": "up", "reason": "Giải thích dễ hiểu" }
```

- `rating` bắt buộc, chỉ `up` hoặc `down` sau khi trim/lowercase.
- `reason` là chuỗi hoặc null.
- Chỉ cập nhật tin nhắn `assistant` thuộc phiên của người dùng đã xác thực.

Thành công HTTP 200:

```json
{ "success": true, "messageId": "...", "rating": "up", "code": null }
```

Khi repository không lưu được, service trả `FORBIDDEN` hoặc `MISSING_CONTEXT`; sau đó
controller chuẩn hóa thành JSON lỗi chung bên dưới.

## Hợp đồng lỗi trợ lý hiện hành

Ngoại trừ lỗi giới hạn tần suất, controller trả object phẳng:

```json
{
  "success": false,
  "answer": null,
  "suggestedLinks": [],
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu gửi lên không hợp lệ.",
  "intent": "VALIDATION_ERROR"
}
```

| Mã                                                                          | HTTP |
| ---------------------------------------------------------------------------- | ---: |
| `LOGIN_REQUIRED`                                                           |  401 |
| `FORBIDDEN`, `ASSISTANT_DISABLED_DURING_TEST`, `ATTEMPT_NOT_SUBMITTED` |  403 |
| `VALIDATION_ERROR`, `OUT_OF_SCOPE`                                       |  400 |
| `ATTEMPT_NOT_FOUND`, `QUESTION_NOT_FOUND`                                |  404 |
| `MISSING_CONTEXT`, `MISSING_EXPLANATION`                                 |  422 |
| `AI_QUOTA_EXCEEDED`                                                        |  429 |
| `AI_NOT_CONFIGURED`                                                        |  503 |
| `INTERNAL_ERROR`                                                           |  500 |

Khi `/chat` hoặc `/chat/stream` vượt 30 yêu cầu/IP/phút, middleware trả một cấu trúc
khác:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many assistant messages from this IP, please try again after a minute."
  }
}
```

## Sai lệch và hướng chuyển đổi

Các JSON hiện hành chưa được bọc theo `{success,data,error,meta}` và cấu trúc rate-limit
khác với lỗi controller. [tasks.md](../tasks.md) giữ T057 mở để thiết kế chuyển đổi
tương thích ngược, bổ sung contract/integration test và không tuyên bố cổng Hiến chương
đã đạt. OpenAPI đi kèm mô tả hiện trạng này; không được hiểu là phê duyệt ngoại lệ.
