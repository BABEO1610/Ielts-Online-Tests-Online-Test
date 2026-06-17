# Danh sách Tasks: Content Library (feat-content-library)

**Dựa trên:** `SPEC.md`, `PLAN.md`, `AGENTS.md`, `CLAUDE.md` và `constitution.md`.  
**Quy định:** Mỗi task ≤ 4 giờ, implement độc lập, format bảng Markdown chi tiết tối đa.  
**Prerequisite:** `feat-auth-and-users` (T031 `authenticate`, T032 `authorize`) phải hoàn thành trước Phase 3.

---

## Phase 1: Database & Storage Setup

*Luật (constitution): Bắt buộc dùng parameterized queries ($1, $2). Không ORM. Soft-delete bắt buộc (DATA-01).*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done criteria |
|---|---|---|---|---|---|---|
| **L001** | Migration: Enum `resource_type` | `backend/src/db/migrations/010_create_resource_type_enum.sql` | 0.5 | DB pool đã setup | SPEC §5.2, shared_context.md | Tạo `CREATE TYPE resource_type AS ENUM ('pdf', 'audio', 'video', 'other')`. Kiểm tra enum tồn tại bằng `\dT`. |
| **L002** | Migration: Bảng `library_resources` | `backend/src/db/migrations/011_create_library_resources.sql` | 1 | L001 | SPEC §5.1, shared_context.md | Bảng có đủ: `id UUID`, `title VARCHAR(500) NOT NULL`, `resource_type NOT NULL`, `file_url TEXT NOT NULL`, `file_size_bytes BIGINT`, `uploaded_by UUID REFERENCES users`, `is_published BOOLEAN DEFAULT TRUE`, `created_at`, `updated_at`. Trigger `set_updated_at` được gắn. |
| **L003** | Migration: Index cho `library_resources` | `backend/src/db/migrations/012_create_library_indexes.sql` | 0.5 | L002 | PLAN §2.2, SPEC §4.1 | Tạo index: `idx_lib_published` ON `library_resources(is_published)`, `idx_lib_type` ON `library_resources(resource_type)`, `idx_lib_uploader` ON `library_resources(uploaded_by)`. |
| **L004** | Tạo thư mục Upload + `.gitkeep` | `backend/uploads/library/.gitkeep`<br>`backend/.gitignore` (update) | 0.5 | None | PLAN §1, ADR-004 | Thư mục `/uploads/library/` tồn tại. `.gitignore` bỏ qua nội dung uploads nhưng giữ `.gitkeep`. `README` note về migrate S3 khi production. |

---

## Phase 2: Upload Middleware & File Validation

