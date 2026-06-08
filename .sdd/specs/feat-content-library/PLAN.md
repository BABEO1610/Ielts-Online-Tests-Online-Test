# Implementation Plan: Content Library (feat-content-library)

**Status:** DRAFT — Awaiting Tech Lead Review  
**Linked Spec:** `.sdd/specs/feat-content-library/SPEC.md` (DRAFT v0.1, Risk: Medium)  
**Sprint:** Sprint 2 — Content Management  
**Date:** 2026-06-03  

---

## 1. ARCHITECTURAL APPROACH

- **Layered Architecture:** Tuân thủ mô hình Route → Controller → Service → DB Query (raw `pg`). Tuyệt đối không dùng ORM.
- **File Storage Strategy:** Sử dụng Multer để nhận file upload, lưu file vào thư mục local (`/uploads/library/`). Chỉ lưu đường dẫn tương đối (`file_url`) vào bảng `library_resources` — không lưu binary trong PostgreSQL. Khi production, migrate sang S3/R2 theo ADR-004.
- **File Validation (2-layer):** Validate đồng thời extension (whitelist) và MIME type thật qua package `file-type` (magic bytes). File giả mạo extension bị reject trước khi ghi DB.
- **Authorization:** `userId` và `role` lấy từ `req.user` (inject bởi `authenticate` middleware) — **không bao giờ** từ request body/query (SEC-10).
- **Soft Delete:** Tuân thủ DATA-01: xóa tài liệu = set `is_published = FALSE`. Không hard DELETE record `library_resources`.
- **Audit Log:** Mọi hành động upload/delete của Tutor/Admin ghi vào bảng `audit_logs` với `action = 'resource_uploaded' | 'resource_deleted'`.
- **Standardized Responses:** Mọi API response tuân thủ format `{ success, data, error, meta }`. Lỗi xử lý tập trung tại `src/backend/middleware/errorHandler.js`.

---

## 2. COMPONENTS & INTERFACE

### 2.1 `UploadMiddleware` — `src/backend/src/middleware/upload.middleware.js`

> Multer config kết hợp `file-type` validation — chạy trước controller. Reject file sai định dạng **trước khi** ghi disk.

| Config/Function | Mô tả |
|-----------------|-------|
| `multerStorage` | `diskStorage` — destination: `/uploads/library/`, filename: `{UUID}-{timestamp}{ext}` (sanitized) |
| `fileFilter(req, file, cb)` | Bước 1: Kiểm tra extension trong whitelist (`pdf`, `mp3`, `wav`, `m4a`). Reject ngay nếu không hợp lệ → HTTP 415 |
| `limits.fileSize` | Tạm set max = `100MB` (audio max). Giới hạn per-type kiểm tra ở Service layer |
| `validateMimeType(buffer, resourceType)` | Bước 2: Dùng `file-type` đọc magic bytes → so khớp với MIME type kỳ vọng. Trả `boolean` |

**Whitelist MIME types:**

| resource_type | Extensions | MIME types hợp lệ |
|---------------|------------|-------------------|
| `pdf` | `.pdf` | `application/pdf` |
| `audio` | `.mp3` | `audio/mpeg` |
| `audio` | `.wav` | `audio/wav` |
| `audio` | `.m4a` | `audio/mp4` |

---

### 2.2 `LibraryQueries` — `src/backend/src/db/queries/library.queries.js`

> Raw SQL với parameterized query ($1, $2). Mọi function nhận `pool` làm tham số đầu tiên.

