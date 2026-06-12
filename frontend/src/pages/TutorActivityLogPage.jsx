import React, { useState } from 'react';

const MOCK_LOGS = [
  { id: '1', time: '14:30 10/06/2026', actionLabel: 'Công bố điểm', targetAvatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=random', targetName: 'Nguyễn Văn A', detail: 'Band 6.5, Audio feedback', status: 'Thành công' },
  { id: '2', time: '11:15 10/06/2026', actionLabel: 'Lưu nháp', targetAvatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=random', targetName: 'Trần Thị B', detail: 'Sửa điểm', status: 'Đang xử lý' },
  { id: '3', time: '09:00 10/06/2026', actionLabel: 'Cập nhật đề', targetAvatar: 'https://ui-avatars.com/api/?name=Cambridge+IELTS+18&background=random', targetName: 'Cambridge IELTS 18 Reading 1', detail: 'Sửa đáp án, tính lại điểm', status: 'Thành công' },
  { id: '4', time: '08:30 10/06/2026', actionLabel: 'Ghi chú riêng', targetAvatar: 'https://ui-avatars.com/api/?name=Le+Van+C&background=random', targetName: 'Lê Văn C', detail: 'Thêm private note', status: 'Thành công' },
  { id: '5', time: '16:45 09/06/2026', actionLabel: 'Tạo mới', targetAvatar: 'https://ui-avatars.com/api/?name=Mock+Test&background=random', targetName: 'Mock Test Tháng 6 - Listening', detail: 'Lên lịch phát hành', status: 'Thành công' },
  { id: '6', time: '07:15 09/06/2026', actionLabel: 'Gửi phản hồi', targetAvatar: 'https://ui-avatars.com/api/?name=Pham+Thi+D&background=random', targetName: 'Phạm Thị D', detail: 'Trả lời thắc mắc Speaking Part 2', status: 'Thành công' },
];

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
        <StatCard label="Hành động hôm nay" value="15" />
        <StatCard label="Bài đã chấm (Tuần)" value="42" />
        <StatCard label="Cập nhật nội dung" value="4" />
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
            {MOCK_LOGS.map((log, idx) => (
              <tr key={log.id} style={{ borderBottom: idx < MOCK_LOGS.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: '#333', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                  {log.time}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    borderRadius: '999px',
                    backgroundColor: log.actionColor || '#555',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'UberMoveText, system-ui, sans-serif'
                  }}>
                    {log.actionLabel}
                  </span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  {log.targetName !== '—' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {log.targetAvatar ? (
                        <img src={log.targetAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eee', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a237e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                          {log.targetName.charAt(0)}
                        </div>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#333', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>{log.targetName}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#333', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>{log.targetName}</span>
                  )}
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                  {log.detail}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    borderRadius: '999px',
                    backgroundColor: log.status === 'Thất bại' ? '#ffebee' : '#e0e0e0',
                    color: log.status === 'Thất bại' ? '#c62828' : '#333',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'UberMoveText, system-ui, sans-serif'
                  }}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default TutorActivityLogPage;
