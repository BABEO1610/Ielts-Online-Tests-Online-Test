/**
 * ReviewQuestionRenderer.jsx
 * 
 * Component dùng chung để render câu hỏi ở chế độ xem lại đáp án.
 * Design: Uber-inspired B&W — dùng CSS variables của project (--ink, --canvas, etc.)
 * - Read-only hoàn toàn
 * - Đúng: border đen đậm + tick ✓
 * - Sai: border đen + gạch ✗ nhỏ bên phải + hiện đáp án đúng
 * - Bỏ trống: border xám nhạt
 */

/**
 * @param {Object} props
 * @param {Object} props.question     - { id, order, type, text, options }
 * @param {Object} props.answerDetail - { questionId, userAnswer, isCorrect, correctAnswer, explanation }
 */
function ReviewQuestionRenderer({ question, answerDetail }) {
  const userAnswer    = answerDetail?.userAnswer || '';
  const isCorrect     = answerDetail?.isCorrect;
  const correctAnswer = answerDetail?.correctAnswer || '';
  const explanation   = answerDetail?.explanation || '';

  const status = !userAnswer ? 'unanswered' : (isCorrect ? 'correct' : 'incorrect');

  const statusConfig = {
    correct:    { label: '✓ Đúng',    labelColor: '#1e4620', borderColor: 'var(--ink)',            numBg: 'var(--ink)', numColor: '#fff' },
    incorrect:  { label: '✗ Sai',     labelColor: '#e02424', borderColor: 'var(--surface-pressed)', numBg: 'var(--ink)', numColor: '#fff' },
    unanswered: { label: '— Bỏ trống', labelColor: 'var(--mute)', borderColor: 'transparent', numBg: 'var(--canvas-soft)', numColor: 'var(--ink)' },
  }[status];

  /* ─── Option renderer for MCQ ─── */
  const renderMcqOption = (label, text, value) => {
    const isUserChoice  = userAnswer === value;
    const isCorrectOpt  = correctAnswer === value;

    let optClass = 'option-card';
    // Re-use .selected class style but we control via inline style override for review
    let extraStyle = { cursor: 'default', pointerEvents: 'none', margin: 0 };

    if (isCorrectOpt) {
      extraStyle = { ...extraStyle, borderColor: 'var(--ink)', background: 'var(--canvas)' };
    }
    if (isUserChoice && !isCorrectOpt) {
      extraStyle = { ...extraStyle, borderColor: 'var(--surface-pressed)', background: 'var(--canvas-soft)', opacity: 0.7 };
    }

    return (
      <div key={label} className={optClass} style={extraStyle}>
        <span className="body-md-strong flex-shrink-0" style={{ minWidth: 20, opacity: isUserChoice && !isCorrectOpt ? 0.5 : 1 }}>
          {label}.
        </span>
        <span className="body-md" style={{ flex: 1, opacity: isUserChoice && !isCorrectOpt ? 0.5 : 1 }}>{text}</span>
        {isCorrectOpt && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e4620', marginLeft: 'auto', flexShrink: 0 }}>✓ Đúng</span>
        )}
        {isUserChoice && !isCorrectOpt && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e02424', marginLeft: 'auto', flexShrink: 0 }}>✗ Của bạn</span>
        )}
      </div>
    );
  };

  /* ─── Option renderer for T/F/NG and Y/N/NG ─── */
  const renderChoiceOption = (value, displayText) => {
    const isUserChoice  = userAnswer?.toUpperCase() === value;
    const isCorrectOpt  = correctAnswer?.toUpperCase() === value;

    let extraStyle = { cursor: 'default', pointerEvents: 'none', margin: 0 };

    if (isCorrectOpt) {
      extraStyle = { ...extraStyle, borderColor: 'var(--ink)', background: 'var(--canvas)' };
    }
    if (isUserChoice && !isCorrectOpt) {
      extraStyle = { ...extraStyle, borderColor: 'var(--surface-pressed)', background: 'var(--canvas-soft)', opacity: 0.7 };
    }

    return (
      <div key={value} className="option-card" style={extraStyle}>
        <span className="body-md" style={{ flex: 1, opacity: isUserChoice && !isCorrectOpt ? 0.5 : 1 }}>{displayText}</span>
        {isCorrectOpt && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e4620', marginLeft: 'auto', flexShrink: 0 }}>✓ Đúng</span>
        )}
        {isUserChoice && !isCorrectOpt && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e02424', marginLeft: 'auto', flexShrink: 0 }}>✗ Của bạn</span>
        )}
      </div>
    );
  };

  return (
    <div
      id={`review-q-${question.order}`}
      className="card-content mb-3"
      style={{ border: `2px solid ${statusConfig.borderColor}`, cursor: 'default' }}
    >
      {/* Question header */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <span
          className="body-sm-strong d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: 28, height: 28, borderRadius: 'var(--rounded-md)',
            background: statusConfig.numBg, color: statusConfig.numColor, fontSize: 12,
          }}
        >
          {question.order}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: statusConfig.labelColor }}>
          {statusConfig.label}
        </span>
      </div>

      {/* Question text */}
      {question.text && <p className="body-md-strong mb-3">{question.text}</p>}

      {/* MCQ Options */}
      {question.type === 'mcq' && question.options && (
        <div className="d-flex flex-column gap-2 mb-3">
          {question.options.map((opt, i) => {
            const label = typeof opt === 'object' ? (opt.label ?? String.fromCharCode(65 + i)) : String.fromCharCode(65 + i);
            const text  = typeof opt === 'object' ? (opt.text  ?? String(opt)) : String(opt);
            return renderMcqOption(label, text, label);
          })}
        </div>
      )}

      {/* True/False/Not Given */}
      {question.type === 'true_false' && (
        <div className="d-flex flex-column gap-2 mb-3">
          {renderChoiceOption('TRUE',      'True')}
          {renderChoiceOption('FALSE',     'False')}
          {renderChoiceOption('NOT GIVEN', 'Not Given')}
        </div>
      )}

      {/* Yes/No/Not Given */}
      {question.type === 'yes_no' && (
        <div className="d-flex flex-column gap-2 mb-3">
          {renderChoiceOption('YES',       'Yes')}
          {renderChoiceOption('NO',        'No')}
          {renderChoiceOption('NOT GIVEN', 'Not Given')}
        </div>
      )}

      {/* Completion / Short Answer */}
      {['fill', 'short'].includes(question.type) && (
        <div className="mb-3">
          <input
            type="text"
            readOnly
            className="text-input"
            value={userAnswer || '(Bỏ trống)'}
            style={{ cursor: 'default', color: status === 'correct' ? '#1e4620' : (status === 'incorrect' ? '#e02424' : 'var(--mute)') }}
          />
        </div>
      )}

      {/* Answer Summary */}
      <div style={{ borderTop: '1px solid var(--surface-pressed)', paddingTop: 10, marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
        <div className="caption" style={{ color: 'var(--body)' }}>
          Đáp án của bạn: <strong style={{ color: status === 'correct' ? '#1e4620' : (status === 'incorrect' ? '#e02424' : 'var(--mute)') }}>
            {userAnswer || 'Không trả lời'}
          </strong>
        </div>
        <div className="caption" style={{ color: 'var(--body)' }}>
          Đáp án đúng: <strong style={{ color: 'var(--ink)' }}>{correctAnswer}</strong>
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--canvas-soft)', borderLeft: '3px solid var(--ink)', borderRadius: 4 }}>
          <span className="body-sm-strong" style={{ color: 'var(--ink)' }}>Giải thích: </span>
          <span className="body-sm" style={{ color: 'var(--body)' }}>{explanation}</span>
        </div>
      )}
    </div>
  );
}

export default ReviewQuestionRenderer;
