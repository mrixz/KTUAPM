import express from 'express';
import { getCurrentRules, getAllRules, previewScheme } from '../controllers/rulesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/all', getAllRules);
router.get('/resolve-preview', previewScheme);
router.post('/resolve-preview', previewScheme);
router.get('/current', protect, getCurrentRules);

export default router;

