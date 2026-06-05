/**
 * TimerBar.jsx — Task 4.2.6
 * Thanh Timer & Trạng thái
 * 
 * Hiển thị đồng hồ đếm ngược. Chuyển sang ĐỎ khi dưới 5 phút.
 * Có nút "Nộp bài sớm".
 * 
 * Component navbar cố định. text-danger khi cạn giờ.
 * Design: Uber-inspired — dark bar, white text, tabular-nums.
 */
import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/objective-testing.css';

function TimerBar({ durationMinutes = 60, onTimeUp, onSubmitEarly }) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onTimeUp) onTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onTimeUp]);

  const formatTime = useCallback((totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const isDanger = secondsLeft <= 300; // 5 minutes

  return (
    <div className="timer-bar" id="timer-bar">
      <div className="d-flex align-items-center gap-3">
        <span className="body-md-strong" style={{ color: 'var(--mute)' }}>
          IELTS Mock Test
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
            {formatTime(secondsLeft)}
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
}

export default TimerBar;
