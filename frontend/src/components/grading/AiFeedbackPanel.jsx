import PropTypes from 'prop-types';

const DISCLAIMER = 'AI Estimated Feedback — chỉ mang tính tham khảo';

const parseMaybeJson = (value) => {
  if (!value || typeof value !== 'string') return value || null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const formatBand = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isNaN(number) ? '—' : number.toFixed(1);
};

const listFrom = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [String(value)];
};

const getCriteria = (report) => {
  const criteria = parseMaybeJson(report?.criteria_json || report?.criteriaJson) || {};
  return [
    {
      label: 'Task Achievement / Response',
      band: criteria.taskAchievementOrResponse?.band
        ?? report?.task_achievement_score
        ?? report?.taskAchievementScore,
      feedback: criteria.taskAchievementOrResponse?.feedback,
    },
    {
      label: 'Coherence & Cohesion',
      band: criteria.coherenceCohesion?.band
        ?? report?.coherence_score
        ?? report?.coherenceScore,
      feedback: criteria.coherenceCohesion?.feedback,
    },
    {
      label: 'Lexical Resource',
      band: criteria.lexicalResource?.band
        ?? report?.lexical_score
        ?? report?.lexicalScore,
      feedback: criteria.lexicalResource?.feedback,
    },
    {
      label: 'Grammar Range & Accuracy',
      band: criteria.grammarRangeAccuracy?.band
        ?? report?.grammar_score
        ?? report?.grammarScore,
      feedback: criteria.grammarRangeAccuracy?.feedback,
    },
  ];
};

const getFeedback = (report) =>
  parseMaybeJson(report?.feedback_json || report?.feedbackJson) || {};

const normalizeReport = (report) => {
  const feedback = getFeedback(report);
  return {
    status: report?.status || report?.reportStatus,
    errorMessage: report?.error_message || report?.errorMessage,
    overallBand: report?.band_score ?? report?.bandScore ?? report?.aiBand,
    computedBand: report?.computed_band ?? report?.computedBand,
    criteria: getCriteria(report),
    summary: feedback.summary || report?.suggestions || '',
    strengths: listFrom(feedback.strengths),
    weaknesses: listFrom(feedback.weaknesses),
    majorErrors: listFrom(feedback.majorErrors || report?.error_highlights),
    improvedVersion: report?.improved_version
      || report?.improvedVersion
      || feedback.improvedVersion
      || '',
    nextStudyAdvice: feedback.nextStudyAdvice || '',
    wordCountFeedback: feedback.wordCountFeedback || '',
    bandWarning: report?.band_validation_warning || report?.bandValidationWarning,
  };
};

const styles = {
  panel: {
    border: '1px solid #e8e8e8',
    borderRadius: '12px',
    backgroundColor: '#fff',
    overflow: 'hidden',
    fontFamily: 'UberMoveText, system-ui, sans-serif',
  },
  disclaimer: {
    padding: '12px 16px',
    backgroundColor: '#111',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
  },
  body: { padding: '20px' },
  bandBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    borderBottom: '1px solid #eeeeee',
    paddingBottom: '18px',
    marginBottom: '18px',
  },
  band: {
    fontFamily: 'UberMove, system-ui, sans-serif',
    fontSize: '56px',
    fontWeight: 700,
    lineHeight: 1,
    color: '#000',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '10px',
    marginBottom: '18px',
  },
  criterion: {
    border: '1px solid #eeeeee',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#fafafa',
  },
  section: {
    borderTop: '1px solid #eeeeee',
    paddingTop: '16px',
    marginTop: '16px',
  },
  title: {
    margin: '0 0 10px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#000',
  },
  text: {
    margin: 0,
    color: '#333',
    fontSize: '14px',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fff5f5',
    color: '#b42318',
    borderBottom: '1px solid #ffd6d6',
    fontWeight: 600,
  },
};

const Section = ({ title, children }) => {
  if (!children) return null;
  return (
    <section style={styles.section}>
      <h3 style={styles.title}>{title}</h3>
      {children}
    </section>
  );
};

