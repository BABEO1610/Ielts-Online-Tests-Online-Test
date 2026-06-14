import React, { useState, useRef, useEffect } from 'react';
import useLibrary from '../../hooks/useLibrary';

const ResourceEditModal = ({ resource, isOpen, onClose, onSuccess }) => {
  const { editResource, loading, error, clearError } = useLibrary();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_published: true
  });
  
  const modalRef = useRef(null);

  // EARS[Event]: WHEN modal opens or resource changes THEN reset form with resource data
  useEffect(() => {
    if (isOpen && resource) {
      setFormData({
        title: resource.title || '',
        description: resource.description || '',
        is_published: resource.is_published !== false // Default true unless explicitly false
      });
      clearError();
      
      // Initialize Bootstrap modal display
      if (modalRef.current) {
        modalRef.current.style.display = 'block';
        modalRef.current.classList.add('show');
        document.body.classList.add('modal-open');
        
        let backdrop = document.querySelector('.modal-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          document.body.appendChild(backdrop);
        }
      }
    } else {
      if (modalRef.current) {
        modalRef.current.style.display = 'none';
        modalRef.current.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
      }
    }
    
    return () => {
      document.body.classList.remove('modal-open');
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) backdrop.remove();
    };
  }, [isOpen, resource, clearError]);

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resource) return;
    
    try {
      // EARS[Event]: WHEN user submits edit form THEN call edit API
      await editResource(resource.id, formData);
      
      // EARS[Event]: WHEN edit is successful THEN call onSuccess and close modal
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      // Error is handled by useLibrary hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade" ref={modalRef} tabIndex="-1" role="dialog" aria-labelledby="editModalLabel" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header border-bottom-0 p-4 pb-0">
            <h5 className="modal-title fw-bold" id="editModalLabel" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
              Chỉnh sửa tài liệu
            </h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && (
                <div className="alert alert-danger rounded-3 border-0 bg-danger bg-opacity-10 text-danger" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error.message || 'Có lỗi xảy ra khi cập nhật'}
                </div>
              )}
              
              <div className="mb-3">
                <label htmlFor="edit_title" className="form-label fw-medium text-dark">Tiêu đề tài liệu <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control bg-light border-0 px-3 py-2" 
                  id="edit_title" 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required 
                  maxLength="500"
                  style={{ borderRadius: '8px' }}
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="edit_description" className="form-label fw-medium text-dark">Mô tả chi tiết</label>
                <textarea 
                  className="form-control bg-light border-0 px-3 py-2" 
                  id="edit_description" 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4" 
                  style={{ borderRadius: '8px', resize: 'none' }}
                ></textarea>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-medium text-dark d-block">Trạng thái</label>
                <div className="form-check form-switch mt-2">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="edit_is_published" 
                    name="is_published"
                    checked={formData.is_published}
                    onChange={handleChange}
                    style={{ cursor: 'pointer', width: '40px', height: '20px' }}
                  />
                  <label className="form-check-label ms-2" htmlFor="edit_is_published" style={{ cursor: 'pointer', userSelect: 'none' }}>
                    {formData.is_published ? 'Hiển thị công khai' : 'Đang ẩn'}
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer border-top-0 p-4 pt-0">
              <button 
                type="button" 
                className="btn btn-light rounded-pill px-4 fw-medium" 
                onClick={handleClose}
                disabled={loading}
                style={{ backgroundColor: '#efefef' }}
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="btn btn-dark rounded-pill px-4 fw-medium d-flex align-items-center gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2"></i>
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResourceEditModal;
