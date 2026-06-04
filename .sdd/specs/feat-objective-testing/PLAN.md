# Kế hoạch Triển khai: Thi Trắc nghiệm & Quản lý Đề (feat-objective-testing)

**Trạng thái:** BẢN NHÁP — Chờ Tech Lead duyệt  
**Tài liệu đặc tả liên kết:** `.sdd/specs/feat-objective-testing/SPEC.md` (BẢN NHÁP, Rủi ro: Trung bình)  
**Sprint:** Sprint 2 — Hệ thống Đánh giá  
**Ngày:** 2026-06-03  
**Công nghệ giao diện:** Bootstrap 5 (CSS Framework)

---

## 1. PHƯƠNG ÁN KIẾN TRÚC

- **Kiến trúc phân lớp:** Tuân thủ Route → Controller → Service → DB Query (raw `pg`). Tuyệt đối không dùng ORM (Điều 1 Hiến pháp Dự án).
- **Chấm điểm đồng bộ:** Chấm bài phải chạy trong transaction nộp bài và hoàn tất < 1 giây cho 40 câu hỏi. `AutoGrader` là service thuần chạy trong bộ nhớ, không gọi AI.
- **Bất biến lịch sử:** Khi Giáo viên cập nhật câu hỏi, tạo dòng `questions` mới (phiên bản hóa). `question_answers` hiện tại vẫn tham chiếu `question_id` cũ — tuyệt đối không chấm lại hồi tố.
- **Chỉ dùng truy vấn tham số hóa:** Mọi DB query dùng `$1, $2` (SEC-03). Không nối chuỗi với dữ liệu người dùng.
- **Ghi nhật ký kiểm toán:** Mọi thao tác thay đổi của Giáo viên (tạo, sửa, xóa đề/câu hỏi, cập nhật đáp án) ghi vào `audit_logs` với `actor_id`, `action`, `target_table`, `target_id`, `old_value`, `new_value` (JSONB).
- **Định dạng phản hồi chuẩn:** Mọi API endpoint tuân theo format `{ success, data, error, meta }` (Điều 2 Hiến pháp Dự án).

---

## 2. THÀNH PHẦN & GIAO DIỆN

### 2.1 `AutoGrader` — `src/backend/src/services/autoGrader.service.js`

> Service tiện ích thuần — không phụ thuộc DB, không phụ thuộc HTTP, 100% có thể kiểm thử.

| Hàm | Đầu vào | Đầu ra | Ghi chú |
|-----|---------|--------|---------|
| `gradeAttempt(testQuestions, answers)` | `testQuestions: []`, `answers: [{ question_id, given_answer }]` | `{ raw_score, per_question: [{ question_id, is_correct, given_answer, correct_answer, explanation }] }` | Trắc nghiệm: so khớp chính xác. Điền khuyết: chuẩn hóa cả hai chuỗi rồi so sánh. Xong < 1s |
| `normalizeAnswer(answer, question_type)` | `answer: string`, `question_type: 'mcq' \| 'fill_blank'` | `normalized: string` | Điền khuyết: `s.trim().toLowerCase().replace(/[.,!?;:'"]+$/, '').replace(/\s+/g, ' ')`. Null → `''`. Trắc nghiệm: trim only. |
| `toBandScore(rawScore, skill)` | `rawScore: number (0–40)`, `skill: 'reading' \| 'listening'` | `band: number (1.0–9.0 bội số 0.5)` | Tra bảng theo kỹ năng: `READING_BAND_TABLE` hoặc `LISTENING_BAND_TABLE` — cả hai hardcoded. VD: Reading 30 → 6.5. |

---

### 2.2 Truy vấn CSDL — `src/backend/src/db/queries/tests.queries.js`

> SQL thô tham số hóa ($1, $2). Mọi hàm nhận `pool` làm tham số đầu tiên.

