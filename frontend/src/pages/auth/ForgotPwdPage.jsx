import React from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import ForgotPwdForm from '../../components/auth/ForgotPwdForm';

const ForgotPwdPage = () => {
  return (
    <AuthLayout>
      <ForgotPwdForm />
    </AuthLayout>
  );
};

export default ForgotPwdPage;
