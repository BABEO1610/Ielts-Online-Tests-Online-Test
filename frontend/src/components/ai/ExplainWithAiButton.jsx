import React from 'react';
import PropTypes from 'prop-types';

/**
 * Component for the button that triggers the AI explanation modal.
 */
const ExplainWithAiButton = ({ onClick }) => {
  return (
    <button
      className="btn btn-outline-primary btn-sm mt-2 d-inline-flex align-items-center"
      onClick={onClick}
      data-testid="explain-with-ai-button"
    >
      <i className="bi bi-robot me-2"></i>
      Explain with AI
    </button>
  );
};

ExplainWithAiButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default ExplainWithAiButton;
