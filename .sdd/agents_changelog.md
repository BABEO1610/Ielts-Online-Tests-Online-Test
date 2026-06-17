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
| 2026-05-30 | Antigravity | ackend/src/db/queries/users.queries.js | **T006:** Implement c�c User Query Functions ph?c v? auth (createUser, getUserByEmail, getUserById, updateUserStatus, updateUserRole v?i optimistic locking, updatePassword, incrementFailedLogin, resetFailedLogin). Vi?t Unit Test 	ests/db/queries/users.queries.test.js mock pg pool. 18/18 tests PASS. |

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

## 2026-06-09 (Student Dashboard & Sidebar)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-09 | Antigravity | `frontend/src/layouts/StudentLayout.jsx` | **Student Sidebar Layout:** Tạo layout mới với sidebar theo thiết kế mới chứa các mục (Dashboard, Prep Services, Live Lessons, History, Wallet, Profile, Referral), topbar, và footer. |
| 2026-06-09 | Antigravity | `frontend/src/pages/Dashboard.jsx` | **My Dashboard:** Xây dựng trang tổng quan điểm số 4 kỹ năng bằng `recharts` với giao diện hiển thị Target Score, Average Score, Accuracy, v.v... |
| 2026-06-09 | Antigravity | `frontend/src/pages/UserProfilePage.jsx` | **Refactor Profile:** Chỉnh sửa giao diện và cấu trúc để tích hợp vào `StudentLayout`, bỏ `StudentNavbar` lồng bên trong. |
| 2026-06-09 | Antigravity | `frontend/src/App.jsx` | **Routing:** Gắn `StudentLayout` cho các page của Student. |

## 2026-06-15 (Fix giao diện Profile học viên)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-15 | Antigravity | `frontend/index.html` | **Fix icon Profile (DESIGN.md):** Trang `/profile` và `StudentLayout` dùng rất nhiều Bootstrap Icons (`bi bi-*`) nhưng `index.html` chỉ nạp Bootstrap CSS/JS, THIẾU font Bootstrap Icons → toàn bộ icon hiển thị trống/lỗi. Thêm `<link>` CDN `bootstrap-icons@1.11.3` để icon render đúng. Không đổi logic, chỉ bổ sung stylesheet. |

## 2026-06-15

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-15 | Antigravity | `frontend/src/layouts/TutorLayout.jsx` | **UI Cleanup:** Xóa 2 mục sidebar của Tutor: "Phản hồi" (`/grading/tutor/feedback`) và "Thêm giải thích đáp án" (`/tutor/explain`) theo yêu cầu của team. |
| 2026-06-15 | Antigravity | `frontend/src/pages/grading/TutorGradingHistoryPage.jsx` | **[NEW] Trang Lịch sử chấm bài:** Xây dựng đầy đủ theo DESIGN.md (Uber-inspired, black/white, pill radius 999px). Bao gồm: (1) 3 StatCards tổng quan (tổng bài chấm, band trung bình - dark variant, số khiếu nại); (2) Bảng 7 cột với avatar học sinh, kỹ năng pill, band score, feedback tags, status pill màu; (3) Bộ lọc: search, thời gian, kỹ năng, band điểm — đều là FilterDropdown pill tự build; (4) Phân trang client-side; (5) Modal xem chi tiết; (6) Modal xác nhận thu hồi kết quả; (7) Icon action buttons (xem/sửa/thu hồi). Dữ liệu mock — cần nối API khi backend sẵn sàng. |
| 2026-06-15 | Antigravity | `frontend/src/App.jsx` | **Routing:** Thêm import + route `/grading/tutor/schedule` → `TutorGradingHistoryPage` dưới `TutorLayout` (ProtectedRoute role="tutor"). |

## 2026-06-15 (refactor — Constitution compliance)

| Date | Agent | File Changed | Summary |
|------|-------|-------------|---------|
| 2026-06-15 | Antigravity | `frontend/src/pages/grading/TutorGradingHistoryPage.jsx` | **[FIX] Bước 1:** Xóa unused `Link` import; sửa `TIME_RANGES` duplicate ('7 ngày qua' × 2 → '7 ngày qua' + '30 ngày qua'); thay `console.log` vi phạm Constitution ARTICLE 2 bằng TODO comment + proper handler. |
| 2026-06-15 | Antigravity | `frontend/src/components/common/FilterDropdown.jsx` | **[NEW] Bước 2 — Tách file:** Extract `FilterDropdown` thành component tái sử dụng riêng. Hỗ trợ string[] và object[] options. 83 dòng. |
| 2026-06-15 | Antigravity | `frontend/src/components/grading/GradingDetailModal.jsx` | **[NEW] Bước 2:** Extract modal xem chi tiết bài chấm. Props-driven (statusMap, skillMap). 152 dòng. |
| 2026-06-15 | Antigravity | `frontend/src/components/grading/GradingRevokeModal.jsx` | **[NEW] Bước 2:** Extract modal thu hồi kết quả — cải tiến UX: thêm warning icon ⚠️, center layout, highlight text cảnh báo đỏ. 82 dòng. |
| 2026-06-15 | Antigravity | `frontend/src/components/grading/GradingHistoryTable.jsx` | **[NEW] Bước 2:** Extract bảng + rows + IconBtn thành component riêng. Props: rows, statusMap, skillMap, onView, onRevoke. 193 dòng. |
| 2026-06-15 | Antigravity | `frontend/src/pages/grading/TutorGradingHistoryPage.jsx` | **Bước 2 — Rewrite:** Giảm từ 768 dòng → 170 dòng (tuân thủ Constitution ARTICLE 2 max 300). Chỉ còn StatCard, Pagination inline + orchestrate các component đã tách. |
| 2026-06-15 | Antigravity | `frontend/src/services/gradingHistory.service.js` | **[NEW] Bước 3 — Service layer:** Mock data dời ra service; export `getGradingHistory`, `getGradingHistoryById`, `revokeGradingResult`, `updateGradingScore` — tất cả đều có TODO comment hướng dẫn nối API backend. Response format tuân thủ `{ success, data, error, meta }` (Constitution ARTICLE 2). |
