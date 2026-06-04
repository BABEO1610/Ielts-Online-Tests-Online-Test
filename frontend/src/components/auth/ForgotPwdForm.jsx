import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const ForgotPwdForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
    } catch (error) {
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-100 text-center">
        <h2 className="fw-bold mb-3">Kiểm tra email</h2>
        <div className="alert alert-success d-flex align-items-center mb-4 rounded-3 shadow-sm text-start" role="alert" data-testid="success-alert">
          <i className="bi bi-check-circle-fill me-2 fs-4"></i>
          <div>
            Nếu email <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục Spam).
          </div>
        </div>
        <Link to="/login" className="btn btn-outline-dark btn-lg rounded-pill fw-bold shadow-sm w-100">
          Quay lại Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="w-100">
      <h2 className="fw-bold text-center mb-2">Quên mật khẩu?</h2>
      <p className="text-muted text-center mb-4">
        Nhập email liên kết với tài khoản của bạn để nhận hướng dẫn đặt lại mật khẩu.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="form-label fw-medium text-dark">Email</label>
          <input
            type="email"
            className="form-control form-control-lg rounded-3 bg-white border-0 shadow-sm"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="email-input"
          />
        </div>

        <div className="d-grid gap-2 mb-4">
          <button
            type="submit"
            className="btn btn-dark btn-lg rounded-pill fw-bold text-white shadow-sm"
            disabled={loading || !email}
            style={{ backgroundColor: '#000000' }}
            data-testid="submit-btn"
          >
            {loading ? 'Đang xử lý...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </form>

      <div className="text-center mt-4">
        <span className="text-muted" style={{ fontSize: '14px' }}>Nhớ ra mật khẩu rồi? </span>
        <Link to="/login" className="text-decoration-none fw-bold" style={{ color: '#000000', fontSize: '14px' }}>
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
};

export default ForgotPwdForm;
