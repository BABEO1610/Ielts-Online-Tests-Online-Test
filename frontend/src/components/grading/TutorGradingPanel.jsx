import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gradingService from '../../services/grading.service';
import { updateGradingResult } from '../../services/gradingHistory.service';
import TutorContextSidebar from './TutorContextSidebar';

const IELTS_CRITERIA = {
  writing: [
    { key: 'taskAchievementScore', label: 'Task Achievement / Response' },
    { key: 'coherenceScore', label: 'Coherence & Cohesion' },
    { key: 'lexicalScore', label: 'Lexical Resource' },
    { key: 'grammarScore', label: 'Grammatical Range & Accuracy' }
  ],
  speaking: [
    { key: 'fluencyScore', label: 'Fluency & Coherence' },
    { key: 'pronunciationScore', label: 'Pronunciation' },
    { key: 'lexicalScore', label: 'Lexical Resource' },
    { key: 'grammarScore', label: 'Grammatical Range & Accuracy' }
  ]
};

/**
 * Thuật toán làm tròn chuẩn IELTS (Preview logic - Sync with backend)
 * - Nếu thập phân = .25, làm tròn LÊN .5.
 * - Nếu thập phân = .75, làm tròn LÊN số nguyên tiếp theo.
 * - Các trường hợp lẻ khác làm tròn XUỐNG số nguyên hoặc .5 gần nhất.
 * (Ví dụ: 6.25 -> 6.5; 6.75 -> 7.0; 6.125 -> 6.0; 6.875 -> 6.5)
 */
const calculatePreviewBand = (scores) => {
  const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
  if (validScores.length === 0) return 0;
  
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const average = sum / validScores.length;
  
  const intPart = Math.floor(average);
  const decPart = average - intPart;
  
  if (decPart === 0.25) return intPart + 0.5;
  if (decPart === 0.75) return intPart + 1.0;
  if (decPart >= 0.5) return intPart + 0.5;
  return intPart;
};

