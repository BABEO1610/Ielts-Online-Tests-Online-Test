const nodemailer = require('nodemailer');

class EmailDeliveryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.statusCode = 503; // Service Unavailable
  }
}

// Config transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT) || 2525,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'test-user',
    pass: process.env.SMTP_PASS || 'test-pass',
  },
  connectionTimeout: 5000, // 5s timeout
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';
const getFromEmail = () => process.env.EMAIL_FROM || '"IELTSZone" <noreply@ieltszone.com>';

/**
 * Gửi email xác thực tài khoản
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} rawToken - Token dạng UUID thô
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (to, rawToken) => {
  // EARS[Event]: WHEN a Guest submits a Registration form (Email does not exist), THE system SHALL create a new user... and send a verification email.
  const verificationLink = `${getFrontendUrl()}/verify-email?token=${rawToken}`;
  
  const mailOptions = {
    from: getFromEmail(),
    to,
    subject: 'IELTSZone - Verify your email address',
    html: `
      <h2>Welcome to IELTSZone!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new EmailDeliveryError(`Failed to send verification email: ${error.message}`);
  }
};

/**
 * Gửi email đặt lại mật khẩu
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} rawToken - Token dạng UUID thô
 * @returns {Promise<void>}
 */
const sendPasswordResetEmail = async (to, rawToken) => {
  // EARS[Event]: WHEN a Guest requests a password reset, THE system SHALL create a Reset Token (expires in 1 hour) in password_reset_tokens and email the link.
  const resetLink = `${getFrontendUrl()}/reset-password?token=${rawToken}`;
  
  const mailOptions = {
    from: getFromEmail(),
    to,
    subject: 'IELTSZone - Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new EmailDeliveryError(`Failed to send password reset email: ${error.message}`);
  }
};

/**
 * Gửi email chào mừng khi đăng ký qua Google OAuth
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} fullName - Tên đầy đủ của người dùng
 * @returns {Promise<void>}
 */
const sendGoogleWelcomeEmail = async (to, fullName) => {
  const mailOptions = {
    from: getFromEmail(),
    to,
    subject: 'Welcome to IELTSZone!',
    html: `
      <h2>Welcome, ${fullName}!</h2>
      <p>Thank you for joining IELTSZone using your Google account.</p>
      <p>We are excited to help you achieve your target IELTS band score.</p>
      <p>Log in anytime to start your journey.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new EmailDeliveryError(`Failed to send Google welcome email: ${error.message}`);
  }
};

module.exports = {
  EmailDeliveryError,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendGoogleWelcomeEmail,
  transporter, // Export for mocking in tests
};
