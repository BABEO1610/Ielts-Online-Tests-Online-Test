/**
 * @file audit.service.js
 * @description Service for managing audit logs.
 */

const { pool } = require('../db/pool');
const AppError = require('../utils/AppError');
const {
    insertAuditLog,
    listAuditLogs,
    getAuditLogById,
    markAuditLogUndone,
    getAuditLogSummary,
    getActivityLogStats
} = require('../db/queries/audit.queries');

class AuditLogService {
    /**
     * Logs an action to the audit_logs table.
     * EARS[Ubiquitous]: THE system SHALL log all account state modifications (creation, role changes, deactivation) into the `audit_logs` table.
     * 
     * @param {string|null} actor_id - The ID of the user performing the action.
     * @param {string} action - The action performed.
     * @param {string} target_table - The table being modified.
     * @param {string|null} target_id - The ID of the affected record.
     * @param {object|null} old_value - The old value of the record.
     * @param {object|null} new_value - The new value of the record.
     * @param {string|null} ip_address - The IP address of the user.
     * @param {boolean} [can_undo=false] - Whether the action can be reverted.
     * @returns {Promise<Object>}
     */
    static async logAction(actor_id, action, target_table, target_id, old_value, new_value, ip_address, can_undo = false) {
        if (!action || !target_table) {
            throw new AppError('Action and target_table are required to create an audit log', 400);
        }

        try {
            return await insertAuditLog(pool, {
                actor_id,
                action,
                target_table,
                target_id,
                old_value,
                new_value,
                ip_address,
                can_undo
            });
        } catch (error) {
            const err = new AppError('Failed to insert audit log', 500);
            err.originalError = error;
            throw err;
        }
    }

