# SRS Report 3 — Phần 2: NFR, Business Rules & User Interfaces

> **Dự án:** IELTS Online Learning & Testing System  
> **Nhóm:** SWP391  
> **Ngày:** 05/06/2026

---

## 1. Yêu cầu Phi chức năng (Non-Functional Requirements)

### 1.1 Performance (Hiệu năng)

| ID | Yêu cầu | Chỉ tiêu |
|----|---------|----------|
| NFR-P01 | Thời gian phản hồi API thông thường | ≤ 500ms cho các API CRUD (login, profile, list tests) |
| NFR-P02 | Thời gian AI chấm Writing/Speaking | ≤ 5 giây cho mỗi bài submission |
| NFR-P03 | Thời gian tải trang (First Contentful Paint) | ≤ 2 giây trên mạng 4G |
| NFR-P04 | Concurrent users | Hệ thống chịu tải tối thiểu 200 students thi cùng lúc |
| NFR-P05 | Upload audio Speaking | ≤ 10 giây cho file audio tối đa 10MB |
| NFR-P06 | Token refresh | Access Token hết hạn → Refresh tự động trong ≤ 200ms (không gián đoạn UX) |

### 1.2 Security (Bảo mật)

| ID | Yêu cầu | Chi tiết |
|----|---------|---------|
| NFR-S01 | Mã hóa mật khẩu | Bcrypt với cost factor = 12. Không lưu plaintext. |
| NFR-S02 | Chống brute-force | Khóa tài khoản 15 phút sau 5 lần đăng nhập sai liên tiếp (`locked_until`). |
| NFR-S03 | JWT Token | Access Token (ngắn hạn, 15 phút) + Refresh Token (7 ngày). Refresh Token lưu HttpOnly cookie. |
| NFR-S04 | Session management | Tối đa 3 active sessions/user. Session cũ nhất tự động bị revoke. |
| NFR-S05 | Password history | Không cho phép đặt lại password trùng 3 lần gần nhất (`password_history`). |
| NFR-S06 | Email enumeration prevention | API Register và Forgot Password trả response giống nhau dù email tồn tại hay không. |
| NFR-S07 | Phân quyền truy cập | Role-based (student/tutor/admin). `ProtectedRoute` kiểm tra role trên frontend. Middleware `authorize` trên backend. |
| NFR-S08 | Token bảo mật | Verification token + Reset OTP lưu dạng SHA-256 hash. Raw token chỉ gửi qua email. |
| NFR-S09 | Audit Log | Mọi thay đổi state tài khoản (tạo, đổi role, deactivate, đổi password) được ghi vào `audit_logs` với actor_id, action, old_value, new_value, ip_address. |
| NFR-S10 | CORS & Credentials | API chỉ chấp nhận requests từ frontend domain. `withCredentials: true`. |
| NFR-S11 | Admin self-protection | Admin không được tự đổi role/status của chính mình → HTTP 403. |

### 1.3 Reliability & Usability (Độ tin cậy và Khả dụng)

| ID | Yêu cầu | Chi tiết |
|----|---------|---------|
| NFR-R01 | Uptime mong muốn | ≥ 99.5% (tương đương downtime ≤ 3.6 giờ/tháng) |
| NFR-R02 | Responsive design | Giao diện tương thích Desktop (≥1120px), Tablet (768–1119px), Mobile (<600px). |
| NFR-R03 | Auto-save khi thi | Câu trả lời được lưu tạm trên client khi student chuyển câu (tránh mất dữ liệu). |
| NFR-R04 | Auto-submit khi hết giờ | Timer đếm ngược đến 0 → Hệ thống tự động submit bài (AutoSubmitModal). |
| NFR-R05 | Error handling | Mọi API lỗi trả format chuẩn: `{ success: false, data: null, error: { code, message } }`. |
| NFR-R06 | Token auto-refresh | Khi Access Token hết hạn, Axios interceptor tự động gọi refresh → retry request gốc. User không bị gián đoạn. |
| NFR-R07 | Browser support | Chrome, Firefox, Safari, Edge (2 phiên bản mới nhất). |
| NFR-R08 | Ngôn ngữ | Giao diện chính: Tiếng Việt. Nội dung đề thi: Tiếng Anh. |

---

## 2. Quy tắc Nghiệp vụ (Business Rules)

### 2.1 Công thức quy đổi Band Score tổng thể

IELTS Overall Band Score được tính từ trung bình 4 kỹ năng (Reading, Listening, Writing, Speaking) theo quy tắc làm tròn chuẩn BC/IDP:

