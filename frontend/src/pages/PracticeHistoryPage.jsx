import { useMemo, useState } from 'react';
import '../styles/admin.css';
import '../styles/profile.css';

const SUMMARY = [
  { label: 'Tổng số bài đã làm', value: '74', helper: 'Tất cả kỹ năng', icon: 'bi-collection', tone: 'accent' },
  { label: 'Điểm trung bình', value: '6.5', helper: 'Overall band', icon: 'bi-graph-up-arrow', tone: 'goal' },
  { label: 'Độ chính xác', value: '63.5%', helper: 'Câu trả lời đúng', icon: 'bi-crosshair', tone: 'practice' },
  { label: 'Thời gian TB', value: '52 phút', helper: 'Mỗi bài thi', icon: 'bi-clock', tone: 'time' },
];

const HISTORY = [
  { test: 'Listening Test 45', skill: 'Listening', score: '5.5', date: '09/06/2026', status: 'Hoàn thành' },
  { test: 'Reading Test 42', skill: 'Reading', score: '6.0', date: '08/06/2026', status: 'Hoàn thành' },
  { test: 'Writing Task 2 - Essays', skill: 'Writing', score: '5.0', date: '07/06/2026', status: 'Đã chấm' },
  { test: 'Speaking Part 1-3', skill: 'Speaking', score: '5.5', date: '07/06/2026', status: 'Hoàn thành' },
  { test: 'Listening Test 44', skill: 'Listening', score: '6.5', date: '05/06/2026', status: 'Hoàn thành' },
  { test: 'Reading Test 41', skill: 'Reading', score: '6.0', date: '04/06/2026', status: 'Hoàn thành' },
  { test: 'Writing Task 1 - Report', skill: 'Writing', score: '5.5', date: '02/06/2026', status: 'Đã chấm' },
  { test: 'Speaking Mock Test', skill: 'Speaking', score: '6.0', date: '01/06/2026', status: 'Hoàn thành' },
];

const FILTERS = ['Tất cả', 'Listening', 'Reading', 'Writing', 'Speaking'];

const PracticeHistoryPage = () => {
  const [filter, setFilter] = useState('Tất cả');

  const filtered = useMemo(
    () => (filter === 'Tất cả' ? HISTORY : HISTORY.filter((item) => item.skill === filter)),
    [filter],
  );

  return (
    <div className="iot-profile-page">
      <header className="iot-page-header">
        <div>
          <h1>Lịch sử luyện tập</h1>
          <p>Home <i className="bi bi-chevron-right"></i> Practice History</p>
        </div>
      </header>

      <div className="iot-stat-grid">
        {SUMMARY.map((item) => (
          <div className={`iot-stat-card iot-stat-card--${item.tone}`} key={item.label}>
            <div className="iot-stat-icon"><i className={`bi ${item.icon}`}></i></div>
            <div className="iot-stat-body">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.helper}</small>
            </div>
          </div>
        ))}
      </div>

      <section className="iot-card">
        <div className="iot-card__header">
          <div className="iot-card__title">
            <i className="bi bi-clock-history"></i>
            <h2>Tất cả bài luyện tập</h2>
          </div>
        </div>

        <div className="iot-filter-row">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={`iot-filter-chip ${filter === item ? 'active' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="iot-history-table">
          <div className="iot-history-head">
            <span>Tên bài luyện tập</span>
            <span>Kỹ năng</span>
            <span>Điểm số</span>
            <span>Ngày</span>
            <span>Trạng thái</span>
          </div>
          {filtered.map((item) => (
            <div className="iot-history-row" key={`${item.test}-${item.date}`}>
              <strong>{item.test}</strong>
              <span className="iot-history-skill">{item.skill}</span>
              <span>{item.score}</span>
              <span>{item.date}</span>
              <span className="iot-badge iot-badge--success">{item.status}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="iot-empty-state">
              <i className="bi bi-inbox"></i>
              <p>Chưa có bài luyện tập nào cho kỹ năng này.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PracticeHistoryPage;
