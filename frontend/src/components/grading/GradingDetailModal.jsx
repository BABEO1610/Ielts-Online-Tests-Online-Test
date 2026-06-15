import React from 'react';

/**
 * GradingDetailModal — Modal xem chi tiết một bài chấm.
 *
 * Props:
 *   record  — object bài chấm (null = ẩn modal)
 *   onClose — callback đóng modal
 *   statusMap — map trạng thái { graded, edited, disputed }
 *   skillMap  — map kỹ năng { writing, speaking }
 */

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const AVATAR_COLORS = [
  '#1a237e', '#b71c1c', '#1b5e20', '#4a148c',
  '#e65100', '#006064', '#880e4f', '#33691e',
];
const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const GradingDetailModal = ({ record, onClose, statusMap, skillMap }) => {
  if (!record) return null;

  const status = statusMap[record.status] ?? {};
  const skill  = skillMap[record.skill]   ?? {};

  const fields = [
    { label: 'Bài thi',       value: record.testName },
    {
      label: 'Kỹ năng',
      value: (
        <span style={{
          padding: '3px 12px', borderRadius: '999px',
          backgroundColor: skill.bg, color: skill.color,
          fontSize: '13px', fontWeight: 700,
        }}>
          {skill.label}
        </span>
      ),
    },
    {
      label: 'Điểm Band',
      value: (
        <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'UberMove, system-ui, sans-serif' }}>
          Band {record.band}
        </span>
      ),
    },
    {
      label: 'Trạng thái',
      value: (
        <span style={{
          padding: '4px 14px', borderRadius: '999px',
          backgroundColor: status.bg, color: status.color,
          border: `1px solid ${status.border}`,
          fontSize: '13px', fontWeight: 600,
        }}>
          {status.label}
        </span>
      ),
    },
    { label: 'Loại feedback', value: record.feedbackTypes?.join(', ') },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
          width: '520px', maxWidth: '90vw',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '22px', fontWeight: 700 }}>
              Chi tiết chấm bài
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#888', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
              {record.time} · {record.date}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888', padding: '4px' }}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Student info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          marginBottom: '20px', padding: '16px',
          backgroundColor: '#f7f7f7', borderRadius: '12px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: getAvatarColor(record.studentName),
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 700, flexShrink: 0,
          }}>
            {getInitials(record.studentName)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
              {record.studentName}
            </div>
            <div style={{ fontSize: '13px', color: '#888' }}>Mã học sinh: {record.studentCode}</div>
          </div>
        </div>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {fields.map(({ label, value }) => (
            <div key={label}>
              <div style={{
                fontSize: '11px', fontWeight: 700, color: '#aaa',
                textTransform: 'uppercase', letterSpacing: '0.6px',
                marginBottom: '6px', fontFamily: 'UberMoveText, system-ui, sans-serif',
              }}>
                {label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#000', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            flex: 1, padding: '12px', borderRadius: '999px',
            backgroundColor: '#000', color: '#fff', border: 'none',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'UberMoveText, system-ui, sans-serif',
          }}>
            Xem toàn bộ bài làm
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px', borderRadius: '999px',
              backgroundColor: '#efefef', color: '#000', border: 'none',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'UberMoveText, system-ui, sans-serif',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradingDetailModal;
