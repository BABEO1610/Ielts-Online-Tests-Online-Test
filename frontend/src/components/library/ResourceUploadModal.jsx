import React, { useState, useRef, useEffect } from 'react';
import useLibrary from '../../hooks/useLibrary';

const ResourceUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const { uploadResource, loading, error, clearError } = useLibrary();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'pdf',
    is_published: true
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  
  const modalRef = useRef(null);

  // EARS[Event]: WHEN modal opens THEN reset state
  useEffect(() => {
    if (isOpen) {
      setFormData({ title: '', description: '', resource_type: 'pdf', is_published: true });
      setFile(null);
      setFileError('');
      clearError();
      
      // Initialize Bootstrap modal if needed or let parent manage display
      if (modalRef.current) {
        modalRef.current.style.display = 'block';
        modalRef.current.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Add backdrop
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
        
        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
    };
  }, [isOpen, clearError]);

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFileError('');
    clearError();
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Validate file size client-side
    // EARS[State-driven]: WHEN resource_type is pdf THEN limit is 20MB, ELSE limit is 100MB
    const maxSize = formData.resource_type === 'pdf' ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
    
    if (selectedFile.size > maxSize) {
      setFileError(`File vượt quá dung lượng cho phép (${formData.resource_type === 'pdf' ? '20MB' : '100MB'})`);
      setFile(null);
      e.target.value = ''; // Reset input
      return;
    }
    
    setFile(selectedFile);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // If resource type changes, re-validate current file
    if (name === 'resource_type' && file) {
      const maxSize = value === 'pdf' ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setFileError(`File hiện tại vượt quá dung lượng cho phép của ${value.toUpperCase()} (${value === 'pdf' ? '20MB' : '100MB'})`);
        setFile(null);
        // We'd need to clear the file input visually too, but React ref is needed for that. 
        // For simplicity, we just clear the state and show error.
      } else {
        setFileError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setFileError('Vui lòng chọn file hợp lệ');
      return;
    }
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('resource_type', formData.resource_type);
      data.append('is_published', formData.is_published);
      data.append('file', file);
      
      // EARS[Event]: WHEN user submits form THEN call upload API
      await uploadResource(data);
      
      // EARS[Event]: WHEN upload is successful THEN call onSuccess and close modal
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      // Error is handled by useLibrary hook
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal fade" 
      ref={modalRef} 
      tabIndex="-1" 
      role="dialog" 
      aria-labelledby="uploadModalLabel"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header border-bottom-0 p-4 pb-0">
            <h5 className="modal-title fw-bold" id="uploadModalLabel" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
              Upload tài liệu mới
            </h5>
            {/* 📌 [SWIMLANE L1-B2 | STT 1] ✕ btn-close (header)
                 Loại: <button> | Dòng gốc: L157
                 Action: onClick → handleClose() → clearError() + onClose()
                 Ghi chú: Đóng modal, reset toàn bộ form state */}
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && (
                <div className="alert alert-danger rounded-3 border-0 bg-danger bg-opacity-10 text-danger" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error.message || 'Có lỗi xảy ra khi upload'}
                </div>
              )}
              
              <div className="row g-4">
                <div className="col-md-8">
                  <div className="mb-3">
                    <label htmlFor="title" className="form-label fw-medium text-dark">Tiêu đề tài liệu <span className="text-danger">*</span></label>
                    {/* 📌 [SWIMLANE L1-B2 | STT 2] Input: Tiêu đề tài liệu
                         Loại: <input type="text"> | Dòng gốc: L173–L184
                         State: formData.title | required, maxLength=500
                         Action: onChange → handleChange → setFormData */}
                    <input 
                      type="text" 
                      className="form-control bg-light border-0 px-3 py-2" 
                      id="title" 
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required 
                      maxLength="500"
                      placeholder="VD: Cambridge IELTS 16 Academic PDF"
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label fw-medium text-dark">Mô tả chi tiết</label>
                    {/* 📌 [SWIMLANE L1-B2 | STT 3] Textarea: Mô tả chi tiết
                         Loại: <textarea> | Dòng gốc: L189–L198
                         State: formData.description | rows=4, optional
                         Action: onChange → handleChange → setFormData */}
                    <textarea 
                      className="form-control bg-light border-0 px-3 py-2" 
                      id="description" 
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="4" 
                      placeholder="Nhập mô tả về tài liệu, đối tượng sử dụng..."
                      style={{ borderRadius: '8px', resize: 'none' }}
                    ></textarea>
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="resource_type" className="form-label fw-medium text-dark">Loại tài liệu</label>
                    {/* 📌 [SWIMLANE L1-B2 | STT 4] Dropdown: Loại tài liệu
                         Loại: <select> | Dòng gốc: L205–L215
                         State: formData.resource_type (default: 'pdf')
                         Options: 'pdf' → 'Tài liệu PDF' | 'audio' → 'File Audio (Nghe)'
                         Side-effect: thay đổi giá trị này → re-validate file size (L100–L110)
                                      và thay đổi accept attribute của fileInput (L247) */}
                    <select 
                      className="form-select bg-light border-0 px-3 py-2 form-select-lg" 
                      id="resource_type" 
                      name="resource_type"
                      value={formData.resource_type}
                      onChange={handleChange}
                      style={{ borderRadius: '8px', fontSize: '16px' }}
                    >
                      <option value="pdf">Tài liệu PDF</option>
                      <option value="audio">File Audio (Nghe)</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-medium text-dark d-block">Trạng thái</label>
                    {/* 📌 [SWIMLANE L1-B2 | STT 5] Toggle Switch: Trạng thái công khai
                         Loại: <input type="checkbox" role="switch"> | Dòng gốc: L221–L233
                         State: formData.is_published (default: true)
                         Hiện: true → 'Hiển thị công khai' | false → 'Đang ẩn'
                         Action: onChange → handleChange → setFormData({ is_published: checked }) */}
                    <div className="form-check form-switch mt-2">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        role="switch" 
                        id="is_published" 
                        name="is_published"
                        checked={formData.is_published}
                        onChange={handleChange}
                        style={{ cursor: 'pointer', width: '40px', height: '20px' }}
                      />
                      <label className="form-check-label ms-2" htmlFor="is_published" style={{ cursor: 'pointer', userSelect: 'none' }}>
                        {formData.is_published ? 'Hiển thị công khai' : 'Đang ẩn'}
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="col-12">
                  <div className="p-4 rounded-4 bg-light border border-2 border-dashed text-center" style={{ borderStyle: 'dashed' }}>
                    <i className={`bi ${formData.resource_type === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-music'} text-muted`} style={{ fontSize: '48px' }}></i>
                    <h6 className="fw-medium mt-3 mb-2 text-dark">Chọn file để tải lên</h6>
                    
                    {/* 📌 [SWIMLANE L1-B2 | STT 7] Upload File — Input file ẩn
                         Loại: <input type="file" hidden> | Dòng gốc: L243–L249
                         id="fileInput" — được trigger bởi <label htmlFor="fileInput"> bên dưới
                         accept: pdf → '.pdf' | audio → '.mp3,.wav,.m4a' (thay đổi theo resource_type)
                         Action: onChange → handleFileChange → validate size → setFile(selectedFile)
                         Validate: PDF ≤ 20MB | Audio ≤ 100MB (L79–L87) */}
                    <input 
                      type="file" 
                      className="d-none" 
                      id="fileInput" 
                      accept={formData.resource_type === 'pdf' ? '.pdf' : '.mp3,.wav,.m4a'}
                      onChange={handleFileChange}
                    />
                    
                    {/* 📌 [SWIMLANE L1-B2 | STT 6] Button: Duyệt file
                         Loại: <label htmlFor="fileInput"> (giả button) | Dòng gốc: L251–L257
                         Action: click → mở hộp thoại chọn file của OS (trigger input#fileInput)
                         Ghi chú: KHÔNG phải <button>, là <label> styled as button */}
                    <label 
                      htmlFor="fileInput" 
                      className="btn btn-dark rounded-pill px-4 py-2 mt-2"
                      style={{ cursor: 'pointer' }}
                    >
                      Duyệt file
                    </label>
                    
                    {file && (
                      <div className="mt-3 p-2 bg-white rounded-3 shadow-sm d-inline-block text-start w-auto">
                        <span className="fw-medium px-3"><i className="bi bi-check-circle-fill text-success me-2"></i>{file.name}</span>
                      </div>
                    )}
                    
                    {fileError && (
                      <p className="text-danger mt-2 mb-0" style={{ fontSize: '14px' }}>
                        <i className="bi bi-exclamation-circle me-1"></i>{fileError}
                      </p>
                    )}
                    
                    <p className="text-muted mt-3 mb-0" style={{ fontSize: '13px' }}>
                      Định dạng hỗ trợ: {formData.resource_type === 'pdf' ? '.pdf' : '.mp3, .wav, .m4a'}
                      <br />
                      Dung lượng tối đa: <strong className="text-dark">{formData.resource_type === 'pdf' ? '20MB' : '100MB'}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer border-top-0 p-4 pt-0">
              {/* 📌 [SWIMLANE L1-B2 | STT 8] Button: Hủy bỏ
                   Loại: <button type="button"> | Dòng gốc: L282–L290
                   Action: onClick → handleClose() → clearError() + onClose()
                   State: disabled khi loading=true (đang upload) */}
              <button 
                type="button" 
                className="btn btn-light rounded-pill px-4 fw-medium" 
                onClick={handleClose}
                disabled={loading}
                style={{ backgroundColor: '#efefef' }}
              >
                Hủy bỏ
              </button>
              {/* 📌 [SWIMLANE L1-B2 | STT 9] Button: Lưu tài liệu ("Tải lên ngay")
                   Loại: <button type="submit"> | Dòng gốc: L291–L307
                   Action: submit form → handleSubmit() → new FormData() → uploadResource(data)
                           → onSuccess() → handleClose()
                   State: disabled khi (loading=true || file=null)
                   UI: khi loading → hiện spinner + "Đang tải lên..." | bình thường → "Tải lên ngay" */}
              <button 
                type="submit" 
                className="btn btn-dark rounded-pill px-4 fw-medium d-flex align-items-center gap-2" 
                disabled={loading || !file}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Đang tải lên...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up-fill"></i>
                    <span>Tải lên ngay</span>
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

export default ResourceUploadModal;
