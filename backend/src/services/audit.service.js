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
    getAuditLogSummary
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
    user_created: 'Tạo người dùng',
    user_updated: 'Cập nhật người dùng',
    role_changed: 'Đổi vai trò',
    user_deactivated: 'Vô hiệu hoá tài khoản',
    user_deleted: 'Xoá người dùng',
    test_created: 'Tạo đề thi',
    test_updated: 'Sửa đề thi',
    test_deleted: 'Xoá đề thi',
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
    change_reverted: 'Hoàn tác thay đổi'
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
    if (log.new_value && log.new_value.email) return log.new_value.email;
    if (log.new_value && log.new_value.title) return log.new_value.title;
    if (log.new_value && log.new_value.file_name) return log.new_value.file_name;
    if (log.old_value && log.old_value.email) return log.old_value.email;
    if (log.old_value && log.old_value.title) return log.old_value.title;
    if (log.old_value && log.old_value.file_name) return log.old_value.file_name;
    return log.target_id;
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
