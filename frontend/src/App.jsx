import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import RegisterPage from './pages/RegisterPage';
import ForgotPwdPage from './pages/ForgotPwdPage';
import ResetPwdPage from './pages/ResetPwdPage';
import OnboardingPage from './pages/OnboardingPage';
import ContentLibraryPage from './pages/ContentLibraryPage';

// Protected Pages
import UserProfilePage from './pages/UserProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

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
        {/* EARS[Event]: WHEN user navigates to /library THEN route to ContentLibraryPage */}
        <Route path="/library" element={<ContentLibraryPage />} />

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