| Function | Input | Output | SQL target |
|----------|-------|--------|------------|
| `listPublishedResources(pool, filters)` | `{ page: number, limit: number, resource_type?: string }` | `{ rows: Resource[], total: number }` | `SELECT ... FROM library_resources WHERE is_published = TRUE ORDER BY created_at DESC LIMIT $1 OFFSET $2` |
| `findResourceById(pool, id)` | `id: string` | `Resource \| null` | `SELECT lr.*, u.full_name AS uploader_name FROM library_resources lr LEFT JOIN users u ON u.id = lr.uploaded_by WHERE lr.id = $1` |
| `createResource(pool, data)` | `{ title, description, resource_type, file_url, file_size_bytes, uploaded_by }` | `{ id: string }` | `INSERT INTO library_resources (...) VALUES ($1...$6) RETURNING id` |
| `updateResource(pool, data)` | `{ id, title?, description?, is_published? }` | `Resource` | `UPDATE library_resources SET ... WHERE id = $N RETURNING *` (dynamic SET clause) |
| `softDeleteResource(pool, id)` | `id: string` | `void` | `UPDATE library_resources SET is_published = FALSE, updated_at = NOW() WHERE id = $1` |
| `insertAuditLog(pool, data)` | `{ actor_id, action, target_table, target_id, old_value, new_value }` | `void` | `INSERT INTO audit_logs (actor_id, action, target_table, target_id, old_value, new_value) VALUES ($1...$6)` |

---

### 2.3 `LibraryService` — `src/backend/src/services/library.service.js`

> Business logic thuần — không có `req`/`res`. Throw `AppError` khi gặp lỗi.

| Method | Input | Output | Logic tóm tắt |
|--------|-------|--------|----------------|
| `listResources(filters)` | `{ page, limit, resource_type? }` | `{ resources: Resource[], total, page, limit }` | listPublishedResources → paginate → trả về |
| `getResourceById(resourceId)` | `resourceId: string` | `Resource` | findResourceById → null → AppError 404 `LIB_NOT_FOUND` → trả resource nếu `is_published = TRUE` |
| `uploadResource(uploaderId, fileData, metadata)` | `uploaderId: string`, `{ path, size, mimetype }`, `{ title, description, resource_type }` | `Resource` | Validate resource_type ∈ ['pdf','audio'] → validateMimeType → validateFileSize → createResource → insertAuditLog('resource_uploaded') |
| `editResource(editorId, resourceId, updateData)` | `editorId: string`, `resourceId: string`, `{ title?, description?, is_published? }` | `Resource` | findResourceById → null → 404 → updateResource → trả updated record |
| `deleteResource(deleterId, resourceId)` | `deleterId: string`, `resourceId: string` | `void` | findResourceById → null → 404 → softDeleteResource → insertAuditLog('resource_deleted', old_value=resource snapshot) |
| `downloadResource(requesterId, resourceId)` | `requesterId: string`, `resourceId: string` | `{ filePath: string, fileName: string }` | findResourceById → null → 404 → check `is_published = TRUE` → resolve absolute path → trả về để controller stream file |

> **Validate file size theo resource_type (trong `uploadResource`):**
> - `pdf` → max 20MB (20 × 1024 × 1024 bytes). Vượt quá → AppError 413 `LIB_FILE_TOO_LARGE`
> - `audio` → max 100MB (100 × 1024 × 1024 bytes). Vượt quá → AppError 413 `LIB_FILE_TOO_LARGE`

---

### 2.4 `LibraryController` — `src/backend/src/controllers/library.controller.js`

> Chỉ parse HTTP, gọi Service, format response. Không có business logic.

| Handler | Method & Path | Auth Required | Response |
|---------|--------------|---------------|----------|
| `getResources` | `GET /api/v1/library` | None (public) | `200 { data: [resources], meta: { page, limit, total } }` |
| `getResourceById` | `GET /api/v1/library/:id` | None (public nếu published) | `200 { data: resource }` |
| `uploadResource` | `POST /api/v1/library` | `authenticate` + `authorize(['tutor','admin'])` | `201 { data: resource }` |
| `editResource` | `PATCH /api/v1/library/:id` | `authenticate` + `authorize(['tutor','admin'])` | `200 { data: resource }` |
| `deleteResource` | `DELETE /api/v1/library/:id` | `authenticate` + `authorize(['tutor','admin'])` | `204` |
| `downloadResource` | `GET /api/v1/library/:id/download` | `authenticate` (student trở lên) | Stream file với `Content-Disposition: attachment` |

---

### 2.5 API Routes — `src/backend/src/api/library.routes.js`

