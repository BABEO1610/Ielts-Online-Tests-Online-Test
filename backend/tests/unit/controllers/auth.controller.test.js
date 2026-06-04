/**
 * Traceability Matrix:
 * - USER-03: As a Guest, I want to register a new account using Email/Password.
 * - USER-04: As a Guest, I want to receive an email verification link after registration.
 * - USER-05: As a Student/Tutor/Admin, I want to log in with Email/Password to access my dashboard.
 * - USER-06: As a Guest, I want to reset my password if I forget it.
 * - EARS[Event]: WHEN a Guest submits a Registration form (Email does not exist), THE system SHALL create a new user...
 * - EARS[Event]: WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update status = 'active'...
 * - EARS[Event]: WHEN a User submits valid credentials and the account is active...
 * - EARS[Event]: WHEN a User calls the Logout API, THE system SHALL update revoked_at = NOW()...
 * - EARS[Event]: WHEN an Access Token expires and the Client calls the Refresh API with a valid Refresh Token...
 * - EARS[Event]: WHEN a Guest requests a password reset, THE system SHALL create a Reset Token...
 * - EARS[Event]: WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash...
 * - EARS[Unwanted]: WHERE a Guest registers with an already existing Email, THE system SHALL return HTTP 400 with a generic message (implemented via service, tested here for next(error)).
 * - API Contract: POST /api/v1/auth/register -> 201 Created
 * - API Contract: POST /api/v1/auth/verify-email -> 200 OK
 * - API Contract: POST /api/v1/auth/login -> 200 OK (Set-Cookie)
 * - API Contract: POST /api/v1/auth/logout -> 204 No Content
 * - API Contract: POST /api/v1/auth/refresh -> 200 OK
 * - API Contract: POST /api/v1/auth/forgot-password -> 200 OK
 * - API Contract: POST /api/v1/auth/reset-password -> 200 OK
 * - API Contract: GET /api/v1/auth/google -> Redirect URL
 * - API Contract: GET /api/v1/auth/google/callback -> Redirect tới Frontend dashboard
 */

const authController = require('../../../src/controllers/auth.controller');
const authService = require('../../../src/services/auth.service');
const { validationResult } = require('express-validator');

// Mock authService
jest.mock('../../../src/services/auth.service');

// Mock express-validator để test riêng middleware validate()
jest.mock('express-validator', () => {
  const original = jest.requireActual('express-validator');
  return {
    ...original,
    validationResult: jest.fn()
  };
});

