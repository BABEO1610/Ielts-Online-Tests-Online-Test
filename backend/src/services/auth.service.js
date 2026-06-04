/**
 * @file auth.service.js
 * @description Authentication service implementing registration logic.
 */

const crypto = require('crypto');
const { findUserByEmail, createUser, updateStatus, findUserById, upsertGoogleUser } = require('../db/queries/users.queries');
const { createVerificationToken, findVerificationToken, markVerificationTokenUsed, createPasswordResetToken, findPasswordResetToken, markResetTokenUsed } = require('../db/queries/tokens.queries');
const { countActiveSessions, revokeOldestSession, createSession, revokeSession, findActiveSession } = require('../db/queries/sessions.queries');
const { getLastNPasswordHashes, updatePasswordHash } = require('../db/queries/pwd.queries');
const AuditLogService = require('./audit.service');
const { hashPassword, hashOTP, verifyPassword } = require('../utils/password.util');
const { generateOpaqueToken, generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token.util');
const { sendVerificationEmail, sendPasswordResetEmail, sendGoogleWelcomeEmail } = require('../utils/email.util');
const { pool } = require('../db/pool');
const { delSafe } = require('../config/redis');

/**
 * Register a new user
 * EARS[Event]: WHEN a Guest submits a Registration form (Email does not exist), THE system SHALL create a new user (status = 'pending', role = 'student'), generate a token in email_verification_tokens, and send a verification email.
 * EARS[Unwanted]: WHERE a Guest registers with an already existing Email, THE system SHALL return HTTP 400 with a generic message "Registration failed" (Prevent Email Enumeration).
 * 
 * @param {Object} data - The user registration data
 * @param {string} data.email
 * @param {string} data.password
 * @param {string} data.full_name
 * @returns {Promise<Object>} Response message
 */
const register = async ({ email, password, full_name }) => {
    // Check if email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        // EARS[Unwanted]: Return generic message to prevent email enumeration
        const error = new Error('Registration failed. Please try again.');
        error.code = 'AUTH_REG_001';
        error.statusCode = 400;
        throw error;
    }

    // Hash the password using bcrypt (cost=12 handled in util)
    const password_hash = await hashPassword(password);

    // Create user (status='pending', role='student' are default in DB schema)
    const user = await createUser({ email, password_hash, full_name });

    // Generate opaque token for email verification
    const { raw } = generateOpaqueToken();

    // Hash the token for storage using SHA-256
    const token_hash = hashOTP(raw);

    // Set expiration to 24 hours from now
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save token to DB
    await createVerificationToken(pool, {
        user_id: user.id,
        token_hash,
        expires_at
    });

    // Send verification email
    await sendVerificationEmail(email, raw);

    return { message: "Kiểm tra email để xác thực tài khoản" };
};

/**
 * Verify a user's email using the provided token
 * EARS[Event]: WHEN a Guest accesses a valid verification link (< 24h), THE system SHALL update status = 'active', record used_at = NOW(), and redirect to the Login page.
 * 
 * @param {string} rawToken - The raw verification token from the email link
 * @returns {Promise<Object>} Success message
 */
const verifyEmail = async (rawToken) => {
    // 1. Hash the incoming token
    const tokenHash = hashOTP(rawToken);

    // 2. Find token in database (ensure it's not already used)
    const tokenRecord = await findVerificationToken(pool, tokenHash);
    
    if (!tokenRecord) {
        // EARS[Unwanted]: Token not found or already used
        const error = new Error('Invalid or used verification token.');
        error.code = 'AUTH_VERIFY_001';
        error.statusCode = 400;
        throw error;
    }

    // 3. Check expiration
    if (new Date() > new Date(tokenRecord.expires_at)) {
        // EARS[Unwanted]: Token has expired
        const error = new Error('Verification token has expired.');
        error.code = 'AUTH_VERIFY_002';
        error.statusCode = 400;
        throw error;
    }

    // 4. Activate user
    await updateStatus(tokenRecord.user_id, 'active');

    // 5. Mark token as used
    await markVerificationTokenUsed(pool, tokenRecord.id);

    return { message: "Email verified successfully." };
};

