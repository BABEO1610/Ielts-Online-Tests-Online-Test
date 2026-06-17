import React, { useState } from 'react';

const SubmissionViewer = ({ task }) => {
  const [viewMode, setViewMode] = useState('text'); // 'original' or 'text'

  const hasOriginalFile = task.fileType === 'image' || task.fileType === 'pdf';
  const wordCount = task.extractedText ? task.extractedText.trim().split(/\s+/).length : 0;

  return (
    <div className="d-flex flex-column h-100">
      <div className="mb-4">
        <h6 className="fw-bold text-dark mb-2">Đề bài (Task Prompt)</h6>
        <div className="p-4 rounded-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8' }}>
          <p className="mb-0 text-dark fw-medium" style={{ lineHeight: '1.6' }}>
            {task.prompt}
          </p>
        </div>
      </div>

      <div className="d-flex flex-column flex-grow-1">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold text-dark mb-0">Bài làm (Student's Response)</h6>
          
          <div className="d-flex align-items-center gap-3">
            {/* Toggle Switch */}
            {hasOriginalFile && (
              <div className="btn-group bg-light rounded-pill p-1 border" role="group">
                <button 
                  type="button" 
                  className={`btn btn-sm rounded-pill px-3 fw-medium ${viewMode === 'original' ? 'btn-dark' : 'btn-light border-0'}`}
                  onClick={() => setViewMode('original')}
                >
                  <i className="bi bi-file-image me-1"></i> File gốc
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm rounded-pill px-3 fw-medium ${viewMode === 'text' ? 'btn-dark' : 'btn-light border-0'}`}
                  onClick={() => setViewMode('text')}
                >
                  <i className="bi bi-fonts me-1"></i> Bản dịch Text
                </button>
              </div>
            )}
            
            <span className="badge bg-light text-dark border px-3 py-2 rounded-pill">
              Word count: {wordCount}
            </span>
          </div>
        </div>

        <div className="flex-grow-1 p-4 rounded-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', minHeight: '400px' }}>
          {viewMode === 'original' && hasOriginalFile ? (
            <div className="text-center h-100 d-flex flex-column justify-content-center">
              {task.fileType === 'image' ? (
                <img src={task.originalFileUrl} alt="Student Submission" className="img-fluid rounded" style={{ maxHeight: '600px', objectFit: 'contain' }} />
              ) : (
                <div className="text-muted p-5">
                  <i className="bi bi-file-pdf fs-1 d-block mb-3"></i>
                  PDF Viewer Placeholder for {task.originalFileUrl}
                </div>
              )}
            </div>
          ) : (
            <p className="mb-0 text-dark" style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {task.extractedText || 'Không có bản dịch text cho bài nộp này.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionViewer;