**Quy tắc làm tròn:**

| Trung bình | Làm tròn thành | Giải thích |
|------------|----------------|------------|
| x.00 | x.0 | Chẵn → giữ nguyên |
| x.125 | x.0 | < x.25 → làm tròn xuống |
| x.25 | x.5 | ≥ x.25 → làm tròn lên 0.5 |
| x.375 | x.5 | < x.75 → giữ 0.5 |
| x.625 | x.5 | < x.75 → giữ 0.5 |
| x.75 | x+1.0 | ≥ x.75 → làm tròn lên band tiếp theo |
| x.875 | x+1.0 | ≥ x.75 → làm tròn lên |

**Công thức:** `Overall = round_ielts(mean(Reading, Listening, Writing, Speaking))`

**Ví dụ:**
- Reading: 7.0, Listening: 6.5, Writing: 6.0, Speaking: 7.0
- Trung bình = (7.0 + 6.5 + 6.0 + 7.0) / 4 = 6.625
- 6.625 → nằm giữa 6.5 và 7.0, phần thập phân .625 < .75 → **Overall = 6.5**

**Ví dụ 2:**
- Reading: 7.0, Listening: 7.0, Writing: 6.5, Speaking: 7.0
- Trung bình = 6.875 → .875 ≥ .75 → **Overall = 7.0**

### 2.2 Logic đếm ngược thời gian làm bài

| Quy tắc | Chi tiết |
|---------|---------|
| **BR-T01** | Mỗi bài thi Reading có thời gian mặc định **60 phút**. |
| **BR-T02** | Mỗi bài thi Listening thời gian phụ thuộc vào độ dài audio + 10 phút transfer time. |
| **BR-T03** | Timer hiển thị dạng `mm:ss` trên TimerBar component. |
| **BR-T04** | Khi còn **5 phút**, TimerBar đổi màu cảnh báo (đỏ/cam). |
| **BR-T05** | Khi còn **0 giây**, hệ thống hiển thị **AutoSubmitModal** và tự động nộp bài. Student không thể tiếp tục làm. |
| **BR-T06** | Nếu student nhấn "Nộp bài" trước khi hết giờ, bài được nộp ngay. Thời gian còn lại không ảnh hưởng điểm. |
| **BR-T07** | Timer chạy client-side. Thời điểm bắt đầu (`started_at`) được ghi lại để backend validate. |

### 2.3 Quy định Resubmit cho AI Writing Evaluate

| Quy tắc | Chi tiết |
|---------|---------|
| **BR-AI01** | Mỗi student có **AI Grading Quota** giới hạn (mặc định: 10 lần/tháng). |
| **BR-AI02** | Mỗi lần submit Writing chọn AI sẽ trừ 1 quota. |
| **BR-AI03** | Khi quota = 0, student chỉ có thể chọn **Tutor** để chấm. UI ẩn/disable lựa chọn AI. |
| **BR-AI04** | Nếu AI chấm **thất bại** (status = `failed`, ví dụ timeout), quota được **hoàn lại** và student có thể resubmit. |
| **BR-AI05** | Student có thể resubmit bài Writing bất kỳ lúc nào (không giới hạn số lần), nhưng mỗi lần resubmit là một submission mới. |
| **BR-AI06** | Quota reset vào ngày 1 hàng tháng. |
| **BR-AI07** | Dashboard hiển thị `ai_grading_quota_remaining` để student theo dõi. |

### 2.4 Quy tắc chấm điểm IELTS (Band Score criteria)

**Writing (Task 1 & Task 2):**

| Criteria | Trọng số |
|----------|---------|
| Task Achievement / Task Response | 25% |
| Coherence and Cohesion | 25% |
| Lexical Resource | 25% |
| Grammatical Range and Accuracy | 25% |

**Speaking (Part 1, 2, 3):**

| Criteria | Trọng số |
|----------|---------|
| Fluency and Coherence | 25% |
| Lexical Resource | 25% |
| Grammatical Range and Accuracy | 25% |
| Pronunciation | 25% |

Mỗi criteria cho điểm từ **0.0 đến 9.0** (bước 0.5). Band Score của skill = trung bình 4 criteria, làm tròn theo quy tắc ở mục 2.1.

**Reading & Listening:**

| Số câu đúng (trên 40) | Band Score |
|----------------------|-----------|
| 39-40 | 9.0 |
| 37-38 | 8.5 |
| 35-36 | 8.0 |
| 33-34 | 7.5 |
| 30-32 | 7.0 |
| 27-29 | 6.5 |
| 23-26 | 6.0 |
| 19-22 | 5.5 |
| 15-18 | 5.0 |
| 13-14 | 4.5 |
| 10-12 | 4.0 |

