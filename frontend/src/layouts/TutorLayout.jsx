import { useState } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePwdModal from '../components/profile/ChangePwdModal';

const SIDEBAR_WIDTH = 220;

const getInitials = (name = '') =>
  name.split(' ').slice(-1)[0]?.charAt(0)?.toUpperCase() || '?';

const SidebarLink = ({ to, label, badge }) => (
  <NavLink
    to={to}
    end
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 14px',
      borderRadius: '10px',
      textDecoration: 'none',
      fontSize: '14px',
      fontFamily: 'UberMoveText, system-ui, sans-serif',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? '#000' : '#5e5e5e',
      backgroundColor: isActive ? '#f0f0f0' : 'transparent',
      transition: 'background 0.15s ease, color 0.15s ease',
    })}
    onMouseEnter={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.backgroundColor = '#f7f7f7'; }}
    onMouseLeave={e => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    <span style={{ flex: 1 }}>{label}</span>
    {badge != null && (
      <span
        style={{
          backgroundColor: '#000', color: '#fff',
          fontSize: '11px', fontWeight: 700,
          borderRadius: '999px', padding: '1px 7px',
          lineHeight: '18px',
        }}
      >
        {badge}
      </span>
    )}
  </NavLink>
);

const SidebarSection = ({ title, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <p style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '1px',
      color: '#aaa', textTransform: 'uppercase',
      padding: '8px 14px 4px', margin: 0,
      fontFamily: 'UberMoveText, system-ui, sans-serif',
    }}>
      {title}
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {children}
    </div>
  </div>
);

const TutorSidebar = () => {
  return (
    <aside
      style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: `${SIDEBAR_WIDTH}px`,
        backgroundColor: '#fff',
        borderRight: '1px solid #e8e8e8',
        overflowY: 'auto',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 10px',
        fontFamily: 'UberMoveText, system-ui, sans-serif',
      }}
    >
      <div style={{ flex: 1 }}>
        {/* Logo */}
        <Link
          to="/tutor/dashboard"
          style={{ textDecoration: 'none', padding: '4px 14px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span style={{
            fontFamily: 'UberMove, system-ui, sans-serif',
            fontWeight: 700, fontSize: '20px', color: '#c92a2a', // Màu đỏ giống hình
          }}>
            IELTSZone
          </span>
          <span style={{
            display: 'inline-block',
            backgroundColor: '#000', color: '#fff',
            fontSize: '11px', fontWeight: 700,
            padding: '2px 8px', borderRadius: '999px',
          }}>
            Tutor
          </span>
        </Link>

        {/* TỔNG QUAN */}
        <SidebarSection title="Tổng quan">
          <SidebarLink to="/tutor/dashboard" label="Tổng quan" />
          <SidebarLink to="/tutor/activity-log" label="Nhật ký hoạt động" />
        </SidebarSection>

        {/* CHẤM BÀI */}
        <SidebarSection title="Chấm bài">
          <SidebarLink to="/grading/tutor/queue" label="Hàng chờ chấm" />
          <SidebarLink to="/grading/tutor/schedule" label="Lịch sử chấm" />
          <SidebarLink to="/grading/tutor/ai-reference" label="AI tham khảo" />
        </SidebarSection>

        {/* TÀI NGUYÊN */}
        <SidebarSection title="Tài nguyên">
          <SidebarLink to="/tutor/tests" label="Ngân hàng đề" />
          <SidebarLink to="/tutor/library" label="Thư viện tài liệu" />
        </SidebarSection>

        {/* CÀI ĐẶT */}
        <SidebarSection title="Cài đặt">
          <SidebarLink to="/tutor/profile" label="Cài đặt" />
        </SidebarSection>
      </div>

      <div style={{
        padding: '16px 14px',
        borderTop: '1px solid #e8e8e8',
        fontSize: '11px', color: '#888',
      }}>
        <div style={{ marginBottom: '4px' }}>IELTSZone - v1.0</div>
        <div>Bảng điều khiển quản trị</div>
      </div>
    </aside>
  );
};

const TutorTopbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0, left: `${SIDEBAR_WIDTH}px`, right: 0,
          height: '56px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e8e8e8',
          zIndex: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          fontFamily: 'UberMoveText, system-ui, sans-serif',
        }}
      >
        <div /> {/* Trống bên trái */}

        {/* Right — User dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', border: 'none',
              padding: '4px',
              cursor: 'pointer', fontSize: '14px', fontWeight: 500,
              fontFamily: 'UberMoveText, system-ui, sans-serif',
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url} alt="Avatar"
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: '#1a237e', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700,
              }}>
                {getInitials(user?.full_name)}
              </div>
            )}
            <span style={{ color: '#000', marginLeft: '4px' }}>
              {user?.full_name || 'Huong Duong'}
            </span>
          </button>

          {dropdownOpen && (
            <ul
              onMouseLeave={() => setDropdownOpen(false)}
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: '#fff', border: '1px solid #e2e2e2',
                borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                minWidth: '180px', listStyle: 'none', padding: '6px', margin: 0,
                zIndex: 300,
              }}
            >
              {[
                { label: 'Hồ sơ cá nhân', onClick: () => { setDropdownOpen(false); navigate('/tutor/profile'); } },
                { label: 'Đổi mật khẩu', onClick: () => { setDropdownOpen(false); setShowPwdModal(true); } },
              ].map(item => (
                <li key={item.label}>
                  <button
                    onClick={item.onClick}
                    style={{
                      width: '100%', textAlign: 'left', background: 'none',
                      border: 'none', padding: '9px 12px', borderRadius: '8px',
                      fontSize: '14px', cursor: 'pointer', color: '#000',
                      fontFamily: 'UberMoveText, system-ui, sans-serif',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              <li><hr style={{ margin: '4px 0', borderColor: '#f0f0f0' }} /></li>
              <li>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', padding: '9px 12px', borderRadius: '8px',
                    fontSize: '14px', cursor: 'pointer', color: '#d32f2f',
                    fontFamily: 'UberMoveText, system-ui, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff5f5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Đăng xuất
                </button>
              </li>
            </ul>
          )}
        </div>
      </header>

      <ChangePwdModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </>
  );
};

const TutorLayout = () => {
  return (
    <div style={{ backgroundColor: '#f7f7f7', minHeight: '100vh', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      <TutorSidebar />
      <TutorTopbar />

      <main style={{
        marginLeft: `${SIDEBAR_WIDTH}px`,
        marginTop: '56px',
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default TutorLayout;
