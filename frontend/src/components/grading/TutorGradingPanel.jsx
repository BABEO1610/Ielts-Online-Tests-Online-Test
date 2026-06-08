import React, { useState, useEffect } from 'react';
import gradingService from '../../services/grading.service';
import TutorContextSidebar from './TutorContextSidebar';

const IELTS_CRITERIA = {
  writing: [
    { key: 'task_achievement_score', label: 'Task Achievement / Response' },
    { key: 'coherence_score', label: 'Coherence & Cohesion' },
    { key: 'lexical_score', label: 'Lexical Resource' },
    { key: 'grammar_score', label: 'Grammatical Range & Accuracy' }
  ],
  speaking: [
    { key: 'fluency_score', label: 'Fluency & Coherence' },
    { key: 'pronunciation_score', label: 'Pronunciation' },
    { key: 'lexical_score', label: 'Lexical Resource' },
    { key: 'grammar_score', label: 'Grammatical Range & Accuracy' }
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

const TutorGradingPanel = ({ submissionId, type, studentId, onGradingComplete }) => {
  const [audioUrl, setAudioUrl] = useState(null);
  const [scores, setScores] = useState({
    task_achievement_score: '',
    coherence_score: '',
    lexical_score: '',
    grammar_score: '',
    fluency_score: '',
    pronunciation_score: ''
  });
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [highlights, setHighlights] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prelimLoading, setPrelimLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // EARS[Event]: WHEN component mounts and type is speaking THEN fetch audio url
    if (type === 'speaking' && submissionId) {
      const fetchAudioUrl = async () => {
        try {
          setLoading(true);
          const response = await gradingService.getAudioUrl(submissionId, type);
          if (response.success) {
            setAudioUrl(response.data.presigned_url);
          }
        } catch (err) {
          setError(err.response?.data?.error?.message || 'Failed to load audio URL.');
        } finally {
          setLoading(false);
        }
      };
      fetchAudioUrl();
    }
  }, [submissionId, type]);

  const handleScoreChange = (key, value) => {
    setScores(prev => ({ ...prev, [key]: value }));
  };

  const getCriteriaList = () => {
    return IELTS_CRITERIA[type] || [];
  };

  const previewBandScore = () => {
    const criteria = getCriteriaList();
    const currentScores = criteria.map(c => parseFloat(scores[c.key])).filter(s => !isNaN(s));
    if (currentScores.length < 4) return null;
    return calculatePreviewBand(currentScores);
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
        type,
        written_feedback: writtenFeedback,
        // band_score sent as reference according to Tech Lead instruction
        band_score: previewBandScore() || 0 
      };
      
      criteria.forEach(c => {
        payload[c.key] = parseFloat(scores[c.key]);
      });

      const response = await gradingService.gradeSubmission(submissionId, payload);
      if (response.success) {
        if (onGradingComplete) {
          onGradingComplete(response.data.report_id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit grades.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="bg-canvas rounded-4 p-4">
          <h4 className="mb-4 text-ink fw-bold">Grading Panel</h4>
          
          {error && (
            <div className="bg-canvas-soft border-start border-4 border-dark text-ink p-3 mb-4 rounded" role="alert">
              <span className="fw-medium">{error}</span>
            </div>
          )}

          {type === 'speaking' && (
            <div className="mb-4">
              <h5 className="text-ink fw-bold">Student Audio</h5>
              {loading ? (
                <div className="text-body fw-medium py-2">Loading audio...</div>
              ) : audioUrl ? (
                <audio src={audioUrl} controls className="w-100" data-testid="audio-player" />
              ) : (
                <p className="text-body">No audio available.</p>
              )}
            </div>
          )}

          <div className="mb-4 d-flex justify-content-between align-items-center">
            <button 
              type="button"
              className="btn btn-light rounded-pill px-4 py-2 fw-medium"
              onClick={handleRunPrelimCheck}
              disabled={prelimLoading}
            >
              {prelimLoading ? 'Running...' : 'Run AI Prelim Check'}
            </button>
          </div>

          {highlights && (
            <div className="bg-canvas-soft p-4 rounded-4 mb-4 text-ink">
              <h6 className="fw-bold mb-3">AI Prelim Highlights</h6>
              <pre className="mb-0 text-ink fw-medium" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {JSON.stringify(highlights, null, 2)}
              </pre>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              {getCriteriaList().map(criteria => (
                <div className="col-md-6" key={criteria.key}>
                  <label className="form-label fw-bold text-ink">{criteria.label}</label>
                  <input 
                    type="number" 
                    className="form-control bg-canvas-soft border-0 px-3 py-2 fw-medium" 
                    min="0" 
                    max="9" 
                    step="0.5" 
                    required
                    value={scores[criteria.key]}
                    onChange={(e) => handleScoreChange(criteria.key, e.target.value)}
                    data-testid={`input-${criteria.key}`}
                  />
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
                value={writtenFeedback}
                onChange={(e) => setWrittenFeedback(e.target.value)}
                placeholder="Provide detailed feedback here..."
                data-testid="textarea-feedback"
              ></textarea>
            </div>

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
          </form>
        </div>
      </div>
      <div className="col-lg-4">
        <TutorContextSidebar studentId={studentId} />
      </div>
    </div>
  );
};

export default TutorGradingPanel;
export { calculatePreviewBand };
