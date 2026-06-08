import React, { useEffect, useState, useCallback } from 'react';
import { fetchContacts, resolveContact } from '../../services/adminOps.service';
import { formatDateTime } from '../../utils/adminFormat';

const FILTERS = [
  { key: 'unresolved', label: 'Chưa xử lý' },
  { key: 'resolved', label: 'Đã xử lý' },
  { key: 'all', label: 'Tất cả' },
];

const ContactInboxPage = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('unresolved');
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchContacts();
    setRows(res.data);
    setIsSample(res.isSample);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onResolve = async (id) => {
    await resolveContact(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, resolved: true } : r)));
  };

  const visible = rows.filter((r) =>
    filter === 'all' ? true : filter === 'resolved' ? r.resolved : !r.resolved);

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
        <div className="stat-card stat-card--dark"><span className="stat-card__label">Chưa xử lý</span><span className="stat-card__value">{rows.filter((r) => !r.resolved).length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Đã xử lý</span><span className="stat-card__value">{rows.filter((r) => r.resolved).length}</span></div>
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
                visible.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td className="fw-semibold">{r.name}</td>
                      <td className="text-secondary">{r.email}</td>
                      <td>{r.subject}</td>
                      <td className="text-secondary">{formatDateTime(r.created_at)}</td>
                      <td>
                        {r.resolved
                          ? <span className="pill pill--success">Đã xử lý</span>
                          : <span className="pill pill--warning">Chưa xử lý</span>}
                      </td>
                      <td className="text-end">
                        <button className="btn-pill btn-pill--ghost me-2" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                          {openId === r.id ? 'Ẩn' : 'Xem'}
                        </button>
                        {!r.resolved && (
                          <button className="btn-pill btn-pill--dark" onClick={() => onResolve(r.id)}>Đánh dấu đã xử lý</button>
                        )}
                      </td>
                    </tr>
                    {openId === r.id && (
                      <tr>
                        <td colSpan={6} className="text-secondary" style={{ background: 'var(--canvas-softer)' }}>
                          <strong>Nội dung:</strong> {r.message}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContactInboxPage;
