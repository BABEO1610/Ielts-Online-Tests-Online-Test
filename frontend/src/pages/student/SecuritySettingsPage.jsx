import React, { useState } from 'react';
import ChangePwdModal from '../../components/profile/ChangePwdModal';
import { formatDateTime } from '../../utils/adminFormat';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

const SecuritySettingsPage = () => {
  const { user } = useAuth();
  const [showPwd, setShowPwd] = useState(false);

  if (!user) return <div className="text-secondary py-5 text-center">Đang tải thông tin...</div>;

  return (
    <div className="py-4 px-3 px-md-4">
      <div className="mb-4">
        <h1 className="display-md mb-1">Bảo mật & tài khoản</h1>
        <p className="body-sm text-secondary m-0">Quản lý các thiết lập bảo mật và theo dõi thông tin tài khoản.</p>
      </div>

      <div className="admin-card">
        <div className="admin-card__header">
          <h2 className="admin-card__title">Thông tin tài khoản</h2>
          <button className="btn-pill btn-pill--ghost" onClick={() => setShowPwd(true)}>Đổi mật khẩu</button>
        </div>
        <div className="admin-card__body">
          <div className="row g-3">
            <div className="col-sm-6">
              <span className="caption text-secondary d-block">Email</span>
              <span className="body-md-strong">{user.email}</span>
            </div>
            <div className="col-sm-6">
              <span className="caption text-secondary d-block">Vai trò</span>
              <span className="body-md-strong text-capitalize">{user.role || 'student'}</span>
            </div>
            <div className="col-sm-6">
              <span className="caption text-secondary d-block">Ngày tạo tài khoản</span>
              <span className="body-md-strong">{formatDateTime(user.created_at)}</span>
            </div>
            <div className="col-sm-6">
              <span className="caption text-secondary d-block">Đăng nhập gần nhất</span>
              <span className="body-md-strong">{formatDateTime(user.last_login_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <ChangePwdModal isOpen={showPwd} onClose={() => setShowPwd(false)} />
    </div>
  );
};

export default SecuritySettingsPage;
