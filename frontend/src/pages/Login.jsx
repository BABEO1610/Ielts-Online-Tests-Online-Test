import React from 'react';
import AuthLayout from '../components/layout/AuthLayout';
import LoginForm from '../components/auth/LoginForm';

const Login = () => {
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
