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
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-white py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5">
            <div className="card shadow-sm rounded-3 border-0 bg-light">
              <div className="card-body p-4 p-md-5">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthLayout;
