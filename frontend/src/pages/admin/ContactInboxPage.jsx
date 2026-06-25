import React, { useEffect, useState, useCallback } from 'react';
import { fetchContacts, updateContactStatus } from '../../services/adminOps.service';
import { formatDateTime } from '../../utils/adminFormat';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chưa xử lý' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'resolved', label: 'Đã giải quyết' },
  { key: 'unresolved', label: 'Từ chối' },
];

const STATUS_LABELS = {
  pending: { label: 'Chưa xử lý', className: 'pill--warning' },
  in_progress: { label: 'Đang xử lý', className: 'bg-info text-white' },
  resolved: { label: 'Đã giải quyết', className: 'pill--success' },
  unresolved: { label: 'Từ chối', className: 'bg-danger text-white' }
};

const ContactInboxPage = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({
    status: 'resolved',
    reply_message: '',
    admin_notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchContacts();
    // Default to empty array if no contacts
    setRows(res.data || []);
    setIsSample(res.isSample);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpenModal = (contact) => {
    setSelectedContact(contact);
    setFormData({
      status: contact.status === 'pending' ? 'in_progress' : contact.status,
      reply_message: contact.reply_message || '',
      admin_notes: contact.admin_notes || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContact(null);
  };

  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateContactStatus(selectedContact.id, formData);
      setRows((prev) => prev.map((r) => (r.id === selectedContact.id ? { ...r, ...formData } : r)));
      handleCloseModal();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visible = rows.filter((r) =>
    filter === 'all' ? true : r.status === filter);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Hộp thư liên hệ</h1>
          <p className="body-sm text-secondary m-0">Xử lý yêu cầu hỗ trợ gửi từ form liên hệ.</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API contacts)</span>}
      </div>

      <div className="stat-grid mb-4">
        <div 
          className={`stat-card ${filter === 'pending' ? 'stat-card--dark' : ''}`}
          onClick={() => setFilter('pending')}
          style={{ cursor: 'pointer' }}
        >
          <span className="stat-card__label">Chưa xử lý</span>
          <span className="stat-card__value">{rows.filter((r) => r.status === 'pending').length}</span>
        </div>
        <div 
          className={`stat-card ${filter === 'in_progress' ? 'stat-card--dark' : ''}`}
          onClick={() => setFilter('in_progress')}
          style={{ cursor: 'pointer' }}
        >
          <span className="stat-card__label">Đang xử lý</span>
          <span className="stat-card__value">{rows.filter((r) => r.status === 'in_progress').length}</span>
        </div>
        <div 
          className={`stat-card ${['resolved', 'unresolved'].includes(filter) ? 'stat-card--dark' : ''}`}
          onClick={() => setFilter('resolved')}
          style={{ cursor: 'pointer' }}
        >
          <span className="stat-card__label">Đã hoàn tất</span>
          <span className="stat-card__value">{rows.filter((r) => r.status === 'resolved' || r.status === 'unresolved').length}</span>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} className={`btn-pill ${filter === f.key ? 'btn-pill--dark' : 'btn-pill--ghost'}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead><tr><th>Người gửi</th><th>Email</th><th>Chủ đề</th><th>Thời gian</th><th>Trạng thái</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4 text-secondary">Đang tải…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-secondary">Không có liên hệ nào.</td></tr>
              ) : (
                visible.map((r) => {
                  const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS['pending'];
                  return (
                    <React.Fragment key={r.id}>
                      <tr>
                        <td className="fw-semibold">{r.name}</td>
                        <td className="text-secondary">{r.email}</td>
                        <td>{r.subject}</td>
                        <td className="text-secondary">{formatDateTime(r.created_at)}</td>
                        <td>
                          <span className={`pill ${statusInfo.className}`}>{statusInfo.label}</span>
                        </td>
                        <td className="text-end">
                          <button className="btn-pill btn-pill--ghost me-2" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                            {openId === r.id ? 'Ẩn' : 'Xem'}
                          </button>
                          <button className="btn-pill btn-pill--dark" onClick={() => handleOpenModal(r)}>
                            Duyệt
                          </button>
                        </td>
                      </tr>
                      {openId === r.id && (
                        <tr>
                          <td colSpan={6} className="text-secondary" style={{ background: 'var(--canvas-softer)' }}>
                            <div className="mb-2"><strong>Nội dung câu hỏi:</strong><br />{r.message}</div>
                            {r.admin_notes && <div className="mb-2"><strong>Ghi chú nội bộ:</strong><br />{r.admin_notes}</div>}
                            {r.reply_message && <div><strong>Câu trả lời cho học viên:</strong><br />{r.reply_message}</div>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Status Modal */}
      {showModal && selectedContact && (
        <div className="modal-backdrop d-flex align-items-center justify-content-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white rounded-4 p-4 shadow-lg" style={{ width: '90%', maxWidth: '500px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="h5 fw-bold m-0">Cập nhật liên hệ</h3>
              <button className="btn-close" onClick={handleCloseModal}></button>
            </div>
            
            <form onSubmit={handleSubmitStatus}>
              <div className="mb-3">
                <label className="form-label fw-medium">Trạng thái</label>
                <select 
                  className="form-select rounded-3" 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="pending">Chưa xử lý (Pending)</option>
                  <option value="in_progress">Đang xử lý (In Progress)</option>
                  <option value="resolved">Đã giải quyết (Resolved)</option>
                  <option value="unresolved">Từ chối / Đóng (Unresolved)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-medium">Ghi chú nội bộ (Chỉ Admin thấy)</label>
                <textarea 
                  className="form-control rounded-3" 
                  rows="2"
                  placeholder="Note lại quá trình điều tra (nếu có)..."
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({...formData, admin_notes: e.target.value})}
                ></textarea>
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium">Câu trả lời (Gửi học viên)</label>
                <textarea 
                  className="form-control rounded-3" 
                  rows="3"
                  placeholder="Nhập nội dung trả lời..."
                  value={formData.reply_message}
                  onChange={(e) => setFormData({...formData, reply_message: e.target.value})}
                ></textarea>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light rounded-pill px-4" onClick={handleCloseModal}>Hủy</button>
                <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInboxPage;
