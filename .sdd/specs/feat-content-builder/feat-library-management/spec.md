# Đặc tả tính năng: Quản lý Thư viện Tài nguyên (Library Management)

**Ngày tạo**: 2026-07-27
**Trạng thái**: Final
**Phân loại**: Mỗi mục quy chuẩn được gắn nhãn `AS-BUILT`, `TARGET`, hoặc `NEEDS CLARIFICATION`.

## 1. Tổng quan tính năng và bối cảnh nghiệp vụ

IELTSZone cung cấp một Thư viện Tài nguyên tập trung cho phép Giảng viên (Tutor) và Quản trị viên (Admin) tải lên và quản lý các file phục vụ xây dựng nội dung đề thi: âm thanh Listening (MP3, WAV, WebM...), tài liệu đọc (PDF), và file nén (ZIP, RAR). Mọi file phải được kiểm tra định dạng thực tế bằng Magic Bytes trước khi lưu trữ lên Supabase Storage, và phải qua quy trình phê duyệt của Admin trước khi xuất hiện trong thư viện chung công khai.

## 2. Phạm vi

- Tải lên (upload) file audio, PDF, file nén với xác thực định dạng bằng Magic Bytes.
- Lưu metadata của file vào bảng `library_resources` (tên, URL, kích thước, loại, danh mục, người upload).
- Trạng thái phê duyệt hai bước: `pending` → `approved`/`rejected` do Admin xử lý.
- Giảng viên xem và quản lý tài nguyên của chính mình ở mọi trạng thái qua endpoint `/mine`.
- Xóa file vật lý trên Supabase bucket khi xóa bản ghi khỏi DB.
- Danh sách thư viện công khai chỉ hiển thị tài nguyên đã được phê duyệt (`review_status = 'approved'`).

## 3. Ngoài phạm vi

- Chỉnh sửa nội dung file sau khi đã upload (chỉ hỗ trợ upload lại).
- Streaming audio trực tiếp từ thư viện đến người dùng cuối (chỉ cung cấp URL).
- Phân loại tự động nội dung file bằng AI.
- Đặt quyền truy cập chi tiết theo từng tài nguyên (fine-grained ACL); hiện tại chỉ phân theo trạng thái published/approved.

## 4. Tác nhân và tóm tắt phân quyền

| Tác nhân | Hành vi được phép |
|---|---|
| Giảng viên (Tutor) | Upload file mới, xem/sửa/xóa tài nguyên của chính mình (kể cả khi đang `pending`). Không thể phê duyệt tài nguyên. |
| Quản trị viên (Admin) | Toàn quyền: upload, xem tất cả tài nguyên, phê duyệt (`approved`/`rejected`), xóa bất kỳ tài nguyên nào. |
| Học viên/Khách | Chỉ xem danh sách và chi tiết tài nguyên đã được phê duyệt (`review_status = 'approved'`). Không thể upload hay xóa. |

## 5. Câu chuyện người dùng và kiểm thử độc lập

### Câu chuyện 1 — Upload file tài nguyên an toàn (Ưu tiên: P1)

Với tư cách Giảng viên, tôi muốn tải file audio MP3 hoặc tài liệu PDF lên hệ thống và nhận lại URL lưu trữ, để sử dụng làm nguyên liệu khi xây dựng đề thi Listening hoặc Reading.

**Kiểm thử độc lập**: Gọi `POST /api/v1/library` với file MP3 hợp lệ và xác minh nhận HTTP 201 kèm URL. Gọi lại với file `.exe` đổi tên thành `.pdf` và xác minh nhận HTTP 422. Không cần các module khác chạy.

**Kịch bản chấp nhận**:

1. **Cho trước** một file MP3 hợp lệ, **Khi** Giảng viên gọi `POST /api/v1/library`, **Thì** hệ thống kiểm tra MIME type bằng Magic Bytes, lưu file lên Supabase bucket, lưu metadata vào DB và trả về HTTP 201 kèm URL.
2. **Cho trước** một file nén `.zip` hợp lệ, **Khi** Giảng viên gọi API upload, **Thì** hệ thống nhận diện signature của file nén và upload thành công mà không dựa vào extension do client khai báo.
3. **Cho trước** một file `.exe` đổi tên thành `.pdf`, **Khi** Giảng viên gọi API upload, **Thì** hệ thống phát hiện MIME type thực tế không hợp lệ qua Magic Bytes và từ chối với HTTP 422.

### Câu chuyện 2 — Xem và quản lý tài nguyên theo trạng thái phê duyệt (Ưu tiên: P1)

Với tư cách Giảng viên, tôi muốn thấy ngay tài nguyên vừa upload (dù chưa được duyệt) trong trang quản lý của mình, đồng thời tài nguyên đó không được hiển thị trong thư viện chung cho đến khi Admin phê duyệt.