const TutorGradingPanel = ({ submissionId, type, studentId, onGradingComplete, tasks, activeTaskId, audioUrl, readOnly, editMode, initialData }) => {
  const navigate = useNavigate();
  const [taskScores, setTaskScores] = useState({});
  const [taskFeedbacks, setTaskFeedbacks] = useState({});
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [highlights, setHighlights] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [prelimLoading, setPrelimLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData && (readOnly || editMode)) {
      const initScores = {
        taskAchievementScore: initialData.scores?.taskAchievement || '',
        coherenceScore: initialData.scores?.coherence || '',
        lexicalScore: initialData.scores?.lexical || '',
        grammarScore: initialData.scores?.grammar || '',
        fluencyScore: initialData.scores?.fluency || '',
        pronunciationScore: initialData.scores?.pronunciation || ''
      };
      setTaskScores({ [activeTaskId]: initScores });
      setTaskFeedbacks({ [activeTaskId]: initialData.writtenFeedback || '' });
    }
  }, [initialData, readOnly, activeTaskId]);

  const currentScores = taskScores[activeTaskId] || {
    taskAchievementScore: '',
    coherenceScore: '',
    lexicalScore: '',
    grammarScore: '',
    fluencyScore: '',
    pronunciationScore: ''
  };
  const currentFeedback = taskFeedbacks[activeTaskId] || '';

  const handleScoreChange = (key, value) => {
    setTaskScores(prev => ({ 
      ...prev, 
      [activeTaskId]: {
        ...(prev[activeTaskId] || {}),
        [key]: value
      }
    }));
  };

  const handleFeedbackChange = (value) => {
    setTaskFeedbacks(prev => ({
      ...prev,
      [activeTaskId]: value
    }));
  };

  const getCriteriaList = () => {
    return IELTS_CRITERIA[type] || [];
  };

  const previewBandScore = () => {
    const criteria = getCriteriaList();
    const scoresArray = criteria.map(c => parseFloat(currentScores[c.key])).filter(s => !isNaN(s));
    if (scoresArray.length < 4) return null;
    return calculatePreviewBand(scoresArray);
  };

  const handleRunPrelimCheck = async () => {
    // EARS[Event]: WHEN tutor clicks Run Prelim Check THEN call api
    try {
      setPrelimLoading(true);
      setError(null);
      const response = await gradingService.runPrelimCheck(submissionId);
      if (response.success) {
        setHighlights(response.data.highlights);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to run prelim check.');
    } finally {
      setPrelimLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // EARS[Event]: WHEN tutor submits grade THEN call API and notify parent
    try {
      setSubmitting(true);
      setError(null);
      
      const criteria = getCriteriaList();
      const payload = {
        writtenFeedback: currentFeedback,
        bandScore: previewBandScore() || 0 
      };
      
      criteria.forEach(c => {
        payload[c.key] = parseFloat(currentScores[c.key]);
      });

      let response;
      if (editMode) {
        response = await updateGradingResult(submissionId, payload);
      } else {
        response = await gradingService.gradeSubmission(type, submissionId, payload);
      }

      if (response.success) {
        if (onGradingComplete) {
          onGradingComplete();
        }
        navigate(editMode ? '/grading/tutor/schedule' : '/grading/tutor/queue');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit grades.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-canvas rounded-4 p-4 h-100 d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="text-ink fw-bold mb-0">
            Grading Panel - {tasks?.find(t => t.id === activeTaskId)?.name || 'Task'}
            {readOnly && <span className="badge bg-secondary ms-2 fs-6">Chỉ đọc</span>}
            {editMode && <span className="badge bg-warning text-dark ms-2 fs-6">Chỉnh sửa điểm</span>}
          </h4>
          
          <div className="dropdown">
            <button 
              className="btn btn-light rounded-circle p-2 border-0 shadow-none dropdown-toggle-no-caret" 
              data-bs-toggle="dropdown" 
              aria-expanded="false"
              style={{ backgroundColor: 'transparent' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-4 p-2 mt-1">
              <li>
                <button className="dropdown-item rounded-3 py-2 fw-medium" onClick={() => setShowNotesModal(true)}>
                  <i className="bi bi-journal-text me-2"></i>Student Notes
                </button>
              </li>
            </ul>
          </div>
        </div>
          
          {error && (
            <div className="bg-canvas-soft border-start border-4 border-dark text-ink p-3 mb-4 rounded" role="alert">
              <span className="fw-medium">{error}</span>
            </div>
          )}

          {type === 'speaking' && audioUrl && (
            <div className="mb-4">
              <h5 className="text-ink fw-bold">Student Audio</h5>
              <audio src={audioUrl} controls className="w-100" data-testid="audio-player" />
            </div>
          )}

          {!readOnly && (
            <div className="mb-4 d-flex justify-content-between align-items-center">
              <button 
                type="button"
                className="btn btn-light rounded-pill px-4 py-2 fw-medium d-flex align-items-center gap-2"
                onClick={handleRunPrelimCheck}
                disabled={prelimLoading}
                style={{ backgroundColor: '#efefef' }}
              >
                {prelimLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm text-dark" role="status" aria-hidden="true"></span>
                    Đang phân tích...
                  </>
                ) : (
                  'Run AI Prelim Check'
                )}
              </button>
            </div>
          )}

          {highlights && (
            <div className="p-4 rounded-4 mb-4 text-dark" style={{ backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
              <div className="d-flex align-items-center mb-3 gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d6efd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <h6 className="fw-bold mb-0 text-primary" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>Gợi ý của AI (AI Highlights)</h6>
              </div>
              {typeof highlights === 'object' ? (
                <ul className="mb-0 ps-3">
                  {Object.keys(highlights).map(key => (
                    <li key={key} className="mb-1" style={{ fontSize: '14px' }}>
                      <strong className="text-capitalize">{key.replace(/_/g, ' ')}:</strong> {highlights[key]}
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="mb-0 text-dark fw-medium" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px' }}>
                  {JSON.stringify(highlights, null, 2)}
                </pre>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              {getCriteriaList().map(criteria => (
                <div className="col-md-6" key={criteria.key}>
                  <label className="form-label fw-bold text-ink">{criteria.label}</label>
                  <select 
                    className="form-select bg-canvas-soft border-0 px-3 py-2 fw-medium" 
                    required
                    value={currentScores[criteria.key]}
                    onChange={(e) => handleScoreChange(criteria.key, e.target.value)}
                    disabled={readOnly}
                    data-testid={`input-${criteria.key}`}
                    style={{ backgroundColor: '#efefef', borderRadius: '8px' }}
                  >
                    <option value="" disabled>Chọn điểm...</option>
                    {Array.from({ length: 19 }, (_, i) => i * 0.5).map(val => (
                      <option key={val} value={val}>{val.toFixed(1)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mb-4 p-4 bg-canvas-soft rounded-4 d-flex justify-content-between align-items-center">
              <span className="fw-bold text-ink">Preview Band Score:</span>
              <div className="d-flex align-items-center">
                <span className="badge bg-dark rounded-pill fs-5 px-3 py-2 me-2" data-testid="preview-band">
                  {previewBandScore() !== null ? previewBandScore().toFixed(1) : '-'}
                </span>
                <small className="text-body fw-medium">(Reference only)</small>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold text-ink">Written Feedback</label>
              <textarea 
                className="form-control bg-canvas-soft border-0 p-3 fw-medium" 
                rows="5"
                required
                value={currentFeedback}
                onChange={(e) => handleFeedbackChange(e.target.value)}
                disabled={readOnly}
                placeholder="Provide detailed feedback here..."
                data-testid="textarea-feedback"
              ></textarea>
            </div>

            {!readOnly && (
              <div className="text-end mt-4">
                <button 
                  type="submit" 
                  className="btn btn-dark rounded-pill px-5 py-3 fw-bold"
                  disabled={submitting}
                  style={{ fontSize: '18px' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Grade'}
                </button>
              </div>
            )}
          </form>
        </div>

      {/* Student Notes Modal */}
      {showNotesModal && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }} onClick={() => setShowNotesModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">Student Notes</h5>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowNotesModal(false)}></button>
              </div>
              <div className="modal-body">
                <TutorContextSidebar studentId={studentId} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorGradingPanel;
export { calculatePreviewBand };
