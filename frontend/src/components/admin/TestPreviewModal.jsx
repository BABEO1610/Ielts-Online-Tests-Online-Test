import React, { useEffect, useState } from 'react';
import { fetchTestDetail } from '../../services/adminOps.service';
import Badge from '../common/Badge';

const renderBlockContent = (content) => {
  if (!content) return null;
  const isImageUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(content.trim());
  if (isImageUrl) {
    return <img src={content.trim()} alt="Diagram / Map" className="img-fluid rounded border mb-2" style={{ maxHeight: '400px', display: 'block', margin: '10px auto' }} />;
  }
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

const renderPassage = (passage) => {
  let meta = null;
  let instructionText = passage.instruction;

  // Cố gắng parse instruction xem có phải là JSON metadata không (cho Writing task)
  if (passage.instruction) {
    try {
      const parsed = JSON.parse(passage.instruction);
      if (parsed && typeof parsed === 'object') {
        meta = parsed;
        instructionText = null; // Đã là JSON thì không in ra như instruction thông thường
      }
    } catch (e) {
      // Không phải JSON, giữ nguyên là text
    }
  }

  // Nếu content lại là JSON (phòng trường hợp ngược lại), ta cũng thử parse
  if (!meta && passage.content) {
    try {
      const parsed = JSON.parse(passage.content);
      if (parsed && typeof parsed === 'object') {
        meta = parsed;
      }
    } catch (e) {
      // Không phải JSON
    }
  }

  return (
    <>
      {instructionText && <p className="passage-instruction"><i>{instructionText}</i></p>}
      
      {meta && (
        <div className="passage-json-content p-3 bg-light rounded mb-3">
          {meta.imageUrl && (
            <div className="mb-3 text-center">
              <img src={meta.imageUrl} alt="Task Image" className="img-fluid rounded border" style={{ maxHeight: '300px' }} />
            </div>
          )}
          <div className="d-flex gap-2 mb-2 flex-wrap">
            {meta.testType && <Badge variant="secondary">Type: {meta.testType}</Badge>}
            {meta.chartType && <Badge variant="info">Chart: {meta.chartType}</Badge>}
            {meta.essayType && <Badge variant="info">Essay: {meta.essayType}</Badge>}
            {meta.topicTags && <Badge variant="neutral">Tags: {meta.topicTags}</Badge>}
            {meta.start_time !== undefined && meta.end_time !== undefined && (
              <Badge variant="info">Audio Range: {meta.start_time}s - {meta.end_time}s</Badge>
            )}
            {meta.show_transcript !== undefined && (
              <Badge variant={meta.show_transcript ? "success" : "secondary"}>
                {meta.show_transcript ? "Show Transcript" : "Hide Transcript"}
              </Badge>
            )}
          </div>
          {meta.sampleAnswer && (
            <div className="mt-3 p-3 bg-white border rounded">
              <h6 className="text-success mb-2">Sample Answer:</h6>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{meta.sampleAnswer}</div>
            </div>
          )}
        </div>
      )}

      {passage.content && (!meta || passage.content !== JSON.stringify(meta)) && (
        <div className="passage-text p-3 bg-light rounded" dangerouslySetInnerHTML={{ __html: passage.content }} />
      )}
    </>
  );
};

const formatAnswer = (q) => {
  let answerDisplay = q.correct_answer;

  if (q.correct_answers && Array.isArray(q.correct_answers) && q.correct_answers.length > 0) {
    if (Array.isArray(q.options)) {
      const mapped = q.correct_answers.map(ansId => {
        const optIdx = q.options.findIndex(o => String(o.id) === String(ansId) || (o.label && String(o.label) === String(ansId)));
        if (optIdx !== -1) return String.fromCharCode(65 + optIdx);
        return ansId;
      });
      answerDisplay = mapped.join(', ');
    } else {
      answerDisplay = q.correct_answers.join(', ');
    }
  } else if (q.correct_answer) {
    if (Array.isArray(q.options)) {
      const optIdx = q.options.findIndex(o => String(o.id) === String(q.correct_answer) || (o.label && String(o.label) === String(q.correct_answer)));
      if (optIdx !== -1) {
        answerDisplay = String.fromCharCode(65 + optIdx);
      } else {
        answerDisplay = q.correct_answer;
      }
    } else {
      answerDisplay = q.correct_answer;
    }
  }

  return answerDisplay;
};

const TestPreviewModal = ({ testId, onClose }) => {
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const { data } = await fetchTestDetail(testId);
        if (mounted) setTest(data);
      } catch (err) {
        if (mounted) setError(err.message || 'Không thể tải chi tiết đề thi');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (testId) loadData();
    return () => { mounted = false; };
  }, [testId]);

  if (!testId) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3 className="admin-modal__title">Chi tiết đề thi</h3>
          <button className="admin-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        
        <div className="admin-modal__body">
          {loading && <div className="text-center py-4">Đang tải dữ liệu...</div>}
          {error && <div className="admin-error-banner"><span>⚠ {error}</span></div>}
          
          {test && (
            <div className="test-preview">
              <div className="test-preview__meta mb-4">
                <h4 className="mb-2">{test.title}</h4>
                <div className="d-flex gap-2 flex-wrap text-muted small">
                  <Badge variant={test.skill === 'reading' ? 'primary' : 'info'}>{test.skill}</Badge>
                  <Badge variant="secondary">{test.difficulty}</Badge>
                  <span>• Cấp bởi: {test.created_by_name || 'Hệ thống'}</span>
                  {test.duration_minutes && <span>• Thời gian: {test.duration_minutes} phút</span>}
                </div>
                {test.description && <p className="mt-2 mb-0 text-muted">{test.description}</p>}
              </div>

              <div className="test-preview__content">
                {test.skill === 'listening' && test.audio_url && (
                  <div className="mb-4 text-center">
                    <audio controls src={test.audio_url} className="w-100" style={{ maxWidth: '600px' }}>
                      Trình duyệt của bạn không hỗ trợ thẻ audio.
                    </audio>
                  </div>
                )}

                {test.skill === 'listening' ? (
                  test.sections && test.sections.map((section, idx) => (
                    <div key={section.id || idx} className="passage-card mb-4 p-3 border rounded bg-white">
                      <h5 className="passage-title text-primary font-weight-bold">
                        Part {section.sectionNumber || (idx + 1)}: {section.title || `Section ${idx + 1}`}
                      </h5>
                      
                      <div className="d-flex gap-2 mb-3 flex-wrap">
                        {section.startTime !== null && section.endTime !== null && (
                          <Badge variant="info">Audio Range: {section.startTime}s - {section.endTime}s</Badge>
                        )}
                        <Badge variant={section.showTranscript ? "success" : "secondary"}>
                          {section.showTranscript ? "Show Transcript" : "Hide Transcript"}
                        </Badge>
                      </div>

                      {section.transcript && (
                        <div className="transcript-box p-3 bg-light rounded mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          <h6><strong>Transcript:</strong></h6>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{section.transcript}</div>
                        </div>
                      )}

                      <div className="blocks-list mt-3">
                        {section.blocks && section.blocks.map((block, bIdx) => (
                          <div key={block.id || bIdx} className="block-card p-3 bg-light border rounded mb-3 shadow-sm">
                            <div className="mb-2 pb-1 border-bottom d-flex justify-content-between align-items-center">
                              <span className="badge bg-secondary">{block.type}</span>
                              <strong className="text-secondary small">Questions {block.range}</strong>
                            </div>
                            
                            {block.content && (
                              <div className="mb-3 block-instructions p-2 bg-white rounded border">
                                {renderBlockContent(block.content)}
                              </div>
                            )}

                            {block.questions && block.questions.length > 0 && (
                              <div className="questions-inner-list ps-2">
                                {block.questions.map((q) => (
                                  <div key={q.id} className="mb-3 p-2 bg-white border rounded">
                                    <div className="fw-bold mb-1">
                                      Question {q.questionOrder || q.question_order}
                                    </div>
                                    <p className="mb-2">{q.text || q.question_text}</p>
                                    
                                    {q.options && (
                                      <ul className="mb-2 pl-3 small">
                                        {Array.isArray(q.options) 
                                          ? q.options.map((opt, oIdx) => (
                                              <li key={opt.id || oIdx}>
                                                <strong>{String.fromCharCode(65 + oIdx)}</strong>. {typeof opt === 'object' ? opt.text : opt}
                                              </li>
                                            ))
                                          : Object.entries(q.options).map(([k, v]) => (
                                              <li key={k}>
                                                <strong>{k}</strong>. {typeof v === 'object' ? v.text : v}
                                              </li>
                                            ))
                                        }
                                      </ul>
                                    )}

                                    <div className="text-success small">
                                      <strong>Đáp án:</strong> {formatAnswer({
                                        correct_answer: q.correctAnswer || q.correct_answer,
                                        correct_answers: q.correctAnswers || q.correct_answers,
                                        options: q.options
                                      })}
                                    </div>
                                    {q.explanation && (
                                      <div className="text-muted small mt-1">
                                        <em>Giải thích:</em> {q.explanation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  test.passages && test.passages.map((passage, idx) => (
                    <div key={passage.id} className="passage-card mb-4">
                      <h5 className="passage-title">Phần {passage.passage_number}: {passage.title}</h5>
                      {renderPassage(passage)}
                    </div>
                  ))
                )}

                {test.skill !== 'listening' && (
                  <>
                    <h5 className="mt-4 mb-3 border-bottom pb-2">Danh sách câu hỏi</h5>
                    {test.questions && test.questions.length > 0 ? (
                      <div className="question-list">
                        {test.questions.map((q) => (
                          <div key={q.id} className="question-item p-3 border rounded mb-3">
                            <div className="d-flex justify-content-between mb-2">
                              <strong>Câu {q.question_order}</strong>
                              <span className="badge bg-secondary">{q.question_type}</span>
                            </div>
                            <p>{q.question_text}</p>
                            {q.options && (
                              <ul className="mb-2 pl-3">
                                {Array.isArray(q.options) 
                                  ? q.options.map((opt, idx) => (
                                      <li key={opt.id || idx}>
                                        <strong>{String.fromCharCode(65 + idx)}</strong>. {typeof opt === 'object' ? opt.text : opt}
                                      </li>
                                    ))
                                  : Object.entries(q.options).map(([k, v]) => (
                                      <li key={k}>
                                        <strong>{k}</strong>. {typeof v === 'object' ? v.text : v}
                                      </li>
                                    ))
                                }
                              </ul>
                            )}
                            <div className="text-success small">
                              <strong>Đáp án:</strong> {formatAnswer(q)}
                            </div>
                            {q.explanation && (
                              <div className="text-muted small mt-1">
                                <em>Giải thích:</em> {q.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted">Không có câu hỏi nào.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestPreviewModal;
