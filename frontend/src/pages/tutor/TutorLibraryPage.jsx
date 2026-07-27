import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  fetchLibraryResources,
  fetchMyLibraryResources,
  deleteLibraryResource,
} from '../../services/library.service';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('vi-VN');
}

function fileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${BACKEND_URL}${url}`;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function ResourceTypeBadge({ type }) {
  const config = {
    pdf:   { label: 'PDF',   cls: 'bg-danger' },
    audio: { label: 'Audio', cls: 'bg-primary' },
    video: { label: 'Video', cls: 'bg-success' },
    other: { label: 'Khác',  cls: 'bg-secondary' },
  };
  const { label, cls } = config[type] || config.other;
  return (
    <span
      className={`badge rounded-pill px-3 py-2 text-white ${cls}`}
      style={{ fontSize: '12px', fontWeight: '500' }}
    >
      {label}
    </span>
  );
}

function ReviewStatusBadge({ status }) {
  const config = {
    pending:  { label: 'Chờ duyệt', bg: '#FFF3CD', color: '#856404', border: '#FFEAA7' },
    approved: { label: 'Đã duyệt',  bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
    rejected: { label: 'Từ chối',   bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  };
  const cfg = config[status] || config.pending;
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: '600',
        padding: '3px 10px',
        borderRadius: '999px',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        backgroundColor: cfg.color, display: 'inline-block',
      }} />
      {cfg.label}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

const ResourceCard = ({ document, onEdit, onDelete, onViewDetail, isOwner }) => {
  return (
    <div
      className="card h-100 border-0 p-4 position-relative"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 16px 0px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
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
      {/* Header: type badge + kebab */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <ResourceTypeBadge type={document.resource_type} />
          {document.review_status && (
            <ReviewStatusBadge status={document.review_status} />
          )}
        </div>

        {/* Kebab Menu — chỉ hiển thị cho chủ sở hữu */}
        {isOwner && (
          <div className="dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-none"
              style={{ width: '32px', height: '32px', backgroundColor: 'transparent' }}
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5e5e5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-4 p-2 mt-1" style={{ zIndex: 1050 }}>
              <li>
                <button
                  className="dropdown-item rounded-3 py-2 fw-medium"
                  onClick={(e) => { e.stopPropagation(); onEdit(document); }}
                >
                  <i className="bi bi-pencil me-2 text-muted"></i>Chỉnh sửa
                </button>
              </li>
              <li><hr className="dropdown-divider my-1" /></li>
              <li>
                <button
                  className="dropdown-item text-danger rounded-3 py-2 fw-medium"
                  onClick={(e) => { e.stopPropagation(); onDelete(document.id); }}
                >
                  <i className="bi bi-trash me-2"></i>Xóa
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      <h5
        className="card-title fw-bold text-dark mb-2"
        style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px', lineHeight: '28px' }}
      >
        {document.title}
      </h5>

      <p
        className="card-text text-muted flex-grow-1 mb-4"
        style={{ fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {document.description || 'Không có mô tả'}
      </p>

      <div className="d-flex justify-content-between align-items-end mt-auto pt-3 border-top border-light">
        <div className="text-muted" style={{ fontSize: '12px' }}>
          {document.file_size_bytes && (
            <div className="mb-1 d-flex align-items-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>{formatSize(document.file_size_bytes)}</span>
            </div>
          )}
          <div className="d-flex align-items-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{formatDate(document.updated_at)}</span>
          </div>
        </div>
        {document.category && (
          <span className="badge bg-light text-dark rounded-pill px-2" style={{ fontSize: '11px' }}>
            {document.category}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Document Viewer Modal ────────────────────────────────────────────────────

const DocumentViewerModal = ({ document, onClose }) => {
  if (!document) return null;

  const url = fileUrl(document.file_url);
  const isPdf    = document.resource_type === 'pdf';
  const isAudio  = document.resource_type === 'audio';
  const isVideo  = document.resource_type === 'video';
  const ext      = document.file_url?.split('.').pop()?.toLowerCase();
  const isArchive = ['zip', 'rar', '7z'].includes(ext);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1055,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: isPdf ? '900px' : '560px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <ResourceTypeBadge type={document.resource_type} />
              {document.review_status && <ReviewStatusBadge status={document.review_status} />}
            </div>
            <h5 className="fw-bold mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px' }}>
              {document.title}
            </h5>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Đóng"
          />
        </div>

        {/* Viewer Area */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {isPdf && (
            <iframe
              src={url}
              title={document.title}
              style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none' }}
            />
          )}
          {isAudio && (
            <div className="d-flex flex-column align-items-center justify-content-center p-5 gap-3">
              <div style={{ fontSize: '64px' }}>🎵</div>
              <p className="text-muted mb-3" style={{ fontSize: '14px' }}>
                {document.file_url?.split('/').pop()}
              </p>
              <audio
                controls
                src={url}
                style={{ width: '100%', maxWidth: '400px' }}
              >
                Trình duyệt không hỗ trợ phát audio.
              </audio>
            </div>
          )}
          {isVideo && (
            <div className="d-flex align-items-center justify-content-center p-4 h-100">
              <video
                controls
                src={url}
                style={{ width: '100%', maxHeight: '480px', borderRadius: '8px' }}
              >
                Trình duyệt không hỗ trợ phát video.
              </video>
            </div>
          )}
          {!isPdf && !isAudio && !isVideo && (
            <div className="d-flex flex-column align-items-center justify-content-center p-5 gap-3 text-center">
              {isArchive ? (
                <>
                  <div style={{ fontSize: '72px' }}>📦</div>
                  <div>
                    <h6 className="fw-bold mb-2">{document.file_url?.split('/').pop()}</h6>
                    <p className="text-muted mb-1" style={{ fontSize: '14px' }}>
                      File nén không thể xem trực tiếp trên trình duyệt.
                    </p>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                      Tải về máy rồi giải nén để lấy tất cả nội dung bên trong<br />
                      <span className="text-dark fw-medium">(ví dụ: đề bài PDF + file audio MP3)</span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <p className="text-muted">Không thể xem trước loại file này.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="d-flex justify-content-between align-items-center p-4 border-top" style={{ backgroundColor: '#fafafa' }}>
          <div className="text-muted" style={{ fontSize: '13px' }}>
            {document.description && <span>{document.description}</span>}
            {document.file_size_bytes && (
              <span className="ms-3">📦 {formatSize(document.file_size_bytes)}</span>
            )}
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn rounded-pill px-4 fw-medium"
              onClick={onClose}
              style={{ backgroundColor: '#efefef', color: '#000', border: 'none', fontSize: '14px' }}
            >
              Đóng
            </button>
            <a
              href={url.includes('supabase.co') ? `${url}?download=` : url}
              download
              className="btn btn-dark rounded-pill px-4 fw-medium"
              style={{ fontSize: '14px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Tải xuống
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── View Component ───────────────────────────────────────────────────────────

const TutorLibraryView = ({
  documents,
  filteredDocuments,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  ownerTab,
  setOwnerTab,
  isLoading,
  error,
  onUploadClick,
  onEditDocument,
  onDeleteDocument,
  onViewDetail,
  currentUserId,
}) => {
  return (
    <div className="container py-5" style={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1
            className="fw-bold mb-1 text-dark"
            style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '36px' }}
          >
            Thư viện tài liệu
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '16px' }}>
            Quản lý tài nguyên luyện thi dành cho giảng viên
          </p>
        </div>

        <button
          onClick={onUploadClick}
          style={{
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '999px',
            fontWeight: 500,
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload tài liệu
        </button>
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        {/* Tab: Tất cả / Của tôi */}
        <div className="d-flex gap-2 me-2">
          {['all', 'mine'].map((tab) => (
            <button
              key={tab}
              onClick={() => setOwnerTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: ownerTab === tab ? '#000' : '#efefef',
                color: ownerTab === tab ? '#fff' : '#333',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'all' ? 'Tất cả' : 'Của tôi'}
            </button>
          ))}
        </div>

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

      {/* Error */}
      {error && (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm" role="alert">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-dark" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }}>
          <h5 className="text-dark fw-bold mt-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            Chưa có tài liệu nào
          </h5>
          <p className="text-muted small">Nhấn vào nút &quot;Upload tài liệu&quot; để thêm mới.</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-5 rounded-4" style={{ backgroundColor: '#efefef' }}>
          <h5 className="text-dark fw-bold mt-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            Không tìm thấy tài liệu phù hợp
          </h5>
          <p className="text-muted small">Vui lòng thử từ khóa hoặc bộ lọc khác.</p>
        </div>
      ) : (
        <div className="row g-4">
          {filteredDocuments.map((doc) => (
            <div className="col-12 col-md-6 col-xl-4" key={doc.id}>
              <ResourceCard
                document={doc}
                onEdit={onEditDocument}
                onDelete={onDeleteDocument}
                onViewDetail={onViewDetail}
                isOwner={doc.uploaded_by === currentUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Container ────────────────────────────────────────────────────────────────

const TutorLibraryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ownerTab, setOwnerTab] = useState('all'); // 'all' | 'mine'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLibraryResources(), fetchMyLibraryResources()])
      .then(([publicResponse, myResponse]) => {
        if (cancelled) return;
        const merged = new Map();
        for (const doc of publicResponse.data || []) merged.set(doc.id, doc);
        for (const doc of myResponse.data || []) merged.set(doc.id, doc);
        setDocuments([...merged.values()]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.data?.error?.message ||
          'Không thể tải danh sách tài liệu. Vui lòng thử lại sau.'
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state?.message, navigate]);

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này? Hành động không thể hoàn tác.')) return;
    try {
      await deleteLibraryResource(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Xóa thất bại. Vui lòng thử lại.');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      doc.title.toLowerCase().includes(s) ||
      (doc.description && doc.description.toLowerCase().includes(s));
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesOwner = ownerTab === 'all' || doc.uploaded_by === user?.id;
    return matchesSearch && matchesCategory && matchesOwner;
  });

  return (
    <>
      {successMessage && (
        <div className="alert alert-success alert-dismissible mx-auto mt-4 mb-0" style={{ maxWidth: '1200px' }}>
          {successMessage}
          <button
            type="button"
            className="btn-close"
            aria-label="Đóng"
            onClick={() => setSuccessMessage(null)}
          />
        </div>
      )}
      <TutorLibraryView
        documents={documents}
        filteredDocuments={filteredDocuments}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        ownerTab={ownerTab}
        setOwnerTab={setOwnerTab}
        isLoading={isLoading}
        error={error}
        onUploadClick={() => navigate('/tutor/library/create')}
        onEditDocument={(doc) => navigate(`/tutor/library/edit/${doc.id}`)}
        onDeleteDocument={handleDeleteDocument}
        onViewDetail={setSelectedDocument}
        currentUserId={user?.id}
      />

      <DocumentViewerModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </>
  );
};

export default TutorLibraryPage;
