import React from 'react';
import PropTypes from 'prop-types';

// EARS[State-driven]: WHEN isLoading is true, THE component SHALL render a pulsing skeleton block.
const LoadingSkeleton = ({ width, height, type = 'text' }) => {
  const style = {
    width: width || '100%',
    height: height || '20px',
  };

  let extraClass = '';
  if (type === 'circular') {
    extraClass = 'rounded-circle';
  } else if (type === 'rectangular') {
    extraClass = 'rounded-0';
  }

  return (
    <div className="placeholder-glow w-100">
      <span className={`placeholder col-12 ${extraClass}`} style={style} data-testid="skeleton"></span>
    </div>
  );
};

LoadingSkeleton.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  type: PropTypes.oneOf(['text', 'circular', 'rectangular']),
};

export default LoadingSkeleton;
