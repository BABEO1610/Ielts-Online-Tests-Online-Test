import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PracticeHistoryPage from './PracticeHistoryPage';
import SecuritySettingsPage from './SecuritySettingsPage';
import StudyPlanPage from './StudyPlanPage';
import { formatDateTime, rolePill, statusPill } from '../../utils/adminFormat';
import '../../styles/admin.css';
import '../../styles/profile.css';

const ProfilePageContent = ({ user, refreshUser }) => {
  const [form, setForm] = useState({ full_name: '', avatar_url: '', target_band_score: 7.0, target_test_date: '' });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ 
        full_name: user.full_name || '', 
        avatar_url: user.avatar_url || '', 
        target_band_score: user.target_band_score || 7.0,
        target_test_date: user.target_test_date ? new Date(user.target_test_date).toISOString().split('T')[0] : ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleBandScoreBlur = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 7.0;
    if (val < 0.0) val = 0.0;
    if (val > 9.0) val = 9.0;
    val = Math.round(val * 2) / 2;
    setForm((prev) => ({ ...prev, target_band_score: val.toFixed(1) }));
  };


  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    setUploadingAvatar(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.success && response.data?.data?.avatar_url) {
        setForm(prev => ({ ...prev, avatar_url: response.data.data.avatar_url }));
        setSuccessMsg('Tải ảnh lên thành công. Vui lòng bấm "Lưu thay đổi" để cập nhật.');
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.error?.message || 'Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setUploadingAvatar(false);
      // Reset input value to allow uploading the same file again if needed
      e.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.patch('/users/me', { 
        full_name: form.full_name, 
        avatar_url: form.avatar_url,
        target_band_score: Number(form.target_band_score),
        target_test_date: form.target_test_date || null
      });
      setSuccessMsg('Cập nhật hồ sơ thành công.');
      await refreshUser();
    } catch (error) {
      setErrorMsg(error.response?.data?.error?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4 px-3 px-md-4">
      <div className="mb-4">
        <h1 className="display-md mb-1">Hồ sơ cá nhân</h1>
        <p className="body-sm text-secondary m-0">Quản lý thông tin tài khoản của bạn.</p>
      </div>

      <div className="row g-4">
        {/* Identity card */}
        <div className="col-lg-4">
          <div className="admin-card h-100">
            <div className="admin-card__body text-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="rounded-circle mb-3" style={{ width: 96, height: 96, objectFit: 'cover' }} />
              ) : (
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center text-white mb-3"
                  style={{ width: 96, height: 96, fontSize: 36, background: '#e02424' }}
                >
                  {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <h2 className="display-sm mb-1">{user.full_name || 'Học viên'}</h2>
              <div className="body-sm text-secondary mb-3">{user.email}</div>
              <div className="d-flex justify-content-center gap-2">
                <span className={`pill ${rolePill(user.role || 'student')}`}>{user.role || 'student'}</span>
                <span className={`pill ${statusPill(user.status || 'active')}`}>{user.status || 'active'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editable + account details */}
        <div className="col-lg-8">
          <div className="admin-card mb-4">
            <div className="admin-card__header"><h2 className="admin-card__title">Chỉnh sửa thông tin</h2></div>
            <div className="admin-card__body">
              {successMsg && <div className="api-success-message">{successMsg}</div>}
              {errorMsg && <div className="api-error-message">{errorMsg}</div>}
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary">Họ và tên</label>
                  <input type="text" className="form-control" name="full_name" placeholder="Nhập họ và tên"
                    value={form.full_name} onChange={handleChange} data-testid="fullname-input" required />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary">Ảnh đại diện (Tải lên hoặc nhập URL)</label>
                  <div className="d-flex flex-column gap-2">
                    <input 
                      type="file" 
                      className="form-control" 
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar || loading}
                    />
                    {uploadingAvatar && <small className="text-secondary">Đang tải ảnh lên...</small>}
                    <input type="url" className="form-control" name="avatar_url" placeholder="Hoặc nhập URL: https://…"
                      value={form.avatar_url} onChange={handleChange} data-testid="avatar-input" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary">Ngày dự thi (Target Test Date)</label>
                  <input type="date" className="form-control" name="target_test_date"
                    value={form.target_test_date} onChange={handleChange} data-testid="target-date-input" />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary">Mục tiêu (Band Score)</label>
                  <input type="number" step="0.5" min="0" max="9" className="form-control" name="target_band_score" placeholder="7.0"
                    value={form.target_band_score} onChange={handleChange} onBlur={handleBandScoreBlur} data-testid="target-band-input" required />
                </div>
                <button type="submit" className="btn-pill btn-pill--dark px-4" disabled={loading || uploadingAvatar} data-testid="submit-btn">
                  {loading ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const location = useLocation();

  if (!user) return <div className="text-secondary py-5 text-center">Đang tải thông tin...</div>;

  if (location.pathname === '/practice-history') {
    return (
      <div className="py-4 px-3 px-md-4">
        <PracticeHistoryPage />
      </div>
    );
  }

  if (location.pathname === '/security') {
    return (
      <div className="py-4 px-3 px-md-4">
        <SecuritySettingsPage />
      </div>
    );
  }

  if (location.pathname === '/study-plan') {
    return (
      <div className="py-4 px-3 px-md-4">
        <StudyPlanPage />
      </div>
    );
  }

  return <ProfilePageContent user={user} refreshUser={refreshUser} />;
};

export default UserProfilePage;
