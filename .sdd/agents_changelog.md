# Agents Changelog

## [2026-07-24] | Codex | Backfill spec Auth/Profile/User/Audit Log

### Thay đổi

- Đọc đối chiếu spec tổng, plan/tasks cũ và source hiện tại của auth, profile, admin user/session và audit log.
- Tạo spec Speckit và checklist chất lượng cho bốn feature con:
  `.sdd/specs/feat-auth-and-users/feat-auth/`,
  `.sdd/specs/feat-auth-and-users/feat-profile/`,
  `.sdd/specs/feat-auth-and-users/feat-user/`,
  `.sdd/specs/feat-auth-and-users/feat-audit-log/`.
- Giữ spec ở mức nghiệp vụ: user stories, acceptance scenarios, edge cases, requirements, entities, success criteria và assumptions; không thay đổi source code.

### Kiểm chứng

- Checklist yêu cầu cho cả bốn feature đã được tick pass, không có placeholder template hoặc marker cần làm rõ trong spec.
- `.specify/extensions.yml` không tồn tại nên không có hook specify cần chạy.

---

## [2026-07-22] | Codex | Triển khai migration và storage AI grading

- Sau khi người dùng cho phép rõ ràng, đã tạo và verify backup schema `public`, baseline
  34 migration lịch sử rồi apply `025`–`026` trên database hiện tại.
- Preflight sau migration không có blocker; số dòng users/speaking/writing/report giữ
  nguyên. Lịch sử migration có 36 checksum và các khóa ngoại mới đã được xác minh.
- Tạo bucket private `speaking-audio-private`; giữ nguyên bucket public legacy để không
  phá dữ liệu/demo đang có. `.env` dùng bucket private và bật async Speaking ở chế độ
  fail-closed; publication band vẫn tắt.
- Cài FFmpeg/FFprobe 8.1.2 cho tài khoản hiện tại. Chưa gọi provider thật, restore
  rehearsal, load/chaos test hoặc calibration release; các cổng production này vẫn mở.

## [2026-06-19] | Kiro/Claude | Listening Test Audio Fix

### Context
Fixed major bugs in Listening mock test creation:
1. Network error when creating new listening tests (payload too large)
2. Wrong business logic: each section had separate audio files instead of single shared audio

### Changes Made

#### Backend Changes

**1. Database Migration (`backend/src/db/migrations/013_add_listening_audio_support.sql`)**
- Added `audio_url` column to `mock_tests` table for single audio file per test
- Added index `idx_mock_tests_audio` for performance
- Updated column comments to clarify listening vs reading data structure
- Re-purposed `test_passages.instruction` to store JSONB metadata for listening sections

**2. New Service (`backend/src/services/audioStorage.service.js`)**
- Created Supabase Storage integration for audio uploads
- Implements SEC-04 security rules: file size limit (50MB), MIME type validation
- Methods: `uploadAudio()`, `deleteAudio()`, `extractFilePathFromUrl()`
- Uses magic bytes validation (not just file extension)

**3. Updated Test Service (`backend/src/services/test.service.js`)**
- Modified `createReadingTest()`: now accepts and saves `audioUrl` parameter
- Modified `updateReadingTest()`: supports audio URL updates
- Fixed `normalizePassages()`: for listening, saves metadata as JSONB in `instruction` field
- Fixed `getTestById()`: correctly parses listening section metadata from JSONB

**4. New Controller (`backend/src/controllers/audioController.js`)**
- `uploadAudio()`: POST /api/v1/audio/upload - accepts base64 audio, uploads to Supabase
- `deleteAudio()`: DELETE /api/v1/audio/:path - removes audio from Supabase Storage
- Full error handling with standard response format

**5. New Routes (`backend/src/routes/api/v1/audio.routes.js`)**
- Registered `/api/v1/audio/*` endpoints
- Added to main API router

**6. App Config (`backend/src/app.js`)**
- Increased body parser limit from default to 50MB for audio base64 uploads
- Complies with SEC-04: max file size 50MB

#### Frontend Changes

**1. TutorListeningFormPage.jsx - Major Refactor**

**Removed:**
- Per-section audio upload fields (4 separate audio inputs)
- `uploadTargetSectionId`, `previewAudioSectionId` state
- `handleUploadClick()`, `handlePreviewAudio()` functions
- `section.audioUrl` from data model

