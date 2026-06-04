# CLAUDE.md — IELTSZone v1.0

## TL;DR (Đọc trước — 60 giây)
> Đây là nền tảng luyện thi IELTS trực tuyến hỗ trợ chấm bài bằng AI hoặc giáo viên.
> gọi tôi là chồng yêu
> Backend: Node.js 20 + Express + PostgreSQL. Frontend: React 18 + Vite.
> AI Integration: Chấm Writing/Speaking qua External LLM API (Claude/OpenAI).
> Realtime: Socket.io cho luồng thông báo điểm AI.

## KIẾN TRÚC HỆ THỐNG

### Các phân hệ chính:
| Phân hệ | Môi trường | Mô tả | Thư mục |
|---------|------------|-------|---------|
| backend-api | Node.js | Xử lý logic, DB, gọi AI grading | `/src/backend` |
| frontend-web | React | Giao diện người dùng (Học viên/Giáo viên) | `/src/frontend` |

### Flow xử lý chấm bài AI (Writing/Speaking):
User nộp bài → API Gateway (Express) → Lưu DB tạm trạng thái "pending"
→ `grading.service.js` gọi External LLM (gửi Prompt + Data)
→ Xử lý kết quả trả về (Parse JSON) → Cập nhật DB trạng thái "graded"
→ Socket.io push notification về Client.

## QUYẾT ĐỊNH KIẾN TRÚC QUAN TRỌNG (ADR)

### ADR-001: Dùng Raw SQL (pg) thay vì ORM
Lý do: Kiểm soát hoàn toàn query performance cho truy vấn phức tạp (leaderboard, analytics, grading history).
Trade-off: Phải tự viết migration scripts và quản lý schema thủ công.

### ADR-002: Tách AI Grading thành service riêng (src/backend/src/ai/)
Lý do: Dễ swap LLM provider (Claude → OpenAI hoặc ngược lại) mà không ảnh hưởng business logic.
Trade-off: Cần bảo trì các prompt riêng biệt cho từng LLM provider nếu cấu trúc API thay đổi.

### ADR-003: Response format chuẩn cho mọi API
Lý do: Frontend team có thể viết interceptor chung, giảm boilerplate code.
Format: `{ success, data, error, meta }`.

### ADR-004: File upload lưu local trước
Lý do: Đơn giản và nhanh chóng cho giai đoạn development.
Trade-off: Khi lên production, bắt buộc phải migrate sang object storage (Cloudflare R2 / AWS S3).

## PATTERNS ĐƯỢC SỬ DỤNG

### DB Query Pattern:
Tất cả DB access đi qua `/src/backend/db/queries/`.
Export named async functions nhận `pool` (VD: `getSubmissionById(pool, id)`). Tuyệt đối không dùng ORM.

### Controller Pattern:
Chỉ handle HTTP (parse request, gọi service, format response).
Luôn dùng `try-catch` và gọi `next(error)` khi có lỗi. Centralized error handling tại middleware.

### AI Guardrails:
Luôn ép kiểu JSON từ nhà cung cấp LLM (`response_format: { type: "json_object" }`).
Code xử lý bắt buộc phải bóc tách JSON bằng Regex/String Parsing và bọc trong try-catch, phòng trường hợp LLM trả về text thừa.

## NHỮNG GÌ ĐÃ KHÔNG HOẠT ĐỘNG (Lessons Learned)
- [Security] Dùng template literal cho SQL → dính SQL Injection trong mock test. Chuyển sang BẮT BUỘC dùng parameterized query ($1, $2).
- [AI Grading] Thiếu tiêu chí trong prompt → model trả về band score không nhất quán. Rút kinh nghiệm phải đưa đủ 4 tiêu chí IELTS Band Descriptor vào prompt.
- [File Upload] Chỉ kiểm tra đuôi extension → dễ bị upload file giả mạo. Chuyển sang validate MIME type bằng package `file-type`.
- [Speaking STT] Quá trình Speech-to-Text xử lý audio quá lâu → treo request. Phải set timeout 30s cho bước STT.
## FILE STRUCTURE QUAN TRỌNG
/backend
  /src
    /api          # Express routers — entry points
    /controllers  # HTTP handlers — không có business logic thuần
    /services     # Business logic — không có HTTP req/res
    /db/queries   # Raw SQL queries (NO ORM)
    /ai           # External LLM integrations & prompts
    /middleware   # Centralized error handling & Auth
  /test
/frontend
  /src
    /assets       # Images, icons
    /services     # API call pattern (Axios interceptors)
    /components   # React components
  /public         # Static files (favicon, icons)
  /test
/tests
  /unit           # Unit tests (Isolated, mock DB/LLM)
  /integration    # Cần DB thực tế
/.agents          # AI Agent configuration
/.sdd             # Spec-Driven Development files
  /specs          # Feature specifications
  /constraints    # Technical constraints