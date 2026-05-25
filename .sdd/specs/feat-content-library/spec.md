# SPEC.md — Đặc tả thư viện tài liệu học tập (feat-content-library)

Version: 0.1 DRAFT | Le Tien Thanh | Date: 2026-05-25

---

## 1. Context & Goal

Feature `feat-content-library` hỗ trợ quản lý thư viện tài liệu học IELTS trong hệ thống IELTS Online Test.

Hệ thống cung cấp:

- Document Library cho Student.
- Preview tài liệu công khai cho Guest.
- Upload/Edit/Delete tài liệu cho Tutor hoặc Content Manager.
- Kiểm soát loại file, dung lượng file và quyền download.

Feature này giúp Student tải PDF/audio để luyện IELTS offline, đồng thời giúp Tutor cập nhật và quản lý tài liệu học tập.

Feature này tập trung vào:

- file size limit,
- supported material types,
- download mechanism.

---

## 2. Actors & Roles

### Guest

Guest là người chưa đăng nhập.

Guest có thể xem tài liệu published nếu hệ thống cho phép public preview, nhưng không được upload/edit/delete tài liệu và không được download tài liệu yêu cầu đăng nhập.

### Student

Student là người học đã đăng nhập.

Student có thể xem Document Library và download tài liệu PDF/audio đã được publish.

### Tutor / Content Manager

Tutor / Content Manager là người quản lý tài liệu.

Tutor có thể upload, edit, publish/unpublish và delete tài liệu trong thư viện.

### Admin

Admin có thể quản lý tài liệu nếu được cấp quyền và xem audit log liên quan đến upload/delete resource.

---

## 3. Functional Requirements

### 3.1 View Content Library

WHEN Guest hoặc Student mở Content Library,  
THE SYSTEM SHALL hiển thị danh sách tài liệu có `is_published = TRUE`.

Mỗi tài liệu hiển thị tối thiểu:

- title
- description
- resource_type
- file_size_bytes
- created_at

---

### 3.2 Student Download Resource

WHEN Student click Download trên một tài liệu,  
THE SYSTEM SHALL kiểm tra Student đã đăng nhập và tài liệu có `is_published = TRUE`.

WHEN điều kiện hợp lệ,  
THE SYSTEM SHALL trả file download response.

---

### 3.3 Guest Access Limitation

WHEN Guest truy cập Content Library,  
THE SYSTEM SHALL chỉ hiển thị tài liệu public/published.

WHEN Guest cố download tài liệu yêu cầu đăng nhập,  
THE SYSTEM SHALL từ chối request và yêu cầu login/register.

---

### 3.4 Tutor Manage Resource

WHEN Tutor upload tài liệu mới,  
THE SYSTEM SHALL kiểm tra file extension, MIME type thật, file size và metadata bắt buộc.

WHEN file hợp lệ,  
THE SYSTEM SHALL lưu file vào storage và insert metadata vào bảng `library_resources`.

WHEN Tutor edit tài liệu,  
THE SYSTEM SHALL cho phép cập nhật title, description và is_published.

WHEN Tutor delete tài liệu,  
THE SYSTEM SHALL soft delete bằng cách cập nhật:

