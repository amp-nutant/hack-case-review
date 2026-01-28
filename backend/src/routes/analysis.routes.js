import { Router } from 'express';
import analysisController from '../controllers/analysis.controller.js';

const router = Router();

// POST /api/analysis - Create analysis entry
router.post('/', analysisController.createAnalysis);

// POST /api/analysis/summary - Generate summary for a report
router.post('/summary', analysisController.generateSummary);

// POST /api/analysis/chat - Chat with AI about the report
router.post('/chat', analysisController.chat);

// GET /api/analysis/:reportId/history - Get chat history
router.get('/:reportId/history', analysisController.getChatHistory);

export default router;
