import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { usePasswordToggle } from '../../hooks/usePasswordToggle';

const ResetPwdForm = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pwdType, pwdVisible, togglePwd] = usePasswordToggle();
  const [confirmType, confirmVisible, toggleConfirm] = usePasswordToggle();

  useEffect(() => {
    if (!token) {
      setErrorMsg('Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    }
  }, [token]);

  const isPasswordMatch = confirmPassword === '' || password === confirmPassword;
  const isPasswordStrong = password.length === 0 || password.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token) {
      setErrorMsg('Token không hợp lệ.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      // EARS[Event]: WHEN a Guest submits a new password via a valid reset link...
      await api.post('/auth/reset-password', {
        token,
        password: password
      });

      setSuccessMsg('Đặt lại mật khẩu thành công! Đang chuyển hướng về trang Đăng nhập...');
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      const message = error.response?.data?.error?.message || error.response?.data?.error || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-100">
      <h2 className="fw-bold text-center mb-4">Đặt lại mật khẩu</h2>
      
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center mb-4 rounded-3 shadow-sm" role="alert" data-testid="success-alert">
          <i className="bi bi-check-circle-fill me-2 fs-4"></i>
          <div>{successMsg}</div>
        </div>
      )}
      
      {errorMsg && (
        <div className="alert alert-danger d-flex align-items-center mb-4 rounded-3 shadow-sm" role="alert" data-testid="error-alert">
          <i className="bi bi-exclamation-circle-fill me-2 fs-4"></i>
          <div>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label fw-medium text-dark">Mật khẩu mới</label>
          <div style={{ position: 'relative' }}>
            <input
              type={pwdType}
              className={`form-control form-control-lg rounded-3 bg-white border-0 shadow-sm ${!isPasswordStrong ? 'is-invalid' : ''}`}
              placeholder="Tối thiểu 8 ký tự"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg('');
              }}
              style={{ paddingRight: '2.5rem' }}
              required
              disabled={!token || successMsg !== ''}
              data-testid="password-input"
            />
            <button
              type="button"
              onClick={togglePwd}
              aria-label={pwdVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              disabled={!token || successMsg !== ''}
              style={{
                position: 'absolute', right: '12px', top: !isPasswordStrong ? 'calc(50% - 10px)' : '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6c757d', padding: '0 2px', lineHeight: 1
              }}
            >
              <i className={`bi bi-eye${pwdVisible ? '-slash' : ''}`} />
            </button>
          </div>
          {!isPasswordStrong && (
            <div className="invalid-feedback fw-medium" data-testid="password-strength-error">
              Mật khẩu phải có ít nhất 8 ký tự.
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="form-label fw-medium text-dark">Xác nhận mật khẩu</label>
          <div style={{ position: 'relative' }}>
            <input
              type={confirmType}
              className={`form-control form-control-lg rounded-3 bg-white border-0 shadow-sm ${!isPasswordMatch ? 'is-invalid' : ''}`}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrorMsg('');
              }}
              style={{ paddingRight: '2.5rem' }}
              required
              disabled={!token || successMsg !== ''}
              data-testid="confirm-password-input"
            />
            <button
              type="button"
              onClick={toggleConfirm}
              aria-label={confirmVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              disabled={!token || successMsg !== ''}
              style={{
                position: 'absolute', right: '12px', top: !isPasswordMatch ? 'calc(50% - 10px)' : '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6c757d', padding: '0 2px', lineHeight: 1
              }}
            >
              <i className={`bi bi-eye${confirmVisible ? '-slash' : ''}`} />
            </button>
          </div>
          {!isPasswordMatch && (
            <div className="invalid-feedback fw-medium" data-testid="password-mismatch-error">
              Mật khẩu xác nhận không khớp.
            </div>
          )}
        </div>

        <div className="d-grid gap-2 mb-4">
          <button
            type="submit"
            className="btn btn-dark btn-lg rounded-pill fw-bold text-white shadow-sm"
            disabled={loading || !token || !isPasswordMatch || !isPasswordStrong || password.length === 0 || successMsg !== ''}
            style={{ backgroundColor: '#000000' }}
            data-testid="submit-btn"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận đặt lại'}
          </button>
        </div>
      </form>
      
      <div className="text-center mt-4">
        <Link to="/login" className="text-decoration-none fw-medium" style={{ color: '#0000ee', fontSize: '14px' }}>
          <i className="bi bi-arrow-left me-1"></i>
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default ResetPwdForm;