**Added:**
- Single audio upload section at top (before 4 sections)
- `formData.audioUrl` - single audio URL for entire test
- `isUploadingAudio` state - loading indicator during upload
- `showAudioPlayer` state - toggle audio preview
- Better validation: requires audio before publishing
- Warning messages for missing audio or incorrect question count

**Modified:**
- `DEFAULT_SECTIONS`: removed `audioUrl` field
- `handleAudioFileChange()`: uploads to single audio field
- `buildPayload()`: sends `audioUrl` at test level, not per section
- `handleSaveTest()`: validates audio URL exists before publishing
- File size limit: 8MB → 50MB
- UI improvements: clear instructions, loading states, error messages

**2. ListeningTestPreviewModal (updated props)**
- Now receives `audioUrl` prop for single audio player
- Sections no longer have individual audio URLs

### Technical Details

**Data Structure Changes:**

Before:
```javascript
{
  sections: [
    { audioUrl: "data:audio/...", transcript: "..." },  // Section 1 audio
    { audioUrl: "data:audio/...", transcript: "..." },  // Section 2 audio
    ...
  ]
}
```

After:
```javascript
{
  audioUrl: "https://supabase.../tests/audio.mp3",  // Single audio for all sections
  sections: [
    { 
      title: "Section 1", 
      transcript: "...",
      showTranscript: true,
      startTime: 0,      // Optional: for future timestamp features
      endTime: 330
    },
    ...
  ]
}
```

**Database Mapping:**
- `mock_tests.audio_url` → Single audio URL
- `test_passages.instruction` → JSONB: `{"show_transcript": true, "start_time": 0, "end_time": 330}`
- `test_passages.content` → Transcript text
- `test_passages.title` → Section title

### Security Compliance
- ✅ SEC-04: File upload validation (MIME type + size limit)
- ✅ SEC-03: Parameterized SQL queries ($1, $2, ...)
- ✅ SEC-09: No stack traces in responses
- ✅ ADR-003: Standard response format `{ success, data, error, meta }`

### Testing Checklist
- [ ] Run migration: `npm run migrate` in backend
- [ ] Test audio upload < 50MB
- [ ] Test create new listening test with audio
- [ ] Test update existing listening test
- [ ] Test validation: 40 questions required
- [ ] Test validation: audio required before publish
- [ ] Test preview audio player
- [ ] Verify network error resolved

### Migration Instructions

1. **Backend:**
```bash
cd backend
npm run migrate
# or
node scripts/migrate.js
```

2. **Supabase Storage Setup:**
- Create bucket named `listening-audio` in Supabase Dashboard
- Set bucket to public (or configure appropriate policies)
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

3. **Testing:**
```bash
# Start backend
cd backend
npm start

# Start frontend
cd frontend
npm run dev
```

### Known Issues / Future Improvements
1. Audio upload currently uses base64 encoding - consider direct file upload for better performance
2. Timestamps (startTime/endTime) are in database schema but not yet used in player
3. Consider adding audio player with section markers in preview/test-taking UI
4. Add progress indicator for large audio uploads

### Files Changed
- `backend/src/db/migrations/013_add_listening_audio_support.sql` (NEW)
- `backend/src/services/audioStorage.service.js` (NEW)
- `backend/src/services/test.service.js` (MODIFIED)
- `backend/src/controllers/audioController.js` (NEW)
- `backend/src/routes/api/v1/audio.routes.js` (NEW)
- `backend/src/routes/api/v1/index.js` (MODIFIED)
- `backend/src/app.js` (MODIFIED)
- `backend/scripts/migrate.js` (MODIFIED - fixed .env loading)
- `frontend/src/pages/tutor/TutorListeningFormPage.jsx` (MAJOR REFACTOR)

### Reviewers
- Tech Lead: Verify security compliance
- QA: Test audio upload flow end-to-end
- Product: Confirm business logic matches IELTS requirements

---

[2026-06-24] | [AGENT] | [.sdd/agents_changelog.md, .sdd/context/db-schema-snapshot.md, .sdd/shared_context.md, .sdd/specs/global-ielts-virtual-assistant/spec.md, backend/src/api/assistant/assistant.constants.js, .sdd/rfcs/rfc-2026-06-24-assistant-quality-upgrade.md, .sdd/specs/global-ielts-virtual-assistant/eval-set.md] | [Added schema snapshot, feature-table mapping, Global Assistant schema reconciliation, intent context map, RFC, and golden eval set.]

---