*(Bảng trên là tham khảo, số liệu chính xác cần tuân theo bảng quy đổi BC/IDP mới nhất)*

---

## 3. Yêu cầu Giao diện (User Interfaces / Wireframes)

> **⚠️ PHẦN NÀY NHÓM CẦN TỰ VẼ Wireframe/Mockup bằng Figma, Adobe XD hoặc Draw.io.**
> Dưới đây là mô tả chi tiết từng màn hình để nhóm vẽ.

### 3.1 Student Dashboard (`/dashboard`)

**Mô tả:** Màn hình tổng quan cho Student sau đăng nhập.

**Các thành phần cần có:**
1. **Navbar** (top): Logo, menu items (Reading, Listening, Writing, Speaking), Profile dropdown (Profile, History, Logout).
2. **Welcome Card**: Hiển thị tên student + avatar.
3. **Stats Cards** (3 cards hàng ngang):
   - Target Band Score (ví dụ: 7.0)
   - Average Band Score (ví dụ: 6.8)
   - AI Grading Quota Remaining (ví dụ: 8/10)
4. **Recent Activity**: Danh sách 5 submissions gần nhất (type, date, status, band score).
5. **Quick Actions**: Buttons "Làm bài Reading", "Làm bài Listening", "Submit Writing", "Submit Speaking".

---

### 3.2 Test Interface — Reading Test (`/tests/:id/reading`)

**Mô tả:** Màn hình làm bài thi Reading.

**Layout:** Chia 2 cột (desktop), 1 cột (mobile).

**Các thành phần:**
1. **TimerBar** (top, fixed): Thanh đếm ngược `mm:ss`, đổi màu đỏ khi còn < 5 phút.
2. **Cột trái — Passage**: Nội dung bài đọc (scrollable), có thể highlight text.
3. **Cột phải — Questions**: Danh sách câu hỏi (multiple choice, fill-in-blank, T/F/NG...).
4. **Question Navigation** (bottom): Grid các ô số câu hỏi, màu sắc phân biệt:
   - Trắng = Chưa trả lời
   - Xanh = Đã trả lời
   - Vàng = Đánh dấu review
5. **Nút "Nộp bài"**: Nút submit cố định ở góc.
6. **Instruction Modal**: Hiển thị khi bắt đầu, hướng dẫn quy tắc thi.
7. **AutoSubmit Modal**: Popup khi hết giờ, thông báo bài đã tự động nộp.

---

### 3.3 Test Interface — Listening Test (`/tests/:id/listening`)

**Mô tả:** Tương tự Reading nhưng thay passage bằng audio player.

**Khác biệt so với Reading:**
1. **Audio Player** (thay cột trái): Play/Pause, progress bar, volume. Audio chỉ phát 1 lần (mô phỏng thi thật).
2. **Questions**: Hiển thị theo sections tương ứng với phần audio.
3. TimerBar, Question Navigation, Submit giống Reading.

---

### 3.4 Writing Page (`/writing`)

**Mô tả:** Màn hình submit bài Writing.

**Các thành phần:**
1. **Task Selector**: Tabs "Task 1" / "Task 2".
2. **Đề bài**: Hiển thị đề Writing (có thể kèm hình ảnh cho Task 1).
3. **Text Editor**: Textarea lớn, có word count.
4. **Grader Selector**: Radio buttons "AI (nhanh, tự động)" / "Tutor (chi tiết, chờ chấm)".
5. **Quota Display**: "AI quota còn lại: 8/10" (disable AI option nếu = 0).
6. **Submit Button**.

---

### 3.5 Speaking Page (`/speaking`)

**Mô tả:** Màn hình submit bài Speaking.

**Các thành phần:**
1. **Part Selector**: Tabs "Part 1" / "Part 2" / "Part 3".
2. **Đề bài**: Card hiển thị topic + câu hỏi.
3. **Audio Recorder**: Nút Record (đỏ), Stop, Preview (play lại). Hiển thị waveform/duration khi ghi.
4. **Grader Selector**: Radio "AI" / "Tutor".
5. **Submit Button**.

---

### 3.6 Tutor Grading Panel (`/grading/tutor/grade/:type/:submissionId`)

**Mô tả:** Màn hình Tutor chấm bài.

**Layout:** Chia 2 cột.

