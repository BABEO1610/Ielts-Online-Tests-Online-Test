import React from 'react';

// Keyframe cho skeleton shimmer
const SHIMMER_STYLE = `
  @keyframes shimmer {
    0%   { background-color: #f0f0f0; }
    50%  { background-color: #e4e4e4; }
    100% { background-color: #f0f0f0; }
  }
`;

/**
 * GradingHistoryTable — Bảng danh sách lịch sử chấm bài.
 *
 * Props:
 *   rows       — mảng record đã được filter + paginate từ parent
 *   statusMap  — map trạng thái
 *   skillMap   — map kỹ năng
 *   onView     — callback(record) mở modal xem chi tiết
 *   onRevoke   — callback(record) mở modal thu hồi
 *   sortKey    — key cột đang sort ('rawDate' | 'band' | null)
 *   sortDir    — chiều sort ('asc' | 'desc')
 *   onSort     — callback(key) toggle sort
 */

const AVATAR_COLORS = [
  '#1a237e', '#b71c1c', '#1b5e20', '#4a148c',
  '#e65100', '#006064', '#880e4f', '#33691e',
];

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Cấu hình cột — sortKey null = không sortable
const COLUMNS = [
  { label: 'Thời gian',         sortKey: 'rawDate', width: '140px' },
  { label: 'Học sinh',          sortKey: null,       width: 'auto' },
  { label: 'Bài thi / Kỹ năng', sortKey: null,       width: 'auto' },
  { label: 'Điểm Band',         sortKey: 'band',     width: '110px' },
  { label: 'Chi tiết feedback', sortKey: null,       width: 'auto' },
  { label: 'Trạng thái',        sortKey: null,       width: 'auto' },
  { label: 'Hành động',         sortKey: null,       width: '120px' },
];

const SortIcon = ({ active, dir }) => {
  if (!active) return <span style={{ opacity: 0.3, fontSize: '11px', marginLeft: '4px' }}>↕</span>;
  return (
    <span style={{ fontSize: '11px', marginLeft: '4px', color: '#000' }}>
      {dir === 'asc' ? '↑' : '↓'}
    </span>
  );
};

const IconBtn = ({ title, emoji, onClick, danger = false }) => (
  <button
    title={title}
    onClick={onClick}
    aria-label={title}
    style={{
      background: '#f5f5f5', border: 'none', borderRadius: '999px',
      width: '32px', height: '32px', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: '15px', cursor: 'pointer',
      color: danger ? '#c62828' : '#333',
      transition: 'background 0.15s', flexShrink: 0,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = danger ? '#ffebee' : '#e8e8e8'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
  >
    {emoji}
  </button>
);

const EmptyState = () => (
  <tr>
    <td colSpan={7}>
      <div style={{
        padding: '60px 20px', textAlign: 'center',
        color: '#aaa', fontSize: '15px',
        fontFamily: 'UberMoveText, system-ui, sans-serif',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
        Không tìm thấy bài chấm nào phù hợp với bộ lọc.
      </div>
    </td>
  </tr>
);

// Skeleton shimmer row
const SkeletonRow = () => {
  const shimmer = {
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    animation: 'shimmer 1.4s ease infinite',
  };
  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ padding: '16px' }}>
        <div style={{ ...shimmer, height: '14px', width: '48px', marginBottom: '6px' }} />
        <div style={{ ...shimmer, height: '12px', width: '72px' }} />
      </td>
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ ...shimmer, width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <div style={{ ...shimmer, height: '14px', width: '100px', marginBottom: '6px' }} />
            <div style={{ ...shimmer, height: '12px', width: '60px' }} />
          </div>
        </div>
      </td>
      <td style={{ padding: '16px' }}>
        <div style={{ ...shimmer, height: '14px', width: '160px', marginBottom: '8px' }} />
        <div style={{ ...shimmer, height: '18px', width: '60px', borderRadius: '999px' }} />
      </td>
      <td style={{ padding: '16px' }}>
        <div style={{ ...shimmer, height: '20px', width: '36px', marginBottom: '4px' }} />
        <div style={{ ...shimmer, height: '11px', width: '60px' }} />
      </td>
      <td style={{ padding: '16px' }}>
        <div style={{ ...shimmer, height: '24px', width: '80px', borderRadius: '999px' }} />
      </td>
      <td style={{ padding: '16px' }}>
        <div style={{ ...shimmer, height: '26px', width: '100px', borderRadius: '999px' }} />
      </td>
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ ...shimmer, width: '32px', height: '32px', borderRadius: '999px' }} />)}
        </div>
      </td>
    </tr>
  );
};


