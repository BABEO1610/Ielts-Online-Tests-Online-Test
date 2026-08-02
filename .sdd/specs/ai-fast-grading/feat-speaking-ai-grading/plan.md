# Kế hoạch triển khai: Chấm điểm Speaking bằng AI

**Đặc tả**: [spec.md](./spec.md)
**Công việc**: [tasks.md](./tasks.md)
**Danh sách kiểm tra yêu cầu**: [checklist.md](./checklist.md)
**Hợp đồng máy đọc được**: [contracts/speaking-grading.openapi.yaml](./contracts/speaking-grading.openapi.yaml)

## 1. Tóm tắt

Kiến trúc monolith module hiện có chấp nhận ba tải lên âm thanh riêng tư, đặt trước hạn mức cùng một công việc idempotent trên PostgreSQL, và xử lý trong worker riêng biệt. Worker xác thực âm thanh, tạo bản ghi/bằng chứng giọng nói thuộc phạm vi công việc, chấm bốn tiêu chí Speaking, tính lại điểm Tổng, và chỉ công bố kết quả `completed/full_audio` trong danh sách cho phép cho học viên. Công việc còn lại được gắn cổng rõ ràng trong [tasks.md](./tasks.md); kế hoạch này không tuyên bố sẵn sàng production.

## 2. Bối cảnh kỹ thuật

- **Runtime**: Node.js 20 mục tiêu; Express 5.x; CommonJS; PostgreSQL 16 qua `pg`.
- **Frontend**: Repository hiện phân giải React 19/Vite 8, xung đột với tuyên bố React 18 của Hiến chương và cần giải quyết qua quản trị; không có thay đổi mã nguồn nào được ủy quyền tại đây.
- **Lưu trữ**: Lưu trữ đối tượng riêng tư tương thích Supabase/S3 với bộ chuyển đổi giả cho kiểm thử.
- **Media**: Worker yêu cầu `ffmpeg` và `ffprobe` cho xác thực/chuẩn hóa.
- **Ranh giới AI**: Gateway hiện có cùng các bộ chuyển đổi phiên âm, bằng chứng giọng nói, và chấm điểm theo rubric.
- **Kiểm thử**: Jest/Supertest và Vitest/Testing Library; các nhà cung cấp bên ngoài được mock cho kiểm thử tự động.
- **Nguồn hiệu năng**: Mục tiêu p95 phi-AI của dự án là dưới 500 ms. Mục tiêu pipeline chưa được phê duyệt và vẫn là cổng đo lường/phát hành.

### Bằng chứng cấu hình

| Mối quan tâm | Giá trị mặc định mã nguồn | `.env.example` | Giải thích |
|---|---:|---:|---|
| Hạn mức chấm AI gốc/ngày | 10 | 15 | Có thể cấu hình theo môi trường. Giá trị mẫu không phải bằng chứng cấu hình production. Quy tắc nghiệp vụ cố ý không hard-code 10 hay 15. |
| Lần thử gốc | 2 | không ghi đè | Bất biến schema/truy vấn HIỆN CÓ. |
| Lần thử con | 1 | không ghi đè | Bất biến schema/truy vấn HIỆN CÓ. |
| Thử lại thủ công | 2 | 2 | Có thể cấu hình, mặc định/mẫu hiện tại đồng nhất. |
| TTL URL tải lên/tải xuống có chữ ký | 300 giây | 300 giây | Mặc định/mẫu HIỆN CÓ. |
| Lease worker | 120 giây | 120 giây | Mặc định/mẫu HIỆN CÓ. |

## 3. Kiểm tra Hiến chương

