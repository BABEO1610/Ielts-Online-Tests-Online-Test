import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import RegisterPage from './pages/RegisterPage';
import ForgotPwdPage from './pages/ForgotPwdPage';
import ResetPwdPage from './pages/ResetPwdPage';
import OnboardingPage from './pages/OnboardingPage';

// Protected Pages
import UserProfilePage from './pages/UserProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Objective Testing — Student Views (Task 4.1)
import TestListPage from './pages/objective-testing/TestListPage';
import TestDetailPage from './pages/objective-testing/TestDetailPage';
import TestHistoryPage from './pages/objective-testing/TestHistoryPage';

// Objective Testing — Live Test Views (Task 4.2)
import ReadingTestPage from './pages/objective-testing/ReadingTestPage';
import ListeningTestPage from './pages/objective-testing/ListeningTestPage';

// Objective Testing — Result Views (Task 4.3)
import TestResultPage from './pages/objective-testing/TestResultPage';
import TestResultDetailPage from './pages/objective-testing/TestResultDetailPage';

// Objective Testing — Tutor/Admin Views (Task 4.4)
import TutorTestManagePage from './pages/objective-testing/TutorTestManagePage';
import TutorTestFormPage from './pages/objective-testing/TutorTestFormPage';
import TutorQuestionFormPage from './pages/objective-testing/TutorQuestionFormPage';
import AuditLogPage from './pages/objective-testing/AuditLogPage';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPwdPage />} />
        <Route path="/reset-password" element={<ResetPwdPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected Routes */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* ═══ Objective Testing Routes (feat-objective-testing) ═══ */}

        {/* Student: Test Browsing */}
        <Route path="/tests" element={<TestListPage />} />
        <Route path="/tests/:id" element={<TestDetailPage />} />
        <Route path="/tests/history" element={<TestHistoryPage />} />

        {/* Student: Live Test */}
        <Route path="/tests/:id/reading" element={<ReadingTestPage />} />
        <Route path="/tests/:id/listening" element={<ListeningTestPage />} />

        {/* Student: Results */}
        <Route path="/results/:attemptId" element={<TestResultPage />} />
        <Route path="/results/:attemptId/detail" element={<TestResultDetailPage />} />

        {/* Tutor: Test Management */}
        <Route path="/tutor/tests" element={<TutorTestManagePage />} />
        <Route path="/tutor/tests/new" element={<TutorTestFormPage />} />
        <Route path="/tutor/tests/:id/edit" element={<TutorTestFormPage />} />
        <Route path="/tutor/tests/:id/questions/new" element={<TutorQuestionFormPage />} />
        <Route path="/tutor/tests/:id/questions/:qId/edit" element={<TutorQuestionFormPage />} />

        {/* Admin: Audit Logs */}
        <Route path="/admin/audit-logs" element={<AuditLogPage />} />

        {/* Fallback 404 Route */}
        <Route
          path="*"
          element={
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <h1>404 – Not Found</h1>
              <p>The page you are looking for does not exist.</p>
              <a href="/">Go to Home</a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;