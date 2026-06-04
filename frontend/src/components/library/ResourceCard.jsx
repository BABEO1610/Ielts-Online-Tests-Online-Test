import React from 'react';

const formatFileSize = (bytes) => {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const ResourceCard = ({ resource, onEdit, onDelete, onDownload, canManage, isAuthenticated }) => {
  // EARS[Event]: WHEN user clicks download THEN trigger onDownload
  // EARS[Event]: WHEN user clicks edit/delete THEN trigger onEdit/onDelete if canManage
  
  const isPdf = resource.resource_type === 'pdf';
  
  return (
    <div className="card h-100 border-0 p-4" style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 16px 0px' }} data-testid="resource-card">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <span 
          className={`badge rounded-pill px-3 py-2 text-white ${isPdf ? 'bg-danger' : 'bg-primary'}`} 
          style={{ fontSize: '12px', fontWeight: '500' }}
          data-testid="resource-type-badge"
        >
          {isPdf ? 'PDF' : 'Audio'}
        </span>
        
        {canManage && (
          <div className="dropdown" data-testid="manage-dropdown">
            <button 
              className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-none" 
              style={{ width: '32px', height: '32px', backgroundColor: '#f3f3f3' }} 
              data-bs-toggle="dropdown" 
              aria-expanded="false" 
              data-testid="manage-menu-btn"
            >
              <i className="bi bi-three-dots-vertical" style={{ fontSize: '16px' }}></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-4 p-2 mt-1">
              <li>
                <button className="dropdown-item rounded-3 py-2 fw-medium" onClick={() => onEdit(resource)} data-testid="edit-resource-btn">
                  <i className="bi bi-pencil me-2 text-muted"></i>Chỉnh sửa
                </button>
              </li>
              <li><hr className="dropdown-divider my-1" /></li>
              <li>
                <button className="dropdown-item text-danger rounded-3 py-2 fw-medium" onClick={() => onDelete(resource)} data-testid="delete-resource-btn">
                  <i className="bi bi-trash me-2"></i>Xóa
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      
      <h5 className="card-title fw-bold text-dark mb-2" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', lineHeight: '28px' }}>
        {resource.title}
        {!resource.is_published && canManage && (
          <span className="badge bg-secondary ms-2 align-middle" style={{ fontSize: '10px' }}>Ẩn</span>
        )}
      </h5>
      
      <p className="card-text text-muted flex-grow-1 mb-4" style={{ fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {resource.description || 'Không có mô tả'}
      </p>
      
      <div className="d-flex justify-content-between align-items-end mt-auto pt-3 border-top border-light">
        <div className="text-muted" style={{ fontSize: '12px' }}>
          <div className="mb-1 d-flex align-items-center">
            <i className="bi bi-hdd text-secondary me-2"></i> 
            <span>{formatFileSize(resource.file_size_bytes)}</span>
          </div>
          <div className="d-flex align-items-center">
            <i className="bi bi-calendar3 text-secondary me-2"></i> 
            <span>{formatDate(resource.created_at)}</span>
          </div>
        </div>
        
        {isAuthenticated ? (
          <button 
            className="btn btn-dark rounded-pill px-4 py-2 fw-medium d-flex align-items-center gap-2 transition-all" 
            onClick={() => onDownload(resource)}
            style={{ fontSize: '14px' }}
            data-testid="download-btn"
          >
            <i className="bi bi-download"></i>
            <span className="d-none d-sm-inline">Tải xuống</span>
          </button>
        ) : (
          <button 
            className="btn btn-light rounded-pill px-4 py-2 fw-medium text-muted d-flex align-items-center gap-2 border-0" 
            disabled
            title="Vui lòng đăng nhập để tải xuống"
            style={{ fontSize: '14px', backgroundColor: '#f3f3f3' }}
            data-testid="download-btn-disabled"
          >
            <i className="bi bi-lock-fill"></i>
            <span className="d-none d-sm-inline">Đăng nhập để tải</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;
