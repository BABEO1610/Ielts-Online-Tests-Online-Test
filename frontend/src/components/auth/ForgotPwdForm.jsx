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
      // EARS[Event]: WHEN a Guest requests a password reset...
      await api.post('/auth/forgot-password', { email });
    } catch (error) {
      // Intentionally ignore error for anti-enumeration
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
      // EARS[Edge Case]: Mitigation - Anti-enumeration
      // Luôn báo thành công dù API trả về kết quả ra sao
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-100 text-center" style={{ maxWidth: '400px' }}>
        <h2 className="fw-bold mb-4">Kiểm tra email</h2>
        <div className="alert alert-success" role="alert" data-testid="success-alert">
          Nếu email <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục Spam).
        </div>
        <Link to="/login" className="btn btn-outline-primary w-100 rounded-pill py-3 fw-bold mt-3">
          Quay lại Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="w-100" style={{ maxWidth: '400px' }}>
      <h2 className="text-center mb-2 fw-bold">Quên mật khẩu?</h2>
      <p className="text-center text-secondary mb-4">
        Nhập email liên kết với tài khoản của bạn để nhận hướng dẫn đặt lại mật khẩu.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="form-label text-secondary fw-semibold">Email</label>
          <input
            type="email"
            className="form-control py-2"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="email-input"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 rounded-pill py-3 fw-bold mb-3"
          disabled={loading || !email}
          data-testid="submit-btn"
        >
          {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
        </button>
      </form>

      <div className="text-center mt-3">
        <Link to="/login" className="text-secondary text-decoration-none fw-semibold">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default ForgotPwdForm;
