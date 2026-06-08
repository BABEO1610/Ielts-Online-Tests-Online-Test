import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * ModeSelector.jsx
 * Component dùng chung để chọn chế độ làm bài: Thi thật / Luyện tập
 */
const ModeSelector = ({ show, onHide, onSelectMode, examType, parts, fullDuration }) => {
  const [selectedParts, setSelectedParts] = useState([]);
  const [timeLimit, setTimeLimit] = useState(fullDuration || 60);

  useEffect(() => {
    if (show && parts && parts.length > 0) {
      setSelectedParts(parts.map(p => p.id));
    }
  }, [show, parts]);

  if (!show) return null;

  const handleTogglePart = (partId) => {
    if (selectedParts.includes(partId)) {
      if (selectedParts.length > 1) { // Prevent unchecking all
        setSelectedParts(selectedParts.filter(id => id !== partId));
      }
    } else {
      setSelectedParts([...selectedParts, partId]);
    }
  };

  const handleToggleFull = () => {
    if (selectedParts.length === parts.length) {
      // Uncheck all? No, prevent empty. Maybe just check the first one.
      setSelectedParts([parts[0].id]);
    } else {
      setSelectedParts(parts.map(p => p.id));
    }
  };

  const isFullTasks = selectedParts.length === (parts?.length || 0);

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onHide}>
      <div 
        className="modal-content p-5 rounded-4 shadow" 
        style={{ backgroundColor: '#fff', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-center w-100" style={{ fontFamily: 'UberMove, system-ui, sans-serif', color: '#e68a47' }}>
            Choose a mode
          </h2>
          <button className="btn-close position-absolute" style={{ right: '24px', top: '24px' }} onClick={onHide}></button>
        </div>

        <div className="row g-4">
          {/* Practice Mode Card */}
          <div className="col-md-6">
            <div className="p-4 rounded-4 h-100 d-flex flex-column" style={{ border: '1px solid #e2e2e2', backgroundColor: '#fff' }}>
              <div className="text-center mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#253a5e" strokeWidth="1.5" className="mb-2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M7 8h10M7 12h10M7 16h10" />
                  <circle cx="12" cy="12" r="10" stroke="none" fill="#f8f9fa" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <h3 className="fw-bold" style={{ color: '#253a5e', fontFamily: 'UberMove, system-ui, sans-serif' }}>Practice mode</h3>
                <p className="text-muted small mt-2">
                  <span className="me-2">💡</span>
                  Practice mode is suitable for improving accuracy and time spent on each part.
                </p>
              </div>

              {parts && parts.length > 0 && (
                <div className="mb-4">
                  <p className="fw-bold mb-2" style={{ color: '#253a5e' }}>1. Choose part/task(s) you want to practice:</p>
                  
                  <div className="form-check mb-2">
                    <input className="form-check-input" type="checkbox" id="fullTasks" checked={isFullTasks} onChange={handleToggleFull} />
                    <label className="form-check-label text-muted" htmlFor="fullTasks">
                      Full tasks ({parts.length} parts)
                    </label>
                  </div>
                  
                  <div className="ps-3 border-start ms-2 mt-2">
                    {parts.map(part => (
                      <div className="form-check mb-2" key={part.id}>
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id={`part-${part.id}`}
                          checked={selectedParts.includes(part.id)}
                          onChange={() => handleTogglePart(part.id)}
                        />
                        <label className="form-check-label text-muted" htmlFor={`part-${part.id}`}>
                          {part.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 flex-grow-1">
                <p className="fw-bold mb-2" style={{ color: '#253a5e' }}>2. Choose a time limit:</p>
                <select 
                  className="form-select text-muted" 
                  value={timeLimit || ''} 
                  onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
                  style={{ borderRadius: '20px' }}
                >
                  <option value="">No time limit</option>
                  <option value="10">10 mins</option>
                  <option value="20">20 mins</option>
                  <option value="30">30 mins</option>
                  <option value="40">40 mins</option>
                  <option value="50">50 mins</option>
                  <option value="60">60 mins</option>
                  <option value="90">90 mins</option>
                  <option value="120">120 mins</option>
                </select>
              </div>

              <button 
                className="btn w-100 rounded-pill py-2 fw-bold"
                style={{ backgroundColor: '#e68a47', color: '#fff' }}
                onClick={() => onSelectMode({ isPractice: true, selectedPartIds: selectedParts, customTimeLimit: timeLimit })}
                data-testid="mode-practice"
              >
                Start Now
              </button>
            </div>
          </div>

          {/* Simulation Test Mode Card */}
          <div className="col-md-6">
            <div className="p-4 rounded-4 h-100 d-flex flex-column" style={{ border: '1px solid #e2e2e2', backgroundColor: '#fdfdfd' }}>
              <div className="text-center mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#253a5e" strokeWidth="1.5" className="mb-2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                <h3 className="fw-bold" style={{ color: '#253a5e', fontFamily: 'UberMove, system-ui, sans-serif' }}>Simulation test mode</h3>
                <p className="text-muted small mt-2">
                  <span className="me-2">💡</span>
                  Simulation test mode is the best option to experience the real IELTS on computer.
                </p>
              </div>

              <div className="mb-4 flex-grow-1">
                <p className="fw-bold mb-2" style={{ color: '#253a5e' }}>Test information</p>
                <p className="text-muted">Full tasks ({fullDuration || 60} minutes - {parts ? parts.length : 'All'} parts)</p>
              </div>

              <button 
                className="btn w-100 rounded-pill py-2 fw-bold mt-auto"
                style={{ backgroundColor: '#e68a47', color: '#fff' }}
                onClick={() => onSelectMode({ isPractice: false, selectedPartIds: parts?.map(p => p.id) || [], customTimeLimit: fullDuration || 60 })}
                data-testid="mode-real-test"
              >
                Start Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ModeSelector.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onSelectMode: PropTypes.func.isRequired,
  examType: PropTypes.string,
  parts: PropTypes.array,
  fullDuration: PropTypes.number
};

ModeSelector.defaultProps = {
  examType: 'IELTS',
  parts: [],
  fullDuration: 60
};

export default ModeSelector;
