/**
 * TestListPage.jsx — Task 4.1.1
 * Trang danh sách đề thi (Student View)
 * 
 * Giao diện dạng lưới (grid) hiển thị card các bài test (Title, Skill, Difficulty).
 * Có form lọc bên trên. Phân trang bên dưới.
 * 
 * Bootstrap 5 classes: row, col-md-4, card, badge, form inputs.
 * Design: Uber-inspired từ DESIGN.md — black/white duet, pill shapes, Inter font.
 */
import React, { useState } from 'react';
import '../../styles/objective-testing.css';

/* Mock data — sẽ thay bằng API call khi tích hợp backend */
const MOCK_TESTS = [
  { id: '1', title: 'Cambridge IELTS 18 — Reading Test 1', skill: 'reading', difficulty: 'intermediate', questionCount: 40, duration: 60, description: 'Practice with authentic IELTS reading passages from Cambridge 18.' },
  { id: '2', title: 'Cambridge IELTS 18 — Listening Test 1', skill: 'listening', difficulty: 'intermediate', questionCount: 40, duration: 30, description: 'Full listening test with 4 sections from Cambridge 18.' },
  { id: '3', title: 'Academic Reading — Coral Reefs', skill: 'reading', difficulty: 'advanced', questionCount: 40, duration: 60, description: 'Advanced reading passages about marine ecosystems.' },
  { id: '4', title: 'Listening Practice — Campus Life', skill: 'listening', difficulty: 'beginner', questionCount: 40, duration: 30, description: 'Beginner-friendly listening about university campus scenarios.' },
  { id: '5', title: 'Reading Mini Test — Technology', skill: 'reading', difficulty: 'beginner', questionCount: 40, duration: 60, description: 'Technology-focused reading passages for beginners.' },
  { id: '6', title: 'IELTS 17 — Listening Test 3', skill: 'listening', difficulty: 'advanced', questionCount: 40, duration: 30, description: 'Challenging listening test from Cambridge 17.' },
];

const ITEMS_PER_PAGE = 6;

function TestListPage() {
  const [skillFilter, setSkillFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  /* Lọc danh sách */
  const filtered = MOCK_TESTS.filter((t) => {
    if (skillFilter && t.skill !== skillFilter) return false;
    if (difficultyFilter && t.difficulty !== difficultyFilter) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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

      {/* Test Cards Grid */}
      <div className="row g-3">
        {paged.length === 0 && (
          <div className="col-12 text-center py-5">
            <p className="body-md" style={{ color: 'var(--body)' }}>No tests match your filters.</p>
          </div>
        )}
        {paged.map((test) => (
          <div className="col-md-4" key={test.id}>
            <div className="test-card" id={`test-card-${test.id}`}>
              <div className="card-meta">
                <span className="badge-skill">{test.skill}</span>
                <span className="badge-difficulty">{test.difficulty}</span>
              </div>
              <div className="card-title">{test.title}</div>
              <p className="body-sm" style={{ color: 'var(--body)', flex: 1 }}>{test.description}</p>
              <div className="d-flex justify-content-between align-items-center mt-auto pt-3" style={{ borderTop: '1px solid var(--surface-pressed)' }}>
                <span className="body-sm" style={{ color: 'var(--mute)' }}>
                  {test.questionCount} questions · {test.duration} min
                </span>
                <a
                  href={`/tests/${test.id}`}
                  className="button-primary"
                  id={`btn-view-${test.id}`}
                  style={{ width: 'auto', padding: '8px 20px', textDecoration: 'none' }}
                >
                  View
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
