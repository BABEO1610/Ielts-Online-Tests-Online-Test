import React from 'react';
import AuthLayout from '../components/layout/AuthLayout';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage = () => {
  return (
    <AuthLayout>
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-2" style={{ fontFamily: 'UberMove, UberMoveText, system-ui, Helvetica Neue, Arial, sans-serif' }}>
          Tạo tài khoản mới
        </h2>
        <p className="text-muted" style={{ fontSize: '16px' }}>
          Điền thông tin bên dưới để bắt đầu luyện thi IELTS
        </p>
      </div>
      
      <RegisterForm />
    </AuthLayout>
  );
};

export default RegisterPage;
