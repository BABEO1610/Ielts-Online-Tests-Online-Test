import React, { useEffect, useState, useCallback } from 'react';
import { fetchChangeLog, revertChange } from '../../services/adminOps.service';
import { formatDateTime, actionLabel, diffValues, displayValue } from '../../utils/adminFormat';

const AdminChangeLogPage = () => {
  const [rows, setRows] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchChangeLog();
    setRows(res.data);
    setIsSample(res.isSample);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRevert = async (row) => {
    setBusy(true);
    await revertChange(row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, reverted: true, revertable: false } : r)));
    setBusy(false);
    setSelected(null);
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Nhật ký duyệt &amp; thay đổi</h1>
          <p className="body-sm text-secondary m-0">Xem chi tiết mọi thay đổi do admin thực hiện và hoàn tác khi cần.</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API change-log)</span>}
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Tổng thay đổi</span><span className="stat-card__value">{rows.length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Có thể hoàn tác</span><span className="stat-card__value">{rows.filter((r) => r.revertable).length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Đã hoàn tác</span><span className="stat-card__value">{rows.filter((r) => r.reverted).length}</span></div>
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead><tr><th>Thời gian</th><th>Admin</th><th>Hành động</th><th>Đối tượng</th><th>Trạng thái</th><th className="text-end">Chi tiết</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4 text-secondary">Đang tải…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-secondary">Chưa có thay đổi nào.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-secondary">{formatDateTime(r.created_at)}</td>
                    <td className="fw-semibold">{r.actor}</td>
                    <td>{actionLabel(r.action)}</td>
                    <td className="text-secondary">{r.target_label}</td>
                    <td>
                      {r.reverted
                        ? <span className="pill pill--neutral">Đã hoàn tác</span>
                        : <span className="pill pill--info">Đang áp dụng</span>}
                    </td>
                    <td className="text-end">
                      <button className="btn-pill btn-pill--ghost" onClick={() => setSelected(r)}>Xem thay đổi</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ChangeDetailModal
          row={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onRevert={() => onRevert(selected)}
        />
      )}
    </div>
  );
};

const ChangeDetailModal = ({ row, busy, onClose, onRevert }) => {
  const diff = diffValues(row.old_value, row.new_value);
  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content rounded-4 border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <div>
                <h5 className="modal-title fw-bold">{actionLabel(row.action)}</h5>
                <div className="caption text-secondary">{row.target_table} · {row.target_label}</div>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={busy} />
            </div>
            <div className="modal-body">
              <div className="caption text-secondary mb-3">
                {formatDateTime(row.created_at)} · bởi <strong>{row.actor}</strong>
              </div>
              <table className="admin-table">
                <thead><tr><th>Trường</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead>
                <tbody>
                  {diff.map((d) => (
                    <tr key={d.field} className={d.changed ? 'row--suspicious' : ''}>
                      <td className="fw-semibold">{d.field}</td>
                      <td className="text-secondary"><code>{displayValue(d.before)}</code></td>
                      <td><code>{displayValue(d.after)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {row.reverted && <div className="api-success-message mt-3">Thay đổi này đã được hoàn tác.</div>}
            </div>
            <div className="modal-footer border-top-0 pt-0">
              <button type="button" className="btn-pill btn-pill--ghost" onClick={onClose} disabled={busy}>Đóng</button>
              {row.revertable && !row.reverted && (
                <button type="button" className="btn-pill btn-pill--dark" onClick={onRevert} disabled={busy}>
                  {busy ? 'Đang hoàn tác…' : '↩ Hoàn tác thay đổi'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminChangeLogPage;
