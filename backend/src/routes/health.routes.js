import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (_req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: mongoStates[mongoStatus] || 'unknown',
      connected: mongoStatus === 1,
    },
  });
});

export default router;

