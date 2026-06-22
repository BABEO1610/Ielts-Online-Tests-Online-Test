const multer = require('multer');
const AppError = require('../utils/AppError');

// Dùng memoryStorage — file sẽ được upload lên Supabase Storage
// thay vì lưu xuống disk local.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Extract base MIME type (ignore codecs like audio/webm;codecs=opus)
  const mimeType = file.mimetype.split(';')[0].trim();

  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/ogg',
    'audio/webm'
  ];

  if (allowedMimeTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file format. Only audio files are allowed.', 400, 'INVALID_FORMAT'));
  }
};

const uploadSpeakingAudio = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Wrapper to handle Multer errors properly
const uploadMiddleware = (req, res, next) => {
  const upload = uploadSpeakingAudio.single('audio_file');
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large (Max 50MB).', 413, 'FILE_TOO_LARGE'));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = uploadMiddleware;

