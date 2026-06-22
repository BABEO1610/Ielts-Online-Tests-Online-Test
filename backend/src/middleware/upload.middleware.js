const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');

// Ensure directory exists
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // userId is required to separate temp files
    const userId = req.user?.id;
    if (!userId) {
      return cb(new AppError('Unauthorized access to upload', 401, 'UNAUTHORIZED'));
    }

    const tempDir = path.join(__dirname, '../../uploads/temp_audio', userId);
    ensureDir(tempDir);
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (!ext) {
      // Guess extension from mimetype if missing
      const mime = file.mimetype.split(';')[0].trim();
      if (mime === 'audio/webm') ext = '.webm';
      else if (mime === 'audio/mpeg') ext = '.mp3';
      else if (mime === 'audio/wav' || mime === 'audio/x-wav') ext = '.wav';
      else if (mime === 'audio/ogg') ext = '.ogg';
      else if (mime === 'audio/mp4' || mime === 'audio/m4a') ext = '.m4a';
      else ext = '.audio';
    }
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

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