## [2026-07-03] | Antigravity Agent | Fix Audit Log – Phân công Giảng viên hiển thị UUID thô

### Vấn đề gốc rễ
Khi admin phân công giảng viên, trang "Nhật ký duyệt & thay đổi" hiển thị UUID thô (`bccb8d25-...`) thay vì tên giảng viên. Nguyên nhân là chuỗi 5 điểm sai xuyên suốt DB → Backend → Frontend.

### Files thay đổi

**1. `backend/src/db/migrations/020_add_tutor_assigned_log_action.sql` (NEW)**
- Thêm `'tutor_assigned'` vào enum `log_action` DB
- Đã chạy và apply thành công

**2. `backend/src/db/queries/tutorAssignment.queries.js` (MODIFY)**
- `getSubmissionByIdAndType()`: thêm `LEFT JOIN users tutor` và `LEFT JOIN users student` để lấy `tutor_name`, `student_name` cùng với submission data
- `assignTutorToSubmission()`: đổi sang CTE (`WITH updated AS`) để JOIN và trả về tên tutor mới sau UPDATE, không cần query riêng

**3. `backend/src/services/adminTutor.service.js` (MODIFY)**
- Đổi `action = 'user_updated'` → `'tutor_assigned'` (đúng semantic)
- `old_value` và `new_value` giờ lưu `{ tutor_id, tutor_name, tutor_email, student_name, submission_type }` thay vì `{ assigned_tutor_id: UUID }`

**4. `backend/src/services/audit.service.js` (MODIFY)**
- `ACTION_LABELS`: thêm `tutor_assigned: 'Phân công giảng viên'`, xóa duplicate `resource_uploaded`
- `getTargetLabel()`: thêm logic lấy tên học sinh từ `new_value.student_name` (khi target_id là submission UUID thay vì user UUID)
- `getNote()`: thêm case `tutor_assigned` tạo note `Phân công (Writing) cho: Tên Giảng Viên`

**5. `frontend/src/utils/adminFormat.js` (MODIFY)**
- `ACTION_LABELS`: thêm `tutor_assigned: 'Phân công giảng viên'`
- `FIELD_LABELS` (mới): map 14 DB column names → nhãn tiếng Việt
- `diffValues()`: dùng `FIELD_LABELS[field]` để hiển thị `'Giảng viên phụ trách'` thay vì `'tutor_name'` trong modal chi tiết

**6. `backend/scripts/migrate-single.js` (NEW)**
- Script tiện ích chạy từng migration file riêng lẻ (tránh bị block bởi file cũ có lỗi)

### Security Compliance
- ✅ SEC-03: Tất cả SQL dùng parameterized query ($1, $2)
- ✅ ADR-001: Không dùng ORM
- ✅ ADR-003: Response format `{ success, data, error, meta }` không thay đổi
- ✅ DATA-03: Migration chỉ ADD VALUE vào enum, không phá schema cũ

---

## [2026-07-20] | Codex | Global IELTS Assistant provider và conversation memory

### Thay đổi

- Sửa chọn provider/model: Gemini là mặc định của Global Assistant khi có Gemini key,
  model được cô lập theo provider và Gemini key chuyển khỏi URL sang header.
- Cho knowledge response retry một lần ở plain-text mode trước deterministic fallback.
- Thêm owned `conversationId`, ownership-atomic message insert và structured
  `preferred_address` theo active conversation (set/recall/clear, sanitize input).
- Giữ conversation khi panel đóng/mở, cải thiện chained follow-up và đánh dấu mọi
  conversation memory là untrusted prompt data.
- Cập nhật spec/plan/tasks/eval và migration 024.

### Verification

- Backend targeted: PASS — 19 suites, 254 tests.
- Frontend focused: PASS — 2 files, 3 tests; assistant ESLint PASS; production build PASS.
- Không chạy live AI/DB và không đọc `.env`; migration 024 vẫn cần apply theo quy trình
  deploy của environment.

---

## [2026-07-21] | Codex | Multi-turn topic memory và recommendation theo hội thoại

### Thay đổi

- Nhận diện tham chiếu nhiều lượt (`hai cái này`, `both`, `chúng`) và inject tối đa 12
  lượt user/assistant gần nhất cùng topic/skill server-derived vào prompt/classifier.
- Route yêu cầu mơ hồ “tìm 1 đề phù hợp” sang `FIND_TEST`, kế thừa Reading từ
  Skimming/Scanning và giữ test/link được DB-grounding.
