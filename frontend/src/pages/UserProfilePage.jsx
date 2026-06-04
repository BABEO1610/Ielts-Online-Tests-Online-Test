import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StudentNavbar from '../components/layout/StudentNavbar';

const UserProfilePage = () => {
  const { user, refreshUser } = useAuth();
  
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
      await api.patch('/users/me', {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url,
        target_band_score: Number(formData.target_band_score)
      });

      setSuccessMsg('Cập nhật hồ sơ thành công!');
      await refreshUser(); // Sync the context
    } catch (error) {
      // EARS[Unwanted]: WHERE a User submits a target_band_score outside [0.0, 9.0] or not divisible by 0.5...
      const message = error.response?.data?.error || 'Có lỗi xảy ra khi cập nhật hồ sơ.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-5 text-center">Đang tải thông tin...</div>;

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <div className="container py-5">
        <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0 rounded-4 p-4">
            <h2 className="fw-bold mb-4 border-bottom pb-3">Hồ sơ cá nhân</h2>

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

              <button
                type="submit"
                className="btn btn-primary w-100 rounded-pill py-3 fw-bold"
                disabled={loading}
                data-testid="submit-btn"
              >
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default UserProfilePage;
