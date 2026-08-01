# Đặc tả tính năng: Chấm điểm Speaking bằng AI

**Ngày tạo**: 2026-08-01
**Trạng thái**: Nền tảng HIỆN CÓ; các cổng phát hành MỤC TIÊU vẫn còn mở
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cho phép học viên đã xác thực nộp một phiên luyện Speaking hoàn chỉnh, rời trang trong khi hệ thống chấm bất đồng bộ, và sau đó nhận kết quả Điểm band ước tính bằng AI dựa trên bản ghi lời nói và bằng chứng âm thanh. Kết quả ước tính chỉ phục vụ mục đích luyện tập và không phải điểm IELTS chính thức. Lỗi AI vẫn nằm trong luồng AI; hệ thống không tự động tạo phân công cho giảng viên.

## 2. Phạm vi

- Tải lên và nộp riêng tư đúng 3 phần Speaking (Part 1, 2 và 3).
- Trạng thái công việc bất đồng bộ, thử lại tự động, thử lại thủ công do người dùng khởi tạo, và chọn kết quả chuẩn.
- Xác thực/chuẩn hóa âm thanh, bản ghi ASR, bằng chứng giọng nói, bốn tiêu chí chấm Speaking IELTS, điểm Tổng do backend tính, phản hồi, tuyên bố từ chối trách nhiệm, và metadata phiên bản.
- Lịch sử, âm thanh, bản ghi và kết quả chỉ hiển thị cho chủ sở hữu.

## 3. Ngoài phạm vi

- Không gian làm việc giảng viên, quy trình hiệu chuẩn giảng viên, hoặc chuyển giao tự động cho giảng viên.
- Chấm điểm thời gian thực khi học viên đang nói, chứng nhận IELTS chính thức, hoặc huấn luyện mô hình.
- Xóa vật lý hoặc hủy bỏ cho đến khi các quyết định sản phẩm mở bên dưới được giải quyết.
- Chấm điểm Writing bằng AI.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Học viên đã xác thực | Tạo tải lên, nộp phiên AI, theo dõi/thử lại nhóm của mình, và xem âm thanh/bản ghi/kết quả được ủy quyền. |
| Giảng viên được phân công | Có thể truy cập nhóm chỉ qua quy trình giảng viên riêng; không phải tác nhân trong MVP chấm điểm học viên này. |
| Quản trị viên | Có thể truy cập dữ liệu vận hành được bảo vệ theo phân quyền nền tảng; không suy diễn hành vi chỉ dành cho học viên. |
| Khách/không phải học viên | Không thể sử dụng chức năng nộp và thử lại Speaking AI của học viên. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Nộp phiên ba Part riêng tư (Ưu tiên: P1)

Với tư cách học viên, tôi muốn tải lên cả ba Part Speaking một cách riêng tư và nhận xác nhận nộp bất đồng bộ mà không cần chờ xử lý AI.

**Kiểm thử độc lập**: Với bộ lưu trữ giả riêng tư, tải lên các đối tượng Part 1/2/3 hợp lệ, nộp một lần, và xác nhận tạo được một yêu cầu chấm gốc cùng ba bản ghi Part; phát lại cùng yêu cầu và xác nhận không có công việc trùng lặp hay tiêu tốn hạn mức.

**Kịch bản chấp nhận**:

1. **Cho trước** ba đối tượng âm thanh hợp lệ thuộc sở hữu riêng cho Part 1, 2 và 3, **Khi** học viên nộp chúng với khóa idempotency mới, **Thì** một phiên gốc được chấp nhận và xếp hàng.
2. **Cho trước** thiếu Part/Part trùng, chủ sở hữu không hợp lệ, MIME không hỗ trợ, đối tượng rỗng/quá kích thước, kích thước/checksum/thời lượng không khớp, hoặc đề bài không khả dụng, **Khi** cố nộp, **Thì** bị từ chối trước khi bắt đầu chấm.
3. **Cho trước** cùng khóa chưa hết hạn và đầu vào đã chấp nhận giống hệt, **Khi** yêu cầu được phát lại, **Thì** trả về nhóm/công việc gốc và hạn mức không bị tính thêm.

