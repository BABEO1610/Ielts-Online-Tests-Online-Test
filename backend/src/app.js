// Đặt cái này ở dòng số 1 của app.js
const originalExit = process.exit;
process.exit = function (code) {
  console.trace(`🕵️ BẮT QUẢ TANG lệnh tắt server (Mã code: ${code}) được gọi từ đây:`);
  originalExit(code);
};
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('node:dns').setDefaultResultOrder('ipv4first'); // Fix lỗi UND_ERR_CONNECT_TIMEOUT do Node ưu tiên IPv6
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const apiV1Routes = require('./routes/api/v1');
const assistantRoutes = require('./api/assistant/assistant.routes');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Parse JSON bodies. Writing Task 1 images are stored as data URLs in test metadata.
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parse cookies
app.use(cookieParser());

// Serve uploaded files (ADR-004: local storage)
// Chỉ serve path /uploads — không expose toàn bộ filesystem
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API v1 routes
app.use('/api/v1', apiV1Routes);

// Mount spec-compatible assistant routes alongside the existing v1 API convention.
app.use('/api/assistant', assistantRoutes);

// Phục vụ các file tĩnh trong thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Handle 404
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global Error Handler
app.use(errorHandler);

const { testConnection } = require('./db/pool');

if (require.main === module) {
  const port = process.env.PORT || 3000;

  testConnection()
    .then(() => {
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    })
    .catch((err) => {
      console.error('[App] Database connection failed at startup:', err.message);
      // Keep process alive per user request
      app.listen(port, () => {
        console.log(`Server running on port ${port} (DB Connection Failed)`);
      });
    });
}

module.exports = app;
