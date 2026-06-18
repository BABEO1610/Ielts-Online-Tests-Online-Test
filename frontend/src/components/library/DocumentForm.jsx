import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createLibraryResource, updateLibraryResource } from '../../services/library.service';

const DocumentForm = ({ initialData, isEditMode }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      category: initialData?.category || 'IELTS Academic',
    },
  });

  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = useRef(null);

  // Khi edit: hiển thị tên file hiện tại nếu có
  const existingFileName = isEditMode && initialData?.file_url
    ? initialData.file_url.split('/').pop()
    : null;

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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Validate: tạo mới bắt buộc phải có file
    if (!isEditMode && !selectedFile) {
      setSubmitError('Vui lòng chọn ít nhất một file để upload.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditMode) {
        // Chỉ cập nhật metadata (title, description, category)
        await updateLibraryResource(initialData.id, {
          title: data.title,
          description: data.description,
          category: data.category,
        });
      } else {
        await createLibraryResource(
          { title: data.title, description: data.description, category: data.category },
          selectedFile
        );
      }
      navigate('/tutor/library');
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        'Có lỗi xảy ra. Vui lòng thử lại.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (file) => {
    if (!file) return null;
    const type = file.type || '';
    const name = file.name || '';
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
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div
      className="card border-0 p-4"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 16px 0px',
        fontFamily: 'UberMoveText, system-ui, sans-serif',
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Tiêu đề */}
        <div className="mb-4">
          <label className="form-label fw-bold text-dark" style={{ fontSize: '16px' }}>
            Tiêu đề tài liệu <span className="text-danger">*</span>
          </label>
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

        {/* Upload File */}
        <div className="mb-5">
          <label className="form-label fw-bold text-dark" style={{ fontSize: '16px' }}>
            Upload File {!isEditMode && <span className="text-danger">*</span>}
          </label>

          {/* Khu vực kéo thả */}
          {!selectedFile && (
            <div
              className={`d-flex flex-column align-items-center justify-content-center p-4 rounded-4 text-center ${isDragging ? 'bg-light' : ''}`}
              style={{
                border: `2px dashed ${isDragging ? '#0d6efd' : '#d2d2d2'}`,
                backgroundColor: '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '180px',
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
                className="d-none"
                ref={fileInputRef}
                onChange={handleFileInput}
                accept=".pdf,.mp3,.mp4,.ogg,.wav,.jpg,.jpeg,.png,.gif"
              />
            </div>
          )}

          {/* File đã chọn */}
          {selectedFile && (
            <div className="mt-2">
              <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: '#f3f3f3' }}>
                <div className="d-flex align-items-center gap-3 overflow-hidden">
                  {getFileIcon(selectedFile)}
                  <div className="text-truncate">
                    <div className="fw-medium text-dark text-truncate" style={{ fontSize: '14px' }}>{selectedFile.name}</div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>{formatSize(selectedFile.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-light rounded-circle p-1 d-flex align-items-center justify-content-center border-0 shadow-none"
                  onClick={removeFile}
                  style={{ width: '32px', height: '32px', backgroundColor: 'transparent' }}
                  title="Xóa file"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e5e5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Edit mode: hiển thị file hiện tại nếu chưa thay file mới */}
          {isEditMode && !selectedFile && existingFileName && (
            <div className="mt-2 p-3 rounded-3 d-flex align-items-center gap-2" style={{ backgroundColor: '#f0f4ff', fontSize: '13px' }}>
              <i className="bi bi-file-earmark-check text-primary"></i>
              <span className="text-muted">File hiện tại: <strong>{existingFileName}</strong> (không thay đổi)</span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="alert alert-danger rounded-3 border-0 mb-3" role="alert" style={{ fontSize: '14px' }}>
            {submitError}
          </div>
        )}

        {/* Buttons */}
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
              isEditMode ? 'Cập nhật tài liệu' : 'Lưu tài liệu'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentForm;
