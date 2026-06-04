import React from 'react';
import PropTypes from 'prop-types';

/**
 * Standardized Component for displaying AI-related errors.
 * Maps HTTP status codes to user-friendly messages based on the Error Matrix.
 */
const AiErrorMessage = ({ error, onRetry }) => {
  // EARS[State]: WHEN error is null, THEN render nothing
  if (!error) return null;

  const status = error.status || 500;

  let alertClass = 'alert-danger';
  let iconClass = 'bi-exclamation-triangle-fill';
  let title = 'Error';
  let message = error.message || 'An unexpected error occurred.';
  let isRetryable = false;

  // EARS[State]: Error Matrix Mapping
  switch (status) {
    case 400:
      title = 'Bad Request';
      message = 'The AI service received invalid data. Please check your submission.';
      break;
    case 403:
      title = 'Access Denied';
      message = 'You do not have permission to use this AI feature. Please upgrade your account.';
      break;
    case 409:
      alertClass = 'alert-warning';
      iconClass = 'bi-exclamation-circle-fill';
      title = 'Conflict';
      message = 'This action cannot be completed because the session or resource state has changed (e.g., session ended).';
      break;
    case 429:
      alertClass = 'alert-warning';
      iconClass = 'bi-exclamation-circle-fill';
      title = 'Usage Limit Reached';
      message = 'You have exceeded your AI usage budget. Please try again later or upgrade your plan.';
      break;
    case 502:
    case 503:
    case 504:
      title = 'Service Unavailable';
      message = 'The AI provider is currently overloaded or down. Please try again in a few minutes.';
      isRetryable = true;
      break;
    default:
      title = 'System Error';
      break;
  }

  return (
    <div className={`alert ${alertClass} shadow-sm d-flex flex-column`} role="alert" data-testid={`ai-error-message-${status}`}>
      <div className="d-flex align-items-center mb-2">
        <i className={`bi ${iconClass} fs-5 me-2`}></i>
        <strong className="fs-6">{title}</strong>
      </div>
      <p className="mb-0 text-break">{message}</p>

      {/* EARS[State]: WHEN error is 502/503/504 AND onRetry is provided, THEN show retry button */}
      {isRetryable && onRetry && (
        <div className="mt-3">
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={onRetry}
            data-testid="ai-error-retry-btn"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Try Again
          </button>
        </div>
      )}
    </div>
  );
};

AiErrorMessage.propTypes = {
  error: PropTypes.shape({
    status: PropTypes.number,
    message: PropTypes.string
  }),
  onRetry: PropTypes.func
};

export default AiErrorMessage;
