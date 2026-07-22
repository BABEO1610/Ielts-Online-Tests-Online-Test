# Checklist chất lượng đặc tả: Chấm nhanh Writing và Speaking bằng AI

**Mục đích**: Xác nhận đặc tả đủ rõ trước khi sinh lại task và triển khai.

**Ngày tạo**: 2026-07-22

**Tính năng**: [spec.md](../spec.md)

## Chất lượng nội dung

- [x] CHK001 Tập trung vào giá trị người dùng và nhu cầu nghiệp vụ.
- [x] CHK002 Viết bằng tiếng Việt cho stakeholder; identifier kỹ thuật chỉ xuất hiện khi cần làm rõ contract.
- [x] CHK003 Tất cả phần bắt buộc đã hoàn thành.
- [x] CHK004 Không mô tả chi tiết code/file như nguồn yêu cầu nghiệp vụ.

## Độ đầy đủ của yêu cầu

- [x] CHK005 Không còn placeholder làm rõ chưa được xử lý.
- [x] CHK006 Yêu cầu có thể kiểm thử và không mơ hồ.
- [x] CHK007 Tiêu chí thành công có số đo và có thể xác minh.
- [x] CHK008 Tất cả câu chuyện có kiểm thử độc lập và kịch bản chấp nhận.
- [x] CHK009 Trường hợp biên, phạm vi và phụ thuộc đã được nêu.

## Sẵn sàng triển khai

- [x] CHK010 Transcript-only không sinh criterion band hoặc Overall.
- [x] CHK011 Thiếu audio evidence fail-closed thành retry/failed và không tự handoff tutor.
- [x] CHK012 Idempotency, retry, privacy và tutor assignment có tiêu chí chấp nhận.
- [x] CHK013 Đặc tả tách rõ AI estimate không cần bundle với nhánh đã hiệu chuẩn bắt buộc calibration/approval; không thay cổng calibration bằng threshold suy đoán.
- [x] CHK014 Đặc tả yêu cầu bảo vệ Writing khỏi hồi quy; trạng thái test implementation được theo dõi riêng tại T070–T071.

## Ghi chú

- Đặc tả cho phép trả `AI Estimated Band` đủ bốn tiêu chí cho luyện tập khi cờ estimate bật, kể cả khi calibration bundle chưa có. Việc gọi kết quả là đã hiệu chuẩn/production-ready vẫn cần bundle, cờ publish và approval theo FR-022.
- Xung đột provider/storage/React với Constitution phải được xử lý bằng code tuân thủ hoặc RFC; checklist này không thay thế RFC.
