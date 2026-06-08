import React from 'react';
import { useAuth } from '../../context/AuthContext';

const TutorLibraryToolbar = ({ onUploadClick }) => {
  const { user } = useAuth();
  
  // EARS[State-driven]: WHEN user role is 'tutor' or 'admin' THEN render the upload button
  const canManage = user?.role === 'tutor' || user?.role === 'admin';

  if (!canManage) return null;

  return (
    <div className="d-flex justify-content-end mb-4" data-testid="tutor-library-toolbar">
      <button 
        className="btn btn-dark rounded-pill px-4 py-2 fw-medium d-flex align-items-center gap-2 shadow-sm"
        onClick={onUploadClick}
        style={{ fontSize: '16px' }}
        data-testid="upload-resource-btn"
      >
        <i className="bi bi-cloud-arrow-up-fill"></i>
        <span>Upload tài liệu</span>
      </button>
    </div>
  );
};

export default TutorLibraryToolbar;