**Kiểm thử độc lập**: Upload một file thành công, gọi `GET /api/v1/library/mine` và xác minh file xuất hiện với `review_status = 'pending'`. Gọi `GET /api/v1/library` (endpoint công khai) và xác minh file đó chưa xuất hiện.

**Kịch bản chấp nhận**:

1. **Cho trước** Giảng viên vừa upload thành công và file đang ở trạng thái `pending`, **Khi** Giảng viên gọi `GET /api/v1/library/mine`, **Thì** file đó xuất hiện trong danh sách với đúng trạng thái `pending`.
2. **Cho trước** file đang ở trạng thái `pending`, **Khi** bất kỳ người dùng nào gọi `GET /api/v1/library` (danh sách công khai), **Thì** file đó không xuất hiện trong kết quả trả về.
3. **Cho trước** Admin phê duyệt file (chuyển `review_status = 'approved'`), **Khi** bất kỳ người dùng nào gọi `GET /api/v1/library`, **Thì** file đó xuất hiện trong danh sách công khai.

## 6. Trường hợp biên

- Upload file trên giới hạn 200 MB — server phải từ chối trước khi đọc toàn bộ buffer.
- Kết nối mạng chập chờn trong khi upload file lớn (~200 MB) — cần xử lý timeout và trả lỗi rõ ràng.
- Thư viện `file-type` (v19) là ESM module — cần dùng `dynamic import()` trong môi trường CommonJS.
- Xóa bản ghi DB thành công nhưng xóa file trên Supabase thất bại — cần xử lý nhất quán (rollback hoặc ghi nhận lỗi).
- Giảng viên cố gắng sửa/xóa tài nguyên của Giảng viên khác.
- File upload có tên trùng với file đã tồn tại trên bucket — cần xử lý collision.

## 7. Quy tắc nghiệp vụ

- **BR-LIB-001 [AS-BUILT]**: Chỉ người dùng có role `tutor` hoặc `admin` mới được phép upload, sửa, và xóa tài nguyên. Endpoint xem danh sách và chi tiết tài nguyên đã duyệt là public.
- **BR-LIB-002 [AS-BUILT]**: Định dạng file phải được xác thực bằng Magic Bytes (thư viện `file-type`) trước khi upload. Hệ thống không tin vào extension hoặc `Content-Type` do trình duyệt khai báo.
- **BR-LIB-003 [AS-BUILT]**: Giới hạn kích thước tối đa mỗi file là **200 MB** để tránh crash khi đọc toàn bộ file vào bộ nhớ.
- **BR-LIB-004 [AS-BUILT]**: Tài nguyên mới upload mặc định có `review_status = 'pending'` và `is_published = TRUE`. Tài nguyên chỉ xuất hiện trong thư viện chung sau khi Admin chuyển sang `review_status = 'approved'`.
- **BR-LIB-005 [AS-BUILT]**: Giảng viên chỉ được xem, sửa và xóa tài nguyên do chính mình upload (`uploaded_by = actor_id`). Admin có quyền thao tác trên mọi tài nguyên.
- **BR-LIB-006 [AS-BUILT]**: Khi xóa một tài nguyên (DELETE), file vật lý trên Supabase bucket phải được xóa cùng lúc. Không được để lại orphan file trên storage.
- **BR-LIB-007 [NEEDS CLARIFICATION]**: Chưa có chính sách lưu giữ (retention policy) cho tài nguyên bị rejected. Cần quyết định: tự động xóa sau N ngày hay giữ lại để Giảng viên chỉnh sửa và nộp lại.

## 8. Yêu cầu chức năng

- **FR-LIB-001 [AS-BUILT]**: API `POST /api/v1/library` phải xác thực MIME type bằng Magic Bytes trước khi chấp nhận upload. Các định dạng được hỗ trợ bao gồm: audio (MP3, WAV, WebM, M4A, OGG), tài liệu (PDF), và file nén (ZIP, RAR, 7Z).
- **FR-LIB-002 [AS-BUILT]**: Hệ thống phải từ chối bất kỳ file nào vượt quá 200 MB với HTTP 413 trước khi xử lý nội dung file.
- **FR-LIB-003 [AS-BUILT]**: Sau khi upload thành công, hệ thống phải lưu metadata đầy đủ vào bảng `library_resources`: tên file, URL lưu trữ, kích thước (bytes), loại (`resource_type`), danh mục (`category`), và `uploaded_by`.
- **FR-LIB-004 [AS-BUILT]**: API `GET /api/v1/library/mine` và `GET /api/v1/library/mine/:id` phải trả về tài nguyên của Giảng viên đang đăng nhập ở mọi trạng thái phê duyệt (kể cả `pending` và `rejected`).
- **FR-LIB-005 [AS-BUILT]**: API `GET /api/v1/library` (danh sách công khai) chỉ trả về tài nguyên có `review_status = 'approved'`, bất kể role của người gọi.
- **FR-LIB-006 [AS-BUILT]**: API `DELETE /api/v1/library/:id` phải xóa đồng thời bản ghi DB và file vật lý trên Supabase bucket trong cùng một thao tác xử lý.
- **FR-LIB-007 [TARGET]**: Admin phải có API để phê duyệt hoặc từ chối tài nguyên (`PATCH /api/v1/admin/library/:id/review`), chuyển trạng thái `review_status`.