- Làm fallback lookup tự nhiên hơn theo preferred address/topic nhưng không suy đoán
  band hoặc năng lực.
- Scope history theo owned conversation và resume active session có message mới nhất,
  tránh UI hiển thị một session trong khi AI dùng session khác.
- Library route không còn cướp câu hỏi kiến thức; topic được lọc trong SQL trước limit
  và quantity được áp sau xếp hạng.
- Lookup response bị provider lỗi hoặc nêu title ngoài DB được thay bằng câu trả lời/link
  deterministic đã grounded.
- Frontend chờ canonical history trước khi cho gửi, parse cả SSE frame cuối và không
  tự resubmit JSON khi stream delivery chưa chắc chắn để tránh lưu trùng memory.
- Prompt bỏ các block memory/preference/state/knowledge bị lặp; knowledge fallback dùng
  recent Skimming/Scanning và không còn câu “Mình chưa gọi được AI”.

### Verification

- Backend targeted: PASS — 19 suites, 272 tests.
- Frontend focused: PASS — 3 files, 7 tests; assistant ESLint PASS; production build PASS.
- Read-only DB preflight xác nhận session/history selection mới cùng chọn đúng
  conversation gần nhất. Nodemon đã tự restart backend và health trả HTTP 200;
  migration 024 vẫn chưa apply.

---

## [2026-07-21] | Codex | Chuẩn hóa tài liệu Global IELTS Virtual Assistant theo Speckit

### Thay đổi

- Chuẩn hóa `spec.md`, `plan.md`, `tasks.md`, `checklist.md`, `CONTEXT.md` theo template
  và đối chiếu trực tiếp với source/test hiện có; không thay đổi mã nguồn.
- Đổi tên bộ test production thành `production-test-suite.md`, giữ đủ 561 ID duy nhất
  từ TC-001 đến TC-561 trong 21 nhóm và sửa các case cuối theo hành vi thực tế.
- Ghi rõ các khác biệt đang tồn tại: React 19, response assistant dạng phẳng, auth/error
  xử lý inline, pseudo-stream SSE, intent không reachable và migration 024 chưa được apply.
- Bổ sung các gate chưa đạt/chưa chứng minh về vị trí custom CSS, branch/spec naming và
  coverage 80%; làm rõ persistence là best-effort trước khi phát application SSE.
- Tách 53 task đã có bằng chứng source/test, hai task tài liệu/regression vừa hoàn tất và
  sáu task hardening/live-environment còn mở.

### Verification

- Backend focused Jest: PASS — 15 suites, 261 tests; không skip.
- Frontend focused Vitest: PASS — 3 files, 7 tests; assistant ESLint và build PASS.
- Backend syntax: PASS — 22 file JavaScript. Backend ESLint bị chặn do thiếu dependency
  `@eslint/js`; không cài dependency trong lượt chuẩn hóa tài liệu này.
- Document contracts: PASS — 561 testcase, 61 task, 30 checklist item và không còn
  placeholder template; 28 FR và 8 SC đều map được tới task. Không chạy migration,
  live AI/DB, commit hoặc push.

---

## [2026-07-21] | Codex | Việt hóa tài liệu Trợ lý ảo IELTS toàn cục

### Thay đổi

- Việt hóa và hiệu đính toàn bộ phần diễn giải phục vụ học tập, thuyết trình và phản
  biện trong 9 tệp tại `.sdd/specs/global-ielts-virtual-assistant/`.
- Chuẩn hóa thuật ngữ tiếng Việt về xác thực, truyền luồng SSE, quyền sở hữu hội thoại,
  dữ liệu có căn cứ, phương án dự phòng và tệp di trú; sửa các câu dịch máy móc trong
  bộ kiểm thử 561 ca.
- Đồng bộ phần mô tả RFC với hiện trạng hỗ trợ Gemini/OpenAI, một lần thử lại phản hồi
  tri thức không hợp lệ và các nhánh dự phòng Skimming/Scanning.
- Giữ nguyên ID yêu cầu/nhiệm vụ/ca kiểm thử, đường dẫn, lệnh, tên trường/hàm, mã trạng
  thái/ý định, đầu vào kiểm thử tiếng Anh/song ngữ và đầu ra lịch sử cần thiết.

### Kiểm chứng

