import { useState, useEffect, useCallback } from 'react';
import gradingService from '../../services/grading.service';
import useGradingSocket from '../../hooks/useGradingSocket';
import AiFeedbackPanel from './AiFeedbackPanel';
import {
  calculateOverallWritingBand,
  formatBand,
  getScoreBadge,
  getWritingCriterionLabel,
} from './writingFeedback.helpers';

const STATUS_LABELS = {
  completed: 'AI đã hoàn thành',
  pending: 'AI đang chấm',
  failed: 'AI chấm lỗi',
  queued: 'Đã xếp hàng',
  running: 'AI đang phân tích audio',
  retry_wait: 'Đang chờ thử lại',
  needs_review: 'Đã chuyển tutor xác nhận',
  graded: 'Đã chấm',
  tutor_graded: 'Đã chấm',
};

const getAiStatusText = (task, submission) => {
  if (task?.aiFeedback?.status === 'completed') return STATUS_LABELS.completed;
  if (task?.aiFeedback?.status === 'failed') return STATUS_LABELS.failed;
  if (task?.aiFeedback?.status === 'pending') return STATUS_LABELS.pending;
  if (submission?.aiStatus === 'completed') return STATUS_LABELS.completed;
  if (submission?.aiStatus === 'failed') return STATUS_LABELS.failed;
  return task?.aiFeedback ? STATUS_LABELS.pending : 'Chưa có AI feedback';
};

const badgeToneClasses = {
  good: 'text-success',
  average: 'text-warning-emphasis',
  weak: 'text-danger',
  muted: 'text-secondary',
};

const badgeToneStyles = {
  good: { backgroundColor: '#e9f6df', color: '#2f6b14' },
  average: { backgroundColor: '#fff2dc', color: '#935b00' },
  weak: { backgroundColor: '#ffe8e6', color: '#b42318' },
  muted: { backgroundColor: '#f1f1f1', color: '#666' },
};

const normalizeCriterionValue = (value) => {
  if (value && typeof value === 'object') {
    return value.band ?? value.score ?? value.value ?? null;
  }
  return value ?? null;
};

const getCriterionValue = (scores, key) => {
  if (!scores) return null;
  if (key === 'grammarRangeAccuracy') {
    return normalizeCriterionValue(scores.grammarRangeAccuracy ?? scores.grammaticalRangeAccuracy);
  }
  return normalizeCriterionValue(scores[key]);
};

const getTutorCriterionRows = (tutorGrade, taskNumber) => {
  const scores = tutorGrade?.criterionScores || {};
  return [
    {
      key: 'taskAchievementOrResponse',
      label: getWritingCriterionLabel(taskNumber, 'taskAchievementOrResponse'),
      score: getCriterionValue(scores, 'taskAchievementOrResponse'),
    },
    {
      key: 'coherenceCohesion',
      label: getWritingCriterionLabel(taskNumber, 'coherenceCohesion'),
      score: getCriterionValue(scores, 'coherenceCohesion'),
    },
    {
      key: 'lexicalResource',
      label: getWritingCriterionLabel(taskNumber, 'lexicalResource'),
      score: getCriterionValue(scores, 'lexicalResource'),
    },
    {
      key: 'grammarRangeAccuracy',
      label: getWritingCriterionLabel(taskNumber, 'grammarRangeAccuracy'),
      score: getCriterionValue(scores, 'grammarRangeAccuracy'),
    },
  ];
};

