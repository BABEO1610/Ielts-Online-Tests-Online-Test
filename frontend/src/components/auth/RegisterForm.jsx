import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import GoogleLoginButton from './GoogleLoginButton';
import { usePasswordToggle } from '../../hooks/usePasswordToggle';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pwdType, pwdVisible, togglePwd] = usePasswordToggle();
  const [confirmType, confirmVisible, toggleConfirm] = usePasswordToggle();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear alerts when user starts typing again
    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const isPasswordMatch = formData.confirmPassword === '' || formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }



    setLoading(true);

    try {
      // EARS[Event]: WHEN a Guest submits a Registration form...
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name
      });

      // Clear form and show success
      setFormData({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.');
    } catch (error) {
      // EARS[Unwanted]: WHERE a Guest registers with an already existing Email...
      const errorData = error.response?.data?.error;
      const message = errorData?.message || errorData || 'Registration failed. Please try again.';
      setErrorMsg(typeof message === 'string' ? message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="register-form">
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center mb-4 rounded-3 shadow-sm" role="alert" data-testid="success-alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          <div>{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger d-flex align-items-center mb-4 rounded-3 shadow-sm" role="alert" data-testid="error-alert">
          <i className="bi bi-exclamation-circle-fill me-2"></i>
          <div>{errorMsg}</div>
        </div>
      )}

      <div className="mb-3">
        <label className="form-label fw-medium text-dark">Họ và Tên</label>
        <input
          type="text"
          className="form-control form-control-lg rounded-3 bg-white border-0 shadow-sm"
          name="full_name"
          placeholder="Ví dụ: Nguyễn Văn A"
          value={formData.full_name}
          onChange={handleChange}
          required
          data-testid="fullname-input"
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-medium text-dark">Email</label>
        <input
          type="email"
          className="form-control form-control-lg rounded-3 bg-white border-0 shadow-sm"
          name="email"
          placeholder="email@example.com"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="email-input"
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-medium text-dark">Mật khẩu</label>
        <div style={{ position: 'relative' }}>
          <input
            type={pwdType}
            className="form-control form-control-lg rounded-3 bg-white border-0 shadow-sm"
            name="password"
            placeholder="Nhập mật khẩu"
            value={formData.password}
            onChange={handleChange}
            style={{ paddingRight: '2.5rem' }}
            required
            data-testid="password-input"
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

      <div className="mb-4">
        <label className="form-label fw-medium text-dark">Xác nhận mật khẩu</label>
        <div style={{ position: 'relative' }}>
          <input
            type={confirmType}
            className={`form-control form-control-lg rounded-3 bg-white border-0 shadow-sm ${!isPasswordMatch ? 'is-invalid' : ''}`}
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={{ paddingRight: '2.5rem' }}
            required
            data-testid="confirm-password-input"
          />
          <button
            type="button"
            onClick={toggleConfirm}
            aria-label={confirmVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            style={{
              position: 'absolute', right: '12px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6c757d', padding: '0 2px', lineHeight: 1
            }}
          >
            <i className={`bi bi-eye${confirmVisible ? '-slash' : ''}`} />
          </button>
        </div>
        {!isPasswordMatch && (
          <div className="invalid-feedback" data-testid="password-mismatch-error">
            Mật khẩu xác nhận không khớp.
          </div>
        )}
      </div>

      <div className="d-grid gap-2 mb-4">
        <button
          type="submit"
          className="btn btn-dark btn-lg rounded-pill fw-bold text-white shadow-sm"
          disabled={loading || !isPasswordMatch}
          data-testid="submit-btn"
          style={{ backgroundColor: '#000000' }}
        >
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
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
        <span className="text-muted" style={{ fontSize: '14px' }}>Đã có tài khoản? </span>
        <Link to="/login" className="text-decoration-none fw-bold" style={{ color: '#000000', fontSize: '14px' }}>
          Đăng nhập ngay
        </Link>
      </div>
    </form>
  );
};

export default RegisterForm;
