import { Router } from 'express';
import analysisController from '../controllers/analysis.controller.js';

const router = Router();

// POST /api/analysis/summary - Generate summary for a report
router.post('/summary', analysisController.generateSummary);

// POST /api/analysis/chat - Chat with AI about the report
router.post('/chat', analysisController.chat);

// GET /api/analysis/:reportId/history - Get chat history
router.get('/:reportId/history', analysisController.getChatHistory);

// GET /api/analysis/aggregated - Get aggregated analysis from batch processing
router.get('/aggregated', analysisController.getAggregatedAnalysis);

// GET /api/analysis/clusters - Get clusters from aggregated analysis
router.get('/clusters', analysisController.getAggregatedClusters);

// GET /api/analysis/cases - Get filterable case list
router.get('/cases', analysisController.getCaseList);

// GET /api/analysis/cases/:caseNumber - Get single case analysis
router.get('/cases/:caseNumber', analysisController.getCaseAnalysis);

// GET /api/analysis/buckets - Get all buckets
router.get('/buckets', analysisController.getBuckets);

// GET /api/analysis/buckets/:dimension - Get specific bucket
router.get('/buckets/:dimension', analysisController.getBuckets);

export default router;
