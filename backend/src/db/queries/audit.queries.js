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
 * @param {boolean} [data.can_undo=false] - Whether the action can be reverted
 * @returns {Promise<Object>} Inserted audit log row
 */
const insertAuditLog = async (pool, data) => {
    const {
        actor_id,
        action,
        target_table,
        target_id,
        old_value,
        new_value,
        ip_address,
        can_undo = false
    } = data;

    const query = `
        INSERT INTO audit_logs (
            actor_id,
            action,
            target_table,
            target_id,
            old_value,
            new_value,
            ip_address,
            can_undo
        ) VALUES (
            $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8
        )
        RETURNING *
    `;

    const values = [
        actor_id || null,
        action,
        target_table,
        target_id || null,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        ip_address || null,
        Boolean(can_undo)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
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
 * @param {string} [filters.status] - applied|undone
 * @param {string} [filters.from] - ISO start date
 * @param {string} [filters.to] - ISO end date
 * @param {string} [filters.search] - Search actor or target labels
 * @returns {Promise<{rows: Array, total: number}>}
 */
const listAuditLogs = async (pool, filters = {}) => {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const queryParams = [];
    let whereClauses = [];
    let paramIndex = 1;

    if (filters.actor_id) {
        whereClauses.push(`audit_logs.actor_id = $${paramIndex++}`);
        queryParams.push(filters.actor_id);
    }
    
    if (filters.action) {
        whereClauses.push(`audit_logs.action = $${paramIndex++}`);
        queryParams.push(filters.action);
    }

    if (filters.target_table) {
        whereClauses.push(`audit_logs.target_table = $${paramIndex++}`);
        queryParams.push(filters.target_table);
    }

    if (filters.target_id) {
        whereClauses.push(`audit_logs.target_id = $${paramIndex++}`);
        queryParams.push(filters.target_id);
    }

    if (filters.status === 'applied') {
        whereClauses.push('audit_logs.undone_at IS NULL');
    }

    if (filters.status === 'undone') {
        whereClauses.push('audit_logs.undone_at IS NOT NULL');
    }

    if (filters.from) {
        whereClauses.push(`audit_logs.created_at >= $${paramIndex++}`);
        queryParams.push(filters.from);
    }

    if (filters.to) {
        whereClauses.push(`audit_logs.created_at <= $${paramIndex++}`);
        queryParams.push(filters.to);
    }

    if (filters.search) {
        whereClauses.push(`(
            audit_logs.action::text ILIKE $${paramIndex}
            OR audit_logs.target_table ILIKE $${paramIndex}
            OR actor.email ILIKE $${paramIndex}
            OR actor.full_name ILIKE $${paramIndex}
            OR target_user.email ILIKE $${paramIndex}
            OR target_user.full_name ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
    }

    // severityActions: filter chỉ lấy những action thuộc nhóm 'suspicious' hoặc 'normal'
    if (filters.severityActions && Array.isArray(filters.severityActions) && filters.severityActions.length > 0) {
        const placeholders = filters.severityActions.map(() => `$${paramIndex++}`).join(', ');
        whereClauses.push(`audit_logs.action = ANY(ARRAY[${placeholders}]::log_action[])`);
        queryParams.push(...filters.severityActions);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const joinString = `
        LEFT JOIN users actor ON actor.id = audit_logs.actor_id
        LEFT JOIN users target_user ON target_user.id = audit_logs.target_id
    `;

    const countQuery = `SELECT COUNT(*) FROM audit_logs ${joinString} ${whereString}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
        SELECT 
            audit_logs.id,
            audit_logs.actor_id,
            audit_logs.action,
            audit_logs.target_table,
            audit_logs.target_id,
            audit_logs.old_value,
            audit_logs.new_value,
            audit_logs.ip_address,
            audit_logs.created_at,
            audit_logs.can_undo,
            audit_logs.undone_at,
            audit_logs.undone_by,
            audit_logs.undo_log_id,
            actor.full_name AS actor_name,
            actor.email AS actor_email,
            target_user.full_name AS target_user_name,
            target_user.email AS target_user_email
        FROM audit_logs
        ${joinString}
        ${whereString}
        ORDER BY audit_logs.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataParams = [...queryParams, limit, offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    return {
        rows: dataResult.rows,
        total
    };
};

const getAuditLogById = async (pool, id) => {
    const query = `
        SELECT
            audit_logs.id,
            audit_logs.actor_id,
            audit_logs.action,
            audit_logs.target_table,
            audit_logs.target_id,
            audit_logs.old_value,
            audit_logs.new_value,
            audit_logs.ip_address,
            audit_logs.created_at,
            audit_logs.can_undo,
            audit_logs.undone_at,
            audit_logs.undone_by,
            audit_logs.undo_log_id,
            actor.full_name AS actor_name,
            actor.email AS actor_email,
            target_user.full_name AS target_user_name,
            target_user.email AS target_user_email,
            undo_actor.full_name AS undone_by_name,
            undo_actor.email AS undone_by_email
        FROM audit_logs
        LEFT JOIN users actor ON actor.id = audit_logs.actor_id
        LEFT JOIN users target_user ON target_user.id = audit_logs.target_id
        LEFT JOIN users undo_actor ON undo_actor.id = audit_logs.undone_by
        WHERE audit_logs.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

const markAuditLogUndone = async (pool, { id, undone_by, undo_log_id }) => {
    const result = await pool.query(
        `UPDATE audit_logs
         SET undone_at = NOW(),
             undone_by = $2,
             undo_log_id = $3
         WHERE id = $1
         RETURNING *`,
        [id, undone_by, undo_log_id]
    );
    return result.rows[0] || null;
};

const getAuditLogSummary = async (pool) => {
    const result = await pool.query(`
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE can_undo = TRUE AND undone_at IS NULL)::int AS undoable,
            COUNT(*) FILTER (WHERE undone_at IS NOT NULL)::int AS undone
        FROM audit_logs
    `);

    return result.rows[0];
};

const getActivityLogStats = async (pool) => {
    const result = await pool.query(`
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
                WHERE action IN (
                    'login_failed', 'account_locked', 'user_deactivated',
                    'role_changed', 'password_changed_by_admin', 'permission_denied'
                )
            )::int AS suspicious,
            COUNT(*) FILTER (WHERE action = 'login_failed')::int AS failed_logins
        FROM audit_logs
    `);

    return result.rows[0];
};

module.exports = {
    insertAuditLog,
    listAuditLogs,
    getAuditLogById,
    markAuditLogUndone,
    getAuditLogSummary,
    getActivityLogStats
};
