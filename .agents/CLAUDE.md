# CLAUDE.md — Claude Code Project Memory
# Project: IELTSZone | Updated: 2026-05-25
# Đọc AGENTS.md trước để hiểu full project context và tech stack.

---

## MANUAL MEMORY (human-maintained — do not auto-overwrite)

### Architecture Decision Records (ADR)

# ADR-001: Dùng Raw SQL (pg) thay vì ORM
# Lý do: Team muốn kiểm soát hoàn toàn query performance cho các truy vấn
#         phức tạp (leaderboard, analytics, grading history).
#         Trade-off: Phải tự viết migration scripts và quản lý schema thủ công.

# ADR-002: Tách AI Grading thành service riêng (src/ai/grading.service.js)
# Lý do: Dễ swap LLM provider (Claude → OpenAI hoặc ngược lại) mà không
#         ảnh hưởng business logic. Cũng dễ mock khi viết unit test.

# ADR-003: Response format chuẩn { success, data, error, meta } cho mọi API
# Lý do: Frontend team có thể viết interceptor chung, giảm boilerplate.

# ADR-004: Auth method chưa được chốt — placeholder là JWT
# Action required: Team cần quyết định trước Sprint 2.
#                  Options: (a) JWT thuần, (b) JWT + Google OAuth,
#                           (c) Supabase Auth (managed).

# ADR-005: File upload lưu local trước, có thể migrate sang S3 sau
# Lý do: Đơn giản cho giai đoạn dev. Khi production, cần chuyển sang
#         object storage (Cloudflare R2 hoặc AWS S3).

---

### Lessons Learned

# LESSON-001: Parameterized query PHẢI dùng $1, $2 — không bao giờ template literal
#             cho user input. Đã từng bị SQL injection trong mock test.

# LESSON-002: AI Grading prompt phải bao gồm đủ 4 band descriptor tiêu chí IELTS.
#             Nếu thiếu tiêu chí, model trả về band score không nhất quán.

# LESSON-003: File upload cần validate MIME type bằng `file-type` package
#             (không chỉ dựa vào extension) — tránh upload file giả mạo.

# LESSON-004: Speaking grading pipeline: audio → speech-to-text → text → LLM grade.
#             Bước STT phải timeout sau 30s để tránh treo request.

---

### Business Logic & Domain Rules (Đã chuyển về thư mục .sdd/)

# ⚠️ QUAN TRỌNG: File này CHỈ chứa luật công nghệ và quy chuẩn coding.
# Để biết luật nghiệp vụ (IELTS Grading Criteria, User Roles, Business Rules), 
# AI bắt buộc phải đọc file SPEC.md tương ứng nằm trong thư mục `.sdd/specs/`.

---

### Current Sprint Notes

# Sprint 1 — Foundation (đang chạy)
# Goal: Setup cấu trúc project, DB schema, auth skeleton
#
# In Progress:
#   - DB schema design (users, submissions, library_items, grading_results)
#   - Project folder structure setup
#   - Auth method decision (đang pending)
#
# Blocked:
#   - Auth implementation chờ team chốt method (JWT vs OAuth)
#
# Next Sprint (Sprint 2):
#   - Implement Writing submission + AI grading flow
#   - Implement Library upload (teacher) + download (student)

---

## PATTERNS TO FOLLOW

# DB Query pattern (backend/src/db/queries/):
#   - Mỗi module có file query riêng: submissions.queries.js, users.queries.js
#   - Export named async functions, nhận pool từ db/pool.js
#   - Ví dụ: export async function getSubmissionById(pool, id) { ... }

# Service pattern (backend/src/services/):
#   - Business logic thuần — không biết về HTTP (req/res)
#   - Gọi query functions từ db/queries/
#   - Ví dụ: export async function gradeWritingWithAI(submissionId, text) { ... }

# Controller pattern (backend/src/controllers/):
#   - Chỉ handle HTTP: parse req, call service, format response
#   - Không chứa business logic
#   - Luôn dùng try-catch và gọi next(error) khi có lỗi

# AI Grading prompt pattern (backend/src/ai/prompts/):
#   - Mỗi skill có file prompt riêng: writing-task1.prompt.js, speaking.prompt.js
#   - Prompt phải bao gồm đủ 4 tiêu chí và yêu cầu JSON output

# Frontend API call pattern (frontend/src/services/):
#   - Dùng axios instance với base interceptor (auth header, error handling)
#   - Không gọi fetch/axios trực tiếp trong component — luôn qua service layer

# External LLM Integration Guardrail (backend/src/ai/):
#   - Luôn sử dụng flag ép kiểu JSON của nhà cung cấp LLM (Ví dụ: response_format: { type: "json_object" }).
#   - Code xử lý kết quả trả về của LLM bắt buộc phải có cơ chế bóc tách JSON (Regex hoặc String Parsing) và bọc trong try-catch, vì LLM có thể trả về text thừa ngoài cấu trúc JSON.
#   - Nếu parse JSON thất bại, phải lưu trạng thái `grading_failed` để retry.

---

## DB SCHEMA SNAPSHOT (cập nhật khi có migration mới)

```sql
-- Core tables (draft — chưa finalize)
users (id, email, password_hash, role, full_name, created_at)
submissions (id, student_id, skill, task_type, content_url, status, submitted_at)
grading_results (id, submission_id, grader_type, overall_band, criteria_scores jsonb, feedback text, graded_at)
library_items (id, teacher_id, title, skill, level, file_url, mime_type, size_bytes, created_at)