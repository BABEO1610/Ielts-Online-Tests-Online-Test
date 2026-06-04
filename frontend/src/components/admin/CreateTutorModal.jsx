import React, { useState } from 'react';
import api from '../../services/api';

const CreateTutorModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Tạo tài khoản thông thường (Student, Pending)
      try {
        await api.post('/auth/register', formData);
      } catch (postError) {
        if (postError.response && (postError.response.status === 400 || postError.response.status === 409)) {
          throw postError; // Ném lại lỗi nếu email đã tồn tại hoặc format sai
        }
        console.warn('Bỏ qua lỗi gửi email từ backend:', postError.message);
      }

      // 2. Tìm ID của tài khoản vừa tạo
      let foundId = null;
      let page = 1;
      let totalPages = 1;

      while (!foundId && page <= totalPages) {
        // Thêm Date.now() để chống browser cache GET request
        const res = await api.get(`/admin/users?limit=50&page=${page}&t=${Date.now()}`);
        const users = res.data.data || [];
        const meta = res.data.meta || {};
        // Tính totalPages vì API chỉ trả về meta.total và meta.limit
        const total = meta.total || 0;
        const limit = meta.limit || 50;
        totalPages = Math.ceil(total / limit) || 1;

        const searchEmail = formData.email.toLowerCase().trim();
        // Kiểm tra email không phân biệt hoa thường
        const user = users.find(u => u.email.toLowerCase().trim() === searchEmail);
        if (user) {
          foundId = user.id;
          break;
        }
        page++;
      }

      if (!foundId) {
        throw new Error('Đã tạo tài khoản nhưng không tìm thấy ID để cập nhật quyền.');
      }

      // 3. Cập nhật Role thành Tutor và Status thành Active
      await api.put(`/admin/users/${foundId}/role`, { role: 'tutor' });
      await api.put(`/admin/users/${foundId}/status`, { status: 'active' });

      setSuccessMsg('Đã tạo tài khoản Giảng viên (Tutor) thành công!');
      setFormData({ email: '', password: '', full_name: '' });
      if (onSuccess) onSuccess();

      // Auto close after 2s
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 2000);

    } catch (error) {
      setErrorMsg(error.response?.data?.error?.message || error.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content rounded-4 border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold">Thêm Giảng viên mới</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
            </div>
            <div className="modal-body">
              {errorMsg && <div className="alert alert-danger py-2 rounded-3 text-sm">{errorMsg}</div>}
              {successMsg && <div className="alert alert-success py-2 rounded-3 text-sm">{successMsg}</div>}

              <form onSubmit={handleSubmit} id="createTutorForm">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small mb-1">Họ và Tên</label>
                  <input type="text" className="form-control" name="full_name" value={formData.full_name} onChange={handleChange} required disabled={loading} placeholder="Nhập tên giảng viên" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small mb-1">Email</label>
                  <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required disabled={loading} placeholder="email@ieltszone.com" />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary small mb-1">Mật khẩu cấp phát</label>
                  <input type="text" className="form-control" name="password" value={formData.password} onChange={handleChange} required disabled={loading} minLength="8" placeholder="Nhập mật khẩu (ít nhất 8 ký tự)" />
                </div>
              </form>
            </div>
            <div className="modal-footer border-top-0 pt-0">
              <button type="button" className="btn btn-light rounded-pill px-4 fw-medium" onClick={onClose} disabled={loading}>Hủy</button>
              <button type="submit" form="createTutorForm" className="btn btn-primary rounded-pill px-4 fw-medium" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateTutorModal;
