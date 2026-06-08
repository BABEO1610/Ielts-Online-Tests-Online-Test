import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import StatCard from '../../components/admin/StatCard';
import { fetchAiUsage } from '../../services/adminStats.service';
import { formatNumber } from '../../utils/adminFormat';

const AdminAiUsagePage = () => {
  const [data, setData] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchAiUsage();
      if (!alive) return;
      setData(res.data);
      setIsSample(res.isSample);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading || !data) return <div className="text-secondary py-5 text-center">Đang tải số liệu AI…</div>;

  const t = data.totals;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Thống kê sử dụng AI</h1>
          <p className="body-sm text-secondary m-0">Lượt gọi, token tiêu thụ và phân tích theo từng tính năng (30 ngày).</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API ai-usage)</span>}
      </div>

      <div className="stat-grid mb-4">
        <StatCard dark label="Lượt gọi AI (30 ngày)" value={formatNumber(t.calls30d)} />
        <StatCard label="Token tiêu thụ" value={formatNumber(t.tokens30d)} />
        <StatCard label="Người dùng AI" value={formatNumber(t.activeUsers30d)} />
        <StatCard label="Token / lượt gọi (TB)" value={formatNumber(t.avgTokensPerCall)} />
      </div>

      <div className="row g-4">
        {/* Trend line */}
        <div className="col-lg-7">
          <div className="admin-card h-100">
            <div className="admin-card__header"><h2 className="admin-card__title">Lượt gọi AI theo ngày</h2></div>
            <div className="admin-card__body">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efefef" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                  <Tooltip />
                  <Line type="monotone" dataKey="calls" stroke="#000000" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* By feature breakdown */}
        <div className="col-lg-5">
          <div className="admin-card h-100">
            <div className="admin-card__header"><h2 className="admin-card__title">Theo tính năng</h2></div>
            <div className="admin-card__body d-flex flex-column gap-3">
              {data.byFeature.map((f) => (
                <div key={f.feature}>
                  <div className="d-flex justify-content-between body-sm mb-1">
                    <span className="fw-semibold">{f.feature}</span>
                    <span className="text-secondary">{f.share}%</span>
                  </div>
                  <div className="mini-bar"><div className="mini-bar__fill" style={{ width: `${f.share}%` }} /></div>
                  <div className="caption text-secondary mt-1">{formatNumber(f.calls)} lượt · {formatNumber(f.tokens)} tokens</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top users table with analytics columns */}
      <div className="admin-card mt-4">
        <div className="admin-card__header"><h2 className="admin-card__title">Người dùng AI nhiều nhất</h2></div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Người dùng</th><th>Email</th><th className="text-end">Lượt gọi</th><th className="text-end">Token</th><th className="text-end">TB/lượt</th></tr>
            </thead>
            <tbody>
              {data.topUsers.map((u, i) => (
                <tr key={u.email}>
                  <td className="text-secondary">{i + 1}</td>
                  <td className="fw-semibold">{u.name}</td>
                  <td className="text-secondary">{u.email}</td>
                  <td className="text-end">{formatNumber(u.calls)}</td>
                  <td className="text-end">{formatNumber(u.tokens)}</td>
                  <td className="text-end">{formatNumber(Math.round(u.tokens / u.calls))}</td>
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
