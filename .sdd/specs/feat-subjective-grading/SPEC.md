# SPEC.md — Đặc tả luồng chấm điểm tự luận (feat-subjective-grading)
# Version: 1.1.0 APPROVED | Owner: Tech Lead (Minh)

## 1. Context & Goal (Bối cảnh & Mục tiêu)
Học viên cần nộp bài Writing (Gõ chữ/Upload) và Speaking (Ghi âm) để nhận kết quả đánh giá chi tiết theo thang điểm IELTS (Band 0-9) từ dịch vụ AI hoặc từ giáo viên (Tutor).

## 2. Actors & Roles (Tác nhân hệ thống)
- **Student:** Người nộp bài làm và chọn phương thức chấm (`ai` hoặc `tutor`).
- **Tutor:** Giáo viên nhận bài từ View hàng đợi (`v_tutor_grading_queue`), chấm thủ công và nhận xét.
- **AI System:** Dịch vụ ngầm (External LLM) chấm điểm tự động.

## 3. Functional Requirements (FR — Áp dụng EARS Notation)
- **FR-01 (Event-driven):** WHEN Student nộp bài, THE hệ thống SHALL chèn (insert) vào bảng `writing_submissions` hoặc `speaking_submissions` tương ứng, lưu mặc định `status = 'pending'` và `grader` tùy theo lựa chọn của Student.
- **FR-02 (State-driven):** WHILE bài làm có `status = 'pending'`, THE hệ thống SHALL vô hiệu hóa nút "Nộp lại" hoặc "Chỉnh sửa" của bài thi đó trên giao diện.
- **FR-03 (Event-driven):** WHEN AI chấm điểm thành công, THE hệ thống SHALL insert kết quả vào bảng `ai_feedback_reports` và cập nhật `status` của submission thành `ai_graded`.
- **FR-04 (Event-driven):** WHEN Tutor chấm điểm thành công, THE hệ thống SHALL insert kết quả vào bảng `tutor_feedback_reports` và cập nhật `status` của submission thành `tutor_graded`.
- **FR-05 (Tutor Grading Workflow):** WHEN Tutor hoàn tất việc chấm tay và submit form, THE hệ thống SHALL insert kết quả vào bảng tutor_feedback_reports (kèm tutor_id lấy từ Token), update status của bài nộp thành tutor_graded, và emit Socket event về cho Student.
- **FR-06 (Data Retrieval):** WHEN Student hoặc Tutor gọi API xem chi tiết bài nộp, THE hệ thống SHALL thực hiện truy vấn JOIN bảng submission với bảng report tương ứng (ai_feedback_reports hoặc tutor_feedback_reports) dựa trên cột grader để trả về toàn bộ điểm số và nhận xét.
## 4. Non-Functional Requirements (NFR — Yêu cầu phi chức năng)
- **NFR-01 (Performance):** Quá trình gọi AI chấm điểm Writing/Speaking SHALL phản hồi kết quả trong tối đa 30 giây.
- **NFR-02 (Realtime):** Hệ thống SHALL sử dụng `Socket.io` để bắn event `grading_completed` về client của Student ngay khi có điểm, tuyệt đối không dùng HTTP Polling.
- **NFR-03 (Security):** Backend SHALL sử dụng thư viện `file-type` để xác thực MIME type thật của file upload (audio/mp3, audio/wav), từ chối file giả mạo extension.

## 5. Data Model Schema (Mapping với Shared Context)
-- 1. ENUMS DEPENDENCIES
CREATE TYPE submission_status AS ENUM ('pending', 'ai_graded', 'tutor_graded', 'reviewed');
CREATE TYPE grader_type     AS ENUM ('ai', 'tutor');

