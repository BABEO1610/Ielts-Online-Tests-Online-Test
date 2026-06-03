# Đặc tả tính năng: Thư viện Tài liệu (feat-content-library) — FULL SPECIFICATION

Trạng thái: **DRAFT** | Cần review  
Tác giả: Thành viên 4 | Ngày: 2026-06-03  
Mức độ rủi ro: **Trung bình** (File Upload, Kiểm soát truy cập, Lưu trữ)  
Spec liên quan: `.sdd/global/constitution.md`, `.sdd/shared_context.md`, `feat-auth-and-users`

---

## 1. Bối cảnh nghiệp vụ & Mục tiêu

Tính năng này cung cấp **Thư viện Tài liệu** cho nền tảng IELTS Online Test.

Thư viện Tài liệu cho phép Student truy cập các tài liệu luyện thi IELTS như tài liệu PDF và file audio để tự học offline. Đồng thời cho phép Tutor / Admin upload, cập nhật, publish/unpublish và xóa tài nguyên học tập.

Tính năng này tập trung vào ba quyết định chính:

* Các loại tài liệu được hỗ trợ.
* Giới hạn dung lượng file.
* Cơ chế tải xuống an toàn.

Mục tiêu:

* Cung cấp thư viện tập trung các tài liệu luyện thi IELTS (PDF/Audio).
* Cho phép Student tải tài liệu đã published sau khi xác thực.
* Cho phép Tutor quản lý tài nguyên một cách an toàn.
* Cho phép Admin quản lý toàn bộ tài nguyên và xem audit log.
* Ngăn chặn upload file không hợp lệ, quá dung lượng, giả mạo hoặc nguy hiểm.
* Đảm bảo mọi thay đổi tài nguyên đều có thể truy vết qua audit log.
* Sử dụng schema PostgreSQL hiện có, đặc biệt là bảng `library_resources`.

---

## 2. Các bên liên quan & Personas

* **User / Guest:** Khách chưa đăng nhập. Có thể xem metadata tài liệu public/published nếu preview được cho phép, nhưng không thể quản lý tài nguyên và không thể tải tài liệu chỉ dành cho Student.
* **Student:** Học viên đã đăng nhập. Có thể xem và tải tài liệu PDF/Audio đã published để luyện IELTS offline.
* **Tutor / Content Manager:** Chủ sở hữu nội dung. Có thể upload, chỉnh sửa, publish/unpublish và xóa tài nguyên thư viện.
* **Admin:** Quản trị hệ thống. Có thể quản lý toàn bộ tài nguyên thư viện và xem audit log cho các thay đổi tài nguyên.
* **System:** Xác thực file, lưu metadata tài nguyên, kiểm soát quyền hạn và phục vụ response tải xuống.

---

## 3. User Stories

* **STU-10:** Là một Student, tôi muốn truy cập Thư viện Tài liệu để tải PDF và file audio luyện thi IELTS, để có thể tự luyện tập độc lập offline.
* **TUT-07:** Là một Tutor, tôi muốn upload, chỉnh sửa và xóa tài liệu PDF và file audio trong Thư viện, để học viên luôn có tài nguyên cập nhật để tải về.
* **ADM-06:** Là một Admin, tôi muốn xem và lọc nhật ký hoạt động hệ thống cho các hành động nhạy cảm, để có thể kiểm tra và điều tra các thay đổi nội dung.
* **Luồng Preview của Guest:** Là một Guest, tôi muốn xem tài nguyên học tập đã published hoặc thông tin tài nguyên giới hạn, để hiểu nền tảng cung cấp tài liệu học tập gì trước khi đăng ký.

---

## 4. Yêu cầu chức năng

### FR-01 — Xem danh sách tài nguyên đã published

KHI Guest hoặc Student mở trang Thư viện Tài liệu, HỆ THỐNG SẼ hiển thị tất cả tài nguyên có `is_published = TRUE`.

Thông tin hiển thị BẮT BUỘC bao gồm:

* `id`
* `title`
* `description`
* `resource_type`
* `file_size_bytes`
* `created_at`

