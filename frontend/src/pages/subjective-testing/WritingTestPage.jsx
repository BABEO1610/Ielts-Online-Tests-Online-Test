import { useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StudentNavbar from '../../components/layout/StudentNavbar';
import WritingEditor from '../../components/grading/WritingEditor';
import FeedbackReport from '../../components/grading/FeedbackReport';
import TimerBar from '../../components/objective-testing/TimerBar';
import gradingService from '../../services/grading.service';

const getErrorMessage = (error) =>
  error.response?.data?.error?.message
  || error.message
  || 'Đã xảy ra lỗi khi nộp bài.';

const collectWritingTasks = (refs) => {
  const tasksData = refs
    .filter(ref => ref?.getTaskData)
    .map(ref => ref.getTaskData());

  if (tasksData.length !== 2) {
    throw new Error('Bài Writing phải có đủ Task 1 và Task 2.');
  }

  return tasksData;
};

const WritingSubmitModal = ({ isOpen, isTimeUp, onConfirm, onCancel, isSubmitting }) => {
  const [grader, setGrader] = useState('ai');
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
            <div className="modal-body p-4 text-center">
              {isTimeUp ? (
                <>
                  <h4 className="fw-bold mb-3 text-danger">Đã hết thời gian làm bài!</h4>
                  <p className="text-muted mb-4">Vui lòng chọn người chấm điểm cho bài thi của bạn.</p>
                </>
              ) : (
                <>
                  <h4 className="fw-bold mb-3">Nộp bài thi</h4>
                  <p className="text-muted mb-4">Bạn có chắc chắn muốn nộp bài? Vui lòng chọn người chấm điểm.</p>
                </>
              )}
              
              <div className="d-flex flex-column gap-3 mb-4 text-start">
                <label className={`p-3 rounded-3 border ${grader === 'ai' ? 'border-dark bg-light' : ''}`} style={{ cursor: 'pointer' }}>
                  <div className="form-check mb-0">
                    <input className="form-check-input" type="radio" name="grader" value="ai" checked={grader === 'ai'} onChange={() => setGrader('ai')} disabled={isSubmitting} />
                    <span className="fw-bold ms-2">AI chấm điểm</span>
                    <p className="text-muted small mb-0 ms-4 mt-1">Nhận kết quả và feedback chi tiết ngay lập tức.</p>
                  </div>
                </label>
                <label className={`p-3 rounded-3 border ${grader === 'tutor' ? 'border-dark bg-light' : ''}`} style={{ cursor: 'pointer' }}>
                  <div className="form-check mb-0">
                    <input className="form-check-input" type="radio" name="grader" value="tutor" checked={grader === 'tutor'} onChange={() => setGrader('tutor')} disabled={isSubmitting} />
                    <span className="fw-bold ms-2">Giảng viên chấm</span>
                    <p className="text-muted small mb-0 ms-4 mt-1">Kết quả sẽ được trả sau 24-48h làm việc.</p>
                  </div>
                </label>
              </div>

              <div className="d-flex gap-2 justify-content-end">
                {!isTimeUp && (
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={onCancel} disabled={isSubmitting}>
                    Hủy
                  </button>
                )}
                <button type="button" className="btn btn-dark rounded-pill px-4 fw-bold" onClick={() => onConfirm(grader)} disabled={isSubmitting}>
                  {isSubmitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


/**
 * WritingTestScreen — Component màn hình làm bài
 */
const WritingTestScreen = ({ exam, onSubmitSuccess, practiceMode, customTimeLimit }) => {
  const editorRefs = useRef([]);
  const submittingRef = useRef(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [taskTexts, setTaskTexts] = useState({});
  const [completedTasks, setCompletedTasks] = useState({});

  // Sử dụng trực tiếp thuộc tính tổng thời gian của đề thi (mặc định 60 phút)
  const durationMinutes = exam.duration || 60;

  const submitAllTasks = useCallback(async (selectedGrader) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const tasksData = collectWritingTasks(editorRefs.current);

      const payload = {
        test_id: exam.id,
        grader: selectedGrader,
        tasks: tasksData
      };

      const response = await gradingService.submitFullWriting(payload);
      if (onSubmitSuccess) onSubmitSuccess(response);
    } catch (error) {
      console.error('Writing submit failed', error);
      window.alert(getErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  }, [exam.id, onSubmitSuccess]);

  const handleTimeUp = useCallback(() => {
    setIsTimeUp(true);
    setShowSubmitModal(true);
  }, []);

  const handleSubmitEarly = useCallback(() => {
    setIsTimeUp(false);
    setShowSubmitModal(true);
  }, []);

  const activeTask = exam.tasks[activeTaskIndex];
  const activeTaskNumber = activeTask.task_number;
  const isSubmitDisabled = isSubmitting
    || exam.tasks.some(task => !String(taskTexts[task.task_number] || '').trim());
  const handleTaskTextChange = useCallback((taskNumber, value) => {
    setTaskTexts(prev => ({ ...prev, [taskNumber]: value }));
    if (!String(value || '').trim()) {
      setCompletedTasks(prev => ({ ...prev, [taskNumber]: false }));
    }
  }, []);

  const handleCompleteTask = useCallback(() => {
    const currentText = String(taskTexts[activeTaskNumber] || '').trim();
    if (!currentText) {
      window.alert(`Vui lòng viết câu trả lời cho Writing Task ${activeTaskNumber} trước khi hoàn thành.`);
      return;
    }

    setCompletedTasks(prev => ({ ...prev, [activeTaskNumber]: true }));
    if (activeTaskIndex < exam.tasks.length - 1) {
      setActiveTaskIndex(activeTaskIndex + 1);
    }
  }, [activeTaskIndex, activeTaskNumber, exam.tasks.length, taskTexts]);

  return (
    <div className="bg-white" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TimerBar 
        durationMinutes={durationMinutes} 
        customTimeLimit={customTimeLimit} 
        onTimeUp={handleTimeUp} 
        onSubmitEarly={handleSubmitEarly} 
        practiceMode={practiceMode} 
        hideReviewButton={true} 
        submitDisabled={isSubmitDisabled}
        submitTitle={isSubmitting ? 'Đang nộp...' : (isSubmitDisabled ? 'Hoàn thành Task 1 & 2' : 'Nộp bài')}
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

          {activeTask.hint && (
            <div className="p-3 rounded-3" style={{ backgroundColor: '#e2e2e2', borderLeft: '3px solid #000' }}>
              <p className="mb-0 fw-medium text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                💡 {activeTask.hint}
              </p>
            </div>
          )}
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
                status={isSubmitting || isTimeUp ? 'pending' : 'new'}
                onContentChange={handleTaskTextChange}
              />
              <div className="px-4 pb-4 d-flex justify-content-end">
                <button
                  type="button"
                  className={`btn rounded-pill px-4 fw-bold ${completedTasks[task.task_number] ? 'btn-success' : 'btn-dark'}`}
                  onClick={handleCompleteTask}
                  disabled={!String(taskTexts[task.task_number] || '').trim() || isSubmitting}
                >
                  {completedTasks[task.task_number] ? `Task ${task.task_number} đã hoàn thành` : `Hoàn thành Task ${task.task_number}`}
                </button>
              </div>
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
                {completedTasks[task.task_number] && (
                  <span className="badge bg-success ms-2">Done</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <WritingSubmitModal 
        isOpen={showSubmitModal} 
        isTimeUp={isTimeUp} 
        onConfirm={submitAllTasks} 
        onCancel={() => setShowSubmitModal(false)} 
        isSubmitting={isSubmitting} 
      />
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
