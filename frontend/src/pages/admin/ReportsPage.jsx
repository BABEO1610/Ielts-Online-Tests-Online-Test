import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { fetchReport } from '../../services/adminOps.service';
import { formatDate, formatNumber } from '../../utils/adminFormat';
import { exportToCsv } from '../../utils/exportCsv';

const CSV_COLUMNS = [
  { key: 'day', label: 'Ngày' },
  { key: 'new_users', label: 'Người dùng mới' },
  { key: 'test_attempts', label: 'Lượt làm bài' },
  { key: 'ai_calls', label: 'Lượt gọi AI' },
  { key: 'submissions', label: 'Bài nộp' },
];

const ReportsPage = () => {
  const [raw, setRaw] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchReport();
      if (!alive) return;
      setRaw(res.data);
      setIsSample(res.isSample);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const chartData = raw.map((r) => ({ ...r, label: formatDate(r.day) }));
  const totals = raw.reduce((acc, r) => ({
    new_users: acc.new_users + r.new_users,
    test_attempts: acc.test_attempts + r.test_attempts,
    ai_calls: acc.ai_calls + r.ai_calls,
    submissions: acc.submissions + r.submissions,
  }), { new_users: 0, test_attempts: 0, ai_calls: 0, submissions: 0 });

  const handleExport = () => {
    const rows = raw.map((r) => ({ ...r, day: formatDate(r.day) }));
    exportToCsv(`bao-cao-su-dung-${new Date().toISOString().slice(0, 10)}.csv`, CSV_COLUMNS, rows);
  };

  if (loading) return <div className="text-secondary py-5 text-center">Đang tải báo cáo…</div>;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Báo cáo &amp; xuất dữ liệu</h1>
          <p className="body-sm text-secondary m-0">Số liệu sử dụng theo ngày (7 ngày gần nhất). Xuất CSV để báo cáo.</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          {isSample && <span className="admin-data-note">● Dữ liệu mẫu</span>}
          <button className="btn-pill btn-pill--dark" onClick={handleExport}>⬇ Xuất CSV</button>
        </div>
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Người dùng mới</span><span className="stat-card__value">{formatNumber(totals.new_users)}</span></div>
        <div className="stat-card"><span className="stat-card__label">Lượt làm bài</span><span className="stat-card__value">{formatNumber(totals.test_attempts)}</span></div>
        <div className="stat-card"><span className="stat-card__label">Lượt gọi AI</span><span className="stat-card__value">{formatNumber(totals.ai_calls)}</span></div>
        <div className="stat-card"><span className="stat-card__label">Bài nộp</span><span className="stat-card__value">{formatNumber(totals.submissions)}</span></div>
      </div>

      <div className="admin-card mb-4">
        <div className="admin-card__header"><h2 className="admin-card__title">Xu hướng sử dụng</h2></div>
        <div className="admin-card__body">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efefef" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="test_attempts" name="Lượt làm bài" stroke="#000000" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="ai_calls" name="Lượt gọi AI" stroke="#1c4ed8" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="submissions" name="Bài nộp" stroke="#b06f00" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card__header"><h2 className="admin-card__title">Chi tiết theo ngày</h2></div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead><tr><th>Ngày</th><th className="text-end">Người dùng mới</th><th className="text-end">Lượt làm bài</th><th className="text-end">Lượt gọi AI</th><th className="text-end">Bài nộp</th></tr></thead>
            <tbody>
              {raw.map((r) => (
                <tr key={r.day}>
                  <td className="fw-semibold">{formatDate(r.day)}</td>
                  <td className="text-end">{formatNumber(r.new_users)}</td>
                  <td className="text-end">{formatNumber(r.test_attempts)}</td>
                  <td className="text-end">{formatNumber(r.ai_calls)}</td>
                  <td className="text-end">{formatNumber(r.submissions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
