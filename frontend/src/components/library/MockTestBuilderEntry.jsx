import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MockTestBuilderEntry = ({ resourceId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // EARS[State-driven]: WHEN user is not tutor or admin THEN do not render the entry button
  if (user?.role !== 'tutor' && user?.role !== 'admin') {
    return null;
  }

  const handleClick = () => {
    // EARS[Event]: WHEN tutor clicks Mock Test Builder THEN navigate to objective testing module
    if (resourceId) {
      navigate(`/tutor/mock-tests/builder?source=${resourceId}`);
    } else {
      navigate('/tutor/mock-tests/builder');
    }
  };

  return (
    <button
      className="btn btn-outline-dark rounded-pill px-3 py-1 fw-medium d-flex align-items-center gap-2 shadow-sm transition-all"
      onClick={handleClick}
      style={{ fontSize: '12px' }}
      data-testid="mock-test-builder-entry-btn"
      title="Tạo đề thi trắc nghiệm từ tài liệu này"
    >
      <i className="bi bi-journal-check"></i>
      <span>Tạo đề Mock Test</span>
    </button>
  );
};

export default MockTestBuilderEntry;
