import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentNavbar from '../../components/layout/StudentNavbar';
import ModeSelector from '../../components/objective-testing/ModeSelector';
import { testService } from '../../services/test.service';

const DIFFICULTY_STYLE = {
  'Dễ': { bg: '#efefef', color: '#5e5e5e' },
  'Trung bình': { bg: '#000', color: '#fff' },
  'Khó': { bg: '#282828', color: '#afafaf' },
  easy: { bg: '#efefef', color: '#5e5e5e' },
  intermediate: { bg: '#000', color: '#fff' },
  advanced: { bg: '#282828', color: '#afafaf' }
};

const DIFFICULTY_LABEL = {
  'Dễ': 'Dễ',
  'Trung bình': 'Trung bình',
  'Khó': 'Khó',
  easy: 'Dễ',
  intermediate: 'Trung bình',
  advanced: 'Khó'
};

const formatDuration = (exam) => exam.duration || exam.duration_minutes || '–';

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

const SpeakingPartList = ({ exam, onStartExam, onBack }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showModeModal, setShowModeModal] = useState(false);

  const handleStartClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để bắt đầu làm bài' } });
      return;
    }
    setShowModeModal(true);
  };

  const handleModeSelect = (modeConfig) => {
    setShowModeModal(false);
    onStartExam(modeConfig);
  };

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        <div className="d-flex align-items-center gap-3 mb-2">
          <button
            className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
            style={{ backgroundColor: '#efefef', fontSize: '14px' }}
            onClick={onBack}
          >
            ← Tất cả đề thi
          </button>
        </div>

        <div className="mb-5 mt-3">
          <h1 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '40px' }}>
            {exam.title}
          </h1>
          <div className="d-flex justify-content-between align-items-center mb-0 mt-4 flex-wrap gap-3">
            <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
              Gồm {exam.parts.length} phần · Hoàn thành toàn bộ để nhận điểm chấm
            </p>
            <button className="btn btn-dark rounded-pill px-5 py-3 fw-bold" style={{ fontSize: '16px' }} onClick={handleStartClick}>
              Bắt đầu làm bài thi
            </button>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          {exam.parts.map((part, idx) => (
            <div
              key={idx}
              className="d-flex align-items-center justify-content-between p-4 rounded-4 bg-white"
              style={{ border: '1px solid #e2e2e2' }}
            >
              <div className="d-flex align-items-center gap-4">
                <div
                  className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{ width: '56px', height: '56px', borderRadius: '999px', backgroundColor: '#000', color: '#fff', fontSize: '20px', fontFamily: 'UberMove, system-ui, sans-serif' }}
                >
                  {idx + 1}
                </div>
                <div>
                  <h4 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px' }}>
                    {part.partName}
                  </h4>
                  <div className="d-flex gap-2 flex-wrap">
                    <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>⏱ {part.duration}</span>
                    <span className="text-muted" style={{ fontSize: '14px' }}>·</span>
                    <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>🗣 {part.description}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <ModeSelector
          show={showModeModal}
          onHide={() => setShowModeModal(false)}
          onSelectMode={handleModeSelect}
          examType="Speaking"
          fullDuration={exam.duration}
        />
      </main>
    </div>
  );
};

const SpeakingPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const res = await testService.getTests('speaking');
        if (res.success && Array.isArray(res.data)) {
          setExams(res.data);
        } else {
          setError(res.error?.message || 'Không thể tải danh sách đề thi.');
        }
      } catch (err) {
        setError('Lỗi kết nối đến server.');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const handleViewExam = async (exam) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Vui lòng đăng nhập để xem chi tiết đề thi' } });
      return;
    }

    setError(null);
    try {
      setLoading(true);
      const res = await testService.getTestById(exam.id);
      if (res.success && res.data) {
        const fullExam = res.data;
        const parts = buildSpeakingParts(fullExam.passages || []);
        setSelectedExam({
          ...exam,
          ...fullExam,
          parts,
          topic: fullExam.topic || exam.topic || 'Tổng hợp',
          questions: parts.reduce((sum, part) => sum + (part.questions?.length || 0), 0)
        });
      } else {
        setError(res.error?.message || 'Không thể tải chi tiết đề thi.');
      }
    } catch (err) {
      setError('Không thể tải chi tiết đề thi.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (modeConfig) => {
    navigate(`/tests/${selectedExam.id}/speaking`, { 
      state: { 
        exam: selectedExam, 
        practiceMode: modeConfig.isPractice,
        selectedPartIds: modeConfig.selectedPartIds,
        customTimeLimit: modeConfig.customTimeLimit
      } 
    });
  };

  if (selectedExam) {
    return <SpeakingPartList exam={selectedExam} onStartExam={handleStartExam} onBack={() => setSelectedExam(null)} />;
  }

  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>
        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Speaking
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Chọn đề thi để luyện nói. Chấm điểm chi tiết độ trôi chảy và phát âm bằng AI.
          </p>
        </div>

        <div className="row g-4">
          {loading && Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="col-md-6">
              <div className="p-4 rounded-4 h-100" style={{ border: '1px solid #e2e2e2', minHeight: '260px', backgroundColor: '#f8f8f8' }} />
            </div>
          ))}
          {!loading && error && (
            <div className="col-12">
              <div className="alert rounded-4" style={{ backgroundColor: '#fdf2f2', color: '#c0392b', border: 'none' }}>
                {error}
              </div>
            </div>
          )}
          {!loading && !error && exams.length === 0 && (
            <div className="col-12 text-center py-5">
              <p style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', color: '#5e5e5e' }}>
                Chưa có đề Speaking nào. Vui lòng quay lại sau.
              </p>
            </div>
          )}
          {!loading && !error && exams.map((exam) => {
            const diff = DIFFICULTY_STYLE[exam.difficulty] || DIFFICULTY_STYLE['intermediate'];
            const label = DIFFICULTY_LABEL[exam.difficulty] || exam.difficulty || 'Trung bình';
            const metaLabel = exam.parts ? `${exam.parts.length} phần` : `${exam.questions || 0} câu`;
            return (
              <div key={exam.id} className="col-md-6">
                <div
                  className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                  style={{ border: '1px solid #e2e2e2', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px 0px'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  onClick={() => handleViewExam(exam)}
                >
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span
                        className="rounded-pill px-3 py-1 fw-medium"
                        style={{ backgroundColor: diff.bg, color: diff.color, fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}
                      >
                        {label}
                      </span>
                      <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>
                        {metaLabel} · {formatDuration(exam)} phút
                      </span>
                    </div>
                    <h3 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                      {exam.title}
                    </h3>
                    <p className="fw-medium mb-3" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', color: '#5e5e5e' }}>
                      Chủ đề: {exam.topic || 'Tổng hợp'}
                    </p>
                    <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                      {exam.description || `Đề thi luyện tập Speaking mô phỏng format IELTS thực tế.`}
                    </p>
                  </div>
                  <button
                    className="btn btn-dark rounded-pill px-4 py-2 fw-medium align-self-start"
                    style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}
                    onClick={(e) => { e.stopPropagation(); handleViewExam(exam); }}
                  >
                    Xem đề →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default SpeakingPage;
