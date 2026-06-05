import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

// EARS[Event-driven]: WHEN message is provided, THE component SHALL display a toast notification.
// EARS[State-driven]: WHEN duration elapses, THE component SHALL call onClose to unmount.
const ToastNotification = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  const getTypeClass = () => {
    switch (type) {
      case 'success': return 'text-bg-success';
      case 'error': return 'text-bg-danger';
      case 'warning': return 'text-bg-warning';
      default: return 'text-bg-primary';
    }
  };

  return (
    <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 11 }}>
      <div className={`toast show align-items-center border-0 ${getTypeClass()}`} role="alert" aria-live="assertive" aria-atomic="true">
        <div className="d-flex">
          <div className="toast-body fw-medium">
            {message}
          </div>
          <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={onClose}></button>
        </div>
      </div>
    </div>
  );
};

ToastNotification.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info', 'warning']),
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
};

export default ToastNotification;
