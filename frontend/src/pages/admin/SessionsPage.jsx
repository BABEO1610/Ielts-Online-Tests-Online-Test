import React, { useEffect, useState, useCallback } from 'react';
import { fetchSessions, revokeSession } from '../../services/adminOps.service';
import { formatDateTime } from '../../utils/adminFormat';

const SessionsPage = () => {
  const [rows, setRows] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchSessions();
    setRows(res.data);
    setIsSample(res.isSample);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRevoke = async (id) => {
    setBusyId(id);
    await revokeSession(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setBusyId(null);
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Phiên đăng nhập &amp; thiết bị</h1>
          <p className="body-sm text-secondary m-0">Xem các phiên đang hoạt động và thu hồi khi phát hiện bất thường (safety S-04/S-05).</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API sessions)</span>}
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Phiên đang hoạt động</span><span className="stat-card__value">{rows.length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Đăng nhập OAuth</span><span className="stat-card__value">{rows.filter((r) => r.is_oauth).length}</span></div>
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead><tr><th>Người dùng</th><th>Email</th><th>Thiết bị</th><th>IP</th><th>Đăng nhập</th><th>Hoạt động gần nhất</th><th>Hết hạn</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4 text-secondary">Đang tải…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-secondary">Không có phiên hoạt động.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">{r.user}</td>
                    <td className="text-secondary">{r.email}</td>
                    <td>{r.device}</td>
                    <td className="text-secondary"><code>{r.ip}</code></td>
                    <td>
                      {r.is_oauth
                        ? <span className="pill pill--info text-capitalize">{r.provider}</span>
                        : <span className="pill pill--neutral">Mật khẩu</span>}
                    </td>
                    <td className="text-secondary">{formatDateTime(r.last_active_at)}</td>
                    <td className="text-secondary">{formatDateTime(r.expires_at)}</td>
                    <td className="text-end">
                      <button className="btn-pill btn-pill--ghost" disabled={busyId === r.id} onClick={() => onRevoke(r.id)}>
                        {busyId === r.id ? 'Đang thu hồi…' : 'Thu hồi'}
                      </button>
                    </td>
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

export default SessionsPage;