### Câu chuyện 2 — Theo dõi trạng thái và thử lại khi thất bại (Ưu tiên: P1)

Với tư cách học viên, tôi muốn theo dõi trạng thái chấm chuẩn và yêu cầu thử lại được phép sau khi thất bại ở trạng thái kết thúc.

**Kiểm thử độc lập**: Dẫn dắt worker giả qua các trạng thái queued/running/retry-wait/failed, tạo các lần thử lại thủ công con, và xác nhận truy vấn trạng thái luôn trả công việc chuẩn mới nhất và không bao giờ tạo công việc giảng viên.

**Kịch bản chấp nhận**:

1. **Cho trước** lỗi nhà cung cấp tạm thời và còn ngân sách lần thử tự động, **Khi** worker xử lý, **Thì** cùng công việc gốc đợi và thử lại mà không tốn thêm hạn mức.
2. **Cho trước** công việc chuẩn thất bại ở trạng thái kết thúc và còn ngân sách thử lại thủ công, **Khi** chủ sở hữu thử lại với khóa mới, **Thì** một công việc con trở thành chuẩn và tái sử dụng hạn mức gốc.
3. **Cho trước** công việc đã hoàn thành, người không phải chủ sở hữu, công việc chưa kết thúc, hết ngân sách thử lại thủ công, hoặc khóa phát lại đã gắn nơi khác, **Khi** yêu cầu thử lại, **Thì** không tạo công việc con.

### Câu chuyện 3 — Nhận kết quả ước tính có bằng chứng (Ưu tiên: P1)

Với tư cách học viên, tôi muốn nhận kết quả ước tính được gắn nhãn rõ ràng gồm bản ghi theo Part, bốn tiêu chí band, điểm Tổng, phản hồi, tuyên bố từ chối, và thông tin phiên bản.

**Kiểm thử độc lập**: Cung cấp ba tạo vật bằng chứng hoàn chỉnh và phản hồi chấm điểm có điểm Tổng cố ý sai; xác nhận kết quả công khai là `full_audio`, chứa cả bốn band đã xác thực, và sử dụng điểm Tổng do backend tính lại.

**Kịch bản chấp nhận**:

1. **Cho trước** bằng chứng âm thanh và bản ghi hoàn chỉnh cho cả ba Part và cổng ước tính được bật, **Khi** chấm xong, **Thì** học viên nhận kết quả đầu ra bắt buộc được gắn nhãn là ước tính AI.
2. **Cho trước** bản ghi rỗng, im lặng, âm thanh không hợp lệ, hoặc bằng chứng fluency/pronunciation không đủ, **Khi** pipeline đánh giá phiên, **Thì** không công bố tiêu chí band hay điểm Tổng và tuân theo chính sách retry/failed.
3. **Cho trước** điểm Tổng do nhà cung cấp trả về, **Khi** kết quả được xác thực, **Thì** giá trị đó bị bỏ qua và điểm Tổng được tính từ bốn tiêu chí band.

## 6. Trường hợp biên

- Cùng đối tượng tải lên được tái sử dụng cho nhiều Part hoặc nhiều lần nộp.
- Token tải lên hết hạn sau khi đối tượng đã được tải; phát lại trong/ngoài cửa sổ idempotency.
- Lease worker hết hạn sau khi nhận phản hồi nhà cung cấp nhưng trước khi lưu tạo vật/báo cáo.
- Các lần thử lại thủ công chạy đua, hoặc thử lại lần 1 thất bại trước khi yêu cầu thử lại lần 2.
- Metadata MIME âm thanh vượt kiểm tra sơ bộ nhưng byte giải mã, checksum, codec, thời lượng, hoặc nội dung giọng nói thất bại khi worker xác thực.
- URL tải xuống có chữ ký hết hạn trong khi đang phát lại.
- Bản ghi cũ có URL công khai/bản ghi nhưng không có đối tượng riêng tư đã xác minh hoặc công việc nguồn.
- Chế độ ước tính được bật mà không có gói hiệu chuẩn, trong khi công bố đã hiệu chuẩn được yêu cầu với gói thiếu/không hợp lệ.