-- 2. WRITING SUBMISSIONS TABLE
CREATE TABLE writing_submissions (
    id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id           UUID                REFERENCES mock_tests(id) ON DELETE SET NULL,
    task_number       SMALLINT            CHECK (task_number IN (1, 2)),
    prompt_text       TEXT,
    response_text     TEXT                NOT NULL,
    file_url          TEXT,               -- uploaded document
    grader            grader_type,        -- who the student chose
    status            submission_status   NOT NULL DEFAULT 'pending',
    submitted_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- 3. SPEAKING SUBMISSIONS TABLE
CREATE TABLE speaking_submissions (
    id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id           UUID                REFERENCES mock_tests(id) ON DELETE SET NULL,
    part_number       SMALLINT            CHECK (part_number IN (1, 2, 3)),
    prompt_text       TEXT,
    audio_url         TEXT                NOT NULL,   -- stored recording
    transcript        TEXT,                           -- AI STT result
    grader            grader_type,
    status            submission_status   NOT NULL DEFAULT 'pending',
    submitted_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- 4. AI FEEDBACK REPORTS TABLE
CREATE TABLE ai_feedback_reports (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    writing_submission_id   UUID        REFERENCES writing_submissions(id) ON DELETE CASCADE,
    speaking_submission_id  UUID        REFERENCES speaking_submissions(id) ON DELETE CASCADE,
    band_score              NUMERIC(3,1),
    task_achievement_score  NUMERIC(3,1),
    coherence_score         NUMERIC(3,1),
    lexical_score           NUMERIC(3,1),
    grammar_score           NUMERIC(3,1),
    fluency_score           NUMERIC(3,1),
    pronunciation_score     NUMERIC(3,1),
    error_highlights        JSONB,  -- [{start, end, type, suggestion}, ...]
    suggestions             TEXT,
    raw_ai_response         JSONB,
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_submission CHECK (
        (writing_submission_id IS NULL) != (speaking_submission_id IS NULL)
    )
);

-- 5. TUTOR FEEDBACK REPORTS TABLE
CREATE TABLE tutor_feedback_reports (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id                UUID        NOT NULL REFERENCES users(id),
    writing_submission_id   UUID        REFERENCES writing_submissions(id) ON DELETE CASCADE,
    speaking_submission_id  UUID        REFERENCES speaking_submissions(id) ON DELETE CASCADE,
    band_score              NUMERIC(3,1),
    task_achievement_score  NUMERIC(3,1),
    coherence_score         NUMERIC(3,1),
    lexical_score           NUMERIC(3,1),
    grammar_score           NUMERIC(3,1),
    fluency_score           NUMERIC(3,1),
    pronunciation_score     NUMERIC(3,1),
    written_feedback        TEXT,
    audio_feedback_url      TEXT,   -- attached audio clip
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_submission_tutor CHECK (
        (writing_submission_id IS NULL) != (speaking_submission_id IS NULL)
    )
);

-- 6. VIEW: TUTOR GRADING QUEUE
CREATE VIEW v_tutor_grading_queue AS
SELECT 'writing'  AS submission_type,
       ws.id      AS submission_id,
       ws.user_id AS student_id,
       u.full_name AS student_name,
       ws.submitted_at,
       ws.status,
       ws.grader
FROM writing_submissions ws
JOIN users u ON u.id = ws.user_id
WHERE ws.status = 'pending' AND ws.grader = 'tutor'
UNION ALL
SELECT 'speaking',
       ss.id,
       ss.user_id,
       u.full_name,
       ss.submitted_at,
       ss.status,
       ss.grader
FROM speaking_submissions ss
JOIN users u ON u.id = ss.user_id
WHERE ss.status = 'pending' AND ss.grader = 'tutor'
ORDER BY submitted_at ASC;

## 6. Error Handling (Xử lý lỗi & Điều kiện biên)
- **ERR-01 (File Size):** WHERE file ghi âm > 10MB, THE hệ thống SHALL ngắt stream và từ chối request với mã HTTP 413 (Payload Too Large).
- **ERR-02 (AI Fallback):** WHERE External LLM quá tải (Timeout > 30s) hoặc trả về JSON lỗi, THE hệ thống SHALL giữ nguyên `status = 'pending'` nhưng cập nhật `grader = 'tutor'` để tự động đẩy bài vào View hàng đợi cho giáo viên chấm bù, đồng thời báo lỗi qua Socket cho Student.

## 7. Acceptance Criteria (Tiêu chí nghiệm thu)

**Nhóm 1: AC Dữ liệu & Luồng xử lý thành công (Happy Path)**
- [ ] AC-01 (Middleware): Upload file audio Speaking > 10MB bị Backend chặn ngắt stream và trả lỗi `413 Payload Too Large`.
- [ ] AC-02 (AI Output): Payload JSON sau khi AI chấm chứa đủ 4 điểm thành phần và mapping chính xác vào các cột `NUMERIC` tương ứng trong bảng `ai_feedback_reports`.
- [ ] AC-03 (Realtime): Nhận được event Socket `grading_completed` ở client dưới 1 giây sau khi DB hoàn tất SQL Transaction.
- [ ] AC-04 (Queue Routing): Bài do AI chấm (`grader='ai'`) tuyệt đối không xuất hiện trên View `v_tutor_grading_queue`.

**Nhóm 2: AC Bảo mật & Xử lý lỗi (Edge Cases & Security)**
- [ ] AC-05 (AI Fallback Trigger): Khi cố tình giả lập (Mock) API LLM bị lỗi Timeout hoặc trả về text không phải JSON, hệ thống KHÔNG crash mà lập tức đổi `grader='tutor'` và bài nộp xuất hiện ngay trong View hàng đợi của giáo viên.
- [ ] AC-06 (IDOR Prevent): Khi gọi API GET chi tiết bài nộp, nếu `user_id` trong JWT khác với `user_id` của bản ghi submission (và role không phải `admin`/`tutor`), hệ thống bắt buộc trả về mã lỗi `403 Forbidden`.
- [ ] AC-07 (Idempotency): Gửi request gọi API nộp bài (POST) lần thứ 2 cho cùng một `test_id` và `skill` khi bài trước đó vẫn đang có status `pending`, hệ thống phải từ chối với mã lỗi `409 Conflict`.
- [ ] AC-08 (Role Enforcement): Dùng JWT của tài khoản có role `student` gọi vào API chấm bài của Tutor (`POST /api/v1/grading/tutor/...`), hệ thống từ chối truy cập và trả về `403 Forbidden`.

## 8. Out of Scope (Ngoài phạm vi thực hiện Sprint này)
- Tính năng tự động ngắt ghi âm khi hết giờ.
- Hệ thống gửi email thông báo điểm (Chỉ dùng Socket.io & Notification in-app).

---

## 9. Agent Steering Instructions (Chỉ thị điều khiển AI)
### 9.1. Transaction & Race Conditions
- BẮT BUỘC dùng Database Transaction khi chuyển trạng thái bài thi (`ai_graded` hoặc `tutor_graded`) và insert vào bảng báo cáo tương ứng (`ai_feedback_reports` hoặc `tutor_feedback_reports`). Lỗi 1 trong 2 bước phải `ROLLBACK` toàn bộ.
### 9.2. Query Constraints
- KHÔNG sử dụng ORM. Sử dụng thuần thư viện `pg` với cơ chế Parameterized Query (`$1, $2`) để chống SQL Injection.
### 9.3. Structured Output LLM
- Prompt gửi sang LLM phải khai báo cấu trúc trả về dạng JSON. Sử dụng `try...catch` để bóc tách kết quả. Nếu `JSON.parse` văng lỗi, phải trigger logic ERR-02 (chuyển cho Tutor chấm).