const ListSection = ({ title, items }) => {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul style={{ margin: 0, paddingLeft: '18px', color: '#333', lineHeight: 1.7 }}>
        {items.map((item, index) => (
          <li key={`${title}-${index}`} style={{ marginBottom: '6px' }}>
            {typeof item === 'string'
              ? item
              : `${item.original || item.text || ''}${item.issue ? ` — ${item.issue}` : ''}${item.suggestion ? ` → ${item.suggestion}` : ''}`}
          </li>
        ))}
      </ul>
    </Section>
  );
};

const EmptyPanel = ({ showDisclaimer }) => (
  <div style={styles.panel}>
    {showDisclaimer && <div style={styles.disclaimer}>{DISCLAIMER}</div>}
    <div style={styles.body}>
      <p style={styles.text}>Chưa có AI feedback cho bài này.</p>
    </div>
  </div>
);

const BandSummary = ({ data }) => (
  <div style={styles.bandBox}>
    <div>
      <div style={{ fontSize: '13px', color: '#666', fontWeight: 700 }}>
        Overall band
      </div>
      <div style={styles.band}>{formatBand(data.overallBand)}</div>
    </div>
    {data.computedBand !== null && data.computedBand !== undefined && (
      <div style={{ textAlign: 'right', color: '#666', fontSize: '13px' }}>
        Computed band
        <div style={{ color: '#000', fontWeight: 700, fontSize: '20px' }}>
          {formatBand(data.computedBand)}
        </div>
      </div>
    )}
  </div>
);

const CriteriaGrid = ({ criteria }) => (
  <div style={styles.grid}>
    {criteria.map((criterion) => (
      <div key={criterion.label} style={styles.criterion}>
        <div style={{ color: '#666', fontSize: '12px', minHeight: '32px' }}>
          {criterion.label}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#000' }}>
          {formatBand(criterion.band)}
        </div>
        {criterion.feedback && (
          <p style={{ ...styles.text, fontSize: '13px', marginTop: '8px' }}>
            {criterion.feedback}
          </p>
        )}
      </div>
    ))}
  </div>
);

const FeedbackSections = ({ data }) => (
  <>
    {data.wordCountFeedback && (
      <Section title="Word count warning">
        <p style={styles.text}>{data.wordCountFeedback}</p>
      </Section>
    )}
    {data.summary && (
      <Section title="Summary">
        <p style={styles.text}>{data.summary}</p>
      </Section>
    )}
    <ListSection title="Strengths" items={data.strengths} />
    <ListSection title="Weaknesses" items={data.weaknesses} />
    <ListSection title="Major errors" items={data.majorErrors} />
    {data.improvedVersion && (
      <Section title="Improved version">
        <p style={styles.text}>{data.improvedVersion}</p>
      </Section>
    )}
    {data.nextStudyAdvice && (
      <Section title="Next study advice">
        <p style={styles.text}>{data.nextStudyAdvice}</p>
      </Section>
    )}
    {data.bandWarning && (
      <Section title="Band validation note">
        <p style={styles.text}>{data.bandWarning}</p>
      </Section>
    )}
  </>
);

const AiFeedbackPanel = ({ report, showDisclaimer = true }) => {
  if (!report) return <EmptyPanel showDisclaimer={showDisclaimer} />;
  const data = normalizeReport(report);
  const isFailed = data.status === 'failed' || data.errorMessage;
  return (
    <div style={styles.panel}>
      {showDisclaimer && <div style={styles.disclaimer}>{DISCLAIMER}</div>}
      {isFailed && (
        <div style={styles.error}>
          {data.errorMessage || 'AI grading thất bại. Bài vẫn giữ trạng thái chờ xử lý.'}
        </div>
      )}
      <div style={styles.body}>
        <BandSummary data={data} />
        <CriteriaGrid criteria={data.criteria} />
        <FeedbackSections data={data} />
      </div>
    </div>
  );
};

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};

ListSection.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array,
};

EmptyPanel.propTypes = {
  showDisclaimer: PropTypes.bool,
};

BandSummary.propTypes = {
  data: PropTypes.object.isRequired,
};

CriteriaGrid.propTypes = {
  criteria: PropTypes.array.isRequired,
};

FeedbackSections.propTypes = {
  data: PropTypes.object.isRequired,
};

AiFeedbackPanel.propTypes = {
  report: PropTypes.object,
  showDisclaimer: PropTypes.bool,
};

export default AiFeedbackPanel;
