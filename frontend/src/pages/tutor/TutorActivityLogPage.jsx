import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { actionLabel, formatDateTime } from '../../utils/adminFormat';

const StatCard = ({ label, value }) => (
  <div style={{
    backgroundColor: '#dcdcdc',
    borderRadius: '16px',
    padding: '24px 28px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  }}>
    <div style={{ fontSize: '14px', fontWeight: 600, color: '#444', marginBottom: '12px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>{label}</div>
    <div style={{ fontSize: '42px', fontWeight: 700, fontFamily: 'UberMove, system-ui, sans-serif', color: '#000', lineHeight: 1 }}>{value}</div>
  </div>
);

const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 20px',
      borderRadius: '999px',
      border: active ? 'none' : '1px solid #ddd',
      backgroundColor: active ? '#000' : '#fff',
      color: active ? '#fff' : '#000',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: 'UberMoveText, system-ui, sans-serif',
      transition: 'all 0.2s ease'
    }}
  >
    {label}
  </button>
);

const TutorActivityLogPage = () => {
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ today_actions: 0, graded_week: 0, content_updates: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/tutors/activity-logs/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        let actionParam = '';
        if (activeFilter === 'Chấm bài') actionParam = 'submission_graded';
        else if (activeFilter === 'Nội dung') actionParam = 'test_updated';
        else if (activeFilter === 'Hệ thống') actionParam = 'login';

        const res = await api.get('/tutors/activity-logs', {
          params: {
            action: actionParam || undefined,
            limit: 50,
            dateRange: '7_days'
          }
        });
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [activeFilter]);

  return (
    <div style={{ padding: '32px 48px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      
      {/* Header Row */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700, fontFamily: 'UberMove, system-ui, sans-serif', color: '#000' }}>
          Nhật ký hoạt động
        </h1>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
        <StatCard label="Hành động hôm nay" value={stats.today_actions || 0} />
        <StatCard label="Bài đã chấm (Tuần)" value={stats.graded_week || 0} />
        <StatCard label="Cập nhật nội dung" value={stats.content_updates || 0} />
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Tất cả', 'Chấm bài', 'Nội dung', 'Hệ thống'].map(f => (
            <FilterPill key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
          ))}
        </div>
        <div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #ddd',
            borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'UberMoveText, system-ui, sans-serif'
          }}>
            <i className="bi bi-calendar"></i> 7 ngày qua <i className="bi bi-chevron-down" style={{ fontSize: '12px', marginLeft: '4px' }}></i>
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e8e8e8' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #e8e8e8' }}>
              {['Thời gian', 'Nhãn hành động', 'Đối tượng (Học sinh/Đề thi)', 'Chi tiết hoạt động', 'Trạng thái'].map((col, i) => (
                <th key={col} style={{
                  padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: '#000',
                  fontFamily: 'UberMoveText, system-ui, sans-serif',
                  width: i === 0 ? '160px' : i === 1 ? '160px' : i === 4 ? '120px' : 'auto'
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>Đang tải dữ liệu...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>Không có hoạt động nào trong thời gian này.</td>
              </tr>
            ) : logs.map((log, idx) => {
              const actionColor = log.severity === 'suspicious' ? '#d32f2f' : '#333';
              const targetName = log.target_label || log.target_id || 'Hệ thống';
              const targetAvatar = targetName !== 'Hệ thống' ? `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=random` : null;

              return (
                <tr key={log.id} style={{ borderBottom: idx < logs.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: '#333', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {formatDateTime(log.created_at)}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 14px',
                      borderRadius: '999px',
                      backgroundColor: actionColor,
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 500,
                      fontFamily: 'UberMoveText, system-ui, sans-serif'
                    }}>
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {targetAvatar ? (
                        <img src={targetAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eee', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a237e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                          {targetName.charAt(0)}
                        </div>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#333', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>{targetName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {log.note || '—'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 14px',
                      borderRadius: '999px',
                      backgroundColor: '#e0e0e0',
                      color: '#333',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'UberMoveText, system-ui, sans-serif'
                    }}>
                      Thành công
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default TutorActivityLogPage;
