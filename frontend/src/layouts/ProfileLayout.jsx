import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePwdModal from '../components/profile/ChangePwdModal';
import '../styles/profile.css';

const ProfileLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPwdModal, setShowPwdModal] = useState(false);
  
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    
    setIsSubmitting(true);
    
    // Fake API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setContactMessage('');
      
      // reset status after 3s
      setTimeout(() => setSubmitStatus(null), 3000);
    }, 800);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  const navItems = [
    { path: '/profile', label: 'Hồ sơ cá nhân', icon: 'bi-person' },
    { path: '/practice-history', label: 'Lịch sử làm bài', icon: 'bi-clock-history' },
    { path: '/study-plan', label: 'Process Tracking', icon: 'bi-journal-check' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f3f3f3' }}>
      {/* ── Navbar Chung ──────────────────────────────────────────────────────── */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top px-3 px-md-5 py-3">
        <div className="container-fluid p-0">
          <Link className="navbar-brand fw-bold text-dark fs-4" to="/" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            IELTSZone
          </Link>
          <div className="d-flex align-items-center gap-3">
            {user ? (
              <div className="dropdown">
                <button
                  className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0 d-flex align-items-center gap-2"
                  type="button"
                  data-bs-toggle="dropdown"
                  style={{ backgroundColor: '#efefef' }}
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="rounded-circle" style={{ width: '24px', height: '24px', objectFit: 'cover' }} />
                  ) : (
                    <div className="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                      {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="d-none d-sm-inline">{user?.full_name || 'Học viên'}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end rounded-4 shadow border-0 mt-2 p-2">
                  <li><Link className="dropdown-item rounded-3 py-2" to="/profile">Hồ sơ cá nhân</Link></li>
                  <li><Link className="dropdown-item rounded-3 py-2" to="/practice-history">Lịch sử làm bài</Link></li>
                  <li><button className="dropdown-item rounded-3 py-2" onClick={() => setShowPwdModal(true)}>Đổi mật khẩu</button></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item rounded-3 py-2 text-danger" onClick={handleLogout}>Đăng xuất</button></li>
                </ul>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
                  style={{ backgroundColor: '#efefef', fontSize: '15px' }}
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="btn btn-dark rounded-pill px-4 py-2 fw-medium border-0"
                  style={{ fontSize: '15px' }}
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main Content with Sidebar ─────────────────────────────────────────── */}
      <div className="container-fluid flex-grow-1 py-4 px-md-5" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="row g-4">
          <div className="col-lg-3">
            <div className="bg-white rounded-4 p-3 shadow-sm" style={{ position: 'sticky', top: '100px' }}>
              <nav className="d-flex flex-column gap-2">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="d-flex align-items-center px-3 py-3 text-decoration-none rounded-3"
                      style={{
                        backgroundColor: isActive ? '#efefef' : 'transparent',
                        color: '#000',
                        fontWeight: isActive ? 500 : 400,
                        borderLeft: isActive ? '4px solid #000' : '4px solid transparent',
                        transition: 'all 0.2s ease',
                        fontFamily: 'UberMoveText, system-ui, sans-serif',
                        fontSize: '16px'
                      }}
                    >
                      <i className={`bi ${item.icon} fs-5 me-3`} style={{ opacity: isActive ? 1 : 0.6 }}></i>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            {/* Contact Admin Block in Sidebar */}
            <div className="bg-white rounded-4 p-3 shadow-sm mt-3" style={{ position: 'sticky', top: '350px' }}>
              <h3 className="fw-bold mb-2" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '16px', color: '#000' }}>
                <i className="bi bi-chat-dots me-2"></i> Liên hệ Admin
              </h3>
              <p className="text-secondary mb-3" style={{ fontSize: '13px' }}>
                Gặp vấn đề kỹ thuật? Gửi tin nhắn cho quản trị viên.
              </p>
              
              <form onSubmit={handleContactSubmit}>
                <div className="mb-2">
                  <textarea 
                    className="form-control rounded-3" 
                    rows="3" 
                    placeholder="Nhập nội dung..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    style={{ backgroundColor: '#f9f9f9', border: '1px solid #e2e2e2', resize: 'none', fontSize: '13px' }}
                    required
                  ></textarea>
                </div>
                <div>
                  <button 
                    type="submit" 
                    className="btn btn-dark fw-medium rounded-pill w-100 py-1"
                    style={{ fontSize: '13px' }}
                    disabled={isSubmitting || !contactMessage.trim()}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                  </button>
                  {submitStatus === 'success' && (
                    <div className="text-success fw-medium text-center mt-2" style={{ fontSize: '12px' }}>
                      <i className="bi bi-check-circle-fill me-1"></i> Đã gửi!
                    </div>
                  )}
                </div>
              </form>
            </div>
            
          </div>
          <div className="col-lg-9">
            <div className="bg-white rounded-4 shadow-sm h-100" style={{ minHeight: '600px' }}>
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Chung ──────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#000', color: '#fff', padding: '32px' }}>
        <div className="container-fluid px-md-5 text-center text-md-start" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="row g-4">
            <div className="col-md-6">
              <h2 style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px', fontWeight: 700, margin: 0 }}>IELTSZone</h2>
              <p style={{ color: '#afafaf', fontSize: '14px', marginTop: '8px' }}>Nền tảng luyện thi trực tuyến thông minh, tích hợp AI.</p>
            </div>
            <div className="col-md-6 text-md-end text-center d-md-flex align-items-md-end justify-content-md-end">
              <p style={{ color: '#5e5e5e', fontSize: '14px', margin: 0 }}>&copy; {new Date().getFullYear()} IELTSZone. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      <ChangePwdModal isOpen={showPwdModal} onClose={() => setShowPwdModal(false)} />
    </div>
  );
};

export default ProfileLayout;
