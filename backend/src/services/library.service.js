const pool = require('../db/pool');
const AppError = require('../utils/AppError');

class LibraryService {
  /**
   * Lấy danh sách tài liệu thư viện đã duyệt
   */
  async getApprovedResources({ page = 1, limit = 10, search = '', resource_type = '' }) {
    const offset = (page - 1) * limit;
    const values = [];
    
    // Lưu ý: is_published = true và review_status = 'approved'
    let query = `
      SELECT 
        id, title, description, resource_type, file_url, file_size_bytes, 
        uploaded_by, is_published, created_at, updated_at, review_status
      FROM library_resources
      WHERE is_published = true AND review_status = 'approved'
    `;

    if (search) {
      values.push(`%${search}%`);
      query += ` AND (title ILIKE $${values.length} OR description ILIKE $${values.length})`;
    }

    if (resource_type) {
      values.push(resource_type);
      query += ` AND resource_type = $${values.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    // Get count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM library_resources
      WHERE is_published = true AND review_status = 'approved'
    `;
    const countValues = [];

    if (search) {
      countValues.push(`%${search}%`);
      countQuery += ` AND (title ILIKE $${countValues.length} OR description ILIKE $${countValues.length})`;
    }
    
    if (resource_type) {
      countValues.push(resource_type);
      countQuery += ` AND resource_type = $${countValues.length}`;
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, countValues)
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      resources: dataResult.rows,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy chi tiết tài liệu thư viện theo ID
   */
  async getResourceById(id) {
    const query = `
      SELECT *
      FROM library_resources
      WHERE id = $1 AND is_published = true AND review_status = 'approved'
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError('Không tìm thấy tài liệu hoặc tài liệu chưa được duyệt', 404);
    }

    return result.rows[0];
  }
}

module.exports = new LibraryService();
