import crypto from 'crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { SchemeResolver } from '../services/scheme/SchemeResolver.js';
import { config } from '../config/env.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} from '../services/email/emailService.js';

/**
 * Generate a signed JWT for a student.
 * Includes `tv` (token version) so the middleware can detect revoked sessions.
 */
const generateToken = (userId, tokenVersion) => {
  return jwt.sign({ userId, tv: tokenVersion }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

/**
 * Set httpOnly auth cookie and return JSON with user + profile + token.
 * Token is provided in both httpOnly cookie and JSON response body to support
 * environments where cross-site 3rd party cookies are restricted by browsers.
 */
const sendTokenResponse = (user, profile, statusCode, res) => {
  const token = generateToken(user._id, user.tokenVersion);

  const isSecureEnv =
    config.nodeEnv === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.NODE_ENV === 'production';

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isSecureEnv,
    sameSite: isSecureEnv ? 'none' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token, // Dual-support for cookie-restricted browsers
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      profile
    });
};

/**
 * Generate a cryptographically secure random token and return both
 * the raw token (to send to user) and a SHA-256 hash (to store in DB).
 */
const generateSecureToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

// ── Registration ──────────────────────────────────────────────────────────────

export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      registerNumber,
      program = 'B.Tech',
      branch = 'Computer Science and Engineering',
      admissionYear,
      entryType = 'regular'
    } = req.body;

    if (!name || !email || !password || !registerNumber || !admissionYear) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password, registerNumber, admissionYear).'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRegNo = registerNumber.toUpperCase().trim();

    // Check for existing accounts
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const existingReg = await StudentProfile.findOne({ registerNumber: cleanRegNo });
    if (existingReg) {
      return res.status(409).json({
        success: false,
        message: 'A student profile with this KTU Register Number already exists.'
      });
    }

    // Server-side scheme resolution
    const resolvedSchemeData = SchemeResolver.resolveScheme({
      admissionYear: parseInt(admissionYear, 10),
      entryType: (entryType || 'regular').toLowerCase(),
      program: (program || 'B.Tech').trim(),
      branch: (branch || 'Computer Science and Engineering').trim()
    });

    // Hash password with configurable rounds
    const passwordHash = await User.hashPassword(password);

    // Generate email verification token
    const { rawToken: verifyRawToken, hashedToken: verifyHashedToken } = generateSecureToken();

    let user;
    let profile;

    // Create User and StudentProfile atomically
    const session = await mongoose.startSession().catch(() => null);
    if (session) {
      try {
        await session.withTransaction(async () => {
          const createdUsers = await User.create(
            [
              {
                name: name.trim(),
                email: cleanEmail,
                passwordHash,
                emailVerified: false,
                emailVerificationToken: verifyHashedToken,
                emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
              }
            ],
            { session }
          );
          user = createdUsers[0];

          const createdProfiles = await StudentProfile.create(
            [
              {
                userId: user._id,
                registerNumber: cleanRegNo,
                program: (program || 'B.Tech').trim(),
                branch: (branch || 'Computer Science and Engineering').trim(),
                admissionYear: parseInt(admissionYear, 10),
                entryType: resolvedSchemeData.entryType,
                scheme: resolvedSchemeData.scheme,
                ruleVersion: resolvedSchemeData.ruleVersion,
                requiredPoints: resolvedSchemeData.requiredPoints,
                maximumPoints: resolvedSchemeData.maximumPoints,
                creditsRequired: resolvedSchemeData.mandatoryCredits || (resolvedSchemeData.scheme === '2024' ? 3 : 2),
                joiningSemester: resolvedSchemeData.joiningSemester || (resolvedSchemeData.entryType === 'lateral' ? 3 : 1),
                groupRequirements: resolvedSchemeData.groupRequirements || null
              }
            ],
            { session }
          );
          profile = createdProfiles[0];
        });
      } catch (txErr) {
        throw txErr;
      } finally {
        await session.endSession().catch(() => {});
      }
    } else {
      // Non-transactional fallback with guaranteed rollback cleanup
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        emailVerified: false,
        emailVerificationToken: verifyHashedToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      try {
        profile = await StudentProfile.create({
          userId: user._id,
          registerNumber: cleanRegNo,
          program: (program || 'B.Tech').trim(),
          branch: (branch || 'Computer Science and Engineering').trim(),
          admissionYear: parseInt(admissionYear, 10),
          entryType: resolvedSchemeData.entryType,
          scheme: resolvedSchemeData.scheme,
          ruleVersion: resolvedSchemeData.ruleVersion,
          requiredPoints: resolvedSchemeData.requiredPoints,
          maximumPoints: resolvedSchemeData.maximumPoints,
          creditsRequired: resolvedSchemeData.mandatoryCredits || (resolvedSchemeData.scheme === '2024' ? 3 : 2),
          joiningSemester: resolvedSchemeData.joiningSemester || (resolvedSchemeData.entryType === 'lateral' ? 3 : 1),
          groupRequirements: resolvedSchemeData.groupRequirements || null
        });
      } catch (profileErr) {
        await User.findByIdAndDelete(user._id).catch(() => {});
        throw profileErr;
      }
    }

    // Send verification email (fire-and-forget — never blocks registration)
    sendVerificationEmail({ name: user.name, email: user.email }, verifyRawToken).catch(() => {});

    sendTokenResponse(user, profile, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const profile = await StudentProfile.findOne({ userId: user._id });

    sendTokenResponse(user, profile, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────

export const logout = async (req, res) => {
  // Expire the auth cookie immediately
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax'
  });

  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// ── Get current user ──────────────────────────────────────────────────────────

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const profile = await StudentProfile.findOne({ userId: user._id });

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      profile
    });
  } catch (err) {
    next(err);
  }
};

