# CLAUDE.md — Tính năng Objective Testing (Reading & Listening)

## Tổng quan

Đây là tài liệu hướng dẫn cho tính năng **Kiểm tra khách quan** của nền tảng luyện thi IELTS. Tính năng này bao gồm toàn bộ luồng làm bài thi trắc nghiệm dạng Reading và Listening — từ lúc Student chọn đề, vào phòng thi, nộp bài, đến khi xem kết quả và nhận giải thích từ Tutor hoặc AI.

**Các actor liên quan:**
- **Student** — người làm bài thi.
- **Tutor** — người soạn đáp án và viết giải thích cho từng câu hỏi.
- **AI System** — hỗ trợ giải thích bổ sung khi Student nhấn "Explain with AI".
- **Guest** — chỉ được xem danh sách đề thi, không làm bài được.

**Stack công nghệ:**
- Frontend: React + TypeScript + Tailwind CSS + React Router v6 + TanStack Query
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL (raw SQL với thư viện `pg`, không dùng ORM)
- Auth: JWT

**Quy tắc khi code:**
- Chỉ chỉnh sửa code trong phạm vi Objective Testing. Không đụng vào Subjective Testing (Writing/Speaking), Admin, hoặc AI evaluation pipeline trừ khi có yêu cầu rõ ràng.
- Không dùng ORM — chỉ viết raw SQL với `pg`.
- Không dùng `any` trong TypeScript.

---

## Các màn hình và luồng chức năng

### 1. Danh sách đề thi (STU-02 / GUE-02)

Đây là màn hình đầu tiên Student (và Guest) nhìn thấy khi vào phần thi.

Hiển thị danh sách các đề thi có sẵn trên hệ thống, mỗi đề hiển thị: tiêu đề, loại kỹ năng (Reading hoặc Listening), độ khó (Easy / Medium / Hard), số câu hỏi, thời gian làm bài.

Student có thể lọc danh sách theo loại kỹ năng và độ khó. Guest xem được danh sách nhưng khi nhấn vào một đề để làm bài thì hệ thống yêu cầu đăng nhập.

Chỉ những đề đã được Tutor publish (hoặc đến lịch publish tự động) mới hiển thị. Đề ở trạng thái Draft không được hiển thị với Student hoặc Guest.

---

### 2. Chọn chế độ thi (STU-03)

Trước khi vào phòng thi, Student chọn một trong hai chế độ:

- **Timed Simulation (Thi mô phỏng):** Đồng hồ đếm ngược theo đúng thời gian quy định của đề. Khi hết giờ, bài tự động nộp.
- **Untimed Practice (Luyện tập tự do):** Không có giới hạn thời gian. Student làm theo tốc độ của mình, nộp bài khi muốn.

Chế độ được chọn phải được lưu lại cùng với bản ghi attempt để hệ thống biết cách tính và hiển thị kết quả sau này.

---

### 3. Phòng thi — làm bài (STU-04)

Đây là giao diện chính khi Student đang làm bài.

Với **Reading:** Đoạn văn hiển thị bên trái, danh sách câu hỏi trắc nghiệm (multiple choice) hiển thị bên phải. Student chọn đáp án cho từng câu.

Với **Listening:** File audio phát ở phía trên (có nút play/pause/seek). Danh sách câu hỏi hiển thị bên dưới. Student nghe và chọn đáp án.

Giao diện có bảng điều hướng câu hỏi (question navigator) để Student biết mình đã trả lời câu nào, chưa trả lời câu nào và có thể nhảy nhanh đến câu bất kỳ.

Nếu đang ở chế độ Timed, đồng hồ đếm ngược hiển thị cố định ở góc màn hình. Khi còn 5 phút, đồng hồ đổi màu cảnh báo. Khi hết giờ, bài nộp tự động.

Trong quá trình làm bài, đáp án của Student được lưu tạm thời ở client (React state). Chỉ khi nộp bài mới gửi lên server.

Khi Student nhấn **Nộp bài**, hệ thống hiển thị xác nhận "Bạn còn X câu chưa trả lời. Bạn có chắc muốn nộp?" trước khi thực hiện.

---

### 4. Kết quả và chấm bài tự động (STU-04)

Ngay sau khi nộp bài, hệ thống chấm điểm tự động bằng cách so sánh đáp án của Student với answer key trong database.

Kết quả trả về ngay lập tức bao gồm: Band Score ước tính, số câu đúng / sai / bỏ trống, thời gian hoàn thành.

Band Score được tính theo bảng quy đổi điểm thô sang Band Score chuẩn IELTS (lưu sẵn trong hệ thống, Tutor có thể cấu hình cho từng đề).

Bản ghi attempt phải được lưu vào database ngay tại thời điểm này, kể cả khi Student chưa xem trang kết quả chi tiết.

---

### 5. Xem kết quả chi tiết (STU-05)

