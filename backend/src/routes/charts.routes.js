import { Router } from 'express';
import chartsController from '../controllers/charts.controller.js';

const router = Router();

// GET /api/charts/:reportId - Get all charts for a report
router.get('/:reportId', chartsController.getAllCharts);

// GET /api/charts/:reportId/:chartType - Get specific chart data
router.get('/:reportId/:chartType', chartsController.getData);

export default router;