/**
 * Verify login credentials
 * EARS[Event]: WHEN a User submits valid credentials and the account is active, THE system SHALL call the DB function handle_successful_login()
 * EARS[Unwanted]: WHERE a User inputs an incorrect password, THE system SHALL call the DB function handle_failed_login().
 * EARS[Unwanted]: WHERE a User has failed_login_attempts >= 5, THE system SHALL lock the login flow for 15 minutes (based on locked_until) and return HTTP 429 Too Many Requests.
 * 
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} The authenticated user without password_hash
 */
const verifyLogin = async (email, password) => {
    // 1. Find user by email
    const user = await findUserByEmail(email);

    if (!user) {
        // EARS[Unwanted]: Incorrect credentials
        const error = new Error('Incorrect email or password.');
        error.code = 'AUTH_LOG_001';
        error.statusCode = 401;
        throw error;
    }

    // 2. Check if account is temporarily locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
        // EARS[Unwanted]: Account locked due to brute-force
        const error = new Error('Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');
        error.code = 'AUTH_LOG_002';
        error.statusCode = 429;
        throw error;
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
        // 4. If wrong, log failed attempt in DB
        await pool.query('SELECT handle_failed_login($1)', [user.id]);
        
        const error = new Error('Incorrect email or password.');
        error.code = 'AUTH_LOG_001';
        error.statusCode = 401;
        throw error;
    }

    // 5. Check if user is banned or pending
    if (user.status === 'banned' || user.status === 'pending') {
        const error = new Error('You do not have permission to perform this action.');
        error.code = 'AUTH_PERM_001';
        error.statusCode = 403;
        throw error;
    }

    // 6. If correct, log successful attempt in DB
    await pool.query('SELECT handle_successful_login($1)', [user.id]);

    // 7. Get updated user to return without hash
    const updatedUser = await findUserByEmail(email);
    const { password_hash, ...safeUser } = updatedUser;
    
    return safeUser;
};

/**
 * Perform login and handle session management
 * EARS[Event]: WHEN a User successfully verifies credentials, THE system SHALL create a new session and return JWT tokens.
 * EARS[Event]: WHERE a User already has >= 3 active sessions, THE system SHALL automatically revoke the oldest session before creating a new one.
 * 
 * @param {string} email
 * @param {string} password
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} An object containing safeUser and tokens (accessToken, refreshToken)
 */
const login = async (email, password, ipAddress, userAgent) => {
    // 1. Verify credentials and get safe user profile
    const user = await verifyLogin(email, password);

    // 2. Check current active sessions
    const activeSessionsCount = await countActiveSessions(user.id);
    if (activeSessionsCount >= 3) {
        // EARS[Event]: Auto-revoke oldest session
        await revokeOldestSession(user.id);
    }

    // 3. Generate new session token (opaque)
    const { raw: sessionToken } = generateOpaqueToken();

    // 4. Create new session expiring in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createSession(user.id, sessionToken, ipAddress, userAgent, expiresAt);

    // 5. Generate JWT tokens
    const accessToken = generateAccessToken({ 
        sub: user.id, 
        role: user.role, 
        session_token: sessionToken 
    });
    
    const refreshToken = generateRefreshToken({ 
        sub: user.id, 
        session_token: sessionToken 
    });

    // 6. Return safeUser and tokens
    return {
        user,
        tokens: {
            accessToken,
            refreshToken
        }
    };
};
/**
 * Perform logout and revoke session
 * EARS[Event]: WHEN a User calls the Logout API, THE system SHALL update revoked_at = NOW() for the corresponding user_sessions record
 * 
 * @param {string} sessionToken - The opaque session token
 * @returns {Promise<void>}
 */
const logout = async (sessionToken) => {
    if (!sessionToken) return;

    // 1. Revoke session in DB
    await revokeSession(sessionToken);

    // 2. Delete session cache in Redis
    await delSafe(`session:${sessionToken}`);
};

/**
 * Refresh an Access Token
 * EARS[Event]: WHEN an Access Token expires and the Client calls the Refresh API with a valid Refresh Token, THE system SHALL check the user's status; if active, issue a new Access Token. Otherwise, reject with HTTP 401.
 * 
 * @param {string} token - The JWT refresh token
 * @returns {Promise<Object>} An object containing the new accessToken
 */
