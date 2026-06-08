import React, { useEffect, useState, useCallback } from 'react';
import { fetchActivityLogs } from '../../services/adminStats.service';
import { formatDateTime, actionLabel } from '../../utils/adminFormat';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'normal', label: 'Hành động thường' },
  { key: 'suspicious', label: 'Khả nghi' },
];

const AdminActivityLogPage = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = filter === 'suspicious' ? { severity: 'suspicious' } : {};
    const res = await fetchActivityLogs(params);
    let data = res.data.rows;
    if (filter === 'normal') data = data.filter((r) => r.severity !== 'suspicious');
    setRows(data);
    setIsSample(res.isSample);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const suspiciousCount = rows.filter((r) => r.severity === 'suspicious').length;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Nhật ký hoạt động</h1>
          <p className="body-sm text-secondary m-0">Theo dõi hành động quản trị và phát hiện hành vi bất thường.</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API audit-logs)</span>}
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Bản ghi hiển thị</span><span className="stat-card__value">{rows.length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Hành động khả nghi</span><span className="stat-card__value text-danger">{suspiciousCount}</span></div>
        <div className="stat-card"><span className="stat-card__label">Đăng nhập thất bại</span><span className="stat-card__value">{rows.filter((r) => r.action === 'login_failed').length}</span></div>
      </div>

      {/* Segmented filter */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`btn-pill ${filter === f.key ? 'btn-pill--dark' : 'btn-pill--ghost'}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>IP</th><th>Mức độ</th><th>Ghi chú</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Đang tải…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Không có bản ghi nào.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className={r.severity === 'suspicious' ? 'row--suspicious' : ''}>
                    <td className="text-secondary">{formatDateTime(r.created_at)}</td>
                    <td>{r.actor}</td>
                    <td>{actionLabel(r.action)}</td>
                    <td className="text-secondary">{r.target}</td>
                    <td className="text-secondary"><code>{r.ip || '—'}</code></td>
                    <td>
                      {r.severity === 'suspicious'
                        ? <span className="pill pill--danger">⚠ Khả nghi</span>
                        : <span className="pill pill--neutral">Bình thường</span>}
                    </td>
                    <td className="text-secondary">{r.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminActivityLogPage;
