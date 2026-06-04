/**
 * TutorQuestionFormPage.jsx — Task 4.4.3
 * Form Thêm/Sửa câu hỏi (Tutor View)
 * 
 * Nhập nội dung câu, loại câu (MCQ/Fill), options đáp án, đáp án đúng, giải thích.
 * Bố cục card bao bọc từng form nhập, nút btn-outline-primary để thêm tùy chọn.
 * Design: Uber-inspired card layout for question editing.
 */
import React, { useState } from 'react';
import '../../styles/objective-testing.css';

function TutorQuestionFormPage() {
  const [questionType, setQuestionType] = useState('mcq');
  const [options, setOptions] = useState([
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ]);

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + options.length);
    setOptions([...options, { label: nextLabel, text: '' }]);
  };

  const removeOption = (idx) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx, text) => {
    setOptions(options.map((opt, i) => i === idx ? { ...opt, text } : opt));
  };

  return (
    <div className="container py-4" style={{ maxWidth: 750 }}>
      <div className="page-heading">
        <h1>Add question</h1>
        <p>Cambridge IELTS 18 — Reading Test 1 · Question #1</p>
      </div>

      <div className="form-card" id="question-form-card">
        {/* Question Type */}
        <div className="form-group">
          <label htmlFor="select-qtype">Question type</label>
          <select id="select-qtype" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
            <option value="mcq">Multiple Choice (MCQ)</option>
            <option value="fill">Fill in the blank</option>
          </select>
        </div>

        {/* Question Text */}
        <div className="form-group">
          <label htmlFor="input-qtext">Question text</label>
          <textarea id="input-qtext" rows="3" placeholder="Enter the question..." />
        </div>

        {/* MCQ Options */}
        {questionType === 'mcq' && (
          <div className="form-group">
            <label>Answer options</label>
            {options.map((opt, idx) => (
              <div key={idx} className="d-flex align-items-center gap-2 mb-2" id={`option-row-${idx}`}>
                <span className="body-md-strong" style={{ minWidth: 24 }}>{opt.label}.</span>
                <input type="text" placeholder={`Option ${opt.label}`} value={opt.text} onChange={(e) => updateOption(idx, e.target.value)} style={{ flex: 1 }} />
                {options.length > 2 && (
                  <button onClick={() => removeOption(idx)} className="button-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13, border: '1px solid var(--surface-pressed)', color: '#e02424' }} id={`btn-remove-opt-${idx}`}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="button-secondary" id="btn-add-option" style={{ width: 'auto', padding: '8px 20px', fontSize: 13, border: '1px solid var(--surface-pressed)', marginTop: 8 }}>
              + Add option
            </button>
          </div>
        )}

        {/* Correct Answer */}
        <div className="form-group">
          <label htmlFor="input-correct">Correct answer</label>
          {questionType === 'mcq' ? (
            <select id="input-correct">
              <option value="">Select correct option</option>
              {options.map(opt => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
            </select>
          ) : (
            <input type="text" id="input-correct" placeholder="Type the exact correct answer..." />
          )}
        </div>

        {/* Explanation */}
        <div className="form-group">
          <label htmlFor="input-explanation">Explanation</label>
          <textarea id="input-explanation" rows="3" placeholder="Explain why this is the correct answer..." />
        </div>

        {/* Actions */}
        <div className="d-flex gap-3 mt-4" style={{ borderTop: '1px solid var(--surface-pressed)', paddingTop: 'var(--spacing-xl)' }}>
          <button className="button-primary flex-fill" id="btn-save-question" style={{ padding: '14px 0' }}>Save question</button>
          <button className="button-secondary flex-fill" id="btn-save-next" style={{ padding: '14px 0', border: '1px solid var(--surface-pressed)' }}>Save & add next</button>
        </div>
      </div>
    </div>
  );
}

export default TutorQuestionFormPage;