const refreshToken = async (token) => {
    // 1. Verify the refresh token JWT
    const decoded = verifyRefreshToken(token);
    
    if (!decoded) {
        // EARS[Unwanted]: If invalid or expired token
        const error = new Error('Session expired.');
        error.code = 'AUTH_SES_001';
        error.statusCode = 401;
        throw error;
    }

    const { sub: userId, session_token: sessionToken } = decoded;

    // 2. Check if the session is still active in the database
    const activeSession = await findActiveSession(sessionToken);

    if (!activeSession) {
        // EARS[Unwanted]: Session revoked or not found
        const error = new Error('Session expired.');
        error.code = 'AUTH_SES_001';
        error.statusCode = 401;
        throw error;
    }

    // 3. Verify user status is 'active'
    const user = await findUserById(userId);

    if (!user || user.status !== 'active') {
        const error = new Error('Session expired.');
        error.code = 'AUTH_SES_001';
        error.statusCode = 401;
        throw error;
    }

    // 4. Generate new Access Token
    const accessToken = generateAccessToken({
        sub: user.id,
        role: user.role,
        session_token: sessionToken
    });

    return {
        accessToken
    };
};

/**
 * Request password reset OTP
 * EARS[Event]: WHEN a Guest requests a password reset, THE system SHALL create a Reset Token (expires in 1 hour) in password_reset_tokens and email the link.
 * EARS[Unwanted]: Email Enumeration Mitigation: Intentionally submitting an non-existing Email to the Forgot Password API MUST still return 200 OK without actually sending an email.
 * 
 * @param {string} email - The user's email address
 * @returns {Promise<Object>} Success message (indistinguishable whether email exists or not)
 */
const forgotPassword = async (email) => {
    const successMessage = { message: 'Nếu email tồn tại trong hệ thống, hướng dẫn reset password đã được gửi.' };
    
    // 1. Find user by email
    const user = await findUserByEmail(email);

    // EARS[Unwanted]: Prevent email enumeration. Return early with success if user not found or banned/pending.
    // Spec doesn't strictly say skip if pending, but a pending user shouldn't reset password since they haven't verified yet. We'll skip for non-active.
    if (!user || user.status !== 'active') {
        return successMessage;
    }

    // 2. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 3. Hash OTP with SHA-256 for DB storage
    const token_hash = hashOTP(otp);

    // 4. Set expiration to 1 hour from now
    const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);

    // 5. Save token to DB
    await createPasswordResetToken(pool, {
        user_id: user.id,
        token_hash,
        expires_at
    });

    // 6. Send email with raw OTP (which will be embedded in a link in the util)
    await sendPasswordResetEmail(email, otp);

    return successMessage;
};

/**
 * Reset password using OTP
 * EARS[Event]: WHEN a Guest submits a new password via a valid reset link, THE system SHALL update password_hash and set used_at = NOW(). If the user is inactive (due to brute-force), automatically switch status back to active.
 * EARS[Unwanted]: WHERE a User changes their password to one that matches their last 3 hashes in password_history, THE system SHALL return HTTP 400 "Password has been used recently".
 * 
 * @param {string} rawToken - The 6-digit OTP
 * @param {string} newPassword - The new password
 * @param {string} ipAddress - The IP address of the user
 * @returns {Promise<Object>} Success message
 */
const resetPassword = async (rawToken, newPassword, ipAddress) => {
    // 1. Hash the OTP using SHA-256
    const tokenHash = hashOTP(rawToken);

    // 2. Find the token in DB
    const tokenRecord = await findPasswordResetToken(pool, tokenHash);
    
    if (!tokenRecord) {
        // EARS[Unwanted]: Token not found, expired, or already used
        const error = new Error('Invalid or expired reset token.');
        error.code = 'AUTH_RESET_001';
        error.statusCode = 400;
        throw error;
    }

    const userId = tokenRecord.user_id;

    // 3. Get user to check current status
    const user = await findUserById(userId);
    if (!user) {
        const error = new Error('User not found.');
        error.code = 'AUTH_RESET_002';
        error.statusCode = 400;
        throw error;
    }

    // 4. Check if new password matches any of the last 3 hashes
    const last3Hashes = await getLastNPasswordHashes(pool, userId, 3);
    for (const oldHash of last3Hashes) {
        const isMatch = await verifyPassword(newPassword, oldHash);
        if (isMatch) {
            const error = new Error('This password has been used recently.');
            error.code = 'AUTH_PWD_001';
            error.statusCode = 400;
            throw error;
        }
    }

    // 5. Hash the new password using bcrypt
    const newPasswordHash = await hashPassword(newPassword);

    // 6. Update password hash and log history
    await updatePasswordHash(pool, {
        user_id: userId,
        new_hash: newPasswordHash,
        reason: 'reset_via_email',
        ip_address: ipAddress
    });

    // 7. Mark token as used
    await markResetTokenUsed(pool, tokenRecord.id);

    // 8. If user was inactive, switch to active
    let oldStatus = user.status;
    let newStatus = user.status;
    if (user.status === 'inactive') {
        await updateStatus(userId, 'active');
        newStatus = 'active';
    }

    // 9. Audit log
    await AuditLogService.logAction(
        userId,
        'password_changed',
        'users',
        userId,
        { status: oldStatus },
        { status: newStatus },
        ipAddress
    );

    return { message: "Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại." };
};

