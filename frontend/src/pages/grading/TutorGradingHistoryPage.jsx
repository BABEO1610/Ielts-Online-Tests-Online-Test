import React, { useState, useMemo, useEffect } from 'react';
import FilterDropdown from '../../components/common/FilterDropdown';
import GradingHistoryTable from '../../components/grading/GradingHistoryTable';
import GradingDetailModal from '../../components/grading/GradingDetailModal';
import GradingRevokeModal from '../../components/grading/GradingRevokeModal';
import { MOCK_HISTORY } from '../../services/gradingHistory.service';
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

// Tất cả band IELTS hợp lệ: 1.0 → 9.0, bước 0.5 (17 giá trị)
const BAND_RANGES = [
  { label: 'Tất cả band', test: () => true },
  ...Array.from({ length: 17 }, (_, i) => {
    const score = parseFloat((1 + i * 0.5).toFixed(1));
    const display = score.toFixed(1);
    return {
      label: `Band ${display}`,
      test: (b) => parseFloat(b.toFixed(1)) === score,
    };
  }),
];

const TIME_RANGES   = ['Tất cả thời gian', 'Tháng này', '7 ngày qua', '30 ngày qua'];
const SKILL_FILTERS = ['Tất cả', 'Writing', 'Speaking'];
const PAGE_SIZE     = 5;
const NOW           = new Date('2026-06-10T23:59:59');

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

// ─── Mock data từ service ──────────────────────────────────────────────────────
// Khi backend sẵn sàng, thay bằng useEffect + getGradingHistory()

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
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        style={{ padding: '8px 18px', borderRadius: '999px', border: '1px solid #ddd', backgroundColor: page === totalPages ? '#f5f5f5' : '#fff', color: page === totalPages ? '#bbb' : '#000', fontSize: '14px', cursor: page === totalPages ? 'default' : 'pointer', fontFamily: 'UberMoveText, system-ui, sans-serif', fontWeight: 500 }}>
        Tiếp →
      </button>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TutorGradingHistoryPage = () => {
  const [search, setSearch]           = useState('');
  const [timeFilter, setTimeFilter]   = useState(TIME_RANGES[0]);
  const [skillFilter, setSkillFilter] = useState(SKILL_FILTERS[0]);
  const [bandFilter, setBandFilter]   = useState(BAND_RANGES[0]);
  const [page, setPage]               = useState(1);
  const [sortKey, setSortKey]         = useState('rawDate');
  const [sortDir, setSortDir]         = useState('desc');
  const [detailRecord, setDetailRecord] = useState(null);
  const [revokeRecord, setRevokeRecord] = useState(null);
  const [loading, setLoading]           = useState(true);
  const { toasts, showToast, dismissToast } = useToast();

  // Simulate initial data fetch (replace với useEffect + getGradingHistory() khi có API)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const resetPage = (fn) => (...args) => { fn(...args); setPage(1); };

  // Toggle sort — cùng key thì đổi chiều, khác key thì reset về desc
  const handleSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  // Filter + sort
  const filtered = useMemo(() => {
    const result = MOCK_HISTORY.filter((r) => {
      const q = search.toLowerCase();
      if (q && !r.studentName.toLowerCase().includes(q) && !r.testName.toLowerCase().includes(q)) return false;
      if (timeFilter === 'Tháng này' && (r.rawDate.getMonth() !== NOW.getMonth() || r.rawDate.getFullYear() !== NOW.getFullYear())) return false;
      if (timeFilter === '7 ngày qua'  && (NOW - r.rawDate) / 86400000 > 7)  return false;
      if (timeFilter === '30 ngày qua' && (NOW - r.rawDate) / 86400000 > 30) return false;
      if (skillFilter === 'Writing'  && r.skill !== 'writing')  return false;
      if (skillFilter === 'Speaking' && r.skill !== 'speaking') return false;
      if (!bandFilter.test(r.band)) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [search, timeFilter, skillFilter, bandFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalGraded = MOCK_HISTORY.length;
  const avgBand     = (MOCK_HISTORY.reduce((s, r) => s + r.band, 0) / MOCK_HISTORY.length).toFixed(1);
  const disputed    = MOCK_HISTORY.filter((r) => r.status === 'disputed').length;

  // Export toàn bộ danh sách đang filter (không giới hạn trang)
  const handleExportCsv = () => {
    const rows = filtered.map((r) => ({
      ...r,
      status:      STATUS_MAP[r.status]?.label ?? r.status,
      skill:       SKILL_MAP[r.skill]?.label   ?? r.skill,
      feedbackStr: r.feedbackTypes?.join('; ')  ?? '',
    }));
    exportToCsv(`lich-su-cham-bai-${Date.now()}.csv`, CSV_COLUMNS, rows);
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
          <span>⬇</span> Xuất CSV ({filtered.length})
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Tổng bài đã chấm (Tháng)" value={totalGraded} />
        <StatCard label="Điểm Band trung bình (Tháng)" value={`Band ${avgBand}`} dark />
        <StatCard label="Khiếu nại đang xử lý" value={disputed} sub="bài cần xem xét" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#aaa', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text" placeholder="Tìm học sinh, bài thi..."
            value={search} onChange={(e) => resetPage(setSearch)(e.target.value)}
            style={{ width: '100%', padding: '9px 14px 9px 38px', borderRadius: '999px', border: '1px solid #ddd', fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
          />
        </div>
        <FilterDropdown label="⏱ Thời gian"  options={TIME_RANGES}   value={timeFilter}  onChange={resetPage(setTimeFilter)} />
        <FilterDropdown label="📚 Kỹ năng"   options={SKILL_FILTERS} value={skillFilter} onChange={resetPage(setSkillFilter)} />
        <FilterDropdown label="🎯 Band điểm" options={BAND_RANGES}   value={bandFilter}  onChange={resetPage(setBandFilter)} />
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#888' }}>{filtered.length} kết quả</span>
      </div>

      {/* Table */}
      <GradingHistoryTable
        rows={paginated}
        statusMap={STATUS_MAP}
        skillMap={SKILL_MAP}
        onView={setDetailRecord}
        onRevoke={setRevokeRecord}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        loading={loading}
      />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} total={filtered.length} onPageChange={setPage} />

      {/* Modals */}
      <GradingDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} statusMap={STATUS_MAP} skillMap={SKILL_MAP} />
      <GradingRevokeModal
        record={revokeRecord}
        onClose={() => setRevokeRecord(null)}
        onConfirm={(_id) => {
          // TODO: gọi API PATCH /api/v1/grading/history/:id/revoke khi backend sẵn sàng
          showToast(
            `Đã thu hồi kết quả của ${revokeRecord?.studentName ?? 'học sinh'}.`,
            'success'
          );
          setRevokeRecord(null);
        }}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default TutorGradingHistoryPage;
