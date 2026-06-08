# SRS Report 3 — Phần 1: Use Case List & Use Case Specifications

> **Dự án:** IELTS Online Learning & Testing System  
> **Nhóm:** SWP391  
> **Ngày:** 05/06/2026

---

## 1. Use Case Diagrams

> **⚠️ PHẦN NÀY NHÓM CẦN TỰ VẼ bằng Draw.io, StarUML, PlantUML hoặc Lucidchart.**
> Cần vẽ **5 UC Diagram** riêng cho từng Actor + 1 diagram tổng.

### Danh sách UC Diagram cần vẽ:

| # | Tên Diagram | Actor chính | Ghi chú |
|---|------------|-------------|---------|
| 1 | Guest UC Diagram | Guest | Register, Verify Email, Login, Login Google, Forgot/Reset Password, View Landing |
| 2 | Student UC Diagram | Student | Take Reading/Listening Test, Submit Writing/Speaking, View Results/History, Profile, Logout |
| 3 | Tutor UC Diagram | Tutor | Manage Tests, Create/Edit Questions, View Queue, Claim & Grade, Add Notes |
| 4 | Admin UC Diagram | Admin | Manage Users (List/Change Role/Status/Ban), View Audit Logs |
| 5 | AI System UC Diagram | AI System | AI Evaluate Writing, AI Evaluate Speaking, Generate Band Score |
| 6 | **Overall UC Diagram** | Tất cả | Tổng hợp tất cả UC từ 5 diagram trên |

---

## 2. Use Case List (Bảng tổng hợp)

| UC-ID | Tên Use Case | Actor(s) | Mô tả ngắn | Ưu tiên |
|-------|-------------|----------|-------------|---------|
| **Guest** | | | | |
| UC-G01 | Register Account | Guest | Đăng ký tài khoản mới bằng email | High |
| UC-G02 | Verify Email | Guest | Xác thực email qua link trong hộp thư | High |
| UC-G03 | Login | Guest/User | Đăng nhập bằng email & password | High |
| UC-G04 | Login with Google | Guest/User | Đăng nhập bằng Google OAuth | High |
| UC-G05 | Forgot Password | Guest | Yêu cầu OTP reset mật khẩu qua email | Medium |
| UC-G06 | Reset Password | Guest | Đặt lại mật khẩu bằng OTP | Medium |
| UC-G07 | View Landing Page | Guest | Xem trang giới thiệu hệ thống | Low |
| **Student** | | | | |
| UC-S01 | View Dashboard | Student | Xem tổng quan: target band, avg score, AI quota | High |
| UC-S02 | Take Reading Test | Student | Làm bài thi Reading có đếm ngược thời gian | High |
| UC-S03 | Take Listening Test | Student | Làm bài thi Listening có đếm ngược | High |
| UC-S04 | Submit Writing | Student | Nộp bài Writing (chọn AI hoặc Tutor chấm) | High |
| UC-S05 | Submit Speaking | Student | Upload audio Speaking (chọn AI hoặc Tutor) | High |
| UC-S06 | View Test Result | Student | Xem kết quả + band score sau nộp bài | High |
| UC-S07 | View Test Result Detail | Student | Xem chi tiết từng câu đúng/sai | Medium |
| UC-S08 | View Submission History | Student | Xem lịch sử bài Writing/Speaking đã nộp | Medium |
| UC-S09 | View Test History | Student | Xem lịch sử bài Reading/Listening | Medium |
| UC-S10 | View Feedback | Student | Xem nhận xét chi tiết từ AI hoặc Tutor | High |
| UC-S11 | Update Profile | Student | Cập nhật tên, avatar, target band score | Medium |
| UC-S12 | Change Password | Student | Đổi mật khẩu tài khoản | Medium |
| UC-S13 | Browse Tests | Student | Duyệt danh sách bài thi Reading/Listening | High |
| UC-S14 | View Test Detail | Student | Xem thông tin chi tiết bài thi | Medium |
| UC-S15 | Logout | Student | Đăng xuất khỏi hệ thống | Medium |
| **Tutor** | | | | |
| UC-T01 | View Tutor Dashboard | Tutor | Xem tổng quan workspace Tutor | High |
| UC-T02 | View Grading Queue | Tutor | Xem danh sách bài chờ chấm | High |
| UC-T03 | Claim Submission | Tutor | Nhận chấm một bài submission | High |
| UC-T04 | Grade Submission | Tutor | Chấm điểm Writing/Speaking theo IELTS criteria | High |
| UC-T05 | Run Prelim AI Check | Tutor | Yêu cầu AI kiểm tra ngữ pháp trước khi chấm | Medium |
| UC-T06 | Add Tutor Note | Tutor | Thêm ghi chú cho student | Low |
| UC-T07 | Manage Tests | Tutor | Quản lý danh sách bài thi | High |
| UC-T08 | Create Test | Tutor | Tạo bài thi mới | High |
| UC-T09 | Edit Test | Tutor | Chỉnh sửa thông tin bài thi | High |
| UC-T10 | Create Question | Tutor | Thêm câu hỏi vào bài thi | High |
| UC-T11 | Edit Question | Tutor | Chỉnh sửa câu hỏi trong bài thi | High |
| **Admin** | | | | |
| UC-A01 | View Admin Dashboard | Admin | Xem bảng điều khiển quản trị | High |
| UC-A02 | List Users | Admin | Xem danh sách user (phân trang, lọc) | High |
| UC-A03 | Change User Role | Admin | Thay đổi role user | High |
| UC-A04 | Change User Status | Admin | Thay đổi status user (active/inactive/banned) | High |
| UC-A05 | View Audit Logs | Admin | Xem nhật ký hoạt động hệ thống | Medium |
| **AI System** | | | | |
| UC-AI01 | AI Evaluate Writing | AI System | Tự động chấm điểm bài Writing | High |
| UC-AI02 | AI Evaluate Speaking | AI System | Tự động chấm điểm bài Speaking | High |
| UC-AI03 | Generate Band Score | AI System | Tính Band Score theo chuẩn IELTS | High |

