import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Component: AuthLayout
 * Trách nhiệm: Component bao bọc (wrapper) căn giữa màn hình cho các trang đăng nhập, đăng ký.
 * 
 * // EARS[State]: WHILE rendering auth pages, THE system SHALL wrap children in a centered layout.
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
      <Link
        to="/"
        className="btn btn-light position-fixed top-0 start-0 m-3 m-md-4 shadow border-0 rounded-pill d-flex align-items-center justify-content-center px-3 px-md-4"
        style={{ height: '48px', zIndex: 1050 }}
      >
        <span className="fw-medium">Trang chủ</span>
      </Link>

      <div className="auth-card-wrapper">
        <div className="card-content">
          {children}
        </div>
      </div>
    </div>
  );
};

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthLayout;