Hệ thống KHÔNG ĐƯỢC hiển thị tài nguyên chưa published cho Guest hoặc Student.

---

### FR-02 — Lọc tài nguyên thư viện

KHI Guest hoặc Student lọc tài nguyên theo `resource_type`, HỆ THỐNG SẼ chỉ trả về tài nguyên đã published khớp với bộ lọc.

Giá trị lọc được phép trong sprint này:

* `pdf`
* `audio`

TRONG TRƯỜNG HỢP giá trị lọc là `video` hoặc `other`, HỆ THỐNG SẼ không trả về tài nguyên nào có thể upload trong phạm vi sprint này.

---

### FR-03 — Xem chi tiết tài nguyên

KHI Guest hoặc Student mở trang chi tiết tài nguyên, HỆ THỐNG SẼ hiển thị metadata của tài nguyên được chọn nếu `is_published = TRUE`.

TRONG TRƯỜNG HỢP tài nguyên không tồn tại hoặc `is_published = FALSE`, HỆ THỐNG SẼ trả về HTTP 404 Not Found.

---

### FR-04 — Student tải tài nguyên đã published

KHI Student đã xác thực nhấn Download trên một tài nguyên đã published, HỆ THỐNG SẼ xác minh rằng:

* Người dùng đã được xác thực,
* Role người dùng là `student`,
* Tài nguyên tồn tại,
* Tài nguyên có `is_published = TRUE`,
* File tồn tại trong storage.

KHI tất cả điều kiện hợp lệ, HỆ THỐNG SẼ trả về response tải xuống file hoặc URL tải xuống bảo mật.

---

### FR-05 — Hạn chế tải xuống với Guest

KHI Guest cố tải tài nguyên chỉ dành cho Student, HỆ THỐNG SẼ từ chối yêu cầu và trả về HTTP 401 Unauthorized.

Trong sprint này, Guest chỉ có thể xem metadata tài nguyên đã published. Tải xuống đầy đủ yêu cầu đăng nhập bằng tài khoản Student.

Hệ thống NÊN hướng dẫn Guest đăng nhập hoặc đăng ký trước khi tải tài nguyên đầy đủ.

---

### FR-06 — Tutor upload tài nguyên

KHI Tutor upload tài nguyên mới vào thư viện, HỆ THỐNG SẼ kiểm tra:

* Metadata bắt buộc,
* Role người dùng,
* Extension file,
* MIME type thật,
* Kích thước file,
* Loại tài nguyên.

Metadata bắt buộc bao gồm:

* `title`
* `resource_type`
* File đã upload
* `is_published`

KHI validation thành công, HỆ THỐNG SẼ lưu file vào storage và insert metadata vào `library_resources`.

---

### FR-07 — Kiểm tra loại file

KHI Tutor upload file, HỆ THỐNG CHỈ CHẤP NHẬN các loại file sau:

| Loại tài nguyên | Extension |
|---|---|
| PDF | `.pdf` |
| Audio | `.mp3`, `.wav`, `.m4a` |

TRONG TRƯỜNG HỢP file upload có extension không được hỗ trợ, HỆ THỐNG SẼ từ chối yêu cầu với HTTP 415 Unsupported Media Type.

---

### FR-08 — Kiểm tra MIME type

KHI Tutor upload file, HỆ THỐNG SẼ kiểm tra MIME type thật của file upload.

MIME type được phép:

| Loại file | MIME Type |
|---|---|
| PDF | `application/pdf` |
| MP3 | `audio/mpeg` |
| WAV | `audio/wav`, `audio/x-wav` |
| M4A | `audio/mp4`, `audio/m4a` |

TRONG TRƯỜNG HỢP extension file hợp lệ nhưng MIME type không hợp lệ hoặc bị giả mạo, HỆ THỐNG SẼ từ chối yêu cầu với HTTP 400 Bad Request.

---

### FR-09 — Kiểm tra kích thước file

KHI Tutor upload file, HỆ THỐNG SẼ kiểm tra kích thước file dựa theo `resource_type`.

| Loại tài nguyên | Kích thước tối đa |
|---|---:|
| PDF | 20MB |
| Audio | 100MB |

