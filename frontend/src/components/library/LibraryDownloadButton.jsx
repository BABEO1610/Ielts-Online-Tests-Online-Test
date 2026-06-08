import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useLibrary from '../../hooks/useLibrary';

const LibraryDownloadButton = ({ resource }) => {
  const { isAuthenticated } = useAuth();
  const { downloadResource } = useLibrary();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // EARS[State-driven]: WHEN user is Guest (not authenticated) THEN prompt to login
    if (!isAuthenticated) {
      // EARS[Event]: WHEN Guest clicks download THEN show login prompt (via confirm and redirect)
      const wantsToLogin = window.confirm('Vui lòng đăng nhập hoặc đăng ký để tải tài liệu này. Bạn có muốn đi đến trang đăng nhập?');
      if (wantsToLogin) {
        navigate('/login');
      }
      return;
    }

    // EARS[Event]: WHEN Student clicks download THEN call API to download file safely without exposing physical path
    try {
      setIsDownloading(true);
      await downloadResource(resource.id, resource.title);
    } catch (error) {
      alert(error.message || 'Lỗi khi tải file. Vui lòng thử lại sau.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button 
      className={`btn ${isAuthenticated ? 'btn-dark' : 'btn-light text-muted border-0'} rounded-pill px-4 py-2 fw-medium d-flex align-items-center gap-2 transition-all shadow-sm`} 
      onClick={handleDownloadClick}
      disabled={isDownloading}
      style={{ fontSize: '14px', backgroundColor: !isAuthenticated ? '#f3f3f3' : undefined }}
      data-testid="library-download-btn"
    >
      {isDownloading ? (
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      ) : (
        <i className={isAuthenticated ? "bi bi-download" : "bi bi-lock-fill"}></i>
      )}
      <span className="d-none d-sm-inline">
        {isDownloading ? 'Đang tải...' : (isAuthenticated ? 'Tải xuống' : 'Đăng nhập để tải')}
      </span>
    </button>
  );
};

export default LibraryDownloadButton;