```
Router: /api/v1/library

GET    /                    → getResources          [public]
GET    /:id                 → getResourceById        [public]
POST   /                    → uploadMiddleware.single('file')
                              → authenticate
                              → authorize(['tutor', 'admin'])
                              → uploadResource
PATCH  /:id                 → authenticate
                              → authorize(['tutor', 'admin'])
                              → editResource
DELETE /:id                 → authenticate
                              → authorize(['tutor', 'admin'])
                              → deleteResource
GET    /:id/download        → authenticate
                              → downloadResource
```

---

### 2.6 Frontend Components

| Component | Interface (Props / Context) | Trách nhiệm |
|-----------|-----------------------------|-------------|
| `ContentLibraryPage` | Dùng `useLibrary()` hook | Render danh sách tài liệu, filter theo type, pagination |
| `ResourceCard` | `props: { resource: Resource }` | Hiển thị title, description, type badge, file size, nút Download |
| `ResourceUploadModal` | `props: { isOpen, onClose, onSuccess }` | Form upload: title, description, resource_type selector, file input. Gọi `POST /api/v1/library` |
| `ResourceEditModal` | `props: { isOpen, resource, onClose, onSuccess }` | Form edit: title, description, toggle is_published. Gọi `PATCH /api/v1/library/:id` |
| `TutorLibraryToolbar` | Dùng `useAuth()` để check role | Hiển thị nút "Upload tài liệu" chỉ khi role là tutor/admin |
| `useLibrary` | Custom hook | `fetchResources(filters)`, `uploadResource(formData)`, `editResource(id, data)`, `deleteResource(id)`, `downloadResource(id)` — Axios calls với `withCredentials: true` |

---

## 3. DATA FLOW (Luồng dữ liệu)

### Flow 1: View Content Library (Guest / Student)

```
Client  GET /api/v1/library?page=1&limit=20&resource_type=pdf
  → [No auth middleware — public route]
  → LibraryController.getResources()
  → LibraryService.listResources({ page: 1, limit: 20, resource_type: 'pdf' })
      └─ LibraryQueries.listPublishedResources(pool, filters)
          SQL: SELECT ... WHERE is_published = TRUE AND resource_type = $1
               ORDER BY created_at DESC LIMIT $2 OFFSET $3
  ← Response: 200 {
      success: true,
      data: [ { id, title, description, resource_type, file_size_bytes, created_at } ],
      meta: { page: 1, limit: 20, total: 45 }
    }
```

---

### Flow 2: Upload Resource (Tutor / Admin)

```
Client  POST /api/v1/library  multipart/form-data { file, title, description, resource_type }
  → UploadMiddleware.fileFilter()
      ├─ extension không hợp lệ  →  HTTP 415  LIB_UNSUPPORTED_TYPE
      └─ extension hợp lệ  →  Multer ghi file tạm vào disk
  → authenticate middleware  →  req.user = { id, role, session_token }
  → authorize(['tutor', 'admin'])
      └─ role = 'student'  →  HTTP 403  LIB_FORBIDDEN
  → Input validation (express-validator):
      ├─ title: required, maxLength 500
      ├─ resource_type: phải là 'pdf' hoặc 'audio'
      └─ Validation fail  →  HTTP 400  LIB_VALIDATION_ERROR
  → LibraryController.uploadResource()
  → LibraryService.uploadResource(req.user.id, req.file, { title, description, resource_type })
      ├─ resource_type ∉ ['pdf', 'audio']  →  AppError 415  LIB_UNSUPPORTED_TYPE
      ├─ validateMimeType(file.buffer, resource_type)
      │   └─ MIME giả mạo  →  AppError 400  LIB_FAKE_MIME  + xóa file tạm
      ├─ validateFileSize(file.size, resource_type)
      │   ├─ pdf > 20MB   →  AppError 413  LIB_FILE_TOO_LARGE  + xóa file tạm
      │   └─ audio > 100MB →  AppError 413  LIB_FILE_TOO_LARGE  + xóa file tạm
      ├─ LibraryQueries.createResource(pool, {
      │     title, description, resource_type,
      │     file_url: '/uploads/library/{sanitized_filename}',
      │     file_size_bytes: file.size,
      │     uploaded_by: req.user.id
      │   })  →  { id: newResourceId }
      └─ LibraryQueries.insertAuditLog(pool, {
            actor_id: req.user.id,
            action: 'resource_uploaded',
            target_table: 'library_resources',
            target_id: newResourceId,
            old_value: null,
            new_value: { title, resource_type, file_size_bytes }
          })
  ← Response: 201 { success: true, data: { id, title, resource_type, file_url, ... } }
```