TRONG TRƯỜNG HỢP file PDF vượt quá 20MB, HỆ THỐNG SẼ từ chối yêu cầu với HTTP 413 Payload Too Large.

TRONG TRƯỜNG HỢP file audio vượt quá 100MB, HỆ THỐNG SẼ từ chối yêu cầu với HTTP 413 Payload Too Large.

---

### FR-10 — Lưu metadata tài nguyên

KHI upload tài nguyên thành công, HỆ THỐNG SẼ insert một bản ghi mới vào `library_resources`.

Metadata được insert BẮT BUỘC bao gồm:

* `title`
* `description`
* `resource_type`
* `file_url`
* `file_size_bytes`
* `uploaded_by`
* `is_published`
* `created_at`
* `updated_at`

Hệ thống SẼ lưu file thật trong local/cloud storage và KHÔNG ĐƯỢC lưu nội dung binary file trực tiếp trong PostgreSQL.

---

### FR-11 — Tutor chỉnh sửa tài nguyên

KHI Tutor chỉnh sửa tài nguyên thư viện hiện có, HỆ THỐNG SẼ cho phép cập nhật:

* `title`
* `description`
* `is_published`

KHI cập nhật thành công, HỆ THỐNG SẼ trả về metadata tài nguyên đã cập nhật.

Trường `updated_at` SẼ được cập nhật tự động bởi database trigger.

Trong sprint này, hành động chỉnh sửa không bắt buộc phải ghi log trừ khi team thêm `resource_updated` vào enum `log_action`.

---

### FR-12 — Tutor Publish / Unpublish tài nguyên

KHI Tutor thay đổi trạng thái publish của tài nguyên, HỆ THỐNG SẼ cập nhật `is_published`.

TRONG TRƯỜNG HỢP `is_published = TRUE`, tài nguyên SẼ hiển thị với Guest/Student.

TRONG TRƯỜNG HỢP `is_published = FALSE`, tài nguyên SẼ bị ẩn khỏi Guest/Student.

---

### FR-13 — Tutor xóa tài nguyên

KHI Tutor xóa một tài nguyên, HỆ THỐNG SẼ soft delete tài nguyên bằng cách set:

```text
is_published = FALSE
```

Hệ thống KHÔNG ĐƯỢC xóa vĩnh viễn bản ghi database trong sprint này.

Việc xóa file vật lý nằm ngoài phạm vi sprint đầu tiên trừ khi team phê duyệt việc dọn dẹp storage.

---

### FR-14 — Quản lý tài nguyên của Admin

KHI Admin truy cập API quản lý Thư viện Tài liệu, HỆ THỐNG SẼ cho phép quyền upload/edit/delete với tất cả tài nguyên.

Admin SẼ có thể xem cả tài nguyên đã published và chưa published trong giao diện quản lý.

---

### FR-15 — Audit Log khi upload tài nguyên

KHI Tutor/Admin upload tài nguyên thành công, HỆ THỐNG NÊN insert bản ghi audit vào `audit_logs`.

Dữ liệu audit NÊN bao gồm:

* `actor_id`
* `action = resource_uploaded`
* `target_table = library_resources`
* `target_id`
* `new_value`
* `ip_address`
* `created_at`

---

### FR-16 — Audit Log khi xóa tài nguyên

KHI Tutor/Admin xóa hoặc unpublish tài nguyên, HỆ THỐNG NÊN insert bản ghi audit vào `audit_logs`.

Dữ liệu audit NÊN bao gồm:

* `actor_id`
* `action = resource_deleted`
* `target_table = library_resources`
* `target_id`
* `old_value`
* `new_value`
* `ip_address`
* `created_at`

---

### FR-17 — Ngăn chặn quản lý trái phép

TRONG TRƯỜNG HỢP Student hoặc Guest gọi API upload/edit/delete, HỆ THỐNG SẼ từ chối yêu cầu với HTTP 403 Forbidden.

TRONG TRƯỜNG HỢP người dùng chưa xác thực, HỆ THỐNG SẼ từ chối truy cập API quản lý với HTTP 401 Unauthorized.

