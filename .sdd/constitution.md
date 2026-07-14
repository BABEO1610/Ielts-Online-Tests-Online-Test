# CONSTITUTION.md — Project Law
# Project: IELTSZone — Nền tảng luyện thi IELTS trực tuyến
# Ratified: 2026-05-28 | Team: [ĐIỀN TÊN THÀNH VIÊN] | Version: 1.0
# Location: .sdd/constitution.md
# Status: LOCKED 🔒
#
# ⚠️ RULE: Mọi thay đổi trong file này yêu cầu SỰ ĐỒNG THUẬN TOÀN BỘ TEAM.
#           Thay đổi phải qua RFC process → tạo file .sdd/rfcs/rfc-[date]-[topic].md
#           và được tất cả thành viên approve TRƯỚC khi sửa file này.
#
# Đây là "luật bất biến" của dự án. Mọi spec, code, AI output, và quyết định
# kỹ thuật đều phải tuân thủ. Viết ở Tuần 1 — không thay đổi tuỳ tiện.
#
# Project structure:
#   .agents/
#     AGENTS.md         ← bộ hiến pháp cho AI Agent
#     CLAUDE.md         ← bộ nhớ ngữ cảnh dự án
#     .agentignore      ← file/folder AI không được đọc
#   .sdd/
#     constitution.md   ← file này
#     shared_context.md ← context dùng chung giữa các specs
#     agents_changelog.md ← log thay đổi do agent thực hiện
#     constraints/      ← ràng buộc kỹ thuật
#       business.md
#       global.md
#       safety.md
#     specs/
#       feat-auth-and-users/
#       global-ielts-virtual-assistant/
#       feat-content-library/
#       feat-objective-testing/
#       feat-subjective-grading/
#   backend/
#     src/              ← backend source code
#   frontend/           ← React frontend
#     src/
#     public/
#   tests/              ← test files
#   docs/               ← tài liệu bổ sung

---

## ARTICLE 1 — TECH STACK (immutable)

| Layer          | Technology                                      | Ghi chú                   |
|----------------|-----------------------------------------------------------------------------------------------|
| Runtime        | Node.js 20 LTS                                  | Không downgrade           |
| Backend        | Express 5.x                                     | Không dùng NestJS /Fastify|
| Frontend       | React 18 + Vite                                 | Không dùng class components|
| Styling        | Bootstrap 5.x                                   | Không dùng Tailwind, không dùng CSS-in-JS    |
|                |                                                 | Custom CSS chỉ khi Bootstrap không đủ        |
| Database       | PostgreSQL 16                                   | Không dùng NoSQL nếu không có team vote|
| DB Access      | Raw SQL via `pg` (node-postgres)                | Không dùng ORM (Prisma, Sequelize)|
| Package mgr    | npm                                             | Không mix với yarn/pnpm  |
| Auth           | TBD — quyết định trước Sprint 2                 | Placeholder: JWT access 15m + refresh 7d     |
| AI Grading     | Anthropic Claude API (claude-sonnet-4-20250514) | Đi qua `src/ai/grading.service.js`|
| File Storage   | Local (Multer) → migrate S3 khi production      | Xem .sdd/constraints/ để biết giới hạn       |

> Thay đổi bất kỳ dòng nào ở đây = yêu cầu RFC (.sdd/rfcs/) + toàn team vote.

---

## ARTICLE 2 — CODING STANDARDS

```
Formatter:        Prettier (auto-format on save — không debate config)
Linter:           ESLint (0 warnings cho phép trong CI)
Max function:     40 dòng — refactor nếu dài hơn
Max file:         300 dòng — tách file nếu dài hơn
Comments:         Giải thích TẠI SAO, không giải thích CÁI GÌ
                  Xóa TODO/FIXME trước khi merge vào main
Async:            Luôn dùng async/await — không dùng callback
Logging:          Dùng winston hoặc pino — KHÔNG dùng console.log trong production code
Bootstrap:        Ưu tiên Bootstrap utility classes và components
                  Không override Bootstrap core variables tuỳ tiện
                  Custom CSS đặt trong src/styles/custom.css — không inline style
```

