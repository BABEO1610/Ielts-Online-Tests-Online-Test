import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CreateTutorModal from '../admin/CreateTutorModal';

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showTutorModal, setShowTutorModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top px-3 px-md-5 py-3">
      <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-4">
          <Link className="navbar-brand fw-bold text-danger fs-4 m-0" to="/admin" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            IELTSZone Admin
          </Link>
          <button 
            className="btn btn-sm btn-outline-danger rounded-pill fw-medium px-3 d-none d-md-block"
            onClick={() => setShowTutorModal(true)}
          >
            + Thêm Giảng viên
          </button>
        </div>

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
              <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
            )}
            <span className="d-none d-sm-inline">{user?.full_name || 'Admin'}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end rounded-4 shadow border-0 mt-2 p-2">
            <li><Link className="dropdown-item rounded-3 py-2" to="/profile">Hồ sơ cá nhân</Link></li>
            <li><hr className="dropdown-divider" /></li>
            <li><button className="dropdown-item rounded-3 py-2 text-danger" onClick={handleLogout}>Đăng xuất</button></li>
          </ul>
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
    </nav>
  );
};

export default AdminNavbar;