Student xem lại toàn bộ bài thi sau khi nộp. Mỗi câu hỏi hiển thị:

- Đáp án Student đã chọn.
- Đáp án đúng (highlight màu xanh).
- Đáp án sai (highlight màu đỏ).
- Phần giải thích do Tutor đã soạn sẵn cho câu đó (nếu có).

Nếu Tutor chưa soạn giải thích cho câu nào, câu đó hiển thị thông báo "Giải thích đang được cập nhật".

Student có thể xem lại trang kết quả này bất kỳ lúc nào từ lịch sử làm bài — không chỉ ngay sau khi nộp.

---

### 6. Giải thích bổ sung từ AI (STU-06 / AI-03)

Dưới mỗi phần giải thích của Tutor, có nút **"Explain with AI"**.

Khi Student nhấn nút này, hệ thống gửi đến AI System: nội dung câu hỏi, đáp án đúng, và phần giải thích gốc của Tutor.

AI phân tích và trả về phiên bản giải thích đơn giản hơn hoặc chi tiết hơn tuỳ theo ngữ cảnh, trực tiếp trong giao diện (không mở trang mới).

Phản hồi của AI hiển thị dạng stream (từng chữ hiện dần) để tránh cảm giác chờ đợi. Mỗi lần nhấn "Explain with AI" tạo ra một lượt gọi AI và phải được ghi vào bảng `ai_usage_logs`.

---

### 7. Tutor soạn giải thích (TUT-06)

Tutor vào giao diện quản lý đề thi, chọn từng câu hỏi trong đề và nhập phần giải thích văn bản cho câu đó.

Mỗi câu hỏi có một ô nhập giải thích riêng. Tutor có thể lưu giải thích từng câu độc lập mà không cần lưu toàn bộ đề.

Giải thích của Tutor được ánh xạ trực tiếp với `question_id` trong database.

---

### 8. Tutor sửa đáp án (TUT-08)

Tutor có thể sửa đáp án đúng của các câu hỏi trong một đề đã publish mà **không xoá** các bản ghi attempt hiện có.

Khi đáp án được cập nhật, hệ thống **không tự động tính lại điểm** cho các attempt cũ — chỉ các attempt được tạo từ thời điểm sửa trở đi mới dùng đáp án mới.

Mọi thao tác sửa đáp án phải được ghi vào Audit Log với action type `ANSWER_KEY_EDIT`.

---

### 9. Tutor lên lịch publish (TUT-09)

Khi tạo đề mới, Tutor có thể chọn một trong hai:

- **Publish ngay:** Đề hiển thị với Student ngay lập tức.
- **Lên lịch publish:** Tutor chọn ngày giờ cụ thể. Đề tạm thời ở trạng thái Scheduled, đến đúng thời điểm hệ thống tự động chuyển sang Published.

Cơ chế tự động publish được xử lý bằng một background job chạy định kỳ (mỗi 1 phút kiểm tra các đề có `scheduled_at <= NOW()` và `status = 'SCHEDULED'`, sau đó cập nhật thành `PUBLISHED`).

---

## Cấu trúc dữ liệu cần biết

**Bảng `mock_tests`:** id, title, skill_type (READING / LISTENING), difficulty (EASY / MEDIUM / HARD), duration_minutes, status (DRAFT / SCHEDULED / PUBLISHED), scheduled_at, created_by (tutor id), created_at, updated_at.

**Bảng `questions`:** id, test_id, order_index, content (nội dung câu hỏi), options (JSON — mảng các lựa chọn), correct_answer (A/B/C/D), explanation (giải thích của Tutor), created_at, updated_at.

**Bảng `test_attempts`:** id, test_id, student_id, mode (TIMED / UNTIMED), answers (JSON — map question_id → answer đã chọn), score_raw, band_score, status (IN_PROGRESS / SUBMITTED), started_at, submitted_at.

**Bảng `ai_usage_logs`:** id, user_id, feature (EXPLAIN_WITH_AI), input_tokens, output_tokens, cost_usd, called_at.

---

## Cấu trúc API

Tất cả API của tính năng này nằm dưới các prefix sau:

| Method | Endpoint | Mô tả | Ai dùng |
|--------|----------|-------|---------|
| GET | `/api/tests` | Danh sách đề thi đã publish (filter, sort) | Guest, Student |
| GET | `/api/tests/:id` | Chi tiết một đề thi | Student |
| POST | `/api/attempts` | Bắt đầu một lượt thi mới, trả về attempt_id | Student |
| PATCH | `/api/attempts/:id/submit` | Nộp bài, trả về kết quả ngay | Student |
| GET | `/api/attempts/:id/result` | Xem kết quả chi tiết + giải thích Tutor | Student |
| POST | `/api/attempts/:id/explain-ai` | Gọi AI giải thích cho một câu hỏi cụ thể | Student |
| GET | `/api/tutor/tests` | Danh sách đề của Tutor (gồm cả Draft) | Tutor |
| POST | `/api/tutor/tests` | Tạo đề mới | Tutor |
| PATCH | `/api/tutor/tests/:id` | Cập nhật đề (bao gồm lên lịch publish) | Tutor |
| PATCH | `/api/tutor/tests/:id/questions/:qid` | Cập nhật đáp án hoặc giải thích một câu | Tutor |

