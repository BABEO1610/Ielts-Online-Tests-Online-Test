import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import CreateTutorModal from '../admin/CreateTutorModal';
import ChangePwdModal from '../profile/ChangePwdModal';

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg sticky-top px-3 px-md-5 py-3" style={{ backgroundColor: 'var(--canvas)', borderBottom: '1px solid var(--surface-pressed)' }}>
      <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-4">
          <Link className="navbar-brand fw-bold fs-4 m-0" to="/admin" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            IELTSZone Admin
          </Link>
          <button 
            className="btn btn-sm btn-outline-danger rounded-pill fw-medium px-3 d-none d-md-block"
            onClick={() => setShowTutorModal(true)}
          >
            + Thêm Giảng viên
          </button>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            onClick={toggleTheme}
            className="btn rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px', backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)', border: 'none' }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
          </button>
          
          <div className="dropdown">
            <button
              className="btn rounded-pill px-4 py-2 fw-medium border-0 d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              style={{ backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)' }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="rounded-circle" style={{ width: '24px', height: '24px', objectFit: 'cover' }} />
              ) : (
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '12px', backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}>
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
              <span className="d-none d-sm-inline">{user?.full_name || 'Admin'}</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end rounded-4 shadow border-0 mt-2 p-2" style={{ backgroundColor: 'var(--canvas)' }}>
              <li><Link className="dropdown-item rounded-3 py-2" to="/profile" style={{ color: 'var(--ink)' }}>Hồ sơ cá nhân</Link></li>
              <li><button className="dropdown-item rounded-3 py-2" onClick={() => setShowPwdModal(true)} style={{ color: 'var(--ink)' }}>Đổi mật khẩu</button></li>
              <li><hr className="dropdown-divider" style={{ borderColor: 'var(--surface-pressed)' }} /></li>
              <li><button className="dropdown-item rounded-3 py-2 text-danger" onClick={handleLogout}>Đăng xuất</button></li>
            </ul>
          </div>
        </div>
      </div>
      
      <CreateTutorModal 
        isOpen={showTutorModal} 
        onClose={() => setShowTutorModal(false)}
        onSuccess={() => {
          // Buộc reload trang AdminDashboard để thấy danh sách mới
          window.location.reload();
        }}
      />

      <ChangePwdModal 
        isOpen={showPwdModal}
        onClose={() => setShowPwdModal(false)}
      />
    </nav>
  );
};

export default AdminNavbar;
