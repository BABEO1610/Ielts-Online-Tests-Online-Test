import React, { useState, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import gradingService from '../../services/grading.service';
import ToastNotification from '../common/ToastNotification';
import { useAuth } from '../../context/AuthContext';

const MAX_CHARS = 5000;

// EARS[Event]: WHEN user submits writing THEN send text and grader preference
// EARS[State-driven]: WHILE bài làm có status = 'pending', THE hệ thống SHALL vô hiệu hóa nút "Nộp lại" hoặc "Chỉnh sửa" của bài thi đó trên giao diện.
const WritingEditor = forwardRef(({ 
  testId, 
  taskNumber, 
  promptText, 
  status = 'new', 
  onSubmitSuccess,
  onSubmitError
}, ref) => {
  const { user } = useAuth();
  const aiQuotaRemaining = user?.ai_grading_quota_remaining ?? 0;
  const [text, setText] = useState('');
  const [grader, setGrader] = useState('tutor');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const isPending = status === 'pending';
  const charCount = text.length;

  const handleChange = (e) => {
    setText(e.target.value.slice(0, MAX_CHARS));
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit(new Event('submit'));
    }
  }));

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (charCount === 0) {
      window.alert(`Vui lòng viết câu trả lời cho Writing Task ${taskNumber} trước khi nộp!`);
      if (onSubmitError) onSubmitError(new Error('Empty response'));
      return;
    }

    if (grader === 'ai' && aiQuotaRemaining <= 0) {
      setToast({ message: 'Bạn đã hết lượt chấm bài bằng AI.', type: 'error' });
      if (onSubmitError) onSubmitError(new Error('No AI quota'));
      return;
    }

    try {
      setIsLoading(true);
      setToast(null);

      const payload = {
        test_id: testId,
        task_number: taskNumber,
        prompt_text: promptText,
        response_text: text,
        grader: grader
      };

      const response = await gradingService.submitWriting(payload);
      
      setToast({ message: 'Nộp bài thành công!', type: 'success' });
      if (onSubmitSuccess) {
        onSubmitSuccess(response);
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || 'Đã xảy ra lỗi khi nộp bài.';
      setToast({ message: errMsg, type: 'error' });
      if (onSubmitError) {
        onSubmitError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="writing-editor card p-4 shadow-sm mb-4">
      <h3 className="h5 mb-3">Writing Task {taskNumber}</h3>
      {promptText && (
        <div className="prompt-container bg-light p-3 rounded mb-3">
          <strong>Đề bài:</strong>
          <p className="mb-0 mt-2">{promptText}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3">
          <textarea
            className="form-control"
            rows="12"
            placeholder="Viết câu trả lời của bạn vào đây..."
            value={text}
            onChange={handleChange}
            disabled={isPending || isLoading}
            aria-label="Writing response"
          />
          <div className="d-flex justify-content-between mt-2 text-muted small">
            <span>Giới hạn: {MAX_CHARS} ký tự</span>
            <span className={charCount >= MAX_CHARS ? 'text-danger fw-bold' : ''}>
              {charCount} / {MAX_CHARS}
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center mb-3">
          <strong className="me-3">Chọn người chấm:</strong>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="graderOptions"
              id="graderTutor"
              value="tutor"
              checked={grader === 'tutor'}
              onChange={(e) => setGrader(e.target.value)}
              disabled={isPending || isLoading}
            />
            <label className="form-check-label" htmlFor="graderTutor">
              Giáo viên (Tutor)
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="graderOptions"
              id="graderAi"
              value="ai"
              checked={grader === 'ai'}
              onChange={(e) => setGrader(e.target.value)}
              disabled={isPending || isLoading || aiQuotaRemaining <= 0}
            />
            <label className="form-check-label" htmlFor="graderAi">
              AI Chấm điểm {aiQuotaRemaining <= 0 ? '(Hết lượt)' : `(Còn ${aiQuotaRemaining} lượt)`}
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isPending || isLoading || charCount === 0}
        >
          {isLoading ? (
            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang nộp...</>
          ) : isPending ? (
            'Bài đang được chấm'
          ) : (
            'Nộp bài'
          )}
        </button>
      </form>

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
});

WritingEditor.propTypes = {
  testId: PropTypes.string,
  taskNumber: PropTypes.number,
  promptText: PropTypes.string,
  status: PropTypes.oneOf(['new', 'pending', 'ai_graded', 'tutor_graded', 'reviewed', 'failed']),
  onSubmitSuccess: PropTypes.func,
  onSubmitError: PropTypes.func
};

export default WritingEditor;
