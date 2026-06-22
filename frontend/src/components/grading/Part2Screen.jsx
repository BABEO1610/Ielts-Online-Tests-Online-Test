import React, { useState, useEffect } from 'react';
import ExamRecorder from './ExamRecorder';

const Part2Screen = ({ part, onComplete }) => {
  const [phase, setPhase] = useState('prep'); // 'prep' | 'speak'
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);

  useEffect(() => {
    if (phase === 'prep') {
      const timer = setInterval(() => {
        setPrepTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPhase('speak');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);

  const examinerImage = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop';
  const [partPrefix, partTitle] = part.partName ? part.partName.split(':') : ['Part 2', ''];

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="container-fluid px-3 px-md-5 mt-4 d-flex flex-column" style={{ maxWidth: '1000px', flex: 1 }}>
      <div className="text-center mb-4">
        <h2 className="fw-bold text-dark text-uppercase" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px', letterSpacing: 1 }}>
          {partPrefix}: <span style={{ color: '#5e5e5e' }}>{partTitle?.trim() || 'Topic'}</span>
        </h2>
      </div>

      <div className="row g-4 mb-4 flex-grow-1">
        {/* Left: Examiner Image & Timer */}
        <div className="col-md-5 col-lg-6 d-flex flex-column align-items-center justify-content-center">
          <div className="rounded-4 overflow-hidden w-100 position-relative mb-3" style={{ backgroundColor: '#000', aspectRatio: '16/9' }}>
            <img src={examinerImage} alt="Examiner" className="img-fluid w-100 h-100" style={{ objectFit: 'cover', opacity: 0.9 }} />
            <div className="position-absolute bottom-0 start-0 p-3 w-100" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
              <span className="badge bg-danger">IELTS Examiner</span>
            </div>
          </div>
          
          <div className="text-center w-100 p-4 p-md-5 rounded-4 bg-white shadow-sm" style={{ border: '1px solid #eaeaea' }}>
            {phase === 'prep' ? (
              <>
                <p className="fw-bold text-uppercase text-muted mb-3" style={{ fontSize: '13px', letterSpacing: '1px' }}>Preparation Time</p>
                <div className="display-3 fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif', letterSpacing: '-1px' }}>{formatTime(prepTimeLeft)}</div>
                <p className="text-muted mb-4" style={{ fontSize: '15px' }}>Bạn có 1 phút để chuẩn bị. Hãy note lại các ý chính.</p>
                <button className="btn btn-dark rounded-pill px-5 py-2 fw-medium shadow-sm transition-all hover-lift" onClick={() => setPhase('speak')}>
                  Bỏ qua chuẩn bị
                </button>
              </>
            ) : (
              <>
                <p className="fw-bold text-uppercase text-danger mb-4" style={{ fontSize: '13px', letterSpacing: '1px' }}>Speaking Time</p>
                <ExamRecorder 
                  maxDuration={120} 
                  onUploadComplete={onComplete}
                />
              </>
            )}
          </div>
        </div>

        {/* Right: Prompt */}
        <div className="col-md-7 col-lg-6 d-flex flex-column">
          <div className="p-4 p-md-5 rounded-4 h-100 d-flex flex-column bg-white shadow-sm" style={{ border: '1px solid #eaeaea' }}>
            <div className="d-flex align-items-center mb-4">
               <div style={{ width: '4px', height: '24px', backgroundColor: '#000', marginRight: '12px', borderRadius: '2px' }}></div>
               <p className="fw-bold mb-0 text-dark" style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
                 CUE CARD
               </p>
            </div>
            
            <div className="prompt-content mb-4 flex-grow-1" style={{ fontSize: '20px', fontFamily: 'UberMoveText, system-ui, sans-serif', fontWeight: 500, whiteSpace: 'pre-line', lineHeight: '1.8', color: '#000' }}>
              {part.prompt}
            </div>
            
            <div className="p-4 rounded-4 mt-auto" style={{ backgroundColor: '#f8f9fa', border: '1px solid #f0f0f0' }}>
              <div className="d-flex align-items-start gap-3">
                <span className="fs-5">💡</span>
                <p className="mb-0 text-muted" style={{ fontSize: '14.5px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                  {part.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Part2Screen;
