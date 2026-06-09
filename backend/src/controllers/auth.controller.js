const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const authService = require('../services/auth.service');

// Middleware xử lý lỗi validation của express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Trả về HTTP 400 Bad Request ngay tại controller nếu validation fail
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      },
      meta: null
    });
  }
  next();
};

const registerValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('full_name')
    .notEmpty().withMessage('Full name is required')
    .trim(),
  validate
];

const register = async (req, res, next) => {
  try {
    // EARS[Event]: WHEN a Guest submits a Registration form (Email does not exist), THE system SHALL create a new user...
    // EARS[Unwanted]: WHERE a Guest registers with an already existing Email, THE system SHALL return HTTP 400 with a generic message "Registration failed" (Prevent Email Enumeration).
    // => Lưu ý: Phần chống enumerate trả về generic message được xử lý trong auth.service.js, controller chỉ wrap kết quả.
    const { email, password, full_name } = req.body;

    const result = await authService.register({ email, password, full_name });

    // API Contract: POST /api/v1/auth/register -> 201 Created
    return res.status(201).json({
      success: true,
      data: result,
      error: null,
      meta: null
    });
  } catch (error) {
    // Pass lỗi (ví dụ AppError) cho Centralized Error Handler (T030)
    next(error);
  }
};

const verifyEmailValidator = [
  body('token')
    .notEmpty().withMessage('Token is required')
    .trim(),
  validate
];

const verifyEmail = async (req, res, next) => {
  try {
    // EARS[Event]: WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update status = 'active', record used_at = NOW()...
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    // API Contract: POST /api/v1/auth/verify-email -> 200 OK
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

const loginValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

const login = async (req, res, next) => {
  try {
    // EARS[Event]: WHEN a User submits valid credentials and the account is active...
    const { email, password } = req.body;

    // Thu thập IP & User-Agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    const { user, tokens } = await authService.login(email, password, ipAddress, userAgent);

    // API Contract: Set HttpOnly + Secure cookies cho access (15m) & refresh (7d).
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 phút
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    });

    // Trả về 200 OK kèm user info (safeUser)
    return res.status(200).json({
      success: true,
      data: user,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // EARS[Event]: WHEN a User calls the Logout API, THE system SHALL update revoked_at = NOW()...
    // Lấy session_token từ payload đã được verify bởi middleware authenticate (nếu có),
    // hoặc có thể decode JWT nếu logout được gọi mà chưa có req.user.
    // Tuy nhiên theo luồng chuẩn, logout cần được gọi qua middleware authenticate.
    // Assuming req.user is set by authenticate middleware.
    let sessionToken = null;
    if (req.user && req.user.session_token) {
      sessionToken = req.user.session_token;
    } else {
      // Fallback đọc từ token nếu không qua authenticate middleware
      const accessToken = req.cookies.accessToken;
      if (accessToken) {
        const { verifyAccessToken } = require('../utils/token.util');
        const decoded = verifyAccessToken(accessToken);
        if (decoded) sessionToken = decoded.session_token;
      }
    }

    if (sessionToken) {
      await authService.logout(sessionToken);
    }

    // API Contract: POST /api/v1/auth/logout -> 204 No Content (Clear Cookie)
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    // EARS[Event]: WHEN an Access Token expires and the Client calls the Refresh API with a valid Refresh Token...
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'AUTH_SES_001',
          message: 'Session expired.'
        },
        meta: null
      });
    }

    const { accessToken } = await authService.refreshToken(token);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 phút
    });

    return res.status(200).json({
      success: true,
      data: null, // Refresh API thường không trả về data payload, chỉ có header cookie hoặc message
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

const forgotPasswordValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  validate
];

const forgotPassword = async (req, res, next) => {
  try {
    // EARS[Event]: WHEN a Guest requests a password reset, THE system SHALL create a Reset Token (expires in 1 hour) in password_reset_tokens and email the link.
    // EARS[Unwanted]: Email Enumeration Mitigation is handled in service.
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    // API Contract: POST /api/v1/auth/forgot-password -> 200 OK
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

const resetPasswordValidator = [
  body('token')
    .notEmpty().withMessage('Token is required')
    .trim(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate
];

const resetPassword = async (req, res, next) => {
  try {
    // EARS[Event]: WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash and set used_at = NOW().
    const { token, password } = req.body;

    // Thu thập IP
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.resetPassword(token, password, ipAddress);

    // API Contract: POST /api/v1/auth/reset-password -> 200 OK
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

const googleRedirect = (req, res, next) => {
  try {
    // EARS[Event]: Redirect URL Google
    const state = crypto.randomBytes(16).toString('hex');

    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 phút
      path: '/'
    });

    const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
    const redirectUri = process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/api/v1/auth/google/callback`
      : `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile&state=${state}&prompt=select_account`;

    return res.redirect(url);
  } catch (error) {
    next(error);
  }
};

const googleCallback = async (req, res, next) => {
  try {
    // EARS[Event]: Callback endpoint để set Cookies.
    const { code, state } = req.query;
    const cookieState = req.cookies?.oauth_state;

    // Verify CSRF state token
    if (!state || state !== cookieState) {
      console.error(`[OAuth] State mismatch! Query state: ${state}, Cookie state: ${cookieState}`);
      const error = new Error('Invalid state parameter. Please ensure cookies are enabled and try again.');
      error.code = 'AUTH_OAUTH_001';
      error.statusCode = 400;
      throw error;
    }

    // Xóa cookie oauth_state sau khi verify thành công
    res.clearCookie('oauth_state', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Xử lý callback qua service
    const { user, tokens, is_new } = await authService.handleGoogleCallback(code, { ip: ipAddress, userAgent });

    // Set Cookies (giống hàm login)
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Consistent with local login: always redirect to dashboard
    return res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let errorCode = error.code || 'UNKNOWN_ERROR';
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      errorCode = 'DB_CONNECTION_ERROR';
    }
    console.error('[OAuth Callback Error]', error);
    return res.redirect(`${frontendUrl}/login?error=${errorCode}`);
  }
};

const changePasswordValidator = [
  body('old_password')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu cũ')
    .trim(),
  body('new_password')
    .notEmpty().withMessage('Vui lòng nhập mật khẩu mới')
    .isLength({ min: 8 }).withMessage('Mật khẩu mới phải có ít nhất 8 ký tự'),
  validate
];

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.changePassword(userId, old_password, new_password, ipAddress);

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validate,
  registerValidator,
  register,
  verifyEmailValidator,
  verifyEmail,
  loginValidator,
  login,
  logout,
  refreshToken,
  forgotPasswordValidator,
  forgotPassword,
  resetPasswordValidator,
  resetPassword,
  googleRedirect,
  googleCallback,
  changePasswordValidator,
  changePassword
};
