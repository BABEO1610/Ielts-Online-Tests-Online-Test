# 📋 Phân tích luồng chưa hoàn thiện — IELTSZone

> Kiểm tra ngày: 2026-06-19 | Branch: `feat-profile/Datnt`

## Quy ước trạng thái

| Ký hiệu | Ý nghĩa |
|----------|---------|
| ✅ | Frontend + Backend đều hoạt động, kết nối API thật |
| ⚠️ | Frontend có UI nhưng **dùng mock data**, backend chưa có API tương ứng |
| 🔴 | Chưa có cả frontend lẫn backend (hoặc chỉ có file placeholder) |

---

## 1. Authentication & User Management

| Luồng | Trạng thái | Chi tiết |
|-------|-----------|----------|
| Đăng nhập (Email + Google OAuth) | ✅ | Backend `auth.routes.js` + Frontend `Login.jsx` — hoạt động |
| Đăng ký | ✅ | Backend + Frontend `RegisterPage.jsx` — hoạt động |
| Xác thực Email | ✅ | Backend + Frontend `VerifyEmailPage.jsx` — hoạt động |
| Quên mật khẩu | ✅ | Backend endpoint có, Frontend `ForgotPwdForm` có |
| Đặt lại mật khẩu | ✅ | Backend endpoint có, Frontend `ResetPwdForm` có |
| Onboarding (sau đăng ký) | ✅ | Frontend `OnboardingForm` có |
| User Profile (GET/PUT /users/me) | ✅ | Backend `users.routes.js` + Frontend `UserProfilePage.jsx` — hoạt động |

---

## 2. Student — Objective Testing (Reading / Listening)

| Luồng | Trạng thái | Chi tiết |
|-------|-----------|----------|
| Danh sách đề thi (`/tests`) | ⚠️ | Frontend `TestListPage.jsx` dùng `MOCK_TESTS` — chưa gọi API |
| Chi tiết đề thi (`/tests/:id`) | ⚠️ | Frontend `TestDetailPage.jsx` dùng `MOCK_TEST` — chưa gọi API |
| Trang Reading (`/reading`) | ⚠️ | Frontend `ReadingPage.jsx` dùng mock data nội bộ |
| Trang Listening (`/listening`) | ⚠️ | Frontend `ListeningPage.jsx` dùng mock data nội bộ |
| Làm bài Reading (`/tests/:id/reading`) | ⚠️ | Frontend `ReadingTestPage.jsx` dùng mock data |
| Làm bài Listening (`/tests/:id/listening`) | ⚠️ | Frontend `ListeningTestPage.jsx` dùng mock data |
| Kết quả bài thi (`/results/:attemptId`) | ⚠️ | Frontend `TestResultPage.jsx` dùng `MOCK_RESULT` |
| Chi tiết kết quả (`/results/:attemptId/detail`) | ⚠️ | Frontend `TestResultDetailPage.jsx` dùng `MOCK_ANSWERS` |
| Lịch sử làm bài (`/tests/history`) | ⚠️ | Frontend `TestHistoryPage.jsx` dùng `MOCK_HISTORY` |

> **Tổng kết:** Backend có CRUD đề thi cơ bản (`tests.js`), nhưng **thiếu hoàn toàn** luồng: nộp bài (submit attempt), chấm điểm tự động, lưu kết quả, lịch sử làm bài. Frontend toàn bộ dùng mock data.

---

## 3. Student — Subjective Testing (Writing / Speaking)

| Luồng | Trạng thái | Chi tiết |
|-------|-----------|----------|
| Danh sách đề Writing (`/writing`) | ⚠️ | Frontend `WritingPage.jsx` dùng `MOCK_EXAMS` |
| Làm bài Writing (`/tests/:id/writing`) | ⚠️ | Frontend `WritingTestPage.jsx` dùng `MOCK_EXAMS` |
| Danh sách đề Speaking (`/speaking`) | ⚠️ | Frontend `SpeakingPage.jsx` dùng `MOCK_EXAMS` |
| Làm bài Speaking (`/tests/:id/speaking`) | ⚠️ | Frontend `SpeakingTestPage.jsx` dùng `MOCK_EXAMS` |
| Nộp bài Writing (API submit) | 🔴 | Frontend service `grading.service.js` gọi `/submissions/writing` — **backend CHƯA có route** |
| Nộp bài Speaking + upload audio | 🔴 | Frontend service gọi `/submissions/speaking` — **backend CHƯA có route** |
| Xem lịch sử nộp bài (`/history`) | ⚠️ | Frontend `StudentHistoryPage.jsx` — service dùng mock data (`getSubmissionHistory` trả Promise.setTimeout) |