## 7. Quy tắc nghiệp vụ

- **BR-SPK-001 [AS-BUILT]**: Chỉ học viên đã xác thực mới có thể nộp phiên Speaking AI; học viên chỉ có thể xem hoặc thử lại phiên của chính mình. Quyền truy cập đặc quyền khác phải được phân quyền độc lập.
- **BR-SPK-002 [AS-BUILT]**: Một phiên Speaking hoàn chỉnh chứa đúng một Part 1, một Part 2 và một Part 3 gắn với một bài thi Speaking đã công bố và phê duyệt.
- **BR-SPK-003 [AS-BUILT]**: Hạn mức được tính một lần khi đặt trước yêu cầu chấm AI gốc mới. Phát lại idempotent, thử lại tự động, hoặc thử lại thủ công con hợp lệ không tiêu tốn thêm đơn vị hạn mức.
- **BR-SPK-004 [AS-BUILT]**: Hạn mức gốc hàng ngày có thể cấu hình theo môi trường; không có giá trị nghiệp vụ phổ quát nào được hard-code trong quy tắc này.
- **BR-SPK-005 [AS-BUILT]**: Công việc gốc có hai lần thử xử lý; mỗi công việc con thủ công có một lần thử. Mặc định hiện tại cho phép tối đa hai lần thử lại thủ công.
- **BR-SPK-006 [AS-BUILT]**: Thử lại tự động chỉ được phép khi lỗi thuộc loại có thể thử lại và còn ngân sách lần thử. Thử lại thủ công chỉ được đề nghị khi công việc chuẩn ở trạng thái kết thúc `failed` và chưa hết giới hạn thử lại thủ công.
- **BR-SPK-007 [AS-BUILT]**: Âm thanh không hợp lệ, rỗng, im lặng, bị thay đổi, hoặc không đủ bằng chứng không thể tạo ra band công khai. Khả năng thử lại phụ thuộc vào phân loại lỗi; hệ thống không bao giờ bịa bằng chứng thiếu.
- **BR-SPK-008 [AS-BUILT]**: Bản ghi ASR được lưu riêng biệt với bản ghi hiển thị đã làm sạch. Bản ghi đã sửa/diễn giải lại không được thay thế bằng chứng ASR dùng cho chấm điểm.
- **BR-SPK-009 [AS-BUILT]**: Học viên chỉ có thể nhận bản ghi/âm thanh/kết quả qua đọc có phân quyền theo chủ sở hữu. Học viên chỉ thấy kết quả band sau khi công việc chuẩn hoàn thành với bằng chứng `full_audio`.
- **BR-SPK-010 [AS-BUILT]**: Kết quả bắt buộc cho học viên gồm bản ghi hiển thị và phản hồi theo từng Part, bốn kết quả tiêu chí, điểm Tổng do backend tính, tuyên bố từ chối ước tính, phiên bản pipeline, phiên bản hiệu chuẩn/ước tính, và thời gian tạo.
- **BR-SPK-011 [AS-BUILT]**: Bốn tiêu chí có trọng số bằng nhau là Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, và Pronunciation. Điểm Tổng được tính từ bốn band đó và không bao giờ tin tưởng giá trị từ nhà cung cấp.
- **BR-SPK-012 [AS-BUILT]**: Chỉ `full_audio` mới có thể công bố cả bốn band và điểm Tổng cho học viên. Bằng chứng chỉ-bản-ghi/một-phần không phải kết quả band cho học viên.
- **BR-SPK-013 [AS-BUILT]**: Điểm band ước tính AI là ước tính luyện tập, không phải kết quả IELTS chính thức. Công bố ước tính và công bố đã hiệu chuẩn là hai trạng thái sản phẩm riêng biệt.
- **BR-SPK-014 [AS-BUILT]**: Lỗi AI vẫn là lỗi AI và không tự động chuyển phiên sang giảng viên.
- **BR-SPK-015 [TARGET]**: Quyết toán hạn mức khi nhà cung cấp thất bại và thất bại ở trạng thái kết thúc phải tuân theo chính sách hoàn trả/tính phí đã phê duyệt mà không tính phí trùng cho các lần thử lại.
- **BR-SPK-016 [NEEDS CLARIFICATION]**: Thời hạn lưu giữ/xóa và vòng đời khóa mã hóa cho âm thanh, bản ghi ASR/hiển thị, tạo vật bằng chứng, và báo cáo chấm chưa được phê duyệt.
- **BR-SPK-017 [NEEDS CLARIFICATION]**: Chủ sản phẩm chưa xác nhận liệu hạn mức vẫn bị tiêu tốn hay được hoàn trả khi tất cả lần thử kết thúc ở lỗi nhà cung cấp/hạ tầng.
- **BR-SPK-018 [NEEDS CLARIFICATION]**: Hủy công việc hiện chưa được hỗ trợ; điều kiện hủy và ảnh hưởng đến hạn mức/dữ liệu cần quyết định sản phẩm.