---

## Luồng nghiệp vụ chính

**Luồng làm bài:**
Student chọn đề → chọn chế độ → hệ thống tạo attempt (status: IN_PROGRESS) → Student làm bài → nộp bài → hệ thống chấm điểm tự động → cập nhật attempt (status: SUBMITTED, lưu điểm) → trả kết quả ngay → Student xem chi tiết.

**Luồng Explain with AI:**
Student nhấn "Explain with AI" trên câu X → Frontend gửi request kèm question_id và attempt_id → Backend lấy nội dung câu hỏi + đáp án đúng + giải thích Tutor → Gửi prompt đến AI System → Stream response về Frontend → Ghi log vào ai_usage_logs.

**Luồng lên lịch publish:**
Tutor tạo đề → chọn scheduled_at → status = SCHEDULED → Background job kiểm tra mỗi 1 phút → Khi đến giờ: UPDATE status = PUBLISHED.

---

## Quy tắc nghiệp vụ quan trọng

- Một Student chỉ có thể có **một** attempt ở trạng thái IN_PROGRESS cho mỗi đề thi tại một thời điểm. Nếu đã có attempt IN_PROGRESS cho đề đó, hệ thống tiếp tục attempt cũ thay vì tạo mới.
- Khi đề đang ở chế độ Timed, thời gian bắt đầu (`started_at`) được lưu phía server khi tạo attempt — không tin tưởng thời gian từ client.
- Đáp án nộp bài phải được validate phía server: kiểm tra `question_id` có thuộc đề thi đó không, giá trị đáp án có hợp lệ (A/B/C/D) không.
- Sửa đáp án của Tutor (TUT-08) không được xoá hoặc cập nhật các bản ghi attempt đã tồn tại.
- Guest có thể xem danh sách và thông tin đề thi nhưng API tạo attempt phải trả 401 nếu không có token.

---

## Giao diện và trải nghiệm người dùng

- Phòng thi phải có layout toàn màn hình (fullscreen-like), ẩn sidebar/navbar chính để Student tập trung.
- Question navigator hiển thị dạng lưới ô vuông: xám = chưa trả lời, xanh = đã trả lời, cam = đang xem.
- Đồng hồ đếm ngược cố định ở góc trên phải, không bị che khuất khi scroll.
- Khi còn 5 phút: đồng hồ đổi sang màu cam. Khi còn 1 phút: đổi sang màu đỏ.
- Kết quả trả về ngay sau nộp bài — không có màn hình loading kéo dài.
- Trên trang kết quả: câu đúng highlight xanh lá, câu sai highlight đỏ, câu bỏ trống highlight xám.
- Nút "Explain with AI" chỉ hiện sau khi Student đã xem giải thích của Tutor (không hiện ngay khi vào trang kết quả).
- Phản hồi AI hiển thị dạng streaming — text xuất hiện dần dần như đang được gõ.

---

## Xử lý lỗi

| Tình huống | Cách xử lý |
|------------|------------|
| Hết giờ (Timed mode) | Tự động nộp bài với đáp án đã chọn đến thời điểm đó, không báo lỗi |
| Mất kết nối trong khi thi | Lưu đáp án hiện tại vào localStorage, hiển thị banner cảnh báo "Mất kết nối — đáp án của bạn đang được lưu tạm thời" |
| Submit thất bại (lỗi mạng) | Giữ nguyên đáp án, hiển thị toast lỗi kèm nút Thử lại |
| AI không phản hồi (timeout > 10 giây) | Hiển thị thông báo "AI hiện không khả dụng, vui lòng thử lại sau", không crash trang |
| Student cố gắng làm bài khi chưa đăng nhập | Redirect về trang đăng nhập, sau khi đăng nhập thành công quay lại đúng trang đề thi đó |
| Attempt không tìm thấy | Toast "Bài thi không tồn tại hoặc đã hết hạn", redirect về danh sách đề |

---

## Phạm vi ngoài tính năng này

Những phần sau không thuộc Objective Testing — không được chỉnh sửa:
- Chấm bài Writing và Speaking (Subjective Testing — luồng hoàn toàn khác).
- Giao diện và logic của AI Chatbot thường trực (STU-11).
- Giao diện upload tài liệu thư viện (STU-10, TUT-07).
- Dashboard thống kê của Admin.
- Trang profile và cài đặt của Student.