---

## 4. Tutor — Chấm bài & Quản lý

| Luồng | Trạng thái | Chi tiết |
|-------|-----------|----------|
| Dashboard Tutor (`/tutor/dashboard`) | ⚠️ | Frontend `TutorDashboard.jsx` dùng `MOCK_STATS`, `MOCK_QUEUE`, `MOCK_RECENT_TESTS` |
| Profile Tutor | ✅ | Dùng chung `/users/me` — hoạt động |
| Activity Log Tutor | ⚠️ | Frontend `TutorActivityLogPage.jsx` dùng `MOCK_LOGS` — backend chưa có endpoint riêng |
| Hàng đợi chấm bài (`/grading/tutor/queue`) | ⚠️ | Frontend `TutorQueuePage.jsx` gọi `getTutorQueue()` → `/tutors/queue` — **backend CHƯA có route** |
| Chấm bài (`/grading/tutor/grade/:type/:submissionId`) | ⚠️ | Frontend `TutorGradingPage.jsx` gọi `gradeSubmission()` — **backend CHƯA có route** |
| Lịch sử chấm bài (`/grading/tutor/schedule`) | ⚠️ | Frontend `TutorGradingHistoryPage.jsx` — service `gradingHistory.service.js` dùng `MOCK_HISTORY` |
| CRUD Library (Tutor upload tài liệu) | ✅ | Backend `library.routes.js` + Frontend `TutorLibraryPage.jsx` — hoạt động |
| CRUD Đề thi (Tutor tạo đề) | ✅ | Backend `tests.js` (CRUD) + Frontend `TutorTestManagePage.jsx` — kết nối API |
| Form tạo đề Reading/Listening/Writing/Speaking | ⚠️ | Frontend form pages có đầy đủ UI, nhưng việc **submit form → save vào DB** cần kiểm tra kỹ vì backend chỉ có CRUD cơ bản, chưa rõ schema lưu passages/questions |

---

## 5. Admin Panel

| Luồng | Trạng thái | Chi tiết |
|-------|-----------|----------|
| Overview/Dashboard | ⚠️ | Frontend `AdminOverviewPage.jsx` gọi `fetchOverview()` → `/admin/metrics/overview` — **backend CHƯA có route**, fallback sample data |
| Quản lý Users (CRUD role/status) | ✅ | Backend `admin.routes.js` có GET/PUT — hoạt động |
| Quản lý Sessions (xem/revoke) | ✅ | Backend `admin.routes.js` có GET/DELETE — hoạt động |
| Contact Inbox | ✅ | Backend `admin.routes.js` có GET/PUT — hoạt động |
| Content Review (duyệt đề thi + tài liệu) | ✅ | Backend `adminContent.controller.js` — hoạt động |
| Change Log (nhật ký thay đổi + Undo) | ✅ | Backend `admin.routes.js` có CRUD — hoạt động |
| Activity Log | ⚠️ | Frontend `AdminActivityLogPage.jsx` gọi `fetchActivityLogs()` → `/admin/audit-logs` — **backend chưa có route này** (có `/admin/change-logs` nhưng khác), fallback sample data |
| AI Usage | ⚠️ | Frontend `AdminAiUsagePage.jsx` gọi `fetchAiUsage()` → `/admin/metrics/ai-usage` — **backend CHƯA có route**, fallback sample data |
| Reports | ⚠️ | Frontend `ReportsPage.jsx` gọi `fetchReport()` → `/admin/reports/usage` — **backend CHƯA có route**, fallback sample data |
| Tutor Assignment | ⚠️ | Frontend `TutorAssignmentPage.jsx` gọi `/admin/tutor-assignments` — **backend CHƯA có route**, fallback sample data |
| Grading Oversight | ⚠️ | Frontend `GradingOversightPage.jsx` gọi `fetchSubmissions()` → `/admin/submissions` — **backend CHƯA có route**, fallback sample data |

