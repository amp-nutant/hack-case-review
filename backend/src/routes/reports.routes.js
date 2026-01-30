import { Router } from 'express';
import reportsController from '../controllers/reports.controller.js';

const router = Router();

// GET /api/reports - Get all reports
router.get('/', reportsController.getAll);

// GET /api/reports/:id/cases - Get cases for a report from case-details
router.get('/:id/cases', reportsController.getCasesFromDetails);

// GET /api/reports/by-report-id/:reportId - Get report by reportId field
router.get('/by-report-id/:reportId', reportsController.getByReportId);

// GET /api/reports/:id - Get a single report
router.get('/:id', reportsController.getById);

// GET /api/reports/:id/summary - Get report summary
router.get('/:id/summary', reportsController.getSummary);

// DELETE /api/reports/:id - Delete a report
router.delete('/:id', reportsController.delete);

export default router;
