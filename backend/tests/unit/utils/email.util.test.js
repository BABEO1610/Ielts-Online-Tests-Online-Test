/**
 * Traceability Matrix:
 * - TEST_T017_01: Map with USER-04 (Send verification email after registration)
 * - TEST_T017_02: Map with USER-06 (Send password reset email)
 * - TEST_T017_03: Map with PLAN §2.3 (sendGoogleWelcomeEmail)
 * - TEST_T017_04: Map with Error Handling (Throw EmailDeliveryError on SMTP fail / timeout)
 */

const nodemailer = require('nodemailer');

jest.mock('nodemailer', () => {
  const mTransporter = {
    sendMail: jest.fn().mockResolvedValue(true)
  };
  return {
    createTransport: jest.fn(() => mTransporter)
  };
});

const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendGoogleWelcomeEmail,
  EmailDeliveryError,
} = require('../../../src/utils/email.util');

describe('EmailUtil', () => {
  const mockTo = 'test@example.com';
  const mockToken = 'raw-token-1234';
  const mockFullName = 'John Doe';
  
  let mockSendMail;

  beforeEach(() => {
    // nodemailer.createTransport() returns the mocked transporter object
    mockSendMail = nodemailer.createTransport().sendMail;
    mockSendMail.mockClear();
  });

  describe('Happy Path', () => {
    it('TEST_T017_01: should send verification email successfully', async () => {
      mockSendMail.mockResolvedValueOnce(true);
      await sendVerificationEmail(mockTo, mockToken);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(mockTo);
      expect(callArgs.subject).toContain('Verify your email address');
      expect(callArgs.html).toContain(mockToken);
      expect(callArgs.html).toContain('/verify-email?token=');
    });

    it('TEST_T017_02: should send password reset email successfully', async () => {
      mockSendMail.mockResolvedValueOnce(true);
      await sendPasswordResetEmail(mockTo, mockToken);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(mockTo);
      expect(callArgs.subject).toContain('Password Reset Request');
      expect(callArgs.html).toContain(mockToken);
      expect(callArgs.html).toContain('/reset-password?token=');
    });

    it('TEST_T017_03: should send Google welcome email successfully', async () => {
      mockSendMail.mockResolvedValueOnce(true);
      await sendGoogleWelcomeEmail(mockTo, mockFullName);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(mockTo);
      expect(callArgs.subject).toContain('Welcome to IELTSZone!');
      expect(callArgs.html).toContain(mockFullName);
    });
  });

  describe('Error Cases (Unwanted)', () => {
    it('TEST_T017_04: should throw EmailDeliveryError if sending verification email fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));
      await expect(sendVerificationEmail(mockTo, mockToken)).rejects.toThrow(EmailDeliveryError);
      
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));
      await expect(sendVerificationEmail(mockTo, mockToken)).rejects.toThrow('Failed to send verification email: SMTP timeout');
    });

    it('TEST_T017_04: should throw EmailDeliveryError if sending password reset email fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));
      await expect(sendPasswordResetEmail(mockTo, mockToken)).rejects.toThrow(EmailDeliveryError);
      
      mockSendMail.mockRejectedValueOnce(new Error('Connection refused'));
      await expect(sendPasswordResetEmail(mockTo, mockToken)).rejects.toThrow('Failed to send password reset email: Connection refused');
    });

    it('TEST_T017_04: should throw EmailDeliveryError if sending Google welcome email fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Network error'));
      await expect(sendGoogleWelcomeEmail(mockTo, mockFullName)).rejects.toThrow(EmailDeliveryError);
    });
  });
});
