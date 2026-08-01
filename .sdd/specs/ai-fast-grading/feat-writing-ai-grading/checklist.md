# Checklist chất lượng đặc tả: Chấm nhanh Writing bằng AI

**Mục đích**: Kiểm tra chất lượng, độ đầy đủ và khả năng kiểm thử của yêu cầu; không phải checklist chạy implementation.  
**Đặc tả**: [spec.md](./spec.md)

## Chất lượng nội dung

- [x] CHK001 Tập trung vào giá trị và hành vi người dùng, không biến spec thành hướng dẫn code.
- [x] CHK002 Ranh giới với UI làm bài, tutor workflow và Speaking được nêu rõ.
- [x] CHK003 Thuật ngữ Task, group, report, job và Overall được dùng nhất quán.
- [x] CHK004 Không còn placeholder hoặc câu hỏi `[NEEDS CLARIFICATION]`.

## Độ đầy đủ và rõ ràng

- [x] CHK005 Mỗi user story có ưu tiên, kiểm thử độc lập và kịch bản Given/When/Then.
- [x] CHK006 Yêu cầu xác định chính xác tập Task `{1,2}` và ngưỡng từ 50/100.
- [x] CHK007 Quy tắc idempotency, fingerprint, quota UTC và replay được quy định.
- [x] CHK008 Bốn tiêu chí từng Task và trọng số Overall 1/3–2/3 được định nghĩa.
- [x] CHK009 Hành vi khi một Task thất bại và việc không công bố Overall một phần được nêu rõ.
- [x] CHK010 Envelope, phân quyền và dữ liệu không được lộ đã có yêu cầu riêng.

## Tính nhất quán với code hiện tại

- [x] CHK011 Spec phân biệt rõ root job Writing với worker chỉ claim Speaking.
- [x] CHK012 Plan mô tả đúng `processWritingTasksAsync()` chạy nền trong API process.
- [x] CHK013 API, bảng dữ liệu và file code trong plan đều tồn tại.
- [x] CHK014 Hai regression đang mở được phản ánh trong spec, plan và tasks.
- [x] CHK015 Không tuyên bố durable retry/watchdog cho Writing khi code chưa hỗ trợ.

## Khả năng kiểm thử và đo lường

- [x] CHK016 Success criteria có ngưỡng định lượng cho validation, concurrency và coverage.
- [x] CHK017 Happy path, invalid input, replay/conflict và provider failure đều kiểm thử được.
- [x] CHK018 Task items có ID, user-story tag và đường dẫn file chính xác.
- [x] CHK019 Ma trận user story ↔ yêu cầu ↔ task không bỏ sót phạm vi.
- [x] CHK020 Các task chưa hoàn thành vẫn để `[ ]`, không dùng trạng thái tài liệu để che release gap.

## Ghi chú

- Chất lượng đặc tả đạt để triển khai tiếp.
- Release module chưa đạt cho tới khi T011–T016 trong `tasks.md` hoàn tất.