## 8. Yêu cầu chức năng

- **FR-SPK-001 [AS-BUILT]**: Hệ thống phải xác thực vai trò đã xác thực và quyền sở hữu bản ghi cho các thao tác nộp, trạng thái, thử lại, âm thanh, bản ghi, và kết quả.
- **FR-SPK-002 [AS-BUILT]**: Hệ thống phải cấp URL tải lên có chữ ký giới hạn thời gian tới lưu trữ riêng tư và gắn mỗi ủy quyền tải lên với chủ sở hữu, Part, MIME, kích thước byte, checksum SHA-256, thời lượng khai báo, định danh đối tượng, và thời hạn.
- **FR-SPK-003 [AS-BUILT]**: Hệ thống phải từ chối MIME không hỗ trợ, đối tượng trên 50 MiB, metadata không hợp lệ, đối tượng trùng, đối tượng thiếu, và metadata đối tượng không khớp.
- **FR-SPK-004 [AS-BUILT]**: Hệ thống phải chấp nhận đúng Part 1/2/3 và phân giải đề bài từ bài thi Speaking đã công bố và phê duyệt.
- **FR-SPK-005 [AS-BUILT]**: Lần nộp mới phải lưu nguyên tử ba bản ghi Part và một công việc chấm gốc; yêu cầu HTTP không chờ nhà cung cấp AI.
- **FR-SPK-006 [AS-BUILT]**: Khóa idempotency và dấu vân tay đầu vào phải ngăn nộp logic trùng lặp trong cả phát lại tuần tự và đồng thời.
- **FR-SPK-007 [AS-BUILT]**: Hạn mức gốc được tính theo ngày UTC; phát lại và thử lại con tham chiếu đến gốc mang hạn mức.
- **FR-SPK-008 [AS-BUILT]**: Trạng thái chuẩn được chọn từ công việc mới nhất trong chuỗi thử lại và cho biết thử lại thủ công còn khả dụng hay không.
- **FR-SPK-009 [AS-BUILT]**: Worker phải sử dụng sở hữu lease, heartbeat, hàng rào generation, thử lại tự động có giới hạn, và phục hồi lease hết hạn.
- **FR-SPK-010 [AS-BUILT]**: Xử lý worker phải xác minh byte đã lưu và metadata, chuẩn hóa âm thanh, tạo bản ghi ASR tiếng Anh, và thu thập bằng chứng fluency/pronunciation cho mỗi Part.
- **FR-SPK-011 [AS-BUILT]**: Mỗi công việc thử lại phải tạo/tái sử dụng chỉ tạo vật thuộc phạm vi công việc nguồn đó; bằng chứng thử lại không được ngầm tái sử dụng tạo vật của công việc trước.
- **FR-SPK-012 [AS-BUILT]**: Bộ xác thực kết quả phải làm sạch đầu ra, yêu cầu bốn giá trị tiêu chí nửa-band hợp lệ cho `full_audio`, và tính lại điểm Tổng từ các giá trị đó.
- **FR-SPK-013 [AS-BUILT]**: Phép chiếu học viên chỉ công bố kết quả công khai hoàn chỉnh trong danh sách cho phép và phải ẩn đầu ra xem xét/trung gian/nhà cung cấp.
- **FR-SPK-014 [AS-BUILT]**: Frontend phải tải trực tiếp lên lưu trữ có chữ ký, nộp một lần, truy vấn trạng thái với backoff, khôi phục nhóm đang chờ sau khi làm mới, hiển thị thử lại chỉ khi được ủy quyền, và hiển thị band chỉ cho kết quả `completed/full_audio` có thể công bố.
- **FR-SPK-015 [TARGET]**: Văn bản UI học viên phải phân biệt rõ ràng bài nộp do giảng viên chọn với bất kỳ phản hồi AI lỗi/thiếu nào và không bao giờ ngụ ý rằng bằng chứng AI không đủ sẽ kích hoạt chuyển giao cho giảng viên.
- **FR-SPK-016 [TARGET]**: Công bố đã hiệu chuẩn phải bị vô hiệu hóa cho đến khi gói hiệu chuẩn có phiên bản, kiểm tra ràng buộc, phê duyệt, và bằng chứng phát hành lặp lại được triển khai.
- **FR-SPK-017 [TARGET]**: Quy trình lưu giữ/xóa phải được triển khai sau khi BR-SPK-016 được quyết định.