- Hợp đồng tài liệu: ĐẠT — 9 tệp, 28 FR, 8 SC, 61 nhiệm vụ (55 hoàn tất/6 còn mở),
  30 mục kiểm tra (29 hoàn tất/1 còn mở) và 115 dòng dữ liệu đánh giá.
- Bộ kiểm thử vận hành: ĐẠT — 561 ID duy nhất, liên tục từ TC-001 đến TC-561 trong 21
  nhóm; mọi hàng giữ đúng 8 cột.
- Hàng rào Markdown: ĐẠT — các khối mã cân bằng và `git diff --check` trong phạm vi
  tài liệu không có lỗi; chỉ có cảnh báo quy ước xuống dòng LF/CRLF.
- Không thay đổi `backend/` hoặc `frontend/`; không chạy tệp di trú, AI/CSDL thật,
  commit hoặc push. Các thay đổi có sẵn ngoài phạm vi được giữ nguyên.

---

## [2026-07-21] | Codex | Đối chiếu và chuẩn hóa tài liệu AI Fast Grading

### Thay đổi

- Đọc đối chiếu mã nguồn, migration, route, frontend và test hiện tại rồi viết lại
  `spec.md`, `plan.md`, `tasks.md`, `checklist.md` trong
  `.sdd/specs/ai-fast-grading/` theo cấu trúc Speckit bằng tiếng Việt.
- Thay trạng thái “hoàn tất” không có bằng chứng bằng trạng thái đạt/một phần/chưa đạt;
  bổ sung truy vết yêu cầu → task và ghi rõ các khoảng trống về Constitution, trạng
  thái lỗi, idempotency đồng thời, validation, transaction, Socket.IO và coverage.
- Chỉ sửa tài liệu; không thay đổi mã nguồn, dependency, migration, cấu hình hoặc dữ
  liệu môi trường.

### Kiểm chứng

- Backend mục tiêu: ĐẠT — 5 suite, 17/17 test.
- Frontend hook Socket: ĐẠT ở mức unit — 8/8 test, nhưng hợp đồng mock đang dùng tên
  sự kiện lệch backend nên không được coi là bằng chứng tích hợp.
- Nhóm test frontend liên quan: 15 test đạt, 10 test lỗi; test FeedbackReport đặt dưới
  `frontend/src/tests/` không được cấu hình Vitest thu thập.
- Hợp đồng tài liệu: 16 FR, 6 SC, 47 task và 44 checklist ID duy nhất; UTF-8 hợp lệ,
  liên kết nội bộ tương đối. `.specify/feature.json` tạm không còn tồn tại.

---

## [2026-07-22] | Codex | Lập kế hoạch production cho AI Speaking Grading

### Thay đổi

- Chạy workflow `speckit-plan` cho feature `.sdd/specs/ai-fast-grading/` và viết lại
  `plan.md` dựa trên code, migration và runtime hiện tại; chưa triển khai source code.
- Bổ sung `research.md`, `data-model.md`, hợp đồng Markdown/OpenAPI 3.1 và
  `quickstart.md` để mô tả evidence audio/transcript, worker bất đồng bộ, conditional
  nullable criteria, retry/idempotency, private signed upload và calibration gate.
- Chốt phương án tận dụng `speaking_submissions`, `ai_grading_reports`,
  `ai_usage_logs`, `tutor_feedback_reports`, `assigned_tutor_id` và
  `speaking_group_id`; chỉ đề xuất hai bảng feature mới là `ai_grading_jobs` và
  `speaking_analysis_artifacts` (migration metadata, nếu cần, dùng một platform table
  chung thay vì bảng riêng cho AI).
- Ghi rõ không dùng/dual-write các bảng legacy `speaking_attempts`,
  `speaking_attempt_answers`, `tutor_grading_reports`; không tạo các bảng riêng cho
  audio asset, transcript, fluency, pronunciation, job attempt hoặc idempotency key.
- Đặt cổng bắt buộc trước implementation: sửa spec để transcript-only không sinh bất
  kỳ IELTS criterion band/Overall và partial audio fail closed theo evidence; phê duyệt
  RFC provider/storage/React/audio format, ngưỡng calibration/scale; harden migration.
- Sau audit chéo, khóa thêm thứ tự idempotency trước quota, `prompt_id` chính thức,
  hai expiry upload riêng, tutor claim/assignment nguyên tử, Overall từ
  `computed_band`, ASR-fidelity cho cả Coherence và calibration bundle/registry bất biến.
