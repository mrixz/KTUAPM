import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login attempts.
 * 10 attempts per 15 minutes per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sign-in attempts from this device. Please wait 15 minutes before trying again.'
  },
  skipSuccessfulRequests: true // Only count failed attempts towards the limit
});

/**
 * Rate limiter for account registration.
 * 5 per hour per IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts from this device. Please try again in an hour.'
  }
});

/**
 * Rate limiter for password reset requests and token consumption.
 * 5 per 15 minutes per IP.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please wait 15 minutes before trying again.'
  }
});

/**
 * Rate limiter for resend verification email.
 * 3 per hour per IP.
 */
export const resendVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification email requests. Please wait before requesting another.'
  }
});

/**
 * Rate limiter for change password endpoint.
 * 5 per 15 minutes per IP.
 */
export const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password change attempts. Please wait 15 minutes before trying again.'
  }
});

/**
 * Rate limiter for certificate uploads.
 * Keyed by AUTHENTICATED USER ID (not IP) — critical for campus environments
 * where many students share a single public IP address.
 *
 * Limit: 10 uploads per hour per student.
 * Rationale: OCR + Gemini are expensive API calls. A student legitimately needs
 * at most a handful of uploads per session; 10/hour is generous for normal use.
 *
 * Applied AFTER the protect middleware so req.user is available.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by authenticated student ID to avoid penalising shared campus IPs
  keyGenerator: (req) => (req.user?._id?.toString() || req.ip),
  message: {
    success: false,
    error: 'UPLOAD_RATE_LIMIT',
    message: 'You have uploaded too many certificates in the past hour. Please wait before uploading again.'
  }
});

/**
 * Rate limiter for the re-check certificate endpoint.
 * Keyed by AUTHENTICATED USER ID (not IP).
 *
 * Limit: 5 re-checks per 30 minutes per student.
 * Rationale: Each re-check triggers OCR + Gemini + rule engine.
 * Legitimate use: a student corrects a blurry scan and re-checks once or twice.
 * Abuse scenario: spam-clicking "Re-check" burns expensive Gemini API quota.
 */
export const recheckLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id?.toString() || req.ip),
  message: {
    success: false,
    error: 'RECHECK_RATE_LIMIT',
    message: 'You have re-checked too many certificates recently. Please wait 30 minutes before re-checking again.'
  }
});
