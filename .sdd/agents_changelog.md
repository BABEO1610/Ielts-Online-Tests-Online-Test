# Agent Changelog — IELTSZone
# Format: [DATE] | [AGENT] | [FILE CHANGED] | [SUMMARY]

---

## 2026-05-30

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-05-30 | Antigravity | `.sdd/specs/feat-auth-and-users/SPEC.md` | **Spec fix (Constitution SEC-01):** Sửa FR-01 và NFR Security từ "Salt Round = 10" → "cost factor = 12". Layer 1 Constitution trump Spec. |
| 2026-05-30 | Antigravity | `.sdd/specs/feat-auth-and-users/TASKS.md` | **Spec sync:** Update T012 Done Criteria `bcrypt.hash(password, 10)` → `bcrypt.hash(password, 12)` để đồng bộ với Constitution SEC-01. |
| 2026-05-30 | Antigravity | `backend/src/db/migrations/002_create_users_table.sql` | **T003:** Tạo migration UP/DOWN cho bảng `users`. 13 columns, CHECK constraint (target_band_score 0–9), brute-force columns (failed_login_count, failed_login_window_start), trigger updated_at, 2 indexes (idx_users_email, idx_users_status), pgcrypto extension. |
| 2026-05-30 | Antigravity | `tests/db/migrations/002_create_users_table.test.js` | **T003 tests:** 15 test suites, static-analysis. Traceability Matrix mapping đủ SPEC/PLAN/TASKS. 105/105 tests PASS. |
| 2026-05-30 | Antigravity | ackend/src/db/queries/users.queries.js | **T006:** Implement cc User Query Functions ph?c v? auth (createUser, getUserByEmail, getUserById, updateUserStatus, updateUserRole v?i optimistic locking, updatePassword, incrementFailedLogin, resetFailedLogin). Vi?t Unit Test 	ests/db/queries/users.queries.test.js mock pg pool. 18/18 tests PASS. |

## 2026-06-07

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-07 | Kiro | `frontend/src/styles/admin.css` | **Admin redesign (DESIGN.md):** Tạo design system cho khu vực Admin theo phong cách Uber (đen-trắng, pill, card bo 16px, Inter). Dùng lại design tokens trong `index.css`. Gồm: shell layout (sidebar + topbar + footer), stat-card, pill badge, admin-table (có highlight dòng khả nghi). |
| 2026-06-07 | Kiro | `frontend/src/layouts/AdminLayout.jsx` | **Layout mới:** Thay AdminLayout cũ (inline style) bằng layout hoàn chỉnh: sidebar điều hướng (Tổng quan / Người dùng / Nhật ký / Thống kê AI), topbar (nút Thêm Giảng viên + dropdown user), `<Outlet/>` cho main, footer. Giữ CreateTutorModal + ChangePwdModal. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/AdminOverviewPage.jsx` | **Dashboard Admin:** Stat cards (tổng user, active, đề thi, lượt gọi AI), donut phân bổ vai trò + bar đăng ký mới (recharts), bảng hoạt động gần đây có đánh dấu khả nghi. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/AdminUsersPage.jsx` | **Refactor Quản lý người dùng:** Chuyển logic từ `AdminDashboard.jsx` vào layout mới (bỏ navbar riêng), thêm thẻ phân tích (active/pending/tutor/banned), pill role+status, giữ cập nhật trạng thái qua UserModals. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/AdminActivityLogPage.jsx` | **Nhật ký hoạt động:** Log thường + khả nghi (login_failed nhiều lần, IP lạ, tài khoản bị khoá), lọc theo mức độ, cột IP/ghi chú, highlight dòng khả nghi. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/AdminAiUsagePage.jsx` | **Thống kê AI:** Lượt gọi/token 30 ngày, line chart xu hướng, breakdown theo tính năng (Writing/Speaking/Chatbot/Explain), bảng top user dùng AI + cột phân tích TB token/lượt. |
| 2026-06-07 | Kiro | `frontend/src/services/adminStats.service.js` | **Data layer Admin:** fetchOverview/fetchActivityLogs/fetchAiUsage — gọi endpoint dự kiến (`/admin/metrics/*`, `/admin/audit-logs`), fallback dữ liệu mẫu có cờ `isSample` khi backend chưa có (audit_logs, platform_metrics_snapshots, chatbot_messages). |
| 2026-06-07 | Kiro | `frontend/src/utils/adminFormat.js`, `frontend/src/components/admin/StatCard.jsx` | **Helpers:** format số/ngày (vi-VN), nhãn `log_action` tiếng Việt, pill role/status; component StatCard tái sử dụng. |
| 2026-06-07 | Kiro | `frontend/src/App.jsx` | **Routing:** Lồng `/admin` dưới `AdminLayout` với route con: index=Tổng quan, `users`, `activity`, `ai-usage`. Build production PASS (vite build, exit 0). |

> **Lưu ý cho team (Constitution SDD-01/SDD-02):** Backend chưa có endpoint `/admin/metrics/overview`, `/admin/metrics/ai-usage`, `/admin/audit-logs`. Các trang mới đang dùng dữ liệu mẫu (hiển thị nhãn "● Dữ liệu mẫu"). Cần viết spec + implement API (đọc `audit_logs`, `platform_metrics_snapshots`, `chatbot_messages`, `ai_explain_requests`, `ai_feedback_reports` trong shared_context.md) để thay fallback. Mọi endpoint phải có `authenticate + authorize('admin')` (SEC-07).

## 2026-06-07 (bổ sung — mở rộng nghiệp vụ Admin)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-07 | Kiro | `frontend/src/pages/admin/ContentReviewPage.jsx` | **Duyệt nội dung:** Admin duyệt/từ chối đề thi (`mock_tests`) và tài liệu (`library_resources`) do tutor đăng + tab Lịch đăng (xem `publish_at`, đếm ngược). Không CRUD — chỉ kiểm duyệt theo yêu cầu. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/GradingOversightPage.jsx` | **Giám sát chấm bài:** Tổng hợp `writing_submissions`/`speaking_submissions` theo trạng thái, lọc, retry bài `grading_failed` (IELTS-06), highlight dòng lỗi. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/SessionsPage.jsx` | **Phiên đăng nhập:** Xem phiên đang hoạt động (`user_sessions`/`v_active_sessions`), thu hồi token (`revoked_at`) — phục vụ safety S-04/S-05. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/ContactInboxPage.jsx` | **Hộp thư liên hệ:** Xem/đánh dấu đã xử lý `contact_submissions` (`resolved`), lọc theo trạng thái, mở rộng xem nội dung. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/ReportsPage.jsx` + `frontend/src/utils/exportCsv.js` | **Báo cáo & xuất CSV:** Số liệu theo ngày (`v_admin_usage_report`/`platform_metrics_snapshots`), line chart đa chỉ số, **xuất CSV** (BOM UTF-8 cho Excel tiếng Việt). |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/TutorAssignmentPage.jsx` | **Phân công giảng viên:** Gán tutor phụ trách cho từng student, đánh dấu học viên chưa có giảng viên. |
| 2026-06-07 | Kiro | `frontend/src/services/adminOps.service.js` | **Data layer vận hành:** fetch/mutation cho content review, grading, sessions, contacts, reports, tutor assignment. Gọi API dự kiến, fallback dữ liệu mẫu (cờ `isSample`). |
| 2026-06-07 | Kiro | `frontend/src/layouts/AdminLayout.jsx` | **Cập nhật sidebar:** Bỏ toàn bộ icon ở nav (theo yêu cầu), nhóm điều hướng theo 4 section (Tổng quan / Người dùng / Nội dung & chấm bài / Hỗ trợ & phân tích), thêm 6 mục mới. |
| 2026-06-07 | Kiro | `frontend/src/App.jsx` | **Routing:** Thêm route con `/admin/{reports,tutor-assignment,sessions,content-review,grading,contacts}`. Build production PASS (vite build, exit 0). |
| 2026-06-07 | Kiro | `frontend/src/utils/adminFormat.js`, `frontend/src/styles/admin.css` | Thêm helper `formatBytes`; gỡ class CSS `.admin-nav-row__icon` không còn dùng. |

