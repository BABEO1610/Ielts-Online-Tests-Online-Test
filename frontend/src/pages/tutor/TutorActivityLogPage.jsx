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

const Pagination = ({ page, totalPages, total, onPageChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', flexWrap: 'wrap', gap: '12px' }}>
    <span style={{ fontSize: '13px', color: '#888' }}>Trang {page} / {totalPages} — {total} hoạt động</span>
    <div style={{ display: 'flex', gap: '6px' }}>
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
        style={{ padding: '8px 18px', borderRadius: '999px', border: '1px solid #ddd', backgroundColor: page === 1 ? '#f5f5f5' : '#fff', color: page === 1 ? '#bbb' : '#000', fontSize: '14px', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'UberMoveText, system-ui, sans-serif', fontWeight: 500 }}>
        ← Trước
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onPageChange(p)}
          style={{ width: '36px', height: '36px', borderRadius: '999px', border: p === page ? 'none' : '1px solid #ddd', backgroundColor: p === page ? '#000' : '#fff', color: p === page ? '#fff' : '#000', fontSize: '14px', fontWeight: p === page ? 700 : 400, cursor: 'pointer', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages || totalPages === 0}
        style={{ padding: '8px 18px', borderRadius: '999px', border: '1px solid #ddd', backgroundColor: (page === totalPages || totalPages === 0) ? '#f5f5f5' : '#fff', color: (page === totalPages || totalPages === 0) ? '#bbb' : '#000', fontSize: '14px', cursor: (page === totalPages || totalPages === 0) ? 'default' : 'pointer', fontFamily: 'UberMoveText, system-ui, sans-serif', fontWeight: 500 }}>
        Tiếp →
      </button>
    </div>
  </div>
);

const TutorActivityLogPage = () => {
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [dateRange, setDateRange] = useState('7_days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ today_actions: 0, graded_week: 0, content_updates: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const dateRangeOptions = {
    'today': 'Hôm nay',
    '7_days': '7 ngày qua',
    '30_days': '30 ngày qua',
    'all': 'Tất cả'
  };

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
        else if (activeFilter === 'Nội dung') actionParam = 'content';
        else if (activeFilter === 'Hệ thống') actionParam = 'login';

        const res = await api.get('/tutors/activity-logs', {
          params: {
            action: actionParam || undefined,
            page: page,
            limit: limit,
            dateRange: dateRange !== 'all' ? dateRange : undefined
          }
        });
        if (res.data.success) {
          setLogs(res.data.data);
          if (res.data.meta) {
            setTotal(res.data.meta.total);
            setTotalPages(Math.ceil(res.data.meta.total / limit));
          }
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [activeFilter, dateRange, page]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [activeFilter, dateRange]);

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
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #ddd',
            borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'UberMoveText, system-ui, sans-serif'
          }}>
            <i className="bi bi-calendar"></i> {dateRangeOptions[dateRange]} <i className="bi bi-chevron-down" style={{ fontSize: '12px', marginLeft: '4px' }}></i>
          </button>
          
          {isDateDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '150px',
              overflow: 'hidden'
            }}>
              {Object.entries(dateRangeOptions).map(([key, label]) => (
                <div 
                  key={key} 
                  onClick={() => {
                    setDateRange(key);
                    setIsDateDropdownOpen(false);
                  }}
                  style={{
                    padding: '10px 16px', fontSize: '14px', cursor: 'pointer',
                    backgroundColor: dateRange === key ? '#f5f5f5' : '#fff',
                    fontFamily: 'UberMoveText, system-ui, sans-serif',
                    color: '#333'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = dateRange === key ? '#f5f5f5' : '#fff'}
                >
                  {label}
                </div>
              ))}
            </div>
          )}
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
              const targetName = log.target || 'Hệ thống';
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
                      {log.action_label || actionLabel(log.action)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {targetAvatar ? (
                        <img src={targetAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eee', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a237e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                          {targetName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#333', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>{targetName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {log.reason || (log.action === 'login' ? 'Đăng nhập hệ thống thành công' : log.action === 'logout' ? 'Đăng xuất khỏi hệ thống' : '—')}
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

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

    </div>
  );
};

export default TutorActivityLogPage;
