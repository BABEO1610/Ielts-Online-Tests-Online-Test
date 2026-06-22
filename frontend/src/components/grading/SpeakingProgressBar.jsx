import React from 'react';

const SpeakingProgressBar = ({ exam, currentPartIndex }) => {
  return (
    <div className="bottom-nav-bar" style={{ cursor: 'default' }}>
      <div className="bottom-nav-tabs justify-content-center">
        {exam.parts.map((part, idx) => {
          const isActive = idx === currentPartIndex;
          const isDone = idx < currentPartIndex;
          
          let icon = null;
          if (isDone) {
            icon = <i className="bi bi-check-circle-fill text-success me-2"></i>;
          } else if (isActive) {
            icon = <i className="bi bi-circle-fill text-primary me-2" style={{ fontSize: '10px' }}></i>;
          } else {
            icon = <i className="bi bi-circle text-muted me-2" style={{ fontSize: '10px' }}></i>;
          }

          return (
            <div 
              key={idx}
              className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
              style={{ minWidth: '150px', justifyContent: 'center', pointerEvents: 'none', borderBottom: isActive ? '3px solid #000' : 'none', opacity: isDone || isActive ? 1 : 0.5 }}
            >
              <div className="d-flex align-items-center">
                {icon}
                <span className={`fw-bold ${isActive ? 'text-dark' : 'text-muted'}`}>Part {idx + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpeakingProgressBar;
