import { Router } from 'express';

const router = Router();

// Check LLM service status
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'LLM service is running',
  });
});

export default router;

