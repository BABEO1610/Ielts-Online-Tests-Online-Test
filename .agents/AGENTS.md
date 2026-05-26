# AGENTS.md — Project Context for AI Agents
# Version: 1.0 | Updated: 2026-05-25 | Project: IELTSZone
# Đây là file đầu tiên Agent phải đọc trước khi làm bất kỳ việc gì.

---

## 1. PROJECT OVERVIEW

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| Name        | IELTSZone — Nền tảng luyện thi IELTS trực tuyến                      |
| Type        | Full-stack Web App (SPA + REST API)                                   |
| Domain      | Education / E-Learning / Language Testing                             |
| Stage       | Development                                                           |
| Description | Học viên luyện thi 4 kỹ năng IELTS (Listening, Reading, Writing, Speaking). Writing & Speaking hỗ trợ chấm bài bằng AI (theo tiêu chí IELTS Band Descriptor) hoặc giáo viên thật. Có thư viện tài liệu do giáo viên đăng tải, học viên có thể tải về. |

---

## 2. TECH STACK (STRICT — do not deviate without explicit approval)

| Layer       | Technology                                         |
|-------------|----------------------------------------------------|
| Backend     | Node.js 20 + Express 5.x                           |
| Frontend    | React 18 + Vite                                    |
| Database    | PostgreSQL 16                                      |
| DB Access   | Raw SQL via `pg` (node-postgres) — NO ORM          |
| Auth        | TBD — placeholder: JWT (access 15m + refresh 7d)   |
| Realtime    | **Socket.io** (Bắt buộc cho luồng thông báo điểm AI) |
| AI Grading  | External LLM API (e.g. Anthropic Claude / OpenAI)  |
| File Upload | Multer + local storage (hoặc S3-compatible)        |
| Testing     | Jest + Supertest (backend), Vitest + RTL (frontend)|
| Styling     | CSS                                                |

> **Lưu ý Auth:** Khi team chốt phương thức auth, cập nhật dòng Auth ở trên và thông báo cho toàn nhóm.

---

## 3. USER ROLES & PERMISSIONS

| Role      | Quyền hạn                                                                                      |
|------------------------------------------------------------------------------------------------------------|
| `student` | Làm bài thi 4 kỹ năng, xem kết quả, chọn chấm AI hoặc giáo viên, tải tài liệu từ thư viện      |
| `teacher` | Tất cả quyền student + tạo/đăng tải tài liệu, chấm bài Writing/Speaking được giao, quản lý lớp |
| `admin`   | Tất cả quyền + quản lý user, cấu hình hệ thống, xem analytics toàn nền tảng                    |

---

## 4. CORE FEATURES & MODULES

### 4.1 Skill Practice Modules
- **Listening:** Upload audio, học viên nghe và trả lời câu hỏi trắc nghiệm / điền từ.
- **Reading:** Đoạn văn + câu hỏi, chấm tự động.
- **Writing:** Học viên nộp bài viết (Task 1 / Task 2). Chọn chấm bằng **AI** hoặc **giáo viên**.
- **Speaking:** Học viên record âm thanh. Chọn chấm bằng **AI** (speech-to-text → LLM grading) hoặc **giáo viên**.

### 4.2 AI Grading Engine
- Chấm Writing/Speaking dựa trên **4 tiêu chí IELTS chính thức**:
  - Task Achievement / Task Response
  - Coherence & Cohesion
  - Lexical Resource
  - Grammatical Range & Accuracy
- Trả về: Band score (0–9), điểm từng tiêu chí, nhận xét chi tiết.
- AI Grading phải **idempotent**: cùng bài nộp phải cho kết quả nhất quán.

### 4.3 Teacher Grading Workflow
- Bài nộp chờ giáo viên vào queue `pending_grading`.
- Giáo viên nhận bài, chấm, submit → cập nhật trạng thái `graded`.
- Học viên nhận thông báo khi có kết quả.

### 4.4 Library (Thư viện tài liệu)
- Giáo viên upload tài liệu (PDF, DOCX, MP3, v.v.).
- Học viên tìm kiếm, xem preview, tải về.
- Phân loại theo skill, level, nguồn (Cambridge, Official IELTS, v.v.).

---

## 5. ARCHITECTURE PRINCIPLES