describe('Auth Controller: Reg & Verify', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Validation Middleware', () => {
    it('should call next() if there are no validation errors', () => {
      validationResult.mockReturnValue({ isEmpty: () => true });
      authController.validate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 if validation fails', () => {
      const mockErrors = [{ msg: 'Invalid email' }];
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      authController.validate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: mockErrors
        },
        meta: null
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('register()', () => {
    it('should return 201 Created when registration is successful (Happy Path)', async () => {
      // Setup
      req.body = { email: 'test@example.com', password: 'password123', full_name: 'Test User' };
      const serviceResponse = { message: 'Kiểm tra email để xác thực tài khoản' };
      authService.register.mockResolvedValue(serviceResponse);

      // Execute
      await authController.register(req, res, next);

      // Assert
      expect(authService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResponse,
        error: null,
        meta: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass error to next() when authService.register throws (Error Case)', async () => {
      // Setup
      req.body = { email: 'test@example.com', password: 'password123', full_name: 'Test User' };
      const error = new Error('Service Error'); // Có thể là AppError giả lập
      authService.register.mockRejectedValue(error);

      // Execute
      await authController.register(req, res, next);

      // Assert
      expect(authService.register).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail()', () => {
    it('should return 200 OK when email verification is successful (Happy Path)', async () => {
      // Setup
      req.body = { token: 'valid_token' };
      const serviceResponse = { message: 'Tài khoản đã được xác thực' };
      authService.verifyEmail.mockResolvedValue(serviceResponse);

      // Execute
      await authController.verifyEmail(req, res, next);

      // Assert
      expect(authService.verifyEmail).toHaveBeenCalledWith('valid_token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResponse,
        error: null,
        meta: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass error to next() when authService.verifyEmail throws (Error Case - Invalid/Expired Token)', async () => {
      // Setup
      req.body = { token: 'invalid_token' };
      const error = new Error('Invalid Token');
      authService.verifyEmail.mockRejectedValue(error);

      // Execute
      await authController.verifyEmail(req, res, next);

      // Assert
      expect(authService.verifyEmail).toHaveBeenCalledWith('invalid_token');
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('login()', () => {
    beforeEach(() => {
      req.ip = '127.0.0.1';
      req.headers = { 'user-agent': 'Jest' };
      res.cookie = jest.fn();
    });

    it('should return 200 OK and set cookies on successful login (Happy Path)', async () => {
      // Setup
      req.body = { email: 'test@example.com', password: 'password123' };
      const serviceResponse = {
        user: { id: 1, email: 'test@example.com', role: 'student' },
        tokens: { accessToken: 'access_mock', refreshToken: 'refresh_mock' }
      };
      authService.login.mockResolvedValue(serviceResponse);

      // Execute
      await authController.login(req, res, next);

      // Assert
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123', '127.0.0.1', 'Jest');
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access_mock', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh_mock', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResponse.user,
        error: null,
        meta: null
      });
    });

    it('should pass error to next() on login failure (Error Case)', async () => {
      // Setup
      req.body = { email: 'test@example.com', password: 'wrong' };
      const error = new Error('Incorrect credentials');
      authService.login.mockRejectedValue(error);

      // Execute
      await authController.login(req, res, next);

      // Assert
      expect(authService.login).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('logout()', () => {
    beforeEach(() => {
      res.clearCookie = jest.fn();
    });

    it('should clear cookies and return 204 (Happy Path)', async () => {
      // Setup
      req.user = { session_token: 'valid_session' };
      authService.logout.mockResolvedValue();
      res.send = jest.fn();

      // Execute
      await authController.logout(req, res, next);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith('valid_session');
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should handle error if authService.logout fails', async () => {
      // Setup
      req.user = { session_token: 'valid_session' };
      const error = new Error('DB Error');
      authService.logout.mockRejectedValue(error);

      // Execute
      await authController.logout(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshToken()', () => {
    beforeEach(() => {
      req.cookies = {};
      res.cookie = jest.fn();
    });

    it('should set new accessToken and return 200 (Happy Path)', async () => {
      // Setup
      req.cookies.refreshToken = 'valid_refresh';
      authService.refreshToken.mockResolvedValue({ accessToken: 'new_access_mock' });

      // Execute
      await authController.refreshToken(req, res, next);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith('valid_refresh');
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'new_access_mock', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        error: null,
        meta: null
      });
    });

    it('should return 401 if refreshToken is missing', async () => {
      // Execute
      await authController.refreshToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'AUTH_SES_001' })
      }));
    });

    it('should pass error to next() if authService.refreshToken throws', async () => {
      // Setup
      req.cookies.refreshToken = 'invalid_refresh';
      const error = new Error('Invalid Token');
      authService.refreshToken.mockRejectedValue(error);

      // Execute
      await authController.refreshToken(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('forgotPassword()', () => {
    it('should return 200 OK and a success message (Happy Path)', async () => {
      // Setup
      req.body = { email: 'test@example.com' };
      const serviceResponse = { message: 'Nếu email tồn tại trong hệ thống, hướng dẫn reset password đã được gửi.' };
      authService.forgotPassword.mockResolvedValue(serviceResponse);

      // Execute
      await authController.forgotPassword(req, res, next);

      // Assert
      expect(authService.forgotPassword).toHaveBeenCalledWith('test@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResponse,
        error: null,
        meta: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass error to next() if authService.forgotPassword throws (Error Case)', async () => {
      // Setup
      req.body = { email: 'test@example.com' };
      const error = new Error('Service Error');
      authService.forgotPassword.mockRejectedValue(error);

      // Execute
      await authController.forgotPassword(req, res, next);

      // Assert
      expect(authService.forgotPassword).toHaveBeenCalledWith('test@example.com');
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword()', () => {
    beforeEach(() => {
      req.ip = '127.0.0.1';
    });

    it('should return 200 OK on successful password reset (Happy Path)', async () => {
      // Setup
      req.body = { token: '123456', password: 'newpassword123' };
      const serviceResponse = { message: 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.' };
      authService.resetPassword.mockResolvedValue(serviceResponse);

      // Execute
      await authController.resetPassword(req, res, next);

      // Assert
      expect(authService.resetPassword).toHaveBeenCalledWith('123456', 'newpassword123', '127.0.0.1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: serviceResponse,
        error: null,
        meta: null
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass error to next() if authService.resetPassword throws (Error Case)', async () => {
      // Setup
      req.body = { token: '123456', password: 'newpassword123' };
      const error = new Error('Invalid or expired reset token.');
      authService.resetPassword.mockRejectedValue(error);

      // Execute
      await authController.resetPassword(req, res, next);

      // Assert
      expect(authService.resetPassword).toHaveBeenCalledWith('123456', 'newpassword123', '127.0.0.1');
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('googleRedirect()', () => {
    beforeEach(() => {
      res.cookie = jest.fn();
      res.redirect = jest.fn();
    });

    it('should set oauth_state cookie and redirect to Google OAuth URL (Happy Path)', () => {
      // Execute
      authController.googleRedirect(req, res, next);

      // Assert
      expect(res.cookie).toHaveBeenCalledWith('oauth_state', expect.any(String), expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth'));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('response_type=code'));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('state='));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('googleCallback()', () => {
    beforeEach(() => {
      req.query = {};
      req.cookies = {};
      req.ip = '127.0.0.1';
      req.headers = { 'user-agent': 'Jest' };
      res.cookie = jest.fn();
      res.clearCookie = jest.fn();
      res.redirect = jest.fn();
    });

    it('should throw error if state is missing or mismatched (Error Case)', async () => {
      // Setup
      req.query = { code: 'auth_code', state: 'invalid_state' };
      req.cookies = { oauth_state: 'valid_state' };

      // Execute
      await authController.googleCallback(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const passedError = next.mock.calls[0][0];
      expect(passedError.code).toBe('AUTH_OAUTH_001');
      expect(passedError.statusCode).toBe(400);
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should process callback, set cookies, and redirect to dashboard for existing user (Happy Path)', async () => {
      // Setup
      req.query = { code: 'auth_code', state: 'valid_state' };
      req.cookies = { oauth_state: 'valid_state' };
      
      const serviceResponse = {
        user: { id: 1, email: 'google@example.com' },
        tokens: { accessToken: 'access_mock', refreshToken: 'refresh_mock' },
        is_new: false
      };
      authService.handleGoogleCallback.mockResolvedValue(serviceResponse);

      // Execute
      await authController.googleCallback(req, res, next);

      // Assert
      expect(authService.handleGoogleCallback).toHaveBeenCalledWith('auth_code', { ip: '127.0.0.1', userAgent: 'Jest' });
      expect(res.clearCookie).toHaveBeenCalledWith('oauth_state', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access_mock', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh_mock', expect.any(Object));
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
      expect(next).not.toHaveBeenCalled();
    });

    it('should process callback, set cookies, and redirect to onboarding for new user (Happy Path)', async () => {
      // Setup
      req.query = { code: 'auth_code', state: 'valid_state' };
      req.cookies = { oauth_state: 'valid_state' };
      
      const serviceResponse = {
        user: { id: 2, email: 'newgoogle@example.com' },
        tokens: { accessToken: 'access_mock', refreshToken: 'refresh_mock' },
        is_new: true
      };
      authService.handleGoogleCallback.mockResolvedValue(serviceResponse);

      // Execute
      await authController.googleCallback(req, res, next);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/onboarding'));
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass error to next() if authService.handleGoogleCallback throws (Error Case)', async () => {
      // Setup
      req.query = { code: 'auth_code', state: 'valid_state' };
      req.cookies = { oauth_state: 'valid_state' };
      
      const error = new Error('Google OAuth failed');
      authService.handleGoogleCallback.mockRejectedValue(error);

      // Execute
      await authController.googleCallback(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
