/**
 * TestListPage.jsx — Task 4.1.1
 * Trang danh sách đề thi (Student View)
 *
 * Load dữ liệu thật từ GET /api/v1/tests.
 * Giao diện dạng lưới (grid) hiển thị card các bài test (Title, Skill, Difficulty).
 * Có form lọc bên trên. Phân trang bên dưới.
 */
import React, { useState, useEffect } from 'react';
import { testService } from '../../services/test.service';
import '../../styles/objective-testing.css';

const ITEMS_PER_PAGE = 6;

function TestListPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [skillFilter, setSkillFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // EARS[Event]: WHEN page mounts THEN fetch tests from API
  useEffect(() => {
    let active = true;
    const fetchTests = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await testService.getTests();
        if (!active) return;
        if (res.success) {
          setTests(res.data || []);
        } else {
          setError(res.error?.message || 'Không thể tải danh sách đề thi.');
        }
      } catch (err) {
        if (active) setError(err.message || 'Lỗi kết nối đến server.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTests();
    return () => { active = false; };
  }, []);

  /* Lọc danh sách */
  const filtered = tests.filter((t) => {
    if (skillFilter && t.skill !== skillFilter) return false;
    if (difficultyFilter && t.difficulty !== difficultyFilter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Chỉ hiển thị bài test đã published cho student
    if (t.status && t.status !== 'published') return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="container py-4" style={{ maxWidth: 1200 }}>
      {/* Page Heading */}
      <div className="page-heading">
        <h1>Mock Tests</h1>
        <p>Choose a test to practice your IELTS Reading or Listening skills.</p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          id="filter-search"
          type="text"
          placeholder="Search tests..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          style={{ minWidth: 220 }}
        />
        <select
          id="filter-skill"
          value={skillFilter}
          onChange={(e) => { setSkillFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Skills</option>
          <option value="reading">Reading</option>
          <option value="listening">Listening</option>
          <option value="writing">Writing</option>
          <option value="speaking">Speaking</option>
        </select>
        <select
          id="filter-difficulty"
          value={difficultyFilter}
          onChange={(e) => { setDifficultyFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-dark me-3" role="status" aria-hidden="true" />
          <span className="body-md" style={{ color: 'var(--body)' }}>Đang tải đề thi...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="alert alert-danger d-flex align-items-center rounded-3 my-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2" />
          {error}
        </div>
      )}

      {/* Test Cards Grid */}
      {!loading && !error && (
        <div className="row g-3">
          {paged.length === 0 && (
            <div className="col-12 text-center py-5">
              <i className="bi bi-journal-x fs-1 text-secondary mb-3 d-block" />
              <p className="body-md" style={{ color: 'var(--body)' }}>
                {tests.length === 0
                  ? 'Chưa có đề thi nào được đăng tải.'
                  : 'Không có đề thi nào phù hợp với bộ lọc.'}
              </p>
            </div>
          )}
          {paged.map((test) => (
            <div className="col-md-4" key={test.id}>
              <div className="test-card" id={`test-card-${test.id}`}>
                <div className="card-meta">
                  <span className="badge-skill">{test.skill}</span>
                  {test.difficulty && <span className="badge-difficulty">{test.difficulty}</span>}
                </div>
                <div className="card-title">{test.title}</div>
                <p className="body-sm" style={{ color: 'var(--body)', flex: 1 }}>
                  {test.description || `Bài thi ${test.skill} — ${test.questions ?? 0} câu hỏi`}
                </p>
                <div className="d-flex justify-content-between align-items-center mt-auto pt-3" style={{ borderTop: '1px solid var(--surface-pressed)' }}>
                  <span className="body-sm" style={{ color: 'var(--mute)' }}>
                    {test.questions ?? 0} câu · {test.duration ? `${test.duration} phút` : '—'}
                  </span>
                  <a
                    href={`/tests/${test.id}`}
                    className="button-primary"
                    id={`btn-view-${test.id}`}
                    style={{ width: 'auto', padding: '8px 20px', textDecoration: 'none' }}
                  >
                    Xem
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <nav className="d-flex justify-content-center mt-4" aria-label="Test list pagination">
          <ul className="pagination" style={{ gap: 4 }}>
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                id="pagination-prev"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ borderRadius: 'var(--rounded-pill)', border: '1px solid var(--surface-pressed)' }}
              >
                ‹
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                <button
                  className="page-link"
                  id={`pagination-page-${page}`}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    borderRadius: 'var(--rounded-pill)',
                    border: '1px solid var(--surface-pressed)',
                    background: currentPage === page ? 'var(--ink)' : 'var(--canvas)',
                    color: currentPage === page ? 'var(--on-primary)' : 'var(--ink)',
                  }}
                >
                  {page}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                id="pagination-next"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ borderRadius: 'var(--rounded-pill)', border: '1px solid var(--surface-pressed)' }}
              >
                ›
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

export default TestListPage;

