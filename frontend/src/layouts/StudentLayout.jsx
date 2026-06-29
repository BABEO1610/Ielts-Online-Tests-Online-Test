import { useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePwdModal from '../components/profile/ChangePwdModal';
import '../styles/admin.css';

const NAV_ITEMS = [
  { to: '/practice-history', label: 'Practice Test History', icon: 'bi-clock-history' },
  { to: '/profile', label: 'My Profile', icon: 'bi-person', suffix: '+' },
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
        <Link to="/" className="student-brand">
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: '#e11d48' }}>
            <span className="text-white fw-bold fs-5">iot</span>
          </div>
          <span className="student-brand__wordmark">IELTS<span>Zone</span></span>
        </Link>
        
        <nav className="admin-sidebar__nav student-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`admin-nav-item student-nav-item ${isActive ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span className="ms-3 flex-grow-1">{item.label}</span>
                {item.suffix && <span className="student-nav-suffix">{item.suffix}</span>}
              </Link>
            );
          })}
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
                <li><Link className="dropdown-item py-2" to="/profile"><i className="bi bi-person me-2"></i> Hồ sơ cá nhân</Link></li>
                <li><Link className="dropdown-item py-2" to="/practice-history"><i className="bi bi-clock-history me-2"></i> Lịch sử làm bài</Link></li>
                <li><button className="dropdown-item py-2" onClick={() => setShowPwdModal(true)}><i className="bi bi-shield-lock me-2"></i> Đổi mật khẩu</button></li>
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
            <Link to="/study-plan">Process Tracking</Link>
          </div>
        </footer>
      </div>

      <ChangePwdModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </div>
  );
};

export default StudentLayout;