- Bỏ phương án tạo artifact/job giả cho transcript legacy; giữ dual-read chỉ để hiển
  thị. Quy định audio đủ file nhưng uncertainty/OOD không đạt vẫn là
  `partial_audio/needs_review`, còn rollback trở về tutor/manual với feedback chữ chỉ
  dành cho reviewer/shadow.

### Kiểm chứng

- Đối chiếu read-only các migration `013`–`024`, route/service/grader/validator,
  Storage upload, tutor feedback và package scripts liên quan.
- Các tài liệu mới dùng UTF-8; 27/27 hàng rào Markdown cân bằng và 17/17 liên kết nội
  bộ tồn tại. OpenAPI 3.1 có 6 path/operation, 35 schema, 95/95 local `$ref` resolve;
  12/12 ví dụ API khớp schema và 720 tổ hợp state/result được kiểm (26 hợp lệ đúng
  thiết kế), không cho trạng thái trái hợp đồng lọt qua. Plan cố ý giữ
  `BLOCKED FOR IMPLEMENTATION`.
- Không chạy migration, provider thật, database thật, test code, commit hoặc push.
- Không thay đổi `backend/` hoặc `frontend/` trong lượt lập kế hoạch này; mọi thay đổi
  có sẵn ngoài phạm vi được giữ nguyên.

---

## [2026-07-22] | Codex | Triển khai nền tảng AI Fast Grading fail-closed

### Thay đổi

- Triển khai private signed upload, opaque upload token, submit Speaking bất đồng bộ,
  PostgreSQL job queue, worker/heartbeat/watchdog, idempotency, quota dùng chung và
  quarantine cleanup; API không còn chờ provider trong request.
- Chỉ thêm hai bảng nghiệp vụ `ai_grading_jobs` và `speaking_analysis_artifacts`;
  tái sử dụng submission/report/usage/tutor/assignment hiện có và harden migration
  runner bằng history, checksum, advisory lock cùng baseline có xác nhận.
- Tạo evidence pipeline tách ASR/display transcript, kiểm chất lượng audio, pin
  provider/model/config, xác minh calibration bundle và mặc định fail-closed. Khi
  chưa đủ speech evidence/calibration, learner nhận `result=null` và bài chuyển tutor,
  không sinh Fluency, Pronunciation hoặc Overall giả từ transcript.
- Giữ ổn định Writing bằng validator 50/100 từ, sanitizer không sửa ngữ pháp,
  idempotency, cache replay, quota và Overall 33%/67%.
- Bổ sung atomic tutor claim, assignment-scoped detail/reference/audio/grade, signed
  audio ngắn hạn, soft-delete report và lọc row đã xóa trong history/export/stats.
- Cập nhật frontend signed upload/polling/retry, learner redaction, tutor claim và
  không persist signed URL; đồng bộ OpenAPI, checklist, tasks và `REVIEW_GUIDE.md`.
- Hardening lượt cuối: kiểm magic byte và từ chối video stream, allowlist projection
  kết quả AI, bind đúng transcription provider/model vào manifest, ngăn auto-submit
  lặp vô hạn, chuẩn hóa `meta` thành object, thêm watchdog backoff/jitter và khử dữ
  liệu nhạy cảm trong lỗi usage log.
- Khóa thêm invariant production cho replay/fingerprint/prompt snapshot, manual retry,
  report DB projection và evidence fencing; frontend chỉ khôi phục polling AI hợp lệ
  sau refresh, không mở microphone khi MIME chưa được duyệt.

### Kiểm chứng

- Backend feature-targeted: ĐẠT — 29 suite, 141/141 test; `008a` được khóa bằng test
  để chỉ bootstrap schema `library_resources` legacy giống migration `012`, không gọi
  provider thật.
- Frontend feature-targeted: ĐẠT — 7 file, 32/32 test; production build ĐẠT
  (2.883,70 kB, gzip 813,64 kB; cảnh báo bundle lớn được giữ ở T059).
- ESLint mục tiêu backend/frontend: ĐẠT; `node --check`: ĐẠT cho 82 file JavaScript
  thay đổi/mới. OpenAPI 3.1 parse/ref/state/header contract: ĐẠT.
- Không chạy migration/database production, provider thật, load test hoặc calibration
  fairness. Public Speaking band tiếp tục bị khóa bởi RFC, calibration, retention,
  disposable-DB và scale/cost gate; các thay đổi có sẵn ngoài feature được giữ nguyên.
