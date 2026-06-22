import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';

// ── Auth Guard ─────────────────────────────────────────────────────────────────
import ProtectedRoute from './components/auth/ProtectedRoute';

// ── Public Pages ───────────────────────────────────────────────────────────────
import LandingPage from './pages/public/LandingPage';

// ── Auth Pages ─────────────────────────────────────────────────────────────────
import Login from './pages/auth/Login';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPwdPage from './pages/auth/ForgotPwdPage';
import ResetPwdPage from './pages/auth/ResetPwdPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// ── Student Pages ──────────────────────────────────────────────────────────────
import ContentLibraryPage from './pages/student/ContentLibraryPage';

// ── Core Protected Pages ───────────────────────────────────────────────────────
import UserProfilePage from './pages/student/UserProfilePage';
import TutorDashboard from './pages/tutor/TutorDashboard';
import TutorProfilePage from './pages/tutor/TutorProfilePage';
import TutorLayout from './layouts/TutorLayout';
import TutorActivityLogPage from './pages/tutor/TutorActivityLogPage';
import TutorLibraryPage from './pages/tutor/TutorLibraryPage';
import TutorLibraryCreatePage from './pages/tutor/TutorLibraryCreatePage';
import TutorLibraryEditPage from './pages/tutor/TutorLibraryEditPage';
import ProfileLayout from './layouts/ProfileLayout';

// ── Admin Section — Layout + nested pages ──────────────────────────────────────
import AdminLayout from './layouts/AdminLayout';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminActivityLogPage from './pages/admin/AdminActivityLogPage';
import AdminAiUsagePage from './pages/admin/AdminAiUsagePage';
import ContentReviewPage from './pages/admin/ContentReviewPage';
import GradingOversightPage from './pages/admin/GradingOversightPage';
import SessionsPage from './pages/admin/SessionsPage';
import ContactInboxPage from './pages/admin/ContactInboxPage';
import ReportsPage from './pages/admin/ReportsPage';
import TutorAssignmentPage from './pages/admin/TutorAssignmentPage';
import AdminChangeLogPage from './pages/admin/AdminChangeLogPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';

// ── Student Skill Pages — Subjective (Navbar: Writing / Speaking) ──────────────
import WritingPage from './pages/subjective-testing/WritingPage';
import SpeakingPage from './pages/subjective-testing/SpeakingPage';
import WritingTestPage from './pages/subjective-testing/WritingTestPage';
import SpeakingTestPage from './pages/subjective-testing/SpeakingTestPage';

// ── Student History (Profile Dropdown → /history) ─────────────────────────────
import StudentHistoryPage from './pages/grading/StudentHistoryPage';

// ── Tutor Workspace — Subjective Grading ──────────────────────────────────────
import TutorQueuePage from './pages/grading/TutorQueuePage';
import TutorGradingPage from './pages/grading/TutorGradingPage';
import TutorGradingHistoryPage from './pages/grading/TutorGradingHistoryPage';
import TutorTestManagePage from './pages/tutor/TutorTestManagePage';
import TutorTestFormPage from './pages/tutor/TutorTestFormPage';
import TutorReadingFormPage from './pages/tutor/TutorReadingFormPage';
import TutorListeningFormPage from './pages/tutor/TutorListeningFormPage';
import TutorWritingFormPage from './pages/tutor/TutorWritingFormPage';
import TutorSpeakingFormPage from './pages/tutor/TutorSpeakingFormPage';
import TutorQuestionFormPage from './pages/tutor/TutorQuestionFormPage';

// ── Objective Testing — Student Views ─────────────────────────────────────────
import TestListPage from './pages/objective-testing/TestListPage';
import TestDetailPage from './pages/objective-testing/TestDetailPage';
import TestHistoryPage from './pages/objective-testing/TestHistoryPage';
import ReadingPage from './pages/objective-testing/ReadingPage';
import ListeningPage from './pages/objective-testing/ListeningPage';
import ReadingTestPage from './pages/objective-testing/ReadingTestPage';
import ListeningTestPage from './pages/objective-testing/ListeningTestPage';
import TestResultPage from './pages/objective-testing/TestResultPage';
import TestResultDetailPage from './pages/objective-testing/TestResultDetailPage';

