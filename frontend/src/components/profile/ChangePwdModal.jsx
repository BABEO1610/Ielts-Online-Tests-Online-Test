import React, { useState } from 'react';
import api from '../../services/api';

const ChangePwdModal = ({ isOpen, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const isPasswordMatch = confirmPassword === '' || newPassword === confirmPassword;
  const isPasswordStrong = newPassword.length === 0 || newPassword.length >= 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });

      setSuccessMsg('Đổi mật khẩu thành công! Cửa sổ sẽ tự đóng...');
      
      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto close after 2s
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2000);
      
    } catch (error) {
      const message = error.response?.data?.error?.message || error.response?.data?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="modal-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        tabIndex="-1" 
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content rounded-4 shadow-lg border-0">
            <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
              <h1 className="modal-title fs-4 fw-bold">Đổi mật khẩu</h1>
              <button 
                type="button" 
                className="btn-close shadow-none" 
                onClick={onClose}
                disabled={loading || successMsg}
              ></button>
            </div>
            
            <div className="modal-body p-4">
              {successMsg && (
                <div className="alert alert-success d-flex align-items-center mb-4 rounded-3 shadow-sm" role="alert">
                  <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                  <div>{successMsg}</div>
                </div>
              )}
              
              {errorMsg && (
                <div className="alert alert-danger d-flex align-items-center mb-4 rounded-3 shadow-sm" role="alert">
                  <i className="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                  <div>{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label className="form-label fw-medium text-dark">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    className="form-control form-control-lg rounded-3 bg-light border-0"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    required
                    disabled={successMsg !== ''}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium text-dark">Mật khẩu mới</label>
                  <input
                    type="password"
                    className={`form-control form-control-lg rounded-3 bg-light border-0 ${!isPasswordStrong ? 'is-invalid' : ''}`}
                    placeholder="Tối thiểu 8 ký tự"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    required
                    disabled={successMsg !== ''}
                  />
                  {!isPasswordStrong && (
                    <div className="invalid-feedback fw-medium">
                      Mật khẩu phải có ít nhất 8 ký tự.
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label fw-medium text-dark">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    className={`form-control form-control-lg rounded-3 bg-light border-0 ${!isPasswordMatch ? 'is-invalid' : ''}`}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    required
                    disabled={successMsg !== ''}
                  />
                  {!isPasswordMatch && (
                    <div className="invalid-feedback fw-medium">
                      Mật khẩu xác nhận không khớp.
                    </div>
                  )}
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-dark btn-lg rounded-pill fw-bold text-white shadow-sm"
                    disabled={loading || !oldPassword || !newPassword || !isPasswordMatch || !isPasswordStrong || successMsg !== ''}
                    style={{ backgroundColor: '#000000' }}
                  >
                    {loading ? 'Đang xử lý...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChangePwdModal;
