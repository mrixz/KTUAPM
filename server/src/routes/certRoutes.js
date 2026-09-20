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

const router = express.Router();

router.use(protect);

router.post('/', uploadSingle, uploadCertificate);
router.get('/', getCertificates);
router.get('/:id', getCertificateById);
router.delete('/:id', deleteCertificate);
router.post('/:id/process', reprocessCertificate);
router.get('/:id/file', streamCertificateFile);

export default router;
