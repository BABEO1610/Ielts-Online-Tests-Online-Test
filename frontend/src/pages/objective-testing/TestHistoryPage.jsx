/**
 * TestHistoryPage.jsx — Task 4.1.3
 * Trang Lịch sử thi (Student View)
 * 
 * Danh sách các lần thi dạng bảng. Có điểm số nổi bật.
 * Cột hành động "Xem chi tiết".
 * 
 * Bootstrap 5: table table-striped table-hover, labels hiển thị trạng thái điểm.
 * Design: Uber-inspired data table styling.
 */
import React from 'react';
import '../../styles/objective-testing.css';

/* Mock data */
const MOCK_HISTORY = [
  { id: 'a1', testTitle: 'Cambridge IELTS 18 — Reading Test 1', skill: 'reading', bandScore: 7.0, rawScore: 30, total: 40, date: '2026-06-03', duration: '54:32', mode: 'timed' },
  { id: 'a2', testTitle: 'Cambridge IELTS 18 — Listening Test 1', skill: 'listening', bandScore: 6.5, rawScore: 27, total: 40, date: '2026-06-02', duration: '28:15', mode: 'timed' },
  { id: 'a3', testTitle: 'Academic Reading — Coral Reefs', skill: 'reading', bandScore: 5.5, rawScore: 21, total: 40, date: '2026-06-01', duration: '59:58', mode: 'timed' },
  { id: 'a4', testTitle: 'Listening Practice — Campus Life', skill: 'listening', bandScore: 8.0, rawScore: 35, total: 40, date: '2026-05-30', duration: '25:00', mode: 'untimed' },
  { id: 'a5', testTitle: 'Reading Mini Test — Technology', skill: 'reading', bandScore: 6.0, rawScore: 24, total: 40, date: '2026-05-28', duration: '58:44', mode: 'timed' },
];

function getBandColor(band) {
  if (band >= 7.0) return { bg: '#edf7ed', color: '#1e4620' };
  if (band >= 5.5) return { bg: '#fff3cd', color: '#856404' };
  return { bg: '#fdf2f2', color: '#e02424' };
}

function TestHistoryPage() {
  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      <div className="page-heading">
        <h1>Test history</h1>
        <p>Review your past test attempts and track your progress.</p>
      </div>

      <div className="card-content p-0" style={{ overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table tutor-table mb-0" id="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Test name</th>
                <th>Skill</th>
                <th>Band Score</th>
                <th>Raw Score</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map((item, idx) => {
                const bandStyle = getBandColor(item.bandScore);
                return (
                  <tr key={item.id} id={`history-row-${item.id}`}>
                    <td>{idx + 1}</td>
                    <td>
                      <span className="body-md-strong">{item.testTitle}</span>
                    </td>
                    <td>
                      <span className="badge-skill">{item.skill}</span>
                    </td>
                    <td>
                      <span
                        className="badge-status"
                        style={{ background: bandStyle.bg, color: bandStyle.color, fontWeight: 700, fontSize: 16 }}
                      >
                        {item.bandScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="body-sm">{item.rawScore}/{item.total}</td>
                    <td className="body-sm" style={{ color: 'var(--body)' }}>{item.duration}</td>
                    <td className="body-sm" style={{ color: 'var(--body)' }}>{item.date}</td>
                    <td>
                      <a
                        href={`/results/${item.id}`}
                        className="button-primary"
                        id={`btn-detail-${item.id}`}
                        style={{ width: 'auto', padding: '6px 16px', fontSize: 13, textDecoration: 'none' }}
                      >
                        View details
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TestHistoryPage;
