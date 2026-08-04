const path = require('path');
const libraryQueries = require('../db/queries/library.queries');
const AppError = require('../utils/AppError');
const supabase = require('../config/supabase');

// MIME → resource_type enum mapping (theo DB schema)
const MIME_TO_RESOURCE_TYPE = {
  'application/pdf':             'pdf',
  'audio/mpeg':                  'audio',
  'audio/mp4':                   'audio',
  'audio/ogg':                   'audio',
  'audio/wav':                   'audio',
  'video/mp4':                   'video',
  'image/jpeg':                  'other',
  'image/png':                   'other',
  'image/gif':                   'other',
  // Archive
  'application/zip':             'other',
  'application/x-zip-compressed':'other',
  'application/x-zip':           'other',
  'application/x-rar-compressed':'other',
  'application/vnd.rar':         'other',
  'application/x-7z-compressed': 'other',
};

const LIBRARY_BUCKET = process.env.SUPABASE_LIBRARY_BUCKET || 'ieltszone_library';

/**
 * Validate magic bytes của file (SEC-04)
 * file-type v19 là ESM-only → dùng dynamic import()
 * Chốt chặn số 2: Đọc 4 byte vật lý đầu tiên của file (Magic Bytes) để xác minh định dạng thật.
 * Chống việc user cố tình đổi đuôi file mã độc thành .pdf hoặc .mp3 để qua mặt hệ thống.
 * @param {Buffer} buffer - buffer của file
 * @returns {Promise<string>} MIME type thực sự của file
 */
async function validateFileMagicBytes(buffer) {
  const { fileTypeFromBuffer } = await import('file-type');
  const result = await fileTypeFromBuffer(buffer);

  if (!result) {
    throw new AppError('Không thể xác định loại file. Vui lòng upload file hợp lệ.', 422, 'FILE_INVALID');
  }
  const allowed = Object.keys(MIME_TO_RESOURCE_TYPE);
  if (!allowed.includes(result.mime)) {
    throw new AppError(`Loại file không được hỗ trợ: ${result.mime}`, 422, 'FILE_TYPE_ERROR');
  }
  return result.mime;
}


/**
 * Xóa file khỏi Supabase Storage
 * @param {string} fileUrl - public URL của file trên Supabase
 */
async function deleteFileFromSupabase(fileUrl, suppressErrors = false) {
  try {
    if (!fileUrl || !fileUrl.includes('supabase.co')) return false;
    
    const bucketUrlPart = `${LIBRARY_BUCKET}/`;
    const pathIndex = fileUrl.indexOf(bucketUrlPart);
    if (pathIndex === -1) {
      throw new AppError('URL file Cloud không hợp lệ.', 502, 'STORAGE_URL_INVALID');
    }
    
    const filePath = decodeURIComponent(fileUrl.substring(pathIndex + bucketUrlPart.length));
    
    const { error } = await supabase
      .storage
      .from(LIBRARY_BUCKET)
      .remove([filePath]);
      
    if (error) {
      throw new AppError(`Không thể xóa file khỏi Cloud: ${error.message}`, 502, 'STORAGE_DELETE_ERROR');
    }
    return true;
  } catch (err) {
    if (suppressErrors) {
      console.error('Lỗi khi dọn file trên Supabase:', err.message);
      return false;
    }
    throw err;
  }
}

/**
 * Upload file lên Supabase Storage
 * @param {Object} file - multer memory file object
 * @returns {string} public URL của file
 */
async function uploadFileToSupabase(file, contentType) {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname);
  const fileName = `${uniqueSuffix}${ext}`;
  
  const { error } = await supabase
    .storage
    .from(LIBRARY_BUCKET)
    .upload(fileName, file.buffer, {
      contentType,
      upsert: false
    });

  if (error) {
    throw new AppError('Lỗi upload file lên Cloud: ' + error.message, 500, 'UPLOAD_ERROR');
  }

  const { data: publicUrlData } = supabase
    .storage
    .from(LIBRARY_BUCKET)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/**
 * Lấy TẤT CẢ tài liệu đã published — hiển thị cho toàn bộ team tutor
 * @param {string|null} category - filter category
 */
async function listResources(filters) {
  return libraryQueries.getAllResources(filters || {});
}

async function listMyResources(tutorId, filters) {
  return libraryQueries.getResourcesByUploader(tutorId, filters || {});
}

/**
 * Lấy chi tiết một tài liệu
 */
async function getResourceDetail(resourceId, tutorId) {
  const resource = await libraryQueries.getResourceById(resourceId, tutorId);
  if (!resource) {
    throw new AppError('Không tìm thấy tài liệu.', 404, 'RESOURCE_NOT_FOUND');
  }
  return resource;
}

