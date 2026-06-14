import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StudentNavbar from '../../components/layout/StudentNavbar';

const UserProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: '',
    target_band_score: '6.5'
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Generate band score options from 0.0 to 9.0 in 0.5 increments
  const bandScores = [];
  for (let i = 0; i <= 9; i += 0.5) {
    bandScores.push(i.toFixed(1));
  }

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        target_band_score: user.target_band_score !== null && user.target_band_score !== undefined
          ? Number(user.target_band_score).toFixed(1)
          : '6.5'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // EARS[Event]: WHEN a User requests a Profile update...
      await api.put('/users/me', {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url,
        target_band_score: Number(formData.target_band_score)
      });

      setSuccessMsg('true'); // Set a flag to show the modal
      await refreshUser(); // Sync the context
    } catch (error) {
      // EARS[Unwanted]: WHERE a User submits a target_band_score outside [0.0, 9.0] or not divisible by 0.5...
      console.error('Update profile error:', error.response?.data || error);
      const detail = error.response?.data?.error?.message || error.response?.data?.error || error.message || '';
      setErrorMsg(`Lưu thay đổi thất bại. ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'tutor') navigate('/tutor/dashboard');
    else navigate('/dashboard');
  };

  if (!user) return <div className="p-5 text-center">Đang tải thông tin...</div>;

  return (
    <div className="bg-white min-vh-100 pb-5">
      {/* Custom Success Modal Overlay */}
      {successMsg && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 p-3 text-center shadow-lg">
              <div className="d-flex justify-content-end">
                <button type="button" className="btn-close" onClick={() => setSuccessMsg('')} aria-label="Close"></button>
              </div>
              <div className="modal-body px-5 pb-5 pt-0">
                <div className="mb-3 d-flex justify-content-center">
                  <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', backgroundColor: '#1bcd48ff' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="white" className="bi bi-check-lg" viewBox="0 0 16 16">
                      <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                    </svg>
                  </div>
                </div>
                <h3 className="fw-bold mb-2" style={{ color: '#1e3a5f', letterSpacing: '0.5px' }}>SAVE SUCCESSFUL !</h3>
                <p className="text-secondary mb-0">Your profile is updated successfully.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'student' && <StudentNavbar />}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0 rounded-4 p-4">
              <h2 className="fw-bold mb-4 border-bottom pb-3">Hồ sơ cá nhân</h2>

              {errorMsg && (
                <div className="alert alert-danger" role="alert" data-testid="error-alert">
                  {errorMsg}
                </div>
              )}

              {/* Avatar Preview */}
              <div className="d-flex flex-column align-items-center mb-4 mt-2">
                <div 
                  className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '120px', height: '120px', backgroundColor: '#e2e8f0', border: '3px solid #fff', outline: '1px solid #dee2e6' }}
                >
                  {formData.avatar_url ? (
                    <img 
                      src={formData.avatar_url} 
                      alt="Avatar Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name || 'User')}&background=random`; 
                      }}
                    />
                  ) : (
                    <span className="fw-bold text-secondary" style={{ fontSize: '48px' }}>
                      {(formData.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4 bg-light p-3 rounded">
                <h5 className="fw-semibold mb-3">Thông tin tài khoản (Chỉ đọc)</h5>
                <p className="mb-1"><strong>Email:</strong> {user.email}</p>
                <p className="mb-1">
                  <strong>Vai trò:</strong> <span className="badge bg-primary text-capitalize">{user.role}</span>
                </p>
                <p className="mb-0">
                  <strong>Trạng thái:</strong> <span className={`badge ${user.status === 'active' ? 'bg-success' : 'bg-warning'} text-capitalize`}>{user.status}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">Họ và Tên</label>
                  <input
                    type="text"
                    className="form-control py-2"
                    name="full_name"
                    placeholder="Nhập họ và tên"
                    value={formData.full_name}
                    onChange={handleChange}
                    data-testid="fullname-input"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">Ảnh đại diện (URL)</label>
                  <input
                    type="url"
                    className="form-control py-2"
                    name="avatar_url"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatar_url}
                    onChange={handleChange}
                    data-testid="avatar-input"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary">Mục tiêu IELTS (Band Score)</label>
                  <select
                    className="form-select py-2"
                    name="target_band_score"
                    value={formData.target_band_score}
                    onChange={handleChange}
                    data-testid="bandscore-select"
                  >
                    {bandScores.map(score => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </div>

                <div className="d-flex gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-50 rounded-pill py-3 fw-bold"
                    onClick={handleBackToDashboard}
                  >
                    Về trang chủ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary w-50 rounded-pill py-3 fw-bold"
                    disabled={loading}
                    data-testid="submit-btn"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
