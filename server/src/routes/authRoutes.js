import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  validateRegistration,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword
} from '../middleware/validateRequest.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  resendVerifyLimiter,
  changePasswordLimiter
} from '../middleware/rateLimit.js';

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, validateRegistration, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Email verification
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', protect, resendVerifyLimiter, resendVerification);

// Password management — authenticated
router.post('/change-password', protect, changePasswordLimiter, validateChangePassword, changePassword);

// Password recovery — public (always returns 200 to prevent account enumeration)
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, validateResetPassword, resetPassword);

export default router;
