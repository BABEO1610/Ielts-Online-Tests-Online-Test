import React, { useState, useCallback, useRef } from 'react';

/**
 * useToast — hook quản lý toast notification.
 *
 * Cách dùng:
 *   const { toasts, showToast } = useToast();
 *   showToast('Thu hồi thành công!', 'success');
 *   // Sau đó render: <ToastContainer toasts={toasts} />
 *
 * type: 'success' | 'error' | 'info'
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

// ─── Config màu theo type ──────────────────────────────────────────────────────
const TYPE_STYLE = {
  success: { bg: '#1b5e20', icon: '✓', border: '#2e7d32' },
  error:   { bg: '#b71c1c', icon: '✕', border: '#c62828' },
  info:    { bg: '#1a237e', icon: 'ℹ', border: '#283593' },
};

// ─── Một toast item ────────────────────────────────────────────────────────────
const ToastItem = ({ toast, onDismiss }) => {
  const s = TYPE_STYLE[toast.type] ?? TYPE_STYLE.info;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 18px', borderRadius: '12px',
        backgroundColor: s.bg, color: '#fff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
        minWidth: '260px', maxWidth: '380px',
        animation: 'slideInToast 0.25s ease',
        fontFamily: 'UberMoveText, system-ui, sans-serif',
        fontSize: '14px', fontWeight: 500,
      }}
    >
      {/* Icon */}
      <span style={{
        width: '24px', height: '24px', borderRadius: '50%',
        border: `2px solid rgba(255,255,255,0.5)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 700, flexShrink: 0,
      }}>
        {s.icon}
      </span>

      {/* Message */}
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Đóng thông báo"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)', fontSize: '16px',
          padding: '2px', lineHeight: 1, flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
};

// ─── Container (fixed bottom-right) ───────────────────────────────────────────
export const ToastContainer = ({ toasts, onDismiss, position = 'bottom-right' }) => {
  if (!toasts || toasts.length === 0) return null;

  const isTop = position.startsWith('top');

  return (
    <>
      {/* Keyframe animation */}
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(${isTop ? '-12px' : '12px'}); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        ...(isTop ? { top: '28px' } : { bottom: '28px' }),
        right: '28px',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '10px',
        alignItems: 'flex-end',
      }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
};
