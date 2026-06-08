import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CreateTutorModal from '../components/admin/CreateTutorModal';
import ChangePwdModal from '../components/profile/ChangePwdModal';
import '../styles/admin.css';

const NAV_SECTIONS = [
  {
    eyebrow: 'Tổng quan',
    items: [
      { to: '/admin', end: true, label: 'Tổng quan' },
      { to: '/admin/reports', label: 'Báo cáo & xuất dữ liệu' },
    ],
  },
  {
    eyebrow: 'Người dùng',
    items: [
      { to: '/admin/users', label: 'Quản lý người dùng' },
      { to: '/admin/tutor-assignment', label: 'Phân công giảng viên' },
      { to: '/admin/sessions', label: 'Phiên đăng nhập' },
    ],
  },
  {
    eyebrow: 'Nội dung & chấm bài',
    items: [
      { to: '/admin/content-review', label: 'Duyệt nội dung' },
      { to: '/admin/grading', label: 'Giám sát chấm bài' },
      { to: '/admin/change-log', label: 'Nhật ký duyệt & thay đổi' },
    ],
  },
  {
    eyebrow: 'Hỗ trợ & phân tích',
    items: [
      { to: '/admin/contacts', label: 'Hộp thư liên hệ' },
      { to: '/admin/activity', label: 'Nhật ký hoạt động' },
      { to: '/admin/ai-usage', label: 'Thống kê AI' },
    ],
  },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  return (
    <div className="admin-shell">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-sidebar__brand">IELTSZone Admin</Link>
        <nav className="admin-sidebar__nav">
          {NAV_SECTIONS.map((section) => (
            <React.Fragment key={section.eyebrow}>
              <span className="admin-nav-eyebrow">{section.eyebrow}</span>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `admin-nav-row${isActive ? ' active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          IELTSZone · v1.0<br />Bảng điều khiển quản trị
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────────────── */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="d-flex align-items-center gap-2">
            <a
              className="btn-pill btn-pill--ghost"
              href="/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ↗ Xem website
            </a>
            <button
              className="btn-pill btn-pill--dark"
              onClick={() => setShowTutorModal(true)}
            >
              + Thêm Giảng viên
            </button>
          </div>

          <div className="dropdown">
            <button
              className="btn-pill btn-pill--ghost d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="rounded-circle" style={{ width: 24, height: 24, objectFit: 'cover' }} />
              ) : (
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                  style={{ width: 24, height: 24, fontSize: 12, background: '#e02424' }}
                >
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              )}
              <span className="d-none d-sm-inline">{user?.full_name || 'Admin'}</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end rounded-4 shadow border-0 mt-2 p-2" style={{ minWidth: 240 }}>
              <li className="px-3 py-2">
                <div className="body-md-strong text-truncate">{user?.full_name || 'Quản trị viên'}</div>
                <div className="caption text-secondary text-truncate">{user?.email || ''}</div>
                <span className="pill pill--admin mt-2">{user?.role || 'admin'}</span>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li><Link className="dropdown-item rounded-3 py-2" to="/admin/profile">Hồ sơ cá nhân</Link></li>
              <li><button className="dropdown-item rounded-3 py-2" onClick={() => setShowPwdModal(true)}>Đổi mật khẩu</button></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item rounded-3 py-2 text-danger" onClick={handleLogout}>Đăng xuất</button></li>
            </ul>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          <span>© {new Date().getFullYear()} IELTSZone — Nền tảng luyện thi IELTS trực tuyến.</span>
          <span className="admin-data-note">Đăng nhập với vai trò Admin</span>
        </footer>
      </div>

      <CreateTutorModal
        isOpen={showTutorModal}
        onClose={() => setShowTutorModal(false)}
        onSuccess={() => navigate('/admin/users')}
      />
      <ChangePwdModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </div>
  );
};

export default AdminLayout;
