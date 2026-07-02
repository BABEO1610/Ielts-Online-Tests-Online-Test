import { useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StudentNavbar from '../../components/layout/StudentNavbar';
import WritingEditor from '../../components/grading/WritingEditor';
import FeedbackReport from '../../components/grading/FeedbackReport';
import TimerBar from '../../components/objective-testing/TimerBar';
import AutoSubmitModal from '../../components/objective-testing/AutoSubmitModal';
import gradingService from '../../services/grading.service';

const getErrorMessage = (error) =>
  error.response?.data?.error?.message
  || error.message
  || 'Đã xảy ra lỗi khi nộp bài.';

const collectWritingTasks = (refs) => {
  const tasksData = refs
    .filter(ref => ref?.getTaskData)
    .map(ref => ref.getTaskData());

  if (tasksData.length === 0) {
    throw new Error('Không có dữ liệu bài làm.');
  }

  const graders = [...new Set(tasksData.map(task => task.grader || 'tutor'))];
  if (graders.length > 1) {
    throw new Error('Vui lòng chọn cùng một hình thức chấm cho cả bài Writing.');
  }

  return { tasksData, selectedGrader: graders[0] };
};

const requestAiForSubmittedTasks = async (response) => {
  const tasks = response?.data?.tasks || [];
  const gradingRequests = tasks
    .filter(task => task?.id)
    .map(task => gradingService.requestAiGrading(task.id));
  const results = await Promise.allSettled(gradingRequests);
  const failed = results.find(result => result.status === 'rejected');
  if (failed) {
    throw failed.reason;
  }
};

/**
 * WritingTestScreen — Component màn hình làm bài
 */
const WritingTestScreen = ({ exam, onSubmitSuccess, practiceMode, customTimeLimit }) => {
  const editorRefs = useRef([]);
  const [showAutoSubmit, setShowAutoSubmit] = useState(false);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  // Tính tổng thời gian của cả 2 task (thường là 60 phút)
  const durationMinutes = exam.tasks.reduce((total, task) => total + (parseInt(task.duration) || 0), 0);

  const submitAllTasks = useCallback(async () => {
    setShowAutoSubmit(true);
    try {
      const { tasksData, selectedGrader } = collectWritingTasks(
        editorRefs.current
      );

      const payload = {
        test_id: exam.id,
        grader: selectedGrader,
        tasks: tasksData
      };

      const response = await gradingService.submitFullWriting(payload);
      if (selectedGrader === 'ai') {
        try {
          await requestAiForSubmittedTasks(response);
        } catch (aiError) {
          window.alert(getErrorMessage(aiError));
        }
      }
      if (onSubmitSuccess) onSubmitSuccess(response);
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setShowAutoSubmit(false);
    }
  }, [exam.id, onSubmitSuccess]);

  const handleTimeUp = useCallback(() => {
    submitAllTasks();
  }, [submitAllTasks]);

  const handleSubmitEarly = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn nộp toàn bộ bài thi Viết ngay bây giờ?')) {
      submitAllTasks();
    }
  }, [submitAllTasks]);

  const activeTask = exam.tasks[activeTaskIndex];

  return (
    <div className="bg-white" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TimerBar 
        durationMinutes={durationMinutes} 
        customTimeLimit={customTimeLimit} 
        onTimeUp={handleTimeUp} 
        onSubmitEarly={handleSubmitEarly} 
        practiceMode={practiceMode} 
        hideReviewButton={true} 
      />
      
      <div className="split-view" style={{ flex: 1, height: 'calc(100vh - 60px)', paddingBottom: '70px' }}>
        {/* Left Panel: Prompt */}
        <div className="split-left" style={{ backgroundColor: '#f9f9f9', overflowY: 'auto' }}>
          <div className="mb-4">
            <p className="mb-1 text-muted fw-bold text-uppercase" style={{ fontSize: '13px', letterSpacing: 1 }}>
              {exam.title}
            </p>
            <h2 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>
              {activeTask.title}
            </h2>
          </div>

          <div className="d-flex gap-3 mb-4 flex-wrap">
            <span className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#000', color: '#fff', fontSize: '13px' }}>
              ⏱ Dành khoảng {activeTask.duration}
            </span>
            <span className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#e2e2e2', color: '#000', fontSize: '13px' }}>
              ✍ Tối thiểu {activeTask.min_words} từ
            </span>
          </div>

          <div className="prompt-content mb-4 text-dark" style={{ fontSize: '16px', fontFamily: 'UberMoveText, system-ui, sans-serif', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
            {activeTask.prompt_text}
          </div>

          {activeTask.illustration && (
            <div className="mb-4">
              <img src={activeTask.illustration} alt="Illustration" className="img-fluid rounded-3 border" style={{ maxHeight: '300px', width: '100%', objectFit: 'contain', backgroundColor: '#fff', padding: '12px' }} />
            </div>
          )}

          <div className="p-3 rounded-3" style={{ backgroundColor: '#e2e2e2', borderLeft: '3px solid #000' }}>
            <p className="mb-0 fw-medium text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
              💡 {activeTask.hint}
            </p>
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="split-right" style={{ backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
          {exam.tasks.map((task, idx) => (
            <div key={task.id} style={{ display: idx === activeTaskIndex ? 'flex' : 'none', flex: 1, flexDirection: 'column', height: '100%' }}>
              <WritingEditor
                ref={el => editorRefs.current[idx] = el}
                testId={exam.id}
                taskNumber={task.task_number}
                promptText={task.prompt_text}
                status="new"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav-bar">
        <div className="bottom-nav-tabs justify-content-center">
          {exam.tasks.map((task, idx) => {
            const isActive = activeTaskIndex === idx;
            return (
              <div 
                key={task.id}
                className={`bottom-nav-tab ${isActive ? 'active' : ''}`}
                style={{ minWidth: '150px', justifyContent: 'center' }}
                onClick={() => setActiveTaskIndex(idx)}
              >
                <span className="fw-bold">Task {task.task_number}</span>
              </div>
            );
          })}
        </div>
      </div>

      <AutoSubmitModal isOpen={showAutoSubmit} />
    </div>
  );
};

/**
 * WritingTestPage — Route-driven wrapper cho màn hình thi Writing (/tests/:id/writing)
 */
function WritingTestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const practiceMode = location.state?.practiceMode || false;
  const customTimeLimit = location.state?.customTimeLimit || null;

  const exam = location.state?.exam || null;
  const [submittedId, setSubmittedId] = useState(null);

  const handleSubmitSuccess = (response) => {
    const sid = response?.data?.writing_group_id || response?.data?.submission_id || 'mock-write-demo';
    setSubmittedId(sid);
  };

  if (!exam) {
    return (
      <div className="bg-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h3 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, sans-serif' }}>Không tìm thấy đề thi</h3>
          <button className="btn btn-dark rounded-pill px-4" onClick={() => navigate('/writing')}>
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
              onClick={() => navigate('/writing')}
            >
              ← Trở về danh sách đề
            </button>
            <h2 className="fw-bold mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '28px' }}>
              Kết quả chấm điểm
            </h2>
          </div>
          <FeedbackReport submissionId={submittedId} type="writing" />
        </main>
      </div>
    );
  }

  return (
    <WritingTestScreen
      exam={exam}
      practiceMode={practiceMode}
      customTimeLimit={customTimeLimit}
      onSubmitSuccess={handleSubmitSuccess}
    />
  );
}

export default WritingTestPage;
