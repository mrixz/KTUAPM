import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      errors: Object.values(err.errors).map((e) => e.message)
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `An account with this ${field} already exists.`
    });
  }

  if (err.name === 'MulterError') {
    const isSize = err.code === 'LIMIT_FILE_SIZE' || (err.message && err.message.toLowerCase().includes('too large'));
    return res.status(400).json({
      success: false,
      error: isSize ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
      message: isSize ? 'Certificate must be smaller than 10 MB.' : `File upload error: ${err.message}`
    });
  }

  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const isProduction = config.nodeEnv === 'production';

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode >= 500 ? 'An unexpected internal error occurred.' : (err.message || 'Internal Server Error')
  });
};
