import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import config from './config/index.js';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

