import PropTypes from 'prop-types';
import {
  formatBand,
  getScoreBadge,
  getWritingCriterionLabel,
} from './writingFeedback.helpers';

const DISCLAIMER = 'AI Estimated Feedback — chỉ mang tính tham khảo';

const parseMaybeJson = (value) => {
  if (!value || typeof value !== 'string') return value || null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const listFrom = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [String(value)];
};

const getCriteria = (report) => {
  const raw = parseMaybeJson(report?.raw_ai_response || report?.rawAiResponse) || {};
  const criteria = parseMaybeJson(report?.criteria_json || report?.criteriaJson)
    || report?.criterionScores
    || raw.criteria
    || {};
  const taskNumber = Number(report?.task_number || report?.taskNumber);
  return [
    {
      key: 'taskAchievementOrResponse',
      label: getWritingCriterionLabel(taskNumber, 'taskAchievementOrResponse'),
      band: criteria.taskAchievementOrResponse?.band
        ?? criteria.taskAchievementOrResponse
        ?? report?.task_achievement_score
        ?? report?.taskAchievementScore,
      feedback: criteria.taskAchievementOrResponse?.feedback,
    },
    {
      key: 'coherenceCohesion',
      label: getWritingCriterionLabel(taskNumber, 'coherenceCohesion'),
      band: criteria.coherenceCohesion?.band
        ?? criteria.coherenceCohesion
        ?? report?.coherence_score
        ?? report?.coherenceScore,
      feedback: criteria.coherenceCohesion?.feedback,
    },
    {
      key: 'lexicalResource',
      label: getWritingCriterionLabel(taskNumber, 'lexicalResource'),
      band: criteria.lexicalResource?.band
        ?? criteria.lexicalResource
        ?? report?.lexical_score
        ?? report?.lexicalScore,
      feedback: criteria.lexicalResource?.feedback,
    },
    {
      key: 'grammarRangeAccuracy',
      label: getWritingCriterionLabel(taskNumber, 'grammarRangeAccuracy'),
      band: criteria.grammarRangeAccuracy?.band
        ?? criteria.grammarRangeAccuracy
        ?? criteria.grammaticalRangeAccuracy?.band
        ?? criteria.grammaticalRangeAccuracy
        ?? report?.grammar_score
        ?? report?.grammarScore,
      feedback: criteria.grammarRangeAccuracy?.feedback
        ?? criteria.grammaticalRangeAccuracy?.feedback,
    },
  ];
};

const getFeedback = (report) => {
  const parsed = parseMaybeJson(report?.feedback_json || report?.feedbackJson) || {};
  const raw = parseMaybeJson(report?.raw_ai_response || report?.rawAiResponse) || {};
  return {
    ...raw,
    ...parsed,
    summary: report?.summary,
    strengths: report?.strengths,
    weaknesses: report?.weaknesses,
    majorErrors: report?.majorErrors,
    detailedFeedback: report?.detailedFeedback,
    vocabularySuggestions: report?.vocabularySuggestions,
    grammarCorrections: report?.grammarCorrections,
    actionPlan: report?.actionPlan,
    ...Object.fromEntries(
      Object.entries({
        summary: parsed.summary ?? raw.summary ?? report?.summary,
        strengths: parsed.strengths ?? raw.strengths ?? report?.strengths,
        weaknesses: parsed.weaknesses ?? raw.weaknesses ?? report?.weaknesses,
        majorErrors: parsed.majorErrors ?? raw.majorErrors ?? report?.majorErrors,
        detailedFeedback: parsed.detailedFeedback ?? raw.detailedFeedback ?? report?.detailedFeedback,
        vocabularySuggestions: parsed.vocabularySuggestions ?? raw.vocabularySuggestions ?? report?.vocabularySuggestions,
        grammarCorrections: parsed.grammarCorrections ?? raw.grammarCorrections ?? report?.grammarCorrections,
        actionPlan: parsed.actionPlan ?? raw.actionPlan ?? report?.actionPlan,
        nextStudyAdvice: parsed.nextStudyAdvice ?? raw.nextStudyAdvice ?? report?.nextStudyAdvice,
        wordCountFeedback: parsed.wordCountFeedback ?? raw.wordCountFeedback ?? report?.wordCountFeedback,
      }).filter(([, value]) => value !== undefined)
    ),
  };
};

