import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const DocumentForm = ({ initialData, isEditMode }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      category: initialData?.category || 'IELTS Academic'
    }
  });

  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Pre-fill existing files if in Edit Mode
  useEffect(() => {
    if (isEditMode && initialData?.files) {
      // Mocking existing files as simple objects for display purposes
      const existing = initialData.files.map(f => ({
        name: f.name,
        size: parseInt(f.size) * 1024 * 1024 || 0, // Mock bytes
        type: f.type === 'PDF' ? 'application/pdf' : 'audio/mpeg',
        isExisting: true
      }));
      setSelectedFiles(existing);
    }
  }, [initialData, isEditMode]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };

  const handleFilesAdded = (files) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    // Simulate FormData construction
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    
    selectedFiles.forEach((file) => {
      // For existing mock files, we might just pass IDs or skip in a real API
      if (!file.isExisting) {
        formData.append('files', file);
      }
    });

    console.log('--- FORM DATA ENTRIES ---');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ':', pair[1]);
    }
    console.log('-------------------------');

    // Simulate API Call
    setTimeout(() => {
      setIsSubmitting(false);
      alert(isEditMode ? 'Cập nhật tài liệu thành công!' : 'Tạo mới tài liệu thành công!');
      navigate('/tutor/library');
    }, 1500);
  };

  const getFileIcon = (type, name) => {
    if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
      return <i className="bi bi-file-earmark-pdf text-danger fs-4"></i>;
    }
    if (type.includes('audio') || name.toLowerCase().endsWith('.mp3')) {
      return <i className="bi bi-file-earmark-music text-primary fs-4"></i>;
    }
    if (type.includes('image')) {
      return <i className="bi bi-file-earmark-image text-success fs-4"></i>;
    }
    return <i className="bi bi-file-earmark text-secondary fs-4"></i>;
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="card border-0 p-4" style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 16px 0px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Tiêu đề */}
        <div className="mb-4">
          <label className="form-label fw-bold text-dark" style={{ fontSize: '16px' }}>Tiêu đề tài liệu <span className="text-danger">*</span></label>
          <input 
            type="text" 
            className={`form-control shadow-none border-0 px-3 py-2 ${errors.title ? 'is-invalid' : ''}`}
            style={{ backgroundColor: '#efefef', borderRadius: '8px', fontSize: '16px' }}
            placeholder="Nhập tiêu đề tài liệu"
            {...register('title', { required: 'Tiêu đề là bắt buộc' })}
          />
          {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
        </div>

        {/* Phân loại */}
        <div className="mb-4">
          <label className="form-label fw-bold text-dark" style={{ fontSize: '16px' }}>Phân loại</label>
          <select 
            className="form-select shadow-none border-0 px-3 py-2"
            style={{ backgroundColor: '#efefef', borderRadius: '8px', fontSize: '16px' }}
            {...register('category')}
          >
            <option value="IELTS Academic">IELTS Academic</option>
            <option value="IELTS General">IELTS General</option>
            <option value="Listening">Listening</option>
            <option value="Reading">Reading</option>
            <option value="Writing">Writing</option>
            <option value="Speaking">Speaking</option>
          </select>
        </div>

        {/* Mô tả */}
        <div className="mb-4">
          <label className="form-label fw-bold text-dark" style={{ fontSize: '16px' }}>Mô tả chi tiết</label>
          <textarea 
            className="form-control shadow-none border-0 px-3 py-2"
            style={{ backgroundColor: '#efefef', borderRadius: '8px', fontSize: '16px', minHeight: '120px' }}
            placeholder="Nhập mô tả cho tài liệu..."
            {...register('description')}
          ></textarea>
        </div>

        {/* Kéo thả File */}
        <div className="mb-5">
          <label className="form-label fw-bold text-dark" style={{ fontSize: '16px' }}>Upload File</label>
          
          <div 
            className={`d-flex flex-column align-items-center justify-content-center p-4 rounded-4 text-center ${isDragging ? 'bg-light border-primary' : ''}`}
            style={{ 
              border: '2px dashed #d2d2d2', 
              backgroundColor: '#fafafa', 
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '180px'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="bi bi-cloud-arrow-up text-muted mb-2" style={{ fontSize: '32px' }}></i>
            <h6 className="fw-bold mb-1" style={{ fontSize: '16px' }}>Kéo thả file vào đây hoặc nhấn để chọn</h6>
            <p className="text-muted small mb-0">Hỗ trợ PDF, Audio (MP3), Hình ảnh (tối đa 50MB/file)</p>
            <input 
              type="file" 
              multiple 
              className="d-none" 
              ref={fileInputRef} 
              onChange={handleFileInput}
            />
          </div>

          {/* Danh sách file đã chọn */}
          {selectedFiles.length > 0 && (
            <div className="mt-3">
              <p className="fw-bold mb-2 small text-muted">File đã chọn ({selectedFiles.length})</p>
              <div className="d-flex flex-column gap-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: '#f3f3f3' }}>
                    <div className="d-flex align-items-center gap-3 overflow-hidden">
                      {getFileIcon(file.type || '', file.name)}
                      <div className="text-truncate">
                        <div className="fw-medium text-dark text-truncate" style={{ fontSize: '14px' }}>{file.name}</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>{formatSize(file.size)}</div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-light rounded-circle p-1 d-flex align-items-center justify-content-center border-0 shadow-none btn-remove-file" 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      style={{ width: '32px', height: '32px', backgroundColor: 'transparent' }}
                      title="Xóa file này"
                    >
                      {/* SVG X (Đóng/Xóa) */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e5e5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nút bấm */}
        <div className="d-flex justify-content-end gap-3 pt-3 border-top border-light">
          <button 
            type="button" 
            className="btn btn-light rounded-pill px-4 fw-medium" 
            style={{ backgroundColor: '#efefef', color: '#000', border: 'none', fontSize: '16px' }}
            onClick={() => navigate('/tutor/library')}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            className="btn btn-dark rounded-pill px-4 fw-medium d-flex align-items-center gap-2" 
            style={{ backgroundColor: '#000', fontSize: '16px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Đang lưu...
              </>
            ) : (
              'Lưu tài liệu'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentForm;