- T001–T054 đã hoàn tất bằng code/test/tài liệu; T055–T059 được để mở có chủ ý cho
  disposable DB, coverage, load/chaos, RFC và refactor/code-splitting frontend legacy.

---

## [2026-07-22] | Codex | Hoàn thiện AI Estimated Speaking và tutor AI prelim

### Thay đổi

- Chuyển Speaking learner sang kết quả toàn phiên: transcript ASR cung cấp evidence
  Coherence/Lexical/Grammar, audio Gemini cung cấp Fluency/Pronunciation; chỉ hoàn tất
  khi đủ bốn criterion band và Overall dưới nhãn `AI Estimated Band`.
- Loại bỏ đường worker tự handoff tutor. Lỗi provider/evidence giữ `grader=ai`, đi theo
  `retry_wait/failed`; nút chấm lại chỉ hiển thị khi backend trả `failed + can_retry`.
- Bổ sung AI prelim tạm thời cho bài được học viên chọn tutor; tutor đã claim nhận bản
  nháp bốn tiêu chí để chỉnh, chưa lưu thì không tạo report hoặc đổi trạng thái.
- Tái sử dụng nguyên schema hiện có, không thêm migration hoặc bảng cho thay đổi này.
- Pin model grading/transcription `gemini-3.6-flash`, cấu hình ffmpeg/ffprobe local và
  cập nhật `.env.example` an toàn không chứa credential.
- Sửa hai lỗi chặn runtime phát hiện khi kiểm tra: hàm Writing bị đặt sai trong class,
  route claim thiếu controller, và dòng văn bản thừa cuối `FeedbackReport.jsx`.
- Đồng bộ spec/plan/tasks/data-model/quickstart/contract/OpenAPI/checklist/review guide
  với semantics mới; `needs_review` chỉ còn cho reader dữ liệu lịch sử.

### Kiểm chứng

- Backend mục tiêu: 29 suite, 130/130 test đạt; frontend: 6 file, 32/32 test đạt.
- ESLint mục tiêu và `node --check` đạt; frontend production build đạt. Lint toàn repo
  còn nợ legacy (backend 27, frontend 344), không thuộc thay đổi feature và không bị che.
- Smoke Gemini thật: Speaking ba audio private hoàn tất khoảng 34 giây với đủ bốn
  tiêu chí; Writing mẫu vô danh hoàn tất khoảng 11 giây bằng `gemini-3.6-flash`.
- API health trả 200; một API process và một worker process đang chạy. Không xóa/sửa
  dữ liệu lịch sử, không chạy migration mới và không thêm bảng.

---

## [2026-07-27] | Codex | Khắc phục Tutor upload tài liệu (feat-content-builder)

### Thay đổi

- Xác định nguyên nhân chính: POST upload và Supabase/DB đã thành công, nhưng UI
  chuyển về catalog public chỉ lọc `approved`, khiến tài liệu `pending` biến mất.
- Thêm `GET /api/v1/library/mine` và `/mine/:id` có phân quyền để Tutor theo dõi,
  chỉnh sửa tài liệu của mình ở mọi trạng thái duyệt; catalog public vẫn chỉ `approved`.
- Thêm progress upload, thông báo “đang chờ duyệt”, bỏ header multipart thủ công để
  trình duyệt tự tạo boundary; đồng bộ hook edit từ PATCH sang PUT.
- Sửa validation controller phải dừng trước service, map lỗi Multer quá 200MB thành
  HTTP 413, dùng MIME phát hiện từ magic bytes khi ghi Storage, và dọn object mới
  nếu ghi metadata DB thất bại.
- Bổ sung `deleted_at`/soft-delete cho metadata; thêm `storage_cleanup_pending` để
  thao tác xóa file Cloud có thể retry an toàn khi Supabase tạm lỗi.
- Thay các `require('uuid')` ESM không tương thích Jest bằng `crypto.randomUUID()` để
  test route có thể khởi động.

### Kiểm chứng

- Backend unit/contract/integration library: 35/35 đạt với
  `node --experimental-vm-modules`; service/query đạt 100% line/function và
  87,37% branch coverage.
- Backend public library integration: 4/4 đạt.
- Frontend library service/hook: 6/6 đạt; ESLint các file thay đổi đạt.
- Migration `028_harden_library_uploads.sql` đã áp dụng vào database development.

