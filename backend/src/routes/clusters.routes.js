import { Router } from 'express';
import analysisController from '../controllers/analysis.controller.js';

const router = Router();

// GET /api/clusters/:reportId - Get clusters for a report
router.get('/:reportId', analysisController.getClusters);

export default router;
