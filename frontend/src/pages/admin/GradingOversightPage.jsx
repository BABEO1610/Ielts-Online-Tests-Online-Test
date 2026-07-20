import React, { useEffect, useState, useCallback } from 'react';
import { fetchSubmissions, retryGrading } from '../../services/adminOps.service';
import { formatDateTime } from '../../utils/adminFormat';
import Pagination from '../../components/common/Pagination';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Đang chờ' },
  { key: 'ai_graded', label: 'AI đã chấm' },
  { key: 'tutor_graded', label: 'Tutor đã chấm' },
  { key: 'reviewed', label: 'Đã duyệt' },
];

const STATUS_PILL = {
  pending:      { cls: 'pill--warning', label: 'Đang chờ' },
  ai_graded:    { cls: 'pill--info',    label: 'AI đã chấm' },
  tutor_graded: { cls: 'pill--success', label: 'Tutor đã chấm' },
  reviewed:     { cls: 'pill--success', label: 'Đã duyệt' },
};

const GradingOversightPage = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  
  // Pagination & meta state
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSubmissions({ status: filter, page: currentPage, limit: 10 });
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const onRetry = async (row) => {
    setBusyId(row.id);
    try {
      await retryGrading(row.type, row.id);
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'pending' } : r));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const count = (status) => meta?.counts?.[status] || 0;
  // `rows` is already filtered and paginated by the backend
  const visible = rows;

  const STAT_CARDS = [
    { key: 'pending',      label: 'Đang chờ chấm' },
    { key: 'ai_graded',    label: 'AI đã chấm' },
    { key: 'tutor_graded', label: 'Tutor đã chấm' },
    { key: 'reviewed',     label: 'Đã duyệt' },
  ];

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Giám sát chấm bài</h1>
          <p className="body-sm text-secondary m-0">Theo dõi hàng đợi chấm bài và xử lý bài chấm lỗi (IELTS-06).</p>
        </div>
      </div>

      {/* Stat cards — click to filter */}
      <div className="stat-grid mb-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className={`stat-card ${filter === card.key ? 'stat-card--dark' : ''}`}
            onClick={() => handleFilterChange(filter === card.key ? 'all' : card.key)}
            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <span className="stat-card__label">{card.label}</span>
            <span className="stat-card__value">{count(card.key)}</span>
          </div>
        ))}
      </div>

      {/* Pill filters */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`btn-pill ${filter === f.key ? 'btn-pill--dark' : 'btn-pill--ghost'}`}
            onClick={() => handleFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th><th>Học viên</th><th>Kỹ năng</th>
                <th>Người chấm</th><th>Trạng thái</th><th>Nộp lúc</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Đang tải…</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="text-center py-4 text-danger">{error}</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Không có bài nộp nào.</td></tr>
              ) : (
                visible.map((r) => {
                  const pill = STATUS_PILL[r.status] || { cls: 'pill--neutral', label: r.status };
                  return (
                    <tr key={r.id}>
                      <td className="text-secondary"><code>{r.id?.slice(0, 8)}…</code></td>
                      <td className="fw-semibold">{r.student}</td>
                      <td>{r.skill}</td>
                      <td><span className="pill pill--neutral text-uppercase">{r.grader}</span></td>
                      <td><span className={`pill ${pill.cls}`}>{pill.label}</span></td>
                      <td className="text-secondary">{formatDateTime(r.submitted_at)}</td>
                      <td className="text-end">
                        {r.status === 'pending' ? (
                          <button
                            className="btn-pill btn-pill--dark"
                            disabled={busyId === r.id}
                            onClick={() => onRetry(r)}
                          >
                            {busyId === r.id ? 'Đang chấm lại…' : 'Chấm lại (AI)'}
                          </button>
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <Pagination 
          currentPage={meta.page} 
          totalPages={meta.totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}
    </div>
  );
};

export default GradingOversightPage;
