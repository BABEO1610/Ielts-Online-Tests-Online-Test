import React from 'react';
import PropTypes from 'prop-types';

// EARS[State-driven]: WHEN status is provided, THE component SHALL render the corresponding styled badge.
const Badge = ({ status }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-secondary';
      case 'ai_graded':
      case 'tutor_graded':
        return 'bg-dark text-white';
      case 'failed':
        return 'bg-danger';
      default:
        return 'bg-light text-dark';
    }
  };

  const getLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'ai_graded': return 'AI Graded';
      case 'tutor_graded': return 'Tutor Graded';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  return (
    <span className={`badge rounded-pill ${getBadgeStyle(status)}`}>
      {getLabel(status)}
    </span>
  );
};

Badge.propTypes = {
  status: PropTypes.oneOf(['pending', 'ai_graded', 'tutor_graded', 'failed']).isRequired,
};

export default Badge;