---

## 6. Student Dashboard

| Luồng | Trạng thái | Chi tiết |
|-------|-----------|----------|
| Dashboard Student (stats, chart, skills) | ⚠️ | Frontend `Dashboard.jsx` gọi `getDashboardStats()` — service trả **Promise.setTimeout mock** (comment ghi rõ "PLACEHOLDER DATA — no backend endpoint exists yet") |

---

## 7. Các thành phần Backend thiếu (chưa có Route/Controller/Service)

| Module cần tạo | Mô tả |
|----------------|-------|
| **Submissions routes** | `/api/v1/submissions/writing`, `/api/v1/submissions/speaking`, `/api/v1/submissions/speaking/upload` |
| **Tutors grading routes** | `/api/v1/tutors/queue`, `/api/v1/tutors/submissions/:id/claim`, `/api/v1/tutors/submissions/:id/grade`, `/api/v1/tutors/submissions/:id/prelim-check` |
| **Admin metrics routes** | `/api/v1/admin/metrics/overview`, `/api/v1/admin/metrics/ai-usage` |
| **Admin reports route** | `/api/v1/admin/reports/usage` |
| **Admin tutor-assignments routes** | `/api/v1/admin/tutor-assignments` (GET/PUT) |
| **Admin submissions route** | `/api/v1/admin/submissions` (grading oversight) |
| **Admin audit-logs route** | `/api/v1/admin/audit-logs` (khác với change-logs hiện tại) |
| **Student dashboard stats** | `/api/v1/students/me/dashboard-stats` |
| **Tutor dashboard stats** | `/api/v1/tutors/me/dashboard-stats` |
| **Attempt/Result routes** | `/api/v1/tests/:id/attempt`, `/api/v1/attempts/:id/submit`, `/api/v1/results/:attemptId` |

---

## 8. DB Migrations thiếu

Hiện có 14 migration files. Cần thêm:

| Migration | Mô tả |
|-----------|-------|
| `writing_submissions` | Bảng lưu bài nộp Writing |
| `speaking_submissions` | Bảng lưu bài nộp Speaking + audio URL |
| `ai_feedback_reports` | Bảng lưu kết quả chấm AI |
| `tutor_grades` | Bảng lưu kết quả chấm Tutor |
| `test_attempts` | Bảng lưu lượt làm bài Objective test |
| `test_answers` | Bảng lưu câu trả lời từng question |
| `tutor_assignments` | Bảng phân công tutor-student |
| `platform_metrics_snapshots` | Bảng snapshot metrics cho Admin dashboard |
| `chatbot_messages` / `ai_explain_requests` | Bảng lưu AI usage |

---

## 📊 Tóm tắt phân việc gợi ý

| Thành viên | Luồng nên phụ trách | Ưu tiên |
|-----------|---------------------|---------|
| **Người 1** | **Objective Testing E2E**: Kết nối TestList/TestDetail/ReadingTest/ListeningTest với API thật, tạo luồng attempt → submit → result | 🔥 Cao |
| **Người 2** | **Subjective Testing + Grading**: Tạo backend routes submissions (writing/speaking), chấm AI/Tutor, tutor queue/grade | 🔥 Cao |
| **Người 3** | **Admin Panel Backend**: Tạo routes metrics, reports, ai-usage, tutor-assignment, audit-logs, grading-oversight | ⚡ Trung bình |
| **Người 4** | **Dashboard + History**: Student dashboard stats API, Tutor dashboard stats API, lịch sử nộp bài/chấm bài | ⚡ Trung bình |
| **Người 5** | **DB Migrations + Integration**: Tạo schema mới (submissions, attempts, tutor_grades…), integration test | ⚡ Trung bình |

> [!IMPORTANT]
> Tất cả frontend đã có UI sẵn, vấn đề chính là **backend thiếu API routes + DB schema** cho các luồng testing/grading/admin metrics. Khi backend sẵn sàng, frontend chỉ cần thay mock data bằng API call thật.