async function getManagedResourceDetail(resourceId, userId, role) {
  const resource = await libraryQueries.getManagedResourceById(
    resourceId,
    userId,
    role === 'admin'
  );
  if (!resource) {
    throw new AppError('Không tìm thấy tài liệu hoặc bạn không có quyền truy cập.', 404, 'RESOURCE_NOT_FOUND');
  }
  return resource;
}

/**
 * Xử lý luồng upload tài liệu chính:
 * 1. Gọi validateFileMagicBytes để kiểm tra lõi file.
 * 2. Upload file lên Cloud (Supabase).
 * 3. Lưu thông tin (URL) vào Database.
 * ĐIỂM QUAN TRỌNG (Compensation Transaction): Nếu lưu DB thất bại, hệ thống tự động xóa file trên Cloud để không tạo ra rác dữ liệu mồ côi.
 * @param {Object} fields - { title, description, category }
 * @param {Object} file - multer file object
 * @param {string} tutorId - UUID của tutor
 */
async function createResource(fields, file, tutorId) {
  const { title, description, category } = fields;

  if (!file) {
    throw new AppError('Vui lòng upload ít nhất một file.', 422, 'FILE_REQUIRED');
  }

  // Validate magic bytes (SEC-04)
  const actualMime = await validateFileMagicBytes(file.buffer);
  const resourceType = MIME_TO_RESOURCE_TYPE[actualMime] || 'other';

  // Upload lên Supabase
  const fileUrl = await uploadFileToSupabase(file, actualMime);

  try {
    return await libraryQueries.createResource({
      title,
      description,
      resource_type: resourceType,
      file_url: fileUrl,
      file_size_bytes: file.size,
      category: category || null,
      uploaded_by: tutorId,
    });
  } catch (err) {
    await deleteFileFromSupabase(fileUrl, true);
    throw err;
  }
}

/**
 * Cập nhật tài liệu (có thể ghi đè file mới)
 * @param {string} resourceId 
 * @param {string} tutorId 
 * @param {Object} fields - { title, description, category }
 * @param {Object} [file] - multer file object (optional)
 */
async function updateResource(resourceId, tutorId, role, fields, file) {
  const { title, description, category } = fields;

  const isAdmin = role === 'admin';
  const existing = await libraryQueries.getManagedResourceById(resourceId, tutorId, isAdmin);
  if (!existing) {
    throw new AppError('Không tìm thấy tài liệu hoặc bạn không có quyền chỉnh sửa.', 404, 'RESOURCE_NOT_FOUND');
  }

  const updateData = {
    title,
    description,
    category: category || null,
  };

  let newFileUrl = null;
  if (file) {
    // Có file mới -> Validate và cập nhật DB, sau đó xóa file cũ
    const actualMime = await validateFileMagicBytes(file.buffer);
    updateData.resource_type = MIME_TO_RESOURCE_TYPE[actualMime] || 'other';
    newFileUrl = await uploadFileToSupabase(file, actualMime);
    updateData.file_url = newFileUrl;
    updateData.file_size_bytes = file.size;
  }

  let updated;
  try {
    updated = await libraryQueries.updateResource(resourceId, tutorId, updateData, isAdmin);
  } catch (err) {
    if (newFileUrl) await deleteFileFromSupabase(newFileUrl, true);
    throw err;
  }
  if (!updated) {
    if (newFileUrl) await deleteFileFromSupabase(newFileUrl, true);
    throw new AppError('Tài liệu đã thay đổi hoặc không còn tồn tại.', 409, 'RESOURCE_CONFLICT');
  }

  // Nếu cập nhật thành công và có file mới, xóa file cũ đi
  if (updated && file && existing.file_url) {
    await deleteFileFromSupabase(existing.file_url, true);
  }

  return updated;
}

/**
 * Xóa tài liệu + file vật lý
 */
async function deleteResource(resourceId, tutorId, role) {
  const deleted = await libraryQueries.deleteResource(resourceId, tutorId, role === 'admin');
  if (!deleted) {
    throw new AppError('Không tìm thấy tài liệu hoặc bạn không có quyền xóa.', 404, 'RESOURCE_NOT_FOUND');
  }

  // Xóa file vật lý sau khi DB đã thành công
  await deleteFileFromSupabase(deleted.file_url);
  await libraryQueries.markStorageCleanupComplete(deleted.id);

  return deleted;
}

module.exports = {
  listResources,
  listMyResources,
  getResourceDetail,
  getManagedResourceDetail,
  createResource,
  updateResource,
  deleteResource,
  validateFileMagicBytes,
  uploadFileToSupabase,
  deleteFileFromSupabase,
};