### Naming Conventions

| Loại                  | Convention    | Ví dụ                              |
|-----------------------|---------------|------------------------------------|
| React Components      | PascalCase    | `WritingSubmission.jsx`            |
| Hooks                 | camelCase     | `useAuth.js`, `useGrading.js`      |
| Services / Utils      | camelCase     | `grading.service.js`               |
| API Routes            | kebab-case    | `/api/v1/writing-submissions`      |
| DB tables             | snake_case    | `writing_submissions`, `users`     |
| DB columns            | snake_case    | `band_score`, `submitted_at`       |
| ENV variables         | UPPER_SNAKE   | `JWT_SECRET`, `DB_HOST`            |
| Constants             | UPPER_SNAKE   | `MAX_FILE_SIZE`, `BAND_SCORE_MAX`  |
| Spec files            | kebab-case    | `feat-auth-and-users/login.spec.md`|

### API Response Format (BẮT BUỘC — mọi endpoint phải tuân theo)

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "total": 100 }
}
```

Khi có lỗi:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "response_text is required",
    "request_id": "uuid-here"
  }
}
```

---

## ARTICLE 3 — SECURITY POLICIES (Layer 1 — non-negotiable)

```
SEC-01  Passwords:       bcrypt với cost factor ≥ 12 — KHÔNG plain text, KHÔNG MD5
SEC-02  API Keys:        Biến môi trường (.env) ONLY — không bao giờ trong source code
                         .env phải có trong .agentignore và .gitignore
SEC-03  SQL:             Parameterized queries ($1, $2) ONLY
                         Zero tolerance string concatenation với user input
SEC-04  File Uploads:    Validate MIME type bằng `file-type` package (magic bytes)
                         Không chỉ dựa vào extension — giới hạn 50MB
SEC-05  Input:           Validate và sanitize tất cả user input (express-validator hoặc joi)
                         Bắt buộc trước khi xử lý hoặc lưu DB
SEC-06  CORS:            Whitelist domain cụ thể — không dùng wildcard (*) trong production
SEC-07  Auth endpoints:  Mọi endpoint POST/PUT/PATCH/DELETE phải có auth middleware
                         Public endpoints phải được document rõ lý do trong code comment
SEC-08  Secrets in git:  Commit .env lên git = vi phạm Layer 1
                         Phải revoke key ngay lập tức và ghi vào agents_changelog.md
SEC-09  Stack trace:     KHÔNG expose stack trace trong response — chỉ trong server logs
SEC-10  Role check:      userId và role PHẢI lấy từ auth middleware
                         KHÔNG bao giờ lấy từ request body hoặc query params
```

---

## ARTICLE 4 — GIT WORKFLOW

```
Main branch:    Protected — không push trực tiếp, không force push
Branch naming:  feat/[tên]   →  tính năng mới
                fix/[tên]    →  sửa lỗi
                spec/[tên]   →  viết/cập nhật spec trong .sdd/specs/
                chore/[tên]  →  cấu hình, refactor, deps

Commit format:  type(scope): mô tả ngắn (tối đa 72 ký tự)
                feat(writing): add AI grading endpoint for Task 2
                fix(auth): handle expired refresh token edge case
                spec(library): add upload spec for teacher role
                chore(db): add index on submissions.student_id

PR rules:       Tối thiểu 1 người review + approve trước khi merge
PR size:        Tối đa 400 dòng thay đổi — tách PRs lớn hơn
Merge strategy: Squash merge vào main (lịch sử sạch)
No merge if:    Tests fail | ESLint errors | Review chưa approve
```

---

## ARTICLE 5 — TESTING REQUIREMENTS

