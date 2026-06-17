import { useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePwdModal from '../components/profile/ChangePwdModal';
import '../styles/admin.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'My Dashboard', icon: 'bi-house' },
  { to: '/prep', label: 'My IELTS Prep Services', icon: 'bi-cart' },
  { to: '/lessons', label: 'My Live Lessons', icon: 'bi-play-btn' },
  { to: '/history', label: 'Practice Test History', icon: 'bi-clock-history' },
  { to: '/wallet', label: 'My Wallet', icon: 'bi-wallet2' },
  { to: '/profile', label: 'My Profile', icon: 'bi-person', suffix: '+' },
  { to: '/referral', label: 'Referral', icon: 'bi-share', suffix: '+' },
];

const WORKSPACE_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-house-door' },
  { to: '/profile', label: 'My Profile', icon: 'bi-person', primary: true },
  { to: '/practice-history', label: 'Practice History', icon: 'bi-clock-history' },
  { to: '/study-plan', label: 'Study Plan', icon: 'bi-calendar3' },
  { to: '/profile', label: 'Settings', icon: 'bi-gear', noActive: true },
];

const WORKSPACE_PATHS = ['/profile', '/practice-history', '/study-plan'];

const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPwdModal, setShowPwdModal] = useState(false);
  const isProfileWorkspace = WORKSPACE_PATHS.includes(location.pathname);

  const workspaceTitle =
    location.pathname === '/practice-history' ? 'Practice History Workspace'
      : location.pathname === '/study-plan' ? 'Study Plan Workspace'
        : 'Profile Workspace';

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
      <aside className="admin-sidebar student-sidebar">
        <Link to="/profile" className="student-brand">
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#e11d48' }}>
            <span className="text-white fw-bold fs-5">iot</span>
          </div>
          <span className="student-brand__wordmark">IELTS<span>Zone</span></span>
        </Link>
        
        <nav className="admin-sidebar__nav student-sidebar-nav">
          {isProfileWorkspace ? WORKSPACE_NAV_ITEMS.map((item) => {
            const active = !item.noActive && location.pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`admin-nav-row student-section-nav ${active ? 'active' : ''}`}
              >
                <div className="d-flex align-items-center gap-3">
                  <i className={`bi ${item.icon} fs-5`}></i>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          }) : NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => `admin-nav-row d-flex justify-content-between align-items-center ${isActive ? ' active' : ''}`}
              style={({ isActive }) => ({
                borderRadius: '12px',
                padding: '12px 16px',
                backgroundColor: isActive ? '#e0f2fe' : 'transparent',
                color: isActive ? '#0369a1' : '#475569',
                borderLeft: 'none',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.2s ease'
              })}
            >
              <div className="d-flex align-items-center gap-3">
                <i className={`bi ${item.icon} fs-5`}></i>
                <span style={{ fontSize: '15px' }}>{item.label}</span>
              </div>
              {item.suffix && <span className="fs-5 fw-medium" style={{ color: '#94a3b8' }}>{item.suffix}</span>}
            </NavLink>
          ))}
        </nav>

        {isProfileWorkspace && (
          <div className="student-help-card">
            <div>
              <i className="bi bi-headset"></i>
            </div>
            <div>
              <strong>Cần hỗ trợ?</strong>
              <span>Liên hệ đội ngũ IELTSZone</span>
            </div>
            <i className="bi bi-chevron-right"></i>
          </div>
        )}
      </aside>

      {/* ── Main column ───────────────────────────────────────── */}
      <div className="admin-main bg-light">
        <header className="admin-topbar student-topbar">
          <div className="student-topbar__copy">
            <span>IELTSZone Student</span>
            <strong>{isProfileWorkspace ? workspaceTitle : 'Learning Workspace'}</strong>
          </div>
          {isProfileWorkspace && (
            <div className="student-search">
              <i className="bi bi-search"></i>
              <input type="search" placeholder="Tìm kiếm bài học, đề thi, tài liệu..." />
            </div>
          )}
          <div className="d-flex align-items-center gap-4">
            <div className="position-relative cursor-pointer">
              <span className="student-bell">
                <i className="bi bi-bell fs-4"></i>
                <b>3</b>
              </span>
            </div>
            <div className="dropdown">
              <button
                className="student-user-menu"
                type="button"
                data-bs-toggle="dropdown"
              >
                <span>{(user?.full_name || 'U').charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{user?.full_name || 'Học viên'}</strong>
                  <small>{user?.role || 'Student'}</small>
                </div>
                <i className="bi bi-chevron-down"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end rounded-4 shadow border-0 mt-2 p-2" style={{ minWidth: 200 }}>
                <li className="px-3 py-2">
                  <div className="body-md-strong text-truncate">{user?.full_name || 'Học viên'}</div>
                  <div className="caption text-secondary text-truncate">{user?.email || ''}</div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item rounded-3 py-2" to="/profile">Hồ sơ cá nhân</Link></li>
                <li><button className="dropdown-item rounded-3 py-2" onClick={() => setShowPwdModal(true)}>Đổi mật khẩu</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item rounded-3 py-2 text-danger" onClick={handleLogout}>Đăng xuất</button></li>
              </ul>
            </div>
          </div>
        </header>

        <main className="admin-content" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: 0 }}>
          <Outlet />
        </main>

        <footer className="admin-footer student-footer">
          <span>&copy; {new Date().getFullYear()} IELTSZone. All rights reserved.</span>
          <div className="student-footer__links">
            <Link to="/profile">My Profile</Link>
            <Link to="/practice-history">Practice History</Link>
            <Link to="/study-plan">Study Plan</Link>
          </div>
        </footer>
      </div>

      <ChangePwdModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </div>
  );
};

export default StudentLayout;