| Hàm | Đầu vào | Đầu ra | Bảng SQL |
|-----|---------|--------|----------|
| `getQuestionsForAttempt(pool, testId)` | `testId` | `questions[]` | SELECT phiên bản mới nhất mỗi `question_order`. Ẩn `correct_answer`/`explanation`. |
| `getTestForStart(pool, testId)` | `testId` | `{ id, title, skill, ... }` | SELECT metadata từ `mock_tests`. Kiểm `is_published = TRUE`. |
| `getTestForGrading(pool, testId, questionIds)` | `testId`, `questionIds[]` | `{ questions[] }` | Lấy câu hỏi chính thức kèm `correct_answer` để chấm. |
| `createTestAttempt(pool, data)` | `{ test_id, user_id, mode }` | `{ id }` | INSERT `test_attempts`, `started_at = NOW()`. |
| `insertQuestionAnswers(pool, attemptId, answers)` | `attemptId`, `answers[]` | `void` | Bulk INSERT `question_answers`. |
| `updateTestAttemptResult(pool, data)` | `{ attempt_id, submitted_at, band_score, raw_score }` | `void` | UPDATE `test_attempts`. |
| `versionQuestion(pool, data, actorId)` | `{ test_id, question_id, newValues }`, `actorId` | `{ new_question_id }` | INSERT dòng `questions` mới, ghi audit. |
| `insertAuditLog(pool, audit)` | `{ actor_id, action, ... }` | `void` | INSERT vào `audit_logs`. |
| `getAttemptWithAnswers(pool, attemptId)` | `attemptId` | `{ attempt, questions_answers[] }` | JOIN `test_attempts` + `question_answers` + `questions`. |
| `countActiveAttempts(pool, userId, testId)` | `userId`, `testId` | `number` | Kiểm tra user có bài thi chưa nộp. |

---

### 2.3 `TestAttemptsController` — `src/backend/src/controllers/testAttempts.controller.js`

| Xử lý | Endpoint | Logic tóm tắt |
|--------|----------|----------------|
| `startAttempt` | `POST /api/v1/test-attempts` | Kiểm tra đề đã publish. Kiểm student không có bài thi dở (409). Tạo attempt. Trả câu hỏi (ẩn đáp án). |
| `submitAttempt` | `POST /api/v1/test-attempts/:id/submit` | Kiểm tra quyền sở hữu (IDOR). Kiểm chưa nộp (409). Chấm điểm. Transaction → Lưu đáp án → Cập nhật kết quả → Commit. |
| `getResult` | `GET /api/v1/test-attempts/:id/result` | Chỉ chủ sở hữu hoặc giáo viên/admin xem. Trả kết quả đầy đủ với đáp án đúng + giải thích. |
| `listAttempts` | `GET /api/v1/test-attempts` | Student xem bài thi của mình. Giáo viên xem tất cả. Phân trang. |

---

### 2.4 `MockTestsController` — `src/backend/src/controllers/mockTests.controller.js`

| Xử lý | Endpoint | Logic tóm tắt |
|--------|----------|----------------|
| `createTest` | `POST /api/v1/mock-tests` | Yêu cầu đăng nhập (giáo viên). Tạo đề mới. Ghi audit. |
| `updateTest` | `PUT /api/v1/mock-tests/:id` | Cập nhật metadata. Kiểm ít nhất 1 câu hỏi nếu publish (422). Ghi audit. |
| `deleteTest` | `DELETE /api/v1/mock-tests/:id` | Xóa mềm: `is_published=FALSE`. Ghi audit. Bài thi đã nộp không bị ảnh hưởng. |
| `createQuestion` | `POST /api/v1/mock-tests/:test_id/questions` | Chỉ giáo viên. Kiểm `question_order` 1–40, duy nhất trong đề. Ghi audit. |
| `updateQuestion` | `PUT /api/v1/mock-tests/:test_id/questions/:question_id` | Phiên bản hóa: INSERT dòng mới (giữ `question_order`). Ghi audit. |
| `listPublishedTests` | `GET /api/v1/mock-tests` | Công khai. Lọc `is_published=TRUE`, phân trang, chỉ metadata. |
| `listTutorTests` | `GET /api/v1/mock-tests/manage` | Chỉ giáo viên. Trả TẤT CẢ đề (kể cả chưa publish). |
| `getTestDetail` | `GET /api/v1/mock-tests/:id` | Giáo viên xem chi tiết đầy đủ + đáp án. Học viên xem metadata. |

---

### 2.5 Giao diện Frontend — Danh sách Màn hình (Bootstrap 5)

> Tất cả giao diện sử dụng **Bootstrap 5** để styling. Responsive trên Tablet+ (≥ 768px).

