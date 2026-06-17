import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light">
        <div className="spinner-border text-dark mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p className="text-muted fw-medium">Đang xác thực thông tin...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user?.role === 'tutor') {
      return <Navigate to="/tutor/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
