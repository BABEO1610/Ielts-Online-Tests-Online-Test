import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import api from '../../services/api';

const StudyPlanPage = () => {
  const [data, setData] = useState({
    stats: [],
    historyData: [],
    skillScores: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/tracking/process');
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch tracking data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="py-4 px-3 px-md-4 d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-dark" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const { stats: STATS, historyData: HISTORY_DATA, skillScores: SKILL_SCORES } = data;

  return (
    <div className="py-4 px-3 px-md-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      <div className="mb-4">
        <h1 className="fw-bold mb-1" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '32px', color: '#000' }}>Process Tracking</h1>
        <p className="text-secondary m-0" style={{ fontSize: '16px' }}>Phân tích năng lực theo kỹ năng và theo dõi lộ trình điểm số.</p>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        {STATS.map((stat, idx) => (
          <div className="col-6 col-md-3" key={idx}>
            <div className="bg-white rounded-4 border p-3 h-100" style={{ borderColor: '#e2e2e2' }}>
              <div className="text-secondary fw-medium mb-1" style={{ fontSize: '14px' }}>{stat.label}</div>
              <div className="fw-bold text-dark" style={{ fontSize: '24px', fontFamily: 'UberMove, system-ui, sans-serif' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Trend Chart */}
        <div className="col-lg-8">
          <div className="bg-white rounded-4 border p-4 h-100" style={{ borderColor: '#e2e2e2' }}>
            <h2 className="fw-bold mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', color: '#000' }}>
              Biểu đồ tăng trưởng (Overall)
            </h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={HISTORY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e2e2" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5e5e5e' }} dy={10} />
                  <YAxis domain={[4.0, 9.0]} ticks={[4.0, 5.0, 6.0, 7.0, 8.0, 9.0]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5e5e5e' }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#000', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="score" name="Band Score" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#000', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Radar Chart (Skill Balance) */}
        <div className="col-lg-4">
          <div className="bg-white rounded-4 border p-4 h-100" style={{ borderColor: '#e2e2e2' }}>
            <h2 className="fw-bold mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', color: '#000' }}>
              Phân tích kỹ năng
            </h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={SKILL_SCORES}>
                  <PolarGrid stroke="#e2e2e2" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#000', fontSize: 12, fontWeight: 500 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 9]} tick={false} axisLine={false} />
                  <Radar name="Hiện tại" dataKey="score" stroke="#000" strokeWidth={2} fill="#000" fillOpacity={0.2} />
                  <Radar name="Mục tiêu" dataKey="target" stroke="#afafaf" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Detailed Cards */}
      <div className="row g-3 mt-1">
        {SKILL_SCORES.map((skill, idx) => {
          const progress = Math.round((skill.score / skill.target) * 100);
          const isReached = skill.score >= skill.target;
          return (
            <div className="col-md-6 col-lg-3" key={idx}>
              <div className="bg-white rounded-4 border p-3" style={{ borderColor: '#e2e2e2' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold text-dark" style={{ fontSize: '16px' }}>{skill.skill}</span>
                  <span className={`badge rounded-pill ${isReached ? 'bg-dark text-white' : 'bg-light text-dark border'}`} style={{ fontSize: '12px' }}>
                    {skill.score} / {skill.target}
                  </span>
                </div>
                <div className="progress rounded-pill mt-3" style={{ height: '6px', backgroundColor: '#efefef' }}>
                  <div
                    className="progress-bar rounded-pill"
                    role="progressbar"
                    style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: isReached ? '#000' : '#5e5e5e' }}
                    aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default StudyPlanPage;