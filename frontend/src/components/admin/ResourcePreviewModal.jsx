import React, { useEffect, useState } from 'react';
import { fetchResourceDetail } from '../../services/adminOps.service';
import Badge from '../common/Badge';

const ResourcePreviewModal = ({ resourceId, onClose }) => {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const { data } = await fetchResourceDetail(resourceId);
        if (mounted) setResource(data);
      } catch (err) {
        if (mounted) setError(err.message || 'Không thể tải chi tiết tài liệu');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (resourceId) loadData();
    return () => { mounted = false; };
  }, [resourceId]);

  if (!resourceId) return null;

  // Render file preview based on resource_type
  const renderPreview = () => {
    if (!resource || !resource.file_url) return <p className="text-muted">Không có file đính kèm.</p>;
    
    if (resource.resource_type === 'pdf') {
      return (
        <iframe 
          src={resource.file_url} 
          title={resource.title}
          className="w-100 border rounded"
          style={{ height: '60vh' }}
        />
      );
    }
    if (resource.resource_type === 'audio') {
      return <audio controls src={resource.file_url} className="w-100 mt-3" />;
    }
    if (resource.resource_type === 'video') {
      return <video controls src={resource.file_url} className="w-100 rounded mt-3" style={{ maxHeight: '60vh' }} />;
    }
    
    // Fallback cho file tải về
    return (
      <div className="p-4 bg-light rounded text-center">
        <p className="mb-3">Định dạng file không hỗ trợ xem trước trực tiếp.</p>
        <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          Tải xuống tài liệu
        </a>
      </div>
    );
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3 className="admin-modal__title">Chi tiết tài liệu</h3>
          <button className="admin-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        
        <div className="admin-modal__body">
          {loading && <div className="text-center py-4">Đang tải dữ liệu...</div>}
          {error && <div className="admin-error-banner"><span>⚠ {error}</span></div>}
          
          {resource && (
            <div className="resource-preview">
              <div className="resource-preview__meta mb-4">
                <h4 className="mb-2">{resource.title}</h4>
                <div className="d-flex gap-2 flex-wrap text-muted small">
                  <Badge variant="info">{resource.resource_type.toUpperCase()}</Badge>
                  <span>• Người đăng: {resource.uploaded_by_name || 'Hệ thống'}</span>
                  {resource.file_size_bytes && <span>• Kích thước: {(resource.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>}
                </div>
                {resource.description && <p className="mt-3 mb-0 text-muted">{resource.description}</p>}
              </div>

              <div className="resource-preview__content mt-4">
                <h5 className="mb-3 border-bottom pb-2">Bản xem trước</h5>
                {renderPreview()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcePreviewModal;