---

### FR-18 — Xử lý lỗi Storage

TRONG TRƯỜNG HỢP lưu trữ file thất bại trong quá trình upload, HỆ THỐNG KHÔNG ĐƯỢC insert metadata vào `library_resources`.

TRONG TRƯỜNG HỢP lưu trữ file thành công nhưng insert metadata thất bại, HỆ THỐNG NÊN xóa file đã upload khỏi storage để tránh file mồ côi (orphan file).

---

## 5. Tiêu chí chấp nhận (EARS)

### Ubiquitous — Luôn đúng

* HỆ THỐNG SẼ dùng `library_resources` là nguồn dữ liệu duy nhất (single source of truth) cho metadata Thư viện Tài liệu.
* HỆ THỐNG KHÔNG ĐƯỢC lưu dữ liệu binary file trực tiếp trong PostgreSQL.
* HỆ THỐNG SẼ chỉ lưu metadata file và `file_url` trong database.
* HỆ THỐNG SẼ chỉ cho phép loại tài nguyên `pdf` và `audio` trong sprint này.
* HỆ THỐNG SẼ từ chối loại tài nguyên `video` và `other` trong sprint này, dù enum database có hỗ trợ.
* HỆ THỐNG SẼ yêu cầu role `tutor` hoặc `admin` cho các hành động upload, edit, publish/unpublish và delete tài nguyên.
* HỆ THỐNG KHÔNG ĐƯỢC cho phép `student` hoặc người dùng chưa xác thực gọi API quản lý tài nguyên.
* HỆ THỐNG SẼ chỉ hiển thị tài nguyên có `is_published = TRUE` cho Guest/Student trong giao diện thư viện.
* HỆ THỐNG SẼ coi `is_published = FALSE` là ẩn/unpublished/soft-deleted với Student và Guest.
* HỆ THỐNG SẼ cho phép Admin quản lý toàn bộ tài nguyên thư viện.

### Event-driven — Kích hoạt bởi sự kiện

* KHI Student mở Thư viện Tài liệu, HỆ THỐNG SẼ trả về danh sách tài nguyên có `is_published = TRUE`.
* KHI Guest mở trang preview thư viện public, HỆ THỐNG SẼ chỉ trả về metadata tài nguyên public/published và KHÔNG ĐƯỢC expose URL tải xuống bị hạn chế nếu cần đăng nhập.
* KHI Student nhấn Download trên tài nguyên đã published, HỆ THỐNG SẼ xác minh xác thực và khả dụng tài nguyên trước khi trả về response tải xuống.
* KHI Tutor upload tài nguyên mới, HỆ THỐNG SẼ kiểm tra metadata bắt buộc, extension, MIME type, kích thước file và quyền role trước khi lưu.
* KHI upload tài nguyên thành công, HỆ THỐNG SẼ lưu file vào storage và insert metadata vào `library_resources`.
* KHI upload tài nguyên thành công, HỆ THỐNG NÊN insert bản ghi audit vào `audit_logs` với action `resource_uploaded`.
* KHI Tutor chỉnh sửa tài nguyên, HỆ THỐNG SẼ cho phép cập nhật `title`, `description` và `is_published`.
* KHI Tutor xóa tài nguyên, HỆ THỐNG SẼ soft delete bằng cách set `is_published = FALSE`.
* KHI Tutor/Admin xóa tài nguyên, HỆ THỐNG NÊN insert bản ghi audit vào `audit_logs` với action `resource_deleted`.
* KHI tài nguyên được cập nhật, trigger database `set_updated_at()` SẼ tự động cập nhật timestamp `updated_at`.

### State-driven — Điều kiện liên tục

* KHI tài nguyên có `is_published = FALSE`, HỆ THỐNG KHÔNG ĐƯỢC hiển thị tài liệu đó trong danh sách của Guest hoặc Student.
* KHI người dùng chưa xác thực, HỆ THỐNG SẼ từ chối truy cập endpoint tải xuống chỉ dành cho Student.
* KHI role người dùng không phải `tutor` hoặc `admin`, HỆ THỐNG SẼ từ chối truy cập endpoint upload/edit/delete.
* KHI đang xử lý upload file, HỆ THỐNG SẼ kiểm tra extension và MIME type trước khi insert metadata vào database.
* KHI đang xử lý upload file, HỆ THỐNG SẼ áp dụng giới hạn kích thước file theo loại tài nguyên.

