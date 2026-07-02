import { useState, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

const MAX_CHARS = 5000;

// EARS[Event]: WHEN user submits writing THEN send text and grader preference
// EARS[State-driven]: WHILE bài làm có status = 'pending', THE hệ thống SHALL vô hiệu hóa nút "Nộp lại" hoặc "Chỉnh sửa" của bài thi đó trên giao diện.
const WritingEditor = forwardRef(({ 
  taskNumber, 
  promptText, 
  status = 'new'
}, ref) => {
  const [text, setText] = useState('');
  const [grader, setGrader] = useState('tutor');

  const isPending = status === 'pending';
  const charCount = text.length;

  const handleChange = (e) => {
    setText(e.target.value.slice(0, MAX_CHARS));
  };

  useImperativeHandle(ref, () => ({
    getTaskData: () => {
      if (charCount === 0) {
        throw new Error(`Vui lòng viết câu trả lời cho Writing Task ${taskNumber} trước khi nộp!`);
      }
      return {
        task_number: taskNumber,
        prompt_text: promptText,
        response_text: text,
        grader: grader
      };
    }
  }));

  return (
    <div className="writing-editor card p-4 shadow-sm mb-4 border-0 h-100">
      <h3 className="h5 mb-3 fw-bold">Writing Task {taskNumber}</h3>
      {promptText && (
        <div className="prompt-container bg-light p-3 rounded mb-3">
          <strong>Đề bài:</strong>
          <p className="mb-0 mt-2">{promptText}</p>
        </div>
      )}

      <div className="form-group mb-3 flex-grow-1 d-flex flex-column">
        <textarea
          className="form-control flex-grow-1"
          style={{ minHeight: '300px', resize: 'none' }}
          placeholder="Viết câu trả lời của bạn vào đây..."
          value={text}
          onChange={handleChange}
          disabled={isPending}
        />
        <div className="d-flex justify-content-between mt-2 text-muted small">
          <span>{charCount}/{MAX_CHARS} ký tự</span>
          <span>Từ: {text.trim() === '' ? 0 : text.trim().split(/\s+/).length}</span>
        </div>
      </div>

      <div className="grader-selection mb-4">
        <p className="mb-2 fw-bold text-dark">Chọn người chấm:</p>
        <div className="d-flex gap-4">
          <div className="form-check">
            <input 
              className="form-check-input" 
              type="radio" 
              name={`grader-${taskNumber}`} 
              id={`graderTutor-${taskNumber}`} 
              value="tutor" 
              checked={grader === 'tutor'} 
              onChange={(e) => setGrader(e.target.value)}
              disabled={isPending}
            />
            <label className="form-check-label" htmlFor={`graderTutor-${taskNumber}`}>
              Giảng viên chấm
            </label>
          </div>
          <div className="form-check">
            <input 
              className="form-check-input" 
              type="radio" 
              name={`grader-${taskNumber}`} 
              id={`graderAi-${taskNumber}`} 
              value="ai" 
              checked={grader === 'ai'} 
              onChange={(e) => setGrader(e.target.value)}
              disabled={isPending}
            />
            <label className="form-check-label" htmlFor={`graderAi-${taskNumber}`}>
              AI chấm điểm - nhận feedback nhanh
            </label>
          </div>
        </div>
      </div>
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
