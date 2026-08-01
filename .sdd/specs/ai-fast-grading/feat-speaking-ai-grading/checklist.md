# Danh sách kiểm tra chất lượng yêu cầu: Chấm điểm Speaking bằng AI

**Mục đích**: Kiểm tra đơn vị tính rõ ràng, đầy đủ, nhất quán, và truy vết được của yêu cầu viết; đây không phải nhật ký thực thi triển khai.
**Ngày tạo**: 2026-08-01
**Tính năng**: [spec.md](./spec.md)

## Tính đầy đủ yêu cầu

- [x] CHK001 Tổng quan, phạm vi, ngoài phạm vi, tác nhân, câu chuyện ưu tiên, kiểm thử độc lập, kịch bản chấp nhận, trường hợp biên, BR/FR/NFR/SC, thực thể, giả định, phụ thuộc, và câu hỏi mở có đầy đủ? [Đầy đủ, Đặc tả §§1–14]
- [x] CHK002 Đúng Part, thời điểm hạn mức, phát lại, thử lại tự động/thủ công, điều kiện nút thử lại, âm thanh không hợp lệ/im lặng/không đủ bằng chứng, biến thể bản ghi, quyền truy cập, kết quả học viên, tuyên bố ước tính, không chuyển giao giảng viên, lưu giữ, quyết toán thất bại, và hủy đã được đề cập? [Đầy đủ, Đặc tả §7]
- [x] CHK003 Các kịch bản tích cực, tiêu cực, phân quyền, đồng thời, lỗi nhà cung cấp, worker cũ, và phục hồi đã được đặc tả? [Bao phủ, Đặc tả §§5–6]

## Tính rõ ràng yêu cầu

- [x] CHK004 Mọi mục quy chuẩn đã được phân loại rõ ràng là AS-BUILT, TARGET, hoặc NEEDS CLARIFICATION? [Rõ ràng, Đặc tả §§7–11]
- [x] CHK005 Điểm band ước tính và công bố đã hiệu chuẩn được định nghĩa là hai trạng thái khác nhau mà không tuyên bố hiệu chuẩn đã được triển khai? [Rõ ràng, Đặc tả §BR-SPK-013, §FR-SPK-016]
- [x] CHK006 Cấu hình hạn mức và giá trị mã nguồn/mẫu được giữ ngoài Quy tắc nghiệp vụ phổ quát và được giải thích trong kế hoạch? [Rõ ràng, Đặc tả §BR-SPK-004, Kế hoạch §2]
- [x] CHK007 Ngân sách lần thử gốc/con và giới hạn thử lại thủ công được nêu rõ mà không nhầm lẫn lần thử tự động với thử lại thủ công? [Rõ ràng, Đặc tả §§BR-SPK-005–006]
- [x] CHK008 Điều kiện công bố bản ghi/bằng chứng và cách tính điểm Tổng của backend có thể kiểm thử khách quan? [Rõ ràng, Đặc tả §§BR-SPK-008–012]

## Tính nhất quán yêu cầu

- [x] CHK009 Quy tắc nghiệp vụ không chứa tên file, hàm/lớp, SQL, tên migration, tên mô hình nhà cung cấp, tên header, chi tiết lệnh media, hay số lượng kiểm thử lịch sử? [Nhất quán, Đặc tả §7]
- [x] CHK010 Đặc tả, kế hoạch, và công việc nhất quán nêu rằng lỗi AI vẫn nằm trong luồng AI và không bao giờ tự động phân công giảng viên? [Nhất quán, Đặc tả §BR-SPK-014, Kế hoạch §§4/10, Công việc T015/T020]
- [x] CHK011 Đặc tả, kế hoạch, công việc, và OpenAPI được giữ lại phân biệt hành vi HIỆN CÓ với công việc phát hành MỤC TIÊU? [Nhất quán]
- [x] CHK012 Migration 030 chỉ được mô tả trong kế hoạch/công việc và được biện minh nhất quán bằng tạo vật thử lại thủ công theo phạm vi công việc? [Nhất quán, Kế hoạch §7, Công việc T003]

