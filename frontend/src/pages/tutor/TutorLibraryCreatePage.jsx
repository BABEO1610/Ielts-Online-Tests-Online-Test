import React from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentForm from '../../components/library/DocumentForm';

const TutorLibraryCreatePage = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-5" style={{ backgroundColor: 'transparent', maxWidth: '800px' }}>
      {/* Header Section */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <button 
          onClick={() => navigate('/tutor/library')}
          className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-none"
          style={{ width: '40px', height: '40px', backgroundColor: '#efefef', color: '#000' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div>
          <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '32px' }}>
            Thêm tài liệu mới
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '16px' }}>
            Upload tài liệu, bài giảng để chia sẻ với học viên
          </p>
        </div>
      </div>

      {/* Form Section */}
      <DocumentForm isEditMode={false} />
    </div>
  );
};

export default TutorLibraryCreatePage;