```
Minimum coverage:   80% cho toàn bộ service/business logic mới
Unit tests:         Bắt buộc cho mọi function trong src/services/ và src/db/queries/
Integration tests:  Bắt buộc cho mọi API endpoint (happy path + ít nhất 1 error case)
E2E tests:          Khuyến khích cho critical flows: Writing submit → AI grade → view result
Regression:         Không merge nếu existing tests bị break
Mock AI:            AI grading service phải được mock trong unit tests
                    Không gọi real Anthropic API trong test suite
Test files:         Đặt trong tests/ — mirror cấu trúc src/
                    Ví dụ: src/services/grading.service.js → tests/services/grading.service.test.js
```

---

## ARTICLE 6 — SPEC-DRIVEN WORKFLOW (.sdd/)

```
SDD-01  Không viết code khi chưa có spec được approve
        Spec phải nằm trong .sdd/specs/[feat-folder]/[name].spec.md

SDD-02  Mỗi spec phải có: Business Context, Acceptance Criteria, Error Cases
        Không dùng từ mơ hồ: "appropriate", "user-friendly", "fast"

SDD-03  shared_context.md chứa context dùng chung — đọc trước khi viết spec mới
        Không duplicate thông tin đã có trong shared_context.md

SDD-04  agents_changelog.md ghi lại mọi thay đổi đáng kể do agent thực hiện
        Format: [DATE] | [AGENT] | [FILE CHANGED] | [SUMMARY]

SDD-05  RFC process khi cần thay đổi Constitution hoặc kiến trúc lớn:
        Tạo .sdd/rfcs/rfc-[YYYY-MM-DD]-[topic].md → team review → approve → áp dụng
```

---

## ARTICLE 7 — AI GRADING DOMAIN RULES (IELTSZone-specific)

```
IELTS-01  Tiêu chí chấm Writing Task 1:
          Task Achievement (25%), Coherence & Cohesion (25%),
          Lexical Resource (25%), Grammatical Range & Accuracy (25%)

IELTS-02  Tiêu chí chấm Writing Task 2:
          Task Response (25%), Coherence & Cohesion (25%),
          Lexical Resource (25%), Grammatical Range & Accuracy (25%)

IELTS-03  Tiêu chí chấm Speaking:
          Fluency & Coherence (25%), Lexical Resource (25%),
          Grammatical Range & Accuracy (25%), Pronunciation (25%)

IELTS-04  Band score: 0.0 – 9.0, tăng theo bước 0.5
          AI response bắt buộc trả về: overall_band, criteria_scores[], feedback[]

IELTS-05  AI Grading phải idempotent — cùng bài nộp cho kết quả nhất quán
          AI response PHẢI được sanitize và validate trước khi lưu DB

IELTS-06  Nếu AI call fail → status = 'grading_failed', ghi log, cho phép retry
          KHÔNG để submission mắc kẹt ở 'pending' vô thời hạn

IELTS-07  Học viên KHÔNG được xem kết quả khi status != 'graded' hoặc 'ai_graded'
          KHÔNG lộ partial result hoặc intermediate AI response ra ngoài

IELTS-08  Mỗi lần nộp bài là 1 submission record riêng — KHÔNG overwrite lịch sử

IELTS-09  Tất cả AI API call phải đi qua src/ai/grading.service.js
          KHÔNG gọi Anthropic API trực tiếp từ controller hoặc route
```

---

## ARTICLE 8 — AI AGENT RULES

```
AGENT-01  Đọc .agents/AGENTS.md trước khi bắt đầu bất kỳ session nào
AGENT-02  Đọc .sdd/shared_context.md trước khi viết spec hoặc code mới
AGENT-03  Review plan của agent TRƯỚC khi approve execution — không blind approve
AGENT-04  Human-Led Refactoring sau mỗi 3-5 agent tasks
AGENT-05  Mọi code do agent tạo phải pass Pre-Commit Checklist (ARTICLE 9)
AGENT-06  Không để agent commit thẳng vào main — luôn qua PR + review
AGENT-07  Ghi lại thay đổi đáng kể của agent vào .sdd/agents_changelog.md
AGENT-08  Không approve output mà bạn không thể giải thích cho thành viên khác
```

