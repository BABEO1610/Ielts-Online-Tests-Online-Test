import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockLibraryDocuments } from './mockLibraryData';

// --- CUSTOM CARD COMPONENT ---
const TutorMockResourceCard = ({ document, onEdit, onDelete, onViewDetail }) => {
  return (
    <div 
      className="card h-100 border-0 p-4 position-relative" 
      style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 16px 0px', 
        cursor: 'pointer', 
        transition: 'transform 0.2s, box-shadow 0.2s' 
      }}
      onClick={() => onViewDetail(document)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'rgba(0, 0, 0, 0.12) 0px 8px 24px 0px';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'rgba(0, 0, 0, 0.08) 0px 4px 16px 0px';
      }}
    >
      <div className="d-flex justify-content-between align-items-start mb-3">
        {/* Tags cho từng file */}
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {document.files.map((file, index) => {
            const isPdf = file.type.toUpperCase() === 'PDF';
            return (
              <span 
                key={index}
                className={`badge rounded-pill px-3 py-2 text-white ${isPdf ? 'bg-danger' : 'bg-primary'}`} 
                style={{ fontSize: '12px', fontWeight: '500' }}
              >
                {file.type}
              </span>
            );
          })}
        </div>
        
        {/* Kebab Menu */}
        <div className="dropdown" onClick={(e) => e.stopPropagation()}>
          <button 
            className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-none dropdown-toggle-no-caret" 
            style={{ width: '32px', height: '32px', backgroundColor: 'transparent' }} 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
          >
            {/* Thay thế Bootstrap icon bằng SVG inline để luôn hiển thị đúng "..." */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e5e5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-4 p-2 mt-1" style={{ zIndex: 1050 }}>
            <li>
              <button className="dropdown-item rounded-3 py-2 fw-medium" onClick={(e) => { e.stopPropagation(); onEdit(document); }}>
                <i className="bi bi-pencil me-2 text-muted"></i>Chỉnh sửa
              </button>
            </li>
            <li><hr className="dropdown-divider my-1" /></li>
            <li>
              <button className="dropdown-item text-danger rounded-3 py-2 fw-medium" onClick={(e) => { e.stopPropagation(); onDelete(document.id); }}>
                <i className="bi bi-trash me-2"></i>Xóa
              </button>
            </li>
          </ul>
        </div>
      </div>
      
      <h5 className="card-title fw-bold text-dark mb-2" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', lineHeight: '28px' }}>
        {document.title}
      </h5>
      
      <p className="card-text text-muted flex-grow-1 mb-4" style={{ fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {document.description || 'Không có mô tả'}
      </p>
      
      <div className="d-flex justify-content-between align-items-end mt-auto pt-3 border-top border-light">
        <div className="text-muted" style={{ fontSize: '12px' }}>
          <div className="mb-1 d-flex align-items-center">
            {/* Sử dụng SVG thay thế cho text icon an toàn hơn */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>{document.files.length} file đính kèm</span>
          </div>
          <div className="d-flex align-items-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>{document.updatedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MODAL CHI TIẾT ---
const TutorDocumentDetailModal = ({ document, onClose }) => {
  if (!document) return null;

  return (
    <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content border-0" style={{ borderRadius: '16px' }}>
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>Chi tiết tài liệu</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body pt-3 pb-4">
            <h4 className="fw-bold mb-3">{document.title}</h4>
            
            <div className="d-flex gap-2 mb-3">
              {document.files.map((file, index) => {
                const isPdf = file.type.toUpperCase() === 'PDF';
                return (
                  <span 
                    key={index}
                    className={`badge rounded-pill px-3 py-2 text-white ${isPdf ? 'bg-danger' : 'bg-primary'}`} 
                    style={{ fontSize: '12px', fontWeight: '500' }}
                  >
                    {file.type} - {file.name} ({file.size})
                  </span>
                );
              })}
            </div>
            
            <p className="text-muted mb-4">{document.description}</p>
            
            <h6 className="fw-bold mb-2 text-dark">Dữ liệu mẫu / Nội dung chi tiết:</h6>
            <div 
              className="p-3" 
              style={{ backgroundColor: '#f7f7f7', borderRadius: '12px', minHeight: '150px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '14px', color: '#333' }}
            >
              {document.sampleData}
            </div>
            
            <div className="text-muted mt-3" style={{ fontSize: '13px' }}>
              Cập nhật lần cuối: {document.updatedAt}
            </div>
          </div>
          <div className="modal-footer border-top-0 pt-0">
            <button type="button" className="btn btn-secondary rounded-pill px-4 fw-medium" onClick={onClose} style={{ backgroundColor: '#efefef', color: '#000', border: 'none' }}>Đóng</button>
            <button type="button" className="btn btn-dark rounded-pill px-4 fw-medium" style={{ backgroundColor: '#000' }}>Tải xuống tất cả</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PRESENTATIONAL COMPONENT ---
const TutorLibraryView = ({ 
  documents, 
  filteredDocuments,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  isLoading, 
  error, 
  onUploadClick, 
  onEditDocument, 
  onDeleteDocument,
  onViewDetail
}) => {
  return (
    <div className="container py-5" style={{ backgroundColor: 'transparent' }}>
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '36px' }}>
            Thư viện tài liệu
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '16px' }}>
            Quản lý tài nguyên luyện thi dành cho giảng viên
          </p>
        </div>
        
        {/* Upload Button */}
        <button 
          onClick={onUploadClick}
          style={{
            backgroundColor: '#000000',
            color: '#ffffff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '999px',
            fontWeight: 500,
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {/* Inline SVG Upload */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload tài liệu
        </button>
      </div>

      {/* Filters Section */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
          <div className="position-absolute top-50 translate-middle-y ms-3 text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text" 
            className="form-control shadow-none border-0 py-2 ps-5"
            style={{ backgroundColor: '#efefef', borderRadius: '999px', fontSize: '15px' }}
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div style={{ minWidth: '200px' }}>
          <select 
            className="form-select shadow-none border-0 py-2 px-4"
            style={{ backgroundColor: '#efefef', borderRadius: '999px', fontSize: '15px', cursor: 'pointer' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">Tất cả kỹ năng</option>
            <option value="IELTS Academic">IELTS Academic</option>
            <option value="IELTS General">IELTS General</option>
            <option value="Listening">Listening</option>
            <option value="Reading">Reading</option>
            <option value="Writing">Writing</option>
            <option value="Speaking">Speaking</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm" role="alert">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-dark" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      ) : documents.length === 0 ? (
        // Empty State (No Data at all)
        <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }}>
          <h5 className="text-dark fw-bold mt-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            Chưa có tài liệu nào
          </h5>
          <p className="text-muted small">Nhấn vào nút "Upload tài liệu" để thêm mới.</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        // Empty State (No matches found)
        <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }}>
          <h5 className="text-dark fw-bold mt-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            Không tìm thấy tài liệu phù hợp
          </h5>
          <p className="text-muted small">Vui lòng thử từ khóa hoặc bộ lọc khác.</p>
        </div>
      ) : (
        // Data Grid
        <div className="row g-4">
          {filteredDocuments.map((doc) => (
            <div className="col-12 col-md-6 col-xl-4" key={doc.id}>
              <TutorMockResourceCard 
                document={doc}
                onEdit={onEditDocument}
                onDelete={onDeleteDocument}
                onViewDetail={onViewDetail}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- CONTAINER COMPONENT (LOGIC) ---
const TutorLibraryPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    // Giả lập việc gọi API fetchDocuments()
    const fetchDocuments = () => {
      setIsLoading(true);
      setError(null);
      
      setTimeout(() => {
        try {
          // Fake API response success
          setDocuments(mockLibraryDocuments);
        } catch (err) {
          setError('Không thể tải danh sách tài liệu. Vui lòng thử lại sau.');
        } finally {
          setIsLoading(false);
        }
      }, 500);
    };

    fetchDocuments();
  }, []);

  const handleUploadClick = () => {
    navigate('/tutor/library/create');
  };

  const handleEditDocument = (doc) => {
    navigate(`/tutor/library/edit/${doc.id}`);
  };

  const handleDeleteDocument = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
      console.log(`Deleted document with id: ${id}`);
    }
  };

  const handleViewDetail = (doc) => {
    setSelectedDocument(doc);
  };

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = doc.title.toLowerCase().includes(searchLower) || 
                          (doc.description && doc.description.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <TutorLibraryView 
        documents={documents}
        filteredDocuments={filteredDocuments}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        isLoading={isLoading}
        error={error}
        onUploadClick={handleUploadClick}
        onEditDocument={handleEditDocument}
        onDeleteDocument={handleDeleteDocument}
        onViewDetail={handleViewDetail}
      />
      
      <TutorDocumentDetailModal 
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </>
  );
};

export default TutorLibraryPage;
