/**
 * QuestionNavigation.jsx — Task 4.2.5
 * Bảng điều hướng 40 câu
 * 
 * Bảng lưới 40 ô vuông. Màu sắc: chưa làm (xám), đã làm (xanh), câu hiện tại (viền đậm).
 * Bấm vào để nhảy đến câu.
 * 
 * Design: Grid layout, btn-outline-secondary / btn-success equivalents.
 */
import React from 'react';
import '../../styles/objective-testing.css';

function QuestionNavigation({ totalQuestions = 40, currentQuestion, answeredQuestions = [], onNavigate }) {
  return (
    <div className="card-content" id="question-nav-panel" style={{ padding: 'var(--spacing-lg)' }}>
      <h6 className="body-sm-strong mb-3" style={{ color: 'var(--body)' }}>Question palette</h6>
      <div className="question-nav-grid">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const qNum = i + 1;
          const isAnswered = answeredQuestions.includes(qNum);
          const isCurrent = currentQuestion === qNum;
          return (
            <button
              key={qNum}
              className={`q-btn ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
              id={`nav-q-${qNum}`}
              onClick={() => onNavigate(qNum)}
              title={`Question ${qNum}`}
            >
              {qNum}
            </button>
          );
        })}
      </div>
      <div className="d-flex gap-3 mt-3">
        <div className="d-flex align-items-center gap-1">
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--ink)', display: 'inline-block' }} />
          <span className="caption">Answered</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <span style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--surface-pressed)', display: 'inline-block' }} />
          <span className="caption">Not answered</span>
        </div>
      </div>
    </div>
  );
}

export default QuestionNavigation;