| # | Màn hình | Mô tả | Component chính |
|---|----------|-------|-----------------|
| 1 | **Trang danh sách đề thi** (Học viên) | Hiển thị các đề thi đã publish. Lọc theo skill, difficulty. Phân trang. | `TestListPage` |
| 2 | **Trang chi tiết đề thi** (Học viên) | Xem thông tin đề thi, số câu hỏi, thời gian. Nút "Bắt đầu thi". | `TestDetailPage` |
| 3 | **Modal hướng dẫn trước khi thi** | Hiển thị quy tắc, cảnh báo thời gian, cảnh báo auto-submit. | `PreTestInstructionModal` |
| 4 | **Trang làm bài thi Reading** | Split View: Bên trái đoạn văn, bên phải câu hỏi. Thanh điều hướng 40 câu. Timer. | `ReadingTestPage` |
| 5 | **Trang làm bài thi Listening** | Audio player cố định phía trên. Câu hỏi bên dưới. Thanh điều hướng 40 câu. Timer. | `ListeningTestPage` |
| 6 | **Bảng điều hướng 40 câu** | 40 ô vuông, mã màu theo trạng thái (chưa làm/đã làm/hiện tại/đánh dấu). | `QuestionNavigationPanel` |
| 7 | **Timer đếm ngược** | Hiển thị MM:SS. Đổi màu đỏ khi ≤ 5 phút. Auto-submit khi hết giờ. | `Timer` |
| 8 | **Modal nộp bài tự động** | Khóa màn hình, hiển thị "Đang nộp bài...", gọi API nộp bài. | `AutoSubmitModal` |
| 9 | **Trang kết quả thi** | Band Score lớn nổi bật. Điểm thô /40. Lưới từng câu với đáp án đúng/sai + giải thích. | `ResultsPage` |
| 10 | **Trang quản lý đề thi** (Giáo viên) | Danh sách tất cả đề thi (kể cả chưa publish). CRUD đề thi. | `TutorTestManagePage` |
| 11 | **Form tạo/sửa đề thi** (Giáo viên) | Form nhập title, skill, difficulty, duration, publish. | `TestFormPage` |
| 12 | **Form tạo/sửa câu hỏi** (Giáo viên) | Form nhập câu hỏi MCQ hoặc điền khuyết. Đáp án + giải thích. | `QuestionFormPage` |
| 13 | **Trang Nhật ký Kiểm toán** (Admin) | Xem audit logs. Lọc theo bảng, người thao tác, ngày. | `AuditLogPage` |
| 14 | **Trang lịch sử thi** (Học viên) | Danh sách các lần thi. Band score, ngày thi. Link xem chi tiết. | `AttemptHistoryPage` |

---

## 3. LUỒNG DỮ LIỆU

### Luồng 1: Xuất bản Đề thi

```
Giáo viên  POST /api/v1/mock-tests  { title, skill, difficulty, ... }
  → MockTestsController.createTest()
      ├─ Validate: skill ∈ {reading, listening}, difficulty ∈ {beginner, intermediate, advanced}
      ├─ INSERT mock_tests (is_published=FALSE)
      ├─ insertAuditLog(action='test_created')
      └─ return { id }
  ← Phản hồi: 201 { data: { id, title, ... } }

Giáo viên  PUT /api/v1/mock-tests/:id  { is_published: true }
  → MockTestsController.updateTest()
      ├─ Validate quyền sở hữu
      ├─ UPDATE mock_tests SET is_published=TRUE
      ├─ insertAuditLog(action='test_updated')
      └─ return { id }
  ← Phản hồi: 200 { data: { id, is_published: true } }

Học viên  GET /api/v1/mock-tests  { skill='reading' }
  → MockTestsController.listPublishedTests()
      ├─ SELECT FROM mock_tests WHERE is_published=TRUE
      └─ Trả danh sách phân trang (ẩn đáp án)
  ← Phản hồi: 200 { data: { tests: [...], meta: { page, limit, total } } }
```

### Luồng 2: Làm bài & Chấm điểm tự động

```
Học viên  POST /api/v1/test-attempts  { test_id, mode: 'timed' }
  → TestAttemptsController.startAttempt()
      ├─ Kiểm tra đề đã publish
      ├─ Kiểm tra không có bài thi dở (409 nếu có)
      ├─ Tạo attempt mới
      ├─ Lấy câu hỏi (ẩn đáp án)
      └─ Trả { attempt_id, questions[], duration_minutes }
  ← Phản hồi: 201 { data: { attempt_id, questions: [...], timer_ms: 2400000 } }

[Frontend: Timer đếm ngược đến 00:00]
  ↓
Học viên  [Tự động nộp - UI bị khóa]  POST /api/v1/test-attempts/:id/submit
  → TestAttemptsController.submitAttempt()
      ├─ Kiểm tra quyền sở hữu (IDOR)
      ├─ Kiểm tra chưa nộp (409 nếu đã nộp)
      ├─ BEGIN TRANSACTION
      ├─ AutoGrader.gradeAttempt() → chấm từng câu
      ├─ Tính band_score = AutoGrader.toBandScore(raw_score)
      ├─ Lưu đáp án + cập nhật kết quả
      ├─ COMMIT TRANSACTION
      └─ Phát sự kiện Socket `grading_completed`
  ← Phản hồi: 200 { data: { band_score: 7.5, raw_score: 30, per_question: [...] } }
```

