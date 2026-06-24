import { useState, useMemo } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseBulkText, parseAdvancedText, validateParsedQuestions } from '../../utils/questionParser';

const SUPPORTED_TYPES = [
  'Multiple Choice',
  'True/False/Not Given',
  'Yes/No/Not Given',
  'Sentence Completion',
  'Summary Completion',
  'Note/Table/Flow-chart Completion',
  'Short-answer Questions'
];

function BulkAddModal({ onClose, onConfirm }) {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [blockType, setBlockType] = useState('');
  const [rawText, setRawText] = useState('');
  
  const { blocks, validationErrors } = useMemo(() => {
    if (!rawText.trim()) return { blocks: [], validationErrors: null };
    
    if (isAdvancedMode) {
      const { blocks: parsedBlocks, errors } = parseAdvancedText(rawText);
      return { blocks: parsedBlocks || [], validationErrors: errors };
    } else {
      if (!blockType) return { blocks: [], validationErrors: null };
      
      const { questions: parsedQs, error: parseError } = parseBulkText(rawText, blockType);
      if (parseError) return { blocks: [], validationErrors: [parseError] };
      
      const vError = validateParsedQuestions(parsedQs, blockType);
      if (vError) return { blocks: [], validationErrors: [vError] };
      
      return { 
        blocks: [{ type: blockType, questions: parsedQs }], 
        validationErrors: null 
      };
    }
  }, [rawText, blockType, isAdvancedMode]);

  const handleConfirm = () => {
    if (validationErrors && validationErrors.length > 0) return;
    if (!blocks || blocks.length === 0) return;
    
    const newBlocks = blocks.map((b, index) => ({
      id: Date.now() + index,
      type: b.type,
      range: `1-${b.questions.length}`,
      questions: b.questions,
      options: []
    }));
    
    onConfirm(newBlocks);
  };

  const getFormatHint = () => {
    if (isAdvancedMode) {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu Advanced:</strong><br />
          <code>
            [MCQ]<br/>
            1. Câu hỏi là gì?<br/>
            A. Sai<br/>
            *B. Đúng<br/>
            <br/>
            [T/F/NG]<br/>
            2. Con mèo kêu gâu gâu.<br/>
            *FALSE
          </code>
        </div>
      );
    }

    if (blockType === 'Multiple Choice') {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu:</strong><br />
          <code>
            1. Câu hỏi là gì?<br/>
            A. Sai<br/>
            *B. Đúng<br/>
            C. Sai<br/>
            Giải thích: Vì sao lại đúng.
          </code>
        </div>
      );
    }
    if (['True/False/Not Given', 'Yes/No/Not Given'].includes(blockType)) {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu:</strong><br />
          <code>
            1. Con mèo kêu gâu gâu.<br/>
            *FALSE<br/>
            Giải thích: Vì con mèo kêu meo meo.
          </code>
        </div>
      );
    }
    if (blockType) {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu:</strong><br />
          <code>
            1. Điền vào chỗ trống: ____.<br/>
            *Đáp án đúng<br/>
            Giải thích: Tìm thấy ở đoạn 2.
          </code>
        </div>
      );
    }
    return null;
  };

  const isConfirmDisabled = () => {
    if (!rawText.trim()) return true;
    if (validationErrors && validationErrors.length > 0) return true;
    if (!isAdvancedMode && !blockType) return true;
    if (blocks.length === 0) return true;
    return false;
  };

  return (
    <div className="modal-backdrop" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="modal-content bg-white rounded shadow-lg" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header p-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="m-0">Nhập Nhanh Câu Hỏi (Bulk Add)</h5>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body p-3 overflow-auto" style={{ flex: 1 }}>
          <div className="alert alert-info py-2 d-flex justify-content-between align-items-center" style={{ fontSize: '0.9rem' }}>
            <span>Giúp thêm nhanh câu hỏi bằng cách copy & paste.</span>
            
            <div className="form-check form-switch m-0">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="advancedModeSwitch"
                checked={isAdvancedMode}
                onChange={(e) => {
                  setIsAdvancedMode(e.target.checked);
                  setRawText(''); // Clear text when switching modes to avoid invalid state
                }}
              />
              <label className="form-check-label fw-bold" htmlFor="advancedModeSwitch">Advanced Mode (Markers)</label>
            </div>
          </div>
          
          <div className="row h-100">
            <div className="col-md-6 h-100 d-flex flex-column">
              {!isAdvancedMode ? (
                <>
                  <label className="form-label fw-bold">1. Chọn loại câu hỏi</label>
                  <select 
                    className="form-select mb-3" 
                    value={blockType} 
                    onChange={e => setBlockType(e.target.value)}
                  >
                    <option value="">-- Vui lòng chọn --</option>
                    {SUPPORTED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </>
              ) : (
                <div className="mb-2 text-primary fw-bold" style={{ fontSize: '0.9rem' }}>
                  Chế độ Advanced: Hệ thống tự chia khối câu hỏi dựa trên các thẻ Marker `[MCQ]`, `[T/F/NG]`...
                </div>
              )}
              
              {getFormatHint()}
              
              <label className="form-label fw-bold">{isAdvancedMode ? '1' : '2'}. Dán văn bản vào đây</label>
              <textarea 
                className="form-control flex-grow-1"
                style={{ resize: 'none', minHeight: '300px' }}
                placeholder={isAdvancedMode ? "Ví dụ:\n[MCQ]\n1. Câu hỏi\n*A. Đáp án" : "Dán nội dung vào đây..."}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                disabled={!isAdvancedMode && !blockType}
              />
            </div>
            
            <div className="col-md-6 h-100 d-flex flex-column border-start ps-3">
              <label className="form-label fw-bold">{isAdvancedMode ? '2' : '3'}. Kết quả (Preview)</label>
              
              <div className="flex-grow-1 overflow-auto bg-light rounded p-2" style={{ border: '1px solid #dee2e6' }}>
                {!rawText.trim() && (
                  <div className="text-center text-muted mt-5">
                    <em>Văn bản trống</em>
                  </div>
                )}
                {rawText.trim() && validationErrors && validationErrors.length > 0 && (
                  <div className="alert alert-danger d-flex align-items-start gap-2">
                    <AlertTriangle size={20} className="mt-1" />
                    <div>
                      <strong>Đã phát hiện lỗi:</strong>
                      <ul className="mb-0 mt-1 ps-3">
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                
                {rawText.trim() && (!validationErrors || validationErrors.length === 0) && blocks.length > 0 && (
                  <div>
                    <div className="alert alert-success d-flex align-items-center gap-2 py-2">
                      <CheckCircle size={18} />
                      Nhận diện thành công {blocks.length} khối ({blocks.reduce((acc, b) => acc + b.questions.length, 0)} câu hỏi).
                    </div>
                    
                    {blocks.map((block, bIdx) => (
                      <div key={bIdx} className="mb-4">
                        <div className="badge bg-secondary mb-2 fs-6">{block.type}</div>
                        {block.questions.map((q, qIdx) => (
                          <div key={qIdx} className="card mb-2 border-0 shadow-sm border-start border-4 border-primary">
                            <div className="card-body p-2" style={{ fontSize: '0.85rem' }}>
                              <div className="fw-bold mb-1">Câu {qIdx + 1}: {q.text}</div>
                              
                              {block.type === 'Multiple Choice' && q.options && (
                                <ul className="list-unstyled ms-3 mb-1">
                                  {q.options.map((opt, oIdx) => (
                                    <li key={opt.id} style={{ color: q.correctAnswers.includes(opt.id) ? 'var(--success)' : 'inherit', fontWeight: q.correctAnswers.includes(opt.id) ? 'bold' : 'normal' }}>
                                      {String.fromCharCode(65 + oIdx)}. {opt.text} {q.correctAnswers.includes(opt.id) && '✓'}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              
                              {block.type !== 'Multiple Choice' && (
                                <div className="text-success fw-bold ms-3 mb-1">
                                  Đáp án: {q.correctAnswer}
                                </div>
                              )}
                              
                              {q.explanation && (
                                <div className="text-muted ms-3 fst-italic">
                                  Giải thích: {q.explanation}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer p-3 border-top d-flex justify-content-end gap-2">
          <button className="btn btn-light" onClick={onClose}>Hủy bỏ</button>
          <button 
            className="btn btn-primary" 
            disabled={isConfirmDisabled()}
            onClick={handleConfirm}
          >
            Xác nhận Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkAddModal;