    static async listChangeLogs(filters) {
        const result = await listAuditLogs(pool, filters);
        const summary = await getAuditLogSummary(pool);

        return {
            logs: result.rows.map(formatAuditLogListItem),
            total: result.total,
            page: Math.max(1, parseInt(filters.page, 10) || 1),
            limit: Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20)),
            summary
        };
    }

    static async listActivityLogs(filters) {
        // Chuyển severity ('suspicious'/'normal') thành danh sách action tương ứng để filter
        const enrichedFilters = { ...filters };
        if (filters.severity === 'suspicious') {
            if (!enrichedFilters.action) {
                // Dùng danh sách SUSPICIOUS_ACTIONS chuẩn — được định nghĩa cuối file
                enrichedFilters.severityActions = [
                    'login_failed', 'account_locked', 'user_deactivated',
                    'role_changed', 'password_changed_by_admin', 'permission_denied'
                ];
            }
        } else if (filters.action === 'content') {
            enrichedFilters.action = null; // Xóa action đơn
            enrichedFilters.severityActions = ['test_created', 'test_updated', 'test_deleted', 'resource_uploaded', 'resource_reviewed', 'test_reviewed'];
        } else if (filters.action === 'grading') {
            enrichedFilters.action = null;
            enrichedFilters.severityActions = ['submission_graded', 'submission_revoked', 'submission_regraded'];
        }

        const result = await listAuditLogs(pool, enrichedFilters);
        let rows = result.rows.map(formatActivityLogItem);

        // Filter phía service nếu severity=normal (loại bỏ suspicious)
        if (filters.severity === 'normal') {
            rows = rows.filter(r => r.severity === 'normal');
        }

        return {
            logs: rows,
            total: result.total,
            page: Math.max(1, parseInt(filters.page, 10) || 1),
            limit: Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20))
        };
    }

    static async getActivityLogStats() {
        return await getActivityLogStats(pool);
    }

    static async getChangeLogDetail(id) {
        const log = await getAuditLogById(pool, id);
        if (!log) {
            throw new AppError('Change log not found', 404, 'AUDIT_LOG_NOT_FOUND');
        }

        return formatAuditLogDetail(log);
    }

    static async undoChangeLog({ logId, actorId, ipAddress }) {
        const sourceLog = await getAuditLogById(pool, logId);
        if (!sourceLog) {
            throw new AppError('Change log not found', 404, 'AUDIT_LOG_NOT_FOUND');
        }

        if (!sourceLog.can_undo) {
            throw new AppError('This change cannot be undone.', 400, 'AUDIT_UNDO_NOT_ALLOWED');
        }

        if (sourceLog.undone_at) {
            throw new AppError('This change has already been undone.', 409, 'AUDIT_ALREADY_UNDONE');
        }

        if (sourceLog.target_table !== 'users') {
            throw new AppError('Undo is not supported for this target.', 400, 'AUDIT_UNDO_NOT_SUPPORTED');
        }

        if (sourceLog.target_id === actorId) {
            throw new AppError('You cannot undo a change on your own account.', 403, 'AUTH_PERM_001');
        }

        const undoPlan = buildUserUndoPlan(sourceLog);
        if (!undoPlan) {
            throw new AppError('Undo is not supported for this action.', 400, 'AUDIT_UNDO_NOT_SUPPORTED');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const lockedLogResult = await client.query(
                `SELECT id, can_undo, undone_at FROM audit_logs WHERE id = $1 FOR UPDATE`,
                [sourceLog.id]
            );
            const lockedLog = lockedLogResult.rows[0];
            if (!lockedLog || !lockedLog.can_undo) {
                throw new AppError('This change cannot be undone.', 400, 'AUDIT_UNDO_NOT_ALLOWED');
            }
            if (lockedLog.undone_at) {
                throw new AppError('This change has already been undone.', 409, 'AUDIT_ALREADY_UNDONE');
            }

            const currentResult = await client.query(
                `SELECT id, role, status FROM users WHERE id = $1 FOR UPDATE`,
                [sourceLog.target_id]
            );
            const currentUser = currentResult.rows[0];
            if (!currentUser) {
                throw new AppError('Target user not found.', 404, 'NOT_FOUND');
            }

            if (String(currentUser[undoPlan.field]) !== String(undoPlan.expectedCurrentValue)) {
                throw new AppError(
                    'The target has changed again after this log was created. Review the latest change before undoing.',
                    409,
                    'AUDIT_UNDO_CONFLICT'
                );
            }

            const updateResult = await client.query(
                `UPDATE users
                 SET ${undoPlan.field} = $2
                 WHERE id = $1
                 RETURNING id, email, full_name, role, status`,
                [sourceLog.target_id, undoPlan.restoreValue]
            );

            const undoLog = await insertAuditLog(client, {
                actor_id: actorId,
                action: 'change_reverted',
                target_table: sourceLog.target_table,
                target_id: sourceLog.target_id,
                old_value: {
                    reverted_log_id: sourceLog.id,
                    [undoPlan.field]: undoPlan.expectedCurrentValue
                },
                new_value: {
                    reverted_log_id: sourceLog.id,
                    [undoPlan.field]: undoPlan.restoreValue
                },
                ip_address: ipAddress,
                can_undo: false
            });

            await markAuditLogUndone(client, {
                id: sourceLog.id,
                undone_by: actorId,
                undo_log_id: undoLog.id
            });

            await client.query('COMMIT');

            return {
                source_log: await this.getChangeLogDetail(sourceLog.id),
                undo_log: formatAuditLogDetail({
                    ...undoLog,
                    actor_name: null,
                    actor_email: null,
                    target_user_name: updateResult.rows[0].full_name,
                    target_user_email: updateResult.rows[0].email
                }),
                target: updateResult.rows[0]
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

const ACTION_LABELS = {
    test_created: 'Tạo đề thi',
    test_updated: 'Sửa đề thi',
    test_deleted: 'Xóa đề thi',
    resource_uploaded: 'Thêm tài liệu',
    user_created: 'Tạo người dùng',
    user_updated: 'Cập nhật người dùng',
    role_changed: 'Đổi vai trò',
    user_deactivated: 'Vô hiệu hoá tài khoản',
    user_deleted: 'Xoá người dùng',
    answer_key_updated: 'Cập nhật đáp án',
    resource_uploaded: 'Tải tài liệu',
    resource_deleted: 'Xoá tài liệu',
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    login_failed: 'Đăng nhập thất bại',
    password_changed: 'Đổi mật khẩu',
    password_reset_requested: 'Yêu cầu đặt lại mật khẩu',
    oauth_linked: 'Liên kết OAuth',
    oauth_unlinked: 'Huỷ liên kết OAuth',
    change_reverted: 'Hoàn tác thay đổi',
    submission_revoked: 'Thu hồi kết quả',
    submission_regraded: 'Sửa kết quả chấm'
};

const formatAuditLogListItem = (log) => ({
    id: log.id,
    time: log.created_at,
    admin: formatActor(log),
    action: log.action,
    action_label: ACTION_LABELS[log.action] || log.action,
    target_table: log.target_table,
    target_id: log.target_id,
    target_label: getTargetLabel(log),
    status: log.undone_at ? 'undone' : 'applied',
    can_undo: Boolean(log.can_undo && !log.undone_at),
    undone_at: log.undone_at
});

const formatAuditLogDetail = (log) => ({
    ...formatAuditLogListItem(log),
    actor: formatActor(log),
    old_value: log.old_value,
    new_value: log.new_value,
    ip_address: log.ip_address,
    created_at: log.created_at,
    undone_by: log.undone_by ? {
        id: log.undone_by,
        full_name: log.undone_by_name || null,
        email: log.undone_by_email || null
    } : null,
    undo_log_id: log.undo_log_id
});

const formatActor = (log) => ({
    id: log.actor_id,
    full_name: log.actor_name || null,
    email: log.actor_email || null
});

const getTargetLabel = (log) => {
    if (log.target_user_email) return log.target_user_email;
    if (log.target_user_name) return log.target_user_name;
    if (log.new_value && log.new_value.student_name) return `Học sinh: ${log.new_value.student_name}`;
    if (log.old_value && log.old_value.student_name) return `Học sinh: ${log.old_value.student_name}`;
    if (log.new_value && log.new_value.email) return log.new_value.email;
    if (log.new_value && log.new_value.title) return log.new_value.title;
    if (log.new_value && log.new_value.file_name) return log.new_value.file_name;
    if (log.old_value && log.old_value.email) return log.old_value.email;
    if (log.old_value && log.old_value.title) return log.old_value.title;
    if (log.old_value && log.old_value.file_name) return log.old_value.file_name;
    // Thay vì trả UUID thô, trả dạng ngắn có context (table#id_prefix)
    if (log.target_id) return `${log.target_table ?? 'record'}#${log.target_id.substring(0, 8)}`;
    return '—';
};

/**
 * normalizeIp — chuẩn hoá địa chỉ IP từ IPv4-mapped IPv6 sang IPv4 thuần
 * Ví dụ: ::ffff:127.0.0.1 → 127.0.0.1 | ::1 → 127.0.0.1
 */
const normalizeIp = (ip) => {
    if (!ip) return null;
    const cleaned = ip.replace(/^::ffff:/i, '');
    if (cleaned === '::1') return '127.0.0.1';
    return cleaned;
};

/**
 * formatActivityLogItem — trả về đúng field names mà AdminActivityLogPage.jsx đọc:
 *   actor (string), target (string), ip (string), reason (string),
 *   severity ('normal'|'suspicious'), created_at (ISO string)
 */
const formatActivityLogItem = (log) => ({
    id: log.id,
    created_at: log.created_at,               // Frontend: r.created_at
    actor: log.actor_name || '—',             // Frontend: r.actor (plain string)
    action: log.action,                        // Frontend: r.action (for actionLabel helper)
    target: getTargetLabel(log),               // Frontend: r.target
    ip: normalizeIp(log.ip_address),          // Frontend: r.ip (normalized IPv4)
    severity: getSeverity(log),               // Frontend: r.severity === 'suspicious'
    reason: getNote(log)                      // Frontend: r.reason
});

const SUSPICIOUS_ACTIONS = [
    'login_failed',
    'account_locked',
    'user_deactivated',
    'role_changed',
    'password_changed_by_admin',
    'permission_denied'
];

const getSeverity = (log) => {
    return SUSPICIOUS_ACTIONS.includes(log.action) ? 'suspicious' : 'normal';
};

const getNote = (log) => {
    if (log.new_value && log.new_value.reason) return log.new_value.reason;
    if (log.old_value && log.old_value.reason) return log.old_value.reason;
    
    if (log.action === 'login_failed' && log.old_value && log.old_value.email) {
        return `Đăng nhập thất bại: ${log.old_value.email}`;
    }
    if (log.action === 'test_created') return 'Tạo đề thi mới';
    if (log.action === 'test_updated') return 'Cập nhật nội dung đề thi';
    if (log.action === 'test_deleted') return 'Xoá đề thi khỏi hệ thống';
    if (log.action === 'resource_uploaded') return 'Tải tài liệu lên thư viện';
    if (log.action === 'resource_deleted') return 'Xóa tài liệu khỏi thư viện';
    if (log.action === 'test_reviewed') return 'Cập nhật trạng thái hiển thị đề thi';
    if (log.action === 'resource_reviewed') return 'Cập nhật trạng thái hiển thị tài liệu';

    return null;
};

const buildUserUndoPlan = (log) => {
    if (log.action === 'role_changed' && log.old_value?.role && log.new_value?.role) {
        return {
            field: 'role',
            restoreValue: log.old_value.role,
            expectedCurrentValue: log.new_value.role
        };
    }

    if ((log.action === 'user_deactivated' || log.action === 'user_updated') && log.old_value?.status && log.new_value?.status) {
        return {
            field: 'status',
            restoreValue: log.old_value.status,
            expectedCurrentValue: log.new_value.status
        };
    }

    return null;
};

module.exports = AuditLogService;
module.exports.AppError = AppError;
