import nodemailer from 'nodemailer';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Build a Nodemailer transporter from SMTP config.
 * Returns null if email is not enabled, so callers can short-circuit cleanly.
 */
const createTransporter = () => {
  if (!config.smtp.enabled) return null;

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });
};

/**
 * Safe send helper — logs but never throws so email failures don't break auth flows.
 */
const safeSend = async (mailOptions) => {
  if (!config.smtp.enabled) {
    logger.warn('[Email] Email delivery is disabled (EMAIL_ENABLED != true). Skipping send.', mailOptions.subject);
    return null;
  }
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    logger.info(`[Email] Sent "${mailOptions.subject}" to ${mailOptions.to} (messageId: ${info.messageId})`);
    return info;
  } catch (err) {
    // Log the error but do NOT propagate — auth flows must not fail because of email
    logger.error(`[Email] Failed to send "${mailOptions.subject}" to ${mailOptions.to}: ${err.message}`);
    return null;
  }
};

/**
 * Send an account verification email.
 * @param {{ name: string, email: string }} user
 * @param {string} rawToken  The unHashed token (goes in the URL)
 */
export const sendVerificationEmail = async (user, rawToken) => {
  const baseUrl = config.appUrl || 'http://localhost:5173';
  // Token is URL-encoded to safely transmit in the link
  const link = `${baseUrl}/auth/verify-email/${encodeURIComponent(rawToken)}`;

  return safeSend({
    from: config.smtp.from,
    to: user.email,
    subject: 'Verify your KTU Activity Points account',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#f8fafc">
        <h2 style="color:#4f46e5;margin-bottom:8px">Verify your email</h2>
        <p style="color:#334155">Hi ${user.name},</p>
        <p style="color:#334155">
          Welcome to KTU Activity Points. Click the button below to verify your email address.
          This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email Address
        </a>
        <p style="color:#64748b;font-size:13px">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${link}" style="color:#4f46e5">${link}</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          If you didn't create an account, you can safely ignore this email.
          This link will expire in 24 hours.
        </p>
      </div>
    `
  });
};

/**
 * Send a password reset email.
 * The reset link is built from config.appUrl — NEVER from the request Host header.
 * @param {{ name: string, email: string }} user
 * @param {string} rawToken  The unHashed token (goes in the URL)
 */
export const sendPasswordResetEmail = async (user, rawToken) => {
  const baseUrl = config.appUrl || 'http://localhost:5173';
  const link = `${baseUrl}/auth/reset-password/${encodeURIComponent(rawToken)}`;

  return safeSend({
    from: config.smtp.from,
    to: user.email,
    subject: 'Reset your KTU Activity Points password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#f8fafc">
        <h2 style="color:#4f46e5;margin-bottom:8px">Reset your password</h2>
        <p style="color:#334155">Hi ${user.name},</p>
        <p style="color:#334155">
          We received a request to reset the password for your KTU Activity Points account.
          Click the button below. This link expires in <strong>1 hour</strong> and can only be used once.
        </p>
        <a href="${link}"
           style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#64748b;font-size:13px">
          If the button doesn't work, copy and paste this link:<br>
          <a href="${link}" style="color:#4f46e5">${link}</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          If you did not request a password reset, you can safely ignore this email.
          Your password will not change. Do not share this link with anyone.
        </p>
      </div>
    `
  });
};

/**
 * Send a password-changed notification (no link — purely informational).
 * @param {{ name: string, email: string }} user
 */
export const sendPasswordChangedEmail = async (user) => {
  return safeSend({
    from: config.smtp.from,
    to: user.email,
    subject: 'Your KTU Activity Points password was changed',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#f8fafc">
        <h2 style="color:#4f46e5;margin-bottom:8px">Password changed</h2>
        <p style="color:#334155">Hi ${user.name},</p>
        <p style="color:#334155">
          This is a confirmation that the password for your KTU Activity Points account
          (<strong>${user.email}</strong>) was successfully changed.
        </p>
        <p style="color:#334155">
          If you did not make this change, please use <strong>Forgot Password</strong>
          on the sign-in page immediately to secure your account.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          This is an automated security notification. Do not reply to this email.
        </p>
      </div>
    `
  });
};
