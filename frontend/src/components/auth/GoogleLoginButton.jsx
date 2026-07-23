import React from 'react';

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    // Redirect to backend OAuth route (Sprint 2)
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <button
      type="button"
      className="button-secondary"
      onClick={handleGoogleLogin}
      data-testid="google-login-btn"
    >
      <img 
        src="https://www.svgrepo.com/show/475656/google-color.svg" 
        alt="Google logo" 
        className="me-2" 
        style={{ width: '20px', height: '20px' }} 
      />
      Tiếp tục với Google
    </button>
  );
};

export default GoogleLoginButton;
