const path = require('path');
const fs = require('fs');
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

/**
 * Validate magic bytes của file (SEC-04)
 * file-type v19 là ESM-only → dùng dynamic import()
 * @param {Buffer} buffer - buffer của file
 * @param {string} originalname - tên file gốc
 * @returns {string} MIME type thực của file
 */
async function validateFileMagicBytes(buffer, originalname) {
  const { fileTypeFromBuffer } = await import('file-type');
  const result = await fileTypeFromBuffer(buffer);

  // file-type đôi khi không detect được archive rõ ràng,
  // kiểm tra extension dự phòng để tránh bản rối
  const ext = require('path').extname(originalname).toLowerCase();
  const archiveExts = ['.zip', '.rar', '.7z'];
  if (!result && archiveExts.includes(ext)) {
    // Tin tưởng extension khởi nguồn từ multer đã filter MIME rồi
    return 'application/zip';
  }

  if (!result) {
    throw new AppError('Không thể xác định loại file. Vui lòng upload file hợp lệ.', 422, 'FILE_INVALID');
  }
  const allowed = Object.keys(MIME_TO_RESOURCE_TYPE);
  // Cho phép qua nếu là archive (zip magic bytes = PK)
  if (result.mime === 'application/zip') return result.mime;
  if (!allowed.includes(result.mime)) {
    throw new AppError(`Loại file không được hỗ trợ: ${result.mime}`, 422, 'FILE_TYPE_ERROR');
  }
  return result.mime;
}


/**
 * Xóa file khỏi Supabase Storage
 * @param {string} fileUrl - public URL của file trên Supabase
 */
async function deleteFileFromSupabase(fileUrl) {
  try {
    if (!fileUrl || !fileUrl.includes('supabase.co')) return;
    
    // Extract file path from URL (after 'ieltszone_library/')
    const bucketUrlPart = 'ieltszone_library/';
    const pathIndex = fileUrl.indexOf(bucketUrlPart);
    if (pathIndex === -1) return;
    
    const filePath = fileUrl.substring(pathIndex + bucketUrlPart.length);
    
    const { error } = await supabase
      .storage
      .from('ieltszone_library')
      .remove([filePath]);
      
    if (error) {
      console.error('Supabase remove error:', error.message);
    }
  } catch (err) {
    console.error('Lỗi khi xóa file trên Supabase:', err);
  }
}

/**
 * Upload file lên Supabase Storage
 * @param {Object} file - multer memory file object
 * @returns {string} public URL của file
 */
async function uploadFileToSupabase(file) {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname);
  const fileName = `${uniqueSuffix}${ext}`;
  
  const { data, error } = await supabase
    .storage
    .from('ieltszone_library')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw new AppError('Lỗi upload file lên Cloud: ' + error.message, 500, 'UPLOAD_ERROR');
  }

  const { data: publicUrlData } = supabase
    .storage
    .from('ieltszone_library')
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

/**
 * Tạo tài liệu mới + upload file
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
  const actualMime = await validateFileMagicBytes(file.buffer, file.originalname);
  const resourceType = MIME_TO_RESOURCE_TYPE[actualMime] || 'other';

  // Upload lên Supabase
  const fileUrl = await uploadFileToSupabase(file);

  const created = await libraryQueries.createResource({
    title,
    description,
    resource_type: resourceType,
    file_url: fileUrl,
    file_size_bytes: file.size,
    category: category || null,
    uploaded_by: tutorId,
  });

  return created;
}

/**
 * Cập nhật tài liệu (có thể ghi đè file mới)
 * @param {string} resourceId 
 * @param {string} tutorId 
 * @param {Object} fields - { title, description, category }
 * @param {Object} [file] - multer file object (optional)
 */
async function updateResource(resourceId, tutorId, fields, file) {
  const { title, description, category } = fields;

  const existing = await libraryQueries.getResourceById(resourceId, tutorId);
  if (!existing) {
    throw new AppError('Không tìm thấy tài liệu hoặc bạn không có quyền chỉnh sửa.', 404, 'RESOURCE_NOT_FOUND');
  }

  const updateData = {
    title,
    description,
    category: category || null,
  };

  if (file) {
    // Có file mới -> Validate và cập nhật DB, sau đó xóa file cũ
    const actualMime = await validateFileMagicBytes(file.buffer, file.originalname);
    updateData.resource_type = MIME_TO_RESOURCE_TYPE[actualMime] || 'other';
    updateData.file_url = await uploadFileToSupabase(file);
    updateData.file_size_bytes = file.size;
  }

  const updated = await libraryQueries.updateResource(resourceId, tutorId, updateData);

  // Nếu cập nhật thành công và có file mới, xóa file cũ đi
  if (updated && file && existing.file_url) {
    await deleteFileFromSupabase(existing.file_url);
  }

  return updated;
}

/**
 * Xóa tài liệu + file vật lý
 */
async function deleteResource(resourceId, tutorId) {
  const deleted = await libraryQueries.deleteResource(resourceId, tutorId);
  if (!deleted) {
    throw new AppError('Không tìm thấy tài liệu hoặc bạn không có quyền xóa.', 404, 'RESOURCE_NOT_FOUND');
  }

  // Xóa file vật lý sau khi DB đã thành công
  await deleteFileFromSupabase(deleted.file_url);

  return deleted;
}

module.exports = {
  listResources,
  getResourceDetail,
  createResource,
  updateResource,
  deleteResource,
};
