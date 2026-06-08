import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ChangePwdModal from '../../components/profile/ChangePwdModal';
import { formatDateTime, rolePill, statusPill } from '../../utils/adminFormat';

const AdminProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ full_name: '', avatar_url: '' });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name || '', avatar_url: user.avatar_url || '' });
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // EARS[Event]: WHEN an Admin updates their profile, THE system SHALL persist name + avatar.
      await api.patch('/users/me', { full_name: form.full_name, avatar_url: form.avatar_url });
      setSuccessMsg('Cập nhật hồ sơ thành công.');
      await refreshUser();
    } catch (error) {
      setErrorMsg(error.response?.data?.error?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-secondary py-5 text-center">Đang tải thông tin…</div>;

  return (
    <div>
      <div className="mb-4">
        <h1 className="display-md mb-1">Hồ sơ cá nhân</h1>
        <p className="body-sm text-secondary m-0">Quản lý thông tin tài khoản quản trị của bạn.</p>
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
                  {user.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
              <h2 className="display-sm mb-1">{user.full_name || 'Quản trị viên'}</h2>
              <div className="body-sm text-secondary mb-3">{user.email}</div>
              <div className="d-flex justify-content-center gap-2">
                <span className={`pill ${rolePill(user.role)}`}>{user.role}</span>
                <span className={`pill ${statusPill(user.status)}`}>{user.status}</span>
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
                  <label className="form-label fw-semibold text-secondary">Ảnh đại diện (URL)</label>
                  <input type="url" className="form-control" name="avatar_url" placeholder="https://…"
                    value={form.avatar_url} onChange={handleChange} data-testid="avatar-input" />
                </div>
                <button type="submit" className="btn-pill btn-pill--dark px-4" disabled={loading} data-testid="submit-btn">
                  {loading ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
              </form>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Bảo mật &amp; tài khoản</h2>
              <button className="btn-pill btn-pill--ghost" onClick={() => setShowPwd(true)}>Đổi mật khẩu</button>
            </div>
            <div className="admin-card__body">
              <div className="row g-3">
                <div className="col-sm-6"><span className="caption text-secondary d-block">Email</span><span className="body-md-strong">{user.email}</span></div>
                <div className="col-sm-6"><span className="caption text-secondary d-block">Vai trò</span><span className="body-md-strong text-capitalize">{user.role}</span></div>
                <div className="col-sm-6"><span className="caption text-secondary d-block">Ngày tạo tài khoản</span><span className="body-md-strong">{formatDateTime(user.created_at)}</span></div>
                <div className="col-sm-6"><span className="caption text-secondary d-block">Đăng nhập gần nhất</span><span className="body-md-strong">{formatDateTime(user.last_login_at)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChangePwdModal isOpen={showPwd} onClose={() => setShowPwd(false)} />
    </div>
  );
};

export default AdminProfilePage;
