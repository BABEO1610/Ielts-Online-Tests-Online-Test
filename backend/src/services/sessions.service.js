/**
 * @file backend/src/services/sessions.service.js
 * @description Business logic for Admin session management.
 * Tuân thủ AGENTS.md: camelCase, no ORM, xử lý lỗi qua AppError.
 * Tuân thủ constitution.md ARTICLE 5: coverage >= 80%.
 */

const sessionsQueries = require('../db/queries/sessions.queries');
const AuditLogService = require('./audit.service');

/**
 * Parse user_agent TEXT → chuỗi hiển thị thân thiện
 * Ví dụ: "Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/124" → "Chrome · Windows"
 * Đây là parse đơn giản client-side — không dùng thư viện nặng.
 *
 * @param {string|null} userAgent
 * @returns {string}
 */
const parseDevice = (userAgent) => {
  if (!userAgent) return 'Unknown';

  const ua = userAgent.toLowerCase();
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';

  if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';

  return `${browser} · ${os}`;
};

/**
 * Lấy toàn bộ phiên đăng nhập đang hoạt động (cho Admin).
 * Map dữ liệu từ DB sang shape mà SessionsPage.jsx mong đợi.
 *
 * EARS[Event]: WHEN an Admin requests the active sessions list,
 * THE system SHALL return all active sessions with user info and device string.
 *
 * @returns {Promise<Array>}
 */
const getAllActiveSessions = async () => {
  const rows = await sessionsQueries.listAllActiveSessions();

  return rows.map((row) => ({
    id: row.id,
    user: row.full_name || row.email,
    email: row.email,
    device: parseDevice(row.user_agent),
    ip: row.ip_address ? String(row.ip_address) : 'N/A',
    is_oauth: row.is_oauth,
    provider: row.oauth_provider || null,
    last_active_at: row.last_active_at,
    expires_at: row.expires_at,
  }));
};

/**
 * Thu hồi một phiên theo ID (Admin action).
 * Ghi audit log sau khi thu hồi thành công.
 *
 * EARS[Event]: WHEN an Admin revokes a session by ID,
 * THE system SHALL set revoked_at = NOW() and log the action to audit_logs.
 * EARS[Unwanted]: WHERE the sessionId does not match any active session,
 * THE system SHALL throw HTTP 404.
 *
 * @param {string} sessionId  - UUID của session cần thu hồi
 * @param {string} actorId    - UUID của admin thực hiện
 * @param {string|null} ipAddress - IP của admin
 * @returns {Promise<Object>} Session đã bị revoke
 */
const revokeSessionById = async (sessionId, actorId, ipAddress) => {
  const revoked = await sessionsQueries.revokeSessionById(sessionId);

  if (!revoked) {
    const err = new Error('Session not found or already revoked');
    err.statusCode = 404;
    err.errorCode = 'SES_ADM_001';
    throw err;
  }

  await AuditLogService.logAction(
    actorId,
    'logout',
    'user_sessions',
    sessionId,
    { revoked_at: null },
    { revoked_at: revoked.revoked_at },
    ipAddress
  );

  return { id: revoked.id };
};

module.exports = {
  getAllActiveSessions,
  revokeSessionById,
  parseDevice,
};