### Unwanted — Xử lý lỗi

* TRONG TRƯỜNG HỢP extension file không được hỗ trợ, HỆ THỐNG SẼ trả về HTTP 415 Unsupported Media Type.
* TRONG TRƯỜNG HỢP extension file hợp lệ nhưng MIME type không hợp lệ hoặc bị giả mạo, HỆ THỐNG SẼ trả về HTTP 400 Bad Request.
* TRONG TRƯỜNG HỢP file PDF vượt quá 20MB, HỆ THỐNG SẼ trả về HTTP 413 Payload Too Large.
* TRONG TRƯỜNG HỢP file audio vượt quá 100MB, HỆ THỐNG SẼ trả về HTTP 413 Payload Too Large.
* TRONG TRƯỜNG HỢP thiếu metadata bắt buộc, HỆ THỐNG SẼ trả về HTTP 400 Bad Request.
* TRONG TRƯỜNG HỢP người dùng chưa xác thực cố tải tài nguyên yêu cầu đăng nhập, HỆ THỐNG SẼ trả về HTTP 401 Unauthorized.
* TRONG TRƯỜNG HỢP Student hoặc Guest cố upload/edit/delete, HỆ THỐNG SẼ trả về HTTP 403 Forbidden.
* TRONG TRƯỜNG HỢP tài nguyên được yêu cầu không tồn tại hoặc chưa published với Student/Guest, HỆ THỐNG SẼ trả về HTTP 404 Not Found.
* TRONG TRƯỜNG HỢP lưu file thành công nhưng insert database thất bại, HỆ THỐNG NÊN xóa file đã upload khỏi storage để tránh file mồ côi.

---

## 6. API Contracts

Tính năng này sử dụng API Library thống nhất. Kiểm soát truy cập theo role được xử lý bởi middleware xác thực và phân quyền thay vì tạo nhóm route riêng cho Student/Tutor.

### Xem tài nguyên

* `GET /api/v1/library/resources`  
  Query: `resource_type`, `page`, `limit`  
  Response: 200 OK  
  Mục đích: Trả về metadata tài nguyên đã published cho Guest/Student.

* `GET /api/v1/library/resources/:id`  
  Response: 200 OK / 404 Not Found  
  Mục đích: Trả về metadata của một tài nguyên đã published.

### Tải xuống tài nguyên

* `GET /api/v1/library/resources/:id/download`  
  Response: 200 OK / 401 / 404  
  Mục đích: Tải xuống tài nguyên PDF/Audio đã published. Tải đầy đủ yêu cầu Student đã xác thực.

### Quản lý tài nguyên

* `GET /api/v1/library/resources/manage`  
  Query: `resource_type`, `is_published`, `uploaded_by`, `page`, `limit`  
  Response: 200 OK  
  Role: Tutor/Admin  
  Mục đích: Trả về tài nguyên để quản lý, bao gồm cả tài nguyên chưa published.

* `POST /api/v1/library/resources`  
  Body: `title`, `description`, `resource_type`, `is_published`, `file`  
  Response: 201 Created  
  Role: Tutor/Admin  
  Mục đích: Upload tài nguyên PDF/Audio mới.

* `PATCH /api/v1/library/resources/:id`  
  Body: `title`, `description`, `is_published`  
  Response: 200 OK  
  Role: Tutor/Admin  
  Mục đích: Cập nhật metadata tài nguyên hoặc trạng thái publish/unpublish.

* `DELETE /api/v1/library/resources/:id`  
  Response: 204 No Content  
  Role: Tutor/Admin  
  Mục đích: Soft delete tài nguyên bằng cách set `is_published = FALSE`.

---

## 7. Mô hình dữ liệu & Thay đổi DB Schema

