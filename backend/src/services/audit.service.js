/**
 * @file audit.service.js
 * @description Service for managing audit logs.
 */

const pool = require('../db/pool');
const { insertAuditLog } = require('../db/queries/audit.queries');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}

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
     * @returns {Promise<void>}
     */
    static async logAction(actor_id, action, target_table, target_id, old_value, new_value, ip_address) {
        if (!action || !target_table) {
            throw new AppError('Action and target_table are required to create an audit log', 400);
        }

        try {
            await insertAuditLog(pool, {
                actor_id,
                action,
                target_table,
                target_id,
                old_value,
                new_value,
                ip_address
            });
        } catch (error) {
            const err = new AppError('Failed to insert audit log', 500);
            err.originalError = error;
            throw err;
        }
    }
}

module.exports = AuditLogService;
module.exports.AppError = AppError;
