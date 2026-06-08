import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const TeacherLayout = () => {
  return (
    <div className="teacher-layout">
      <header style={{ padding: '1rem', background: '#fff3e0' }}>
        <strong>Teacher Portal</strong>
      </header>
      <div style={{ display: 'flex', minHeight: '85vh' }}>
        <aside style={{ width: '250px', background: '#fbe9e7', padding: '1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/teacher/dashboard">Dashboard</Link>
            <Link to="/teacher/courses">Manage Courses</Link>
            <Link to="/teacher/tests">Manage Tests</Link>
          </nav>
        </aside>
        <main style={{ flex: 1, padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
