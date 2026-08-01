import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GoogleLoginButton from './GoogleLoginButton';
import { usePasswordToggle } from '../../hooks/usePasswordToggle';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pwdType, pwdVisible, togglePwd] = usePasswordToggle();
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
        navigate('/');
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
        <div className="api-error-message d-flex align-items-center justify-content-center" role="alert" data-testid="error-message">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{errorMsg}</div>
        </div>
      )}

      <div className="mb-xl">
        <label htmlFor="emailInput" className="form-label">Email</label>
        <input
          type="email"
          className="text-input"
          id="emailInput"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="mb-xl">
        <div className="d-flex justify-content-between align-items-center mb-xs">
          <label htmlFor="passwordInput" className="form-label mb-0">Mật khẩu</label>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={pwdType}
            className="text-input"
            id="passwordInput"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: '2.5rem' }}
            required
          />
          <button
            type="button"
            onClick={togglePwd}
            aria-label={pwdVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6c757d', padding: '0 2px', lineHeight: 1
            }}
          >
            <i className={`bi bi-eye${pwdVisible ? '-slash' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mb-xl">
        <button
          type="submit"
          className="button-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </div>

      <div className="d-flex align-items-center mb-xl">
        <hr className="flex-grow-1" />
        <span className="mx-3 caption text-muted">HOẶC</span>
        <hr className="flex-grow-1" />
      </div>

      <div className="mb-xl">
        <GoogleLoginButton />
      </div>
      
      <div className="text-center mt-xl">
        <span className="body-sm text-muted">Chưa có tài khoản? </span>
        <Link to="/register" className="body-sm-strong link-blue" style={{ color: 'var(--ink)' }}>
          Đăng ký ngay
        </Link>
        <div className="mt-md">
          <Link to="/forgot-password" className="body-sm link-blue">
            Quên mật khẩu?
          </Link>
        </div>
      </div>
    </form>
  );
};

export default LoginForm;
