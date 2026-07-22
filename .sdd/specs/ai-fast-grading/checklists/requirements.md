# Checklist chất lượng đặc tả: Chấm nhanh Writing và Speaking bằng AI

**Mục đích**: Xác nhận đặc tả đủ rõ trước khi sinh lại task và triển khai.

**Ngày tạo**: 2026-07-22

**Tính năng**: [spec.md](../spec.md)

## Chất lượng nội dung

- [x] Tập trung vào giá trị người dùng và nhu cầu nghiệp vụ.
- [x] Viết bằng tiếng Việt cho stakeholder; identifier kỹ thuật chỉ xuất hiện khi cần làm rõ contract.
- [x] Tất cả phần bắt buộc đã hoàn thành.
- [x] Không mô tả chi tiết code/file như nguồn yêu cầu nghiệp vụ.

## Độ đầy đủ của yêu cầu

- [x] Không còn marker `[NEEDS CLARIFICATION]`.
- [x] Yêu cầu có thể kiểm thử và không mơ hồ.
- [x] Tiêu chí thành công có số đo và có thể xác minh.
- [x] Tất cả câu chuyện có kiểm thử độc lập và kịch bản chấp nhận.
- [x] Trường hợp biên, phạm vi và phụ thuộc đã được nêu.

## Sẵn sàng triển khai

- [x] Transcript-only không sinh criterion band hoặc Overall.
- [x] Thiếu audio evidence fail-closed thành retry/failed và không tự handoff tutor.
- [x] Idempotency, retry, privacy và tutor assignment có tiêu chí chấp nhận.
- [x] Cổng calibration không bị thay bằng threshold suy đoán.
- [x] Writing được bảo vệ khỏi hồi quy.

## Ghi chú

- Đặc tả cho phép trả `AI Estimated Band` đủ bốn tiêu chí cho luyện tập. Việc gọi kết quả là đã hiệu chuẩn/production-ready vẫn cần calibration bundle và approval theo FR-022.
- Xung đột provider/storage/React với Constitution phải được xử lý bằng code tuân thủ hoặc RFC; checklist này không thay thế RFC.