> **Backend cần làm (Constitution SDD-01, SEC-07, DATA-01):** Các nghiệp vụ trên đang dùng dữ liệu mẫu, cần spec + API:
> `/admin/tests?status=pending` + `/admin/tests/:id/review`, `/admin/resources` + review, `/admin/publish-schedule`,
> `/admin/submissions` + `/admin/submissions/:type/:id/retry`, `/admin/sessions` + DELETE, `/admin/contacts` + resolve,
> `/admin/reports/usage`, `/admin/tutor-assignments` + PUT. Mọi endpoint bắt buộc `authenticate + authorize('admin')`.
> **Lưu ý schema:** "Phân công giảng viên" hiện CHƯA có bảng trong schema v2 — cần RFC + migration tạo bảng `tutor_student_assignments` (hoặc cột trên `users`) trước khi nối API (Constitution ARTICLE 1/SDD-05).
> Phần frontend xác nhận tài khoản qua email do team tự làm — chưa thực hiện ở đây.

## 2026-06-07 (bổ sung — nghiệp vụ admin mở rộng)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-07 | Kiro | `frontend/src/services/adminOps.service.js` | **Data layer nghiệp vụ admin:** fetch + mutation cho Duyệt nội dung (tests/resources/schedule), Giám sát chấm bài (+retry), Phiên đăng nhập (+revoke), Hộp thư liên hệ (+resolve), Báo cáo, Phân công tutor, và Nhật ký duyệt & thay đổi (+revert). Gọi endpoint dự kiến, fallback dữ liệu mẫu có cờ `isSample`. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/ContentReviewPage.jsx` | **Duyệt nội dung:** Admin duyệt/từ chối đề thi + tài liệu do tutor đăng, tab xem lịch đăng (`publish_at`). Chỉ duyệt — không CRUD nội dung. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/GradingOversightPage.jsx` | **Giám sát chấm bài:** Hàng đợi writing/speaking_submissions theo status, retry bài `grading_failed` (IELTS-06), lọc theo trạng thái. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/SessionsPage.jsx` | **Phiên đăng nhập/thiết bị:** Liệt kê `user_sessions` đang hoạt động (IP, thiết bị, OAuth, hết hạn), thu hồi phiên (set `revoked_at`). |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/ContactInboxPage.jsx` | **Hộp thư liên hệ:** Đọc `contact_submissions`, lọc chưa/đã xử lý, xem nội dung, đánh dấu `resolved`. |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/ReportsPage.jsx`, `frontend/src/utils/exportCsv.js` | **Báo cáo & xuất CSV:** Số liệu sử dụng theo ngày (line chart + bảng), xuất CSV (BOM UTF-8 cho Excel đọc tiếng Việt). |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/TutorAssignmentPage.jsx` | **Phân công giảng viên:** Gán tutor phụ trách cho từng student. **Lưu ý:** schema chưa có bảng phân công riêng — cần RFC + bảng `tutor_assignments` ở backend (Constitution SDD-05). |
| 2026-06-07 | Kiro | `frontend/src/pages/admin/AdminChangeLogPage.jsx` | **Nhật ký duyệt & thay đổi:** Map vào bảng `audit_logs` (old_value/new_value JSONB). Modal xem diff từng trường (cũ→mới), nút **Hoàn tác** thay đổi. |
| 2026-06-07 | Kiro | `frontend/src/utils/adminFormat.js` | Thêm `formatBytes`, `diffValues`, `displayValue` phục vụ các trang trên. |
| 2026-06-07 | Kiro | `frontend/src/layouts/AdminLayout.jsx` | **Bỏ icon** ở sidebar (theo yêu cầu), nhóm nav thành 4 section: Tổng quan / Người dùng / Nội dung & chấm bài / Hỗ trợ & phân tích. Thêm 7 mục mới. |
| 2026-06-07 | Kiro | `frontend/src/App.jsx` | Thêm route con `/admin`: tutor-assignment, sessions, content-review, grading, change-log, contacts, reports. Build production PASS (vite build, exit 0). |

> **Cần backend làm tiếp (Constitution SDD-01):** Khi implement endpoint duyệt nội dung / thu hồi phiên / xử lý liên hệ, BẮT BUỘC gọi `insertAuditLog` (audit.queries.js) để ghi vào `audit_logs` — đây là nguồn dữ liệu cho trang Nhật ký duyệt & thay đổi. Để hỗ trợ "Hoàn tác", cân nhắc: (a) thêm cột `reverted_at` vào `audit_logs`, hoặc (b) ghi một bản ghi audit mới cho hành động revert. Bảng `tutor_assignments` cần RFC vì là thay đổi schema (ARTICLE 10 / SDD-05). Mọi endpoint admin phải có `authenticate + authorize('admin')` (SEC-07).

## 2026-06-07 (fix hồ sơ admin)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-07 | Kiro | `frontend/src/pages/admin/AdminProfilePage.jsx` | **Sửa lỗi navbar:** Dropdown admin trỏ `/profile` → `UserProfilePage` render `StudentNavbar` (navbar lỗi trong ngữ cảnh admin). Tạo trang hồ sơ admin nằm TRONG AdminLayout: thẻ identity (avatar/role/status), form sửa tên+avatar (PATCH /users/me), thẻ bảo mật (đổi mật khẩu, ngày tạo, đăng nhập gần nhất). |
| 2026-06-07 | Kiro | `frontend/src/layouts/AdminLayout.jsx` | Dropdown tài khoản: header hiển thị tên/email/role pill, link "Hồ sơ cá nhân" → `/admin/profile` (giữ sidebar+topbar, hết lỗi navbar). |
| 2026-06-07 | Kiro | `frontend/src/App.jsx` | Thêm route `/admin/profile`. Build PASS (exit 0). |

## 2026-06-07 (nút Xem website)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-07 | Kiro | `frontend/src/layouts/AdminLayout.jsx` | Thêm nút "↗ Xem website" vào topbar admin (bên trái, cạnh "Thêm Giảng viên"), trỏ về `/` và mở tab mới (`target="_blank" rel="noopener noreferrer"`). Dùng `btn-pill--ghost` theo design system. Build PASS (exit 0). |

