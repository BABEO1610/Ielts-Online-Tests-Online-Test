import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TutorGradingPanel from '../../components/grading/TutorGradingPanel';
import SubmissionViewer from '../../components/grading/SubmissionViewer';
import gradingService from '../../services/grading.service';
import { getGradingHistoryById } from '../../services/gradingHistory.service';

const formatHalfBand = (value) => (Math.round(Number(value) * 2) / 2).toFixed(1);

const TutorGradingPage = () => {
  const { type, submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [submissionData, setSubmissionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [gradedData, setGradedData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mode = searchParams.get('mode');

  // Safely define activeTask first so it can be used in the handler
  const activeTask = submissionData?.tasks?.[activeTaskIndex] || {};

  const handleGenerateTranscript = async () => {
    try {
      setIsGeneratingTranscript(true);
      const res = await gradingService.generateTranscript(activeTask.id);
      if (res.success) {
        const updatedTasks = [...submissionData.tasks];
        updatedTasks[activeTaskIndex].transcript = res.data.transcript;
        setSubmissionData({ ...submissionData, tasks: updatedTasks });
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Không thể tạo transcript');
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        const res = await gradingService.getSubmissionDetail(type, submissionId);
        if (res.success && res.data) {
          // Format API response into internal structure that components expect
          const item = res.data;
          let tasks = (item.parts || []).map(p => ({
            id: p.submissionId,
            taskNumber: p.taskNumber,
            partNumber: p.partNumber,
            name: type === 'writing' ? `Task ${p.taskNumber}` : `Part ${p.partNumber}`,
            prompt: p.promptText,
            audioUrl: null,
            audioAvailable: p.audioAvailable,
            transcript: p.transcript,
            fileType: p.fileUrl ? 'image' : 'text',
            originalFileUrl: p.fileUrl,
            extractedText: p.responseText,
            wordCount: p.wordCount,
            aiFeedback: p.aiFeedback,
            tutorGrade: p.tutorGrade
          }));
          setSubmissionData({ ...item, tasks });
        } else {
          setError('Không tìm thấy bài nộp');
        }

        if (mode === 'view' || mode === 'edit') {
          const gradedRes = await getGradingHistoryById(submissionId);
          if (gradedRes.success && gradedRes.data) {
            setGradedData(gradedRes.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [type, submissionId, refreshKey, mode]);

  useEffect(() => {
    if (type !== 'speaking' || !activeTask?.id || !activeTask.audioAvailable || activeTask.audioUrl) return undefined;
    let active = true;
    gradingService.getAudioUrl(activeTask.id).then((response) => {
      const url = response.data?.url || response.data?.presigned_url;
      if (!active || !url) return;
      setSubmissionData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => task.id === activeTask.id ? { ...task, audioUrl: url } : task),
      }));
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error?.message || 'Không thể cấp quyền nghe audio.');
    });
    return () => { active = false; };
  }, [type, activeTask?.id, activeTask?.audioAvailable, activeTask?.audioUrl]);

  if (isLoading) return <div className="p-4 text-center mt-5" style={{fontFamily: 'UberMoveText, system-ui, sans-serif'}}>Đang tải dữ liệu bài thi...</div>;
  if (error) return <div className="p-4 text-center text-danger mt-5" style={{fontFamily: 'UberMoveText, system-ui, sans-serif'}}>{error}</div>;
  if (!submissionData) return <div className="p-4 text-center mt-5" style={{fontFamily: 'UberMoveText, system-ui, sans-serif'}}>Không có dữ liệu</div>;

  const isGradable = submissionData.status === 'pending' && submissionData.grader === 'tutor';
  const effectiveMode = (isGradable || mode === 'edit') ? mode : 'view';

  // activeTask is already defined above

  return (
    <div className="container-fluid px-0" style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f7f7f7' }}>
      {!isGradable && mode === 'grade' && (
        <div className="alert alert-warning text-center rounded-0 mb-0 fw-medium border-0 border-bottom" style={{fontFamily: 'UberMoveText, system-ui, sans-serif'}}>
          Bài thi này đã được chấm hoặc không nằm trong danh sách cần chấm của bạn. Bạn chỉ có thể xem nội dung.
        </div>
      )}
      <div className="row g-0 h-100">
        {/* Cột Trái: Nội dung bài thi */}
        <div className="col-lg-6 col-xl-5 h-100 border-end border-light d-flex flex-column" style={{ overflowY: 'auto' }}>
          
          <div className="px-4 pt-4 pb-3 border-bottom" style={{ backgroundColor: '#fff' }}>
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
              <h4 className="fw-bold mb-0" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
                Nội dung bài thi {activeTask.name ? `- ${activeTask.name}` : ''}
              </h4>
              <button
                type="button"
                className="btn btn-dark rounded-pill px-4 py-2 fw-bold"
                onClick={() => navigate('/grading/tutor/queue')}
              >
                Quay lại hàng chờ chấm
              </button>
            </div>
            <div className="mb-0">
              <span className="badge bg-dark me-2 py-2 px-3">Học viên: {submissionData.student?.fullName || 'Ẩn danh'}</span>
              <span className="badge bg-secondary py-2 px-3" style={{textTransform: 'uppercase'}}>{type}</span>
            </div>
            {type === 'writing' && (
              <div className="d-flex gap-2 flex-wrap mt-3">
                <span className="badge bg-light text-dark border py-2 px-3">
                  AI: {submissionData.aiStatus === 'completed' ? 'AI đã hoàn thành' : submissionData.aiStatus === 'failed' ? 'AI chấm lỗi' : 'AI đang chấm'}
                </span>
                <span className="badge bg-light text-dark border py-2 px-3">
                  Tutor: {submissionData.tutorStatus === 'graded' ? 'Đã chấm' : 'Đang chờ chấm'}
                </span>
                {submissionData.overallAiBand !== null && submissionData.overallAiBand !== undefined && (
                  <span className="badge bg-dark py-2 px-3">AI Overall {formatHalfBand(submissionData.overallAiBand)}</span>
                )}
                {submissionData.overallTutorBand !== null && submissionData.overallTutorBand !== undefined && (
                  <span className="badge bg-dark py-2 px-3">Tutor Overall {formatHalfBand(submissionData.overallTutorBand)}</span>
                )}
              </div>
            )}
            
            {submissionData.tasks?.length > 1 && (
              <div className="d-flex gap-2 mt-4">
                {submissionData.tasks.map((task, idx) => (
                  <button
                    key={task.id}
                    onClick={() => setActiveTaskIndex(idx)}
                    className={`btn rounded-pill px-4 fw-medium ${activeTaskIndex === idx ? 'btn-dark' : 'btn-outline-dark'}`}
                  >
                    {task.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 flex-grow-1">
            {type === 'writing' ? (
              <SubmissionViewer task={activeTask} />
            ) : (
              <div>
                <div className="p-4 rounded-4 mb-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8' }}>
                  <h5 className="fw-bold mb-3" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                    {activeTask.name}
                  </h5>
                  
                  <h6 className="fw-bold mb-2" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}>Đề bài:</h6>
                  <p className="mb-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px', color: '#333', whiteSpace: 'pre-wrap' }}>
                    {activeTask.prompt || 'Không có đề bài.'}
                  </p>
                  
                  <h6 className="fw-bold mb-2" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}>File ghi âm:</h6>
                  {activeTask.audioUrl ? (
                    <audio controls src={activeTask.audioUrl} className="w-100 mb-4" />
                  ) : (
                    <p className="text-muted mb-4" style={{fontStyle: 'italic', fontSize: '14px'}}>Không có file âm thanh đính kèm.</p>
                  )}

                  <h6 className="fw-bold mt-2 mb-2" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}>Transcript:</h6>
                  {activeTask.transcript ? (
                    <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '14px', color: '#555' }}>
                      {activeTask.transcript}
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted mb-2" style={{fontStyle: 'italic', fontSize: '14px'}}>Chưa có transcript cho phần thi này.</p>
                      {activeTask.audioUrl && (
                        <button 
                          className="btn btn-sm btn-outline-dark rounded-pill fw-medium px-3"
                          onClick={handleGenerateTranscript}
                          disabled={isGeneratingTranscript}
                        >
                          {isGeneratingTranscript ? (
                            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Đang tạo...</>
                          ) : (
                            <><i className="bi bi-stars text-warning me-1"></i> Tạo Transcript bằng AI</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Khu vực chấm điểm */}
        <div className="col-lg-6 col-xl-7 h-100" style={{ overflowY: 'auto', backgroundColor: '#ffffff' }}>
          <div className="p-4">
            <TutorGradingPanel 
              submissionId={submissionId} 
              type={type} 
              studentId={submissionData.student?.id}
              activeTaskId={activeTask.id}
              activeTaskNumber={activeTask.taskNumber || activeTask.partNumber}
              tasks={submissionData.tasks}
              aiFeedback={activeTask.aiFeedback}
              existingTutorGrade={activeTask.tutorGrade}
              readOnly={effectiveMode === 'view'}
              editMode={effectiveMode === 'edit'}
              initialData={gradedData}
              onGradingComplete={() => setRefreshKey(key => key + 1)}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default TutorGradingPage;
