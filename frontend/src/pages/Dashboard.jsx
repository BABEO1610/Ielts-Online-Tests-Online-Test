import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import gradingService from '../services/grading.service';

const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];

const formatBand = (value, fallback = 'N/A') =>
  value !== null && value !== undefined ? Number(value).toFixed(1) : fallback;

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('LISTENING');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    // EARS[Event]: WHEN dashboard mounts THEN fetch stats
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await gradingService.getDashboardStats();
        if (!active) return;
        if (response.success) {
          setStats(response.data);
        } else {
          setError(response.error?.message || 'Có lỗi xảy ra khi tải thống kê.');
        }
      } catch (err) {
        if (active) setError(err.message || 'Không thể kết nối đến server.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchStats();
    return () => { active = false; };
  }, []);

  // Real target band from /users/me takes precedence over placeholder stats.
  const targetScore = formatBand(user?.target_band_score ?? stats?.target_band_score, '7.5');
  const chartData = stats?.chart?.[activeTab] || [];

  return (
    <div className="py-4">
      <h2 className="fw-bold mb-4" style={{ color: '#1e3a8a', fontFamily: 'UberMove, sans-serif' }}>
        My Test Performance
      </h2>

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert" data-testid="dashboard-error">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Không thể tải thông tin thống kê: {error}
        </div>
      )}

      <div className="row g-4 mb-4">
        {/* Target Score (Full width on mobile, span 12) */}
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4 text-center py-4 position-relative">
            <a href="/profile" className="position-absolute top-0 end-0 m-3 text-decoration-none" style={{ color: '#0ea5e9', fontWeight: '500' }}>Edit</a>
            <div className="mb-2">
              <i className="bi bi-bullseye fs-3 text-secondary"></i>
            </div>
            <div className="text-secondary fw-medium mb-1">Target Score</div>
            <div className="fw-bold fs-2 text-dark">{targetScore}</div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 text-center py-4 h-100 position-relative">
            <i className="bi bi-question-circle text-secondary position-absolute top-0 end-0 m-3" style={{ opacity: 0.5 }}></i>
            <div className="mb-2">
              <i className="bi bi-graph-up-arrow fs-3 text-secondary"></i>
            </div>
            <div className="text-secondary fw-medium mb-1">Average Score</div>
            <div className="fw-bold fs-2 text-dark">{loading ? '—' : formatBand(stats?.avg_band_score)}</div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 text-center py-4 h-100 position-relative">
            <i className="bi bi-question-circle text-secondary position-absolute top-0 end-0 m-3" style={{ opacity: 0.5 }}></i>
            <div className="mb-2">
              <i className="bi bi-file-earmark-text fs-3 text-secondary"></i>
            </div>
            <div className="text-secondary fw-medium mb-1">Total Tests Taken</div>
            <div className="fw-bold fs-2 text-dark">{loading ? '—' : (stats?.total_tests_taken ?? 0)}</div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 text-center py-4 h-100 position-relative">
            <i className="bi bi-question-circle text-secondary position-absolute top-0 end-0 m-3" style={{ opacity: 0.5 }}></i>
            <div className="mb-2">
              <i className="bi bi-clock fs-3 text-secondary"></i>
            </div>
            <div className="text-secondary fw-medium mb-1">Average Time</div>
            <div className="fw-bold fs-2 text-dark">{loading ? '—' : (stats?.avg_time_label ?? 'N/A')}</div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm rounded-4 text-center py-4 h-100 position-relative">
            <i className="bi bi-question-circle text-secondary position-absolute top-0 end-0 m-3" style={{ opacity: 0.5 }}></i>
            <div className="mb-2">
              <i className="bi bi-crosshair fs-3 text-secondary"></i>
            </div>
            <div className="text-secondary fw-medium mb-1">Accuracy</div>
            <div className="fw-bold fs-2 text-dark">{loading ? '—' : `${stats?.accuracy_pct ?? 0}%`}</div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="d-flex flex-wrap border-bottom">
          {SKILLS.map((skill) => (
            <button
              key={skill}
              className="btn rounded-0 px-4 py-3 fw-bold flex-grow-1 flex-md-grow-0 border-0"
              style={{
                backgroundColor: activeTab === skill ? '#38bdf8' : 'transparent',
                color: activeTab === skill ? '#fff' : '#64748b',
                borderBottom: activeTab === skill ? '3px solid #0284c7' : '3px solid transparent'
              }}
              onClick={() => setActiveTab(skill)}
            >
              {skill === 'LISTENING' && <i className="bi bi-headphones me-2"></i>}
              {skill === 'READING' && <i className="bi bi-book me-2"></i>}
              {skill === 'WRITING' && <i className="bi bi-pencil me-2"></i>}
              {skill === 'SPEAKING' && <i className="bi bi-mic me-2"></i>}
              {skill}
            </button>
          ))}
        </div>

        <div className="p-4" style={{ height: '350px' }}>
          {loading ? (
            <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
              <div className="spinner-border text-info me-2" role="status" aria-hidden="true"></div>
              Đang tải biểu đồ...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" hide />
                <YAxis domain={[4, 9]} ticks={[4, 5, 6, 7, 8, 9]} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#0284c7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