## 2026-06-14

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-14 | Antigravity | `frontend/src/pages/subjective-testing/WritingTestPage.jsx` | **Tạo mới trang thi Writing:** Tách màn hình làm bài và xem kết quả từ `WritingPage.jsx`, hỗ trợ route-driven thi theo ID: `/tests/:id/writing`. |
| 2026-06-14 | Antigravity | `frontend/src/pages/subjective-testing/SpeakingTestPage.jsx` | **Tạo mới trang thi Speaking:** Tách màn hình làm bài và xem kết quả từ `SpeakingPage.jsx`, hỗ trợ route-driven thi theo ID: `/tests/:id/speaking`. |
| 2026-06-14 | Antigravity | `frontend/src/pages/subjective-testing/WritingPage.jsx` | **Refactor WritingPage:** Xóa code màn hình làm bài, chuyển hướng `ModeSelector` sang trang thi route-driven mới. Sửa relative imports. |
| 2026-06-14 | Antigravity | `frontend/src/pages/subjective-testing/SpeakingPage.jsx` | **Refactor SpeakingPage:** Xóa code màn hình làm bài, chuyển hướng `ModeSelector` sang trang thi route-driven mới. Sửa relative imports. |
| 2026-06-14 | Antigravity | `frontend/src/App.jsx` | **Cấu hình Router:** Thêm route `/tests/:id/writing` và `/tests/:id/speaking` được bảo vệ bằng `ProtectedRoute` cho học viên. Cập nhật đường dẫn import cho các trang Tutor di chuyển từ `pages/objective-testing/` sang `pages/tutor/`. |
| 2026-06-14 | Antigravity | Các file thuộc `pages/auth/*`, `pages/student/*`, `pages/tutor/*`, `pages/public/*` | **Sửa lỗi imports:** Điều chỉnh relative imports của `components`, `context`, `services` từ `../` thành `../../` trong tất cả các file bị dời trước đó để sửa lỗi build. |
| 2026-06-14 | Antigravity | `frontend/src/pages/tutor/AdminDashboard.jsx` -> `frontend/src/pages/admin/AdminDashboard.jsx` | **Tổ chức lại folder admin:** Di chuyển tệp `AdminDashboard.jsx` từ thư mục `pages/tutor/` sang đúng thư mục `pages/admin/`. |
| 2026-06-14 | Antigravity | Các file Tutor trong `pages/objective-testing/` -> `pages/tutor/` | **Tổ chức lại folder tutor:** Di chuyển các tệp `TutorQuestionFormPage.jsx`, `TutorTestFormPage.jsx`, `TutorTestManagePage.jsx` sang thư mục `pages/tutor/`. |
| 2026-06-14 | Antigravity | `frontend/src/App.jsx` | **Sửa lỗi trắng màn hình:** Thêm các import còn thiếu cho `TutorLayout` và `TutorActivityLogPage` vào `App.jsx` để tránh ReferenceError lúc khởi động ứng dụng React. |

| 2026-06-14 | Antigravity | `frontend/src/pages/subjective-testing/SpeakingPage.jsx`, `frontend/src/App.jsx` | **Sửa lỗi build:** Cập nhật import `ModeSelector`, xóa `ProgressBar` không sử dụng ở `SpeakingPage.jsx`, và sửa đường dẫn import của `TutorActivityLogPage` trong `App.jsx` để build thành công. |

