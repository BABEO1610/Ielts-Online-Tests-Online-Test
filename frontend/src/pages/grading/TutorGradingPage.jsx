import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import TutorGradingPanel from '../../components/grading/TutorGradingPanel';
import SubmissionViewer from '../../components/grading/SubmissionViewer';
import gradingService from '../../services/grading.service';

const TutorGradingPage = () => {
  const { type, submissionId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [submissionData, setSubmissionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        const res = await gradingService.getSubmissionDetail(type, submissionId);
        if (res.success && res.data) {
          // Format API response into internal structure that components expect
          const item = res.data;
          let tasks = [];
          if (type === 'writing') {
            tasks = [{
              id: item.submissionId,
              name: `Task ${item.taskNumber}`,
              prompt: item.promptText,
              fileType: item.fileUrl ? 'image' : 'text',
              originalFileUrl: item.fileUrl,
              extractedText: item.responseText
            }];
          } else {
            tasks = [{
              id: item.submissionId,
              name: `Part ${item.partNumber}`,
              prompt: item.promptText,
              audioUrl: item.audioUrl,
              transcript: item.transcript
            }];
          }
          setSubmissionData({ ...item, tasks });
        } else {
          setError('Không tìm thấy bài nộp');
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [type, submissionId]);

  if (isLoading) return <div className="p-4 text-center mt-5" style={{fontFamily: 'UberMoveText, system-ui, sans-serif'}}>Đang tải dữ liệu bài thi...</div>;
  if (error) return <div className="p-4 text-center text-danger mt-5" style={{fontFamily: 'UberMoveText, system-ui, sans-serif'}}>{error}</div>;
  if (!submissionData) return <div className="p-4 text-center mt-5" style={{fontFamily: 'UberMoveText, system-ui, sans-serif'}}>Không có dữ liệu</div>;

  const activeTask = submissionData.tasks[0]; // Currently API returns 1 task/part per submission record

  return (
    <div className="container-fluid px-0" style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f7f7f7' }}>
      <div className="row g-0 h-100">
        {/* Cột Trái: Nội dung bài thi */}
        <div className="col-lg-6 col-xl-5 h-100 border-end border-light d-flex flex-column" style={{ overflowY: 'auto' }}>
          
          <div className="px-4 pt-4 pb-3 border-bottom" style={{ backgroundColor: '#fff' }}>
            <h4 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
              Nội dung bài thi - {activeTask.name}
            </h4>
            <div className="mb-0">
              <span className="badge bg-dark me-2 py-2 px-3">Học viên: {submissionData.student?.fullName || 'Ẩn danh'}</span>
              <span className="badge bg-secondary py-2 px-3" style={{textTransform: 'uppercase'}}>{type}</span>
            </div>
          </div>

          <div className="p-4 flex-grow-1">
            {type === 'writing' ? (
              <SubmissionViewer task={activeTask} />
            ) : (
              <div>
                {submissionData.tasks.map((task, index) => (
                  <div key={task.id} className="p-4 rounded-4 mb-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8' }}>
                    <h5 className="fw-bold mb-3" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
                      {task.name}
                    </h5>
                    
                    <h6 className="fw-bold mb-2" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}>Đề bài:</h6>
                    <p className="mb-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px', color: '#333' }}>{task.prompt || 'Không có đề bài.'}</p>
                    
                    <h6 className="fw-bold mb-2" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}>File ghi âm:</h6>
                    {task.audioUrl ? (
                      <audio controls src={task.audioUrl} className="w-100 mb-4" />
                    ) : (
                      <p className="text-muted mb-4" style={{fontStyle: 'italic', fontSize: '14px'}}>Không có file âm thanh đính kèm.</p>
                    )}

                    <h6 className="fw-bold mt-2 mb-2" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}>Transcript:</h6>
                    {task.transcript ? (
                      <div className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap', fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '14px', color: '#555' }}>
                        {task.transcript}
                      </div>
                    ) : (
                      <p className="text-muted" style={{fontStyle: 'italic', fontSize: '14px'}}>Chưa có transcript cho phần thi này.</p>
                    )}
                  </div>
                ))}
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
              activeTaskId={type === 'speaking' ? 'overall' : activeTask.id}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default TutorGradingPage;
