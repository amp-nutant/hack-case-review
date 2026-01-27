import { Router } from 'express';
import { generateCompletion, checkLLMStatus } from '../services/llm.service.js';

const router = Router();

// Check LLM service status
router.get('/status', async (_req, res) => {
  try {
    const status = await checkLLMStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Generate completion
router.post('/completion', async (req, res) => {
  try {
    const { prompt, options } = req.body;

    if (!prompt) {
      return res.status(400).json({
        status: 'error',
        message: 'Prompt is required',
      });
    }

    const result = await generateCompletion(prompt, options);
    res.json({
      status: 'ok',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

export default router;

