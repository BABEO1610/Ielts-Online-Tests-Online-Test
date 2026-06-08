import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import StatCard from '../../components/admin/StatCard';
import { fetchOverview, fetchActivityLogs } from '../../services/adminStats.service';
import { formatNumber, formatDateTime, actionLabel } from '../../utils/adminFormat';

const ROLE_COLORS = ['#1c4ed8', '#b06f00', '#c92a2a'];

const AdminOverviewPage = () => {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [overview, logs] = await Promise.all([fetchOverview(), fetchActivityLogs({ limit: 5 })]);
      if (!alive) return;
      setData(overview.data);
      setRecent(logs.data.rows.slice(0, 5));
      setIsSample(overview.isSample || logs.isSample);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading || !data) {
    return <div className="text-secondary py-5 text-center">Đang tải số liệu…</div>;
  }

  const t = data.totals;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Tổng quan</h1>
          <p className="body-sm text-secondary m-0">Bức tranh nhanh về người dùng, hoạt động và mức sử dụng AI.</p>
        </div>
        {isSample && (
          <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API metrics)</span>
        )}
      </div>

      {/* Stat cards */}
      <div className="stat-grid mb-4">
        <StatCard dark label="Tổng người dùng" value={formatNumber(t.users)} delta={`+${t.newRegistrations7d} trong 7 ngày`} trend="up" />
        <StatCard label="Tài khoản Active" value={formatNumber(t.activeUsers)} delta={`${t.pendingUsers} chờ duyệt`} trend="up" />
        <StatCard label="Đề thi đang mở" value={formatNumber(t.activeTests)} />
        <StatCard label="Lượt gọi AI hôm nay" value={formatNumber(t.aiCallsToday)} delta={`${formatNumber(t.aiTokensToday)} tokens`} trend="up" />
      </div>

      <div className="row g-4">
        {/* Role breakdown donut */}
        <div className="col-lg-5">
          <div className="admin-card h-100">
            <div className="admin-card__header"><h2 className="admin-card__title">Phân bổ vai trò</h2></div>
            <div className="admin-card__body">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.roleBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {data.roleBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="d-flex justify-content-center gap-3 flex-wrap mt-2">
                {data.roleBreakdown.map((r, i) => (
                  <span key={r.name} className="body-sm d-flex align-items-center gap-2">
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: ROLE_COLORS[i % ROLE_COLORS.length], display: 'inline-block' }} />
                    {r.name}: <strong>{r.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Registrations trend bar */}
        <div className="col-lg-7">
          <div className="admin-card h-100">
            <div className="admin-card__header"><h2 className="admin-card__title">Đăng ký mới (7 ngày)</h2></div>
            <div className="admin-card__body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.registrationsTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#efefef" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={24} />
                  <Tooltip cursor={{ fill: '#f3f3f3' }} />
                  <Bar dataKey="users" fill="#000000" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity preview */}
      <div className="admin-card mt-4">
        <div className="admin-card__header">
          <h2 className="admin-card__title">Hoạt động gần đây</h2>
          <Link to="/admin/activity" className="btn-pill btn-pill--ghost">Xem tất cả</Link>
        </div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>Mức độ</th></tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className={r.severity === 'suspicious' ? 'row--suspicious' : ''}>
                  <td className="text-secondary">{formatDateTime(r.created_at)}</td>
                  <td>{r.actor}</td>
                  <td>{actionLabel(r.action)}</td>
                  <td className="text-secondary">{r.target}</td>
                  <td>
                    {r.severity === 'suspicious'
                      ? <span className="pill pill--danger">Khả nghi</span>
                      : <span className="pill pill--neutral">Bình thường</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
