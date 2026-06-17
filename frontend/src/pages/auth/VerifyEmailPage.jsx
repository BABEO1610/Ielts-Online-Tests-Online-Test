import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AuthLayout from '../../components/layout/AuthLayout';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Đang xác thực email của bạn...');
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy token xác thực hợp lệ.');
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    const verifyEmail = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage('Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.');
      } catch (error) {
        setStatus('error');
        const errorData = error.response?.data?.error;
        const errMsg = errorData?.message || errorData || 'Xác thực email thất bại. Token có thể đã hết hạn hoặc không hợp lệ.';
        setMessage(typeof errMsg === 'string' ? errMsg : 'Xác thực email thất bại.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <AuthLayout>
      <div className="text-center mb-4">
        <h2 className="fw-bold mb-2" style={{ fontFamily: 'UberMove, UberMoveText, system-ui, Helvetica Neue, Arial, sans-serif' }}>
          Xác thực Email
        </h2>
      </div>

      <div className="text-center">
        {status === 'loading' && (
          <div className="d-flex flex-column align-items-center">
            <div className="spinner-border text-dark mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="alert alert-success d-flex flex-column align-items-center mb-4 rounded-3 shadow-sm" role="alert">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <h4 className="alert-heading">Thành công!</h4>
            <p className="mb-0">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="alert alert-danger d-flex flex-column align-items-center mb-4 rounded-3 shadow-sm" role="alert">
            <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <h4 className="alert-heading">Lỗi xác thực</h4>
            <p className="mb-0">{message}</p>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => navigate('/login')}
            className="btn btn-dark btn-lg rounded-pill fw-bold text-white shadow-sm w-100"
            style={{ backgroundColor: '#000000' }}
          >
            Đến trang đăng nhập
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
