import { useEffect, useState } from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import StatCard from '../../components/admin/StatCard';
import { fetchAiUsage } from '../../services/adminStats.service';
import { formatNumber } from '../../utils/adminFormat';

const AdminAiUsagePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchAiUsage();
        if (!alive) return;
        setData(res.data);
        setError('');
      } catch (err) {
        if (!alive) return;
        setError(err.response?.data?.error?.message || 'Không thể tải thống kê AI.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="text-secondary py-5 text-center">Đang tải số liệu AI...</div>;
  if (error) return <div className="admin-error-banner"><span>{error}</span></div>;
  if (!data) return <div className="text-secondary py-5 text-center">Chưa có dữ liệu.</div>;

  const summary = data.summary || {};
  const byDay = data.byDay || [];
  const byFeature = data.byFeature || [];
  const topUsers = data.topUsers || [];

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Thống kê sử dụng AI</h1>
          <p className="body-sm text-secondary m-0">Lượt gọi, token tiêu thụ và phân tích theo từng tính năng.</p>
        </div>
        <span className="admin-data-note">● Dữ liệu thật</span>
      </div>

      <div className="stat-grid mb-4">
        <StatCard dark label="Lượt gọi AI" value={formatNumber(summary.totalCalls || 0)} />
        <StatCard label="Token tiêu thụ" value={formatNumber(summary.totalTokens || 0)} />
        <StatCard label="Người dùng AI" value={formatNumber(summary.aiUsers || 0)} />
        <StatCard label="Token / lượt gọi (TB)" value={formatNumber(summary.avgTokensPerCall || 0)} />
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="admin-card h-100">
            <div className="admin-card__header"><h2 className="admin-card__title">Lượt gọi AI theo ngày</h2></div>
            <div className="admin-card__body">
              {byDay.length === 0 ? (
                <div className="text-secondary text-center py-5">Chưa có dữ liệu.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efefef" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                    <Tooltip />
                    <Line type="monotone" dataKey="calls" stroke="#000000" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="admin-card h-100">
            <div className="admin-card__header"><h2 className="admin-card__title">Theo tính năng</h2></div>
            <div className="admin-card__body d-flex flex-column gap-3">
              {byFeature.length === 0 ? (
                <div className="text-secondary text-center py-5">Chưa có dữ liệu.</div>
              ) : byFeature.map((f) => (
                <div key={f.feature}>
                  <div className="d-flex justify-content-between body-sm mb-1">
                    <span className="fw-semibold">{f.label}</span>
                    <span className="text-secondary">{f.percentage}%</span>
                  </div>
                  <div className="mini-bar"><div className="mini-bar__fill" style={{ width: `${f.percentage}%` }} /></div>
                  <div className="caption text-secondary mt-1">{formatNumber(f.calls)} lượt · {formatNumber(f.tokens)} tokens</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card mt-4">
        <div className="admin-card__header"><h2 className="admin-card__title">Người dùng AI nhiều nhất</h2></div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Người dùng</th><th>Email</th><th className="text-end">Lượt gọi</th><th className="text-end">Token</th><th className="text-end">TB/lượt</th></tr>
            </thead>
            <tbody>
              {topUsers.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-secondary py-4">Chưa có dữ liệu.</td></tr>
              ) : topUsers.map((u, i) => (
                <tr key={u.userId || u.email}>
                  <td className="text-secondary">{i + 1}</td>
                  <td className="fw-semibold">{u.name}</td>
                  <td className="text-secondary">{u.email}</td>
                  <td className="text-end">{formatNumber(u.calls)}</td>
                  <td className="text-end">{formatNumber(u.tokens)}</td>
                  <td className="text-end">{formatNumber(u.avgTokensPerCall || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAiUsagePage;
