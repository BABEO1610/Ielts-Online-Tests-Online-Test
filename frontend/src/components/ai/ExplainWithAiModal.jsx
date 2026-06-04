import React from 'react';
import PropTypes from 'prop-types';

/**
 * Modal Component to display the AI's explanation.
 * Implements Bootstrap 5 modal structure.
 */
const ExplainWithAiModal = ({ show, onHide, isLoading, explanation, error }) => {
  // EARS[State]: WHEN show is false, THEN do not render the modal content
  if (!show) {
    return null;
  }

  const renderContent = () => {
    // EARS[State]: WHEN isLoading is true, THEN render spinner
    if (isLoading) {
      return (
        <div className="d-flex flex-column align-items-center justify-content-center p-5" data-testid="explain-modal-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-secondary">AI is generating explanation...</p>
        </div>
      );
    }

    // EARS[State]: WHEN error occurs, THEN map specific status codes to warning/danger alerts
    if (error) {
      const status = error.status || 500;
      let alertClass = 'alert-danger';
      let errorTitle = 'Explanation Failed';
      let errorMessage = error.message || 'An unexpected error occurred while fetching the AI explanation.';

      if (status === 403) {
        errorMessage = 'You do not have permission to use this feature. Please upgrade your account.';
      } else if (status === 429) {
        alertClass = 'alert-warning';
        errorTitle = 'Usage Limit Reached';
        errorMessage = 'You have exceeded your AI usage budget. Please try again later or upgrade.';
      } else if (status >= 500) {
        errorMessage = 'The AI service is currently unavailable. Please try again later.';
      }

      return (
        <div className={`alert ${alertClass} m-3`} role="alert" data-testid="explain-modal-error">
          <h5 className="alert-heading"><i className="bi bi-exclamation-triangle-fill me-2"></i>{errorTitle}</h5>
          <p className="mb-0">{errorMessage}</p>
        </div>
      );
    }

    // EARS[State]: WHEN explanation is available, THEN render it in an isolated block
    if (explanation) {
      return (
        <div className="p-3" data-testid="explain-modal-success">
          <div className="bg-light p-3 border rounded mb-3">
            <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{explanation}</p>
          </div>
          {/* EARS[Constraint]: System MUST clarify that this is AI explanation and does NOT replace the correct answer */}
          <div className="text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            <em>Note: This is an AI-generated explanation of the logic. It does not replace the official correct answer.</em>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="modal-backdrop fade show" data-testid="modal-backdrop"></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" data-testid="explain-with-ai-modal">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content border-primary shadow">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">
                <i className="bi bi-robot me-2"></i>
                AI Explanation
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={onHide}
                data-testid="modal-close-button"
              ></button>
            </div>
            <div className="modal-body p-0">
              {renderContent()}
            </div>
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary" onClick={onHide} data-testid="modal-close-footer">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

ExplainWithAiModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  explanation: PropTypes.string,
  error: PropTypes.shape({
    status: PropTypes.number,
    message: PropTypes.string
  })
};

ExplainWithAiModal.defaultProps = {
  isLoading: false,
  explanation: '',
  error: null
};

export default ExplainWithAiModal;
