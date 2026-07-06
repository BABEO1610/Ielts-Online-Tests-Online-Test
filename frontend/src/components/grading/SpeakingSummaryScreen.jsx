import React, { useState, useEffect } from 'react';

const SpeakingSummaryScreen = ({ exam, answers, onSubmit }) => {
  const [grader, setGrader] = useState('tutor');
  const [autoSubmitTime, setAutoSubmitTime] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSubmitting) return;
    const timer = setInterval(() => {
      setAutoSubmitTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitting, grader]);

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    onSubmit(grader);
  };

  return (
    <div className="container py-5 mt-4" style={{ maxWidth: '800px' }}>
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-success text-white p-4 text-center">
          <i className="bi bi-check-circle-fill display-4 mb-3 d-block"></i>
          <h2 className="fw-bold mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            Đã hoàn thành bài ghi âm
          </h2>
        </div>
        
        <div className="card-body p-4 p-md-5">
          <p className="text-center text-muted mb-4 fs-5">
            Bài làm của bạn đã được ghi âm và lưu trữ thành công.
          </p>

          <div className="bg-light rounded-4 p-4 mb-5">
            <h5 className="fw-bold mb-3 border-bottom pb-2">Trạng thái bài làm</h5>
            <ul className="list-unstyled mb-0">
              {exam.parts.map((part, idx) => {
                const isPartDone = answers.some(a => a.part_number === idx + 1);
                return (
                  <li key={idx} className="d-flex align-items-center mb-2 fs-5">
                    {isPartDone ? (
                      <><i className="bi bi-check-circle-fill text-success me-3"></i> Part {idx + 1}: Đã hoàn thành</>
                    ) : (
                      <><i className="bi bi-x-circle-fill text-danger me-3"></i> Part {idx + 1}: Bỏ qua / Trống</>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <h5 className="fw-bold mb-3 border-bottom pb-2">Tùy chọn nộp bài</h5>
          <div className="d-flex flex-column gap-3 mb-4">
            <label className={`form-check-label border p-3 rounded-3 d-flex align-items-center cursor-pointer ${grader === 'tutor' ? 'border-primary bg-primary bg-opacity-10' : ''}`} style={{ cursor: 'pointer' }}>
              <input 
                className="form-check-input me-3 fs-5 mt-0" 
                type="radio" 
                name="graderOption" 
                value="tutor"
                checked={grader === 'tutor'}
                onChange={() => setGrader('tutor')}
                disabled={isSubmitting}
              />
              <div>
                <div className="fw-bold fs-5">Giáo viên chấm điểm (Tutor)</div>
                <div className="text-muted small">Nhận feedback chi tiết bằng audio và text từ giáo viên IELTS.</div>
              </div>
            </label>

            <label className={`form-check-label border p-3 rounded-3 d-flex align-items-center cursor-pointer ${grader === 'ai' ? 'border-primary bg-primary bg-opacity-10' : ''}`} style={{ cursor: 'pointer' }}>
              <input 
                className="form-check-input me-3 fs-5 mt-0" 
                type="radio" 
                name="graderOption" 
                value="ai"
                checked={grader === 'ai'}
                onChange={() => setGrader('ai')}
                disabled={isSubmitting}
              />
              <div>
                <div className="fw-bold fs-5">
                  AI Chấm điểm 
                </div>
                <div className="text-muted small">Nhận kết quả và phân tích ngay lập tức.</div>
              </div>
            </label>
          </div>

          <div className="text-center mt-5">
            <p className="text-danger fw-bold mb-3">
              Tự động nộp bài sau {autoSubmitTime} giây...
            </p>
            <button 
              className="btn btn-primary rounded-pill px-5 py-3 fs-5 fw-bold w-100 shadow"
              style={{ maxWidth: '400px' }}
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Đang nộp bài...</>
              ) : 'Nộp bài Speaking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakingSummaryScreen;
