import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

const formatLabel = (value) => {
  if (!value) return '-';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function TutorTestManagePage() {
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTests = async () => {
    try {
      const res = await testService.getTests({ tutor: true });
      if (res.success) {
        setTests(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tests', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleDeleteTest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;

    try {
      const res = await testService.deleteTest(id);
      if (res.success) {
        setTests(prev => prev.filter(t => t.id !== id));
      } else {
        alert('Failed to delete test: ' + (res.error?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to delete test', err);
      alert('An error occurred while deleting the test');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <span className="badge-status published">Published</span>;
      case 'draft':
        return <span className="badge-status draft" style={{backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.875rem', fontWeight: 500}}>Draft</span>;
      case 'pending':
        return <span className="badge-status pending" style={{backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.875rem', fontWeight: 500}}>Pending Review</span>;
      case 'rejected':
        return <span className="badge-status rejected" style={{backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.875rem', fontWeight: 500}}>Rejected</span>;
      default:
        return <span className="badge-status">{status}</span>;
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="page-heading" style={{ marginBottom: 0 }}>
          <h1>Test management</h1>
          <p>Create, edit, and manage your mock tests.</p>
        </div>
        {/* 📌 [SWIMLANE L2-B1 | STT 1] Button: + Create test
             Loại: <Link> styled as button | Dòng gốc: L70–L72
             Action: navigate → '/tutor/tests/new' (tạo đề mới)
             id="btn-create-test" — điểm vào của luồng Exam Builder */}
        <Link to="/tutor/tests/new" className="button-primary" id="btn-create-test" style={{ width: 'auto', padding: '12px 28px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          + Create test
        </Link>
      </div>

      <div className="filter-bar">
        {/* 📌 [SWIMLANE L2-B1 | STT 2] Dropdown: All Status
             Loại: <select> | Dòng gốc: L76–L81
             Options: All Status, Published, Pending Review, Draft
             Ghi chú: chỉ là filter UI, chưa nối logic (defaultValue="") */}
        <select id="filter-tutor-status" defaultValue="">
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="pending">Pending Review</option>
          <option value="draft">Draft</option>
        </select>
        {/* 📌 [SWIMLANE L2-B1 | STT 3] Dropdown: All Skills
             Loại: <select> | Dòng gốc: L82–L88
             Options: All Skills, Reading, Listening, Writing, Speaking
             Ghi chú: chỉ là filter UI, chưa nối logic (defaultValue="") */}
        <select id="filter-tutor-skill" defaultValue="">
          <option value="">All Skills</option>
          <option value="reading">Reading</option>
          <option value="listening">Listening</option>
          <option value="writing">Writing</option>
          <option value="speaking">Speaking</option>
        </select>
      </div>

      <div className="card-content tutor-test-card p-0">
        <div className="table-responsive">
          <table className="table tutor-table mb-0" id="tutor-test-table">
            <thead>
              <tr>
                <th className="col-index">#</th>
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
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">Loading tests...</td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">No tests found. Create your first test!</td>
                </tr>
              ) : (
                tests.map((t, idx) => (
                  <tr key={t.id} id={`tutor-row-${t.id}`}>
                    <td className="col-index">{idx + 1}</td>
                    <td><span className="test-title-cell">{t.title}</span></td>
                    <td><span className="badge-skill">{formatLabel(t.skill)}</span></td>
                    <td><span className="badge-difficulty">{formatLabel(t.difficulty)}</span></td>
                    <td className="text-nowrap">{t.skill === 'writing' ? '2 tasks' : `${t.questions || 0}/40`}</td>
                    <td>
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="body-sm text-nowrap" style={{ color: 'var(--body)' }}>{t.createdAt}</td>
                    <td>
                      <div className="tutor-table-actions">
                        {/* 📌 [SWIMLANE L2-B1 | STT 4] Button: Edit
                             Loại: <Link> | Dòng gốc: L129
                             Action: navigate → '/tutor/tests/:id/edit'
                             id="btn-edit-{id}" */}
                        <Link to={`/tutor/tests/${t.id}/edit`} className="table-action-btn" id={`btn-edit-${t.id}`}>Edit</Link>
                        {/* 📌 [SWIMLANE L2-B1 | STT 5] Button: Delete
                             Loại: <button class="danger"> | Dòng gốc: L130
                             Action: onClick → handleDeleteTest(id)
                                     → window.confirm → testService.deleteTest(id)
                                     → filter state (xóa khỏi list)
                             Swimlane: nếu FK có test_attempts → block xóa → UI hiện lỗi
                             id="btn-delete-{id}" */}
                        <button className="table-action-btn danger" id={`btn-delete-${t.id}`} onClick={() => handleDeleteTest(t.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TutorTestManagePage;
