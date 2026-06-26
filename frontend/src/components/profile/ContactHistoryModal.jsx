import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const STATUS_LABELS = {
  pending: { label: 'Chưa xử lý', className: 'bg-warning text-dark' },
  in_progress: { label: 'Đang xử lý', className: 'bg-info text-white' },
  resolved: { label: 'Đã giải quyết', className: 'bg-success text-white' },
  unresolved: { label: 'Từ chối', className: 'bg-danger text-white' }
};

const ContactHistoryModal = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const response = await api.get('/support/history');
          if (response.data.success) {
            setHistory(response.data.data || []);
          }
        } catch (error) {
          console.error('Error fetching contact history:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop d-flex align-items-center justify-content-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="bg-white rounded-4 p-4 shadow-lg d-flex flex-column" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh' }}>
        
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="h5 fw-bold m-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            <i className="bi bi-clock-history me-2"></i>Lịch sử hỗ trợ
          </h3>
          <button className="btn-close" onClick={onClose}></button>
        </div>
        
        <div className="flex-grow-1 overflow-auto pe-2" style={{ minHeight: '300px' }}>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center h-100 text-secondary">
              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
              Đang tải lịch sử...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-secondary mt-5">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              Bạn chưa có yêu cầu hỗ trợ nào.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {history.map(item => {
                const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS['pending'];
                return (
                  <div key={item.id} className="border rounded-3 p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <span className={`badge rounded-pill ${statusInfo.className} me-2`}>
                          {statusInfo.label}
                        </span>
                        <small className="text-secondary">
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </small>
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <strong className="d-block mb-1 text-dark" style={{ fontSize: '14px' }}>Tin nhắn của bạn:</strong>
                      <p className="m-0 text-secondary" style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                        {item.message}
                      </p>
                    </div>

                    {item.reply_message && (
                      <div className="mt-3 p-3 bg-white rounded-3 border-start border-4 border-success">
                        <strong className="d-block mb-1 text-success" style={{ fontSize: '14px' }}>
                          <i className="bi bi-person-check-fill me-1"></i> Admin phản hồi:
                        </strong>
                        <p className="m-0 text-dark" style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                          {item.reply_message}
                        </p>
                        {item.resolved_at && (
                          <small className="text-muted d-block mt-2" style={{ fontSize: '12px' }}>
                            Đã giải quyết lúc: {new Date(item.resolved_at).toLocaleString('vi-VN')}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ContactHistoryModal;
