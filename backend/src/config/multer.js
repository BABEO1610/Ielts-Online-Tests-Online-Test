const multer = require('multer');

// Sử dụng memoryStorage để lưu tạm file vào RAM trước khi upload lên Supabase
const storage = multer.memoryStorage();

// Filter MIME type sơ bộ tại multer — file-type sẽ validate magic bytes ở service
const allowedMimes = [
  'application/pdf',
  'audio/mpeg',                    // mp3
  'audio/mp4',                     // m4a
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  // Archive (đề thi tổng hợp nhiều file)
  'application/zip',               // zip — Windows/Mac
  'application/x-zip-compressed',  // zip — một số trình duyệt cũ
  'application/x-zip',
  'application/x-rar-compressed',  // rar
  'application/vnd.rar',           // rar — chuẩn IANA
  'application/x-7z-compressed',   // 7z
  'application/octet-stream',      // fallback cho một số trình duyệt
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
    fileSize: 200 * 1024 * 1024, // 200MB — ZIP có thể chứa cả PDF + audio
  },
});

module.exports = upload;
