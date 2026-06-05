import React, { useState } from 'react';
import StudentNavbar from '../components/layout/StudentNavbar';
import WritingEditor from '../components/grading/WritingEditor';
import FeedbackReport from '../components/grading/FeedbackReport';

// ─── MOCK DATA — Danh sách đề thi (cấu trúc như IELTS Online Tests) ──────────
// Mỗi exam có nhiều tasks, mỗi task có prompt riêng
const MOCK_EXAMS = [
  {
    id: 'writing-2025-06',
    title: 'Đề thi tháng 6/2025',
    date: 'Tháng 6, 2025',
    difficulty: 'Trung bình',
    tasks: [
      {
        id: 'writing-2025-06-t1',
        task_number: 1,
        title: 'Task 1 — Academic Report',
        duration: '20 phút',
        min_words: 150,
        prompt_text: `The bar chart below shows the percentage of Australian men and women in different age groups who did regular physical activity in 2010.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
        illustration: 'https://ielts.com.au/wp-content/uploads/2023/02/writing-task-1-768x512.jpg',
        hint: 'So sánh tỷ lệ giữa nam và nữ theo từng nhóm tuổi. Đề cập đến điểm cao nhất, thấp nhất và xu hướng tổng thể.'
      },
      {
        id: 'writing-2025-06-t2',
        task_number: 2,
        title: 'Task 2 — Discussion Essay',
        duration: '40 phút',
        min_words: 250,
        prompt_text: `Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations.

Discuss both these views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
        illustration: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800&auto=format&fit=crop',
        hint: 'Nêu rõ cả 2 quan điểm, đưa ý kiến cá nhân và ví dụ thực tế để minh chứng.'
      }
    ]
  },
  {
    id: 'writing-2025-05',
    title: 'Đề thi tháng 5/2025',
    date: 'Tháng 5, 2025',
    difficulty: 'Khó',
    tasks: [
      {
        id: 'writing-2025-05-t1',
        task_number: 1,
        title: 'Task 1 — Process Diagram',
        duration: '20 phút',
        min_words: 150,
        prompt_text: `The diagram below shows how electricity is generated in a hydroelectric power station.

Summarise the information by selecting and reporting the main features.

Write at least 150 words.`,
        illustration: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=800&auto=format&fit=crop',
        hint: 'Mô tả từng bước trong quy trình theo thứ tự. Dùng động từ bị động và từ chỉ trình tự (First, Then, After that...).'
      },
      {
        id: 'writing-2025-05-t2',
        task_number: 2,
        title: 'Task 2 — Agree / Disagree',
        duration: '40 phút',
        min_words: 250,
        prompt_text: `In the modern world, it is no longer necessary to use animals for food or use animal products, for example, leather or fur.

To what extent do you agree or disagree?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
        illustration: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&auto=format&fit=crop',
        hint: 'Đưa ra lập trường rõ ràng ngay từ đầu. Hỗ trợ bằng 2-3 luận điểm chính với ví dụ cụ thể.'
      }
    ]
  },
  {
    id: 'writing-2025-04',
    title: 'Đề thi tháng 4/2025',
    date: 'Tháng 4, 2025',
    difficulty: 'Dễ',
    tasks: [
      {
        id: 'writing-2025-04-t1',
        task_number: 1,
        title: 'Task 1 — Line Graph',
        duration: '20 phút',
        min_words: 150,
        prompt_text: `The graph below shows changes in the number of tourists visiting three Pacific countries between 1995 and 2010.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
        illustration: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop',
        hint: 'Mô tả xu hướng tăng/giảm theo thời gian. So sánh 3 quốc gia với nhau ở các mốc thời gian quan trọng.'
      },
      {
        id: 'writing-2025-04-t2',
        task_number: 2,
        title: 'Task 2 — Problem / Solution',
        duration: '40 phút',
        min_words: 250,
        prompt_text: `In many cities, traffic congestion has become a serious problem. What are the causes of this problem and what measures can be taken to reduce traffic congestion?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
        illustration: 'https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?q=80&w=800&auto=format&fit=crop',
        hint: 'Nêu 2-3 nguyên nhân, sau đó đề xuất giải pháp tương ứng. Tránh lặp từ bằng cách dùng từ đồng nghĩa.'
      }
    ]
  },
  {
    id: 'writing-2025-03',
    title: 'Đề thi tháng 3/2025',
    date: 'Tháng 3, 2025',
    difficulty: 'Trung bình',
    tasks: [
      {
        id: 'writing-2025-03-t1',
        task_number: 1,
        title: 'Task 1 — Table',
        duration: '20 phút',
        min_words: 150,
        prompt_text: `The table below shows the proportion of different categories of families living in poverty in Australia in 1999.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
        illustration: 'https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=800&auto=format&fit=crop',
        hint: 'Chọn lọc số liệu nổi bật nhất để đề cập. Không cần nêu tất cả số liệu trong bảng.'
      },
      {
        id: 'writing-2025-03-t2',
        task_number: 2,
        title: 'Task 2 — Two-part Question',
        duration: '40 phút',
        min_words: 250,
        prompt_text: `Many governments think that economic progress is their most important goal. Some people, however, think that other types of progress are equally important for a country.

What other types of progress might be important? Why are these types of progress important?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
        illustration: 'https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?q=80&w=800&auto=format&fit=crop',
        hint: 'Dạng Two-part: trả lời đủ cả 2 câu hỏi. Dành 1 đoạn cho mỗi câu hỏi.'
      }
    ]
  }
];

const DIFFICULTY_STYLE = {
  'Dễ': { bg: '#efefef', color: '#5e5e5e' },
  'Trung bình': { bg: '#000', color: '#fff' },
  'Khó': { bg: '#282828', color: '#afafaf' }
};

// ─── Level 3: Giao diện làm bài ──────────────────────────────────────────────
const WritingTestScreen = ({ task, exam, onBack, onSubmitSuccess }) => (
  <div className="bg-white min-vh-100 pb-5">
    <StudentNavbar />
    <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '900px' }}>
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <button
          className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
          style={{ backgroundColor: '#efefef', fontSize: '14px' }}
          onClick={onBack}
        >
          ← Quay lại
        </button>
        <div>
          <p className="mb-0 text-muted" style={{ fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
            {exam.title}
          </p>
          <h2 className="fw-bold mb-0 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
            {task.title}
          </h2>
        </div>
      </div>

      {/* Prompt */}
      <div className="p-4 rounded-4 mb-4" style={{ backgroundColor: '#efefef' }}>
        <div className="d-flex gap-3 mb-3 flex-wrap">
          <span className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#000', color: '#fff', fontSize: '13px' }}>
            ⏱ {task.duration}
          </span>
          <span className="rounded-pill px-3 py-1 fw-medium" style={{ backgroundColor: '#e2e2e2', color: '#000', fontSize: '13px' }}>
            ✍ Tối thiểu {task.min_words} từ
          </span>
        </div>
        <p className="mb-3 text-dark" style={{ fontSize: '16px', fontFamily: 'UberMoveText, system-ui, sans-serif', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
          {task.prompt_text}
        </p>
        <div className="p-3 rounded-3" style={{ backgroundColor: '#e2e2e2', borderLeft: '3px solid #000' }}>
          <p className="mb-0 fw-medium text-dark" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}>
            💡 {task.hint}
          </p>
        </div>
      </div>

      <WritingEditor
        testId={task.id}
        taskNumber={task.task_number}
        promptText={task.prompt_text}
        status="new"
        onSubmitSuccess={onSubmitSuccess}
      />
    </main>
  </div>
);

// ─── Level 2: Tasks của một đề ───────────────────────────────────────────────
const WritingTaskList = ({ exam, onSelectTask, onBack }) => (
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
        <p className="text-muted mb-0" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px' }}>
          Gồm {exam.tasks.length} phần · Hoàn thành từng Task để nhận điểm chấm
        </p>
      </div>

      <div className="d-flex flex-column gap-3">
        {exam.tasks.map((task, idx) => (
          <div
            key={task.id}
            className="d-flex align-items-center justify-content-between p-4 rounded-4"
            style={{ border: '1px solid #e2e2e2', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#efefef'; e.currentTarget.style.borderColor = '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e2e2'; }}
            onClick={() => onSelectTask(task)}
          >
            <div className="d-flex align-items-center gap-4">
              {/* Task Number Badge */}
              <div
                className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                style={{ width: '56px', height: '56px', borderRadius: '999px', backgroundColor: '#000', color: '#fff', fontSize: '20px', fontFamily: 'UberMove, system-ui, sans-serif' }}
              >
                {idx + 1}
              </div>
              <div>
                <h4 className="fw-bold mb-1 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '20px' }}>
                  {task.title}
                </h4>
                <div className="d-flex gap-2 flex-wrap">
                  <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>⏱ {task.duration}</span>
                  <span className="text-muted" style={{ fontSize: '14px' }}>·</span>
                  <span className="text-muted fw-medium" style={{ fontSize: '14px' }}>✍ Tối thiểu {task.min_words} từ</span>
                </div>
              </div>
            </div>
            <button
              className="btn btn-dark rounded-pill px-4 py-2 fw-medium flex-shrink-0"
              style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}
              onClick={(e) => { e.stopPropagation(); onSelectTask(task); }}
            >
              Làm bài →
            </button>
          </div>
        ))}
      </div>
    </main>
  </div>
);

// ─── Level 1: Danh sách đề thi ───────────────────────────────────────────────
const WritingPage = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submittedId, setSubmittedId] = useState(null);

  const handleSubmitSuccess = (response) => {
    const id = response?.data?.submission_id || 'mock-write-demo';
    setSubmittedId(id);
  };

  // Level 3: Đang làm bài
  if (selectedTask && selectedExam) {
    if (submittedId) {
      return (
        <div className="bg-white min-vh-100 pb-5">
          <StudentNavbar />
          <main className="container-fluid px-3 px-md-5 mt-4" style={{ maxWidth: '900px' }}>
            <div className="d-flex align-items-center gap-3 mb-4">
              <button
                className="btn btn-light rounded-pill px-4 py-2 fw-medium border-0"
                style={{ backgroundColor: '#efefef' }}
                onClick={() => { setSubmittedId(null); setSelectedTask(null); }}
              >
                ← Quay lại đề
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
        task={selectedTask}
        exam={selectedExam}
        onBack={() => setSelectedTask(null)}
        onSubmitSuccess={handleSubmitSuccess}
      />
    );
  }

  // Level 2: Danh sách task của một đề
  if (selectedExam) {
    return (
      <WritingTaskList
        exam={selectedExam}
        onSelectTask={setSelectedTask}
        onBack={() => setSelectedExam(null)}
      />
    );
  }

  // Level 1: Danh sách đề thi
  return (
    <div className="bg-white min-vh-100 pb-5">
      <StudentNavbar />
      <main className="container-fluid px-3 px-md-5 mt-4 mt-md-5" style={{ maxWidth: '1200px' }}>

        <div className="mb-5">
          <h1 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '52px' }}>
            Writing
          </h1>
          <p className="text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '20px' }}>
            Chọn đề thi để luyện viết. Nộp bài để nhận điểm từ AI hoặc giáo viên.
          </p>
        </div>

        {/* Exam List */}
        <div className="row g-4">
          {MOCK_EXAMS.map((exam) => {
            const diff = DIFFICULTY_STYLE[exam.difficulty];
            return (
              <div key={exam.id} className="col-md-6">
                <div
                  className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                  style={{ border: '1px solid #e2e2e2', cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 4px 16px 0px'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  onClick={() => setSelectedExam(exam)}
                >
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span
                        className="rounded-pill px-3 py-1 fw-medium"
                        style={{ backgroundColor: diff.bg, color: diff.color, fontSize: '13px', fontFamily: 'UberMoveText, system-ui, sans-serif' }}
                      >
                        {exam.difficulty}
                      </span>
                      <span className="text-muted fw-medium" style={{ fontSize: '13px' }}>
                        {exam.tasks.length} Tasks
                      </span>
                    </div>
                    <h3 className="fw-bold mb-2 text-dark" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px' }}>
                      {exam.title}
                    </h3>
                    <p className="text-muted mb-4" style={{ fontSize: '14px', fontFamily: 'UberMoveText, system-ui, sans-serif', lineHeight: '1.6' }}>
                      {exam.tasks.map(t => t.title).join(' · ')}
                    </p>
                  </div>
                  <button
                    className="btn btn-dark rounded-pill px-4 py-2 fw-medium align-self-start"
                    style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '15px' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedExam(exam); }}
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

export default WritingPage;