### Luồng 3: Phiên bản hóa Câu hỏi (Cập nhật không phá hủy)

```
Giáo viên  PUT /api/v1/mock-tests/:test_id/questions/:question_id
  → MockTestsController.updateQuestion()
      ├─ Lấy câu hỏi cũ
      ├─ BEGIN TRANSACTION
      ├─ INSERT dòng questions MỚI (giữ question_order + test_id)
      │   → Câu hỏi cũ vẫn tồn tại cho các bài thi đã nộp
      ├─ insertAuditLog(action='answer_key_updated', old_value, new_value)
      ├─ COMMIT TRANSACTION
      └─ return { id: new_question_id }
  ← Phản hồi: 200 { data: { id } }

[Kết quả: Điểm của học viên đã thi KHÔNG bị thay đổi]
```

---

## 4. NHIỆM VỤ TRIỂN KHAI & ƯỚC TÍNH

| # | Nhiệm vụ | Công sức | Phụ thuộc |
|---|----------|----------|-----------|
| **A** | Di chuyển CSDL: tạo bảng `mock_tests`, `questions`, `test_attempts`, `question_answers`, `ai_explain_requests`, `audit_logs`. Index, enum, ràng buộc. | 1 ngày | — |
| **B** | Module Truy vấn CSDL (`tests.queries.js`): Tất cả truy vấn tham số hóa. | 1 ngày | **A** |
| **C** | Service `AutoGrader`: gradeAttempt, normalizeAnswer, toBandScore. Unit test. | 0.5 ngày | — |
| **D** | Controller & Routes: start, submit, result endpoints. Validation. IDOR. Transaction. | 1.5 ngày | **B**, **C** |
| **E** | Phiên bản hóa câu hỏi & Endpoint giáo viên. Audit logging. | 1 ngày | **B**, **D** |
| **F** | Công việc đặt lịch Publish: node-cron + DB advisory lock. | 0.5 ngày | **B** |
| **G** | **Giao diện Frontend (Bootstrap 5): 14 màn hình + styling** | 3 ngày | **D** (backend) |
| **H** | Kiểm thử: Unit test, integration test, E2E. | 2 ngày | **C**, **D**, **E** |
| **I** | Review code, ESLint, Prettier, PR. | 0.5 ngày | **A**–**H** |

**Tổng ước tính:** ~11 ngày (có thể làm song song giữa backend/frontend/QA).

---

## 5. MÔ HÌNH DỮ LIỆU & SCHEMA CSDL

### Bảng chính

**Bảng: `mock_tests` (Đề thi)**
- `id` (UUID PK), `title` (VARCHAR 500), `description` (TEXT)
- `skill` (ENUM: reading, listening, writing, speaking)
- `difficulty` (ENUM: beginner, intermediate, advanced)
- `duration_minutes` (INT) — NULL = không giới hạn thời gian
- `is_published` (BOOLEAN DEFAULT FALSE), `publish_at` (TIMESTAMPTZ)
- `created_by` (UUID FK → users), `created_at`, `updated_at` (TIMESTAMPTZ)

**Bảng: `questions` (Câu hỏi)**
- `id` (UUID PK), `test_id` (UUID FK → mock_tests ON DELETE CASCADE)
- `question_order` (SMALLINT, 1–40), `question_type` (ENUM: mcq, fill_blank)
- `question_text` (TEXT), `options` (JSONB), `correct_answer` (VARCHAR), `explanation` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- **Ràng buộc:** UNIQUE (test_id, question_order)

**Bảng: `test_attempts` (Lịch sử làm bài)**
- `id` (UUID PK), `test_id` (UUID FK), `user_id` (UUID FK)
- `mode` (ENUM: timed, untimed), `started_at` (TIMESTAMPTZ NOT NULL)
- `submitted_at` (TIMESTAMPTZ) — NULL = đang làm
- `band_score` (NUMERIC(3,1)), `raw_score` (SMALLINT), `created_at` (TIMESTAMPTZ)

