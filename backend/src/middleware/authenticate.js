const { verifyAccessToken } = require('../utils/token.util');
const redisClient = require('../config/redis');
const { findActiveSession } = require('../db/queries/sessions.queries');
const { pool } = require('../db/pool');
const AppError = require('../utils/AppError'); // Giả định AppError đã được tạo ở T030

/**
 * EARS[State-driven]: WHILE a request passes through the Authenticated Middleware, 
 * THE system SHALL decode the JWT and match the session_token against user_sessions. 
 * If revoked_at IS NOT NULL OR expires_at < NOW(), deny access (HTTP 401).
 * 
 * EARS[State-driven]: WHILE a user has must_change_password = TRUE in the DB 
 * (embedded in JWT), THE system SHALL block all business API requests and 
 * force-redirect the user to the Change Password endpoint.
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Đọc access_token từ Cookie (chú ý: cookie được set là accessToken)
    const token = req.cookies?.accessToken || req.cookies?.access_token;

    if (!token) {
      throw new AppError('Unauthorized: No access token provided', 401, 'AUTH_LOG_001');
    }

    // 2. Verify JWT
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw new AppError('Unauthorized: Invalid or expired token', 401, 'AUTH_SES_001');
    }

    const { sub, role, session_token, must_change_password } = decoded;

    if (!session_token) {
      throw new AppError('Unauthorized: Invalid token payload', 401, 'AUTH_SES_001');
    }

    // 3. Kiểm tra Redis cache
    let isRevoked = false;

    // Nếu Redis sập, bỏ qua bước check Redis và luôn fallback vào DB
    if (redisClient.status === 'ready') {
      const revokedVal = await redisClient.hget(`session:${session_token}`, 'revoked');
      if (revokedVal === 'true') {
        isRevoked = true;
      }
    }

    if (isRevoked) {
      throw new AppError('Session expired', 401, 'AUTH_SES_001');
    }

    // 4. Fallback DB Query nếu Redis chưa có thông tin bị revoked
    // Cache redis chỉ lưu 'revoked' = 'true' nếu session bị revoke.
    // Nếu redis trả về null, ta phải check ở DB để đảm bảo session chưa bị thu hồi và chưa hết hạn.
    const session = await findActiveSession(session_token);

    if (!session) {
      // Có thể session không tồn tại, hoặc đã hết hạn (expires_at < NOW()), hoặc revoked_at IS NOT NULL
      // Nếu session không còn active, ta nên set cache để block các request tiếp theo nhanh hơn
      if (redisClient.status === 'ready') {
        // Set TTL cho key là 15 phút (bằng với maxAge của access_token)
        await redisClient.hset(`session:${session_token}`, 'revoked', 'true');
        await redisClient.expire(`session:${session_token}`, 15 * 60);
      }
      throw new AppError('Session expired', 401, 'AUTH_SES_001');
    }

    // 5. Kiểm tra must_change_password
    if (must_change_password) {
      const whitelistPaths = [
        '/api/v1/auth/change-password',
        '/api/v1/auth/logout'
      ];

      // Nếu đường dẫn không nằm trong whitelist -> block
      if (!whitelistPaths.includes(req.path)) {
        throw new AppError('You must change your password before continuing', 403, 'AUTH_PERM_002'); // Có thể define thêm mã lỗi AUTH_PERM_002 hoặc dùng AUTH_PERM_001
      }
    }

    // 6. Gán thông tin user vào request object
    req.user = {
      id: sub,
      role,
      session_token,
      must_change_password
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
