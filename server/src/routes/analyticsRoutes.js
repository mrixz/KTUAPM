import express from 'express';
import {
  getOverview,
  getCategories,
  getTimeline,
  getOpportunities,
  getTelemetryMetrics
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/overview', getOverview);
router.get('/categories', getCategories);
router.get('/timeline', getTimeline);
router.get('/opportunities', getOpportunities);
router.get('/telemetry', getTelemetryMetrics);

export default router;
