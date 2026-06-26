const multer = require('multer');
const AppError = require('../utils/AppError');

// Dùng memoryStorage — file sẽ được upload lên Supabase Storage
// thay vì lưu xuống disk local.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Extract base MIME type
  const mimeType = file.mimetype.split(';')[0].trim();

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file format. Only images (jpeg, png, gif, webp) are allowed.', 400, 'INVALID_FORMAT'));
  }
};

const uploadAvatarImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Wrapper to handle Multer errors properly
const uploadImageMiddleware = (req, res, next) => {
  const upload = uploadAvatarImage.single('avatar');
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large (Max 5MB).', 413, 'FILE_TOO_LARGE'));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = uploadImageMiddleware;