---

### Flow 3: Download Resource (Authenticated Student)

```
Client  GET /api/v1/library/:id/download  [Cookie: access_token]
  → authenticate middleware
      └─ token invalid / không có cookie  →  HTTP 401  AUTH_UNAUTHENTICATED
  → LibraryController.downloadResource()
  → LibraryService.downloadResource(req.user.id, req.params.id)
      ├─ LibraryQueries.findResourceById(pool, id)
      │   └─ null  →  AppError 404  LIB_NOT_FOUND
      ├─ resource.is_published === FALSE  →  AppError 404  LIB_NOT_FOUND
      └─ resolve absolute path từ file_url
          └─ file không tồn tại trên disk  →  AppError 500  LIB_FILE_MISSING
  → LibraryController:
      res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`)
      res.setHeader('Content-Type', mimetype)
      res.sendFile(absolutePath)
  ← Response: 200 [File stream]
```

---

### Flow 4: Edit Resource (Tutor / Admin)

```
Client  PATCH /api/v1/library/:id  { title?, description?, is_published? }
  → authenticate  →  authorize(['tutor', 'admin'])
  → Input validation:
      ├─ title: optional, nếu có phải maxLength 500
      └─ is_published: optional boolean
  → LibraryService.editResource(req.user.id, req.params.id, updateData)
      ├─ LibraryQueries.findResourceById(pool, id)
      │   └─ null  →  AppError 404  LIB_NOT_FOUND
      └─ LibraryQueries.updateResource(pool, { id, ...updateData })
          → RETURNING * (trigger tự động cập nhật updated_at)
  ← Response: 200 { success: true, data: updatedResource }
```

---

### Flow 5: Soft Delete Resource (Tutor / Admin)

```
Client  DELETE /api/v1/library/:id
  → authenticate  →  authorize(['tutor', 'admin'])
  → LibraryService.deleteResource(req.user.id, req.params.id)
      ├─ LibraryQueries.findResourceById(pool, id)
      │   ├─ null  →  AppError 404  LIB_NOT_FOUND
      │   └─ snapshot old_value = { title, resource_type, file_url, is_published }
      ├─ LibraryQueries.softDeleteResource(pool, id)
      │   SQL: UPDATE library_resources SET is_published = FALSE WHERE id = $1
      └─ LibraryQueries.insertAuditLog(pool, {
            actor_id: req.user.id,
            action: 'resource_deleted',
            target_table: 'library_resources',
            target_id: id,
            old_value: snapshot,
            new_value: { is_published: false }
          })
  ← Response: 204 No Content

  [NOTE] File vật lý trên disk KHÔNG bị xóa theo — phải có user confirmation riêng
         theo quy tắc AGENTS.md §2 (Cấm xóa file trong /uploads).