const normalizeReport = (report) => {
  const feedback = getFeedback(report);
  return {
    taskNumber: report?.task_number ?? report?.taskNumber ?? feedback.taskNumber,
    status: report?.status || report?.reportStatus,
    errorMessage: report?.error_message || report?.errorMessage,
    overallBand: report?.band_score ?? report?.bandScore ?? report?.aiBand ?? report?.overallBand,
    computedBand: report?.computed_band ?? report?.computedBand,
    criteria: getCriteria(report),
    summary: feedback.summary || report?.suggestions || '',
    strengths: listFrom(feedback.strengths),
    weaknesses: listFrom(feedback.weaknesses),
    majorErrors: listFrom(feedback.majorErrors || report?.error_highlights),
    detailedFeedback: feedback.detailedFeedback || {},
    improvedVersion: report?.improved_version
      || report?.improvedVersion
      || feedback.improvedVersion
      || '',
    vocabularySuggestions: listFrom(feedback.vocabularySuggestions),
    grammarCorrections: listFrom(feedback.grammarCorrections),
    actionPlan: listFrom(feedback.actionPlan),
    nextStudyAdvice: feedback.nextStudyAdvice || report?.nextStudyAdvice || '',
    wordCountFeedback: feedback.wordCountFeedback || report?.wordCountFeedback || '',
    bandWarning: report?.band_validation_warning || report?.bandValidationWarning || report?.bandWarning,
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
  criterionScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '8px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '26px',
    borderRadius: '999px',
    padding: '3px 12px',
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
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

const badgeToneStyles = {
  good: { color: '#2f6b14', backgroundColor: '#e9f6df' },
  average: { color: '#935b00', backgroundColor: '#fff2dc' },
  weak: { color: '#b42318', backgroundColor: '#ffe8e6' },
  muted: { color: '#666', backgroundColor: '#f1f1f1' },
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

const formatListItem = (item) => {
  if (typeof item === 'string') return item;
  const quote = item.quote || item.error || item.original || item.text || '';
  const problem = item.problem || item.explanation || item.issue || item.reason || '';
  const correction = item.correction || item.corrected || item.suggestion || item.better || '';
  return [
    quote ? `Trích: "${quote}"` : '',
    problem ? `Vấn đề: ${problem}` : '',
    correction ? `Gợi ý: ${correction}` : '',
  ].filter(Boolean).join(' — ');
};

const ListSection = ({ title, items }) => {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul style={{ margin: 0, paddingLeft: '18px', color: '#333', lineHeight: 1.7 }}>
        {items.map((item, index) => (
          <li key={`${title}-${index}`} style={{ marginBottom: '6px' }}>
            {formatListItem(item)}
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
        Overall band{data.taskNumber ? ` — Task ${data.taskNumber}` : ''}
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
    {criteria.map((criterion) => {
      const badge = getScoreBadge(criterion.band);
      return (
        <div key={criterion.label} style={styles.criterion}>
          <div style={{ color: '#666', fontSize: '12px', minHeight: '32px' }}>
            {criterion.label}
          </div>
          <div style={styles.criterionScore}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#000' }}>
              {formatBand(criterion.band)}
            </span>
            <span style={{ ...styles.badge, ...badgeToneStyles[badge.tone] }}>
              {badge.label}
            </span>
          </div>
          {criterion.feedback && (
            <p style={{ ...styles.text, fontSize: '13px', marginTop: '8px' }}>
              {criterion.feedback}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

const CriterionFeedbackSection = ({ criteria, detailedFeedback }) => {
  const feedbackRows = criteria
    .map((criterion) => ({
      label: criterion.label,
      feedback: criterion.feedback || detailedFeedback?.[criterion.key],
    }))
    .filter(row => row.feedback);

  if (!feedbackRows.length) return null;

  return (
    <Section title="Criterion feedback">
      <div style={{ display: 'grid', gap: '10px' }}>
        {feedbackRows.map(row => (
          <p key={row.label} style={styles.text}>
            <strong>{row.label}:</strong> {row.feedback}
          </p>
        ))}
      </div>
    </Section>
  );
};

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
    <CriterionFeedbackSection
      criteria={data.criteria}
      detailedFeedback={data.detailedFeedback}
    />
    <ListSection title="Strengths" items={data.strengths} />
    <ListSection title="Weaknesses" items={data.weaknesses} />
    <ListSection title="Major errors" items={data.majorErrors} />
    {data.improvedVersion && (
      <Section title="Improved version">
        <p style={styles.text}>{data.improvedVersion}</p>
      </Section>
    )}
    <ListSection title="Vocabulary suggestions" items={data.vocabularySuggestions} />
    <ListSection title="Grammar corrections" items={data.grammarCorrections} />
    <ListSection title="Action plan" items={data.actionPlan} />
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

CriterionFeedbackSection.propTypes = {
  criteria: PropTypes.array.isRequired,
  detailedFeedback: PropTypes.object,
};

AiFeedbackPanel.propTypes = {
  report: PropTypes.object,
  showDisclaimer: PropTypes.bool,
};

export default AiFeedbackPanel;