| Cổng | Trạng thái | Bằng chứng/hành động |
|---|---|---|
| SQL tham số hóa thô; không ORM | ĐẠT cho luồng đã kiểm toán | Truy vấn dùng tham số vị trí; định danh động không được dùng trong luồng học viên. |
| Xác thực/phân quyền | ĐẠT cho endpoint học viên đã kiểm toán | Route/controller/service thực thi quyền sở hữu học viên; đọc đặc quyền có phạm vi. |
| Bao phản hồi chuẩn | ĐẠT cho phản hồi controller Speaking đã kiểm toán | Phản hồi thành công nhạy cảm bao gồm `success/data/error/meta`; lỗi vẫn tập trung. |
| Xử lý riêng tư/an toàn PII | MỘT PHẦN | Lưu trữ và chẩn đoán đã được bảo vệ; quyết định lưu giữ/KMS còn mở. |
| 80% coverage service/nghiệp vụ | CHƯA CHỨNG MINH | Kiểm thử tập trung chỉ đạt sau xác minh; bằng chứng ngưỡng coverage vẫn là MỤC TIÊU. |
| Quy tắc runtime/phiên bản | MỘT PHẦN | Backend mục tiêu khớp; phiên bản React frontend xung đột với Hiến chương. |

## 4. Kiến trúc hiện có

```text
UI học viên
  -> vé tải lên có chữ ký x3 -> PUT trực tiếp lưu trữ riêng tư x3
  -> nộp đầy đủ + khóa idempotency
  -> controller -> dịch vụ nộp -> hạn mức/công việc + giao dịch ba Part
  <- 202 + URL trạng thái chuẩn
  -> UI truy vấn/thử lại/kết quả

Worker Speaking
  -> claim công việc chuẩn chạy được với lease/generation
  -> xác minh/tải xuống/chuẩn hóa mỗi Part
  -> ASR + bằng chứng giọng nói -> tạo vật thuộc phạm vi công việc
  -> chấm bốn tiêu chí -> bộ xác thực tính lại điểm Tổng
  -> báo cáo + nhóm + giao dịch kết thúc công việc
  -> retry_wait/failed khi lỗi; không chuyển giao giảng viên
```

API và worker là các tiến trình riêng biệt dùng cùng gói backend. Thao tác nhà cung cấp/lưu trữ/media xảy ra ngoài giao dịch xếp hàng.

## 5. Luồng yêu cầu và dữ liệu

1. Frontend tính SHA-256, MIME, byte, số Part, và thời lượng rồi yêu cầu URL tải lên có chữ ký.
2. Server tạo khóa đối tượng cách ly và token tải lên ẩn gắn với chủ sở hữu và metadata.
3. Trình duyệt tải trực tiếp không cần thông tin xác thực ứng dụng.
4. Nộp đầy đủ xác thực đúng Part/token, kiểm tra bản ghi idempotency hiện có, kiểm tra sơ bộ metadata đối tượng, rồi mở giao dịch.
5. Giao dịch khóa định danh âm thanh, phân giải đề bài đã phê duyệt/công bố, kiểm tra dấu vân tay trước hạn mức, đặt trước công việc gốc, và chèn ba hàng Part.
6. Worker claim công việc, heartbeat trong mỗi thao tác ngoài, xác minh byte/checksum/thời lượng, chuẩn hóa âm thanh, và tạo bằng chứng.
7. Tạo vật thuộc phạm vi công việc cung cấp cho bộ chấm điểm. Bộ xác thực bỏ qua điểm Tổng từ nhà cung cấp và tính điểm Tổng công khai từ bốn band.
8. Frontend truy vấn thành viên mới nhất trong chuỗi thử lại và chỉ hiển thị kết quả khi trạng thái chuẩn là `completed/full_audio`.

## 6. Tóm tắt hợp đồng API

| Phương thức | Đường dẫn hiện có | Phân quyền | Tóm tắt hợp đồng |
|---|---|---|---|
| POST | `/api/v1/submissions/speaking/audio-uploads` | học viên | Trả URL tải lên giới hạn thời gian/token; phản hồi nhạy cảm là no-store. |
| POST | `/api/v1/submissions/speaking/full` | học viên | Nhánh AI trả 202 và location trạng thái; nhánh giảng viên riêng nằm ngoài tính năng học viên này. |
| GET | `/api/v1/submissions/speaking/:speakingGroupId/grading-status` | chủ sở hữu/giảng viên được phân công/quản trị | Trả trạng thái chuẩn và phép chiếu kết quả được ủy quyền. |
| POST | `/api/v1/submissions/speaking/:speakingGroupId/retry-grading` | học viên chủ sở hữu | Tạo/phát lại một công việc con đủ điều kiện. |
| GET | `/api/v1/submissions/:id/audio-url?type=speaking` | chủ sở hữu/giảng viên được phân công/quản trị | Trả URL tải xuống có chữ ký theo yêu cầu. |

