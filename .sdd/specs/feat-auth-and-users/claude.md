# CLAUDE.md — IELTS E-Learning Platform v1.0

## TL;DR (Đọc trước — 60 giây)
> Hệ thống E-learning luyện thi IELTS tích hợp AI chấm bài.
> Backend: Node.js (Express). Frontend: React + TypeScript. Database: SQL Server.
> Kiến trúc: Core & Shell (SDD). 
> Luồng cốt lõi: Nộp bài Writing/Speaking -> Xử lý bất đồng bộ (Socket.io) -> Chấm bằng AI hoặc Tutor.

## KIẾN TRÚC HỆ THỐNG
### Core Components:
- **Core (Backend):** Xử lý nghiệp vụ chấm điểm, quản lý bài nộp, tích hợp API AI (Claude/GPT).
- **Shell (Frontend):** Giao diện học viên, Tutor Dashboard, Chatbot UI.
- **Async Engine:** Xử lý file Audio/Writing bằng hàng đợi để tránh Timeout HTTP.

### Data Flow (Luồng chấm bài cốt lõi):
1. **Submit:** Student nộp bài -> Backend lưu `PENDING_AI/TUTOR`.
2. **Dispatch:** Nếu AI -> Gọi Service AI -> Backend đợi. Nếu Tutor -> Đẩy vào Dashboard Tutor.
3. **Notify:** AI/Tutor chấm xong -> DB Update -> Socket.io emit về Client -> Cập nhật trạng thái `GRADED`.

## QUYẾT ĐỊNH KIẾN TRÚC (ADR)
### ADR-001: Asynchronous Processing for AI Grading
- Lý do: AI xử lý bài Writing/Speaking tốn > 5 giây. HTTP Request sẽ bị Timeout.
- Giải pháp: Lưu vào DB -> Trả về 202 Accepted -> Backend xử lý ngầm -> Thông báo kết quả qua Socket.io.

### ADR-002: Core & Shell Pattern
- Lý do: Đảm bảo luồng chấm điểm (Core) luôn ổn định, giao diện (Shell) có thể thay đổi linh hoạt.
- Quy tắc: Frontend không được tự ý gọi trực tiếp API AI mà phải đi qua Backend Service của nhóm.

## PATTERNS ĐƯỢC SỬ DỤNG
### Controller-Service-Repository Pattern:
- **Controller:** Tiếp nhận request, validate input (Pydantic/Joi).
- **Service:** Chứa Business Logic (Quyết định chấm bằng AI hay Tutor).
- **Repository:** Chỉ tương tác với SQL Server (Query/Command).

### Socket.io Pattern:
- Dùng cho thông báo điểm số realtime. Đừng dùng polling (gửi request liên tục).

## NHỮNG ĐIỀU CẤM KỴ (Lessons Learned/Restrictions)
- **Cấm:** Không được gọi API AI trực tiếp từ Frontend.
- **Cấm:** Không để file audio quá 10MB lưu thẳng vào server (Phải validate kích thước tại Frontend).
- **Cấm:** Code logic chấm điểm IELTS trong các React Component.

## FILE STRUCTURE QUAN TRỌNG
/src
 ├── /controllers  # Nhận request từ React
 ├── /services     # Logic xử lý (chấm bài, gọi AI)
 ├── /repositories # Truy vấn SQL Server
 ├── /models       # Định nghĩa Schema DB
 ├── /socket       # Xử lý kết nối Realtime
 ├── /ai-engine    # Các System Prompt cho AI
/tests
 ├── /unit         # Test logic chấm điểm (mock AI)
 ├── /integration  # Test kết nối DB