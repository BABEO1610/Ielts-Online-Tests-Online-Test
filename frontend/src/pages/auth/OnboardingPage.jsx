import React from 'react';
import OnboardingForm from '../../components/auth/OnboardingForm';

const OnboardingPage = () => {
  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-white">
      <div className="w-100" style={{ maxWidth: '500px' }}>
        <OnboardingForm />
      </div>
    </div>
  );
};

export default OnboardingPage;
