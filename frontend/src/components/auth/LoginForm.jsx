import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GoogleLoginButton from './GoogleLoginButton';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorCode = params.get('error');
    if (errorCode) {
      if (errorCode === 'AUTH_PERM_001') {
        setErrorMsg('Tài khoản của bạn đã bị khóa hoặc không có quyền truy cập.');
      } else if (errorCode === 'AUTH_OAUTH_001') {
        setErrorMsg('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      } else if (errorCode === 'DB_CONNECTION_ERROR') {
        setErrorMsg('Lỗi kết nối hệ thống. Vui lòng thử lại sau.');
      } else {
        setErrorMsg('Đã có lỗi xảy ra trong quá trình đăng nhập qua Google. Vui lòng thử lại.');
      }
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // EARS[Event]: WHEN user submits login credentials...
    const result = await login({ email, password });

    if (result.success) {
      // EARS[State-driven]: WHEN login succeeds, redirect based on user role
      const role = result.user?.role || result.data?.role;
      if (role === 'tutor') {
        navigate('/tutor/dashboard');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      const code = result.error?.code;
      // EARS[Unwanted]: WHERE a User has failed_login_attempts >= 5 THEN lock flow
      if (code === 'AUTH_LOG_002') {
        setErrorMsg('Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');
      } else {
        // EARS[Unwanted]: WHERE a User inputs an incorrect password THEN call DB function handle_failed_login()
        setErrorMsg(result.error?.message || 'Incorrect email or password.');
      }
    }
    
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      {errorMsg && (
        <div 
          className="d-flex align-items-center mb-4 shadow-sm" 
          style={{ 
            backgroundColor: '#efefef', 
            color: '#000000', 
            padding: '16px 20px', 
            borderRadius: '16px',
            fontFamily: 'UberMoveText, system-ui, Helvetica Neue, Arial, sans-serif',
            fontSize: '16px',
            fontWeight: '500'
          }}
          role="alert" 
          data-testid="error-message"
        >
          <i className="bi bi-exclamation-triangle-fill me-3" style={{ fontSize: '20px' }}></i>
          <div>{errorMsg}</div>
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="emailInput" className="form-label fw-medium text-dark">Email</label>
        <input
          type="email"
          className="form-control form-control-lg rounded-3 bg-white border-0 shadow-sm"
          id="emailInput"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <label htmlFor="passwordInput" className="form-label fw-medium text-dark mb-0">Mật khẩu</label>
        </div>
        <input
          type="password"
          className="form-control form-control-lg rounded-3 bg-white border-0 shadow-sm"
          id="passwordInput"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="d-grid gap-2 mb-4">
        <button
          type="submit"
          className="btn btn-dark btn-lg rounded-pill fw-bold text-white shadow-sm"
          disabled={isLoading}
          style={{ backgroundColor: '#000000' }}
        >
          {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </div>

      <div className="d-flex align-items-center mb-4">
        <hr className="flex-grow-1 border-secondary opacity-25" />
        <span className="mx-3 text-muted small fw-medium" style={{ fontSize: '14px', color: '#5e5e5e' }}>HOẶC</span>
        <hr className="flex-grow-1 border-secondary opacity-25" />
      </div>

      <div className="d-grid gap-2">
        <GoogleLoginButton />
      </div>
      
      <div className="text-center mt-4">
        <span className="text-muted" style={{ fontSize: '14px' }}>Chưa có tài khoản? </span>
        <Link to="/register" className="text-decoration-none fw-bold" style={{ color: '#000000', fontSize: '14px' }}>
          Đăng ký ngay
        </Link>
        <br />
        <Link to="/forgot-password" className="text-decoration-none fw-medium mt-2 d-inline-block" style={{ color: '#0000ee', fontSize: '14px' }}>
          Quên mật khẩu?
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;