/**
 * Handle Google OAuth login
 * EARS[Event]: WHEN a User logs in via Google, THE system SHALL upsert the user (password_hash=NULL allowed), create a session, and generate tokens.
 * EARS[Event]: WHERE a User logs in via Google for the first time, THE system SHALL send a welcome email.
 * 
 * @param {Object} googleProfile
 * @param {string} googleProfile.email
 * @param {string} googleProfile.full_name
 * @param {string} [googleProfile.avatar_url]
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<Object>} An object containing safeUser, tokens (accessToken, refreshToken), and is_new flag
 */
const loginWithGoogle = async (googleProfile, ipAddress, userAgent) => {
    // 1. Upsert Google User
    const { id: userId, is_new, user } = await upsertGoogleUser({
        provider_user_id: googleProfile.provider_user_id,
        email: googleProfile.email,
        full_name: googleProfile.full_name,
        avatar_url: googleProfile.avatar_url
    });

    // 2. Check if user is banned
    if (user.status === 'banned') {
        const error = new Error('You do not have permission to perform this action.');
        error.code = 'AUTH_PERM_001';
        error.statusCode = 403;
        throw error;
    }

    // 3. Send welcome email if new
    if (is_new) {
        // Send email asynchronously without blocking the request
        sendGoogleWelcomeEmail(user.email, user.full_name).catch(err => {
            console.error('Failed to send Google welcome email:', err);
        });
    }

    // 4. Check current active sessions
    const activeSessionsCount = await countActiveSessions(userId);
    if (activeSessionsCount >= 3) {
        // EARS[Event]: Auto-revoke oldest session
        await revokeOldestSession(userId);
    }

    // 5. Generate new session token (opaque)
    const { raw: sessionToken } = generateOpaqueToken();

    // 6. Create new session expiring in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createSession(userId, sessionToken, ipAddress, userAgent, expiresAt);

    // 7. Generate JWT tokens
    const accessToken = generateAccessToken({ 
        sub: userId, 
        role: user.role, 
        session_token: sessionToken 
    });
    
    const refreshToken = generateRefreshToken({ 
        sub: userId, 
        session_token: sessionToken 
    });

    // 8. Return safeUser and tokens
    const { password_hash, ...safeUser } = user;

    return {
        user: safeUser,
        tokens: {
            accessToken,
            refreshToken
        },
        is_new
    };
};

/**
 * Handle Google OAuth callback exchange
 * @param {string} code - OAuth2 authorization code
 * @param {Object} meta - Metadata containing ip and userAgent
 * @returns {Promise<Object>}
 */
const handleGoogleCallback = async (code, { ip, userAgent }) => {
    // EARS[Event]: Verify CSRF state token, exchange code -> Google access_token, fetch Google profile.
    const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret';
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });

    if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Google token error:', errorData);
        const error = new Error('Failed to exchange Google authorization code.');
        error.code = 'AUTH_OAUTH_002';
        error.statusCode = 400;
        throw error;
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Fetch user profile from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });

    if (!profileResponse.ok) {
        const error = new Error('Failed to fetch Google profile.');
        error.code = 'AUTH_OAUTH_003';
        error.statusCode = 400;
        throw error;
    }

    const profileData = await profileResponse.json();

    const googleProfile = {
        provider_user_id: profileData.id || profileData.sub,
        email: profileData.email,
        full_name: profileData.name || profileData.given_name || profileData.email.split('@')[0],
        avatar_url: profileData.picture,
    };

    // Delegate to the existing loginWithGoogle logic to create session and tokens
    return await loginWithGoogle(googleProfile, ip, userAgent);
};

module.exports = {
    register,
    verifyEmail,
    verifyLogin,
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    loginWithGoogle,
    handleGoogleCallback
};
