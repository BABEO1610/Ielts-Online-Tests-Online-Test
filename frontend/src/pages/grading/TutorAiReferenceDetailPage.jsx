import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import AiFeedbackPanel from '../../components/grading/AiFeedbackPanel';
import {
  calculateOverallWritingBand,
  formatBand,
  getScoreBadge,
} from '../../components/grading/writingFeedback.helpers';
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

const badgeToneStyles = {
  good: { color: '#2f6b14', backgroundColor: '#e9f6df' },
  average: { color: '#935b00', backgroundColor: '#fff2dc' },
  weak: { color: '#b42318', backgroundColor: '#ffe8e6' },
  muted: { color: '#666', backgroundColor: '#f1f1f1' },
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

const TaskTabs = ({ tasks, activeTaskNumber, onChange }) => {
  if (tasks.length <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
      {tasks.map(task => (
        <button
          key={task.submissionId}
          type="button"
          onClick={() => onChange(task.taskNumber)}
          style={{
            border: activeTaskNumber === task.taskNumber ? '1px solid #111' : '1px solid #ddd',
            backgroundColor: activeTaskNumber === task.taskNumber ? '#111' : '#fff',
            color: activeTaskNumber === task.taskNumber ? '#fff' : '#111',
            borderRadius: '999px',
            padding: '9px 22px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'UberMoveText, system-ui, sans-serif',
          }}
        >
          Task {task.taskNumber}
        </button>
      ))}
    </div>
  );
};

const SubmissionPanel = ({ submission, task }) => (
  <section style={styles.panel}>
    <div style={styles.panelHeader}>Đề bài và bài làm</div>
    <div style={styles.panelBody}>
      <div style={styles.metaGrid}>
        <MetaItem label="Học sinh" value={submission.studentName} />
        <MetaItem label="Đề thi" value={submission.testTitle || 'IELTS Writing'} />
        <MetaItem label="Thời gian nộp" value={formatDate(submission.submittedAt)} />
        <MetaItem label="Task" value={`Task ${task.taskNumber || '—'}`} />
        <MetaItem label="Word count" value={`${task.wordCount || 0} từ`} />
      </div>

      <div style={styles.contentBox}>
        <h2 style={{ ...styles.value, fontSize: '16px', margin: '0 0 10px' }}>
          Đề bài
        </h2>
        <p style={styles.contentText}>{task.promptText || 'Không có đề bài.'}</p>
      </div>

      <div style={styles.contentBox}>
        <h2 style={{ ...styles.value, fontSize: '16px', margin: '0 0 10px' }}>
          Bài làm học sinh
        </h2>
        <p style={styles.contentText}>{task.responseText || 'Không có bài làm.'}</p>
      </div>
    </div>
  </section>
);

const getTaskBand = (task) => {
  const value = task?.aiReport?.band_score
    ?? task?.aiReport?.bandScore
    ?? task?.aiReport?.overallBand;
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const OverallAiBandCard = ({ tasks, overallAiBand }) => {
  const task1 = tasks.find(task => Number(task.taskNumber) === 1);
  const task2 = tasks.find(task => Number(task.taskNumber) === 2);
  const task1Band = getTaskBand(task1);
  const task2Band = getTaskBand(task2);
  const overall = overallAiBand ?? calculateOverallWritingBand(task1Band, task2Band);
  const badge = getScoreBadge(overall);

  return (
    <section style={{ ...styles.panel, marginTop: '22px' }}>
      <div style={styles.panelBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700 }}>
              Overall Writing Band
            </h2>
            <p style={{ margin: 0, color: '#777' }}>
              Task 1 × 33% + Task 2 × 67% — chuẩn IELTS Academic
            </p>
          </div>
          {overall !== null && overall !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '48px', fontWeight: 700, color: '#000' }}>
                {formatBand(overall)}
              </span>
              <span style={{
                ...badgeToneStyles[badge.tone],
                borderRadius: '999px',
                padding: '6px 14px',
                fontWeight: 700,
              }}>
                {badge.label}
              </span>
            </div>
          )}
        </div>

        {overall === null || overall === undefined ? (
          <div style={{ marginTop: '16px', padding: '14px', border: '1px solid #eee', borderRadius: '8px' }}>
            Chưa đủ dữ liệu để tính Overall Writing Band.
          </div>
        ) : (
          <div style={{ marginTop: '16px', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #eee' }}>
              <span>Task 1 <strong style={{ color: '#888' }}>(trọng số 33%)</strong></span>
              <strong>{formatBand(task1Band)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0' }}>
              <span>Task 2 <strong style={{ color: '#888' }}>(trọng số 67%)</strong></span>
              <strong>{formatBand(task2Band)}</strong>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const TutorAiReferenceDetailPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const isNarrow = useIsNarrow();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTaskNumber, setActiveTaskNumber] = useState(1);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await gradingService.getAiReferenceDetail(submissionId);
        if (response.success) {
          setDetail(response.data);
          const firstTask = response.data?.tasks?.[0];
          if (firstTask?.taskNumber) setActiveTaskNumber(firstTask.taskNumber);
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
  const tasks = detail.tasks?.length
    ? detail.tasks
    : [{
        submissionId: submission.id,
        taskNumber: submission.taskNumber,
        promptText: submission.promptText,
        responseText: submission.responseText,
        wordCount: submission.wordCount,
        aiReport: detail.aiReport,
      }];
  const activeTask = tasks.find(task => Number(task.taskNumber) === Number(activeTaskNumber)) || tasks[0] || {};

  return (
    <div style={styles.page}>
      <BackButton onClick={goBack} />
      <h1 style={styles.title}>
        AI tham khảo Writing — {submission.studentName || 'Học viên'}
      </h1>
      <div style={styles.disclaimer}>{DISCLAIMER}</div>
      <TaskTabs
        tasks={tasks}
        activeTaskNumber={activeTask.taskNumber}
        onChange={setActiveTaskNumber}
      />

      <div style={{
        ...styles.split,
        gridTemplateColumns: isNarrow ? '1fr' : styles.split.gridTemplateColumns,
      }}>
        <SubmissionPanel submission={submission} task={activeTask} />
        <aside>
          <AiFeedbackPanel
            report={activeTask.aiReport ? {
              ...activeTask.aiReport,
              taskNumber: activeTask.taskNumber,
            } : null}
          />
        </aside>
      </div>

      <OverallAiBandCard tasks={tasks} overallAiBand={detail.overallAiBand} />
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
  task: PropTypes.object.isRequired,
};

TaskTabs.propTypes = {
  tasks: PropTypes.array.isRequired,
  activeTaskNumber: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

OverallAiBandCard.propTypes = {
  tasks: PropTypes.array.isRequired,
  overallAiBand: PropTypes.number,
};

export default TutorAiReferenceDetailPage;