Hệ thống sử dụng schema PostgreSQL v2 hiện có. AI Agent BẮT BUỘC tuân thủ nghiêm ngặt tên bảng, loại enum, kiểu dữ liệu và ràng buộc hiện tại.

### Các Enum Types

* `resource_type`: `pdf`, `audio`, `video`, `other`
* `user_role`: `user`, `student`, `tutor`, `admin`
* `account_status`: `pending`, `active`, `inactive`, `banned`
* `log_action`: bao gồm `resource_uploaded`, `resource_deleted`

Quyết định sprint:

* Chỉ cho phép `resource_type = 'pdf'` và `resource_type = 'audio'`.
* `resource_type = 'video'` và `resource_type = 'other'` nằm ngoài phạm vi.

### Bảng chính: `library_resources`

Bảng `library_resources` lưu metadata cho tất cả tài nguyên Thư viện Tài liệu.

| Trường | Kiểu | Quy tắc |
|---|---|---|
| `id` | UUID | Primary key, mặc định `gen_random_uuid()` |
| `title` | VARCHAR(500) | Bắt buộc |
| `description` | TEXT | Tùy chọn |
| `resource_type` | resource_type | Bắt buộc |
| `file_url` | TEXT | Bắt buộc |
| `file_size_bytes` | BIGINT | Tùy chọn nhưng bắt buộc bởi validation ứng dụng |
| `uploaded_by` | UUID | Tham chiếu `users(id)` với `ON DELETE SET NULL` |
| `is_published` | BOOLEAN | Bắt buộc, mặc định `TRUE` |
| `created_at` | TIMESTAMPTZ | Mặc định `NOW()` |
| `updated_at` | TIMESTAMPTZ | Tự động cập nhật bởi trigger |

Ràng buộc:

* `title` KHÔNG ĐƯỢC để trống.
* `resource_type` PHẢI là `pdf` hoặc `audio` trong sprint này.
* `file_url` KHÔNG ĐƯỢC để trống.
* `file_size_bytes` NÊN lưu theo đơn vị bytes.
* `is_published = TRUE` nghĩa là hiển thị với người dùng được phép.
* `is_published = FALSE` nghĩa là chưa published hoặc soft-deleted.
* File binary thật BẮT BUỘC lưu trong local/cloud storage, không lưu trong PostgreSQL.

### Bảng liên quan: `users`

Dùng để xác định người upload thông qua `library_resources.uploaded_by`.

| Trường | Kiểu | Mục đích |
|---|---|---|
| `id` | UUID | Liên kết qua `uploaded_by` |
| `email` | VARCHAR(255) | Xác định tài khoản |
| `role` | user_role | Phân quyền |
| `status` | account_status | Chỉ người dùng active mới được quản lý tài nguyên |
| `full_name` | VARCHAR(255) | Hiển thị tên người upload nếu cần |

Quy tắc phân quyền:

* Chỉ người dùng active với role `tutor` hoặc `admin` mới được upload/edit/delete tài nguyên.

### Bảng liên quan: `audit_logs`

Dùng để truy vết các hành động upload/delete.

| Trường | Kiểu | Mục đích |
|---|---|---|
| `id` | UUID | Primary key |
| `actor_id` | UUID | Tutor/Admin đã thực hiện hành động |
| `action` | log_action | `resource_uploaded` hoặc `resource_deleted` |
| `target_table` | VARCHAR(100) | `library_resources` |
| `target_id` | UUID | ID tài nguyên |
| `old_value` | JSONB | Metadata cũ khi xóa/cập nhật nếu có |
| `new_value` | JSONB | Metadata mới khi upload/cập nhật nếu có |
| `ip_address` | INET | IP request (tùy chọn) |
| `created_at` | TIMESTAMPTZ | Timestamp ghi log |

Quyết định audit:

* Hành động Upload/Delete NÊN được ghi log trong sprint này.
* Hành động Edit NÊN được ghi log chỉ khi team thêm `resource_updated` vào enum `log_action`.
* Schema hiện tại không yêu cầu migration database cho việc implement Content Library cơ bản.

### Quy tắc File