const CriterionScoreCards = ({ rows }) => (
  <div className="row g-3 mb-3">
    {rows.map(row => {
      const badge = getScoreBadge(row.score);
      return (
        <div className="col-sm-6" key={row.key}>
          <div className="border rounded-3 p-3 h-100 bg-white">
            <div className="text-muted fw-medium mb-2">{row.label}</div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="fs-2 fw-bold text-dark">{formatBand(row.score)}</span>
              <span
                className={`badge rounded-pill ${badgeToneClasses[badge.tone] || ''}`}
                style={badgeToneStyles[badge.tone]}
              >
                {badge.label}
              </span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const TutorFeedbackBox = ({ tutorGrade, taskNumber }) => {
  if (!tutorGrade) {
    return (
      <div className="alert alert-light border mb-0">
        Chưa có tutor feedback cho task này.
      </div>
    );
  }

  return (
    <div className="card border shadow-none">
      <div className="card-body">
        <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
          <h5 className="fw-bold mb-0">Tutor feedback</h5>
          <span className="badge bg-dark rounded-pill">Band {formatBand(tutorGrade.overallBand)}</span>
        </div>
        <CriterionScoreCards rows={getTutorCriterionRows(tutorGrade, taskNumber)} />
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {tutorGrade.writtenFeedback || 'Không có nhận xét.'}
        </p>
      </div>
    </div>
  );
};

const getPrimaryGradingSource = (data) => {
  if (data?.grader === 'tutor') return 'tutor';
  if (data?.grader === 'ai') return 'ai';
  if (data?.tutorStatus === 'graded') return 'tutor';
  return 'ai';
};

const getTaskBandForSource = (task, source) => {
  if (source === 'tutor') {
    return task?.tutorGrade?.overallBand
      ?? task?.tutorGrade?.bandScore
      ?? task?.tutorGrade?.band_score
      ?? null;
  }
  return task?.aiFeedback?.overallBand
    ?? task?.aiFeedback?.bandScore
    ?? task?.aiFeedback?.band_score
    ?? null;
};

const OverallWritingBandCard = ({ tasks, source }) => {
  const task1 = tasks.find(task => Number(task.taskNumber) === 1);
  const task2 = tasks.find(task => Number(task.taskNumber) === 2);
  const task1Band = getTaskBandForSource(task1, source);
  const task2Band = getTaskBandForSource(task2, source);
  const overall = calculateOverallWritingBand(task1Band, task2Band);
  const badge = getScoreBadge(overall);

  return (
    <div className="card border shadow-none mt-4">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <h4 className="fw-bold mb-1">Overall Writing Band</h4>
            <p className="text-muted mb-0">
              Task 1 × 33% + Task 2 × 67% — chuẩn IELTS Academic
            </p>
          </div>
          {overall !== null && (
            <div className="d-flex align-items-center gap-3">
              <span className="display-5 fw-bold text-dark mb-0">{formatBand(overall)}</span>
              <span
                className={`badge rounded-pill px-3 py-2 ${badgeToneClasses[badge.tone] || ''}`}
                style={badgeToneStyles[badge.tone]}
              >
                {badge.label}
              </span>
            </div>
          )}
        </div>

        {overall === null ? (
          <div className="alert alert-light border mt-3 mb-0">
            Chưa đủ dữ liệu để tính Overall Writing Band.
          </div>
        ) : (
          <div className="mt-3 border-top">
            <div className="d-flex justify-content-between py-3 border-bottom">
              <span>Task 1 <span className="text-muted fw-semibold">(trọng số 33%)</span></span>
              <span className="fw-bold">{formatBand(task1Band)}</span>
            </div>
            <div className="d-flex justify-content-between pt-3">
              <span>Task 2 <span className="text-muted fw-semibold">(trọng số 67%)</span></span>
              <span className="fw-bold">{formatBand(task2Band)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getSpeakingCriterionRows = (aiFeedback) => {
  const scores = aiFeedback?.criterionScores || {};
  return [
    {
      key: 'fluencyCoherence',
      label: 'Fluency & Coherence',
      score: getCriterionValue(scores, 'fluencyCoherence'),
    },
    {
      key: 'lexicalResource',
      label: 'Lexical Resource',
      score: getCriterionValue(scores, 'lexicalResource'),
    },
    {
      key: 'pronunciation',
      label: 'Pronunciation',
      score: getCriterionValue(scores, 'pronunciation'),
    },
    {
      key: 'grammaticalRangeAccuracy',
      label: 'Grammatical Range & Accuracy',
      score: getCriterionValue(scores, 'grammaticalRangeAccuracy'),
    },
  ];
};

const SpeakingPartCard = ({ part }) => (
  <div className="card border shadow-none mb-3">
    <div className="card-header bg-white fw-bold">Part {part.partNumber}</div>
    <div className="card-body">
      <div className="mb-3">
        <div className="fw-semibold mb-2">Đề bài</div>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {part.prompt || 'Không có đề bài.'}
        </p>
      </div>
      {part.audioUrl && (
        <div className="mb-3">
          <div className="fw-semibold mb-2">Bản ghi âm</div>
          <audio controls src={part.audioUrl} className="w-100" />
        </div>
      )}
      <div className="mb-3">
        <div className="fw-semibold mb-2">Script / transcript</div>
        <p className="mb-0 bg-light rounded-3 p-3" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {part.transcript || 'Chưa có transcript.'}
        </p>
      </div>
      {part.aiPartFeedback && (
        <div>
          <div className="fw-semibold mb-2">Nhận xét AI cho Part {part.partNumber}</div>
          <p className="mb-2" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {part.aiPartFeedback.summary || 'Chưa có nhận xét riêng cho part này.'}
          </p>
          {!!part.aiPartFeedback.strengths?.length && (
            <p className="mb-1"><strong>Điểm mạnh:</strong> {part.aiPartFeedback.strengths.join('; ')}</p>
          )}
          {!!part.aiPartFeedback.weaknesses?.length && (
            <p className="mb-0"><strong>Cần cải thiện:</strong> {part.aiPartFeedback.weaknesses.join('; ')}</p>
          )}
        </div>
      )}
    </div>
  </div>
);

export const SpeakingFeedbackDetail = ({ data, onRetry, retrying = false, retryError = null }) => {
  const aiFeedback = data.aiFeedback;
  const overall = data.overallSpeakingBand ?? aiFeedback?.overallBand ?? null;
  const badge = getScoreBadge(overall);
  const isAsync = Boolean(data.gradingStatus);
  const isPublishable = !isAsync || (
    data.gradingStatus === 'completed'
    && aiFeedback?.evidenceMode === 'full_audio'
    && overall !== null
  );
  const statusNotice = {
    queued: 'Bài đã vào hàng đợi. Hệ thống chưa công bố điểm.',
    running: 'Hệ thống đang kiểm tra audio và evidence. Hệ thống chưa công bố điểm.',
    retry_wait: 'Lỗi tạm thời; worker sẽ tự thử lại. Hệ thống chưa công bố điểm.',
    needs_review: 'Evidence hiện tại chưa đủ để công bố band Speaking. Bài đã được chuyển cho tutor nghe audio và xác nhận.',
    failed: 'Chấm tự động thất bại. Bạn có thể yêu cầu AI chấm lại.',
  }[data.gradingStatus];

  return (
    <div className="feedback-report mt-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
        <div>
          <h3 className="fw-bold mb-1">Speaking Feedback Detail</h3>
          <p className="text-muted mb-0">{data.testTitle || 'IELTS Speaking'}</p>
        </div>
        <span className="badge text-bg-light border">AI: {STATUS_LABELS[data.aiStatus] || data.aiStatus || 'Chưa có AI feedback'}</span>
      </div>

      {statusNotice && (
        <div className="alert alert-info border" role="status">
          {statusNotice}
        </div>
      )}

      {data.gradingStatus === 'failed' && data.canRetry && onRetry && (
        <div className="d-flex align-items-center gap-3 flex-wrap mb-4">
          <button
            type="button"
            className="btn btn-dark rounded-pill px-4"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying
              ? 'Đang gửi yêu cầu...'
              : `Chấm lại bằng AI (còn ${Math.max(0, (data.manualRetryLimit ?? 2) - (data.manualRetryCount ?? 0))} lượt)`}
          </button>
          {retryError && <span className="text-danger" role="alert">{retryError}</span>}
        </div>
      )}

      <div className="card border shadow-none mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
            <div>
              <h4 className="fw-bold mb-1">Overall Speaking Band</h4>
              <p className="text-muted mb-0">
                {isPublishable
                  ? 'Kết quả chỉ được công bố khi đủ evidence audio cho cả 4 tiêu chí và qua calibration gate.'
                  : 'Chưa có band hợp lệ. Transcript đơn thuần không đủ để chấm Fluency & Coherence hoặc Pronunciation.'}
              </p>
            </div>
            {isPublishable && (
              <div className="d-flex align-items-center gap-3">
                <span className="display-5 fw-bold text-dark mb-0">{formatBand(overall)}</span>
                <span
                  className={`badge rounded-pill px-3 py-2 ${badgeToneClasses[badge.tone] || ''}`}
                  style={badgeToneStyles[badge.tone]}
                >
                  {badge.label}
                </span>
              </div>
            )}
          </div>
          {isPublishable && <CriterionScoreCards rows={getSpeakingCriterionRows(aiFeedback)} />}
          {isPublishable && aiFeedback?.summary && (
            <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {aiFeedback.summary}
            </p>
          )}
          {isPublishable && aiFeedback?.transcriptNotes && (
            <div className="alert alert-light border mt-3 mb-0">{aiFeedback.transcriptNotes}</div>
          )}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          {(data.parts || []).map(part => (
            <SpeakingPartCard key={part.submissionId || part.partNumber} part={part} />
          ))}
        </div>
        <div className="col-lg-7">
          {isPublishable ? (
            <AiFeedbackPanel report={{ ...aiFeedback, submissionType: 'speaking' }} />
          ) : (
            <div className="alert alert-light border">
              Không hiển thị điểm hoặc nhận xét suy diễn khi evidence chưa đạt điều kiện công bố.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const WritingFeedbackDetail = ({
  data,
  onRetryTask,
  retryingTaskId = null,
  retryErrors = {},
}) => {
  const [activeTaskNumber, setActiveTaskNumber] = useState(1);
  const tasks = data.tasks || [];
  const activeTask = tasks.find(task => task.taskNumber === activeTaskNumber) || tasks[0];
  const gradingSource = getPrimaryGradingSource(data);
  const isTutorContext = gradingSource === 'tutor';
  const shouldShowAiPanel = gradingSource === 'ai' || Boolean(activeTask?.aiFeedback);
  const activeTaskFailed = activeTask?.aiFeedback?.status === 'failed'
    || Boolean(activeTask?.aiFeedback?.errorMessage);

  if (!activeTask) {
    return <div className="alert alert-info">Chưa có dữ liệu Writing task.</div>;
  }

  return (
    <div className="feedback-report mt-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
        <div>
          <h3 className="fw-bold mb-1">Writing Feedback Detail</h3>
          <p className="text-muted mb-0">{data.testTitle || 'IELTS Writing'}</p>
        </div>
        <div className="d-flex gap-2 flex-wrap justify-content-end">
          <span className="badge text-bg-light border">AI: {STATUS_LABELS[data.aiStatus] || data.aiStatus || 'Chưa có AI feedback'}</span>
          {isTutorContext && (
            <span className="badge text-bg-light border">
              Tutor: {data.tutorStatus === 'graded' ? 'Đã chấm' : 'Đang chờ chấm'}
            </span>
          )}
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        {[1, 2].map(taskNumber => (
          <li className="nav-item" key={taskNumber}>
            <button
              type="button"
              className={`nav-link ${activeTaskNumber === taskNumber ? 'active' : ''}`}
              onClick={() => setActiveTaskNumber(taskNumber)}
            >
              Task {taskNumber}
            </button>
          </li>
        ))}
      </ul>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border shadow-none mb-4">
            <div className="card-header bg-white fw-bold">Prompt</div>
            <div className="card-body">
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {activeTask.prompt || 'Không có đề bài.'}
              </p>
            </div>
          </div>
          <div className="card border shadow-none">
            <div className="card-header bg-white d-flex justify-content-between">
              <span className="fw-bold">Student response</span>
              <span className="text-muted small">{activeTask.wordCount || 0} words</span>
            </div>
            <div className="card-body">
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {activeTask.studentResponse || 'Không có bài làm.'}
              </p>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          {shouldShowAiPanel && (
            <>
              <div className="mb-3">
                <span className="badge text-bg-light border">{getAiStatusText(activeTask, data)}</span>
              </div>
              {activeTaskFailed && onRetryTask && (
                <div className="mb-3">
                  <button
                    type="button"
                    className="btn btn-dark rounded-pill px-4"
                    disabled={retryingTaskId === activeTask.submissionId}
                    onClick={() => onRetryTask(activeTask.submissionId)}
                  >
                    {retryingTaskId === activeTask.submissionId
                      ? 'Đang chấm lại...'
                      : `Chấm lại Task ${activeTask.taskNumber} bằng AI`}
                  </button>
                  {retryErrors[activeTask.submissionId] && (
                    <div className="text-danger mt-2" role="alert">
                      {retryErrors[activeTask.submissionId]}
                    </div>
                  )}
                </div>
              )}
              <AiFeedbackPanel
                report={activeTask.aiFeedback ? { ...activeTask.aiFeedback, taskNumber: activeTask.taskNumber } : null}
                isPending={data.aiStatus === 'pending'}
              />
            </>
          )}
          {isTutorContext && (
            <div className={shouldShowAiPanel ? 'mt-4' : ''}>
              <TutorFeedbackBox
                tutorGrade={activeTask.tutorGrade}
                taskNumber={activeTask.taskNumber}
              />
            </div>
          )}
        </div>
      </div>

      <OverallWritingBandCard tasks={tasks} source={gradingSource} />
    </div>
  );
};

const FeedbackReport = ({ submissionId, type }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);
  const [writingRetryTaskId, setWritingRetryTaskId] = useState(null);
  const [writingRetryErrors, setWritingRetryErrors] = useState({});
  const { socket } = useGradingSocket();

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gradingService.getFeedback(submissionId, type);
      if (response.success) {
        let nextData = response.data;
        if (type === 'speaking' && Array.isArray(nextData?.parts)) {
          const parts = await Promise.all(nextData.parts.map(async (part) => {
            try {
              const audioResponse = await gradingService.getAudioUrl(part.submissionId, 'speaking');
              return { ...part, audioUrl: audioResponse.data?.url || '' };
            } catch {
              return part;
            }
          }));
          nextData = { ...nextData, parts };
        }
        setReportData(nextData);
      } else {
        setError(response.error?.message || 'Có lỗi xảy ra khi tải điểm.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Không thể kết nối đến server.');
    } finally {
      setLoading(false);
    }
  }, [submissionId, type]);

  const retrySpeaking = useCallback(async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await gradingService.retrySpeakingGrading(submissionId);
      await fetchFeedback();
    } catch (retryFailure) {
      setRetryError(
        retryFailure.response?.data?.error?.message
        || retryFailure.message
        || 'Không thể gửi yêu cầu chấm lại.'
      );
    } finally {
      setRetrying(false);
    }
  }, [fetchFeedback, submissionId]);

  const retryWritingTask = useCallback(async (taskSubmissionId) => {
    setWritingRetryTaskId(taskSubmissionId);
    setWritingRetryErrors((current) => ({ ...current, [taskSubmissionId]: null }));
    try {
      await gradingService.requestAiGrading(taskSubmissionId);
      await fetchFeedback();
    } catch (retryFailure) {
      const message = retryFailure.response?.data?.error?.message
        || retryFailure.message
        || 'Không thể chấm lại Writing bằng AI.';
      setWritingRetryErrors((current) => ({ ...current, [taskSubmissionId]: message }));
    } finally {
      setWritingRetryTaskId(null);
    }
  }, [fetchFeedback]);

  // EARS[Event]: WHEN component mounts THEN fetch feedback report initially (Fallback mechanism)
  useEffect(() => {
    if (submissionId) {
      const timer = window.setTimeout(fetchFeedback, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [fetchFeedback, submissionId]);

  // EARS[Event]: WHEN socket emits grading_complete or grading_failed THEN refetch or update state
  useEffect(() => {
    if (!socket) return;

    const handleGradingComplete = (data) => {
      const eventSubmissionId = data.submission_id || data.submissionId;
      if (eventSubmissionId === submissionId) {
        fetchFeedback();
      }
    };

    const handleGradingFailed = (data) => {
      const eventSubmissionId = data.submission_id || data.submissionId;
      if (eventSubmissionId === submissionId) {
        setError('Chấm bài thất bại, quota đã được hoàn trả.');
        setLoading(false);
      }
    };

    socket.on('grading_complete', handleGradingComplete);
    socket.on('grading_failed', handleGradingFailed);

    return () => {
      // EARS[Event]: WHEN component unmounts THEN clean up socket listeners to prevent memory leaks and duplicate events
      socket.off('grading_complete', handleGradingComplete);
      socket.off('grading_failed', handleGradingFailed);
    };
  }, [socket, submissionId, fetchFeedback]);

  // Polling fallback
  useEffect(() => {
    if (reportData?.aiStatus === 'pending' || reportData?.status === 'pending') {
      const interval = setInterval(() => {
        fetchFeedback();
      }, 10000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [reportData?.aiStatus, reportData?.status, fetchFeedback]);

  if (loading && !reportData) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted fw-bold">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Lỗi!</h4>
        <p>{error}</p>
        <button className="btn btn-outline-danger mt-2" onClick={fetchFeedback}>Thử lại</button>
      </div>
    );
  }

  if (type === 'writing' && Array.isArray(reportData?.tasks)) {
    return (
      <WritingFeedbackDetail
        data={reportData}
        onRetryTask={retryWritingTask}
        retryingTaskId={writingRetryTaskId}
        retryErrors={writingRetryErrors}
      />
    );
  }

  if (type === 'speaking' && Array.isArray(reportData?.parts)) {
    return (
      <SpeakingFeedbackDetail
        data={reportData}
        onRetry={retrySpeaking}
        retrying={retrying}
        retryError={retryError}
      />
    );
  }

  if (!reportData || (!reportData.ai_report && !reportData.tutor_report)) {
    return (
      <div className="alert alert-info" role="alert">
        <p className="mb-0">Chưa có kết quả chấm điểm cho bài làm này.</p>
      </div>
    );
  }

  const report = reportData.tutor_report || reportData.ai_report;
  const isTutor = !!reportData.tutor_report;

  if (!isTutor && reportData.ai_report) {
    return (
      <div className="feedback-report mt-4">
        <AiFeedbackPanel report={reportData.ai_report} />
      </div>
    );
  }

  const formatScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    const num = parseFloat(score);
    return isNaN(num) ? 'N/A' : num.toFixed(1);
  };

  // UI/UX Minimalist Black & White Theme (Uber-like)
  return (
    <div className="feedback-report mt-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
      {/* Nổi bật Điểm Overall */}
      <div className="card shadow-none border mb-4 rounded-4" style={{ borderColor: '#e2e2e2' }}>
        <div className="card-body text-center py-5 bg-white rounded-4">
          <h2 className="text-uppercase fw-bold text-dark mb-2" style={{ fontSize: '16px', letterSpacing: '1px' }}>Overall Band Score</h2>
          <div className="display-1 fw-bold text-dark mb-4" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '80px' }}>
            {formatScore(report.band_score)}
          </div>
          <span className="badge bg-dark text-white rounded-pill fs-6 px-4 py-2 fw-medium">
            Graded by {isTutor ? 'Tutor' : 'AI'}
          </span>
        </div>
      </div>

      {/* 4 tiêu chí thành phần hiển thị dạng Grid */}
      <div className="row g-4 mb-4">
        {type === 'writing' ? (
          <>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Task Achievement / Response</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.task_achievement_score || report.task_response_score)}</h3>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Coherence & Cohesion</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.coherence_score)}</h3>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Fluency & Coherence</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.fluency_score)}</h3>
                </div>
              </div>
            </div>
            <div className="col-6 col-lg-3">
              <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
                <div className="card-body p-3 p-lg-4 text-center">
                  <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Pronunciation</h6>
                  <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.pronunciation_score)}</h3>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="col-6 col-lg-3">
          <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
            <div className="card-body p-3 p-lg-4 text-center">
              <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Lexical Resource</h6>
              <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.lexical_score)}</h3>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card h-100 border shadow-none rounded-4" style={{ borderColor: '#e2e2e2', backgroundColor: '#fdfdfd' }}>
            <div className="card-body p-3 p-lg-4 text-center">
              <h6 className="card-title text-muted fw-medium mb-2 mb-lg-3" style={{ fontSize: '13px' }}>Grammatical Range & Accuracy</h6>
              <h3 className="card-text fw-bold text-dark mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>{formatScore(report.grammar_score)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Error Highlights */}
      {report.error_highlights && report.error_highlights.length > 0 && (
        <div className="card shadow-none mb-4 rounded-4 border" style={{ borderColor: '#e2e2e2' }}>
          <div className="card-header bg-dark text-white rounded-top-4 py-3 border-0">
            <h5 className="mb-0 fw-bold" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}><i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>Error Highlights</h5>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush rounded-bottom-4">
              {report.error_highlights.map((err, idx) => (
                <li key={idx} className="list-group-item px-4 py-4 border-bottom" style={{ borderColor: '#e2e2e2' }}>
                  <div className="mb-2">
                    <span className="badge bg-secondary rounded-pill px-3 py-1 fw-medium">{err.type || 'Error'}</span>
                  </div>
                  <div className="fst-italic text-muted mb-2 text-decoration-line-through" style={{ fontSize: '15px' }}>"{err.text}"</div>
                  <div className="fw-bold text-dark" style={{ fontSize: '15px' }}>&rarr; {err.suggestion}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Feedback chi tiết */}
      <div className="card shadow-none rounded-4 border" style={{ borderColor: '#e2e2e2' }}>
        <div className="card-header bg-white border-bottom py-3 rounded-top-4" style={{ borderColor: '#e2e2e2' }}>
          <h5 className="mb-0 fw-bold text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>Detailed Feedback</h5>
        </div>
        <div className="card-body p-4 bg-white rounded-bottom-4" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px' }}>
          {report.written_feedback || report.feedback_text || 'Không có nhận xét chi tiết.'}
        </div>
      </div>
    </div>
  );
};

export default FeedbackReport;
