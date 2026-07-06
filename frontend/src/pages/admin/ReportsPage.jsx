import { useEffect, useState } from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { exportReportCsv, fetchReport } from '../../services/adminOps.service';
import { formatDate, formatNumber } from '../../utils/adminFormat';

const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchReport();
        if (!alive) return;
        setReport(res.data);
        setError('');
      } catch (err) {
        if (!alive) return;
        setError(err.response?.data?.error?.message || 'Không thể tải báo cáo.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportReportCsv(report?.range || {});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không thể xuất CSV.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="text-secondary py-5 text-center">Đang tải báo cáo...</div>;
  if (error && !report) return <div className="admin-error-banner"><span>{error}</span></div>;

  const rows = report?.daily || [];
  const summary = report?.summary || { newUsers: 0, attempts: 0, aiCalls: 0, submissions: 0 };
  const chartData = rows.map((r) => ({ ...r, label: formatDate(r.date) }));

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Báo cáo &amp; xuất dữ liệu</h1>
          <p className="body-sm text-secondary m-0">Số liệu sử dụng theo ngày từ dữ liệu thật của hệ thống.</p>
        </div>
        <button className="btn-pill btn-pill--dark" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Đang xuất...' : 'Xuất CSV'}
        </button>
      </div>
      {error && <div className="admin-error-banner mb-3"><span>{error}</span></div>}

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Người dùng mới</span><span className="stat-card__value">{formatNumber(summary.newUsers || 0)}</span></div>
        <div className="stat-card"><span className="stat-card__label">Lượt làm bài</span><span className="stat-card__value">{formatNumber(summary.attempts || 0)}</span></div>
        <div className="stat-card"><span className="stat-card__label">Lượt gọi AI</span><span className="stat-card__value">{formatNumber(summary.aiCalls || 0)}</span></div>
        <div className="stat-card"><span className="stat-card__label">Bài nộp</span><span className="stat-card__value">{formatNumber(summary.submissions || 0)}</span></div>
      </div>

      <div className="admin-card mb-4">
        <div className="admin-card__header"><h2 className="admin-card__title">Xu hướng sử dụng</h2></div>
        <div className="admin-card__body">
          {rows.length === 0 ? (
            <div className="text-secondary text-center py-5">Chưa có dữ liệu.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efefef" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attempts" name="Lượt làm bài" stroke="#000000" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="aiCalls" name="Lượt gọi AI" stroke="#1c4ed8" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="submissions" name="Bài nộp" stroke="#b06f00" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card__header"><h2 className="admin-card__title">Chi tiết theo ngày</h2></div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead><tr><th>Ngày</th><th className="text-end">Người dùng mới</th><th className="text-end">Lượt làm bài</th><th className="text-end">Lượt gọi AI</th><th className="text-end">AI Tokens</th><th className="text-end">Bài nộp</th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-secondary py-4">Chưa có dữ liệu.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.date}>
                  <td className="fw-semibold">{formatDate(r.date)}</td>
                  <td className="text-end">{formatNumber(r.newUsers)}</td>
                  <td className="text-end">{formatNumber(r.attempts)}</td>
                  <td className="text-end">{formatNumber(r.aiCalls)}</td>
                  <td className="text-end">{formatNumber(r.aiTokens)}</td>
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