---

## 3. Use Case Specifications (Đặc tả chi tiết)

---

### UC-G01: Register Account

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Guest |
| **Mô tả** | Đăng ký tài khoản mới với email, password, full name |
| **Pre-conditions** | Guest chưa có tài khoản. Guest đang ở trang Register. |
| **Post-conditions** | Tài khoản tạo (status=pending, role=student). Email xác thực được gửi. |

**Main Flow:**
1. Guest truy cập `/register`.
2. Guest nhập Email, Password, Full Name.
3. Guest nhấn "Đăng ký".
4. Hệ thống kiểm tra email chưa tồn tại.
5. Hệ thống hash password (bcrypt, cost=12).
6. Hệ thống tạo user (status=`pending`, role=`student`).
7. Hệ thống tạo verification token (SHA-256, hạn 24h).
8. Hệ thống gửi email xác thực.
9. Hiển thị "Kiểm tra email để xác thực tài khoản".

**Exception Flows:**
- **4a.** Email đã tồn tại → HTTP 400 "Registration failed" (chống email enumeration).
- **8a.** Gửi email thất bại → Log lỗi, thông báo user thử lại.

---

### UC-G03: Login

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Guest / User |
| **Pre-conditions** | User có tài khoản active. |
| **Post-conditions** | Session tạo. JWT tokens trả về. |

**Main Flow:**
1. User truy cập `/login`, nhập Email + Password, nhấn "Đăng nhập".
2. Hệ thống tìm user, kiểm tra không bị locked.
3. Verify password bằng bcrypt.
4. Gọi `handle_successful_login()`.
5. Kiểm tra sessions (max 3), tạo session mới (hạn 7 ngày).
6. Generate Access Token + Refresh Token.
7. Redirect Dashboard theo role.

**Exception Flows:**
- **2a.** Email không tồn tại → HTTP 401.
- **2b.** Account locked (failed >= 5) → HTTP 429 "Account temporarily locked 15 phút."
- **3a.** Password sai → `handle_failed_login()`, HTTP 401.
- **3b.** Status = banned/pending → HTTP 403.
- **5a.** >= 3 session → Auto revoke session cũ nhất.

---

### UC-G04: Login with Google

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Guest / User |
| **Pre-conditions** | User có tài khoản Google. |
| **Post-conditions** | User upsert vào DB. Session + JWT tạo. |

**Main Flow:**
1. User nhấn "Đăng nhập bằng Google".
2. Redirect Google OAuth consent screen.
3. User xác nhận → Google callback với code.
4. Exchange code → access_token → fetch profile.
5. Upsert user. Nếu mới → gửi welcome email (async).
6. Tạo session + JWT. Redirect Dashboard.

**Exception Flows:**
- **4a.** Exchange thất bại → HTTP 400.
- **5a.** User bị banned → HTTP 403.

