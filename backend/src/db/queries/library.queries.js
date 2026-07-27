// Raw SQL queries cho library_resources — NO ORM, parameterized only

const { pool } = require('../pool');

/**
 * Lấy danh sách tài liệu của một tutor (có filter theo category)
 * @param {string} uploadedBy - UUID của tutor
 * @param {string|null} category - filter category (hoặc null = tất cả)
 */
/**
 * Lấy TẤT CẢ tài liệu đã published — dùng chung cho cả team tutor
 * @param {string|null} category - filter category (hoặc null = tất cả)
 */
async function getAllResources(filters = {}) {
  const { category, search, resource_type } = typeof filters === 'string'
    ? { category: filters }
    : (filters || {});

  const conditions = [];
  const values = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    values.push(category);
  }
  if (resource_type) {
    conditions.push(`resource_type = $${idx++}`);
    values.push(resource_type);
  }
  if (search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    values.push(`%${search}%`);
  }

  // Filter out unpublished or pending/rejected resources from the public library
  conditions.push(`is_published = TRUE`);
  conditions.push(`review_status = 'approved'`);
  conditions.push(`deleted_at IS NULL`);

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const result = await pool.query(
    `SELECT id, title, description, resource_type, file_url, file_size_bytes,
            category, is_published, review_status, uploaded_by, created_at, updated_at
     FROM library_resources
     ${whereClause}
     ORDER BY updated_at DESC`,
    values
  );
  return result.rows;
}

/**
 * Lấy danh sách tài liệu của một tutor cụ thể (my documents)
 * @param {string} uploadedBy - UUID của tutor
 * @param {string|null} category - filter category (hoặc null = tất cả)
 */
async function getResourcesByUploader(uploadedBy, filters = {}) {
  const { category, search, resource_type } = filters || {};
  const conditions = ['uploaded_by = $1', 'deleted_at IS NULL'];
  const values = [uploadedBy];

  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }
  if (resource_type) {
    values.push(resource_type);
    conditions.push(`resource_type = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  const result = await pool.query(
    `SELECT id, title, description, resource_type, file_url, file_size_bytes,
            category, is_published, review_status, uploaded_by, created_at, updated_at
     FROM library_resources
     WHERE ${conditions.join(' AND ')}
     ORDER BY updated_at DESC`,
    values
  );
  return result.rows;
}

/**
 * Lấy một tài liệu theo ID (kết hợp kiểm tra chủ sở hữu)
 * @param {string} id - UUID của resource
 * @param {string} uploadedBy - UUID của tutor (để kiểm tra ownership)
 */
async function getResourceById(id, uploadedBy) {
  // Public access: nếu không truyền uploadedBy, chỉ cần tìm theo id
  if (!uploadedBy) {
    const result = await pool.query(
      `SELECT id, title, description, resource_type, file_url, file_size_bytes,
              category, is_published, review_status, created_at, updated_at
       FROM library_resources
       WHERE id = $1 AND is_published = TRUE AND review_status = 'approved'
         AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
    `SELECT id, title, description, resource_type, file_url, file_size_bytes,
            category, is_published, review_status, created_at, updated_at
     FROM library_resources
     WHERE id = $1 AND uploaded_by = $2 AND deleted_at IS NULL`,
    [id, uploadedBy]
  );
  return result.rows[0] || null;
}

async function getManagedResourceById(id, uploadedBy, isAdmin = false) {
  const result = await pool.query(
    `SELECT id, title, description, resource_type, file_url, file_size_bytes,
            category, is_published, review_status, uploaded_by, created_at, updated_at
     FROM library_resources
     WHERE id = $1 AND deleted_at IS NULL
       AND ($3::boolean = TRUE OR uploaded_by = $2)`,
    [id, uploadedBy, isAdmin]
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
 * Cập nhật thông tin tài liệu (có thể cập nhật file đính kèm)
 * @param {string} id - UUID
 * @param {string} uploadedBy - UUID tutor (ownership check)
 * @param {Object} data - { title, description, category, resource_type, file_url, file_size_bytes }
 */
async function updateResource(id, uploadedBy, data, isAdmin = false) {
  const { title, description, category, resource_type, file_url, file_size_bytes } = data;
  let query = `
    UPDATE library_resources
    SET title = $1, description = $2, category = $3, updated_at = NOW()
  `;
  const values = [title, description || null, category || null];

  if (file_url) {
    query += `, resource_type = $4, file_url = $5, file_size_bytes = $6`;
    values.push(resource_type, file_url, file_size_bytes);
  }

  query += `
    WHERE id = $${values.length + 1}
      AND ($${values.length + 3}::boolean = TRUE OR uploaded_by = $${values.length + 2})
      AND deleted_at IS NULL
    RETURNING id, title, description, resource_type, file_url, file_size_bytes,
              category, is_published, review_status, created_at, updated_at
  `;
  values.push(id, uploadedBy, isAdmin);

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Soft-delete metadata; the service removes the physical object separately.
 * @param {string} id - UUID
 * @param {string} uploadedBy - UUID tutor
 * @returns {boolean} true nếu xóa thành công
 */
async function deleteResource(id, uploadedBy, isAdmin = false) {
  const result = await pool.query(
    `UPDATE library_resources
     SET deleted_at = COALESCE(deleted_at, NOW()),
         storage_cleanup_pending = TRUE,
         updated_at = NOW()
     WHERE id = $1 AND ($3::boolean = TRUE OR uploaded_by = $2)
       AND (deleted_at IS NULL OR storage_cleanup_pending = TRUE)
     RETURNING id, file_url`,
    [id, uploadedBy, isAdmin]
  );
  return result.rows[0] || null;
}

async function markStorageCleanupComplete(id) {
  await pool.query(
    `UPDATE library_resources
     SET storage_cleanup_pending = FALSE, updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  getAllResources,
  getResourcesByUploader,
  getResourceById,
  getManagedResourceById,
  createResource,
  updateResource,
  deleteResource,
  markStorageCleanupComplete,
};
