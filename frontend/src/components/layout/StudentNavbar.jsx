import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import ChangePwdModal from '../profile/ChangePwdModal';
import { motion } from 'framer-motion';

const NavItem = ({ to, label, currentPath }) => {
  const isActive = currentPath === to || currentPath.startsWith(to + '/');
  return (
    <li className="nav-item" style={{ position: 'relative' }}>
      <Link 
        className="nav-link fw-medium px-0" 
        to={to} 
        style={{ 
          fontSize: '16px', 
          color: 'var(--ink)',
          opacity: isActive ? 1 : 0.6,
          transition: 'opacity 0.2s ease',
          fontFamily: 'var(--font-text)'
        }}
      >
        {label}
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            style={{
              position: 'absolute',
              bottom: '0px',
              left: 0,
              width: '100%',
              height: '3px',
              backgroundColor: 'var(--primary)',
              borderRadius: '2px'
            }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </Link>
    </li>
  );
};

const StudentNavbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPwdModal, setShowPwdModal] = React.useState(false);

  // EARS[Event]: WHEN the user clicks logout THEN trigger the logout API call and navigate to login.
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
      <div className="container-fluid p-0">
        <Link className="navbar-brand fw-bold fs-4" to="/" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
          IELTSZone
        </Link>

        <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#studentNavbar">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="studentNavbar">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-2 gap-md-4">
            <NavItem to="/listening" label="Listening" currentPath={location.pathname} />
            <NavItem to="/reading" label="Reading" currentPath={location.pathname} />
            <NavItem to="/writing" label="Writing" currentPath={location.pathname} />
            <NavItem to="/speaking" label="Speaking" currentPath={location.pathname} />
            <NavItem to="/library" label="Library" currentPath={location.pathname} />
          </ul>

          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">
            <button
              onClick={toggleTheme}
              className="btn rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px', backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)', border: 'none' }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
            </button>

            {(user?.role === 'admin' || user?.role === 'tutor') && (
              <Link
                to={user.role === 'admin' ? '/admin' : '/tutor/dashboard'}
                className="btn rounded-pill px-4 py-2 fw-medium border-0 shadow-sm"
                style={{ fontSize: '15px', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-text)' }}
              >
                Về bảng điều khiển
              </Link>
            )}
            {user ? (
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
                      {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="d-none d-sm-inline text-truncate" style={{ maxWidth: '140px' }}>
                    {user?.full_name || 'Học viên'}
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end rounded-4 shadow border-0 mt-2 p-2" style={{ backgroundColor: 'var(--canvas)' }}>
                  <li><Link className="dropdown-item rounded-3 py-2" to="/profile" style={{ color: 'var(--ink)' }}>Hồ sơ cá nhân</Link></li>
                  <li><Link className="dropdown-item rounded-3 py-2" to="/practice-history" style={{ color: 'var(--ink)' }}>Lịch sử làm bài</Link></li>
                  <li><button className="dropdown-item rounded-3 py-2" onClick={() => setShowPwdModal(true)} style={{ color: 'var(--ink)' }}>Đổi mật khẩu</button></li>
                  <li><hr className="dropdown-divider" style={{ borderColor: 'var(--surface-pressed)' }} /></li>
                  <li><button className="dropdown-item rounded-3 py-2 text-danger" onClick={handleLogout}>Đăng xuất</button></li>
                </ul>
              </div>
            ) : (
              // EARS[Event]: WHEN user is not logged in THEN show login/register options
              <>
                <Link
                  to="/login"
                  className="btn rounded-pill px-4 py-2 fw-medium border-0"
                  style={{ backgroundColor: 'var(--canvas-soft)', color: 'var(--ink)', fontSize: '15px' }}
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="btn rounded-pill px-4 py-2 fw-medium border-0"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', fontSize: '15px' }}
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <ChangePwdModal
        isOpen={showPwdModal}
        onClose={() => setShowPwdModal(false)}
      />
    </nav>
  );
};

export default StudentNavbar;