---

### UC-G05 + UC-G06: Forgot & Reset Password

**UC-G05 - Forgot Password:**
1. Guest nhập email → Hệ thống tạo OTP 6 số (SHA-256, hạn 1h) → Gửi email.
2. Luôn trả "Nếu email tồn tại, hướng dẫn đã được gửi" (chống enumeration).

**UC-G06 - Reset Password:**
1. Guest nhập OTP + mật khẩu mới.
2. Hệ thống kiểm tra OTP hợp lệ, chưa hết hạn.
3. Kiểm tra password mới không trùng 3 lần gần nhất.
4. Hash + cập nhật. Nếu inactive → chuyển active. Ghi audit log.

**Exception:** OTP sai/hết hạn → HTTP 400. Trùng password → HTTP 400.

---

### UC-S02: Take Reading Test

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Student |
| **Pre-conditions** | Đã đăng nhập. Bài thi Reading tồn tại. |
| **Post-conditions** | Bài làm lưu. Điểm tính tự động. |

**Main Flow:**
1. Student chọn bài Reading → Instruction Modal hiển thị.
2. Nhấn "Bắt đầu" → Passage + câu hỏi + Timer (60 phút).
3. Trả lời câu hỏi, dùng Question Navigation di chuyển.
4. Nhấn "Nộp bài" → Tính điểm → Redirect Test Result.

**Exception:**
- Hết thời gian → Auto Submit Modal → Tự động nộp bài.
- Chưa trả lời hết → Cảnh báo, cho tiếp tục hoặc nộp.

---

### UC-S04: Submit Writing

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Student |
| **Pre-conditions** | Đã đăng nhập. |
| **Post-conditions** | Submission tạo (status=pending). |

**Main Flow:**
1. Student vào `/writing`, chọn Task 1/2.
2. Viết bài trong editor.
3. Chọn grader: "AI" hoặc "Tutor".
4. Nhấn "Submit" → Tạo submission.
5. AI → UC-AI01. Tutor → Vào Queue.

**Exception:** Bài trống → Lỗi validation. AI quota hết → Chỉ Tutor.

---

### UC-S05: Submit Speaking

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Student |
| **Pre-conditions** | Đã đăng nhập. Microphone khả dụng. |
| **Post-conditions** | Audio upload. Submission tạo. |

**Main Flow:**
1. Student vào `/speaking`, chọn Part 1/2/3, đọc đề.
2. Nhấn Record → Ghi âm → Stop → Preview.
3. Chọn grader, nhấn Submit → Upload multipart/form-data.

**Exception:** Microphone blocked → Hướng dẫn cấp quyền. Upload lỗi → Retry.

---

### UC-T04: Grade Submission

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Tutor |
| **Pre-conditions** | Tutor đã claim submission. |
| **Post-conditions** | Submission có band score + feedback. Status = `tutor_graded`. |

**Main Flow:**
1. Tutor mở bài đã claim → Xem nội dung + đề.
2. (Tùy chọn) Chạy AI Prelim Check.
3. Chấm điểm 4 criteria IELTS: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range.
4. Nhập band score từng criteria + overall + feedback.
5. Nhấn "Submit Grade" → Status = `tutor_graded`.

**Exception:** Thiếu điểm criteria → Validation error.

---

### UC-A03: Change User Role

| Mục | Chi tiết |
|-----|---------|
| **Actor** | Admin |
| **Pre-conditions** | Admin đã đăng nhập. Target user tồn tại. |
| **Post-conditions** | Role cập nhật. Sessions revoke. Audit log ghi. |

**Main Flow:**
1. Admin vào User Management, tìm user.
2. Chọn role mới (student/tutor/admin).
3. Nhấn "Cập nhật" → Cập nhật DB → Revoke sessions → Ghi audit log.

**Exception:** Đổi role chính mình → HTTP 403.

---

### UC-AI01: AI Evaluate Writing

| Mục | Chi tiết |
|-----|---------|
| **Actor** | AI System |
| **Pre-conditions** | Student submit Writing với grader = "ai". Quota còn. |
| **Post-conditions** | Submission có band score + AI feedback. Status = `ai_graded`. |

**Main Flow:**
1. Nhận submission → AI phân tích 4 criteria.
2. Tính band score → Generate feedback → Cập nhật submission.

**Exception:** Timeout > 5s → Status = `failed`. Bài quá ngắn → Cảnh báo.
