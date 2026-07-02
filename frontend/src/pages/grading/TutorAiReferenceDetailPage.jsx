import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import AiFeedbackPanel from '../../components/grading/AiFeedbackPanel';
import gradingService from '../../services/grading.service';

const DISCLAIMER = 'AI Estimated Feedback — chỉ mang tính tham khảo';

const useIsNarrow = (breakpoint = 920) => {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isNarrow;
};

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

const styles = {
  page: {
    padding: '32px 40px 64px',
    fontFamily: 'UberMoveText, system-ui, sans-serif',
    maxWidth: '1440px',
  },
  back: {
    border: 'none',
    backgroundColor: '#efefef',
    color: '#000',
    borderRadius: '999px',
    padding: '9px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'UberMoveText, system-ui, sans-serif',
  },
  title: {
    margin: '18px 0 8px',
    fontSize: '34px',
    fontWeight: 700,
    fontFamily: 'UberMove, system-ui, sans-serif',
    color: '#000',
  },
  disclaimer: {
    display: 'inline-block',
    margin: '12px 0 24px',
    padding: '10px 14px',
    borderRadius: '999px',
    backgroundColor: '#111',
    color: '#fff',
    fontWeight: 700,
    fontSize: '13px',
  },
  split: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 55fr) minmax(360px, 45fr)',
    gap: '20px',
    alignItems: 'start',
  },
  panel: {
    border: '1px solid #e8e8e8',
    borderRadius: '12px',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '16px 18px',
    borderBottom: '1px solid #eeeeee',
    backgroundColor: '#fafafa',
    fontWeight: 700,
    color: '#000',
  },
  panelBody: { padding: '20px' },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '18px',
  },
  metaItem: {
    backgroundColor: '#f7f7f7',
    borderRadius: '8px',
    padding: '12px',
  },
  label: { fontSize: '12px', color: '#777', marginBottom: '4px' },
  value: { fontSize: '14px', color: '#000', fontWeight: 700 },
  contentBox: {
    borderTop: '1px solid #eeeeee',
    paddingTop: '18px',
    marginTop: '18px',
  },
  contentText: {
    margin: 0,
    color: '#333',
    fontSize: '15px',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
};

const MetaItem = ({ label, value }) => (
  <div style={styles.metaItem}>
    <div style={styles.label}>{label}</div>
    <div style={styles.value}>{value || '—'}</div>
  </div>
);

const BackButton = ({ onClick }) => (
  <button style={styles.back} onClick={onClick}>
    ← Quay lại
  </button>
);

const LoadingState = ({ onBack }) => (
  <div style={styles.page}>
    <BackButton onClick={onBack} />
    <div style={{ marginTop: '32px', color: '#666' }}>Đang tải dữ liệu...</div>
  </div>
);

const ErrorState = ({ message, onBack }) => (
  <div style={styles.page}>
    <BackButton onClick={onBack} />
    <div style={{
      marginTop: '24px',
      padding: '16px',
      backgroundColor: '#ffebee',
      color: '#c62828',
      borderRadius: '8px',
      fontWeight: 600,
    }}>
      {message || 'Không tìm thấy AI reference.'}
    </div>
  </div>
);

const SubmissionPanel = ({ submission }) => (
  <section style={styles.panel}>
    <div style={styles.panelHeader}>Đề bài và bài làm</div>
    <div style={styles.panelBody}>
      <div style={styles.metaGrid}>
        <MetaItem label="Học sinh" value={submission.studentName} />
        <MetaItem label="Đề thi" value={submission.testTitle || 'IELTS Writing'} />
        <MetaItem label="Thời gian nộp" value={formatDate(submission.submittedAt)} />
        <MetaItem label="Word count" value={`${submission.wordCount || 0} từ`} />
      </div>

      <div style={styles.contentBox}>
        <h2 style={{ ...styles.value, fontSize: '16px', margin: '0 0 10px' }}>
          Đề bài
        </h2>
        <p style={styles.contentText}>{submission.promptText || 'Không có đề bài.'}</p>
      </div>

      <div style={styles.contentBox}>
        <h2 style={{ ...styles.value, fontSize: '16px', margin: '0 0 10px' }}>
          Bài làm học sinh
        </h2>
        <p style={styles.contentText}>{submission.responseText || 'Không có bài làm.'}</p>
      </div>
    </div>
  </section>
);

const TutorAiReferenceDetailPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const isNarrow = useIsNarrow();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await gradingService.getAiReferenceDetail(submissionId);
        if (response.success) {
          setDetail(response.data);
        } else {
          setError(response.error?.message || 'Không thể tải AI reference.');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Lỗi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [submissionId]);

  const goBack = () => navigate('/grading/tutor/ai-reference');
  if (loading) return <LoadingState onBack={goBack} />;
  if (error || !detail) return <ErrorState message={error} onBack={goBack} />;

  const submission = detail.submission || {};

  return (
    <div style={styles.page}>
      <BackButton onClick={goBack} />
      <h1 style={styles.title}>
        Writing Task {submission.taskNumber || '—'} — {submission.studentName || 'Học viên'}
      </h1>
      <div style={styles.disclaimer}>{DISCLAIMER}</div>

      <div style={{
        ...styles.split,
        gridTemplateColumns: isNarrow ? '1fr' : styles.split.gridTemplateColumns,
      }}>
        <SubmissionPanel submission={submission} />
        <aside>
          <AiFeedbackPanel report={detail.aiReport} />
        </aside>
      </div>
    </div>
  );
};

MetaItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

BackButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

LoadingState.propTypes = {
  onBack: PropTypes.func.isRequired,
};

ErrorState.propTypes = {
  message: PropTypes.string,
  onBack: PropTypes.func.isRequired,
};

SubmissionPanel.propTypes = {
  submission: PropTypes.object.isRequired,
};

export default TutorAiReferenceDetailPage;
