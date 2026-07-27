import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DocumentForm from '../../components/library/DocumentForm';
import { fetchMyLibraryResourceById } from '../../services/library.service';

const TutorLibraryEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchMyLibraryResourceById(id);
        setDocumentData(res.data);
      } catch (err) {
        const msg =
          err.response?.data?.error?.message || 'Không tìm thấy tài liệu.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoc();
  }, [id]);

  return (
    <div className="container py-5" style={{ backgroundColor: 'transparent', maxWidth: '800px' }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/tutor/library')}
          className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-none"
          style={{ width: '40px', height: '40px', backgroundColor: '#efefef', color: '#000' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div>
          <h1
            className="fw-bold mb-1 text-dark"
            style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '32px' }}
          >
            Chỉnh sửa tài liệu
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '16px' }}>
            Cập nhật thông tin và file đính kèm
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-dark" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm" role="alert">
          {error}
          <div className="mt-2">
            <button
              className="btn btn-sm btn-outline-danger rounded-pill"
              onClick={() => navigate('/tutor/library')}
            >
              Quay lại thư viện
            </button>
          </div>
        </div>
      ) : documentData ? (
        <DocumentForm initialData={documentData} isEditMode={true} />
      ) : null}
    </div>
  );
};

export default TutorLibraryEditPage;
