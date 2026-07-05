import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import gradingService from '../../services/grading.service';

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value)).replace(',', '');
};

const formatBand = (value) => {
  if (value === null || value === undefined) return '—';
  const number = Number(value);
  return Number.isNaN(number) ? '—' : number.toFixed(1);
};

const getStatusConfig = (status, errorMessage) => {
  if (status === 'failed' || errorMessage) {
    return { label: 'AI lỗi', bg: '#fff5f5', color: '#b42318' };
  }
  if (status === 'completed') {
    return { label: 'Đã chấm AI', bg: '#e8f5e9', color: '#1b5e20' };
  }
  return { label: status || 'Đang xử lý', bg: '#efefef', color: '#555' };
};

const styles = {
  page: {
    padding: '36px 48px 64px',
    fontFamily: 'UberMoveText, system-ui, sans-serif',
    maxWidth: '1280px',
  },
  title: {
    fontFamily: 'UberMove, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: '36px',
    color: '#000',
    margin: '0 0 8px',
  },
  subtitle: { margin: 0, color: '#666', fontSize: '14px' },
  disclaimer: {
    margin: '24px 0',
    padding: '13px 16px',
    borderRadius: '10px',
    backgroundColor: '#111',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  search: {
    width: '320px',
    maxWidth: '100%',
    padding: '11px 16px',
    borderRadius: '999px',
    border: '1px solid #ddd',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'UberMoveText, system-ui, sans-serif',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e8e8e8',
    overflowX: 'auto',
  },
  th: {
    padding: '14px 20px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#000',
    whiteSpace: 'nowrap',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #e8e8e8',
  },
  td: {
    padding: '16px 20px',
    fontSize: '14px',
    color: '#333',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
};

const StateRow = ({ children }) => (
  <tr>
    <td colSpan={7} style={{ ...styles.td, textAlign: 'center', padding: '48px' }}>
      {children}
    </td>
  </tr>
);

const AiReferenceRow = ({ item, onView }) => {
  const status = getStatusConfig(item.reportStatus, item.errorMessage);
  return (
    <tr>
      <td style={styles.td}>{formatDate(item.submittedAt)}</td>
      <td style={styles.td}>
        <div style={{ fontWeight: 700, color: '#000' }}>
          {item.studentName || 'Học viên ẩn danh'}
        </div>
      </td>
      <td style={styles.td}>{item.testTitle || 'IELTS Writing'}</td>
      <td style={styles.td}>
        {item.taskLabel || (item.taskNumber ? `Task ${item.taskNumber}` : '—')}
      </td>
      <td style={{ ...styles.td, fontWeight: 700, color: '#000' }}>
        {formatBand(item.aiBand)}
      </td>
      <td style={styles.td}>
        <span style={{
          display: 'inline-block',
          padding: '5px 10px',
          borderRadius: '999px',
          backgroundColor: status.bg,
          color: status.color,
          fontWeight: 700,
          fontSize: '12px',
          whiteSpace: 'nowrap',
        }}>
          {status.label}
        </span>
      </td>
      <td style={{ ...styles.td, borderBottom: '1px solid #f0f0f0' }}>
        <button
          onClick={() => onView(item.submissionId)}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'UberMoveText, system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          Xem
        </button>
      </td>
    </tr>
  );
};

const AiReferenceTable = ({ items, loading, onView }) => {
  if (loading) return <StateRow>Đang tải dữ liệu...</StateRow>;
  if (items.length === 0) {
    return <StateRow>Chưa có bài AI nào để tham khảo</StateRow>;
  }
  return items.map((item) => (
    <AiReferenceRow key={item.submissionId} item={item} onView={onView} />
  ));
};

StateRow.propTypes = {
  children: PropTypes.node,
};

AiReferenceRow.propTypes = {
  item: PropTypes.object.isRequired,
  onView: PropTypes.func.isRequired,
};

AiReferenceTable.propTypes = {
  items: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onView: PropTypes.func.isRequired,
};

const TutorAiReferencePage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await gradingService.getAiReferenceList({
          search: search.trim() || undefined,
        });
        if (response.success) {
          setItems(response.data || []);
        } else {
          setError(response.error?.message || 'Không thể tải danh sách AI.');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const totalCompleted = useMemo(
    () => items.filter(item => item.reportStatus === 'completed').length,
    [items]
  );

  return (
    <div style={styles.page}>
      <div>
        <h1 style={styles.title}>AI tham khảo</h1>
        <p style={styles.subtitle}>
          {items.length} bài AI đã ghi nhận, {totalCompleted} bài chấm thành công.
        </p>
      </div>

      <div style={styles.disclaimer}>
        AI Estimated Feedback — chỉ mang tính tham khảo
      </div>

      <div style={styles.toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm kiếm theo tên học sinh..."
          style={styles.search}
        />
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              {['Thời gian nộp', 'Học sinh', 'Đề thi', 'Tasks', 'AI Band', 'Trạng thái AI', 'Thao tác'].map((column) => (
                <th key={column} style={styles.th}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AiReferenceTable
              items={items}
              loading={loading}
              onView={(id) => navigate(`/grading/tutor/ai-reference/${id}`)}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TutorAiReferencePage;
