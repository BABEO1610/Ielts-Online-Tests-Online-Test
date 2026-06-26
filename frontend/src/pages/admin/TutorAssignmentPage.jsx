import React, { useEffect, useState, useCallback } from 'react';
import { fetchTutorAssignments, assignTutor } from '../../services/adminOps.service';

const TutorAssignmentPage = () => {
  const [tutors, setTutors] = useState([]);
  const [rows, setRows] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchTutorAssignments();
    setTutors(res.data.tutors);
    setRows(res.data.assignments);
    setIsSample(res.isSample);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAssign = async (submissionId, type, tutorId) => {
    setBusyId(submissionId);
    const value = tutorId || null;
    await assignTutor(submissionId, type, value);
    setRows((prev) => prev.map((r) => (r.id === submissionId ? { ...r, tutor_id: value } : r)));
    setBusyId(null);
  };

  const unassigned = rows.filter((r) => !r.tutor_id).length;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Phân công giảng viên</h1>
          <p className="body-sm text-secondary m-0">Gán giảng viên phụ trách cho từng bài nộp (Submission).</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (cần bảng phân công ở backend)</span>}
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Bài nộp pending</span><span className="stat-card__value">{rows.length}</span></div>
        <div className="stat-card stat-card--dark"><span className="stat-card__label">Chưa có giảng viên</span><span className="stat-card__value">{unassigned}</span></div>
        <div className="stat-card"><span className="stat-card__label">Giảng viên khả dụng</span><span className="stat-card__value">{tutors.length}</span></div>
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead><tr><th>Bài nộp</th><th>Người nộp</th><th>Mục tiêu band</th><th>Giảng viên phụ trách</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-4 text-secondary">Đang tải…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4 text-secondary">Không có bài nộp nào đang chờ.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className={!r.tutor_id ? 'row--suspicious' : ''}>
                    <td className="fw-semibold text-capitalize">{r.type} <span className="text-secondary fw-normal">(Task/Part {r.task_or_part})</span></td>
                    <td className="text-secondary">{r.student}</td>
                    <td><span className="pill pill--info">{r.target_band ? r.target_band.toFixed(1) : '—'}</span></td>
                    <td style={{ maxWidth: 260 }}>
                      <select
                        className="form-select form-select-sm rounded-pill"
                        value={r.tutor_id || ''}
                        disabled={busyId === r.id}
                        onChange={(e) => onAssign(r.id, r.type, e.target.value)}
                      >
                        <option value="">— Chưa phân công —</option>
                        {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
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

export default TutorAssignmentPage;
