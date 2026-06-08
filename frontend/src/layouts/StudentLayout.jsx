import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const StudentLayout = () => {
  return (
    <div className="student-layout">
      <header style={{ padding: '1rem', background: '#e3f2fd' }}>
        <strong>Student Portal</strong>
      </header>
      <div style={{ display: 'flex', minHeight: '85vh' }}>
        <aside style={{ width: '250px', background: '#f1f8e9', padding: '1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/learning/dashboard">Dashboard</Link>
            <Link to="/learning/courses">My Courses</Link>
            <Link to="/learning/tests">My Tests</Link>
            <Link to="/learning/flashcards">Flashcards</Link>
          </nav>
        </aside>
        <main style={{ flex: 1, padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
