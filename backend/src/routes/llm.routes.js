import { Router } from 'express';
import { processChat } from '../services/chatbot.service.js';

const router = Router();

// Check LLM service status
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'LLM service is running',
  });
});

// Chat endpoint - process natural language queries about cases
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }
    
    console.log(`[LLM Chat] Processing query: "${message.substring(0, 100)}..."`);
    
    const response = await processChat(message, history);
    
    console.log(`[LLM Chat] Response generated, context type: ${response.context}`);
    
    res.json({
      content: response.content,
      contextType: response.context,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[LLM Chat] Error:', error.message);
    
    // Return a user-friendly error
    res.status(500).json({
      error: 'Failed to process chat request',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

export default router;