| Loại tài nguyên | Extension | MIME Types | Kích thước tối đa |
|---|---|---|---:|
| PDF | `.pdf` | `application/pdf` | 20MB |
| Audio | `.mp3` | `audio/mpeg` | 100MB |
| Audio | `.wav` | `audio/wav`, `audio/x-wav` | 100MB |
| Audio | `.m4a` | `audio/mp4`, `audio/m4a` | 100MB |

Thay đổi database:

* Không cần thay đổi schema database bắt buộc cho việc implement sprint.
* Các cột tùy chọn trong tương lai: `mime_type`, `original_file_name`, `stored_file_name`, `download_count`, `category`, `deleted_at`, `deleted_by`.

---

## 8. Yêu cầu phi chức năng

* **Hiệu năng:** API danh sách thư viện phải có thời gian phản hồi < 300ms p95 khi có ít hơn 1000 tài nguyên đã published.
* **Hiệu năng tải xuống:** Endpoint tải xuống nên bắt đầu streaming hoặc redirect trong vòng 5 giây nếu file tồn tại và quyền hợp lệ.
* **Bảo mật:** Backend BẮT BUỘC kiểm tra extension và MIME type thật. Chỉ kiểm tra extension là không đủ.
* **Bảo mật storage:** Backend KHÔNG ĐƯỢC expose đường dẫn server vật lý trực tiếp cho frontend.
* **Phân quyền:** API quản lý yêu cầu `tutor` hoặc `admin`. Phải từ chối Student/Guest truy cập.
* **An toàn dữ liệu:** Thao tác insert metadata file và lưu file phải được xử lý an toàn. Nếu insert metadata thất bại sau khi lưu file thành công, backend NÊN dọn dẹp file mồ côi.
* **Khả năng mở rộng:** File thật nên lưu trong local/cloud object storage. PostgreSQL chỉ lưu metadata.
* **Khả năng kiểm tra:** Hành động upload và delete NÊN được ghi lại trong `audit_logs`.

---

## 9. Ma trận xử lý lỗi

| Mã lỗi | HTTP Status | Thông báo (Client) | Hành vi retry |
|---|---:|---|---|
| `LIB_UPLOAD_001` | 400 | "Thiếu thông tin tài nguyên bắt buộc." | Thử lại với metadata đầy đủ. |
| `LIB_UPLOAD_002` | 415 | "Loại file không được hỗ trợ." | Thử lại với file PDF hoặc audio được hỗ trợ. |
| `LIB_UPLOAD_003` | 400 | "Nội dung file upload không khớp với extension." | Thử lại với file hợp lệ. |
| `LIB_UPLOAD_004` | 413 | "Kích thước file vượt quá giới hạn cho phép." | Thử lại với file nhỏ hơn. |
| `LIB_AUTH_001` | 401 | "Vui lòng đăng nhập để tải tài nguyên này." | Đăng nhập và thử lại. |
| `LIB_PERM_001` | 403 | "Bạn không có quyền quản lý tài nguyên thư viện." | Không retry nếu không có role phù hợp. |
| `LIB_RES_001` | 404 | "Không tìm thấy tài nguyên." | Kiểm tra ID tài nguyên hoặc trạng thái published. |
| `LIB_STORE_001` | 500 | "Không thể lưu file đã upload. Vui lòng thử lại sau." | Thử lại sau. |
| `LIB_DB_001` | 500 | "Không thể lưu metadata tài nguyên." | Thử lại sau; dọn file mồ côi nếu cần. |

---

## 10. Các trường hợp ngoại lệ (Edge Cases)

