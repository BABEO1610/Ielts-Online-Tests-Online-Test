import React from 'react';
import PropTypes from 'prop-types';

/**
 * Component to display the AI processing state using Bootstrap 5.
 */
const AiProcessingState = ({ status, error, onRetry }) => {
  // EARS[State]: WHEN status is 'processing', THEN display loading spinner
  if (status === 'processing') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-4 border rounded bg-light" data-testid="ai-processing-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 mb-0 fw-bold text-secondary">AI is grading your submission, please wait...</p>
      </div>
    );
  }

  // EARS[State]: WHEN status is 'error', THEN display error alert and retry button
  if (status === 'error') {
    return (
      <div className="alert alert-danger d-flex flex-column align-items-center p-4" role="alert" data-testid="ai-processing-error">
        <h5 className="alert-heading">Grading Failed</h5>
        <p className="text-center">{typeof error === 'string' ? error : error?.message || 'An unexpected error occurred during AI processing.'}</p>
        {onRetry && (
          <button
            className="btn btn-outline-danger mt-2 fw-bold"
            onClick={onRetry}
            data-testid="ai-retry-button"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // EARS[Constraint]: WHEN status is 'completed' or 'idle', THEN system shall not render an empty state block
  return null;
};

AiProcessingState.propTypes = {
  status: PropTypes.oneOf(['idle', 'processing', 'completed', 'error']).isRequired,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onRetry: PropTypes.func
};

export default AiProcessingState;