**Bảng: `question_answers` (Chi tiết đáp án nộp)**
- `id` (UUID PK), `attempt_id` (UUID FK), `question_id` (UUID FK)
- `given_answer` (VARCHAR), `is_correct` (BOOLEAN), `created_at` (TIMESTAMPTZ)
- **Ràng buộc:** UNIQUE (attempt_id, question_id)

**Bảng: `audit_logs` (Nhật ký kiểm toán) — dùng chung**
- `id` (UUID PK), `actor_id` (UUID FK), `action` (VARCHAR)
- `target_table` (VARCHAR), `target_id` (UUID)
- `old_value` (JSONB), `new_value` (JSONB), `created_at` (TIMESTAMPTZ)

---

## 6. RỦI RO KỸ THUẬT & BIỆN PHÁP GIẢM THIỂU

| # | Rủi ro | Mức độ | Biện pháp |
|---|--------|--------|-----------|
| 1 | Hiệu năng chấm điểm khi nộp đồng thời | Thấp | O(n) với n=40. Giới hạn tốc độ nộp bài. |
| 2 | Phiên bản hóa sai: dòng câu hỏi cũ bị xóa/sửa hồi tố | Cao | Chỉ INSERT cho phiên bản mới. question_id cũ bất biến. |
| 3 | Race condition: Giáo viên sửa câu hỏi trong khi Học viên nộp bài | Trung bình | Lấy câu hỏi theo ID tại thời điểm nộp. Snapshot trong transaction. |
| 4 | Học viên mất bản nháp khi mất mạng | Trung bình | LocalStorage auto-save mỗi 60s. |
| 5 | Lỗi tính band score do bảng hardcoded sai | Trung bình | Unit test `toBandScore()` với bảng IELTS chính thức. |

---

## 7. CÂU HỎI MỞ

| # | Câu hỏi | Người phụ trách | Ưu tiên | Trạng thái |
|---|---------|-----------------|---------|------------|
| Q1 | Điền khuyết: Cho phép sai lệch Levenshtein hay chỉ so khớp chính xác? | Tech Lead | CAO | Mở |
| Q2 | Phiên bản hóa: Bài thi cũ hiện cả đáp án cũ + mới hay chỉ đáp án lịch sử? | Product | CAO | Mở |
| Q3 | Công việc đặt lịch: Dùng `node-cron` hay hàng đợi nền (Bull)? | Backend | TB | Mở |
| Q4 | Lưu bản nháp trên server ngoài localStorage? | Product | TB | Mở |
| Q5 | AI giải thích: Dùng service hiện có hay tạo mới? | Tech Lead | TB | Mở |

---

## 8. ĐỊNH NGHĨA HOÀN THÀNH

Feature `feat-objective-testing` được xem là **HOÀN THÀNH** khi:

- ✅ Tất cả Tiêu chí Nghiệm thu trong đặc tả được thỏa mãn.
- ✅ Tất cả truy vấn CSDL dùng SQL tham số hóa, không hardcode giá trị.
- ✅ `AutoGrader` được unit-test, 100% xác định, idempotent.
- ✅ Integration test: luồng nộp bài (tạo → nộp → kiểm tra band_score).
- ✅ Test phiên bản hóa: sửa câu hỏi → điểm bài cũ không đổi.
- ✅ Audit logs ghi lại mọi thao tác Giáo viên.
- ✅ ESLint/Prettier clean (0 cảnh báo).
- ✅ Không hardcode secrets, API keys.
- ✅ Không lộ stack trace trong API response.
- ✅ Validation đầu vào trên tất cả endpoint.
- ✅ Ngăn chặn IDOR (kiểm tra quyền sở hữu).
- ✅ Transaction an toàn: tất-cả-hoặc-không-gì cả.

---

## 9. BƯỚC TIẾP THEO

1. **Tech Lead duyệt:** Phê duyệt PLAN này với phản hồi.
2. **Tạo DB Migrations:** Viết file migration cho các bảng mới.
3. **Triển khai AutoGrader:** Service thuần + unit test.
4. **Triển khai Truy vấn CSDL:** Module SQL tham số hóa + integration test.
5. **Triển khai Controller & Routes:** Luồng nộp bài với transaction.
6. **Triển khai 14 màn hình Frontend:** Dùng Bootstrap 5 cho styling.

---

*Tác giả:* Chuẩn bị cho Tech Lead duyệt (2026-06-03).  
*Tham khảo:*
- `.sdd/specs/feat-objective-testing/SPEC.md` — Đặc tả đầy đủ
- `.sdd/constitution.md` — Luật & ràng buộc dự án