*Luật: Kiểm tra extension VÀ MIME type thật (magic bytes) bằng `file-type`. File giả mạo reject TRƯỚC khi ghi DB (SEC-04).*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done criteria |
|---|---|---|---|---|---|---|
| **L005** | Cài đặt packages upload & validation | `backend/package.json` | 0.5 | None | PLAN §4 | Cài `multer`, `file-type@16.5.4` (CJS compatible). Verify `require('file-type')` không lỗi. |
| **L006** | Implement `UploadMiddleware` — Multer storage config | `backend/src/middleware/upload.middleware.js` | 2 | L004, L005 | PLAN §2.1 | `diskStorage` lưu vào `/uploads/library/`. Filename = `crypto.randomUUID() + timestamp + ext` (sanitized bằng `path.extname`). `fileFilter` reject ngay extension không nằm trong whitelist `['.pdf', '.mp3', '.wav', '.m4a']` → HTTP 415 error object cho Multer. |
| **L007** | Implement `validateMimeType()` — magic bytes check | `backend/src/middleware/upload.middleware.js` (thêm hàm) | 1.5 | L005 | PLAN §2.1, SPEC §4.2 | Hàm `async validateMimeType(filePath, resourceType)`: đọc file bằng `file-type.fromFile(filePath)`, so sánh MIME với whitelist. Trả `{ valid: boolean, detectedMime: string }`. Unit-testable độc lập. |
| **L008** | Implement `validateFileSize()` — per-type size check | `backend/src/middleware/upload.middleware.js` (thêm hàm) | 0.5 | None | SPEC §4.4, PLAN §2.3 | Hàm `validateFileSize(fileSizeBytes, resourceType)`: `pdf` max 20MB, `audio` max 100MB. Trả `{ valid: boolean, maxAllowed: number }`. |
| **L009** | Implement `cleanupFile()` — xóa file tạm khi lỗi | `backend/src/middleware/upload.middleware.js` (thêm hàm) | 0.5 | L006 | PLAN §5 (Risk #2) | Hàm `cleanupFile(filePath)` dùng `fs.promises.unlink()` bọc trong try-catch. Gọi trong catch block của service sau mỗi validation fail. Log warning nếu xóa thất bại (không throw). |

---

## Phase 3: DB Queries Layer

*Luật: Tất cả DB access qua `/src/db/queries/`. Mọi function nhận `pool` làm tham số đầu tiên. Tuyệt đối không dùng ORM hoặc string concat.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done criteria |
|---|---|---|---|---|---|---|
| **L010** | Queries: `listPublishedResources` | `backend/src/db/queries/library.queries.js` | 1.5 | L002, L003 | PLAN §2.2 | Hàm `listPublishedResources(pool, { page, limit, resource_type? })`. SQL: `SELECT lr.*, u.full_name AS uploader_name FROM library_resources lr LEFT JOIN users u ON u.id = lr.uploaded_by WHERE lr.is_published = TRUE [AND lr.resource_type = $N] ORDER BY lr.created_at DESC LIMIT $N OFFSET $N`. Trả `{ rows, total }`. |
| **L011** | Queries: `findResourceById` | `backend/src/db/queries/library.queries.js` | 1 | L002 | PLAN §2.2 | Hàm `findResourceById(pool, id)`. SQL: JOIN với `users` để lấy `uploader_name`. Trả `Resource \| null`. |
| **L012** | Queries: `createResource` | `backend/src/db/queries/library.queries.js` | 1 | L002 | PLAN §2.2 | Hàm `createResource(pool, { title, description, resource_type, file_url, file_size_bytes, uploaded_by })`. SQL: `INSERT INTO library_resources (...) VALUES ($1...$6) RETURNING *`. |
| **L013** | Queries: `updateResource` (dynamic SET) | `backend/src/db/queries/library.queries.js` | 2 | L002 | PLAN §2.2, SPEC §3.4 | Hàm `updateResource(pool, { id, title?, description?, is_published? })`. Build dynamic SET clause với parameterized values. Chỉ update field nào được truyền vào. Trả `Resource` sau `RETURNING *`. |
| **L014** | Queries: `softDeleteResource` | `backend/src/db/queries/library.queries.js` | 0.5 | L002 | PLAN §2.2, SPEC §3.4 | Hàm `softDeleteResource(pool, id)`. SQL: `UPDATE library_resources SET is_published = FALSE, updated_at = NOW() WHERE id = $1`. Trả `void`. |
| **L015** | Queries: `insertAuditLog` (library scope) | `backend/src/db/queries/library.queries.js` | 1 | L002, Migration audit_logs | PLAN §2.2, SPEC §3.6 | Hàm `insertLibraryAuditLog(pool, { actor_id, action, target_id, old_value, new_value })`. SQL: `INSERT INTO audit_logs (actor_id, action, target_table, target_id, old_value, new_value) VALUES ($1, $2, 'library_resources', $3, $4::jsonb, $5::jsonb)`. |

---

## Phase 4: Business Logic — LibraryService

*Luật: Service thuần không có `req`/`res`. Throw `AppError` với code từ Error Matrix. Không gọi API AI trực tiếp.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done criteria |
|---|---|---|---|---|---|---|
| **L016** | Service: `listResources` | `backend/src/services/library.service.js` | 1 | L010 | PLAN §2.3, SPEC §3.1 | Hàm nhận `{ page = 1, limit = 20, resource_type? }`. Gọi `listPublishedResources`. Trả `{ resources, total, page, limit }`. |
| **L017** | Service: `getResourceById` | `backend/src/services/library.service.js` | 1 | L011 | PLAN §2.3, SPEC §3.1 | Hàm `getResourceById(resourceId)`. Gọi `findResourceById`. Nếu null hoặc `is_published = FALSE` → throw `AppError(404, 'LIB_NOT_FOUND')`. |
| **L018** | Service: `uploadResource` — validate + persist | `backend/src/services/library.service.js` | 3 | L005-L009, L012, L015 | PLAN §2.3, SPEC §3.4, §4.4 | Hàm `uploadResource(uploaderId, fileData, metadata)`: (1) Check `resource_type ∈ ['pdf','audio']` → 415 `LIB_UNSUPPORTED_TYPE`. (2) `validateMimeType()` → false → `cleanupFile()` + throw 400 `LIB_FAKE_MIME`. (3) `validateFileSize()` → false → `cleanupFile()` + throw 413 `LIB_FILE_TOO_LARGE`. (4) `createResource()`. (5) `insertLibraryAuditLog(action='resource_uploaded')`. Nếu DB lỗi → `cleanupFile()` + throw 500 `LIB_DB_ERROR`. |
| **L019** | Service: `editResource` | `backend/src/services/library.service.js` | 1.5 | L011, L013 | PLAN §2.3, SPEC §3.4 | Hàm `editResource(editorId, resourceId, updateData)`. Check resource tồn tại (404). Validate `updateData` không rỗng hoàn toàn. Gọi `updateResource`. Trả updated record. |
| **L020** | Service: `deleteResource` | `backend/src/services/library.service.js` | 1.5 | L011, L014, L015 | PLAN §2.3, SPEC §3.4 | Hàm `deleteResource(deleterId, resourceId)`. Check resource tồn tại (404). Snapshot `old_value`. Gọi `softDeleteResource`. Gọi `insertLibraryAuditLog(action='resource_deleted', old_value=snapshot, new_value={is_published:false})`. |
| **L021** | Service: `downloadResource` — resolve path | `backend/src/services/library.service.js` | 1.5 | L011 | PLAN §2.3, SPEC §3.2 | Hàm `downloadResource(requesterId, resourceId)`. Check resource (404). Check `is_published = TRUE` (404). Resolve absolute path từ `file_url`. Check file tồn tại trên disk (`fs.access`) → không tồn tại → throw 500 `LIB_FILE_MISSING`. Trả `{ absolutePath, originalFilename, mimetype }`. |

---

## Phase 5: Input Validation, Controllers & Routes

*Luật: Controller chỉ parse HTTP, gọi Service, format `{ success, data, error, meta }`. Không có business logic trong Controller.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done criteria |
|---|---|---|---|---|---|---|
| **L022** | Input Validation: Upload & Edit schemas | `backend/src/validators/library.validator.js` | 1.5 | None | PLAN §2.5, SPEC §6 | Dùng `express-validator`. Schema upload: `title` required maxLength 500, `description` optional, `resource_type` in `['pdf','audio']`. Schema edit: ít nhất 1 field, `is_published` boolean nếu có. |
| **L023** | Controller: `getResources` & `getResourceById` | `backend/src/controllers/library.controller.js` | 1 | L016, L017 | PLAN §2.4 | `getResources`: parse `page`, `limit`, `resource_type` từ query. Trả `200 { success, data: [], meta: { page, limit, total } }`. `getResourceById`: parse `req.params.id`. Trả `200 { success, data: resource }`. |
| **L024** | Controller: `uploadResource` | `backend/src/controllers/library.controller.js` | 1.5 | L018, L022 | PLAN §2.4, SPEC §3.4 | Parse `req.file` (Multer) + `req.body`. Kiểm tra validation errors từ `express-validator`. Gọi `LibraryService.uploadResource(req.user.id, req.file, metadata)`. Trả `201 { success, data: resource }`. |
| **L025** | Controller: `editResource` | `backend/src/controllers/library.controller.js` | 1 | L019, L022 | PLAN §2.4, SPEC §3.4 | Parse `req.params.id` + `req.body`. Kiểm tra validation errors. Gọi `LibraryService.editResource`. Trả `200 { success, data: updatedResource }`. |
| **L026** | Controller: `deleteResource` | `backend/src/controllers/library.controller.js` | 0.5 | L020 | PLAN §2.4, SPEC §3.4 | Parse `req.params.id`. Gọi `LibraryService.deleteResource(req.user.id, id)`. Trả `204 No Content`. |
| **L027** | Controller: `downloadResource` | `backend/src/controllers/library.controller.js` | 1.5 | L021 | PLAN §2.4, SPEC §3.2 | Parse `req.params.id`. Gọi `LibraryService.downloadResource`. Set headers `Content-Disposition: attachment; filename="..."` và `Content-Type`. Stream file bằng `res.sendFile(absolutePath)`. |
| **L028** | API Routes: `library.routes.js` | `backend/src/api/library.routes.js`<br>`backend/src/api/index.js` (mount) | 2 | L022-L027, T031, T032 | PLAN §2.5 | Route file đầy đủ: `GET /` public, `GET /:id` public, `POST /` (uploadMiddleware → authenticate → authorize(['tutor','admin']) → validate → controller), `PATCH /:id` (authenticate → authorize → validate → controller), `DELETE /:id` (authenticate → authorize → controller), `GET /:id/download` (authenticate → controller). Mount vào app tại `/api/v1/library`. |

---

## Phase 6: Frontend Implementation (React + Vite)

*Luật: Components viết PascalCase. Styling dùng Bootstrap 5. Không inline style. `req.user` từ `AuthContext`.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done criteria |
|---|---|---|---|---|---|---|
| **L029** | Hook: `useLibrary` | `frontend/src/hooks/useLibrary.js` | 2 | Axios instance (T041), L028 | PLAN §2.6 | Các hàm: `fetchResources(filters)`, `fetchResourceById(id)`, `uploadResource(formData)`, `editResource(id, data)`, `deleteResource(id)`, `downloadResource(id)`. Dùng `withCredentials: true`. Xử lý lỗi 401/403 nhất quán. |
| **L030** | Component: `ResourceCard` | `frontend/src/components/library/ResourceCard.jsx` | 1.5 | None | PLAN §2.6, SPEC §3.1 | Props: `{ resource, onEdit, onDelete, onDownload, canManage }`. Hiển thị: title, description, type badge (Bootstrap Badge), file size (format KB/MB), `created_at`. Nút Download (chỉ khi đã login). Nút Edit/Delete (chỉ khi `canManage = true`). |
| **L031** | Component: `ResourceUploadModal` | `frontend/src/components/library/ResourceUploadModal.jsx` | 3 | L029, L030 | PLAN §2.6, SPEC §3.4 | Bootstrap Modal. Form: title (required), description, resource_type select (`pdf`/`audio`), file input. Hiển thị file size limit dưới file input (dynamic theo type được chọn). Progress indicator khi upload. Hiển thị lỗi từ API (415, 413, 400). Gọi `onSuccess` sau khi upload xong. |
| **L032** | Component: `ResourceEditModal` | `frontend/src/components/library/ResourceEditModal.jsx` | 2 | L029 | PLAN §2.6, SPEC §3.4 | Bootstrap Modal. Props: `{ resource, isOpen, onClose, onSuccess }`. Form pre-fill title, description. Toggle `is_published` bằng Bootstrap Switch. Gọi `editResource` khi submit. |
| **L033** | Component: `TutorLibraryToolbar` | `frontend/src/components/library/TutorLibraryToolbar.jsx` | 1 | `useAuth()` hook (T042) | PLAN §2.6, SPEC §4.3 | Nút "Upload tài liệu" chỉ render khi `user.role === 'tutor' \|\| user.role === 'admin'`. Click → mở `ResourceUploadModal`. |
| **L034** | Page: `ContentLibraryPage` | `frontend/src/pages/ContentLibraryPage.jsx` | 3 | L029-L033 | PLAN §2.6, SPEC §3.1 | Dùng `useLibrary` để fetch. Filter bar: dropdown `resource_type` (pdf / audio / tất cả). Render danh sách `ResourceCard`. Pagination với Bootstrap Pagination. Hiển thị spinner khi loading. Hiển thị "Chưa có tài liệu nào" khi rỗng. |
| **L035** | Routing & Navigation | `frontend/src/App.jsx`<br>`frontend/src/components/layout/Navbar.jsx` | 1 | L034 | SPEC §3.1, §3.3 | Thêm route `/library` → `ContentLibraryPage`. Thêm link "Thư viện" vào Navbar (public, hiển thị với cả Guest). |

---

## Phase 7: Testing & Quality Assurance

*Luật: Coverage ≥ 80% service layer. Không gọi real DB trong unit test. Không để file rác trên disk sau test.*

| ID | Tên Task | File(s) cần tạo/sửa | Est (h) | Dependencies | SPEC/PLAN refs | Done criteria |
|---|---|---|---|---|---|---|
| **L036** | Unit Test: `UploadMiddleware` validators | `tests/unit/middleware/upload.middleware.test.js` | 2 | L006-L009 | PLAN §5 (Risk #2) | Test `validateMimeType()`: PDF hợp lệ pass, file `.pdf` chứa audio magic bytes → fail. Test `validateFileSize()`: PDF 19MB pass, PDF 21MB fail, Audio 99MB pass, Audio 101MB fail. Test `cleanupFile()` gọi `fs.unlink` đúng path. |
| **L037** | Unit Test: `LibraryService` — upload flow | `tests/unit/services/library.upload.test.js` | 3 | L016-L021 | PLAN §5, SPEC §6 | Mock tất cả DB queries và file utils. Test: upload thành công → `createResource` và `insertAuditLog` được gọi. MIME fail → `cleanupFile` được gọi + throw 400. Size fail → `cleanupFile` được gọi + throw 413. `resource_type = 'video'` → throw 415 (out of scope). |
| **L038** | Unit Test: `LibraryService` — CRUD & download | `tests/unit/services/library.crud.test.js` | 2.5 | L016-L021 | PLAN §2.3, SPEC §6 | Test `getResourceById` với ID không tồn tại → 404. Test `editResource` → gọi `updateResource` đúng fields. Test `deleteResource` → gọi `softDeleteResource` + audit log với đúng `old_value`. Test `downloadResource` khi file không trên disk → 500 `LIB_FILE_MISSING`. |
| **L039** | Integration Test: Public endpoints (GET) | `tests/integration/library.public.test.js` | 2 | L028 | SPEC §3.1, §7 | Gọi `GET /api/v1/library` không có token → 200, chỉ trả resource `is_published = TRUE`. Gọi `GET /api/v1/library/:id` với ID của resource unpublished → 404. |
| **L040** | Integration Test: Upload endpoint (POST) | `tests/integration/library.upload.test.js` | 3 | L028 | SPEC §3.4, §6, §7 | Upload PDF hợp lệ với token Tutor → 201. Upload với token Student → 403. Upload không có token → 401. Upload PDF > 20MB → 413. Upload `.pdf` file chứa audio → 400. Upload thiếu `title` → 400. |
| **L041** | Integration Test: Edit & Delete endpoints | `tests/integration/library.manage.test.js` | 2 | L028 | SPEC §3.4, §6, §7 | PATCH với Tutor token → 200. DELETE với Tutor token → 204, resource `is_published = FALSE` (soft delete). Verify resource vẫn tồn tại trong DB sau delete. Student cố PATCH → 403. |
| **L042** | Integration Test: Download endpoint | `tests/integration/library.download.test.js` | 2 | L028 | SPEC §3.2, §3.3, §6 | Download với Student token + resource published → 200 file stream. Download không có token → 401. Download resource unpublished → 404. |
| **L043** | Test Coverage Check | `package.json` | 0.5 | L036-L042 | AGENTS.md §3 | Chạy `npm test -- --coverage`. Kiểm tra `library.service.js` ≥ 80%, `library.queries.js` ≥ 80%. Xuất báo cáo coverage HTML. |

---

## Tổng kết

| Phase | Tasks | Est (h) | Mô tả |
|-------|-------|---------|-------|
| Phase 1 | L001–L004 | 2.5 | DB Migration & Storage Setup |
| Phase 2 | L005–L009 | 5.0 | Upload Middleware & File Validation |
| Phase 3 | L010–L015 | 7.0 | DB Queries Layer |
| Phase 4 | L016–L021 | 10.0 | LibraryService — Business Logic |
| Phase 5 | L022–L028 | 9.0 | Validators, Controllers & Routes |
| Phase 6 | L029–L035 | 13.5 | Frontend Components & Pages |
| Phase 7 | L036–L043 | 17.0 | Testing & QA |
| **Total** | **43 tasks** | **~64h** | |

> **Thứ tự implement bắt buộc:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 và Phase 7 (song song được sau Phase 5).  
> Phase 5 (Routes) bắt buộc feat-auth-and-users T031 (`authenticate`) + T032 (`authorize`) phải hoàn thành trước.
