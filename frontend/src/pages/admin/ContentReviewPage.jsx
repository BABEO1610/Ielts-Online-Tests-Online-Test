import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchPendingTests, fetchPendingResources, fetchPublishSchedule,
  reviewTest, reviewResource,
} from '../../services/adminOps.service';
import { formatDateTime, formatBytes } from '../../utils/adminFormat';
import TestPreviewModal from '../../components/admin/TestPreviewModal';
import ResourcePreviewModal from '../../components/admin/ResourcePreviewModal';

function daysUntil(iso) {
  const diff = new Date(iso) - new Date();
  const days = Math.ceil(diff / 86400000);
  return days <= 0 ? 'Hôm nay' : `${days} ngày`;
}

const TABS = [
  { key: 'tests', label: 'Đề thi chờ duyệt' },
  { key: 'resources', label: 'Tài liệu chờ duyệt' },
  { key: 'schedule', label: 'Lịch đăng' },
];

const ContentReviewPage = () => {
  const [tab, setTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [resources, setResources] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState(null);
  const [previewTestId, setPreviewTestId] = useState(null);
  const [previewResourceId, setPreviewResourceId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r, s] = await Promise.all([
        fetchPendingTests(),
        fetchPendingResources(),
        fetchPublishSchedule(),
      ]);
      setTests(t.data ?? []);
      setResources(r.data ?? []);
      setSchedule(s.data ?? []);
      setIsSample(t.isSample || r.isSample || s.isSample);
    } catch (err) {
      setActionError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onReviewTest = async (id, action) => {
    setActionError(null);
    try {
      await reviewTest(id, action);
      setTests((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setActionError(err.message);
    }
  };
  const onReviewResource = async (id, action) => {
    setActionError(null);
    try {
      await reviewResource(id, action);
      setResources((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Duyệt nội dung</h1>
          <p className="body-sm text-secondary m-0">Phê duyệt đề thi và tài liệu do giảng viên đăng, theo dõi lịch đăng.</p>
        </div>
        {isSample && <span className="admin-data-note">● Dữ liệu mẫu (chưa nối API nội dung)</span>}
      </div>

      {actionError && (
        <div className="admin-error-banner" role="alert">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} aria-label="Đóng">✕</button>
        </div>
      )}

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Đề thi chờ duyệt</span><span className="stat-card__value">{tests.length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Tài liệu chờ duyệt</span><span className="stat-card__value">{resources.length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Đã lên lịch đăng</span><span className="stat-card__value">{schedule.length}</span></div>
      </div>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        {TABS.map((tt) => (
          <button key={tt.key} className={`btn-pill ${tab === tt.key ? 'btn-pill--dark' : 'btn-pill--ghost'}`} onClick={() => setTab(tt.key)}>
            {tt.label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          {loading ? (
            <div className="text-center py-4 text-secondary">Đang tải…</div>
          ) : tab === 'tests' ? (
            <table className="admin-table">
              <thead><tr><th>Tên đề thi</th><th>Kỹ năng</th><th>Độ khó</th><th>Giảng viên</th><th>Gửi lúc</th><th>Lịch đăng</th><th className="text-end">Duyệt</th></tr></thead>
              <tbody>
                {tests.length === 0 ? <tr><td colSpan={7} className="text-center py-4 text-secondary">Không có đề thi chờ duyệt.</td></tr> :
                  tests.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">
                        <button className="btn-link-table text-start" onClick={() => setPreviewTestId(t.id)}>
                          {t.title}
                        </button>
                      </td>
                      <td><span className="pill pill--info text-capitalize">{t.skill}</span></td>
                      <td className="text-secondary text-capitalize">{t.difficulty}</td>
                      <td>{t.created_by}</td>
                      <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(t.submitted_at)}</td>
                      <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>{t.publish_at ? formatDateTime(t.publish_at) : 'Đăng ngay'}</td>
                      <td className="text-end">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button className="btn-pill btn-pill--dark" onClick={() => onReviewTest(t.id, 'approve')}>Duyệt</button>
                          <button className="btn-pill btn-pill--reject" onClick={() => onReviewTest(t.id, 'reject')}>Từ chối</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : tab === 'resources' ? (
            <table className="admin-table">
              <thead><tr><th>Tài liệu</th><th>Loại</th><th>Dung lượng</th><th>Giảng viên</th><th>Tải lên</th><th className="text-end">Duyệt</th></tr></thead>
              <tbody>
                {resources.length === 0 ? <tr><td colSpan={6} className="text-center py-4 text-secondary">Không có tài liệu chờ duyệt.</td></tr> :
                  resources.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">
                        <button className="btn-link-table text-start" onClick={() => setPreviewResourceId(r.id)}>
                          {r.title}
                        </button>
                      </td>
                      <td><span className="pill pill--neutral text-uppercase">{r.resource_type}</span></td>
                      <td className="text-secondary">{formatBytes(r.file_size_bytes)}</td>
                      <td>{r.uploaded_by}</td>
                      <td className="text-secondary" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</td>
                      <td className="text-end">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button className="btn-pill btn-pill--dark" onClick={() => onReviewResource(r.id, 'approve')}>Duyệt</button>
                          <button className="btn-pill btn-pill--reject" onClick={() => onReviewResource(r.id, 'reject')}>Từ chối</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Nội dung</th><th>Loại</th><th>Người tạo</th><th>Thời điểm đăng</th><th>Còn lại</th></tr></thead>
              <tbody>
                {schedule.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-secondary">Chưa có nội dung lên lịch.</td></tr> :
                  schedule.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-semibold">{s.title}</td>
                      <td><span className="pill pill--neutral">{s.kind}</span></td>
                      <td>{s.created_by}</td>
                      <td className="text-secondary">{formatDateTime(s.publish_at)}</td>
                      <td className="text-secondary">{daysUntil(s.publish_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Preview Modals */}
      {previewTestId && (
        <TestPreviewModal 
          testId={previewTestId} 
          onClose={() => setPreviewTestId(null)} 
        />
      )}
      {previewResourceId && (
        <ResourcePreviewModal 
          resourceId={previewResourceId} 
          onClose={() => setPreviewResourceId(null)} 
        />
      )}
    </div>
  );
};



export default ContentReviewPage;
