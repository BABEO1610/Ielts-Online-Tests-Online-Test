import React from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
  return (
    <div className="public-layout">
      <header style={{ padding: '1rem', background: '#f8f9fa' }}>
        <nav>
          <strong>IELTS Online</strong> | 
          <a href="/" style={{ marginLeft: 10 }}>Home</a> | 
          <a href="/courses" style={{ marginLeft: 10 }}>Courses</a> | 
          <a href="/login" style={{ marginLeft: 10 }}>Login</a>
        </nav>
      </header>
      <main style={{ minHeight: '80vh', padding: '2rem' }}>
        <Outlet />
      </main>
      <footer style={{ padding: '1rem', background: '#e9ecef', textAlign: 'center' }}>
        Public Footer &copy; 2026
      </footer>
    </div>
  );
};

export default PublicLayout;
