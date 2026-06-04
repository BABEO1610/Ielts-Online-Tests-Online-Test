/**
 * @file audit.queries.js
 * @description Audit logs database queries.
 * EARS[Ubiquitous]: THE system SHALL log all account state modifications into the `audit_logs` table.
 */

/**
 * Insert a new audit log record.
 * EARS[Ubiquitous]: THE system SHALL log all account state modifications into the `audit_logs` table.
 * 
 * @param {import('pg').Pool} pool - Database connection pool
 * @param {Object} data - Audit log data
 * @param {string|null} data.actor_id - UUID of the user performing the action (can be null for system actions)
 * @param {string} data.action - Action performed (from log_action enum)
 * @param {string} data.target_table - Table affected
 * @param {string|null} data.target_id - UUID of the affected record
 * @param {Object|null} data.old_value - JSON representation of the old state
 * @param {Object|null} data.new_value - JSON representation of the new state
 * @param {string|null} data.ip_address - IP address of the actor
 * @returns {Promise<void>}
 */
const insertAuditLog = async (pool, data) => {
    const {
        actor_id,
        action,
        target_table,
        target_id,
        old_value,
        new_value,
        ip_address
    } = data;

    const query = `
        INSERT INTO audit_logs (
            actor_id,
            action,
            target_table,
            target_id,
            old_value,
            new_value,
            ip_address
        ) VALUES (
            $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7
        )
    `;

    const values = [
        actor_id || null,
        action,
        target_table,
        target_id || null,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        ip_address || null
    ];

    await pool.query(query, values);
};

/**
 * List audit logs with pagination and filtering.
 * EARS[Ubiquitous]: THE system SHALL log all account state modifications into the `audit_logs` table.
 * 
 * @param {import('pg').Pool} pool - Database connection pool
 * @param {Object} filters - Pagination and filter parameters
 * @param {number} [filters.page=1] - Page number
 * @param {number} [filters.limit=20] - Number of items per page
 * @param {string} [filters.actor_id] - Filter by actor_id
 * @param {string} [filters.action] - Filter by action
 * @param {string} [filters.target_table] - Filter by target_table
 * @param {string} [filters.target_id] - Filter by target_id
 * @returns {Promise<{rows: Array, total: number}>}
 */
const listAuditLogs = async (pool, filters = {}) => {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, parseInt(filters.limit, 10) || 20);
    const offset = (page - 1) * limit;

    const queryParams = [];
    let whereClauses = [];
    let paramIndex = 1;

    if (filters.actor_id) {
        whereClauses.push(`actor_id = $${paramIndex++}`);
        queryParams.push(filters.actor_id);
    }
    
    if (filters.action) {
        whereClauses.push(`action = $${paramIndex++}`);
        queryParams.push(filters.action);
    }

    if (filters.target_table) {
        whereClauses.push(`target_table = $${paramIndex++}`);
        queryParams.push(filters.target_table);
    }

    if (filters.target_id) {
        whereClauses.push(`target_id = $${paramIndex++}`);
        queryParams.push(filters.target_id);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereString}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
        SELECT 
            id, actor_id, action, target_table, target_id, 
            old_value, new_value, ip_address, created_at
        FROM audit_logs
        ${whereString}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataParams = [...queryParams, limit, offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    return {
        rows: dataResult.rows,
        total
    };
};

module.exports = {
    insertAuditLog,
    listAuditLogs
};
