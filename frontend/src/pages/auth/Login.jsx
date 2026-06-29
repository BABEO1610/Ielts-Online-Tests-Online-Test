import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light">
        <div className="spinner-border text-dark mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p className="text-muted fw-medium">Đang xác thực thông tin...</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'tutor') {
      return <Navigate to="/tutor/dashboard" replace />;
    } else if (user.role === 'student') {
      return <Navigate to="/" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <AuthLayout>
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-2" style={{ fontFamily: 'UberMove, UberMoveText, system-ui, Helvetica Neue, Arial, sans-serif' }}>
          Đăng nhập
        </h2>
        <p className="text-muted" style={{ fontSize: '16px' }}>
          Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn.
        </p>
      </div>
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;
