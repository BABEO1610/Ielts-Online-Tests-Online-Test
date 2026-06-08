import React from 'react';
import { Routes, Route } from 'react-router-dom';

import PublicLayout from '../layouts/PublicLayout';
import StudentLayout from '../layouts/StudentLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import AdminLayout from '../layouts/AdminLayout';

// Placeholder Components
const Home = () => <div><h2>Home Page</h2><p>Welcome to IELTS Online Tests</p></div>;
const Login = () => <div><h2>Login</h2><p>Login Form Goes Here</p></div>;
const Register = () => <div><h2>Register</h2><p>Register Form Goes Here</p></div>;
const ForgotPassword = () => <div><h2>Forgot Password</h2><p>Reset Password Form Goes Here</p></div>;
const Courses = () => <div><h2>Public Courses</h2><p>List of all courses</p></div>;
const CourseDetail = () => <div><h2>Course Detail</h2><p>Details for course</p></div>;

const StudentDashboard = () => <div><h2>Student Dashboard</h2><p>Overview of student progress</p></div>;
const StudentCourses = () => <div><h2>My Courses</h2><p>Enrolled courses</p></div>;
const StudentTests = () => <div><h2>My Tests</h2><p>Test history and ongoing tests</p></div>;
const StudentFlashcards = () => <div><h2>My Flashcards</h2><p>Vocabulary practice</p></div>;

const TeacherDashboard = () => <div><h2>Teacher Dashboard</h2><p>Overview of teaching stats</p></div>;
const TeacherCourses = () => <div><h2>Manage Courses</h2><p>Create and edit courses</p></div>;
const TeacherTests = () => <div><h2>Manage Tests</h2><p>Create and grade tests</p></div>;

const AdminDashboard = () => <div><h2>Admin Dashboard</h2><p>System overview</p></div>;
const AdminUsers = () => <div><h2>Manage Users</h2><p>List of all users</p></div>;
const AdminCourses = () => <div><h2>Manage Courses</h2><p>Moderate courses</p></div>;

const Error403 = () => <div><h2>403 - Forbidden</h2><p>You don't have permission to access this page.</p></div>;
const Error404 = () => <div><h2>404 - Not Found</h2><p>The page you're looking for doesn't exist.</p></div>;

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
      </Route>

      {/* Student/Learning Routes */}
      <Route path="/learning" element={<StudentLayout />}>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="tests" element={<StudentTests />} />
        <Route path="flashcards" element={<StudentFlashcards />} />
      </Route>

      {/* Teacher Routes */}
      <Route path="/teacher" element={<TeacherLayout />}>
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="tests" element={<TeacherTests />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="courses" element={<AdminCourses />} />
      </Route>

      {/* Error Routes */}
      <Route path="/403" element={<Error403 />} />
      <Route path="*" element={<Error404 />} />
    </Routes>
  );
};

export default AppRoutes;