Hợp đồng OpenAPI giữ trong thư mục tính năng vì kiểm thử hợp đồng tự động đọc nó. Ghi chú kiểm toán do người dùng cung cấp nói kiểm thử tham chiếu `.sdd/specs/ai-fast-grading/contracts/...`; bằng chứng worktree hiện tại mâu thuẫn ghi chú đó: `backend/tests/contract/speakingGradingOpenApi.test.js` hiện phân giải `.sdd/specs/ai-fast-grading/feat-speaking-ai-grading/contracts/speaking-grading.openapi.yaml`, đó là file hiện có. Không di chuyển/xóa hợp đồng nào. T031 vẫn mở để thiết lập và thực thi một vị trí chuẩn trên cả quy trình ngoài lẫn kiểm thử repository.

## 7. Tóm tắt mô hình dữ liệu

- `speaking_submissions`: đúng ba Part có thứ tự thuộc sở hữu học viên, snapshot đề bài, metadata đối tượng riêng tư, checksum đã xác minh, trạng thái chấm, và trường xóa mềm.
- `ai_grading_jobs`: chuỗi thử lại gốc/con, idempotency/dấu vân tay, ngân sách lần thử, trạng thái/giai đoạn chuẩn, chủ lease/hạn/generation, và digest cấu hình.
- `speaking_analysis_artifacts`: bản ghi ASR/hiển thị bất biến và bằng chứng giọng nói gắn với một Part và một công việc nguồn.
- `ai_grading_reports`: một kết quả kết thúc trong danh sách cho phép cho mỗi công việc, bao gồm phép chiếu tiêu chí, band tính toán, chế độ bằng chứng, và metadata phiên bản.

Migration `026_create_speaking_analysis_artifacts.sql` tạo `speaking_analysis_artifacts`. Migration `030_retry_speaking_artifacts_by_job.sql` thay thế quy tắc duy nhất trước đó bằng `(speaking_submission_id, audio_sha256, scoring_config_sha256, source_job_id)`. Điều này bắt buộc bởi truy vấn và ngữ nghĩa thử lại hiện tại: thử lại thủ công tạo công việc con mới và phải nhận tạo vật riêng biệt ngay cả cho cùng âm thanh. Kiểm thử unit migration/truy vấn xác nhận rõ ràng tính duy nhất theo phạm vi công việc này; migration 030 không phải thừa hay sai trong thiết kế đã kiểm toán.

## 8. Máy trạng thái

```text
gốc:  queued -> running -> completed
                    |-> retry_wait -> running
                    `-> failed

chuẩn failed -> con thủ công queued -> running -> completed|failed
con failed   -> con thứ hai queued -> running -> completed|failed

