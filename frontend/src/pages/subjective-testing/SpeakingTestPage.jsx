import React, { useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import StudentNavbar from '../../components/layout/StudentNavbar';
import AudioRecorder from '../../components/grading/AudioRecorder';
import FeedbackReport from '../../components/grading/FeedbackReport';
import TimerBar from '../../components/objective-testing/TimerBar';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import { MOCK_EXAMS } from './SpeakingPage';

/**
 * SpeakingTestScreen — Component màn hình thu âm thi Speaking
 */
const SpeakingTestScreen = ({ exam, onBack, onSubmitSuccess, practiceMode, customTimeLimit }) => {
  const recorderRefs = useRef([]);
  const [showAutoSubmit, setShowAutoSubmit] = useState(false);
  const [activePartIndex, setActivePartIndex] = useState(0);

  const totalDurationSeconds = exam.parts.reduce((total, p) => total + (parseInt(p.duration) || 0), 0);
  const durationMinutes = Math.ceil(totalDurationSeconds / 60);

  const handleTimeUp = useCallback(() => {
    setShowAutoSubmit(true);
    recorderRefs.current.forEach(ref => {
      if (ref && ref.stopRecording) ref.stopRecording();
    });
  }, []);

  const handleSubmitEarly = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn kết thúc bài thi? (Hệ thống sẽ nộp toàn bộ 3 phần)')) {
      setShowAutoSubmit(true);
      recorderRefs.current.forEach(ref => {
        if (ref && ref.stopRecording) ref.stopRecording();
      });
    }
  }, []);

  const handleSuccess = (res) => {
    setShowAutoSubmit(false);
    if (onSubmitSuccess) onSubmitSuccess(res);
  };

  const activePart = exam.parts[activePartIndex];
  const examinerImage = "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop";

  return (
    <div className="bg-white min-vh-100 d-flex flex-column" style={{ overflowX: 'hidden' }}>
      <TimerBar durationMinutes={durationMinutes} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} onSubmitEarly={handleSubmitEarly} practiceMode={practiceMode} />
      
      <div style={{ flex: 1, paddingBottom: '80px', display: 'flex', flexDirection: 'column' }}>
        <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '1000px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
            <p className="mb-0 text-muted text-uppercase fw-bold" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif', letterSpacing: 1 }}>
              {exam.title} · {exam.topic}
            </p>
          </div>

          <div className="text-center mb-4">
             <h2 className="fw-bold text-dark text-uppercase" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px', letterSpacing: 1 }}>
               PART {activePart.part_number}: <span style={{ color: '#5e5e5e' }}>{activePart.title.split('—')[1]?.trim() || 'Topic'}</span>
             </h2>
          </div>

          {/* Content Layout */}
          <div className="row g-4 mb-4 flex-grow-1">
            {/* Left: Examiner Image */}
            <div className="col-md-5 col-lg-6 d-flex align-items-center justify-content-center">
              <div className="rounded-4 overflow-hidden w-100 position-relative" style={{ backgroundColor: '#000', aspectRatio: '16/9' }}>
                 <img src={examinerImage} alt="Examiner" className="img-fluid w-100 h-100" style={{ objectFit: 'cover', opacity: 0.9 }} />
                 <div className="position-absolute bottom-0 start-0 p-3 w-100" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                   <span className="badge bg-danger">IELTS Examiner</span>
                 </div>
              </div>
            </div>

            {/* Right: Prompt & Questions */}
            <div className="col-md-7 col-lg-6 d-flex flex-column">
              <div className="p-4 rounded-4 h-100 d-flex flex-column" style={{ backgroundColor: '#efefef' }}>
                <div className="d-flex gap-3 mb-3 flex-wrap">
                  <span className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#000', color: '#fff', fontSize: '13px' }}>
                    ⏱ Tối đa {Math.floor(activePart.duration / 60)} phút
                  </span>
                </div>
                <p className="fw-bold mb-3 text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  CÂU HỎI
                </p>
                <ul className="mb-4 ps-3">
                  {activePart.questions.map((q, i) => (
                    <li key={i} className="mb-2 text-dark" style={{ fontSize: '16px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.8', listStyle: q.startsWith('—') || q.startsWith('  ') ? 'none' : 'disc' }}>
                      {q}
                    </li>
                  ))}
                </ul>
                <div className="p-3 rounded-3 mt-auto" style={{ backgroundColor: '#e2e2e2', borderLeft: '3px solid #000' }}>
                  <p className="mb-0 fw-medium text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    💡 {activePart.tip}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Recorders */}
          <div className="d-flex justify-content-center mt-3">
            {exam.parts.map((part, idx) => (
               <div key={part.id} style={{ display: idx === activePartIndex ? 'block' : 'none', width: '100%' }}>
                 <AudioRecorder
                    ref={el => recorderRefs.current[idx] = el}
                    testId={part.id}
                    partNumber={part.part_number}
                    maxDuration={customTimeLimit ? customTimeLimit * 60 : part.duration}
                    practiceMode={practiceMode}
                    onSubmitSuccess={handleSuccess}
                 />
               </div>
            ))}
          </div>
          
          <AutoSubmitModal isOpen={showAutoSubmit} />
        </main>
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-bar">
        <div className="bottom-nav-tabs justify-content-center">
          {exam.parts.map((part, idx) => {
            const isActive = activePartIndex === idx;
            return (
              <div 
                key={part.id}
                className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
                style={{ minWidth: '150px', justifyContent: 'center' }}
                onClick={() => setActivePartIndex(idx)}
              >
                <span className="fw-bold">Part {part.part_number}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * SpeakingTestPage — Route-driven wrapper cho màn hình thi Speaking (/tests/:id/speaking)
 */
function SpeakingTestPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const practiceMode = location.state?.practiceMode || false;
  const customTimeLimit = location.state?.customTimeLimit || null;

  const exam = MOCK_EXAMS.find(e => e.id === id);
  const [submittedId, setSubmittedId] = useState(null);

  const handleSubmitSuccess = (response) => {
    const sid = response?.data?.submission_id || 'mock-speak-demo';
    setSubmittedId(sid);
  };

  if (!exam) {
    return (
      <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h3 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, sans-serif' }}>Không tìm thấy đề thi</h3>
          <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate('/speaking')}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // Kết quả chấm (Level 3.1)
  if (submittedId) {
    return (
      <div className="bg-white min-vh-100 pb-5">
        <StudentNavbar />
        <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '900px' }}>
          <div className="d-flex align-items-center gap-3 mb-4">
            <button
              className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
              style={{ backgroundColor: '#efefef' }}
              onClick={() => navigate('/speaking')}
            >
              ← Trở về danh sách đề
            </button>
            <h2 className="fw-bold mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>
              Kết quả chấm điểm
            </h2>
          </div>
          <FeedbackReport submissionId={submittedId} type="speaking" />
        </main>
      </div>
    );
  }

  return (
    <SpeakingTestScreen
      exam={exam}
      practiceMode={practiceMode}
      customTimeLimit={customTimeLimit}
      onBack={() => navigate('/speaking')}
      onSubmitSuccess={handleSubmitSuccess}
    />
  );
}

export default SpeakingTestPage;
