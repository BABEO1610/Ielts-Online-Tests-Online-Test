import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import TimerBar from '../../components/objective-testing/TimerBar';
import SpeakingIntroScreen from '../../components/grading/SpeakingIntroScreen';
import Part2Screen from '../../components/grading/Part2Screen';
import SpeakingSummaryScreen from '../../components/grading/SpeakingSummaryScreen';
import SpeakingProgressBar from '../../components/grading/SpeakingProgressBar';
import ExamRecorder from '../../components/grading/ExamRecorder';
import FeedbackReport from '../../components/grading/FeedbackReport';
import { testService } from '../../services/test.service';
import gradingService from '../../services/grading.service';

const PART1_PER_Q = 40;  // 40s/câu → ~4 phút cho 6 câu (chuẩn IELTS Part 1)
const PART3_PER_Q = 60;  // 60s/câu → ~4 phút cho 4 câu (chuẩn IELTS Part 3)

const Part13Screen = ({ part, phase, onComplete }) => {
  const perQ = phase === 'part1' ? PART1_PER_Q : PART3_PER_Q;
  const questions = part.questions || [];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(perQ);
  const recorderRef = useRef(null);

  // Dùng ref để tránh stale closure khi đọc index bên trong timer
  const currentIndexRef = useRef(0);
  const questionsLenRef = useRef(questions.length);
  useEffect(() => { currentIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => { questionsLenRef.current = questions.length; }, [questions.length]);

  // Timer chỉ đơn giản đếm ngược và set về 0
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex]); // reset timer khi đổi câu

  // Effect riêng: phản ứng khi timeLeft = 0 (chuyển câu hoặc dừng Part)
  useEffect(() => {
    if (timeLeft !== 0) return;
    const idx = currentIndexRef.current;
    const len = questionsLenRef.current;
    if (idx + 1 < len) {
      setCurrentQuestionIndex(idx + 1);
      setTimeLeft(perQ);
    } else {
      recorderRef.current?.stopRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const examinerImage = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop';
  const [partPrefix, partTitle] = part.partName ? part.partName.split(':') : [phase, ''];

  return (
    <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '1000px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="text-center mb-4">
        <h2 className="fw-bold text-dark text-uppercase" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px', letterSpacing: 1 }}>
          {partPrefix}: <span style={{ color: '#5e5e5e' }}>{partTitle?.trim() || 'Topic'}</span>
        </h2>
      </div>

      <div className="row g-4 mb-4 flex-grow-1">
        <div className="col-md-5 col-lg-6 d-flex flex-column align-items-center justify-content-center">
          <div className="rounded-4 overflow-hidden w-100 position-relative mb-4" style={{ backgroundColor: '#000', aspectRatio: '16/9' }}>
            <img src={examinerImage} alt="Examiner" className="img-fluid w-100 h-100" style={{ objectFit: 'cover', opacity: 0.9 }} />
            <div className="position-absolute bottom-0 start-0 p-3 w-100" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
              <span className="badge bg-danger">IELTS Examiner</span>
            </div>
          </div>
          
          <div className="w-100 bg-white p-4 p-md-5 rounded-4 shadow-sm text-center" style={{ border: '1px solid #eaeaea' }}>
            <p className="fw-bold text-uppercase text-danger mb-4" style={{ fontSize: '13px', letterSpacing: '1px' }}>Recording</p>
            <ExamRecorder 
              ref={recorderRef}
              maxDuration={questions.length * perQ + 30}
              hideTimer
              hideStopButton
              onUploadComplete={(tempKey, dur) => onComplete(tempKey, dur)}
            />
          </div>
        </div>

        <div className="col-md-7 col-lg-6 d-flex flex-column">
          <div className="p-4 p-md-5 rounded-4 h-100 d-flex flex-column bg-white shadow-sm" style={{ border: '1px solid #eaeaea' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center">
                 <div style={{ width: '4px', height: '24px', backgroundColor: '#000', marginRight: '12px', borderRadius: '2px' }}></div>
                 <p className="fw-bold mb-0 text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
                   CÂU HỎI {currentQuestionIndex + 1} / {questions.length || 1}
                 </p>
              </div>
              <span className="badge bg-dark rounded-pill px-3 py-2" style={{ letterSpacing: '0.5px' }}>
                Còn lại {timeLeft}s
              </span>
            </div>
            
            <div className="prompt-content mb-4 flex-grow-1 d-flex flex-column align-items-center justify-content-center" style={{ fontSize: '24px', fontFamily: 'UberMoveText, system-ui, sans-serif', fontWeight: 500, lineHeight: '1.6', textAlign: 'center', color: '#000' }}>
              <div>{questions[currentQuestionIndex] ? questions[currentQuestionIndex].text : part.prompt}</div>
              {currentQuestionIndex < questions.length && (
                <button className="btn btn-outline-dark mt-5 rounded-pill px-5 py-2 fw-medium shadow-sm transition-all hover-lift" onClick={() => setTimeLeft(1)}>
                  Hoàn thành sớm
                </button>
              )}
            </div>
            
            <div className="p-4 rounded-4 mt-auto" style={{ backgroundColor: '#f8f9fa', border: '1px solid #f0f0f0' }}>
              <div className="d-flex align-items-start gap-3">
                <span className="fs-5">💡</span>
                <p className="mb-0 text-muted" style={{ fontSize: '14.5px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                  Chuyển câu hỏi sẽ không dừng ghi âm. Bấm "Hoàn thành sớm" nếu bạn đã trả lời xong.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

/**
 * Màn hình thi Speaking (State Machine)
 */
const SpeakingTestScreen = ({ exam, practiceMode, customTimeLimit }) => {
  const navigate = useNavigate();
  // State: 'intro' | 'part1' | 'part2' | 'part3' | 'summary' | 'result'
  const [phase, setPhase] = useState('intro');
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // [{ part_number, question_index, temp_s3_key }]
  const [globalError, setGlobalError] = useState(null);

  const durationMinutes = exam.duration || 15;

  // ===== Handlers =====

  const handleStart = () => {
    setPhase('part1');
  };

  const saveAnswerAndAdvance = (partNumber, tempS3Key, durationSeconds) => {
    setAnswers(prev => [...prev, { part_number: partNumber, temp_s3_key: tempS3Key }]);
    
    if (partNumber === 1) {
      setPhase('part2');
    } else if (partNumber === 2) {
      setPhase('part3');
    } else if (partNumber === 3) {
      setPhase('summary');
    }
  };

  const handleFinalSubmit = async (grader) => {
    try {
      // Gọi submit cho từng file đã lưu (3 parts)
      for (const ans of answers) {
        await gradingService.submitSpeaking({
          test_id: exam.id.toString(),
          part_number: ans.part_number,
          temp_s3_key: ans.temp_s3_key,
          grader
        });
      }
      setPhase('result');
    } catch (err) {
      alert('Nộp bài thất bại. Vui lòng thử lại.');
    }
  };

  const handleTimeUp = () => {
    // Nếu hết giờ tổng -> Force nhảy sang màn hình summary
    if (phase !== 'intro' && phase !== 'summary' && phase !== 'result') {
      alert('Hết giờ làm bài. Hệ thống sẽ tự động nộp bài.');
      setPhase('summary');
    }
  };

  // ===== Renders =====

  if (globalError) {
    return (
      <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h4 className="text-danger mb-3">{globalError}</h4>
          <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate('/speaking')}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return <SpeakingIntroScreen exam={exam} onStart={handleStart} />;
  }

  if (phase === 'result') {
    return (
      <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center px-4" style={{ maxWidth: '560px', width: '100%' }}>
          {/* Icon vòng tròn chuyên nghiệp */}
          <div
            className="mx-auto mb-5 d-flex align-items-center justify-content-center rounded-circle"
            style={{ width: '88px', height: '88px', backgroundColor: '#000', flexShrink: 0 }}
          >
            <i className="bi bi-check-lg text-white" style={{ fontSize: '40px', lineHeight: 1 }}></i>
          </div>

          <h2 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '36px', letterSpacing: '-0.5px' }}>
            Bài đã được nộp
          </h2>
          <p className="mb-2" style={{ fontSize: '17px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#3d3d3d' }}>
            Bài Speaking của bạn đã được gửi thành công.
          </p>
          <p className="mb-5" style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#767676' }}>
            Kết quả sẽ hiển thị trong lịch sử bài làm sau khi giáo viên hoặc AI hoàn tất chấm điểm.
          </p>

          {/* Divider mỏng */}
          <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e2e2', marginBottom: '28px' }}></div>

          <button
            className="btn btn-dark rounded-pill px-5 py-3 fw-semibold"
            style={{ fontSize: '15px', fontFamily: 'UberMoveText, system-ui, sans-serif', letterSpacing: '0.1px' }}
            onClick={() => navigate('/speaking')}
          >
            Trở về danh sách đề
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div className="bg-white min-vh-100 d-flex flex-column" style={{ overflowX: 'hidden' }}>
      <TimerBar durationMinutes={durationMinutes} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} hideActions practiceMode={practiceMode} />
        <SpeakingSummaryScreen exam={exam} answers={answers} onSubmit={handleFinalSubmit} />
      </div>
    );
  }

  // --- Render Part 1, 2, 3 ---
  
  const examinerImage = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop';
  const currentPartIndex = phase === 'part1' ? 0 : phase === 'part2' ? 1 : 2;
  const activePart = exam.parts[currentPartIndex];

  return (
    <div className="bg-white min-vh-100 d-flex flex-column" style={{ overflowX: 'hidden' }}>
      <TimerBar durationMinutes={durationMinutes} customTimeLimit={customTimeLimit} onTimeUp={handleTimeUp} hideActions practiceMode={practiceMode} />
      
      <div style={{ flex: 1, paddingBottom: '80px', display: 'flex', flexDirection: 'column' }}>
        {phase === 'part2' ? (
          <Part2Screen 
            part={activePart} 
            onComplete={(tempKey, dur) => saveAnswerAndAdvance(2, tempKey, dur)} 
          />
        ) : (
          <Part13Screen
            part={activePart}
            phase={phase}
            onComplete={(tempKey, dur) => saveAnswerAndAdvance(currentPartIndex + 1, tempKey, dur)}
          />
        )}
      </div>

      <SpeakingProgressBar exam={exam} currentPartIndex={currentPartIndex} />
    </div>
  );
};

const parseSpeakingQuestions = (content) => {
  if (!content) return [];
  if (Array.isArray(content)) {
    return content.map((item, idx) => (
      typeof item === 'string' ? { id: `q${idx + 1}`, text: item } : item
    ));
  }

  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((text, idx) => ({ id: `q${idx + 1}`, text }));
};

const buildSpeakingParts = (passages = []) => passages.map((passage, idx) => {
  if (idx === 0) {
    return {
      partName: passage.title || 'Part 1: Introduction and Interview',
      description: passage.instruction || 'Answer questions about yourself and familiar topics.',
      questions: parseSpeakingQuestions(passage.content),
      duration: '4-5 phút'
    };
  }
  if (idx === 1) {
    return {
      partName: passage.title || 'Part 2: Long Turn',
      description: passage.instruction || 'Cue card bullet points',
      prompt: passage.title && passage.title !== 'Speaking Part 2' ? passage.title : passage.content || '',
      bulletPoints: passage.content || '',
      preparationTime: 60,
      speakingTime: 120,
      duration: '3-4 phút'
    };
  }
  if (idx === 2) {
    return {
      partName: passage.title || 'Part 3: Discussion',
      description: passage.instruction || 'Follow-up discussion',
      questions: parseSpeakingQuestions(passage.content),
      duration: '4-5 phút'
    };
  }
  return {
    partName: passage.title || `Part ${idx + 1}`,
    description: passage.instruction || '',
    prompt: passage.content || '',
    questions: parseSpeakingQuestions(passage.content),
    duration: '4-5 phút'
  };
});

export default function SpeakingTestPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const practiceMode = location.state?.practiceMode || false;
  const customTimeLimit = location.state?.customTimeLimit || null;
  const initialExam = location.state?.exam || null;
  const [exam, setExam] = useState(initialExam);
  const [loading, setLoading] = useState(!initialExam);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadExam = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await testService.getTestById(id);
        if (res.success && res.data) {
          const fullExam = res.data;
          const parts = buildSpeakingParts(fullExam.passages || []);
          setExam({
            ...fullExam,
            parts,
            topic: fullExam.topic || fullExam.title || 'Tổng hợp',
          });
        } else {
          setError(res.error?.message || 'Không thể tải đề thi Speaking.');
        }
      } catch (err) {
        setError('Không thể tải đề thi Speaking.');
      } finally {
        setLoading(false);
      }
    };

    if (!initialExam || initialExam.id.toString() !== id) {
      loadExam();
    }
  }, [id, initialExam]);

  if (loading) {
    return (
      <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-dark" role="status" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3">Đang tải đề thi Speaking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h3 className="fw-bold mb-3 text-danger">{error}</h3>
          <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate('/speaking')}>Quay lại</button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h3 className="fw-bold mb-3">Không tìm thấy đề thi</h3>
          <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate('/speaking')}>Quay lại</button>
        </div>
      </div>
    );
  }

  return <SpeakingTestScreen exam={exam} practiceMode={practiceMode} customTimeLimit={customTimeLimit} />;
}