const GradingHistoryTable = ({
  rows, statusMap, skillMap, onView, onRevoke,
  sortKey, sortDir, onSort, loading = false,
}) => (
  <>
    <style>{SHIMMER_STYLE}</style>
    <div style={{
      backgroundColor: '#fff', border: '1px solid #e8e8e8',
      borderRadius: '16px', overflow: 'hidden',
    }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #e8e8e8' }}>
          {COLUMNS.map((col) => (
            <th
              key={col.label}
              onClick={col.sortKey ? () => onSort(col.sortKey) : undefined}
              style={{
                padding: '14px 16px',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px',
                textTransform: 'uppercase', color: '#888',
                fontFamily: 'UberMoveText, system-ui, sans-serif',
                whiteSpace: 'nowrap', width: col.width,
                cursor: col.sortKey ? 'pointer' : 'default',
                userSelect: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { if (col.sortKey) e.currentTarget.style.color = '#333'; }}
              onMouseLeave={(e) => { if (col.sortKey) e.currentTarget.style.color = '#888'; }}
            >
              {col.label}
              {col.sortKey && (
                <SortIcon active={sortKey === col.sortKey} dir={sortDir} />
              )}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : rows.map((r, idx) => {
          const status = statusMap[r.status] ?? {};
          const skill  = skillMap[r.skill]   ?? {};
          const isLast = idx === rows.length - 1;

          return (
            <tr
              key={r.id}
              style={{
                borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Thời gian */}
              <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>{r.time}</div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>{r.date}</div>
              </td>

              {/* Học sinh */}
              <td style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: getAvatarColor(r.studentName),
                    color: '#fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {getInitials(r.studentName)}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>{r.studentName}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>{r.studentCode}</div>
                  </div>
                </div>
              </td>

              {/* Bài thi / Kỹ năng */}
              <td style={{ padding: '16px' }}>
                <div style={{ fontSize: '14px', color: '#000', fontWeight: 500, marginBottom: '6px' }}>
                  {r.testName}
                </div>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
                  backgroundColor: skill.bg, color: skill.color,
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}>
                  {skill.label}
                </span>
              </td>

              {/* Điểm Band */}
              <td style={{ padding: '16px' }}>
                <span style={{
                  fontSize: '20px', fontWeight: 700,
                  fontFamily: 'UberMove, system-ui, sans-serif', color: '#000',
                }}>
                  {r.band.toFixed(1)}
                </span>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>Band score</div>
              </td>

              {/* Chi tiết feedback */}
              <td style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {r.feedbackTypes.map((f) => (
                    <span key={f} style={{
                      display: 'inline-block', padding: '3px 10px',
                      borderRadius: '999px', backgroundColor: '#efefef',
                      color: '#333', fontSize: '12px', fontWeight: 500,
                    }}>
                      {f}
                    </span>
                  ))}
                </div>
              </td>

              {/* Trạng thái */}
              <td style={{ padding: '16px' }}>
                <span style={{
                  display: 'inline-block', padding: '5px 14px', borderRadius: '999px',
                  backgroundColor: status.bg, color: status.color,
                  border: `1px solid ${status.border}`,
                  fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {status.label}
                </span>
              </td>

              {/* Hành động */}
              <td style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <IconBtn title="Xem chi tiết"         emoji="👁"  onClick={() => onView(r)} />
                  <IconBtn title="Chỉnh sửa / Cập nhật" emoji="✏️" onClick={() => {}} />
                  {r.status !== 'disputed' && (
                    <IconBtn title="Thu hồi kết quả" emoji="↩" onClick={() => onRevoke(r)} danger />
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  </>
);

export default GradingHistoryTable;
