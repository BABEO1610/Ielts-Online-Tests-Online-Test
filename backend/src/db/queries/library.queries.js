// Raw SQL queries cho library_resources — NO ORM, parameterized only

const { pool } = require('../pool');

/**
 * Lấy danh sách tài liệu của một tutor (có filter theo category)
 * @param {string} uploadedBy - UUID của tutor
 * @param {string|null} category - filter category (hoặc null = tất cả)
 */
async function getResourcesByUploader(uploadedBy, category = null) {
  if (category) {
    const result = await pool.query(
      `SELECT id, title, description, resource_type, file_url, file_size_bytes,
              category, is_published, review_status, created_at, updated_at
       FROM library_resources
       WHERE uploaded_by = $1 AND category = $2
       ORDER BY updated_at DESC`,
      [uploadedBy, category]
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT id, title, description, resource_type, file_url, file_size_bytes,
            category, is_published, review_status, created_at, updated_at
     FROM library_resources
     WHERE uploaded_by = $1
     ORDER BY updated_at DESC`,
    [uploadedBy]
  );
  return result.rows;
}

/**
 * Lấy một tài liệu theo ID (kết hợp kiểm tra chủ sở hữu)
 * @param {string} id - UUID của resource
 * @param {string} uploadedBy - UUID của tutor (để kiểm tra ownership)
 */
async function getResourceById(id, uploadedBy) {
  const result = await pool.query(
    `SELECT id, title, description, resource_type, file_url, file_size_bytes,
            category, is_published, review_status, created_at, updated_at
     FROM library_resources
     WHERE id = $1 AND uploaded_by = $2`,
    [id, uploadedBy]
  );
  return result.rows[0] || null;
}

/**
 * Tạo một tài liệu mới
 * @param {Object} data - { title, description, resource_type, file_url, file_size_bytes, category, uploaded_by }
 */
async function createResource(data) {
  const { title, description, resource_type, file_url, file_size_bytes, category, uploaded_by } = data;
  const result = await pool.query(
    `INSERT INTO library_resources
       (title, description, resource_type, file_url, file_size_bytes, category, uploaded_by, is_published, review_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'pending')
     RETURNING id, title, description, resource_type, file_url, file_size_bytes,
               category, is_published, review_status, created_at, updated_at`,
    [title, description || null, resource_type, file_url, file_size_bytes || null, category || null, uploaded_by]
  );
  return result.rows[0];
}

/**
 * Cập nhật thông tin tài liệu (chỉ metadata, không thay file)
 * @param {string} id - UUID
 * @param {string} uploadedBy - UUID tutor (ownership check)
 * @param {Object} data - { title, description, category }
 */
async function updateResource(id, uploadedBy, data) {
  const { title, description, category } = data;
  const result = await pool.query(
    `UPDATE library_resources
     SET title = $1, description = $2, category = $3, updated_at = NOW()
     WHERE id = $4 AND uploaded_by = $5
     RETURNING id, title, description, resource_type, file_url, file_size_bytes,
               category, is_published, review_status, created_at, updated_at`,
    [title, description || null, category || null, id, uploadedBy]
  );
  return result.rows[0] || null;
}

/**
 * Xóa một tài liệu (hard delete — file_url phải được xóa ở service layer trước)
 * @param {string} id - UUID
 * @param {string} uploadedBy - UUID tutor
 * @returns {boolean} true nếu xóa thành công
 */
async function deleteResource(id, uploadedBy) {
  const result = await pool.query(
    `DELETE FROM library_resources
     WHERE id = $1 AND uploaded_by = $2
     RETURNING id, file_url`,
    [id, uploadedBy]
  );
  return result.rows[0] || null;
}

module.exports = {
  getResourcesByUploader,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
};