**Cột trái — Student Submission:**
1. Thông tin student (tên, avatar).
2. Đề bài gốc.
3. Nếu Writing: Hiển thị bài viết đầy đủ.
4. Nếu Speaking: Audio player (play/pause/seek).
5. Nút "AI Prelim Check": Chạy kiểm tra ngữ pháp tự động, hiển thị kết quả inline.

**Cột phải — Grading Form:**
1. **4 Criteria Scores**: Mỗi criteria có slider/input (0.0 – 9.0, bước 0.5).
   - Writing: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammar
   - Speaking: Fluency & Coherence, Lexical Resource, Grammar, Pronunciation
2. **Overall Band Score**: Tự động tính từ 4 criteria (read-only).
3. **Feedback Textarea**: Nhận xét chi tiết cho student.
4. **Tutor Notes**: Ghi chú riêng (không hiển thị cho student).
5. **Submit Grade Button**.

---

### 3.7 Tutor Dashboard (`/tutor/dashboard`)

**Mô tả:** Màn hình tổng quan Tutor.

**Các thành phần:**
1. **Stats Cards**: Số bài chờ chấm, Số bài đã chấm hôm nay, Avg grading time.
2. **Grading Queue Preview**: 5 bài chờ mới nhất (type, student name, submitted time).
3. **Quick Actions**: "Xem Queue đầy đủ", "Quản lý bài thi".
4. **Recent Grading**: Lịch sử 5 bài vừa chấm.

---

### 3.8 Admin Dashboard (`/admin`)

**Mô tả:** Màn hình quản trị.

**Các thành phần:**
1. **Stats Overview**: Tổng users, users active, users banned, tổng tests.
2. **User Management Table**: Bảng hiển thị users (phân trang, lọc theo role/status).
   - Columns: Name, Email, Role, Status, Created At, Actions.
   - Actions: Dropdown "Change Role", "Change Status" với confirmation modal.
3. **Quick Links**: "Audit Logs", "Test Management".

---

### 3.9 Landing Page (`/`)

**Mô tả:** Trang chủ cho Guest.

**Các thành phần:**
1. **Hero Section**: Headline lớn + CTA buttons "Đăng ký" / "Đăng nhập".
2. **Features Section**: 4 cards giới thiệu (Reading, Listening, Writing, Speaking).
3. **How It Works**: 3 bước: Đăng ký → Luyện thi → Nhận kết quả.
4. **Testimonials**: Đánh giá từ students.
5. **Footer**: Links, thông tin liên hệ.

---

### 3.10 Danh sách tất cả màn hình cần Wireframe

| # | Tên màn hình | Route | Actor |
|---|-------------|-------|-------|
| 1 | Landing Page | `/` | Guest |
| 2 | Login Page | `/login` | Guest |
| 3 | Register Page | `/register` | Guest |
| 4 | Forgot Password | `/forgot-password` | Guest |
| 5 | Reset Password | `/reset-password` | Guest |
| 6 | Student Dashboard | `/dashboard` | Student |
| 7 | Reading Test List | `/reading` | Student |
| 8 | Listening Test List | `/listening` | Student |
| 9 | Test Detail | `/tests/:id` | Student |
| 10 | Reading Test Interface | `/tests/:id/reading` | Student |
| 11 | Listening Test Interface | `/tests/:id/listening` | Student |
| 12 | Test Result | `/results/:attemptId` | Student |
| 13 | Test Result Detail | `/results/:attemptId/detail` | Student |
| 14 | Writing Page | `/writing` | Student |
| 15 | Speaking Page | `/speaking` | Student |
| 16 | Submission History | `/history` | Student |
| 17 | Test History | `/tests/history` | Student |
| 18 | User Profile | `/profile` | Student |
| 19 | Tutor Dashboard | `/tutor/dashboard` | Tutor |
| 20 | Grading Queue | `/grading/tutor/queue` | Tutor |
| 21 | Tutor Grading Panel | `/grading/tutor/grade/:type/:id` | Tutor |
| 22 | Test Management | `/tutor/tests` | Tutor |
| 23 | Create/Edit Test | `/tutor/tests/new` | Tutor |
| 24 | Create/Edit Question | `/tutor/tests/:id/questions/new` | Tutor |
| 25 | Admin Dashboard | `/admin` | Admin |
| 26 | Audit Log | `/admin/audit-logs` | Admin |

> **Gợi ý:** Nhóm nên ưu tiên vẽ wireframe cho ít nhất 3 màn hình quan trọng nhất:
> 1. **Student Dashboard** (#6)
> 2. **Reading/Listening Test Interface** (#10 hoặc #11)
> 3. **Tutor Grading Panel** (#21)