- **API style:** REST — endpoint pattern `/api/v1/[resource]`
- **Response format chuẩn** (BẮT BUỘC áp dụng nhất quán):
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "meta": { "page": 1, "total": 100 }
  }
  ```
- **DB Access:** Tất cả truy vấn PostgreSQL đều dùng `pg` pool — KHÔNG dùng ORM, KHÔNG dùng raw string concatenation (dùng parameterized queries `$1, $2` để chống SQL injection).
- **Error handling:** Centralized error middleware tại `src/middleware/errorHandler.js`.
- **No `console.log` trong production code** — dùng structured logger (`winston` hoặc `pino`).
- **Async/await** cho toàn bộ async code — KHÔNG dùng callback.

---

## 6. FILE STRUCTURE & NAMING CONVENTIONS

``
project-root/
├── .sdd/                    # BỘ NÃO ĐẶC TẢ (AI phải đọc thư mục này)
│   ├── shared_context.md    # DB Schema & API Contract tổng
│   └── specs/
│       ├── feat-auth-and-users/
│       ├── feat-subjective-grading/ # (Và các feature khác)
├── .agents/                 # CẤU HÌNH AI
│   ├── AGENTS.md            # ← file này
│   ├── CLAUDE.md            # Project DNA
│   └── .agentignore
├── src/                     # Source code thực tế (Frontend & Backend)
└── tests/
``
**Naming rules:**
- React Components: `PascalCase` (e.g. `WritingSubmission.jsx`)
- Utilities / hooks / services: `camelCase`
- API routes: `kebab-case` (e.g. `/api/v1/writing-submissions`)
- DB tables: `snake_case` (e.g. `writing_submissions`, `user_profiles`)
- DB columns: `snake_case` (e.g. `band_score`, `created_at`)

---

## 7. FORBIDDEN PATTERNS ⛔

- **NEVER** concatenate user input vào SQL string — luôn dùng parameterized query `$1, $2, ...`
- **NEVER** lưu password dưới dạng plain text — phải hash với `bcrypt` (rounds ≥ 12)
- **NEVER** hardcode `userId` hay role — luôn lấy từ auth middleware (JWT payload / session)
- **NEVER** skip input validation trên API endpoint — dùng `express-validator` hoặc `joi`
- **NEVER** commit file `.env`, `*.secret`, `credentials/*` lên git
- **NEVER** xóa file trong `/uploads` mà không có user confirmation
- **NEVER** gọi external AI API trực tiếp từ controller — phải đi qua `src/ai/grading.service.js`
- **NEVER** trả về stack trace trong production response
- **NEVER** dùng `any` nếu team migrate sang TypeScript sau này

---

## 8. DEFINITION OF DONE (per task/feature)

Một task được coi là DONE khi:
- [ ] Unit tests viết xong và pass (coverage ≥ 80% cho service layer)
- [ ] Integration test cho happy path + ít nhất 1 error case
- [ ] Không có linting errors (`eslint`)
- [ ] API endpoint mới được document trong Swagger/OpenAPI (`/docs`)
- [ ] Error cases trả về đúng HTTP status code (400/401/403/404/422/500)
- [ ] Không còn `TODO` comment nào trong code được commit
- [ ] PR description mô tả rõ thay đổi và link tới task/spec

---

## 9. GIT CONVENTIONS

**Branch naming:**
```
feat/[feature-name]        # tính năng mới
fix/[bug-name]             # sửa lỗi
spec/[feature-name]        # viết spec trước khi code
chore/[task-name]          # cấu hình, refactor, deps
```

**Commit message (Conventional Commits):**
```
feat(writing): add AI grading endpoint for Task 2
fix(auth): handle expired refresh token edge case
docs(library): update upload spec for teacher role
chore(db): add index on submissions.student_id
```

**Rules:**
- KHÔNG commit thẳng vào `main`
- PR cần ít nhất 1 người review trước khi merge
- Mỗi PR chỉ giải quyết 1 feature/fix

---

## 10. CURRENT SPRINT CONTEXT

| Field          | Value                                        |
|----------------|----------------------------------------------|
| Sprint         | Sprint 1 — Foundation                        |
| Focus          | Setup project structure, Auth, DB schema     |
| Active specs   | `docs/specs/auth.spec.md`, `docs/specs/db-schema.spec.md` |
| Blocked        | Auth method chưa được chốt bởi team          |

> Cập nhật section này vào đầu mỗi sprint.

---

## 11. SECURITY CHECKLIST (AI Agent phải tự kiểm tra trước khi generate code)

- [ ] Input có được validate và sanitize không?
- [ ] File upload có kiểm tra MIME type và giới hạn size (max 50MB) không?
- [ ] API endpoint có require authentication không (nếu cần)?
- [ ] Role-based access control có được áp dụng đúng không?
- [ ] SQL query có dùng parameterized không?
- [ ] AI grading response có được sanitize trước khi lưu DB không?

---

*Tham khảo thêm CLAUDE.md để biết các quyết định kiến trúc chi tiết và lesson learned.*
