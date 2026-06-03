import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const ResetPwdForm = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('Đường dẫn không hợp lệ hoặc đã hết hạn.');
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
      await api.put('/auth/reset-password', {
        token,
        new_password: password
      });

      setSuccessMsg('Đặt lại mật khẩu thành công! Đang chuyển hướng về trang Đăng nhập...');
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      // EARS[Unwanted]: WHERE a User changes their password to one that matches their last 3 hashes...
      const message = error.response?.data?.error || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-100" style={{ maxWidth: '400px' }}>
      <h2 className="text-center mb-4 fw-bold">Đặt lại mật khẩu</h2>
      
      {successMsg && (
        <div className="alert alert-success" role="alert" data-testid="success-alert">
          {successMsg}
        </div>
      )}
      
      {errorMsg && (
        <div className="alert alert-danger" role="alert" data-testid="error-alert">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label text-secondary fw-semibold">Mật khẩu mới</label>
          <input
            type="password"
            className={`form-control py-2 ${!isPasswordStrong ? 'is-invalid' : ''}`}
            placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMsg('');
            }}
            required
            disabled={!token || successMsg !== ''}
            data-testid="password-input"
          />
          {!isPasswordStrong && (
            <div className="invalid-feedback" data-testid="password-strength-error">
              Mật khẩu phải có ít nhất 8 ký tự.
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="form-label text-secondary fw-semibold">Xác nhận mật khẩu</label>
          <input
            type="password"
            className={`form-control py-2 ${!isPasswordMatch ? 'is-invalid' : ''}`}
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrorMsg('');
            }}
            required
            disabled={!token || successMsg !== ''}
            data-testid="confirm-password-input"
          />
          {!isPasswordMatch && (
            <div className="invalid-feedback" data-testid="password-mismatch-error">
              Mật khẩu xác nhận không khớp.
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 rounded-pill py-3 fw-bold mb-3"
          disabled={loading || !token || !isPasswordMatch || !isPasswordStrong || password.length === 0 || successMsg !== ''}
          data-testid="submit-btn"
        >
          {loading ? 'Đang xử lý...' : 'Xác nhận đặt lại'}
        </button>
      </form>
    </div>
  );
};

export default ResetPwdForm;
