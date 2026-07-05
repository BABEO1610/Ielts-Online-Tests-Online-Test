/**
 * TimerBar.jsx — Task 4.2.6
 * Thanh Timer & Trạng thái
 * 
 * TimerBar.jsx
 * Thanh trạng thái hiển thị thời gian làm bài ở trên cùng màn hình.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/objective-testing.css';

const TimerBar = ({
  durationMinutes = 60,
  onTimeUp,
  onSubmitEarly,
  practiceMode = false,
  customTimeLimit = null,
  hideReviewButton = false,
  hideActions = false,
  submitDisabled = false,
  submitTitle = 'Submit',
}) => {
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
    <div className="timer-bar" id="timer-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1040 }}>
      {/* Left side */}
      <div className="d-flex align-items-center gap-3" style={{ flex: 1 }}>
        <Link to="/" className="text-decoration-none">
          <span className="fw-bold fs-5 text-white" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>IELTSZone</span>
        </Link>
        <span className="fw-medium text-white px-2 py-1 rounded d-none d-sm-inline" style={{ fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
          {practiceMode ? `Practice Mode${customTimeLimit ? ' (Custom)' : ''}` : 'Real Test Mode'}
        </span>
      </div>

      {/* Center - Timer */}
      <div className="position-absolute start-50 translate-middle-x d-flex align-items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDanger ? '#ef4444' : '#ffffff'} strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span
          className={`timer-display ${isDanger ? 'danger' : ''}`}
          id="timer-display"
          style={{ fontSize: '20px', fontWeight: 700, minWidth: '60px', textAlign: 'center' }}
        >
          {formatTime(timeLeft)}
        </span>
        <span className="d-none d-md-inline" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
          remaining
        </span>
      </div>

      {/* Right side */}
      <div className="d-flex align-items-center gap-3 justify-content-end" style={{ flex: 1 }}>
        {!hideActions && (
          <>
            {!hideReviewButton && (
              <button
                className="btn btn-outline-light d-none d-md-flex align-items-center gap-2 rounded-pill px-3 py-1"
                style={{ fontSize: '14px', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Review
              </button>
            )}
            <button
              className="button-primary d-flex align-items-center gap-2"
              id="btn-submit-early"
              onClick={onSubmitEarly}
              disabled={submitDisabled}
              style={{
                width: 'auto',
                padding: '6px 20px',
                fontSize: '14px',
                color: submitDisabled ? '#777' : '#000',
                background: submitDisabled ? '#d7d7d7' : '#fff',
                fontWeight: 600,
                border: 'none',
                borderRadius: '999px'
              }}
            >
              {submitTitle}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </>
        )}
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
  customTimeLimit: PropTypes.number,
  hideReviewButton: PropTypes.bool,
  hideActions: PropTypes.bool,
  submitDisabled: PropTypes.bool,
  submitTitle: PropTypes.string
};

export default TimerBar;
