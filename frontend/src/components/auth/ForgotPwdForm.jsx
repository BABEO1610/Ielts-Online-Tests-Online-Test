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
      <div className="w-100 text-center">
        <h2 className="display-xl mb-md">Kiểm tra email</h2>
        <div className="api-success-message" role="alert" data-testid="success-alert">
          Nếu email <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục Spam).
        </div>
        <Link to="/login" className="button-secondary mt-lg">
          Quay lại Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="w-100">
      <h2 className="display-xl text-center mb-md">Quên mật khẩu?</h2>
      <p className="body-md text-center mb-2xl" style={{ color: 'var(--body)' }}>
        Nhập email liên kết với tài khoản của bạn để nhận hướng dẫn đặt lại mật khẩu.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-lg">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="text-input"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="email-input"
          />
        </div>

        <button
          type="submit"
          className="button-primary mb-md"
          disabled={loading || !email}
          data-testid="submit-btn"
        >
          {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
        </button>
      </form>

      <div className="text-center mt-lg">
        <Link to="/login" className="link-blue">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
};

export default ForgotPwdForm;
