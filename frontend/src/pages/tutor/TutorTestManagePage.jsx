/**
 * TutorTestManagePage.jsx — Task 4.4.1
 * Trang Quản lý Đề thi (Tutor View)
 * 
 * Bảng danh sách tất cả đề (Published / Draft).
 * Nút Tạo mới, Sửa, Xóa. Badge trạng thái.
 * Bootstrap: table, btn-group, badge bg-warning/bg-success.
 */
import React from 'react';
import '../../styles/objective-testing.css';

const MOCK_TESTS = [
  { id: '1', title: 'Cambridge IELTS 18 — Reading Test 1', skill: 'reading', difficulty: 'intermediate', status: 'published', questions: 40, createdAt: '2026-05-20' },
  { id: '2', title: 'Cambridge IELTS 18 — Listening Test 1', skill: 'listening', difficulty: 'intermediate', status: 'published', questions: 40, createdAt: '2026-05-21' },
  { id: '3', title: 'Advanced Reading — Climate Change', skill: 'reading', difficulty: 'advanced', status: 'draft', questions: 28, createdAt: '2026-06-01' },
  { id: '4', title: 'Listening Mini — Travel Booking', skill: 'listening', difficulty: 'beginner', status: 'draft', questions: 15, createdAt: '2026-06-02' },
  { id: '5', title: 'IELTS 17 — Reading Test 2', skill: 'reading', difficulty: 'intermediate', status: 'published', questions: 40, createdAt: '2026-05-15' },
];

function TutorTestManagePage() {
  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="page-heading" style={{ marginBottom: 0 }}>
          <h1>Test management</h1>
          <p>Create, edit, and manage your mock tests.</p>
        </div>
        <a href="/tutor/tests/new" className="button-primary" id="btn-create-test" style={{ width: 'auto', padding: '12px 28px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          + Create test
        </a>
      </div>

      <div className="filter-bar">
        <select id="filter-tutor-status" defaultValue="">
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select id="filter-tutor-skill" defaultValue="">
          <option value="">All Skills</option>
          <option value="reading">Reading</option>
          <option value="listening">Listening</option>
        </select>
      </div>

      <div className="card-content p-0" style={{ overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table tutor-table mb-0" id="tutor-test-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Skill</th>
                <th>Difficulty</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TESTS.map((t, idx) => (
                <tr key={t.id} id={`tutor-row-${t.id}`}>
                  <td>{idx + 1}</td>
                  <td><span className="body-md-strong">{t.title}</span></td>
                  <td><span className="badge-skill">{t.skill}</span></td>
                  <td><span className="badge-difficulty">{t.difficulty}</span></td>
                  <td>{t.questions}/40</td>
                  <td>
                    <span className={`badge-status ${t.status}`}>
                      {t.status === 'published' ? '● Published' : '○ Draft'}
                    </span>
                  </td>
                  <td className="body-sm" style={{ color: 'var(--body)' }}>{t.createdAt}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <a href={`/tutor/tests/${t.id}/edit`} className="button-secondary" id={`btn-edit-${t.id}`} style={{ width: 'auto', padding: '4px 12px', fontSize: 13, border: '1px solid var(--surface-pressed)', textDecoration: 'none' }}>Edit</a>
                      <button className="button-secondary" id={`btn-delete-${t.id}`} style={{ width: 'auto', padding: '4px 12px', fontSize: 13, border: '1px solid var(--surface-pressed)', color: '#e02424' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TutorTestManagePage;
