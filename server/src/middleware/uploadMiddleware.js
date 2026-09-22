import multer from 'multer';
import path from 'path';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../config/constants.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`Unsupported file extension "${ext}". Allowed: PDF, PNG, JPG, JPEG.`),
      false
    );
  }

  // Permissive check: accept standard MIME types, common browser aliases, or fallback if extension is valid
  const validMimes = [
    ...ALLOWED_MIME_TYPES,
    'application/x-pdf',
    'image/pjpeg',
    'image/x-png',
    'application/octet-stream',
    'binary/octet-stream'
  ];

  if (file.mimetype && !validMimes.includes(file.mimetype.toLowerCase())) {
    return cb(
      new Error(`Unsupported MIME type "${file.mimetype}". Allowed: PDF, PNG, JPG.`),
      false
    );
  }

  cb(null, true);
};

const _multerSingle = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter
}).single('certificate');

/**
 * Wrapper that ensures multer errors (MulterError + custom fileFilter errors)
 * are forwarded to the centralized Express error handler via next(err).
 * Without this, multer swallows the error or sends a bare response.
 */
export const uploadSingle = (req, res, next) => {
  _multerSingle(req, res, (err) => {
    if (!err) return next();
    // Preserve MulterError name so errorHandler can identify and format it correctly
    if (err.name !== 'MulterError') {
      err.name = 'MulterError';
    }
    return next(err);
  });
};
