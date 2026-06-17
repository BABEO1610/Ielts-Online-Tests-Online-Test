import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import TutorGradingPanel from '../../components/grading/TutorGradingPanel';
import SubmissionViewer from '../../components/grading/SubmissionViewer';

const mockSubmissionData = {
  tasks: [
    {
      id: 1,
      name: 'Task 1',
      prompt: 'The chart below shows the number of men and women in further education in Britain in three periods and whether they were studying full-time or part-time. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      fileType: 'image',
      originalFileUrl: 'https://placehold.co/800x600/f8f9fa/212529?text=Handwritten+Essay+Task+1+Scan',
      extractedText: 'The bar chart illustrates the number of males and females participating in further education in Britain over three distinct periods, categorised by full-time and part-time study.\n\nOverall, it is clear that part-time education was significantly more popular than full-time study for both genders throughout the given periods. Furthermore, while the number of women studying part-time experienced a considerable increase, male participation in both study modes saw only marginal changes.'
    },
    {
      id: 2,
      name: 'Task 2',
      prompt: 'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?',
      fileType: 'text',
      originalFileUrl: null,
      extractedText: "It is widely debated whether high school students should be mandated to participate in unpaid community service as part of their educational curriculum. While some argue that this could be a burden on students, I strongly agree that compulsory community service would be highly beneficial for both the students and society.\n\nFirst and foremost, engaging in community service helps students develop essential life skills that cannot be taught in a classroom. For instance, working with a charity organization requires teamwork, communication, and problem-solving skills. These are vital attributes that will not only help them in their future careers but also in their personal lives."
    }
  ]
};

const TutorGradingPage = () => {
  const { type, submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  
  // Tab Navigation State
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const activeTask = mockSubmissionData.tasks[activeTaskIndex];

  return (
    <div className="container-fluid px-0" style={{ height: 'calc(100vh - 56px)', backgroundColor: '#f7f7f7' }}>
      <div className="row g-0 h-100">
        
        {/* Cột Trái: Nội dung bài thi */}
        <div className="col-lg-6 col-xl-5 h-100 border-end border-light d-flex flex-column" style={{ overflowY: 'auto' }}>
          
          {/* Tab Navigation */}
          <div className="px-4 pt-4 pb-2 border-bottom" style={{ backgroundColor: '#fff' }}>
            <h4 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif' }}>
              Nội dung bài thi
            </h4>
            <ul className="nav nav-pills gap-2">
              {mockSubmissionData.tasks.map((task, index) => (
                <li className="nav-item" key={task.id}>
                  <button 
                    className={`nav-link rounded-pill px-4 py-2 fw-medium ${activeTaskIndex === index ? 'active bg-dark text-white' : 'bg-light text-dark border-0'}`}
                    onClick={() => setActiveTaskIndex(index)}
                    style={{ transition: 'all 0.2s' }}
                  >
                    {task.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 flex-grow-1">
            {type === 'writing' ? (
              <SubmissionViewer task={activeTask} />
            ) : (
              <div className="p-4 rounded-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8' }}>
                <p className="text-muted mb-0">Speaking response logic not mocked here.</p>
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
              studentId={studentId}
              tasks={mockSubmissionData.tasks}
              activeTaskId={activeTask.id}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default TutorGradingPage;
