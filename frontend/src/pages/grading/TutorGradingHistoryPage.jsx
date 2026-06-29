import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import GradingHistoryTable from '../../components/grading/GradingHistoryTable';
import GradingDetailModal from '../../components/grading/GradingDetailModal';
import GradingRevokeModal from '../../components/grading/GradingRevokeModal';
import { getGradingHistory, getGradingHistoryStats, revokeGradingResult } from '../../services/gradingHistory.service';
import { exportToCsv } from '../../utils/exportCsv';
import { useToast, ToastContainer } from '../../components/common/Toast';

// ─── Shared config ─────────────────────────────────────────────────────────────
export const STATUS_MAP = {
  graded:   { label: 'Đã trả điểm',       bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
  edited:   { label: 'Đã chỉnh sửa điểm', bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
  disputed: { label: 'Đang khiếu nại',    bg: '#ffebee', color: '#c62828', border: '#ef9a9a' },
};

export const SKILL_MAP = {
  writing:  { label: 'Writing',  bg: '#000',    color: '#fff' },
  speaking: { label: 'Speaking', bg: '#efefef', color: '#333' },
};

const PAGE_SIZE     = 5;

// Cột export CSV
const CSV_COLUMNS = [
  { key: 'date',        label: 'Ngày' },
  { key: 'time',        label: 'Giờ' },
  { key: 'studentName', label: 'Học sinh' },
  { key: 'studentCode', label: 'Mã học sinh' },
  { key: 'testName',    label: 'Bài thi' },
  { key: 'skill',       label: 'Kỹ năng' },
  { key: 'band',        label: 'Band điểm' },
  { key: 'status',      label: 'Trạng thái' },
  { key: 'feedbackStr', label: 'Loại feedback' },
];

const mapRawStatus = (rawStatus) => {
  if (rawStatus === 'reviewed') return 'disputed';
  return 'graded';
};

// ─── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, dark = false }) => (
  <div style={{
    backgroundColor: dark ? '#000' : '#dcdcdc', borderRadius: '16px',
    padding: '20px 28px', flex: 1, display: 'flex',
    flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px',
  }}>
    <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: dark ? '#aaa' : '#555', fontFamily: 'UberMoveText, system-ui, sans-serif', marginBottom: '10px' }}>
      {label}
    </div>
    <div>
      <div style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'UberMove, system-ui, sans-serif', color: dark ? '#fff' : '#000', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '12px', color: dark ? '#aaa' : '#666', marginTop: '4px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>{sub}</div>}
    </div>
  </div>
);