```

---

## 4. IMPLEMENTATION DEPENDENCIES

**Thứ tự triển khai (phụ thuộc thứ tự):**

| Bước | Nội dung | Phụ thuộc |
|------|----------|-----------|
| 1 | Cấu hình Multer + `UploadMiddleware` (`upload.middleware.js`) | `multer`, `file-type` packages |
| 2 | `LibraryQueries` — raw SQL: list, find, create, update, softDelete, auditLog | DB Schema (table `library_resources`, `audit_logs` đã có) |
| 3 | `LibraryService` — business logic: validate, upload, edit, delete, download | Bước 1, 2 |
| 4 | `LibraryController` — HTTP handlers, format response | Bước 3 |
| 5 | `library.routes.js` + mount vào Express app (`src/backend/src/api/index.js`) | Bước 4, `authenticate` + `authorize` từ feat-auth |
| 6 | Input validation middleware (express-validator) cho POST/PATCH routes | Bước 5 |
| 7 | Unit tests cho `LibraryService` + `LibraryQueries` | Bước 2, 3 |
| 8 | Integration tests cho toàn bộ 6 endpoints | Bước 5 |
| 9 | Frontend: `useLibrary` hook + `ContentLibraryPage` | Bước 5 |
| 10 | Frontend: `ResourceUploadModal`, `ResourceEditModal`, `TutorLibraryToolbar` | Bước 9 |

**External Dependencies:**

| Package | Mục đích | Ghi chú |
|---------|----------|---------|
| `multer` | Parse `multipart/form-data`, lưu file disk | Cần config `diskStorage` |
| `file-type` | Detect MIME type từ magic bytes | Version ESM — cần dynamic `import()` hoặc dùng `file-type@16` (CJS) |
| `express-validator` | Validate `title`, `resource_type` từ body | Nhất quán với convention auth module |
| `path` *(Node built-in)* | Resolve absolute path khi stream file | — |
| `crypto` *(Node built-in)* | Generate UUID cho filename sanitization | `crypto.randomUUID()` |
| `fs` *(Node built-in)* | Xóa file tạm khi validation fail | `fs.unlink()` trong catch block |

**Dependency ngoài scope feature:**

> Feature này **yêu cầu** `authenticate` middleware và `authorize` middleware từ `feat-auth-and-users` đã được implement và hoạt động ổn định trước khi bắt đầu bước 5.

---

## 5. TECHNICAL RISKS & MITIGATION

| # | Risk | Xác suất | Impact | Mitigation |
|---|------|----------|--------|------------|
| 1 | **`file-type` ESM incompatibility** — package v17+ chỉ hỗ trợ ESM, dự án dùng CommonJS | Medium | Medium | Pin `file-type@16.5.4` (CJS). Ghi chú trong `package.json`. Nếu migrate ESM sau: wrap trong `import()` async |
| 2 | **Partial Upload Leak** — Multer ghi file disk trước, validation fail sau → file rác tồn đọng | High | Low | Bắt buộc `fs.unlink()` trong `catch` block của `uploadResource`. Thêm cron job dọn file orphan (out of scope nhưng ghi note) |
| 3 | **Path Traversal Attack** — `file_url` được dùng để resolve path khi download | Low | High | Sanitize filename bằng `path.basename()`. Validate path bắt đầu bằng `UPLOAD_DIR`. Không expose physical path ra response |
| 4 | **Large File Upload Timeout** — Audio 100MB upload có thể timeout ở reverse proxy | Medium | Medium | Config `express` body limit và Multer `limits`. Document yêu cầu Nginx config `client_max_body_size 110m` |
| 5 | **Concurrent Delete-Download Race** — Tutor soft-delete trong khi Student đang download | Very Low | Low | Soft-delete chỉ set `is_published = FALSE`, không xóa file. File download check DB trước khi stream → race condition không gây lỗi nghiêm trọng |
| 6 | **Audit Log Failure** — DB lỗi khi ghi audit log, upload đã thành công | Low | Medium | Ghi audit log sau khi `createResource` thành công. Nếu audit log fail → log server-side error nhưng **không rollback** upload (log failure không block UX) |

---

## 6. ERROR CODE MATRIX

| Code | HTTP Status | Trigger | Message |
|------|-------------|---------|---------|
| `LIB_NOT_FOUND` | 404 | Resource không tồn tại hoặc `is_published = FALSE` | "Tài liệu không tồn tại hoặc đã bị ẩn." |
| `LIB_FORBIDDEN` | 403 | Student/Guest cố upload/edit/delete | "Bạn không có quyền thực hiện thao tác này." |
| `LIB_UNAUTHENTICATED` | 401 | Guest cố download tài liệu yêu cầu đăng nhập | "Vui lòng đăng nhập để tải tài liệu." |
| `LIB_UNSUPPORTED_TYPE` | 415 | Extension không nằm trong whitelist (pdf/mp3/wav/m4a) | "Định dạng file không được hỗ trợ. Chỉ chấp nhận PDF và audio." |
| `LIB_FAKE_MIME` | 400 | MIME type thật không khớp với extension | "File bị từ chối: MIME type không hợp lệ." |
| `LIB_FILE_TOO_LARGE` | 413 | File vượt giới hạn (PDF > 20MB, Audio > 100MB) | "File vượt quá dung lượng cho phép." |
| `LIB_VALIDATION_ERROR` | 400 | Thiếu hoặc sai `title`, `resource_type` | "Dữ liệu không hợp lệ: {field} {message}." |
| `LIB_FILE_MISSING` | 500 | File_url có trong DB nhưng file không tồn tại trên disk | "Lỗi máy chủ: file không tìm thấy." |
| `LIB_DB_ERROR` | 500 | DB insert/update thất bại | "Lỗi máy chủ. Vui lòng thử lại." |

---

## 7. OPEN QUESTIONS

| # | Câu hỏi | Owner | Priority | Status |
|---|---------|-------|----------|--------|
| **Q1** | **[Download Access]** Tài liệu có loại nào được mở public download (không cần đăng nhập) không, hay tất cả đều yêu cầu Student login? SPEC §3.3 nói Guest "không được download tài liệu yêu cầu đăng nhập" nhưng không rõ loại nào không yêu cầu login | Product | HIGH | Open |
| **Q2** | **[Tutor Ownership]** Tutor chỉ được edit/delete tài liệu do chính mình upload, hay tất cả Tutor được quyền edit tài liệu của nhau? | Tech Lead | HIGH | Open |
| **Q3** | **[File Storage Path]** Upload dir là `/uploads/library/` relative to project root hay absolute path từ env var `UPLOAD_DIR`? Ảnh hưởng đến config Multer và download stream logic | Backend Team | HIGH | Open |
| **Q4** | **[Pagination Default]** Default `limit` khi list resources là bao nhiêu? SPEC chỉ nói "< 1000 tài liệu trong 3 giây" nhưng không chỉ định default page size | Team | Medium | Open |
| **Q5** | **[File Cleanup]** File vật lý trên disk khi nào được dọn? Soft-delete không xóa file. Có cần hard-delete flow riêng cho Admin không? | Tech Lead | Medium | Open |
| **Q6** | **[Unpublish vs Delete]** SPEC §3.4 dùng "soft delete bằng cách cập nhật is_published = FALSE" — vậy action "unpublish" và "delete" trong UI có khác nhau không, hay cùng gọi 1 API? | Product | Medium | Open |
| **Q7** | **[Search/Filter]** SPEC §3.1 chỉ list theo published. Có cần filter theo `resource_type` không? Có cần full-text search theo `title` không? (`pg_trgm` extension đã có trong DB) | Product | Low | Open |

---

## 8. DEFINITION OF DONE

Feature `feat-content-library` được coi là **DONE** khi toàn bộ các điều kiện sau được thỏa mãn:

- [ ] 6 API endpoints hoạt động đúng theo contract (§2.4 — §2.5)
- [ ] Test coverage Service layer (`library.service.js`) ≥ **80%** (happy path + ≥ 1 error case mỗi method)
- [ ] Test coverage Query layer (`library.queries.js`) ≥ **80%**
- [ ] Integration tests cho toàn bộ 6 endpoints với mock DB
- [ ] Validate MIME type bằng `file-type` (magic bytes) — không chỉ dựa vào extension
- [ ] Không có SQL template literal — chỉ `$1, $2` parameterized queries
- [ ] File binary không được lưu trực tiếp trong PostgreSQL
- [ ] Soft delete hoạt động: `is_published = FALSE`, không hard DELETE
- [ ] Audit log ghi đúng `old_value`/`new_value` JSONB cho upload và delete
- [ ] `file_url` trong response không expose physical server path
- [ ] Tất cả 5 error codes `LIB_*` trả về đúng HTTP status theo Error Matrix (§6)
- [ ] File cleanup (`fs.unlink`) xảy ra khi validation fail (không có file rác trên disk)
- [ ] `userId` và `role` lấy từ `req.user` — không bao giờ từ body/query
- [ ] Không có `console.log` hay stack trace trong production response
- [ ] Code review bởi ít nhất 1 member khác trước khi merge vào `main`
- [ ] Mọi Acceptance Criteria trong SPEC §7 được verify thủ công hoặc qua test
