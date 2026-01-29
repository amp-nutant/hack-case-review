import { Router } from 'express';
import healthRoutes from './health.routes.js';
import llmRoutes from './llm.routes.js';
import reportsRoutes from './reports.routes.js';
import casesRoutes from './cases.routes.js';
import uploadRoutes from './upload.routes.js';
import analysisRoutes from './analysis.routes.js';
import chartsRoutes from './charts.routes.js';
import clustersRoutes from './clusters.routes.js';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// LLM routes
router.use('/llm', llmRoutes);

// Reports routes (includes /reports/:id/cases from case-details)
router.use('/reports', reportsRoutes);

// Cases routes
router.use('/cases', casesRoutes);

// Upload routes
router.use('/upload', uploadRoutes);

// Analysis routes
router.use('/analysis', analysisRoutes);

// Charts routes
router.use('/charts', chartsRoutes);

// Clusters routes
router.use('/issue-groups', clustersRoutes);

// Root API route
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Case Review API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      reports: '/api/reports',
      cases: '/api/cases',
      upload: '/api/upload',
      analysis: '/api/analysis',
      charts: '/api/charts',
      clusters: '/api/issue-groups',
      llm: '/api/llm',
    },
  });
});

export default router;