## Chất lượng tiêu chí chấp nhận

- [x] CHK013 Mỗi câu chuyện người dùng có ưu tiên, kiểm thử độc lập, và kịch bản chấp nhận Cho trước/Khi/Thì? [Tiêu chí chấp nhận, Đặc tả §5]
- [x] CHK014 SC-SPK-001–008 có thể đo được mà không coi số lượng kiểm thử lịch sử là thành công nghiệp vụ? [Đo lường được, Đặc tả §11]
- [x] CHK015 Các mục tiêu pipeline chưa phê duyệt được trình bày như cổng đo lường/phát hành thay vì tuyên bố SLA HIỆN CÓ bịa ra? [Đo lường được, Đặc tả §NFR-SPK-005]

## Yêu cầu phi chức năng

- [x] CHK016 Kiểm soát truy cập, lưu trữ riêng tư/hết hạn URL, không ghi nhật ký nhạy cảm, đo lường xếp hàng/pipeline, đồng thời, phục hồi, toàn vẹn, phụ thuộc runtime, coverage, và lưu giữ/KMS đã được bao phủ? [Bao phủ, Đặc tả §9]
- [x] CHK017 Mỗi NFR có giá trị số khi có ràng buộc đã phê duyệt hoặc được diễn đạt như điều kiện/cổng phát hành có thể kiểm thử khách quan? [Đo lường được, Đặc tả §9]

## Truy vết và kỷ luật bằng chứng

- [x] CHK018 Mỗi dải BR/FR/NFR/SC ánh xạ tới công việc và kiểm thử/bằng chứng, bao gồm quyết định chính sách mở? [Truy vết, Công việc §Ma trận truy vết]
- [x] CHK019 Mỗi tác vụ dùng định dạng checkbox/ID/câu chuyện/song song bắt buộc và đường dẫn repository cụ thể? [Truy vết, Công việc]
- [x] CHK020 Tác vụ triển khai `[x]` chỉ giới hạn cho hành vi có bằng chứng route/service/truy vấn-hoặc-migration/frontend/kiểm thử, trong khi diễn tập migration, coverage, tải, smoke nhà cung cấp, chính sách, hiệu chuẩn, không nhất quán UI, và quản trị đường dẫn vẫn `[ ]`? [Bằng chứng, Công việc]

## Mơ hồ và xung đột

- [x] CHK021 Lưu giữ/KMS, quyết toán hạn mức thất bại kết thúc, và hủy được giữ mở không quá ba câu hỏi sản phẩm rõ ràng? [Mơ hồ, Đặc tả §14]
- [x] CHK022 Không khớp đường dẫn OpenAPI yêu cầu được ghi nhận là mâu thuẫn bởi worktree hiện tại, mà không di chuyển/xóa hợp đồng? [Xung đột, Kế hoạch §6, Công việc T027]
- [x] CHK023 Xung đột giá trị mặc định mã nguồn 10 với mẫu `.env.example` 15 được ghi nhận mà không khẳng định giá trị production chưa xác minh? [Xung đột, Kế hoạch §§2/15]
- [x] CHK024 Tất cả đánh dấu TARGET/NEEDS CLARIFICATION cố ý đều ánh xạ tới tác vụ chưa hoàn thành thay vì bị đóng ngầm? [Nhất quán, Công việc T015/T022–T025/T027–T031]

## Vệ sinh placeholder

- [x] CHK025 Không có placeholder mẫu ngoài ý muốn, `TBD`, `TODO`, Quy tắc nghiệp vụ đặc thù mô hình, hay tiêu chí thành công "đếm số kiểm thử lịch sử"? [Chất lượng]

## Ghi chú

- Các mục đã đánh dấu chứng thực chất lượng viết yêu cầu theo bằng chứng từ tạo vật liên kết, không phải thực thi production.
- Các quyết định sản phẩm mở vẫn mở theo thiết kế và không làm danh sách này thất bại khi chúng rõ ràng, có giới hạn, và ánh xạ tới công việc chưa hoàn thành.