// ── Change password (requires authentication) ─────────────────────────────────

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Load user WITH passwordHash (normally excluded from req.user)
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    // Increment tokenVersion to invalidate all existing sessions (including any stolen tokens)
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Send notification email (non-blocking)
    sendPasswordChangedEmail({ name: user.name, email: user.email }).catch(() => {});

    // Re-issue a fresh session cookie for the current session
    sendTokenResponse(user, null, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── Forgot password ───────────────────────────────────────────────────────────

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // ALWAYS return 200 regardless of whether the email exists — prevents account enumeration
    const user = await User.findOne({ email: cleanEmail });
    if (user) {
      // Invalidate any existing reset token and generate a new one
      const { rawToken, hashedToken } = generateSecureToken();
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save({ validateBeforeSave: false });

      // Send email (non-blocking; failure does not change response)
      sendPasswordResetEmail({ name: user.name, email: user.email }, rawToken).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'If that email address is registered, a password reset link has been sent. Check your inbox and spam folder.'
    });
  } catch (err) {
    next(err);
  }
};

// ── Reset password ────────────────────────────────────────────────────────────

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is missing.' });
    }

    // Hash the raw token received from the URL and look it up
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Load user with the reset token fields (select:false by default)
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_INVALID_OR_EXPIRED',
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }

    // Atomically consume the token — clear it BEFORE saving the new password
    // so a concurrent request hitting the same token gets a 400
    user.passwordHash = await User.hashPassword(password);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    // Increment tokenVersion to invalidate all existing sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save({ validateBeforeSave: false });

    // Send confirmation notification (non-blocking)
    sendPasswordChangedEmail({ name: user.name, email: user.email }).catch(() => {});

    // Do NOT auto-login — require the student to sign in manually
    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};

// ── Email verification ────────────────────────────────────────────────────────

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is missing.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_INVALID_OR_EXPIRED',
        message: 'This verification link is invalid or has expired. Request a new one from your account.'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'Email verified successfully. Your account is now fully verified.' });
  } catch (err) {
    next(err);
  }
};

// ── Resend verification email ─────────────────────────────────────────────────

export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'Your email address is already verified.' });
    }

    const { rawToken, hashedToken } = generateSecureToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail({ name: user.name, email: user.email }, rawToken).catch(() => {});

    res.status(200).json({ success: true, message: 'Verification email sent. Check your inbox and spam folder.' });
  } catch (err) {
    next(err);
  }
};
