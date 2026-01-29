import { Router } from 'express';
import overviewController from '../controllers/overview.controller.js';

const router = Router();

// Overview stats for a report (or all cases)
router.get('/:reportId', overviewController.getOverview);
router.get('/', overviewController.getOverview);

export default router;