## 2026-06-19

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-19 | BABEO1610 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (fix export, add preview mode for admin) |
| 2026-06-19 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (small fix, upload files to cloud and optimize tutor'upload follow by business rule) |
| 2026-06-19 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 3 commits (fix status of document when admin approach, quenry data form superbase, fix getlibrary intead of fetchlibrary changes path .env) |
| 2026-06-19 | Kiro/Claude | (Multiple files) | **Listening Test Audio Fix**<br>### Context<br>Fixed major bugs in Listening mock test creation:<br>1. Network error when creating new listening tests (payload too large)<br>2. Wrong business logic: each section had separate audio files instead of single shared audio<br><br>### Changes Made<br><br>#### Backend Changes<br><br>**1. Database Migration (`backend/src/db/migrations/013_add_listening_audio_support.sql`)**<br>- Added `audio_url` column to `mock_tests` table for single audio file per test<br>- Added index `idx_mock_tests_audio` for performance<br>- Updated column comments to clarify listening vs reading data structure<br>- Re-purposed `test_passages.instruction` to store JSONB metadata for listening sections<br><br>**2. New Service (`backend/src/services/audioStorage.service.js`)**<br>- Created Supabase Storage integration for audio uploads<br>- Implements SEC-04 security rules: file size limit (50MB), MIME type validation<br>- Methods: `uploadAudio()`, `deleteAudio()`, `extractFilePathFromUrl()`<br>- Uses magic bytes validation (not just file extension)<br><br>**3. Updated Test Service (`backend/src/services/test.service.js`)**<br>- Modified `createReadingTest()`: now accepts and saves `audioUrl` parameter<br>- Modified `updateReadingTest()`: supports audio URL updates<br>- Fixed `normalizePassages()`: for listening, saves metadata as JSONB in `instruction` field<br>- Fixed `getTestById()`: correctly parses listening section metadata from JSONB<br><br>**4. New Controller (`backend/src/controllers/audioController.js`)**<br>- `uploadAudio()`: POST /api/v1/audio/upload - accepts base64 audio, uploads to Supabase<br>- `deleteAudio()`: DELETE /api/v1/audio/:path - removes audio from Supabase Storage<br>- Full error handling with standard response format<br><br>**5. New Routes (`backend/src/routes/api/v1/audio.routes.js`)**<br>- Registered `/api/v1/audio/*` endpoints<br>- Added to main API router<br><br>**6. App Config (`backend/src/app.js`)**<br>- Increased body parser limit from default to 50MB for audio base64 uploads<br>- Complies with SEC-04: max file size 50MB<br><br>#### Frontend Changes<br><br>**1. TutorListeningFormPage.jsx - Major Refactor**<br><br>**Removed:**<br>- Per-section audio upload fields (4 separate audio inputs)<br>- `uploadTargetSectionId`, `previewAudioSectionId` state<br>- `handleUploadClick()`, `handlePreviewAudio()` functions<br>- `section.audioUrl` from data model<br><br>**Added:**<br>- Single audio upload section at top (before 4 sections)<br>- `formData.audioUrl` - single audio URL for entire test<br>- `isUploadingAudio` state - loading indicator during upload<br>- `showAudioPlayer` state - toggle audio preview<br>- Better validation: requires audio before publishing<br>- Warning messages for missing audio or incorrect question count<br><br>**Modified:**<br>- `DEFAULT_SECTIONS`: removed `audioUrl` field<br>- `handleAudioFileChange()`: uploads to single audio field<br>- `buildPayload()`: sends `audioUrl` at test level, not per section<br>- `handleSaveTest()`: validates audio URL exists before publishing<br>- File size limit: 8MB → 50MB<br>- UI improvements: clear instructions, loading states, error messages<br><br>**2. ListeningTestPreviewModal (updated props)**<br>- Now receives `audioUrl` prop for single audio player<br>- Sections no longer have individual audio URLs<br><br>### Technical Details<br><br>**Data Structure Changes:**<br><br>Before:<br>```javascript<br>{<br>  sections: [<br>    { audioUrl: "data:audio/...", transcript: "..." },  // Section 1 audio<br>    { audioUrl: "data:audio/...", transcript: "..." },  // Section 2 audio<br>    ...<br>  ]<br>}<br>```<br><br>After:<br>```javascript<br>{<br>  audioUrl: "https://supabase.../tests/audio.mp3",  // Single audio for all sections<br>  sections: [<br>    { <br>      title: "Section 1", <br>      transcript: "...",<br>      showTranscript: true,<br>      startTime: 0,      // Optional: for future timestamp features<br>      endTime: 330<br>    },<br>    ...<br>  ]<br>}<br>```<br><br>**Database Mapping:**<br>- `mock_tests.audio_url` → Single audio URL<br>- `test_passages.instruction` → JSONB: `{"show_transcript": true, "start_time": 0, "end_time": 330}`<br>- `test_passages.content` → Transcript text<br>- `test_passages.title` → Section title<br><br>### Security Compliance<br>- ✅ SEC-04: File upload validation (MIME type + size limit)<br>- ✅ SEC-03: Parameterized SQL queries ($1, $2, ...)<br>- ✅ SEC-09: No stack traces in responses<br>- ✅ ADR-003: Standard response format `{ success, data, error, meta }`<br><br>### Testing Checklist<br>- [ ] Run migration: `npm run migrate` in backend<br>- [ ] Test audio upload < 50MB<br>- [ ] Test create new listening test with audio<br>- [ ] Test update existing listening test<br>- [ ] Test validation: 40 questions required<br>- [ ] Test validation: audio required before publish<br>- [ ] Test preview audio player<br>- [ ] Verify network error resolved<br><br>### Migration Instructions<br><br>1. **Backend:**<br>```bash<br>cd backend<br>npm run migrate<br># or<br>node scripts/migrate.js<br>```<br><br>2. **Supabase Storage Setup:**<br>- Create bucket named `listening-audio` in Supabase Dashboard<br>- Set bucket to public (or configure appropriate policies)<br>- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env<br><br>3. **Testing:**<br>```bash<br># Start backend<br>cd backend<br>npm start<br><br># Start frontend<br>cd frontend<br>npm run dev<br>```<br><br>### Known Issues / Future Improvements<br>1. Audio upload currently uses base64 encoding - consider direct file upload for better performance<br>2. Timestamps (startTime/endTime) are in database schema but not yet used in player<br>3. Consider adding audio player with section markers in preview/test-taking UI<br>4. Add progress indicator for large audio uploads<br><br>### Files Changed<br>- `backend/src/db/migrations/013_add_listening_audio_support.sql` (NEW)<br>- `backend/src/services/audioStorage.service.js` (NEW)<br>- `backend/src/services/test.service.js` (MODIFIED)<br>- `backend/src/controllers/audioController.js` (NEW)<br>- `backend/src/routes/api/v1/audio.routes.js` (NEW)<br>- `backend/src/routes/api/v1/index.js` (MODIFIED)<br>- `backend/src/app.js` (MODIFIED)<br>- `backend/scripts/migrate.js` (MODIFIED - fixed .env loading)<br>- `frontend/src/pages/tutor/TutorListeningFormPage.jsx` (MAJOR REFACTOR)<br><br>### Reviewers<br>- Tech Lead: Verify security compliance<br>- QA: Test audio upload flow end-to-end<br>- Product: Confirm business logic matches IELTS requirements<br><br>---<br><br>[2026-06-24] \| [AGENT] \| [.sdd/agents_changelog.md, .sdd/context/db-schema-snapshot.md, .sdd/shared_context.md, .sdd/specs/global-ielts-virtual-assistant/spec.md, backend/src/api/assistant/assistant.constants.js, .sdd/rfcs/rfc-2026-06-24-assistant-quality-upgrade.md, .sdd/specs/global-ielts-virtual-assistant/eval-set.md] \| [Added schema snapshot, feature-table mapping, Global Assistant schema reconciliation, intent context map, RFC, and golden eval set.]<br><br>--- |

## 2026-07-03

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-03 | BABEO1610 | (Multiple files) | **(Team Commit)**: Tổng hợp 3 commits (backend assign tutor check log, update format assign tutor check log, migration update tutor assigned) |
| 2026-07-03 | Antigravity Agent | (Multiple files) | **Fix Audit Log – Phân công Giảng viên hiển thị UUID thô**<br>### Vấn đề gốc rễ<br>Khi admin phân công giảng viên, trang "Nhật ký duyệt & thay đổi" hiển thị UUID thô (`bccb8d25-...`) thay vì tên giảng viên. Nguyên nhân là chuỗi 5 điểm sai xuyên suốt DB → Backend → Frontend.<br><br>### Files thay đổi<br><br>**1. `backend/src/db/migrations/020_add_tutor_assigned_log_action.sql` (NEW)**<br>- Thêm `'tutor_assigned'` vào enum `log_action` DB<br>- Đã chạy và apply thành công<br><br>**2. `backend/src/db/queries/tutorAssignment.queries.js` (MODIFY)**<br>- `getSubmissionByIdAndType()`: thêm `LEFT JOIN users tutor` và `LEFT JOIN users student` để lấy `tutor_name`, `student_name` cùng với submission data<br>- `assignTutorToSubmission()`: đổi sang CTE (`WITH updated AS`) để JOIN và trả về tên tutor mới sau UPDATE, không cần query riêng<br><br>**3. `backend/src/services/adminTutor.service.js` (MODIFY)**<br>- Đổi `action = 'user_updated'` → `'tutor_assigned'` (đúng semantic)<br>- `old_value` và `new_value` giờ lưu `{ tutor_id, tutor_name, tutor_email, student_name, submission_type }` thay vì `{ assigned_tutor_id: UUID }`<br><br>**4. `backend/src/services/audit.service.js` (MODIFY)**<br>- `ACTION_LABELS`: thêm `tutor_assigned: 'Phân công giảng viên'`, xóa duplicate `resource_uploaded`<br>- `getTargetLabel()`: thêm logic lấy tên học sinh từ `new_value.student_name` (khi target_id là submission UUID thay vì user UUID)<br>- `getNote()`: thêm case `tutor_assigned` tạo note `Phân công (Writing) cho: Tên Giảng Viên`<br><br>**5. `frontend/src/utils/adminFormat.js` (MODIFY)**<br>- `ACTION_LABELS`: thêm `tutor_assigned: 'Phân công giảng viên'`<br>- `FIELD_LABELS` (mới): map 14 DB column names → nhãn tiếng Việt<br>- `diffValues()`: dùng `FIELD_LABELS[field]` để hiển thị `'Giảng viên phụ trách'` thay vì `'tutor_name'` trong modal chi tiết<br><br>**6. `backend/scripts/migrate-single.js` (NEW)**<br>- Script tiện ích chạy từng migration file riêng lẻ (tránh bị block bởi file cũ có lỗi)<br><br>### Security Compliance<br>- ✅ SEC-03: Tất cả SQL dùng parameterized query ($1, $2)<br>- ✅ ADR-001: Không dùng ORM<br>- ✅ ADR-003: Response format `{ success, data, error, meta }` không thay đổi<br>- ✅ DATA-03: Migration chỉ ADD VALUE vào enum, không phá schema cũ<br><br>--- |

## 2026-07-20

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-20 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (paging admin/grading, fix listening,reading test; landing page) |
| 2026-07-20 | Codex | (Multiple files) | **Global IELTS Assistant provider và conversation memory**<br>### Thay đổi<br><br>- Sửa chọn provider/model: Gemini là mặc định của Global Assistant khi có Gemini key,<br>  model được cô lập theo provider và Gemini key chuyển khỏi URL sang header.<br>- Cho knowledge response retry một lần ở plain-text mode trước deterministic fallback.<br>- Thêm owned `conversationId`, ownership-atomic message insert và structured<br>  `preferred_address` theo active conversation (set/recall/clear, sanitize input).<br>- Giữ conversation khi panel đóng/mở, cải thiện chained follow-up và đánh dấu mọi<br>  conversation memory là untrusted prompt data.<br>- Cập nhật spec/plan/tasks/eval và migration 024.<br><br>### Verification<br><br>- Backend targeted: PASS — 19 suites, 254 tests.<br>- Frontend focused: PASS — 2 files, 3 tests; assistant ESLint PASS; production build PASS.<br>- Không chạy live AI/DB và không đọc `.env`; migration 024 vẫn cần apply theo quy trình<br>  deploy của environment.<br><br>--- |

## 2026-07-21

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-21 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 47 commits (chore(speckit): add speckit workflows, chore(speckit): add markdown templates for spec, plan, tasks, chore(speckit): add powershell utility scripts for scaffolding, và 44 thay đổi khác) |
| 2026-07-21 | BABEO1610 | (Multiple files) | **(Team Commit)**: delete unuse file |
| 2026-07-21 | Codex | (Multiple files) | **Multi-turn topic memory và recommendation theo hội thoại**<br>### Thay đổi<br><br>- Nhận diện tham chiếu nhiều lượt (`hai cái này`, `both`, `chúng`) và inject tối đa 12<br>  lượt user/assistant gần nhất cùng topic/skill server-derived vào prompt/classifier.<br>- Route yêu cầu mơ hồ “tìm 1 đề phù hợp” sang `FIND_TEST`, kế thừa Reading từ<br>  Skimming/Scanning và giữ test/link được DB-grounding.<br>- Làm fallback lookup tự nhiên hơn theo preferred address/topic nhưng không suy đoán<br>  band hoặc năng lực.<br>- Scope history theo owned conversation và resume active session có message mới nhất,<br>  tránh UI hiển thị một session trong khi AI dùng session khác.<br>- Library route không còn cướp câu hỏi kiến thức; topic được lọc trong SQL trước limit<br>  và quantity được áp sau xếp hạng.<br>- Lookup response bị provider lỗi hoặc nêu title ngoài DB được thay bằng câu trả lời/link<br>  deterministic đã grounded.<br>- Frontend chờ canonical history trước khi cho gửi, parse cả SSE frame cuối và không<br>  tự resubmit JSON khi stream delivery chưa chắc chắn để tránh lưu trùng memory.<br>- Prompt bỏ các block memory/preference/state/knowledge bị lặp; knowledge fallback dùng<br>  recent Skimming/Scanning và không còn câu “Mình chưa gọi được AI”.<br><br>### Verification<br><br>- Backend targeted: PASS — 19 suites, 272 tests.<br>- Frontend focused: PASS — 3 files, 7 tests; assistant ESLint PASS; production build PASS.<br>- Read-only DB preflight xác nhận session/history selection mới cùng chọn đúng<br>  conversation gần nhất. Nodemon đã tự restart backend và health trả HTTP 200;<br>  migration 024 vẫn chưa apply.<br><br>--- |
| 2026-07-21 | Codex | (Multiple files) | **Chuẩn hóa tài liệu Global IELTS Virtual Assistant theo Speckit**<br>### Thay đổi<br><br>- Chuẩn hóa `spec.md`, `plan.md`, `tasks.md`, `checklist.md`, `CONTEXT.md` theo template<br>  và đối chiếu trực tiếp với source/test hiện có; không thay đổi mã nguồn.<br>- Đổi tên bộ test production thành `production-test-suite.md`, giữ đủ 561 ID duy nhất<br>  từ TC-001 đến TC-561 trong 21 nhóm và sửa các case cuối theo hành vi thực tế.<br>- Ghi rõ các khác biệt đang tồn tại: React 19, response assistant dạng phẳng, auth/error<br>  xử lý inline, pseudo-stream SSE, intent không reachable và migration 024 chưa được apply.<br>- Bổ sung các gate chưa đạt/chưa chứng minh về vị trí custom CSS, branch/spec naming và<br>  coverage 80%; làm rõ persistence là best-effort trước khi phát application SSE.<br>- Tách 53 task đã có bằng chứng source/test, hai task tài liệu/regression vừa hoàn tất và<br>  sáu task hardening/live-environment còn mở.<br><br>### Verification<br><br>- Backend focused Jest: PASS — 15 suites, 261 tests; không skip.<br>- Frontend focused Vitest: PASS — 3 files, 7 tests; assistant ESLint và build PASS.<br>- Backend syntax: PASS — 22 file JavaScript. Backend ESLint bị chặn do thiếu dependency<br>  `@eslint/js`; không cài dependency trong lượt chuẩn hóa tài liệu này.<br>- Document contracts: PASS — 561 testcase, 61 task, 30 checklist item và không còn<br>  placeholder template; 28 FR và 8 SC đều map được tới task. Không chạy migration,<br>  live AI/DB, commit hoặc push.<br><br>--- |
| 2026-07-21 | Codex | (Multiple files) | **Việt hóa tài liệu Trợ lý ảo IELTS toàn cục**<br>### Thay đổi<br><br>- Việt hóa và hiệu đính toàn bộ phần diễn giải phục vụ học tập, thuyết trình và phản<br>  biện trong 9 tệp tại `.sdd/specs/global-ielts-virtual-assistant/`.<br>- Chuẩn hóa thuật ngữ tiếng Việt về xác thực, truyền luồng SSE, quyền sở hữu hội thoại,<br>  dữ liệu có căn cứ, phương án dự phòng và tệp di trú; sửa các câu dịch máy móc trong<br>  bộ kiểm thử 561 ca.<br>- Đồng bộ phần mô tả RFC với hiện trạng hỗ trợ Gemini/OpenAI, một lần thử lại phản hồi<br>  tri thức không hợp lệ và các nhánh dự phòng Skimming/Scanning.<br>- Giữ nguyên ID yêu cầu/nhiệm vụ/ca kiểm thử, đường dẫn, lệnh, tên trường/hàm, mã trạng<br>  thái/ý định, đầu vào kiểm thử tiếng Anh/song ngữ và đầu ra lịch sử cần thiết.<br><br>### Kiểm chứng<br><br>- Hợp đồng tài liệu: ĐẠT — 9 tệp, 28 FR, 8 SC, 61 nhiệm vụ (55 hoàn tất/6 còn mở),<br>  30 mục kiểm tra (29 hoàn tất/1 còn mở) và 115 dòng dữ liệu đánh giá.<br>- Bộ kiểm thử vận hành: ĐẠT — 561 ID duy nhất, liên tục từ TC-001 đến TC-561 trong 21<br>  nhóm; mọi hàng giữ đúng 8 cột.<br>- Hàng rào Markdown: ĐẠT — các khối mã cân bằng và `git diff --check` trong phạm vi<br>  tài liệu không có lỗi; chỉ có cảnh báo quy ước xuống dòng LF/CRLF.<br>- Không thay đổi `backend/` hoặc `frontend/`; không chạy tệp di trú, AI/CSDL thật,<br>  commit hoặc push. Các thay đổi có sẵn ngoài phạm vi được giữ nguyên.<br><br>--- |
| 2026-07-21 | Codex | (Multiple files) | **Đối chiếu và chuẩn hóa tài liệu AI Fast Grading**<br>### Thay đổi<br><br>- Đọc đối chiếu mã nguồn, migration, route, frontend và test hiện tại rồi viết lại<br>  `spec.md`, `plan.md`, `tasks.md`, `checklist.md` trong<br>  `.sdd/specs/ai-fast-grading/` theo cấu trúc Speckit bằng tiếng Việt.<br>- Thay trạng thái “hoàn tất” không có bằng chứng bằng trạng thái đạt/một phần/chưa đạt;<br>  bổ sung truy vết yêu cầu → task và ghi rõ các khoảng trống về Constitution, trạng<br>  thái lỗi, idempotency đồng thời, validation, transaction, Socket.IO và coverage.<br>- Chỉ sửa tài liệu; không thay đổi mã nguồn, dependency, migration, cấu hình hoặc dữ<br>  liệu môi trường.<br><br>### Kiểm chứng<br><br>- Backend mục tiêu: ĐẠT — 5 suite, 17/17 test.<br>- Frontend hook Socket: ĐẠT ở mức unit — 8/8 test, nhưng hợp đồng mock đang dùng tên<br>  sự kiện lệch backend nên không được coi là bằng chứng tích hợp.<br>- Nhóm test frontend liên quan: 15 test đạt, 10 test lỗi; test FeedbackReport đặt dưới<br>  `frontend/src/tests/` không được cấu hình Vitest thu thập.<br>- Hợp đồng tài liệu: 16 FR, 6 SC, 47 task và 44 checklist ID duy nhất; UTF-8 hợp lệ,<br>  liên kết nội bộ tương đối. `.specify/feature.json` tạm không còn tồn tại.<br><br>--- |

## 2026-07-22

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-22 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 159 commits (chore(repo): add recovered file recovered_outputs.json, chore(repo): add recovered file recovered_FeedbackReport.txt, chore(repo): add recovered file recovered_FeedbackReport.jsx, và 156 thay đổi khác) |
| 2026-07-22 | Codex | (Multiple files) | **Triển khai migration và storage AI grading**<br>- Sau khi người dùng cho phép rõ ràng, đã tạo và verify backup schema `public`, baseline<br>  34 migration lịch sử rồi apply `025`–`026` trên database hiện tại.<br>- Preflight sau migration không có blocker; số dòng users/speaking/writing/report giữ<br>  nguyên. Lịch sử migration có 36 checksum và các khóa ngoại mới đã được xác minh.<br>- Tạo bucket private `speaking-audio-private`; giữ nguyên bucket public legacy để không<br>  phá dữ liệu/demo đang có. `.env` dùng bucket private và bật async Speaking ở chế độ<br>  fail-closed; publication band vẫn tắt.<br>- Cài FFmpeg/FFprobe 8.1.2 cho tài khoản hiện tại. Chưa gọi provider thật, restore<br>  rehearsal, load/chaos test hoặc calibration release; các cổng production này vẫn mở. |
| 2026-07-22 | Codex | (Multiple files) | **Lập kế hoạch production cho AI Speaking Grading**<br>### Thay đổi<br><br>- Chạy workflow `speckit-plan` cho feature `.sdd/specs/ai-fast-grading/` và viết lại<br>  `plan.md` dựa trên code, migration và runtime hiện tại; chưa triển khai source code.<br>- Bổ sung `research.md`, `data-model.md`, hợp đồng Markdown/OpenAPI 3.1 và<br>  `quickstart.md` để mô tả evidence audio/transcript, worker bất đồng bộ, conditional<br>  nullable criteria, retry/idempotency, private signed upload và calibration gate.<br>- Chốt phương án tận dụng `speaking_submissions`, `ai_grading_reports`,<br>  `ai_usage_logs`, `tutor_feedback_reports`, `assigned_tutor_id` và<br>  `speaking_group_id`; chỉ đề xuất hai bảng feature mới là `ai_grading_jobs` và<br>  `speaking_analysis_artifacts` (migration metadata, nếu cần, dùng một platform table<br>  chung thay vì bảng riêng cho AI).<br>- Ghi rõ không dùng/dual-write các bảng legacy `speaking_attempts`,<br>  `speaking_attempt_answers`, `tutor_grading_reports`; không tạo các bảng riêng cho<br>  audio asset, transcript, fluency, pronunciation, job attempt hoặc idempotency key.<br>- Đặt cổng bắt buộc trước implementation: sửa spec để transcript-only không sinh bất<br>  kỳ IELTS criterion band/Overall và partial audio fail closed theo evidence; phê duyệt<br>  RFC provider/storage/React/audio format, ngưỡng calibration/scale; harden migration.<br>- Sau audit chéo, khóa thêm thứ tự idempotency trước quota, `prompt_id` chính thức,<br>  hai expiry upload riêng, tutor claim/assignment nguyên tử, Overall từ<br>  `computed_band`, ASR-fidelity cho cả Coherence và calibration bundle/registry bất biến.<br>- Bỏ phương án tạo artifact/job giả cho transcript legacy; giữ dual-read chỉ để hiển<br>  thị. Quy định audio đủ file nhưng uncertainty/OOD không đạt vẫn là<br>  `partial_audio/needs_review`, còn rollback trở về tutor/manual với feedback chữ chỉ<br>  dành cho reviewer/shadow.<br><br>### Kiểm chứng<br><br>- Đối chiếu read-only các migration `013`–`024`, route/service/grader/validator,<br>  Storage upload, tutor feedback và package scripts liên quan.<br>- Các tài liệu mới dùng UTF-8; 27/27 hàng rào Markdown cân bằng và 17/17 liên kết nội<br>  bộ tồn tại. OpenAPI 3.1 có 6 path/operation, 35 schema, 95/95 local `$ref` resolve;<br>  12/12 ví dụ API khớp schema và 720 tổ hợp state/result được kiểm (26 hợp lệ đúng<br>  thiết kế), không cho trạng thái trái hợp đồng lọt qua. Plan cố ý giữ<br>  `BLOCKED FOR IMPLEMENTATION`.<br>- Không chạy migration, provider thật, database thật, test code, commit hoặc push.<br>- Không thay đổi `backend/` hoặc `frontend/` trong lượt lập kế hoạch này; mọi thay đổi<br>  có sẵn ngoài phạm vi được giữ nguyên.<br><br>--- |
| 2026-07-22 | Codex | (Multiple files) | **Triển khai nền tảng AI Fast Grading fail-closed**<br>### Thay đổi<br><br>- Triển khai private signed upload, opaque upload token, submit Speaking bất đồng bộ,<br>  PostgreSQL job queue, worker/heartbeat/watchdog, idempotency, quota dùng chung và<br>  quarantine cleanup; API không còn chờ provider trong request.<br>- Chỉ thêm hai bảng nghiệp vụ `ai_grading_jobs` và `speaking_analysis_artifacts`;<br>  tái sử dụng submission/report/usage/tutor/assignment hiện có và harden migration<br>  runner bằng history, checksum, advisory lock cùng baseline có xác nhận.<br>- Tạo evidence pipeline tách ASR/display transcript, kiểm chất lượng audio, pin<br>  provider/model/config, xác minh calibration bundle và mặc định fail-closed. Khi<br>  chưa đủ speech evidence/calibration, learner nhận `result=null` và bài chuyển tutor,<br>  không sinh Fluency, Pronunciation hoặc Overall giả từ transcript.<br>- Giữ ổn định Writing bằng validator 50/100 từ, sanitizer không sửa ngữ pháp,<br>  idempotency, cache replay, quota và Overall 33%/67%.<br>- Bổ sung atomic tutor claim, assignment-scoped detail/reference/audio/grade, signed<br>  audio ngắn hạn, soft-delete report và lọc row đã xóa trong history/export/stats.<br>- Cập nhật frontend signed upload/polling/retry, learner redaction, tutor claim và<br>  không persist signed URL; đồng bộ OpenAPI, checklist, tasks và `REVIEW_GUIDE.md`.<br>- Hardening lượt cuối: kiểm magic byte và từ chối video stream, allowlist projection<br>  kết quả AI, bind đúng transcription provider/model vào manifest, ngăn auto-submit<br>  lặp vô hạn, chuẩn hóa `meta` thành object, thêm watchdog backoff/jitter và khử dữ<br>  liệu nhạy cảm trong lỗi usage log.<br>- Khóa thêm invariant production cho replay/fingerprint/prompt snapshot, manual retry,<br>  report DB projection và evidence fencing; frontend chỉ khôi phục polling AI hợp lệ<br>  sau refresh, không mở microphone khi MIME chưa được duyệt.<br><br>### Kiểm chứng<br><br>- Backend feature-targeted: ĐẠT — 29 suite, 141/141 test; `008a` được khóa bằng test<br>  để chỉ bootstrap schema `library_resources` legacy giống migration `012`, không gọi<br>  provider thật.<br>- Frontend feature-targeted: ĐẠT — 7 file, 32/32 test; production build ĐẠT<br>  (2.883,70 kB, gzip 813,64 kB; cảnh báo bundle lớn được giữ ở T059).<br>- ESLint mục tiêu backend/frontend: ĐẠT; `node --check`: ĐẠT cho 82 file JavaScript<br>  thay đổi/mới. OpenAPI 3.1 parse/ref/state/header contract: ĐẠT.<br>- Không chạy migration/database production, provider thật, load test hoặc calibration<br>  fairness. Public Speaking band tiếp tục bị khóa bởi RFC, calibration, retention,<br>  disposable-DB và scale/cost gate; các thay đổi có sẵn ngoài feature được giữ nguyên.<br>- T001–T054 đã hoàn tất bằng code/test/tài liệu; T055–T059 được để mở có chủ ý cho<br>  disposable DB, coverage, load/chaos, RFC và refactor/code-splitting frontend legacy.<br><br>--- |
| 2026-07-22 | Codex | (Multiple files) | **Hoàn thiện AI Estimated Speaking và tutor AI prelim**<br>### Thay đổi<br><br>- Chuyển Speaking learner sang kết quả toàn phiên: transcript ASR cung cấp evidence<br>  Coherence/Lexical/Grammar, audio Gemini cung cấp Fluency/Pronunciation; chỉ hoàn tất<br>  khi đủ bốn criterion band và Overall dưới nhãn `AI Estimated Band`.<br>- Loại bỏ đường worker tự handoff tutor. Lỗi provider/evidence giữ `grader=ai`, đi theo<br>  `retry_wait/failed`; nút chấm lại chỉ hiển thị khi backend trả `failed + can_retry`.<br>- Bổ sung AI prelim tạm thời cho bài được học viên chọn tutor; tutor đã claim nhận bản<br>  nháp bốn tiêu chí để chỉnh, chưa lưu thì không tạo report hoặc đổi trạng thái.<br>- Tái sử dụng nguyên schema hiện có, không thêm migration hoặc bảng cho thay đổi này.<br>- Pin model grading/transcription `gemini-3.6-flash`, cấu hình ffmpeg/ffprobe local và<br>  cập nhật `.env.example` an toàn không chứa credential.<br>- Sửa hai lỗi chặn runtime phát hiện khi kiểm tra: hàm Writing bị đặt sai trong class,<br>  route claim thiếu controller, và dòng văn bản thừa cuối `FeedbackReport.jsx`.<br>- Đồng bộ spec/plan/tasks/data-model/quickstart/contract/OpenAPI/checklist/review guide<br>  với semantics mới; `needs_review` chỉ còn cho reader dữ liệu lịch sử.<br><br>### Kiểm chứng<br><br>- Backend mục tiêu: 29 suite, 130/130 test đạt; frontend: 6 file, 32/32 test đạt.<br>- ESLint mục tiêu và `node --check` đạt; frontend production build đạt. Lint toàn repo<br>  còn nợ legacy (backend 27, frontend 344), không thuộc thay đổi feature và không bị che.<br>- Smoke Gemini thật: Speaking ba audio private hoàn tất khoảng 34 giây với đủ bốn<br>  tiêu chí; Writing mẫu vô danh hoàn tất khoảng 11 giây bằng `gemini-3.6-flash`.<br>- API health trả 200; một API process và một worker process đang chạy. Không xóa/sửa<br>  dữ liệu lịch sử, không chạy migration mới và không thêm bảng.<br><br>--- |

## 2026-07-24

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-24 | manh12082005 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (update lại spec cho feature objective, Hoàn thiện spec cho feature objective) |
| 2026-07-24 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: update spec |
| 2026-07-24 | duongworks19 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (fix spec & UI/UX, update plan & tasks) |
| 2026-07-24 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (fix: remove orphaned JSX from landing page, fix: make landing page navbar responsive on mobile by using StudentNavbar) |
| 2026-07-24 | TienThanh82 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (hoan thien, hoan thien spec cho feat content) |
| 2026-07-24 | Codex | (Multiple files) | **Backfill spec Auth/Profile/User/Audit Log**<br>### Thay đổi<br><br>- Đọc đối chiếu spec tổng, plan/tasks cũ và source hiện tại của auth, profile, admin user/session và audit log.<br>- Tạo spec Speckit và checklist chất lượng cho bốn feature con:<br>  `.sdd/specs/feat-auth-and-users/feat-auth/`,<br>  `.sdd/specs/feat-auth-and-users/feat-profile/`,<br>  `.sdd/specs/feat-auth-and-users/feat-user/`,<br>  `.sdd/specs/feat-auth-and-users/feat-audit-log/`.<br>- Giữ spec ở mức nghiệp vụ: user stories, acceptance scenarios, edge cases, requirements, entities, success criteria và assumptions; không thay đổi source code.<br><br>### Kiểm chứng<br><br>- Checklist yêu cầu cho cả bốn feature đã được tick pass, không có placeholder template hoặc marker cần làm rõ trong spec.<br>- `.specify/extensions.yml` không tồn tại nên không có hook specify cần chạy.<br><br>--- |

## 2026-07-27

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-27 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 13 commits (fix: missing catch clause in assistantApi.js, chore: update documentation, fix deploy timeout & add set -e, docs(spec): update specification artifact tasks.md, và 10 thay đổi khác) |
| 2026-07-27 | TienThanh82 | (Multiple files) | **(Team Commit)**: sua uploat tai lieu |
| 2026-07-27 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: Tổng hợp 4 commits (wrong notication about email regex, update spec, update CONTEXT.mdmd, và 1 thay đổi khác) |
| 2026-07-27 | manh12082005 | (Multiple files) | **(Team Commit)**: Update spec cho feat-object |
| 2026-07-27 | Codex | (Multiple files) | **Khắc phục Tutor upload tài liệu (feat-content-builder)**<br>### Thay đổi<br><br>- Xác định nguyên nhân chính: POST upload và Supabase/DB đã thành công, nhưng UI<br>  chuyển về catalog public chỉ lọc `approved`, khiến tài liệu `pending` biến mất.<br>- Thêm `GET /api/v1/library/mine` và `/mine/:id` có phân quyền để Tutor theo dõi,<br>  chỉnh sửa tài liệu của mình ở mọi trạng thái duyệt; catalog public vẫn chỉ `approved`.<br>- Thêm progress upload, thông báo “đang chờ duyệt”, bỏ header multipart thủ công để<br>  trình duyệt tự tạo boundary; đồng bộ hook edit từ PATCH sang PUT.<br>- Sửa validation controller phải dừng trước service, map lỗi Multer quá 200MB thành<br>  HTTP 413, dùng MIME phát hiện từ magic bytes khi ghi Storage, và dọn object mới<br>  nếu ghi metadata DB thất bại.<br>- Bổ sung `deleted_at`/soft-delete cho metadata; thêm `storage_cleanup_pending` để<br>  thao tác xóa file Cloud có thể retry an toàn khi Supabase tạm lỗi.<br>- Thay các `require('uuid')` ESM không tương thích Jest bằng `crypto.randomUUID()` để<br>  test route có thể khởi động.<br><br>### Kiểm chứng<br><br>- Backend unit/contract/integration library: 35/35 đạt với<br>  `node --experimental-vm-modules`; service/query đạt 100% line/function và<br>  87,37% branch coverage.<br>- Backend public library integration: 4/4 đạt.<br>- Frontend library service/hook: 6/6 đạt; ESLint các file thay đổi đạt.<br>- Migration `028_harden_library_uploads.sql` đã áp dụng vào database development. |


## 2026-08-01

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-08-01 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 12 commits (docs(sdd): update agents changelog with concise summary of recent spec changes, spec(writing-grading): add development checklist, spec(writing-grading): add tasks list, và 9 thay đổi khác) |
| 2026-08-01 | Antigravity | \.sdd/specs/ai-fast-grading/*\ | **Quy ho?ch l?i ti li?u AI Fast Grading:** Xa cc file spec cu v tch thnh 2 tnh nang d?c l?p \eat-speaking-ai-grading\ v \eat-writing-ai-grading\ (bao g?m spec, plan, tasks, checklist, v OpenAPI contract). Ton b? thay d?i 10 commit d du?c gom g?n l?i thnh m?t dng ny d? trnh lm file changelog qu di. |

## 2026-06-15

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-15 | manh12082005 | (Multiple files) | **(Team Commit)**: Hoan thanh chuc nang upload file |
| 2026-06-15 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 3 commits (fix profile with css3 but do not complete dashboard, study plan pages for user profile, add practice history pages in profile user) |

## 2026-06-16

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-16 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (add profile, userprofile pages for students) |
| 2026-06-16 | BABEO1610 | (Multiple files) | **(Team Commit)**: frontend tutor library |

## 2026-06-17

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-17 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 9 commits (fix profile and bank of document and mooc history grading, fix router of tutor, fix: restore missing library routes after merge, và 6 thay đổi khác) |
| 2026-06-17 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: implement admin contact submission features |

## 2026-06-18

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-18 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (pull picture form tutor and admin, The flow of assignments received by students and guests when tutors upload them and administrators approve them.) |
| 2026-06-18 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: update upload exa m tutor |
| 2026-06-18 | manh12082005 | (Multiple files) | **(Team Commit)**: Implement admin change log backend and pagination |

## 2026-06-20

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-20 | manh12082005 | (Multiple files) | **(Team Commit)**: Hoan thien phan speaking cho student |

## 2026-06-22

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-22 | TienThanh82 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (implement content library, su lí reading của student) |
| 2026-06-22 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 7 commits (Add assistant API module and env example, Document global IELTS virtual assistant feature, Add unit tests for AI assistant API, và 4 thay đổi khác) |
| 2026-06-22 | manh12082005 | (Multiple files) | **(Team Commit)**: Xử lí phần Speaking student |
| 2026-06-22 | BABEO1610 | (Multiple files) | **(Team Commit)**: Listening feature |
| 2026-06-22 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (fix submission, writing mock test & submission) |

## 2026-06-23

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-23 | manh12082005 | (Multiple files) | **(Team Commit)**: Xử lí dở phần hàng chờ chấm teacher |

## 2026-06-24

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-24 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: process tracking and website feedback update |
| 2026-06-24 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 17 commits (fix: show all skill tests and improve assistant lookup, fix: normalize assistant suggested links, fix: fetch only published speaking tests, và 14 thay đổi khác) |
| 2026-06-24 | manh12082005 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (chỉnh sửa phần admin duyệt đề cho reading và speaking, Hoàn thiện phần up nhanh đề cho reading và listening) |

## 2026-06-25

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-25 | BABEO1610 | (Multiple files) | **(Team Commit)**: Practice History of Student and Study plan |
| 2026-06-25 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 4 commits (test: cover assistant grounding behavior, feat: send assistant page context from client, feat: ground assistant runtime in IELTS data, và 1 thay đổi khác) |
| 2026-06-25 | manh12082005 | (Multiple files) | **(Team Commit)**: Hoàn thiện up đề nhanh cho reading |
| 2026-06-25 | TienThanh82 | (Multiple files) | **(Team Commit)**: implement writing tutor assignment backend |

## 2026-06-26

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-26 | TienThanh82 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (hoan thien nhat ki hoat dong cho tutor, Hoan thien Nhat ki hoat dong) |
| 2026-06-26 | manh12082005 | (Multiple files) | **(Team Commit)**: Tổng hợp 6 commits (Hoàn thiện phần nhận điểm student, feat: restore StudyPlanPage.jsx (can thiet cho route /study-plan), fix sửa import sai, và 3 thay đổi khác) |
| 2026-06-26 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: study plan |
| 2026-06-26 | BABEO1610 | (Multiple files) | **(Team Commit)**: fix StudyPlan |
| 2026-06-26 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: admin grading oversight implement |

## 2026-06-27

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-27 | manh12082005 | (Multiple files) | **(Team Commit)**: Tổng hợp 9 commits (Hoàn thiện phần nhật kí hoạt động, Cập nhật tạo sửa xóa đề cho nhật kí hoạt độngđộng, fix nỗi nội dung nhật kí hoạt động, và 6 thay đổi khác) |

## 2026-06-29

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-29 | BABEO1610 | (Multiple files) | **(Team Commit)**: stp |
| 2026-06-29 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: knowleages of IELTS |
| 2026-06-29 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: fix landing page |

## 2026-07-01

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-01 | manh12082005 | (Multiple files) | **(Team Commit)**: Update sample cho up đề nhanh |

## 2026-07-02

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-02 | manh12082005 | (Multiple files) | **(Team Commit)**: fix lỗi duyệt bài admin |
| 2026-07-02 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 53 commits (docs(rfc): document AI writing grading flow, feat(frontend): support AI writing history actions, feat(frontend): render AI feedback reports, và 50 thay đổi khác) |
| 2026-07-02 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: . |

## 2026-07-05

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-05 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 49 commits (fix(writing): keep AI reference separate from tutor form, fix(writing): show clearer AI feedback failure, fix(writing): round student history bands, và 46 thay đổi khác) |

## 2026-07-06

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-06 | BABEO1610 | (Multiple files) | **(Team Commit)**: Tổng hợp 9 commits (add nav bar student profile, fix frontend writing test page, update frontend speaking page, và 6 thay đổi khác) |
| 2026-07-06 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 21 commits (feat(ReportsPage): fetch real reports from /admin/reports API with date range filter and CSV export, feat(AdminAiUsagePage): connect to real /admin/ai-usage API, add date filter and usage breakdown table, feat(AdminOverviewPage): wire to real overview API data and update metric cards rendering, và 18 thay đổi khác) |

## 2026-07-07

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-07 | BABEO1610 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (add pagination, fix image task 1) |

## 2026-07-09

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-09 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 49 commits (chore: remove git_diff.txt, chore: remove git_diff.txt, chore: update git_diff.txt, và 46 thay đổi khác) |

## 2026-07-13

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-13 | manh12082005 | (Multiple files) | **(Team Commit)**: Fix lỗi ko hiện bài làm ở hàng chờ chấm |

## 2026-07-14

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-14 | BABEO1610 | (Multiple files) | **(Team Commit)**: Tổng hợp 2 commits (dark theme, update landing page) |

## 2026-07-23

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-23 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 8 commits (fix(frontend): prevent horizontal scroll overflow on mobile, fix: allow supabase storage in production for speaking grading, fix: remove trailing slash in nginx proxy_pass to prevent 404 routing issues, và 5 thay đổi khác) |
| 2026-07-23 | BABEO1610 | (Multiple files) | **(Team Commit)**: fix tutor grading |
| 2026-07-23 | huongduongworks@gmail.com | (Multiple files) | **(Team Commit)**: update target date & target band score |

## 2026-07-28

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-07-28 | Dat Lai Lap Trinh | (Multiple files) | **(Team Commit)**: Tổng hợp 4 commits (fix: retry speaking analysis with fresh evidence, chore: apply recent fixes, fix: fallback to PATH ffmpeg if configured path fails, và 1 thay đổi khác) |
| 2026-07-28 | TienThanh82 | (Multiple files) | **(Team Commit)**: sua feat content |
| 2026-07-28 | manh12082005 | (Multiple files) | **(Team Commit)**: Update spec |

## 2026-08-01 (Codex — AI Speaking runtime hardening)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-08-01 | Codex | Backend, frontend, Docker/Compose, workflow, Speaking SDD và `docs/speaking-ai-vps-deployment.md` | **AI Speaking only:** thêm process `speaking-worker` dùng chung backend image, cài `ffmpeg`/`ffprobe`, deploy fail-fast qua preflight/migrate/runtime-check, bảo toàn retry metadata/Retry-After, validate MIME/codec/checksum/normalized WAV, khóa full-audio 3 Part và public transcript mapping, sửa signed-audio error/reload, retry polling canonical child, không handoff tutor, cập nhật quota production 15 trong env/spec và thêm VPS runbook. Giữ nguyên migration 030; không thêm migration. Xóa `backend/scratch_jobs.js` vì chứa credential hard-code từ trước. |

