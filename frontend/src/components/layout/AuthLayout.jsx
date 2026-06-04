import React from 'react';
import PropTypes from 'prop-types';

/**
 * Component: AuthLayout
 * Trách nhiệm: Component bao bọc (wrapper) căn giữa màn hình cho các trang đăng nhập, đăng ký.
 * 
 * // EARS[State]: WHILE rendering auth pages, THE system SHALL wrap children in a centered layout.
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
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