phép chiếu nhóm:
completed -> ai_graded
failed    -> grading_failed
needs_review -> chỉ đọc tương thích legacy/admin/giảng viên; worker học viên hiện không tạo
```

Gốc có `max_attempts=2`; mỗi con có `max_attempts=1`; giới hạn thử lại thủ công mặc định hiện tại là hai. Thành viên mới nhất trong chuỗi thử lại là chuẩn.

## 9. Thiết kế bảo mật và quyền riêng tư

- Tên đối tượng cách ly riêng tư do server tạo; client chỉ nhận URL có chữ ký và token ứng dụng ẩn.
- Token tải lên và các kiểm tra worker sau đó bao gồm chủ sở hữu, Part, MIME, kích thước, checksum, thời lượng, định danh đối tượng, và hạn/tính bất biến.
- Đọc trạng thái/âm thanh/kết quả áp dụng phân quyền chủ sở hữu, phân công, hoặc quản trị trước khi trả dữ liệu.
- URL có chữ ký được tạo theo yêu cầu, ngắn hạn, no-store khi áp dụng, và không được lưu trữ lâu dài.
- Chẩn đoán sử dụng làm sạch URL, đường dẫn đối tượng, nhãn bản ghi/âm thanh/đề bài, bí mật, và ký tự điều khiển.
- Lưu giữ/xóa và vòng đời KMS vẫn là cổng chặn phát hành, không phải hành vi ngầm.

## 10. Chiến lược nhà cung cấp và dự phòng

- Yêu cầu tự động dùng các bộ chuyển đổi đã cấu hình và xác thực/làm sạch mọi đầu ra.
- Lỗi nhà cung cấp/mạng/timeout có thể thử lại kích hoạt thử lại tự động có giới hạn; lỗi âm thanh/bằng chứng/cấu hình không thể thử lại kết thúc ở `failed`.
- Không tin tưởng hoặc tiết lộ điểm Tổng hay phản hồi thô từ nhà cung cấp.
- Không có dự phòng nào chuyển bài nộp AI thành bài nộp giảng viên.
- Công bố ước tính có thể hoạt động theo cổng/phiên bản riêng; công bố đã hiệu chuẩn vẫn bị vô hiệu hóa cho đến khi MỤC TIÊU hiệu chuẩn được triển khai và phê duyệt.

## 11. Chiến lược lưu trữ

- Âm thanh học viên mới dùng lưu trữ đối tượng riêng tư và PUT có chữ ký trực tiếp.
- CSDL lưu định danh đối tượng ổn định và metadata toàn vẹn, không bao giờ lưu URL có chữ ký.
- Dọn dẹp đối chiếu đối tượng cách ly cũ với bản ghi CSDL đã gắn.
- Hàng URL/bản ghi công khai cũ chỉ tương thích đọc và không được nâng cấp thành công việc/tạo vật tổng hợp.

## 12. Thiết kế thử lại, idempotency, và đồng thời

- Phát lại idempotency được kiểm tra trước kiểm tra sơ bộ đối tượng/hạn mức khi có thể; phát lại đã chấp nhận xác thực biểu diễn đã lưu.
- Dấu vân tay xác định ngăn cùng đầu vào logic được nộp dưới khóa khác.
- Khóa tư vấn tuần tự hóa định danh âm thanh dùng chung; tính duy nhất gốc bảo vệ nhóm/dấu vân tay/idempotency.
- Claim công việc tuần tự hóa công việc chạy được; heartbeat cùng hàng rào generation lease ngăn worker cũ.
- Thử lại thủ công khóa gốc, duyệt chuỗi, tạo tối đa một con cho mỗi cha thất bại, và đặt lại trạng thái cả ba Part nguyên tử.

## 13. Quan sát được

- Ghi lại giai đoạn, kết quả, lần thử, thời lượng, định danh nhà cung cấp/mô hình, và mã lỗi đã làm sạch; không ghi nội dung học viên thô hay thông tin xác thực.
- Bằng chứng phát hành phải bao gồm riêng biệt độ trễ xếp hàng, độ trễ pipeline, phục hồi thử lại/watchdog, tỷ lệ lỗi nhà cung cấp, và từ chối ghi cũ.
- Kiểm thử tập trung hiện có là bằng chứng hành vi, không phải bằng chứng hiệu năng production hay phần trăm coverage.

## 14. Chiến lược kiểm thử

- **Unit**: xác thực metadata/token, hạn mức/idempotency, truy vấn hàng đợi/tạo vật, bộ chuyển đổi media/bằng chứng, bộ chấm/xác thực kết quả, worker thử lại/hàng rào, watchdog.
- **Hợp đồng**: hành vi HTTP Speaking và phân tích/tham chiếu/phép chiếu phản hồi OpenAPI.
- **Tích hợp**: chuỗi thử lại thủ công/đồng thời, phân quyền, và hành vi schema CSDL dùng một lần.
- **Frontend**: PUT có chữ ký, đúng Part, guard nộp, truy vấn/backoff/làm mới, hiển thị thử lại, hết hạn âm thanh có chữ ký, biên tập/hiển thị kết quả.
- **Chỉ phát hành**: diễn tập migration trên CSDL dùng một lần, tải/chaos, và smoke nhà cung cấp được ủy quyền rõ ràng; không gọi nhà cung cấp thật trong tác vụ tài liệu này.

## 15. Triển khai và cấu hình

- API dùng `npm start`; worker dùng `npm run worker` và không mở cổng HTTP.
- Image backend phải cung cấp binary media và chạy kiểm tra sơ bộ runtime.
- Thứ tự triển khai phải xác thực kiểm tra cấu hình/image/migration trước khi khởi động API và worker.
- Hạn mức production thực tế và feature flag phải được xác minh từ cấu hình triển khai đã phê duyệt mà không in bí mật. Giá trị `.env.example` là 15 chỉ là mẫu; giá trị mặc định mã nguồn là 10.

## 16. Khoảng trống đã biết và cổng phát hành

1. Quyết định lưu giữ/xóa/KMS, quyết toán hạn mức khi thất bại kết thúc, và ngữ nghĩa hủy bỏ.
2. Xóa hoặc bảo vệ dự phòng UI học viên mập mờ có thể nói "đã chuyển cho giảng viên" chỉ khi `job_id` vắng mặt, mặc dù lỗi AI không bao giờ chuyển giao.
3. Triển khai và phê duyệt ánh xạ/ràng buộc/bằng chứng công bằng hiệu chuẩn trước khi bật công bố đã hiệu chuẩn.
4. Diễn tập migration 025/026/030 trên CSDL dùng một lần mới và cũ; chạy kiểm tra sao lưu/phục hồi.
5. Đo coverage, độ trễ xếp hàng/pipeline, đồng thời, và phục hồi chaos; chạy smoke nhà cung cấp được ủy quyền riêng biệt.
6. Giải quyết sai lệch Hiến chương/runtime (luật React 18 so với dependency React 19) qua quản trị, không phải thay đổi chỉ-tài-liệu này.

## 17. Ánh xạ yêu cầu-thành-phần

| Yêu cầu | Thành phần code/migration chính | Kiểm thử bằng chứng |
|---|---|---|
| BR-SPK-001–004; FR-SPK-001–007 | `speakingGrading.controller.js`, `speakingSubmission.*`, `aiQuota.service.js`, bộ chuyển đổi route/lưu trữ/token | `speakingGrading.contract.test.js`, `speakingSubmission.service.test.js` |
| BR-SPK-005–007; FR-SPK-008–009 | `speakingGradingRetry.service.js`, `aiGradingJobs.queries.js`, worker/watchdog, migration 025 | `speakingGradingRetry.test.js`, `aiGrading.worker.test.js`, `aiGrading.watchdog.test.js` |
| BR-SPK-008–014; FR-SPK-010–014 | dịch vụ bằng chứng/chấm điểm, bộ chuyển đổi phiên âm/bằng chứng/chấm/xác thực kết quả, truy vấn tạo vật/báo cáo, migration 026/030, frontend học viên | kiểm thử tập trung bằng chứng/chấm/xác thực/worker/truy vấn/migration/frontend |
| FR-SPK-015–017; BR-SPK-015–018 | công việc MỤC TIÊU chính sách/UI/hiệu chuẩn/lưu giữ liệt kê trong tasks | kiểm thử mới cần bởi T020–T030 |
| NFR-SPK-001–010; SC-SPK-001–008 | cấu hình lưu trữ/bảo mật/runtime/triển khai/kiểm thử xuyên suốt | kiểm thử hợp đồng, phân quyền, đồng thời, runtime, bằng chứng coverage/tải/phát hành |

## 18. Quyết định tạo vật

- Giữ `spec.md`, `plan.md`, `tasks.md`, và `checklist.md` là bộ SDD cốt lõi của tính năng.
- Giữ `contracts/speaking-grading.openapi.yaml` vì `backend/tests/contract/speakingGradingOpenApi.test.js` đọc trực tiếp.
- Không di chuyển hoặc xóa bất kỳ tạo vật nào trong tác vụ chỉ-tài-liệu này.
