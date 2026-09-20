import express from 'express';
import { getLatestEvaluation, runEvaluation } from '../controllers/evalController.js';

const router = express.Router();

router.get('/latest', getLatestEvaluation);
router.post('/run', runEvaluation);

export default router;
