import React from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import ResetPwdForm from '../../components/auth/ResetPwdForm';

const ResetPwdPage = () => {
  return (
    <AuthLayout>
      <ResetPwdForm />
    </AuthLayout>
  );
};

export default ResetPwdPage;
