/**
 * TimerBar.jsx — Task 4.2.6
 * Thanh Timer & Trạng thái
 * 
 * TimerBar.jsx
 * Thanh trạng thái hiển thị thời gian làm bài ở trên cùng màn hình.
 */
import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/objective-testing.css';

const TimerBar = ({ durationMinutes = 60, onTimeUp, onSubmitEarly, practiceMode = false, customTimeLimit = null }) => {
  const isCountDown = !practiceMode || customTimeLimit !== null;
  const initialTime = isCountDown ? (practiceMode ? customTimeLimit * 60 : durationMinutes * 60) : 0;
  
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (isCountDown) {
          if (prev <= 1) {
            clearInterval(timer);
            if (onTimeUp) onTimeUp();
            return 0;
          }
          return prev - 1;
        } else {
          return prev + 1; // Count up indefinitely
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isCountDown, onTimeUp]);

  const formatTime = useCallback((totalSecs) => {
    const absSecs = Math.abs(totalSecs);
    const mins = Math.floor(absSecs / 60);
    const secs = absSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const isDanger = isCountDown && timeLeft <= 300; // 5 minutes

  return (
    <div className="timer-bar" id="timer-bar">
      <div className="d-flex align-items-center gap-3">
        <span className="fw-medium text-white px-2 py-1 rounded" style={{ fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
          {practiceMode ? `Practice Mode${customTimeLimit ? ' (Custom Time)' : ''}` : 'Real Test Mode'}
        </span>
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Timer Display */}
        <div className="d-flex align-items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDanger ? '#ef4444' : '#ffffff'} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span
            className={`timer-display ${isDanger ? 'danger' : ''}`}
            id="timer-display"
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Submit Early Button */}
        <button
          className="button-secondary"
          id="btn-submit-early"
          onClick={onSubmitEarly}
          style={{
            width: 'auto',
            padding: '6px 20px',
            fontSize: 14,
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            background: 'transparent',
          }}
        >
          Nộp bài
        </button>
      </div>
    </div>
  );
};

import PropTypes from 'prop-types';

TimerBar.propTypes = {
  durationMinutes: PropTypes.number,
  onTimeUp: PropTypes.func,
  onSubmitEarly: PropTypes.func,
  practiceMode: PropTypes.bool,
  customTimeLimit: PropTypes.number
};

export default TimerBar;
