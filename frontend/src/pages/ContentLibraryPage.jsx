import React, { useState, useEffect } from 'react';
import StudentNavbar from '../components/layout/StudentNavbar';
import TutorLibraryToolbar from '../components/library/TutorLibraryToolbar';
import ResourceCard from '../components/library/ResourceCard';
import ResourceUploadModal from '../components/library/ResourceUploadModal';
import ResourceEditModal from '../components/library/ResourceEditModal';
import useLibrary from '../hooks/useLibrary';
import { useAuth } from '../context/AuthContext';

const ContentLibraryPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { 
    loading, 
    error, 
    fetchResources, 
    deleteResource, 
    downloadResource, 
    clearError 
  } = useLibrary();

  const [resources, setResources] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  
  const limit = 12;
  const canManage = user?.role === 'tutor' || user?.role === 'admin';

  const loadData = async () => {
    try {
      // EARS[Event]: WHEN loading data THEN fetch resources with filters
      const data = await fetchResources({ page: currentPage, limit, resource_type: filterType });
      if (data && data.data) {
        setResources(data.data);
        setTotal(data.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  };

  useEffect(() => {
    // EARS[State-driven]: WHEN page or filter changes THEN reload data
    loadData();
  }, [currentPage, filterType]);

  const handleFilterChange = (type) => {
    setFilterType(type);
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDownload = async (resource) => {
    if (!isAuthenticated) return;
    try {
      await downloadResource(resource.id, resource.title);
    } catch (err) {
      console.error('Download failed:', err);
      alert(err.message || 'Lỗi tải file');
    }
  };

  const handleDelete = async (resource) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${resource.title}"?`)) {
      try {
        await deleteResource(resource.id);
        loadData(); // Reload after delete
      } catch (err) {
        console.error('Delete failed:', err);
        alert(err.message || 'Lỗi xóa tài liệu');
      }
    }
  };

  const openEditModal = (resource) => {
    setSelectedResource(resource);
    setIsEditModalOpen(true);
  };

  const totalPages = Math.ceil(total / limit);

  // EARS[State-driven]: WHEN ContentLibraryPage renders, display navbar, toolbar, filters, and grid
  return (
    <div className="bg-light min-vh-100 pb-5" data-testid="library-page">
      <StudentNavbar />
      
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
          <div className="mb-4 mb-md-0">
            <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
              Thư viện Tài liệu
            </h1>
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Tài liệu luyện thi IELTS (PDF & Audio) chính thống.
            </p>
          </div>
          
          <TutorLibraryToolbar onUploadClick={() => setIsUploadModalOpen(true)} />
        </div>

        {error && !isUploadModalOpen && !isEditModalOpen && (
          <div className="alert alert-danger alert-dismissible fade show rounded-4 border-0" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error.message || 'Không thể tải dữ liệu'}
            <button type="button" className="btn-close" onClick={clearError} aria-label="Close"></button>
          </div>
        )}

        <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-funnel text-muted"></i>
            <span className="fw-medium text-dark">Lọc theo:</span>
          </div>
          
          <div className="d-flex gap-2 overflow-auto pb-2 pb-md-0">
            <button 
              className={`btn rounded-pill px-4 fw-medium text-nowrap ${filterType === '' ? 'btn-dark' : 'btn-light'}`}
              onClick={() => handleFilterChange('')}
              style={{ backgroundColor: filterType === '' ? '#000' : '#efefef' }}
            >
              Tất cả
            </button>
            <button 
              className={`btn rounded-pill px-4 fw-medium text-nowrap ${filterType === 'pdf' ? 'btn-danger text-white' : 'btn-light'}`}
              onClick={() => handleFilterChange('pdf')}
              style={{ backgroundColor: filterType !== 'pdf' ? '#efefef' : '' }}
            >
              Tài liệu PDF
            </button>
            <button 
              className={`btn rounded-pill px-4 fw-medium text-nowrap ${filterType === 'audio' ? 'btn-primary text-white' : 'btn-light'}`}
              onClick={() => handleFilterChange('audio')}
              style={{ backgroundColor: filterType !== 'audio' ? '#efefef' : '' }}
            >
              File Audio
            </button>
          </div>
        </div>

        {loading && resources.length === 0 ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted fw-medium">Đang tải tài liệu...</p>
          </div>
        ) : resources.length > 0 ? (
          <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-5">
              {resources.map((resource) => (
                <div className="col" key={resource.id}>
                  <ResourceCard 
                    resource={resource}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                    canManage={canManage}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav aria-label="Page navigation" className="mt-4">
                <ul className="pagination justify-content-center border-0 gap-2">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link rounded-circle d-flex align-items-center justify-content-center border-0 shadow-sm text-dark bg-white"
                      style={{ width: '40px', height: '40px' }}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                      <button 
                        className={`page-link rounded-circle d-flex align-items-center justify-content-center border-0 fw-medium ${currentPage === page ? 'bg-dark text-white' : 'bg-white text-dark shadow-sm'}`}
                        style={{ width: '40px', height: '40px' }}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  ))}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link rounded-circle d-flex align-items-center justify-content-center border-0 shadow-sm text-dark bg-white"
                      style={{ width: '40px', height: '40px' }}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        ) : (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white mt-4">
            <div className="mb-4">
              <i className="bi bi-folder-x text-muted" style={{ fontSize: '64px' }}></i>
            </div>
            <h4 className="fw-bold text-dark mb-2" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
              Chưa có tài liệu nào
            </h4>
            <p className="text-muted mb-0">
              {filterType 
                ? `Hiện tại chưa có tài liệu ${filterType === 'pdf' ? 'PDF' : 'Audio'} nào được đăng tải.` 
                : 'Thư viện hiện đang trống. Tài liệu sẽ sớm được cập nhật.'}
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      <ResourceUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={loadData}
      />
      
      <ResourceEditModal
        resource={selectedResource}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedResource(null);
        }}
        onSuccess={loadData}
      />
    </div>
  );
};

export default ContentLibraryPage;
