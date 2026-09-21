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