## 9. Yêu cầu phi chức năng

- **NFR-SPK-001 [AS-BUILT]**: Mọi đọc/ghi được bảo vệ phải thực thi phạm vi chủ sở hữu/vai trò và trả phản hồi riêng tư, không cache cho dữ liệu trạng thái/tải lên nhạy cảm.
- **NFR-SPK-002 [AS-BUILT]**: Lưu trữ âm thanh phải là riêng tư; URL tải lên và tải xuống có chữ ký mặc định hết hạn 300 giây và không được lưu trữ lâu dài.
- **NFR-SPK-003 [AS-BUILT]**: Nhật ký/đo lường không được chứa âm thanh thô, bản ghi, URL có chữ ký, prompt thô, đường dẫn đối tượng, thông tin xác thực, hoặc chẩn đoán nhà cung cấp chưa biên tập.
- **NFR-SPK-004 [TARGET]**: Yêu cầu tải lên/xếp hàng không qua nhà cung cấp phải đáp ứng mục tiêu p95 dưới 500 ms của dự án ở tải staging đã thỏa thuận; bằng chứng tải hiện tại chưa có.
- **NFR-SPK-005 [TARGET]**: p50/p95 pipeline và tỷ lệ timeout/thất bại phải được đo trên âm thanh ba Part đại diện trước phát hành; ngưỡng chấp nhận vẫn là quyết định phát hành rõ ràng chứ không phải tuyên bố HIỆN CÓ.
- **NFR-SPK-006 [AS-BUILT]**: Yêu cầu đồng thời/thử lại và worker cũ phải được tuần tự hóa hoặc hàng rào để một công việc/báo cáo chuẩn có thẩm quyền.
- **NFR-SPK-007 [AS-BUILT]**: Checksum, dấu vân tay, digest snapshot đề bài, tạo vật bất biến theo phạm vi công việc, và hoàn tất giao dịch phải bảo vệ tính toàn vẹn dữ liệu.
- **NFR-SPK-008 [AS-BUILT]**: Worker runtime yêu cầu bộ giải mã/thăm dò media đã cấu hình; xác minh khởi động/phát hành phải thất bại khi công cụ media bắt buộc không khả dụng.
- **NFR-SPK-009 [TARGET]**: Hành vi service/truy vấn/API phải có kiểm thử happy, negative, phân quyền, đồng thời, và phục hồi với ít nhất 80% coverage logic service/nghiệp vụ; phần trăm coverage tập trung hiện tại chưa được chứng minh.
- **NFR-SPK-010 [TARGET]**: Kiểm soát lưu giữ và quản lý khóa không thể vượt qua đánh giá phát hành cho đến khi BR-SPK-016 được phê duyệt và xác minh.

## 10. Thực thể chính

