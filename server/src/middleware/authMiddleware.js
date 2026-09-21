import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

export const protect = async (req, res, next) => {
  let token = null;

  // 1. Prefer httpOnly cookie (most secure path)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    // 2. Fall back to Authorization Bearer header (API clients, tests)
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Student account no longer exists.'
      });
    }

    // Token revocation check: if tokenVersion in JWT doesn't match the stored version,
    // the token has been superseded (password change, explicit logout, or reset).
    // decoded.tv may be undefined for tokens issued before this change was deployed —
    // treat them as valid during the migration window.
    if (decoded.tv !== undefined && decoded.tv !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please sign in again.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
};