## 9. Yêu cầu phi chức năng

- **NFR-LIB-001 [TARGET]**: Thời gian phản hồi cho upload file nhỏ hơn 5 MB phải hoàn thành dưới 3 giây ở môi trường staging.
- **NFR-LIB-002 [AS-BUILT]**: Validation Magic Bytes phải xử lý cả các file nén đặc biệt (ZIP, RAR, 7Z) có signature khác nhau; không được bypass bằng extension.
- **NFR-LIB-003 [AS-BUILT]**: Môi trường Node.js phải hỗ trợ `dynamic import()` để tải thư viện `file-type` v19 (ESM module) trong môi trường CommonJS.
- **NFR-LIB-004 [TARGET]**: Coverage kiểm thử tự động cho service layer (upload validation, MIME check, delete cascade) phải đạt tối thiểu 80%, bao gồm happy path và ít nhất 1 error case (upload file sai định dạng).

## 10. Thực thể chính

- **`library_resources`**: Bảng lưu metadata của tài nguyên đã upload.
  - `id` (PK, UUID)
  - `title` (Tên hiển thị)
  - `file_url` (URL lưu trữ trên Supabase)
  - `file_size_bytes` (Kích thước file, bytes)
  - `resource_type` (Ví dụ: `audio`, `pdf`, `zip`)
  - `category` (Danh mục, ví dụ: `listening`, `reading`)
  - `uploaded_by` (FK → `users.id`)
  - `is_published` (BOOLEAN, mặc định TRUE)
  - `review_status` (Enum: `pending`, `approved`, `rejected`)
  - `created_at`, `updated_at`

## 11. Tiêu chí thành công

- **SC-LIB-001 [TARGET]**: 100% file upload sai MIME type (vượt qua Magic Bytes check) bị hệ thống chặn và trả về HTTP 422.
- **SC-LIB-002 [TARGET]**: Thời gian phản hồi cho upload file nhỏ hơn 5 MB hoàn thành dưới 3 giây ở môi trường staging.
- **SC-LIB-003 [TARGET]**: 100% thao tác DELETE không để lại orphan file trên Supabase bucket — xác minh bằng cách kiểm tra bucket sau mỗi test case xóa.
- **SC-LIB-004 [TARGET]**: Sau HTTP 201, Giảng viên có thể nhìn thấy tài nguyên mới với trạng thái `pending` trong endpoint `/mine` mà không cần Admin duyệt trước.
- **SC-LIB-005 [TARGET]**: Tài nguyên `pending` không xuất hiện trong endpoint danh sách công khai `GET /api/v1/library` khi chưa được Admin phê duyệt.

## 12. Giả định

- Bucket Supabase (`ieltszone_library`) đã được Admin cấu hình sẵn sàng trên cloud và có đúng quyền đọc/ghi trước khi tính năng được triển khai.
- Môi trường Node.js của server đã hỗ trợ `dynamic import()` để gọi được thư viện ESM (`file-type` v19).
- Giảng viên đã xác thực và có token hợp lệ trước khi gọi bất kỳ API upload nào.

## 13. Phụ thuộc

- **Supabase Storage**: Bucket lưu trữ file vật lý — tính năng không thể hoạt động nếu bucket chưa được cấu hình.
- **Thư viện `file-type` (v19)**: Xác thực Magic Bytes. Phiên bản 19 là ESM-only, cần xử lý import đặc biệt trong môi trường CommonJS.
- Module Authentication & Authorization để xác thực quyền `tutor` và `admin`.
- Module Admin Review (FR-LIB-007) để phê duyệt tài nguyên — có thể phát triển song song.

## 14. Câu hỏi mở

1. **BR-LIB-007**: Tài nguyên bị Admin từ chối (`rejected`) có được tự động xóa sau một khoảng thời gian không, hay Giảng viên được phép chỉnh sửa và nộp lại để duyệt lại?
2. File upload có cần hỗ trợ resumable upload (tiếp tục từ nơi bị gián đoạn) cho file lớn gần 200 MB không, hay chỉ cần upload lại từ đầu nếu bị ngắt kết nối?
