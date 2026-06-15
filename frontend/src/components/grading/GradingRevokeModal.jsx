import React from 'react';

/**
 * GradingRevokeModal — Modal xác nhận thu hồi kết quả chấm bài.
 *
 * Props:
 *   record    — object bài chấm (null = ẩn modal)
 *   onClose   — callback đóng modal
 *   onConfirm — callback(id) xác nhận thu hồi
 */
const GradingRevokeModal = ({ record, onClose, onConfirm }) => {
  if (!record) return null;

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
          width: '420px', maxWidth: '90vw',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div style={{ fontSize: '36px', marginBottom: '12px', textAlign: 'center' }}>⚠️</div>

        <h2 style={{
          margin: '0 0 12px', textAlign: 'center',
          fontFamily: 'UberMove, system-ui, sans-serif',
          fontSize: '20px', fontWeight: 700, color: '#c62828',
        }}>
          Thu hồi kết quả?
        </h2>

        <p style={{
          fontSize: '14px', color: '#555', lineHeight: 1.7, marginBottom: '8px',
          fontFamily: 'UberMoveText, system-ui, sans-serif', textAlign: 'center',
        }}>
          Bạn đang thu hồi điểm của{' '}
          <strong>{record.studentName}</strong>{' '}
          cho bài{' '}
          <strong>{record.testName}</strong>.
        </p>

        <p style={{
          fontSize: '13px', color: '#e53935', marginBottom: '24px',
          fontFamily: 'UberMoveText, system-ui, sans-serif', textAlign: 'center',
        }}>
          Học sinh sẽ không thể xem kết quả cho đến khi bạn công bố lại.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { onConfirm(record.id); onClose(); }}
            style={{
              flex: 1, padding: '12px', borderRadius: '999px',
              backgroundColor: '#c62828', color: '#fff', border: 'none',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'UberMoveText, system-ui, sans-serif',
            }}
          >
            Xác nhận thu hồi
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
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradingRevokeModal;