* **File giả mạo extension:** File đặt tên `material.pdf` nhưng thực chất là file executable. Backend phải kiểm tra MIME type thật.
* **Tải xuống tài nguyên đã unpublish:** Student có thể dùng URL tải xuống cũ sau khi Tutor unpublish tài nguyên. Backend phải kiểm tra lại `is_published = TRUE`.
* **Tài khoản người upload bị xóa:** Nếu tài khoản người upload bị xóa, `uploaded_by` trở thành NULL. Tài nguyên vẫn nên khả dụng nếu còn published.
* **File mồ côi trong storage:** File lưu thành công nhưng insert DB thất bại. Backend nên xóa file khỏi storage.
* **Tiêu đề trùng lặp:** Nhiều tài nguyên có thể có cùng tiêu đề. Hệ thống không nên dùng tiêu đề làm định danh duy nhất.
* **Upload audio dung lượng lớn:** File audio có thể lớn hơn nhiều so với PDF. Hệ thống phải áp dụng giới hạn kích thước khác nhau theo loại tài nguyên.
* **Cập nhật/xóa đồng thời:** Nếu Tutor A chỉnh sửa trong khi Tutor B xóa cùng một tài nguyên, backend phải xử lý trạng thái cuối nhất quán.
* **Lộ metadata với Guest:** Response cho Guest không nên expose URL tải xuống bị hạn chế nếu tải xuống yêu cầu xác thực.

---

## 11. Các phụ thuộc & điểm tích hợp

* **Xác thực / RBAC:** Phụ thuộc vào `feat-auth-and-users` để có danh tính người dùng, role và trạng thái tài khoản active.
* **Lưu trữ file:** Cần local storage hoặc cloud storage cho file PDF/Audio thật.
* **Database:** Sử dụng bảng PostgreSQL `library_resources` và các bảng liên quan `users` / `audit_logs`.
* **Audit Log:** Tích hợp với audit logging cho các hành động upload/delete tài nguyên.
* **Frontend:** Trang thư viện Student, trang preview Guest, trang quản lý thư viện Tutor.

---

## 12. Yêu cầu kiểm thử

### Unit Tests

* Kiểm tra extension được phép: `.pdf`, `.mp3`, `.wav`, `.m4a`.
* Kiểm tra extension bị từ chối: `.exe`, `.js`, `.zip`, các file nguy hiểm được đổi tên.
* Kiểm tra giới hạn kích thước: PDF > 20MB bị từ chối; audio > 100MB bị từ chối.
* Kiểm tra role guard: Student/Guest không thể upload/edit/delete.
* Kiểm tra `resource_type` guard: `video` và `other` bị từ chối trong sprint này.

### Integration Tests

* Tutor upload PDF hợp lệ → file lưu + metadata insert vào `library_resources`.
* Tutor upload audio hợp lệ → file lưu + metadata insert.
* Student tải tài nguyên đã published → thành công.
* Guest cố tải tài nguyên yêu cầu đăng nhập → HTTP 401.
* Student cố truy cập tài nguyên chưa published → HTTP 404.
* Tutor soft delete tài nguyên → `is_published = FALSE`.
* Upload/delete tạo audit log nếu audit được bật.

### Mục tiêu coverage

* >= 80% cho module Content Library.
* Tất cả các đường dẫn validation bảo mật phải có test.

---

## 13. Kế hoạch triển khai

* Sử dụng schema PostgreSQL v2 hiện có.
* Không cần migration nếu bảng `library_resources` hiện có được sử dụng cho sprint đầu tiên.
* Cấu hình đường dẫn storage hoặc bucket trước khi bật upload.
* Triển khai lên Staging với tài nguyên test trước.
* Xác minh luồng upload/download/soft-delete/audit trước khi phát hành lên production.

---

## 14. Câu hỏi mở

* **Q1: Quy tắc tải xuống Guest** — Guest có thể tải file mẫu, hay chỉ xem metadata?
* **Q2: Quyết định Storage** — File được lưu trong local server storage hay cloud object storage?
* **Q3: Trường Category** — Có nên phân loại tài nguyên theo loại kỹ năng IELTS: Reading, Listening, Writing, Speaking?
* **Q4: Theo dõi lượt tải** — Hệ thống có nên thêm `download_count` cho analytics không?
* **Q5: Quy tắc xóa vật lý** — Khi Tutor xóa tài nguyên, file vật lý có nên ở lại trong storage hay bị xóa?
* **Q6: Preview công khai vs chỉ Student** — `is_published` có đủ không, hay hệ thống cần thêm trường visibility riêng?
* **Q7: Audit hành động Edit** — Có nên thêm `resource_updated` vào enum database cho thao tác chỉnh sửa?
