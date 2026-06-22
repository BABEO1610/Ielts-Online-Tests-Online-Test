import React, { useState } from 'react';
import '../../styles/objective-testing.css';

function ReviewModal({ isOpen, onClose, questions = [], answers = {}, onNavigate }) {
  if (!isOpen) return null;

  const [showAnswered, setShowAnswered] = useState(true);
  const [showUnanswered, setShowUnanswered] = useState(true);

  // Answers is typically an object mapping qOrder -> answer text
  // Let's count answered questions
  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].toString().trim() !== '').length;
  const totalCount = questions.length;
  const unansweredCount = totalCount - answeredCount;

  // Group questions by section/passage, applying active filters
  const groups = questions.reduce((acc, q) => {
    const key = q.section || q.passage || 'Questions';
    const qNum = q.order || q.questionOrder;
    const isAnswered = answers[qNum] && answers[qNum].toString().trim() !== '';

    if (isAnswered && !showAnswered) {
      return acc;
    }
    if (!isAnswered && !showUnanswered) {
      return acc;
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  return (
    <div 
      className="review-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="review-modal-card bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          animation: 'modalFadeIn 0.25s ease-out'
        }}
      >
        {/* Header */}
        <div 
          className="review-modal-header p-4 d-flex justify-content-between align-items-center"
          style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}
        >
          <div>
            <h4 className="fw-bold mb-1" style={{ color: 'var(--ink, #000)', fontSize: '1.25rem' }}>Review Answers</h4>
            <p className="mb-0 text-muted small" style={{ fontSize: '0.85rem' }}>
              Answered: <span className="fw-bold text-dark">{answeredCount}</span>/{totalCount} | Unanswered: <span className="fw-bold text-danger">{unansweredCount}</span>
            </p>
          </div>
          <button 
            type="button" 
            className="btn-close" 
            onClick={onClose}
            aria-label="Close"
            style={{ padding: '8px' }}
          />
        </div>

        {/* Body */}
        <div 
          className="review-modal-body p-4"
          style={{ overflowY: 'auto', flex: 1 }}
        >
          {Object.keys(groups).length === 0 ? (
            <div className="text-center py-5">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" className="mb-3">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h5 className="fw-bold mb-1">No Questions to Display</h5>
              <p className="text-muted small">Adjust the filters below to show answered or unanswered questions.</p>
            </div>
          ) : (
            Object.entries(groups).map(([groupName, groupQuestions]) => (
              <div key={groupName} className="mb-4">
                <h6 
                  className="fw-bold text-uppercase tracking-wider mb-3" 
                  style={{ fontSize: '12px', color: 'var(--mute, #6b7280)', letterSpacing: '0.05em' }}
                >
                  {groupName}
                </h6>
                
                <div className="review-questions-grid">
                  {groupQuestions.map((q) => {
                    const qNum = q.order || q.questionOrder;
                    const isAnswered = answers[qNum] && answers[qNum].toString().trim() !== '';

                    return (
                      <button
                        key={qNum}
                        type="button"
                        onClick={() => {
                          onNavigate(qNum);
                          onClose();
                        }}
                        className="btn d-flex align-items-center justify-content-center fw-bold"
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: '8px',
                          fontSize: '14px',
                          transition: 'all 0.2s',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          backgroundColor: isAnswered ? '#000' : '#fff',
                          color: isAnswered ? '#fff' : '#000',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        onMouseEnter={(e) => {
                          if (!isAnswered) {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isAnswered) {
                            e.currentTarget.style.backgroundColor = '#fff';
                          }
                        }}
                      >
                        {qNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div 
          className="review-modal-footer p-3 bg-light d-flex justify-content-between align-items-center"
          style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}
        >
          {/* Legend / Filters */}
          <div className="d-flex gap-3 small">
            <div 
              className="d-flex align-items-center gap-2" 
              onClick={() => setShowAnswered(!showAnswered)}
              style={{ cursor: 'pointer', userSelect: 'none', opacity: showAnswered ? 1 : 0.4, transition: 'all 0.2s' }}
            >
              <span 
                style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: 3, 
                  background: '#000', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}
              >
                {showAnswered && '✓'}
              </span>
              <span style={{ fontSize: '13px', fontWeight: showAnswered ? 'bold' : 'normal' }}>Answered</span>
            </div>

            <div 
              className="d-flex align-items-center gap-2" 
              onClick={() => setShowUnanswered(!showUnanswered)}
              style={{ cursor: 'pointer', userSelect: 'none', opacity: showUnanswered ? 1 : 0.4, transition: 'all 0.2s' }}
            >
              <span 
                style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: 3, 
                  background: '#fff', 
                  border: '2px solid #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}
              >
                {showUnanswered && '✓'}
              </span>
              <span style={{ fontSize: '13px', fontWeight: showUnanswered ? 'bold' : 'normal' }}>Unanswered</span>
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-dark rounded-pill px-4" 
            onClick={onClose}
            style={{ fontSize: '14px', fontWeight: 600 }}
          >
            Back to Test
          </button>
        </div>
      </div>

      <style>{`
        .review-questions-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 8px;
        }
        @media (max-width: 576px) {
          .review-questions-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default ReviewModal;
