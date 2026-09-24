import express from 'express';
import {
  uploadCertificate,
  getCertificates,
  getCertificateById,
  deleteCertificate,
  reprocessCertificate,
  streamCertificateFile
} from '../controllers/certController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingle } from '../middleware/uploadMiddleware.js';
import { uploadLimiter, recheckLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// All certificate routes require authentication
router.use(protect);

// Upload: rate-limited per student (user-keyed, not IP-keyed)
router.post('/', uploadLimiter, uploadSingle, uploadCertificate);
router.get('/', getCertificates);
router.get('/:id', getCertificateById);
router.delete('/:id', deleteCertificate);
// Re-check: separately rate-limited per student to prevent OCR/Gemini abuse
router.post('/:id/process', recheckLimiter, reprocessCertificate);
router.get('/:id/file', streamCertificateFile);

export default router;
