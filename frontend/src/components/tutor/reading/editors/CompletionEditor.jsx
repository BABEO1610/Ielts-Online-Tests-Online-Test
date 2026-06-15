import { Plus, Trash2 } from 'lucide-react';

// EARS[Event]: WHEN component is rendered THEN it manages Completion questions
function CompletionEditor({ block, onChange }) {
  // block.content for the summary/table/note text that has blanks
  // block.questions for the blanks/short answers
  const questions = block.questions || [];
  
  const isSummary = block.type === 'Summary Completion' || block.type === 'Note/Table/Flow-chart Completion';
  const isShortAnswer = block.type === 'Short-answer Questions';
  const isSentence = block.type === 'Sentence Completion';

  const addQuestion = () => {
    // EARS[State-driven]: WHEN tutor adds an answer THEN a new answer input is appended
    const newQuestion = { id: Date.now(), text: '', correctAnswer: '', explanation: '' };
    onChange({ ...block, questions: [...questions, newQuestion] });
  };

  const updateQuestion = (qId, field, value) => {
    onChange({
      ...block,
      questions: questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
    });
  };

  const removeQuestion = (qId) => {
    onChange({
      ...block,
      questions: questions.filter(q => q.id !== qId)
    });
  };

  const handleContentChange = (e) => {
    // EARS[State-driven]: WHEN tutor updates content text THEN block content is updated
    onChange({ ...block, content: e.target.value });
  };

  return (
    <div className="completion-editor">
      <div className="mb-3">
        <label className="form-label fw-bold" style={{ fontSize: '0.85rem' }}>Word Count Limit Instruction</label>
        <input 
          type="text" 
          className="form-control form-control-sm" 
          placeholder="e.g. Choose NO MORE THAN TWO WORDS from the passage for each answer." 
          value={block.instruction || ''}
          onChange={(e) => onChange({ ...block, instruction: e.target.value })}
          data-testid="instruction-input"
        />
      </div>

      {(isSummary || isSentence) && (
        <div className="mb-4">
          <label className="form-label fw-bold" style={{ fontSize: '0.85rem' }}>
            {isSummary ? 'Summary / Note Content' : 'Sentence Context (Optional)'}
          </label>
          <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}>
            Enter the text here. Use blanks like <code>[1]</code>, <code>[2]</code> to represent where the answers should go.
          </p>
          <textarea 
            className={`form-control ${isSummary && !block.content ? 'is-invalid' : ''}`} 
            rows="5" 
            placeholder="E.g. The researchers discovered that [1] were the primary cause of the decline in [2] population..."
            value={block.content || ''}
            onChange={handleContentChange}
            data-testid="content-textarea"
          />
          {/* EARS[Unwanted-State]: IF summary content is empty THEN show validation error */}
          {isSummary && !block.content && <div className="invalid-feedback d-block" data-testid="content-error">Nội dung đoạn văn không được để trống.</div>}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light py-2">
          <span className="fw-bold" style={{ fontSize: '0.85rem' }}>Answers</span>
          <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
            Define the exact correct answer text. Provide alternatives separated by a slash (/) if needed (e.g. "car/automobile").
          </p>
        </div>
        <div className="card-body p-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="d-flex gap-3 mb-3 align-items-start border p-2 rounded" data-testid="comp-question">
              <div className="fw-bold mt-1" style={{ width: '30px' }}>Q{idx + 1}.</div>
              <div className="flex-grow-1">
                {isShortAnswer && (
                  <>
                    <input 
                      type="text" 
                      className={`form-control form-control-sm mb-1 ${!(q.text || '').trim() ? 'is-invalid' : ''}`} 
                      placeholder="Question prompt (e.g. What is the main cause of...)" 
                      value={q.text} 
                      onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                      data-testid={`q-text-${q.id}`}
                    />
                    {/* EARS[Unwanted-State]: IF short answer prompt is empty THEN show validation error */}
                    {!(q.text || '').trim() && <div className="invalid-feedback d-block m-0 mb-2" data-testid="q-text-error">Câu hỏi không được để trống.</div>}
                  </>
                )}
                <input 
                  type="text" 
                  className={`form-control form-control-sm ${!(q.correctAnswer || '').trim() ? 'is-invalid' : 'border-success'}`}
                  placeholder="Exact Answer Text" 
                  value={q.correctAnswer} 
                  onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                  data-testid={`q-ans-${q.id}`}
                />
                {/* EARS[Unwanted-State]: IF answer text is empty THEN show validation error */}
                {!(q.correctAnswer || '').trim() && <div className="invalid-feedback d-block m-0" data-testid="q-ans-error">Đáp án không được để trống.</div>}
                <div className="mt-2">
                  <label className="form-label mb-1" style={{ fontSize: '0.8rem' }}>Answer Explanation</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    placeholder="Explain where this answer comes from..."
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)}
                    data-testid={`q-explanation-${q.id}`}
                  />
                </div>
              </div>
              <button className="btn btn-sm text-danger p-1 mt-1" onClick={() => removeQuestion(q.id)} title="Remove Answer" data-testid={`remove-q-${q.id}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button className="btn btn-outline-primary btn-sm mt-2 w-100" onClick={addQuestion} data-testid="add-ans-btn">
            <Plus size={16} className="me-1" /> Add Answer Input
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompletionEditor;
