import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Logic to show limited page numbers (e.g., 1, 2, 3, ..., 10) if totalPages is large
  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="d-flex justify-content-center mt-5 mb-3">
      <nav>
        <ul className="pagination mb-0 gap-2">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link rounded-circle d-flex align-items-center justify-content-center border-0"
              style={{ width: '40px', height: '40px', backgroundColor: currentPage === 1 ? '#f8f9fa' : '#efefef', color: currentPage === 1 ? '#adb5bd' : '#000', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
          </li>
          
          {visiblePages[0] > 1 && (
            <>
              <li className="page-item">
                <button
                  className="page-link rounded-circle d-flex align-items-center justify-content-center border-0 fw-medium"
                  style={{ width: '40px', height: '40px', backgroundColor: '#efefef', color: '#000', boxShadow: 'none' }}
                  onClick={() => onPageChange(1)}
                >
                  1
                </button>
              </li>
              {visiblePages[0] > 2 && (
                <li className="page-item disabled d-flex align-items-center justify-content-center" style={{ width: '20px', color: '#adb5bd' }}>
                  ...
                </li>
              )}
            </>
          )}

          {visiblePages.map(page => (
            <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
              <button
                className="page-link rounded-circle d-flex align-items-center justify-content-center border-0 fw-medium"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: currentPage === page ? '#000' : '#efefef',
                  color: currentPage === page ? '#fff' : '#000',
                  boxShadow: 'none'
                }}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            </li>
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <li className="page-item disabled d-flex align-items-center justify-content-center" style={{ width: '20px', color: '#adb5bd' }}>
                  ...
                </li>
              )}
              <li className="page-item">
                <button
                  className="page-link rounded-circle d-flex align-items-center justify-content-center border-0 fw-medium"
                  style={{ width: '40px', height: '40px', backgroundColor: '#efefef', color: '#000', boxShadow: 'none' }}
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </li>
            </>
          )}

          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link rounded-circle d-flex align-items-center justify-content-center border-0"
              style={{ width: '40px', height: '40px', backgroundColor: currentPage === totalPages ? '#f8f9fa' : '#efefef', color: currentPage === totalPages ? '#adb5bd' : '#000', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
