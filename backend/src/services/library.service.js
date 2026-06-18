const path = require('path');
const fs = require('fs');
const libraryQueries = require('../db/queries/library.queries');
const AppError = require('../utils/AppError');

// MIME → resource_type enum mapping (theo DB schema)
const MIME_TO_RESOURCE_TYPE = {
  'application/pdf': 'pdf',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'video/mp4': 'video',
  'image/jpeg': 'other',
  'image/png': 'other',
  'image/gif': 'other',
};

/**
 * Validate magic bytes của file (SEC-04)
 * file-type v19 là ESM-only → dùng dynamic import()
 * @param {string} filePath - đường dẫn tuyệt đối tới file đã lưu
 * @returns {string} MIME type thực của file
 */
async function validateFileMagicBytes(filePath) {
  const { fileTypeFromBuffer } = await import('file-type');
  const buffer = await fs.promises.readFile(filePath);
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
 * Xóa file vật lý khỏi disk
 * @param {string} fileUrl - URL dạng /uploads/library/xxx.pdf
 */
async function deleteFileFromDisk(fileUrl) {
  try {
    const relativePath = fileUrl.replace(/^\//, '');
    const absolutePath = path.resolve(__dirname, '../../', relativePath);
    await fs.promises.unlink(absolutePath);
  } catch {
    // File đã bị xóa hoặc không tồn tại — không throw
  }
}

/**
 * Lấy danh sách tài liệu của tutor đang đăng nhập
 */
async function listResources(tutorId, category) {
  const cat = (!category || category === 'All') ? null : category;
  return libraryQueries.getResourcesByUploader(tutorId, cat);
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
  const actualMime = await validateFileMagicBytes(file.path);
  const resourceType = MIME_TO_RESOURCE_TYPE[actualMime] || 'other';

  const fileUrl = `/uploads/library/${file.filename}`;

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
 * Cập nhật metadata tài liệu (không thay file)
 */
async function updateResource(resourceId, tutorId, fields) {
  const { title, description, category } = fields;

  const existing = await libraryQueries.getResourceById(resourceId, tutorId);
  if (!existing) {
    throw new AppError('Không tìm thấy tài liệu hoặc bạn không có quyền chỉnh sửa.', 404, 'RESOURCE_NOT_FOUND');
  }

  const updated = await libraryQueries.updateResource(resourceId, tutorId, {
    title,
    description,
    category: category || null,
  });

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
  await deleteFileFromDisk(deleted.file_url);

  return deleted;
}

module.exports = {
  listResources,
  getResourceDetail,
  createResource,
  updateResource,
  deleteResource,
};