// ── Objective Testing — Tutor / Admin Views ────────────────────────────────────

import AuditLogPage from './pages/objective-testing/AuditLogPage';
import GlobalAssistantButton from './features/global-assistant/components/GlobalAssistantButton';

import './App.css';

// ── 404 Page — "Về trang chủ" trỏ về /dashboard (không phải Landing Page) ─────
const NotFoundPage = () => (
  <div style={{ textAlign: 'center', padding: '6rem 2rem', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
    <h1 style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '72px', fontWeight: 700, color: '#000', lineHeight: 1 }}>
      404
    </h1>
    <p style={{ fontSize: '20px', color: '#5e5e5e', marginTop: '16px', marginBottom: '32px' }}>
      Trang bạn tìm kiếm không tồn tại.
    </p>
    <Link
      to="/"
      style={{
        display: 'inline-block',
        backgroundColor: '#000',
        color: '#fff',
        padding: '14px 28px',
        borderRadius: '999px',
        fontWeight: 500,
        textDecoration: 'none',
        fontSize: '16px'
      }}
    >
      Về trang chủ
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public Routes ─────────────────────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPwdPage />} />
        <Route path="/reset-password" element={<ResetPwdPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        {/* EARS[Event]: WHEN user navigates to /library THEN route to ContentLibraryPage */}
        <Route path="/library" element={<ContentLibraryPage />} />

        {/* ── Protected Core (Student) ────────────────────────────────────────── */}


        <Route element={<ProfileLayout />}>
          <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="/practice-history" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="/study-plan" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        </Route>

        {/* ── Tutor Section ── */}
        <Route path="/tutor" element={<Navigate to="/tutor/dashboard" replace />} />
        <Route element={<TutorLayout />}>
          <Route path="/tutor/dashboard" element={
            <ProtectedRoute role="tutor"><TutorDashboard /></ProtectedRoute>
          } />
          <Route path="/tutor/profile" element={
            <ProtectedRoute role="tutor"><TutorProfilePage /></ProtectedRoute>
          } />
          <Route path="/tutor/activity-log" element={
            <ProtectedRoute role="tutor"><TutorActivityLogPage /></ProtectedRoute>
          } />
          <Route path="/tutor/library" element={
            <ProtectedRoute role="tutor"><TutorLibraryPage /></ProtectedRoute>
          } />
          <Route path="/tutor/library/create" element={
            <ProtectedRoute role="tutor"><TutorLibraryCreatePage /></ProtectedRoute>
          } />
          <Route path="/tutor/library/edit/:id" element={
            <ProtectedRoute role="tutor"><TutorLibraryEditPage /></ProtectedRoute>
          } />
          <Route path="/grading/tutor/queue" element={
            <ProtectedRoute role="tutor"><TutorQueuePage /></ProtectedRoute>
          } />
          <Route path="/grading/tutor/schedule" element={
            <ProtectedRoute role="tutor"><TutorGradingHistoryPage /></ProtectedRoute>
          } />
          {/* ── Objective Testing — Tutor: Test Management ────────────────────── */}
          <Route path="/tutor/tests" element={
            <ProtectedRoute role="tutor"><TutorTestManagePage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/new" element={
            <ProtectedRoute role="tutor"><TutorTestFormPage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/new/reading" element={
            <ProtectedRoute role="tutor"><TutorReadingFormPage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/new/listening" element={
            <ProtectedRoute role="tutor"><TutorListeningFormPage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/new/writing" element={
            <ProtectedRoute role="tutor"><TutorWritingFormPage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/new/speaking" element={
            <ProtectedRoute role="tutor"><TutorSpeakingFormPage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/:id/edit" element={
            <ProtectedRoute role="tutor"><TutorTestFormPage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/:id/questions/new" element={
            <ProtectedRoute role="tutor"><TutorQuestionFormPage /></ProtectedRoute>
          } />
          <Route path="/tutor/tests/:id/questions/:qId/edit" element={
            <ProtectedRoute role="tutor"><TutorQuestionFormPage /></ProtectedRoute>
          } />
        </Route>
        {/* ── Admin Section — nested under AdminLayout (sidebar + topbar + footer) ── */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="tutor-assignment" element={<TutorAssignmentPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="content-review" element={<ContentReviewPage />} />
          <Route path="grading" element={<GradingOversightPage />} />
          <Route path="change-log" element={<AdminChangeLogPage />} />
          <Route path="contacts" element={<ContactInboxPage />} />
          <Route path="activity" element={<AdminActivityLogPage />} />
          <Route path="ai-usage" element={<AdminAiUsagePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>

        {/* ── Subjective — Student Skill Pages (Navbar: Writing / Speaking) ─── */}
        <Route path="/writing" element={<WritingPage />} />
        <Route path="/speaking" element={<SpeakingPage />} />

        {/* ── Subjective — Student Live Test (Route-Driven) ────────────────────── */}
        <Route path="/tests/:id/writing" element={
          <ProtectedRoute><WritingTestPage /></ProtectedRoute>
        } />
        <Route path="/tests/:id/speaking" element={
          <ProtectedRoute><SpeakingTestPage /></ProtectedRoute>
        } />

        {/* ── Subjective — Student History (Profile Dropdown) ───────────────── */}
        <Route path="/history" element={
          <ProtectedRoute><StudentHistoryPage /></ProtectedRoute>
        } />

        {/* ── Subjective — Tutor Workspace (role guard) ─────────────────────── */}
        {/* /grading/tutor/queue đã được chuyển vào TutorLayout */}
        <Route path="/grading/tutor/grade/:type/:submissionId" element={
          <ProtectedRoute role="tutor"><TutorGradingPage /></ProtectedRoute>
        } />

        {/* ── Objective Testing — Student: Browsing ─────────────────────────── */}
        <Route path="/tests" element={<TestListPage />} />
        <Route path="/tests/history" element={
          <ProtectedRoute><TestHistoryPage /></ProtectedRoute>
        } />
        <Route path="/tests/:id" element={
          <ProtectedRoute><TestDetailPage /></ProtectedRoute>
        } />

        {/* ── Objective Testing — Navbar: Reading / Listening (riêng biệt) ───── */}
        <Route path="/reading" element={<ReadingPage />} />
        <Route path="/listening" element={<ListeningPage />} />

        {/* ── Objective Testing — Student: Live Test ────────────────────────── */}
        <Route path="/tests/:id/reading" element={
          <ProtectedRoute><ReadingTestPage /></ProtectedRoute>
        } />
        <Route path="/tests/:id/listening" element={
          <ProtectedRoute><ListeningTestPage /></ProtectedRoute>
        } />

        {/* ── Objective Testing — Student: Results ──────────────────────────── */}
        <Route path="/results/:attemptId" element={
          <ProtectedRoute><TestResultPage /></ProtectedRoute>
        } />
        <Route path="/results/:attemptId/detail" element={
          <ProtectedRoute><TestResultDetailPage /></ProtectedRoute>
        } />

        {/* ── Objective Testing — Tutor: Test Management (Moved to TutorLayout) ── */}

        {/* ── Admin: Audit Logs ─────────────────────────────────────────────── */}
        <Route path="/admin/audit-logs" element={
          <ProtectedRoute><AuditLogPage /></ProtectedRoute>
        } />

        {/* ── 404 — "Về trang chủ" → / ────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
      <GlobalAssistantButton />
    </BrowserRouter>
  );
}

export default App;
