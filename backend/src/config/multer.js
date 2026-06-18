const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục uploads/library tồn tại
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/library');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Tạo tên file duy nhất: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Filter MIME type sơ bộ tại multer — file-type sẽ validate magic bytes ở service
const allowedMimes = [
  'application/pdf',
  'audio/mpeg',       // mp3
  'audio/mp4',        // m4a
  'audio/ogg',
  'audio/wav',
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'application/octet-stream', // fallback cho một số trình duyệt
];

const fileFilter = (_req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(`File type not allowed: ${file.mimetype}`);
    err.statusCode = 422;
    err.code = 'FILE_TYPE_ERROR';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file (SEC-04)
  },
});

module.exports = upload;
