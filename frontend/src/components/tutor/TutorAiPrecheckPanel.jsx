import React from 'react';
import PropTypes from 'prop-types';

/**
 * Read-only panel for Tutors to view AI automated precheck results.
 */
const TutorAiPrecheckPanel = ({ precheckData, onTriggerPrecheck, isLoading, error }) => {
  return (
    <div className="card border-secondary shadow-sm mb-4" data-testid="tutor-ai-precheck-panel">
      <div className="card-header bg-secondary text-white d-flex align-items-center">
        <i className="bi bi-shield-check me-2 fs-5"></i>
        <h5 className="mb-0">AI Precheck Analysis (Tutor Only)</h5>
      </div>

      <div className="card-body bg-light">
        {/* EARS[State]: WHEN error occurs, THEN show error alert */}
        {error && (
          <div className="alert alert-danger" role="alert" data-testid="precheck-error-alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {typeof error === 'string' ? error : error.message || 'Failed to perform AI precheck.'}
          </div>
        )}

        {/* EARS[State]: WHEN loading, THEN show spinner */}
        {isLoading && (
          <div className="text-center p-3" data-testid="precheck-loading">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Running automated checks...</p>
          </div>
        )}

        {/* EARS[State]: WHEN no data and not loading, THEN show trigger button */}
        {!isLoading && !precheckData && !error && (
          <div className="text-center p-3" data-testid="precheck-empty">
            <p className="text-muted mb-3">No AI precheck has been run for this submission yet.</p>
            <button
              className="btn btn-primary"
              onClick={onTriggerPrecheck}
              data-testid="trigger-precheck-btn"
            >
              <i className="bi bi-play-circle me-2"></i>
              Run AI Precheck
            </button>
          </div>
        )}

        {/* EARS[Constraint]: Panel MUST be strictly read-only and not contain inputs that conflict with tutor form */}
        {/* EARS[State]: WHEN data exists, THEN render read-only results */}
        {!isLoading && precheckData && (
          <div data-testid="precheck-results">
            {precheckData.valid ? (
              <div className="alert alert-success d-flex align-items-center mb-0" role="alert" data-testid="precheck-valid">
                <i className="bi bi-check-circle-fill fs-4 me-3"></i>
                <div>
                  <strong>All checks passed!</strong>
                  <div className="small mt-1">Bài làm đủ điều kiện cơ bản để chấm (Word count, Relevance, etc. are acceptable).</div>
                </div>
              </div>
            ) : (
              <div className="alert alert-danger mb-0" role="alert" data-testid="precheck-invalid">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-x-circle-fill fs-4 me-2"></i>
                  <strong>Issues Detected</strong>
                </div>
                {precheckData.issues && precheckData.issues.length > 0 ? (
                  <ul className="mb-0 ps-3">
                    {precheckData.issues.map((issue, idx) => (
                      <li key={idx} className="mb-1">{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-0 small">Automated checks failed, but no specific issues were detailed.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

TutorAiPrecheckPanel.propTypes = {
  precheckData: PropTypes.shape({
    valid: PropTypes.bool.isRequired,
    issues: PropTypes.arrayOf(PropTypes.string)
  }),
  onTriggerPrecheck: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};

TutorAiPrecheckPanel.defaultProps = {
  precheckData: null,
  isLoading: false,
  error: null
};

export default TutorAiPrecheckPanel;
