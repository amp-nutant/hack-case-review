import { Router } from 'express';
import healthRoutes from './health.routes.js';
import llmRoutes from './llm.routes.js';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// LLM routes
router.use('/llm', llmRoutes);

// Root API route
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Case Review API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      llm: '/api/llm',
    },
  });
});

export default router;

