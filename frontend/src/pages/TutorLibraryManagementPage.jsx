import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useLibrary from '../hooks/useLibrary';
import ResourceCard from '../components/library/ResourceCard';
import TutorLibraryToolbar from '../components/library/TutorLibraryToolbar';
import ResourceUploadModal from '../components/library/ResourceUploadModal';
import ResourceEditModal from '../components/library/ResourceEditModal';

const TutorLibraryManagementPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { loading: libLoading, error, fetchResources, deleteResource, downloadResource, clearError } = useLibrary();

  const [resources, setResources] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterPublished, setFilterPublished] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  // EARS[State-driven]: WHEN role is not tutor or admin THEN block access
  const isAuthorized = user?.role === 'tutor' || user?.role === 'admin';

  const loadResources = async () => {
    try {
      const filters = {};
      if (filterType !== 'all') filters.resource_type = filterType;
      // Note: Passing manage flags so the backend can return unpublished as well if implemented
      if (filterPublished !== 'all') filters.is_published = filterPublished;
      filters.manage = true; 
      
      const response = await fetchResources(filters);
      if (response && response.data) {
        setResources(response.data);
      }
    } catch (err) {
      console.error('Error loading resources', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      loadResources();
    }
  }, [isAuthenticated, isAuthorized, filterType, filterPublished]);

  const handleDelete = async (resource) => {
    // EARS[Event]: WHEN delete is confirmed THEN call delete API
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${resource.title}"? Hành động này sẽ ẩn tài liệu (soft delete).`)) {
      try {
        await deleteResource(resource.id);
        loadResources();
      } catch (err) {
        alert(err.message || 'Lỗi khi xóa tài liệu');
      }
    }
  };

  const handleDownload = async (resource) => {
    try {
      await downloadResource(resource.id, resource.title);
    } catch (err) {
      alert(err.message || 'Lỗi khi tải file');
    }
  };

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-dark" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // EARS[Unwanted]: IN CASE unauthorized access THEN redirect
  if (!isAuthenticated || !isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container py-5" style={{ backgroundColor: '#ffffff' }}>
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '36px' }}>Quản lý Thư viện</h1>
          <p className="text-muted mb-0" style={{ fontSize: '16px' }}>Quản lý và cập nhật tài nguyên học tập cho học viên</p>
        </div>
        <TutorLibraryToolbar onUploadClick={() => setShowUploadModal(true)} />
      </div>

      {error && (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm" role="alert">
          {error.message || 'Đã có lỗi xảy ra'}
          <button type="button" className="btn-close float-end" onClick={clearError} aria-label="Close"></button>
        </div>
      )}

      {/* Filters */}
      <div className="d-flex gap-3 mb-4 p-3 rounded-4" style={{ backgroundColor: '#efefef' }}>
        <div>
          <label className="form-label text-dark small fw-medium mb-1">Loại tài liệu</label>
          <select 
            className="form-select border-0 shadow-sm" 
            style={{ borderRadius: '8px', backgroundColor: '#ffffff' }}
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            data-testid="filter-type-select"
          >
            <option value="all">Tất cả</option>
            <option value="pdf">PDF</option>
            <option value="audio">Audio</option>
          </select>
        </div>
        <div>
          <label className="form-label text-dark small fw-medium mb-1">Trạng thái</label>
          <select 
            className="form-select border-0 shadow-sm" 
            style={{ borderRadius: '8px', backgroundColor: '#ffffff' }}
            value={filterPublished} 
            onChange={(e) => setFilterPublished(e.target.value)}
            data-testid="filter-status-select"
          >
            <option value="all">Tất cả</option>
            <option value="true">Đã Published</option>
            <option value="false">Đang Ẩn</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {libLoading && resources.length === 0 ? (
        <div className="text-center py-5">
          <div className="spinner-border text-dark" role="status"></div>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }}>
          <i className="bi bi-folder-x display-4 text-muted mb-3"></i>
          <h5 className="text-dark fw-bold" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>Chưa có tài liệu nào</h5>
          <p className="text-muted small">Hãy upload tài liệu đầu tiên để chia sẻ với học viên</p>
        </div>
      ) : (
        <div className="row g-4">
          {resources.map((resource) => (
            <div className="col-12 col-md-6 col-lg-4" key={resource.id}>
              <ResourceCard 
                resource={resource}
                canManage={true}
                isAuthenticated={isAuthenticated}
                onEdit={(r) => setEditingResource(r)}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <ResourceUploadModal 
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadResources();
          }}
        />
      )}

      {editingResource && (
        <ResourceEditModal 
          isOpen={!!editingResource}
          resource={editingResource}
          onClose={() => setEditingResource(null)}
          onSuccess={() => {
            setEditingResource(null);
            loadResources();
          }}
        />
      )}
    </div>
  );
};

export default TutorLibraryManagementPage;