```text
is_published = FALSE
3.5 Resource Type Control

WHEN Tutor upload tài liệu,
THE SYSTEM SHALL chỉ chấp nhận:

pdf
audio

Dù database enum có hỗ trợ video và other, trong sprint này hệ thống SHALL NOT cho phép upload video hoặc other.

3.6 Audit Log

WHEN Tutor/Admin upload hoặc delete tài liệu,
THE SYSTEM SHOULD ghi log vào audit_logs với action tương ứng:

resource_uploaded
resource_deleted
4. Non-functional Requirements
4.1 Performance

Content Library page SHALL load danh sách tài liệu trong tối đa 3 giây khi số lượng tài liệu published nhỏ hơn 1000.

Download request SHOULD start responding trong tối đa 5 giây nếu file tồn tại và user có quyền truy cập.

4.2 Security

Backend SHALL kiểm tra cả extension và MIME type thật của file upload.

Backend SHALL sanitize file name trước khi lưu.

Backend SHALL NOT expose physical server path trực tiếp cho frontend.

Backend SHALL reject executable files hoặc file giả mạo extension.

Backend SHALL NOT lưu file binary trực tiếp trong PostgreSQL.

4.3 Authorization

Upload, edit và delete tài liệu SHALL require role:

tutor
admin

Download tài liệu đầy đủ SHALL require authenticated Student account nếu tài liệu không được mở public download.

Student và Guest SHALL NOT được truy cập API quản lý tài liệu.

4.4 File Size Limit
Resource Type	Max Size
PDF	20MB
Audio	100MB
4.5 Supported File Types
Resource Type	Extensions
PDF	.pdf
Audio	.mp3, .wav, .m4a
## 5. Data Model

### 5.1 library_resources

Lưu metadata của tài liệu trong Document Library.

| Field | Type |
|---|---|
| id | UUID |
| title | VARCHAR(500) |
| description | TEXT |
| resource_type | resource_type |
| file_url | TEXT |
| file_size_bytes | BIGINT |
| uploaded_by | UUID |
| is_published | BOOLEAN |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

#### Relationships

`uploaded_by -> users.id`

#### Constraints

- `title` không được để trống.
- `resource_type` không được để trống.
- `file_url` không được để trống.
- `is_published = TRUE`: tài liệu được hiển thị.
- `is_published = FALSE`: tài liệu bị ẩn hoặc soft delete.
- File thật không lưu trong PostgreSQL, chỉ lưu đường dẫn ở `file_url`.

---

### 5.2 resource_type

Định nghĩa loại tài liệu.

| Value | Meaning |
|---|---|
| pdf | Tài liệu PDF |
| audio | File âm thanh |
| video | Video tài liệu |
| other | Loại khác |

#### Sprint Scope

Trong sprint này chỉ dùng:

- pdf
- audio

Không dùng:

- video
- other

---

### 5.3 users

Quản lý người upload tài liệu.

| Field | Type |
|---|---|
| id | UUID |
| email | VARCHAR(255) |
| role | user_role |
| status | account_status |
| full_name | VARCHAR(255) |

#### Relationships

`users.id -> library_resources.uploaded_by`

#### Constraints

Chỉ các role sau được upload/edit/delete tài liệu:

- tutor
- admin

Student và Guest không có quyền quản lý tài liệu.

---

### 5.4 audit_logs

Lưu lịch sử thao tác upload/delete tài liệu nếu bật audit log.

| Field | Type |
|---|---|
| id | UUID |
| actor_id | UUID |
| action | log_action |
| target_table | VARCHAR(100) |
| target_id | UUID |
| old_value | JSONB |
| new_value | JSONB |
| created_at | TIMESTAMPTZ |

#### Relationships

`actor_id -> users.id`

`target_id -> library_resources.id`

#### Related Actions

- resource_uploaded
- resource_deleted

---

### 5.5 File Rules

| Rule | Value |
|---|---|
| PDF max size | 20MB |
| Audio max size | 100MB |
| PDF extension | .pdf |
| Audio extensions | .mp3, .wav, .m4a |

#### Constraints

- Backend phải kiểm tra extension và MIME type thật.
- File giả mạo extension phải bị từ chối.
- File binary không được lưu trực tiếp trong PostgreSQL.
## 6. Error Handling

### ERR-01 — Invalid File Upload

WHERE Tutor/Admin upload file sai định dạng, giả mạo MIME type, thiếu metadata, hoặc vượt dung lượng,  
THE SYSTEM SHALL reject request with proper HTTP error code.

- Unsupported file type → HTTP 415
- Fake MIME type → HTTP 400
- Missing title/resource_type → HTTP 400
- File too large → HTTP 413

---

### ERR-02 — Unauthorized or Forbidden Access

WHERE user chưa đăng nhập cố download tài liệu yêu cầu login,  
THE SYSTEM SHALL return HTTP 401 Unauthorized.

WHERE Student hoặc Guest cố upload/edit/delete tài liệu,  
THE SYSTEM SHALL return HTTP 403 Forbidden.

---

### ERR-03 — Resource Not Found

WHERE user truy cập tài liệu không tồn tại hoặc `is_published = FALSE`,  
THE SYSTEM SHALL return HTTP 404 Not Found.

---

### ERR-04 — Storage or Database Failure

WHERE file storage hoặc database persistence thất bại,  
THE SYSTEM SHALL return HTTP 500 Internal Server Error.
## 7. Acceptance Criteria

- [ ] Guest có thể xem danh sách tài liệu published.
- [ ] Student đăng nhập có thể xem và download tài liệu published.
- [ ] Guest không thể download tài liệu yêu cầu đăng nhập.
- [ ] Tutor/Admin có thể upload PDF dưới 20MB.
- [ ] Tutor/Admin có thể upload audio dưới 100MB.
- [ ] File sai định dạng, giả mạo MIME type hoặc vượt dung lượng bị từ chối.
- [ ] Tutor/Admin có thể edit title, description và is_published.
- [ ] Tutor/Admin có thể soft delete tài liệu bằng `is_published = FALSE`.
- [ ] Tài liệu unpublished không hiển thị cho Guest/Student.
- [ ] Student/Guest không thể gọi API upload/edit/delete.
- [ ] Metadata tài liệu được lưu đúng vào bảng `library_resources`.
- [ ] File binary không được lưu trực tiếp trong PostgreSQL.
## 8. Out of Scope

Các phần sau KHÔNG làm trong sprint này:

- Không làm video library.
- Không làm payment hoặc premium material access.
- Không làm AI tự tạo tài liệu.
- Không làm OCR hoặc preview toàn bộ PDF/audio trên trình duyệt.
- Không làm recommendation system.
- Không làm copyright/license management nâng cao.
- Không lưu file binary trực tiếp trong PostgreSQL.
- Không dùng `resource_type = video` hoặc `resource_type = other`.