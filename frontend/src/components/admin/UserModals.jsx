import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const UserModals = ({ selectedUser, onClose, onSuccess }) => {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (selectedUser) {
      setRole(selectedUser.role || '');
      setStatus(selectedUser.status || '');
      setErrorMsg('');
    }
  }, [selectedUser]);

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setErrorMsg('');

    try {
      let updated = false;

      // Update role if changed
      if (role !== selectedUser.role) {
        // EARS[Event]: WHEN an Admin changes the Role of another User, THE system SHALL update the users record and log the action.
        await api.put(`/admin/users/${selectedUser.id}/role`, { role });
        updated = true;
      }

      // Update status if changed
      if (status !== selectedUser.status) {
        // EARS[Event]: WHEN an Admin changes the Status of another User, THE system SHALL update the users record and log the action.
        await api.put(`/admin/users/${selectedUser.id}/status`, { status });
        updated = true;
      }

      if (updated) {
        onSuccess();
        onClose();
      } else {
        onClose(); // No changes made
      }
    } catch (error) {
      // EARS[Unwanted]: WHERE an Admin attempts to modify their own role, THE system SHALL return HTTP 403.
      setErrorMsg(error.response?.data?.error?.message || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedUser) return null;

  return (
    <>
      {/* Bootstrap Modal Backdrop */}
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      
      {/* Modal */}
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content rounded-4 border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold">Quản lý User</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={loading}></button>
            </div>
            <div className="modal-body">
              {errorMsg && <div className="alert alert-danger py-2 rounded-3 text-sm">{errorMsg}</div>}

              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary small mb-1">Email / Tài khoản</label>
                <input type="text" className="form-control bg-light" value={selectedUser.email} disabled />
                <div className="form-text text-muted mt-1">{selectedUser.full_name}</div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary small mb-1">Vai trò (Role)</label>
                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading}>
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold text-secondary small mb-1">Trạng thái (Status)</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>
            <div className="modal-footer border-top-0 pt-0">
              <button type="button" className="btn btn-light rounded-pill px-4 fw-medium" onClick={onClose} disabled={loading}>Hủy</button>
              <button type="button" className="btn btn-primary rounded-pill px-4 fw-medium" onClick={handleUpdate} disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserModals;
