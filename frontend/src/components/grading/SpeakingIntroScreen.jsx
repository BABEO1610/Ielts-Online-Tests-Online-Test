import React, { useState } from 'react';

const SpeakingIntroScreen = ({ exam, onStart }) => {
  const [micStatus, setMicStatus] = useState('untested'); // untested, testing, ok, error
  const duration = exam.duration || 15;

  const testMicrophone = async () => {
    setMicStatus('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately after checking
      stream.getTracks().forEach(track => track.stop());
      setMicStatus('ok');
    } catch (err) {
      setMicStatus('error');
    }
  };

  return (
    <div className="container py-5 mt-4" style={{ maxWidth: '800px' }}>
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-dark text-white p-4 text-center">
          <h2 className="fw-bold mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
            {exam.title}
          </h2>
          <p className="mb-0 mt-2 text-light" style={{ opacity: 0.9 }}>{exam.topic || 'Speaking Practice'}</p>
        </div>
        
        <div className="card-body p-4 p-md-5">
          <h4 className="fw-bold mb-4 border-bottom pb-2">Thông tin bài thi</h4>
          
          <ul className="list-unstyled mb-5">
            <li className="d-flex align-items-center mb-3">
              <i className="bi bi-clock-history fs-4 text-primary me-3"></i>
              <span className="fs-5">Thời lượng dự kiến: <strong>{duration} phút</strong></span>
            </li>
            <li className="d-flex align-items-center mb-3">
              <i className="bi bi-mic-fill fs-4 text-primary me-3"></i>
              <div className="flex-grow-1">
                <span className="fs-5">Kiểm tra Microphone</span>
                <div className="mt-2">
                  {micStatus === 'untested' && (
                    <button className="btn btn-outline-primary btn-sm rounded-pill px-3" onClick={testMicrophone}>
                      Kiểm tra ngay
                    </button>
                  )}
                  {micStatus === 'testing' && <span className="text-muted"><span className="spinner-border spinner-border-sm me-2"></span>Đang kiểm tra...</span>}
                  {micStatus === 'ok' && <span className="text-success fw-bold"><i className="bi bi-check-circle-fill me-1"></i> Microphone hoạt động tốt</span>}
                  {micStatus === 'error' && <span className="text-danger fw-bold"><i className="bi bi-exclamation-triangle-fill me-1"></i> Không thể truy cập Microphone</span>}
                </div>
              </div>
            </li>
          </ul>

          <h4 className="fw-bold mb-3 border-bottom pb-2">Quy định phòng thi</h4>
          <div className="bg-light p-4 rounded-3 mb-5">
            <ul className="mb-0 text-dark" style={{ lineHeight: '1.8', fontSize: '15px' }}>
              <li className="mb-2"><strong>Không được ghi âm lại:</strong> Mỗi câu hỏi chỉ được trả lời 1 lần duy nhất.</li>
              <li className="mb-2"><strong>Không được quay lại:</strong> Hệ thống sẽ tự động chuyển sang câu tiếp theo. Bạn không thể xem lại câu trước.</li>
              <li className="mb-2"><strong>Tự động lưu:</strong> Bài làm của bạn sẽ được tự động ghi âm và lưu lại sau mỗi câu.</li>
              <li className="mb-0"><strong>Thời gian chuẩn:</strong> Part 1 & 3 tối đa 45-90 giây/câu. Part 2 có 1 phút chuẩn bị và 2 phút nói.</li>
            </ul>
          </div>

          <div className="text-center mt-5">
            <button 
              className="btn btn-dark rounded-pill px-5 py-3 fs-5 fw-bold w-100 shadow"
              style={{ maxWidth: '400px' }}
              onClick={onStart}
              disabled={micStatus === 'error'}
            >
              Bắt đầu bài Speaking
            </button>
            {micStatus === 'error' && (
              <p className="text-danger mt-2 small">Vui lòng cấp quyền Microphone trước khi bắt đầu.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakingIntroScreen;
