import React, { useEffect, useState, useCallback } from 'react';
import { fetchSubmissions, retryGrading } from '../../services/adminOps.service';
import { formatDateTime } from '../../utils/adminFormat';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Đang chờ' },
  { key: 'grading_failed', label: 'Lỗi chấm' },
  { key: 'ai_graded', label: 'AI đã chấm' },
  { key: 'tutor_graded', label: 'Tutor đã chấm' },
];

const STATUS_PILL = {
  pending: 'pill--warning',
  ai_graded: 'pill--info',
  tutor_graded: 'pill--success',
  reviewed: 'pill--success',
  grading_failed: 'pill--danger',
};
const STATUS_LABEL = {
  pending: 'Đang chờ', ai_graded: 'AI đã chấm', tutor_graded: 'Tutor đã chấm',
  reviewed: 'Đã duyệt', grading_failed: 'Lỗi chấm',
};

const GradingOversightPage = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchSubmissions();
    setRows(res.data);
    setIsSample(res.isSample);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRetry = async (row) => {
    setBusyId(row.id);
    await retryGrading(row.type, row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'pending' } : r)));
    setBusyId(null);
  };

  const count = (status) => rows.filter((r) => r.status === status).length;
  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Giám sát chấm bài</h1>
          <p className="body-sm text-secondary m-0">Theo dõi hàng đợi chấm bài và xử lý bài chấm lỗi (IELTS-06).</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API submissions)</span>}
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Đang chờ chấm</span><span className="stat-card__value">{count('pending')}</span></div>
        <div className="stat-card stat-card--dark"><span className="stat-card__label">Lỗi chấm (cần retry)</span><span className="stat-card__value">{count('grading_failed')}</span></div>
        <div className="stat-card"><span className="stat-card__label">AI đã chấm</span><span className="stat-card__value">{count('ai_graded')}</span></div>
        <div className="stat-card"><span className="stat-card__label">Tutor đã chấm</span><span className="stat-card__value">{count('tutor_graded')}</span></div>
      </div>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f.key} className={`btn-pill ${filter === f.key ? 'btn-pill--dark' : 'btn-pill--ghost'}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead><tr><th>Mã</th><th>Học viên</th><th>Kỹ năng</th><th>Người chấm</th><th>Trạng thái</th><th>Nộp lúc</th><th className="text-end">Thao tác</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Đang tải…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Không có bài nộp nào.</td></tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className={r.status === 'grading_failed' ? 'row--suspicious' : ''}>
                    <td className="text-secondary"><code>{r.id}</code></td>
                    <td className="fw-semibold">{r.student}</td>
                    <td>{r.skill}</td>
                    <td><span className="pill pill--neutral text-uppercase">{r.grader}</span></td>
                    <td><span className={`pill ${STATUS_PILL[r.status] || 'pill--neutral'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                    <td className="text-secondary">{formatDateTime(r.submitted_at)}</td>
                    <td className="text-end">
                      {r.status === 'grading_failed' ? (
                        <button className="btn-pill btn-pill--dark" disabled={busyId === r.id} onClick={() => onRetry(r)}>
                          {busyId === r.id ? 'Đang chấm lại…' : 'Chấm lại (AI)'}
                        </button>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
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

export default GradingOversightPage;
