import { useMemo, useState } from 'react';
import '../styles/admin.css';
import '../styles/profile.css';

const WEEK_PLAN = [
  { day: 'Thứ 2', focus: 'Listening', task: 'Listening Test 46 + ghi chú từ vựng', time: '18:00 - 19:00', tone: 'accent', done: true },
  { day: 'Thứ 3', focus: 'Writing', task: 'Writing Task 2 - Essay argument', time: '19:00 - 20:30', tone: 'goal', done: true },
  { day: 'Thứ 4', focus: 'Reading', task: 'Reading Test 43 - skimming & scanning', time: '18:00 - 19:00', tone: 'practice', done: false },
  { day: 'Thứ 5', focus: 'Speaking', task: 'Speaking Part 2 - cue card luyện nói', time: '20:00 - 21:00', tone: 'time', done: false },
  { day: 'Thứ 6', focus: 'Writing', task: 'Writing Task 1 - mô tả biểu đồ', time: '19:00 - 20:00', tone: 'goal', done: false },
  { day: 'Thứ 7', focus: 'Mock Test', task: 'Full mock test + tự chấm', time: '08:00 - 11:00', tone: 'accent', done: false },
];

const MILESTONES = [
  { label: 'Hoàn thành 10 bài Listening', progress: 80 },
  { label: 'Đạt band 6.0 Writing', progress: 55 },
  { label: 'Luyện Speaking 20 giờ', progress: 40 },
];

const StudyPlanPage = () => {
  const [plan, setPlan] = useState(WEEK_PLAN);

  const completion = useMemo(() => {
    const done = plan.filter((item) => item.done).length;
    return Math.round((done / plan.length) * 100);
  }, [plan]);

  const toggle = (index) => {
    setPlan((current) => current.map((item, i) => (i === index ? { ...item, done: !item.done } : item)));
  };

  return (
    <div className="iot-profile-page">
      <header className="iot-page-header">
        <div>
          <h1>Kế hoạch học tập</h1>
          <p>Home <i className="bi bi-chevron-right"></i> Study Plan</p>
        </div>
      </header>

      <div className="iot-plan-grid">
        <div className="iot-main-column">
          <section className="iot-card">
            <div className="iot-card__header">
              <div className="iot-card__title">
                <i className="bi bi-calendar3"></i>
                <h2>Lịch học tuần này</h2>
              </div>
              <span className="iot-card-action">{completion}% hoàn thành</span>
            </div>

            <div className="iot-progress iot-progress--lg">
              <span style={{ width: `${completion}%` }} />
            </div>

            <div className="iot-plan-list">
              {plan.map((item, index) => (
                <div className={`iot-plan-item ${item.done ? 'done' : ''}`} key={item.day}>
                  <button
                    type="button"
                    className="iot-plan-check"
                    onClick={() => toggle(index)}
                    aria-label={item.done ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                  >
                    <i className={`bi ${item.done ? 'bi-check-circle-fill' : 'bi-circle'}`}></i>
                  </button>
                  <div className="iot-plan-day">{item.day}</div>
                  <div className="iot-plan-main">
                    <strong>{item.task}</strong>
                    <span className={`iot-badge iot-badge--accent`}>{item.focus}</span>
                  </div>
                  <div className="iot-plan-time"><i className="bi bi-clock"></i>{item.time}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="iot-side-column">
          <section className="iot-card">
            <div className="iot-card__header">
              <div className="iot-card__title">
                <i className="bi bi-flag"></i>
                <h2>Cột mốc mục tiêu</h2>
              </div>
            </div>
            <div className="iot-skill-list">
              {MILESTONES.map((item) => (
                <div className="iot-skill-row" key={item.label}>
                  <div className="iot-skill-main">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="iot-progress"><span style={{ width: `${item.progress}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="iot-card">
            <div className="iot-card__header">
              <div className="iot-card__title">
                <i className="bi bi-lightbulb"></i>
                <h2>Gợi ý hôm nay</h2>
              </div>
            </div>
            <div className="iot-note">
              <p>Dành 30 phút ôn từ vựng Academic và luyện 1 đề Reading để giữ phong độ trước kỳ thi.</p>
              <span>Cập nhật mỗi ngày</span>
              <i className="bi bi-stars"></i>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanPage;