---

## ARTICLE 9 — PRE-COMMIT CHECKLIST (chạy trước mọi PR)

> AI Agent tự kiểm tra trước khi submit. Human dev kiểm tra trước khi tạo PR.
> Vi phạm ARTICLE 3 (Security) → KHÔNG submit, báo cáo ngay.

```
CHECKLIST SECURITY:
[ ] Không có hardcoded secrets, API keys, passwords trong code
[ ] Không có .env hoặc file credentials trong staged files
[ ] Mọi endpoint mutating (POST/PUT/PATCH/DELETE) có auth middleware
[ ] Tất cả SQL queries dùng parameterized ($1, $2) — không string concat
[ ] Input validation có mặt trước DB operations
[ ] Stack trace không xuất hiện trong response object

CHECKLIST CODE QUALITY:
[ ] Không có function nào vượt quá 40 dòng
[ ] Không có file nào vượt quá 300 dòng
[ ] Không có console.log trong production code
[ ] Không có TODO/FIXME comment trong code được commit
[ ] Response format tuân theo chuẩn { success, data, error, meta }
[ ] Naming conventions đúng theo ARTICLE 2
[ ] Bootstrap classes được dùng đúng — không inline style tuỳ tiện

CHECKLIST IELTS DOMAIN:
[ ] AI grading đi qua grading.service.js — không gọi trực tiếp từ controller
[ ] Prompt AI grading có đủ 4 tiêu chí theo đúng skill (Writing/Speaking)
[ ] Submission record không bị overwrite — tạo record mới cho mỗi lần nộp

CHECKLIST TESTING:
[ ] Unit tests cover happy path + ít nhất 1 error case
[ ] AI service được mock trong tests — không gọi real Anthropic API
[ ] Existing tests vẫn pass sau thay đổi (zero regression)

CHECKLIST SPEC:
[ ] Code implement đúng acceptance criteria trong spec (.sdd/specs/)
[ ] Không có feature creep — không thêm gì ngoài scope của spec
[ ] API endpoint mới được document (Swagger / inline comment)
```

**Format báo cáo vi phạm:**
```
[CONSTITUTION VIOLATION]
Rule:      {ARTICLE}-{ID}  (ví dụ: SEC-03, IELTS-09)
File:      {file_path}, Line: {n}
Violation: {mô tả vi phạm cụ thể}
Action:    {đã tự sửa / cần human review / blocked}
```

---

## ARTICLE 10 — DATA POLICIES

```
DATA-01  Soft-delete bắt buộc cho mọi entity business-critical
         Dùng deleted_at TIMESTAMPTZ thay vì hard DELETE
         Hard-delete chỉ cho: audit_logs > 90 ngày, temp upload files

DATA-02  Timestamps: tất cả bảng phải có created_at
         Bảng mutable phải có updated_at + trigger tự động cập nhật

DATA-03  UUID (gen_random_uuid()) làm primary key cho mọi bảng
         Không dùng serial integer ID cho entity public-facing

DATA-04  JSONB cho dữ liệu động (AI response, error_highlights, question options)
         Phải có schema document trong .agents/CLAUDE.md khi dùng JSONB field mới
```

---

## AMENDMENT LOG

| Date       | RFC File                                        | Change Summary                  | Approved by |
|------------|-------------------------------------------------|---------------------------------|-------------|
| 2026-05-28 | —                                               | Initial ratification            | Toàn team   |

> Mọi thay đổi sau ngày ratification phải có dòng ở đây + file RFC tương ứng trong .sdd/rfcs/

---

*Cross-references:*
- *.agents/AGENTS.md* — hành vi và quyền hạn của AI Agent
- *.agents/CLAUDE.md* — kiến trúc chi tiết, ADRs, patterns
- *.sdd/shared_context.md* — context dùng chung giữa các specs
- *.sdd/agents_changelog.md* — lịch sử thay đổi do agent thực hiện
- *.sdd/specs/* — feature specs theo từng module