- **Phiên Speaking**: Phiên luyện tập thuộc sở hữu học viên chứa đúng ba Part có thứ tự.
- **Tài sản âm thanh**: Bản ghi Part riêng tư cùng metadata toàn vẹn khai báo và đã xác minh.
- **Yêu cầu chấm gốc**: Yêu cầu mang hạn mức, idempotent cho một phiên Speaking.
- **Công việc thử lại**: Lần thử phân tích con mà thành viên mới nhất trở thành chuẩn.
- **Tạo vật phân tích**: Bản ghi/bằng chứng âm thanh thuộc phạm vi công việc cho một Part.
- **Báo cáo chấm**: Kết quả kết thúc trong danh sách cho phép dành cho học viên cùng metadata phiên bản/kiểm toán.

## 11. Tiêu chí thành công

- **SC-SPK-001 [TARGET]**: Hai mươi lần nộp đồng thời giống hệt tạo đúng một công việc gốc và ba bản ghi Part, với tất cả phản hồi phân giải cùng một nhóm chuẩn.
- **SC-SPK-002 [TARGET]**: 100% các fixture checksum/định dạng/giải mã/im lặng/bằng chứng không đủ công bố không có band cho học viên.
- **SC-SPK-003 [TARGET]**: 100% kết quả thành công cho học viên chứa đúng ba mục bản ghi/phản hồi theo Part, bốn band tiêu chí hợp lệ, điểm Tổng do backend tính, tuyên bố từ chối, và metadata phiên bản.
- **SC-SPK-004 [TARGET]**: Trong kiểm thử lease cũ với ít nhất hai worker, 100% ghi từ generation bị thay thế bị từ chối.
- **SC-SPK-005 [TARGET]**: Kiểm thử thử lại tự động/thủ công tạo một chuỗi chuẩn, không bao giờ tốn thêm hạn mức, và không bao giờ tạo phân công giảng viên.
- **SC-SPK-006 [TARGET]**: Kiểm thử phân quyền từ chối mọi nỗ lực truy cập âm thanh, bản ghi, trạng thái, thử lại, và kết quả chéo chủ sở hữu.
- **SC-SPK-007 [TARGET]**: p95 xếp hàng dưới 500 ms ở tải staging đã phê duyệt, và chỉ số độ trễ pipeline được ghi nhận trước phát hành.
- **SC-SPK-008 [TARGET]**: Coverage tự động tập trung đạt ít nhất 80%, diễn tập migration thành công trên CSDL dùng một lần, và không có kiểm thử nào gọi nhà cung cấp thật.

## 12. Giả định

- Danh tính học viên đã xác thực hiện có và danh mục bài thi Speaking đã công bố vẫn khả dụng.
- Giá trị môi trường có thể ghi đè giá trị mặc định trong mã nguồn; `.env.example` không phải bằng chứng của giá trị production thực tế.
- Cổng ước tính band và công bố đã hiệu chuẩn vẫn tách biệt.
- Bản ghi bản ghi/âm thanh công khai cũ là dữ liệu tương thích hiển thị, không phải bằng chứng đáng tin cậy cho kết quả mới.

## 13. Phụ thuộc

- Lưu trữ đối tượng riêng tư với khả năng tải lên/tải xuống có chữ ký.
- Schema PostgreSQL cho hàng đợi/báo cáo/tạo vật và trình chạy migration.
- Worker runtime với công cụ xử lý media và bộ chuyển đổi AI đã cấu hình.
- Frontend hỗ trợ ghi âm cho tập MIME âm thanh được chấp nhận.

## 14. Câu hỏi mở

1. **BR-SPK-016**: Thời hạn lưu giữ/xóa và vòng đời khóa mã hóa đã phê duyệt cho âm thanh, bản ghi, tạo vật, và báo cáo là gì?
2. **BR-SPK-017**: Đơn vị hạn mức gốc có bị tiêu tốn sau khi thất bại ở trạng thái kết thúc do nhà cung cấp/hạ tầng không, và nếu không, nó được hoàn trả ở chuyển trạng thái kết thúc nào?
3. **BR-SPK-018**: Học viên/quản trị viên có được phép hủy công việc đang xếp hàng/đang chạy không, và hậu quả về hạn mức cùng dọn dẹp là gì?