// ─── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, total, onPageChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', flexWrap: 'wrap', gap: '12px' }}>
    <span style={{ fontSize: '13px', color: '#888' }}>Trang {page} / {totalPages} — {total} bài chấm</span>
    <div style={{ display: 'flex', gap: '6px' }}>
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
        style={{ padding: '8px 18px', borderRadius: '999px', border: '1px solid #ddd', backgroundColor: page === 1 ? '#f5f5f5' : '#fff', color: page === 1 ? '#bbb' : '#000', fontSize: '14px', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'UberMoveText, system-ui, sans-serif', fontWeight: 500 }}>
        ← Trước
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onPageChange(p)}
          style={{ width: '36px', height: '36px', borderRadius: '999px', border: p === page ? 'none' : '1px solid #ddd', backgroundColor: p === page ? '#000' : '#fff', color: p === page ? '#fff' : '#000', fontSize: '14px', fontWeight: p === page ? 700 : 400, cursor: 'pointer', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
          {p}
        </button>
      ))}
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages || totalPages === 0}
        style={{ padding: '8px 18px', borderRadius: '999px', border: '1px solid #ddd', backgroundColor: (page === totalPages || totalPages === 0) ? '#f5f5f5' : '#fff', color: (page === totalPages || totalPages === 0) ? '#bbb' : '#000', fontSize: '14px', cursor: (page === totalPages || totalPages === 0) ? 'default' : 'pointer', fontFamily: 'UberMoveText, system-ui, sans-serif', fontWeight: 500 }}>
        Tiếp →
      </button>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TutorGradingHistoryPage = () => {
  const navigate = useNavigate();
  const [historyList, setHistoryList]   = useState([]);
  const [stats, setStats]               = useState({ total_graded_month: 0, avg_band_score_month: 0, pending_complaints: 0 });
  const [total, setTotal]               = useState(0);

  const [page, setPage]                 = useState(1);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [detailRecord, setDetailRecord] = useState(null);
  const [revokeRecord, setRevokeRecord] = useState(null);
  const [loading, setLoading]           = useState(true);
  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, historyRes] = await Promise.all([
          getGradingHistoryStats(),
          getGradingHistory({ page, limit: PAGE_SIZE })
        ]);
        
        if (statsRes && statsRes.success) {
          setStats(statsRes.data);
        }
        
        if (historyRes && historyRes.success) {
          const mappedHistory = historyRes.data.map(item => {
            const dateObj = new Date(item.gradedAt);
            return {
              id: item.submissionId,
              time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              date: dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              rawDate: dateObj,
              studentName: item.studentName || 'N/A',
              studentCode: item.studentId ? item.studentId.substring(0, 8) : 'N/A',
              testName: item.testTitle || 'N/A',
              skill: item.skill,
              band: item.bandScore,
              feedbackTypes: item.feedbackTypes,
              status: mapRawStatus(item.rawStatus)
            };
          });
          setHistoryList(mappedHistory);
          setTotal(historyRes.meta.total);
        }
      } catch (error) {
        console.error('Error fetching grading history:', error);
        showToast('Lỗi khi tải dữ liệu lịch sử', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, showToast, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExportCsv = async () => {
    try {
      const res = await getGradingHistory({ export: true });
      if (res && res.success) {
        const rows = res.data.map(item => {
          const dateObj = new Date(item.gradedAt);
          const mappedStatus = mapRawStatus(item.rawStatus);
          return {
            date: dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            studentName: item.studentName || 'N/A',
            studentCode: item.studentId ? item.studentId.substring(0, 8) : 'N/A',
            testName: item.testTitle || 'N/A',
            skill: SKILL_MAP[item.skill]?.label ?? item.skill,
            band: item.bandScore,
            status: STATUS_MAP[mappedStatus]?.label ?? item.rawStatus,
            feedbackStr: item.feedbackTypes?.join('; ') ?? ''
          };
        });
        exportToCsv(`lich-su-cham-bai-${Date.now()}.csv`, CSV_COLUMNS, rows);
      }
    } catch (error) {
      console.error('Export failed', error);
      showToast('Lỗi khi xuất CSV', 'error');
    }
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: '1400px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>

      {/* Title + Export button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '32px', fontWeight: 700, fontFamily: 'UberMove, system-ui, sans-serif', color: '#000' }}>
            Lịch sử chấm bài
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>
            Toàn bộ bài chấm đã hoàn tất — xem lại, chỉnh sửa hoặc thu hồi kết quả.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          title="Xuất danh sách hiện tại ra file CSV (Excel)"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '999px',
            backgroundColor: '#000', color: '#fff', border: 'none',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'UberMoveText, system-ui, sans-serif',
            whiteSpace: 'nowrap', transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <span>⬇</span> Xuất CSV ({total})
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Tổng bài đã chấm (Tháng)" value={stats.total_graded_month || 0} />
        <StatCard label="Điểm Band trung bình (Tháng)" value={`Band ${stats.avg_band_score_month || '0.0'}`} dark />
        <StatCard label="Khiếu nại đang xử lý" value={stats.pending_complaints || 0} sub="bài cần xem xét" />
      </div>



      {/* Table */}
      <GradingHistoryTable
        rows={historyList}
        statusMap={STATUS_MAP}
        skillMap={SKILL_MAP}
        onView={setDetailRecord}
        onEdit={(r) => {
          if (r.skill && r.id) {
            navigate(`/grading/tutor/grade/${r.skill}/${r.id}?mode=edit`);
          }
        }}
        onRevoke={setRevokeRecord}
        loading={loading}
      />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      {/* Modals */}
      <GradingDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} statusMap={STATUS_MAP} skillMap={SKILL_MAP} />
      <GradingRevokeModal
        record={revokeRecord}
        onClose={() => setRevokeRecord(null)}
        onConfirm={async (_id) => {
          try {
            const res = await revokeGradingResult(revokeRecord.id);
            if (res && res.success) {
              showToast(
                `Đã thu hồi kết quả của ${revokeRecord?.studentName ?? 'học sinh'}.`,
                'success'
              );
              setRevokeRecord(null);
              setRefreshKey(k => k + 1);
            } else {
              showToast('Lỗi khi thu hồi kết quả', 'error');
            }
          } catch (err) {
            console.error(err);
            showToast('Lỗi khi thu hồi kết quả', 'error');
          }
        }}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default TutorGradingHistoryPage;
