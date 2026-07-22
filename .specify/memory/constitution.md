# IELTSZone Constitution (Project Law)

**Mục đích**: Đây là "hiến pháp" (tập hợp các quy tắc tối cao và bất biến) của dự án IELTSZone. Tất cả các đặc vụ AI (AI agents) và lập trình viên khi tham gia viết code, thiết kế kiến trúc hoặc viết tài liệu đều phải tuân thủ tuyệt đối các quy định trong file này. Mọi thay đổi cấu trúc đều phải thông qua RFC process.

## Core Principles (Nguyên Tắc Cốt Lõi)

### I. Tech Stack & Cơ Sở Dữ Liệu (NON-NEGOTIABLE)
- **Công nghệ**: Node.js 20 LTS, Express 5.x, React 18 + Vite, Bootstrap 5.x (Không dùng Tailwind/CSS-in-JS).
- **Tuyệt đối không dùng ORM** (Prisma, Sequelize, TypeORM...). Chỉ sử dụng driver `pg` thuần của PostgreSQL 16.
- **Bắt buộc dùng Parameterized SQL** (ví dụ: `$1, $2, $3`) cho mọi truy vấn để chống SQL Injection.
- **Soft-delete**: Bắt buộc dùng `deleted_at` TIMESTAMPTZ thay vì hard DELETE.
- **UUID**: Sử dụng `gen_random_uuid()` làm primary key cho mọi bảng. Không dùng integer ID cho entity public-facing.

### II. Giao Thức API (API Protocol)
- **Định dạng Response chuẩn**: Mọi API trả về bắt buộc phải bọc trong một object chuẩn: 
  `{ "success": boolean, "data": any, "error": object|null, "meta": object }`.
- **Định tuyến (Routing)**: Đường dẫn API bắt buộc dùng `kebab-case` (vd: `/api/v1/writing-submissions`).
- **Async/Await**: Luôn dùng async/await, không dùng callback.

### III. Xử Lý Lỗi & Bảo Mật (Security - Layer 1)
- **Tập trung hóa**: Mọi lỗi phải đẩy qua middleware xử lý lỗi tập trung. KHÔNG expose stack trace trong response — chỉ trong server logs.
- **HTTP Status Code**: Phải trả về đúng mã lỗi HTTP tương ứng nghiệp vụ (400, 401, 403, 404, 422, 500).
- **API Keys & Secrets**: Biến môi trường (`.env`) ONLY — không bao giờ hardcode trong source code. `JWT_SECRET`, `DB_HOST` dùng `UPPER_SNAKE`.
- **Phân quyền (Auth)**: `userId` và `role` PHẢI lấy từ auth middleware, KHÔNG bao giờ lấy từ request body/query. Mọi endpoint mutating (POST/PUT/PATCH/DELETE) phải có auth middleware.

### IV. Naming Conventions & Code Quality
- **React Components**: `PascalCase` (`WritingSubmission.jsx`)
- **Hooks / Services / Utils**: `camelCase` (`useAuth.js`, `grading.service.js`)
- **DB Tables & Columns**: `snake_case` (`writing_submissions`, `band_score`)
- **Giới hạn kích thước**: Max 40 dòng/function. Max 300 dòng/file.
- **Lint/Format**: Prettier (auto-format), ESLint (0 warnings).

### V. Testing Requirements
- **Coverage**: Tối thiểu 80% cho toàn bộ service/business logic mới.
- **Unit/Integration tests**: Bắt buộc cho mọi function trong `src/services/`, `src/db/queries/`, và mọi API endpoint (happy path + 1 error case).
- **Mock AI**: AI grading service phải được mock trong unit tests, không gọi real API.

## Rules of Engagement (Quy Tắc Vận Hành AI)

### VI. Spec-Driven Workflow (.sdd/)
- Không viết code khi chưa có spec được duyệt (nằm trong `.sdd/specs/`).
- Đọc `shared_context.md` trước khi viết spec mới.
- Agent tự động ghi lại các thay đổi quan trọng vào `.sdd/agents_changelog.md`.

### VII. Quy tắc nghiệp vụ đặc thù (AI Grading Domain)
- **Writing**: Chấm 4 tiêu chí: Task Achievement/Response (25%), Coherence & Cohesion (25%), Lexical Resource (25%), Grammatical Range & Accuracy (25%).
- **Speaking**: Chấm 4 tiêu chí: Fluency & Coherence (25%), Lexical Resource (25%), Grammatical Range & Accuracy (25%), Pronunciation (25%).
- **Idempotency**: AI Grading phải idempotent (cùng bài nộp cho kết quả nhất quán).
- **Lỗi AI**: Nếu AI call fail -> status = 'grading_failed', ghi log, cho phép retry. KHÔNG để submission mắc kẹt ở 'pending'.
- **Cô lập Logic**: Tất cả AI API call phải đi qua `src/ai/grading.service.js`. KHÔNG gọi Anthropic/Gemini API trực tiếp từ controller/route. Mọi AI response PHẢI được sanitize và validate trước khi lưu DB.
- **Phân tách luồng**: AI Chatbot độc lập hoàn toàn với AI Grading.

## Governance (Quản Trị & Pre-Commit)

- **Agent Review**: AI Agent phải tự kiểm tra toàn bộ các quy tắc bảo mật, chất lượng code, domain IELTS, testing, và spec (Pre-Commit Checklist) TRƯỚC khi submit bất kỳ Pull Request hoặc thay đổi nào.
- Bất kỳ tài liệu Spec, Plan hay Task nào được AI tạo ra đều phải tự động kiểm tra đối chiếu (`Constitution Check`) với file này trước khi tiến hành.
- **Lưu ý**: File này là sự tổng hợp (mirror) các điều luật từ `.sdd/constitution.md` để nạp vào bộ nhớ (memory) của các đặc vụ AI.

**Version**: 1.0 (dựa theo .sdd/constitution.md) | **Ratified**: 2026-05-28 | **Framework**: Speckit
