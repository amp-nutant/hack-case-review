import mongoose from 'mongoose';
import config from './index.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      // Mongoose 8 uses these defaults, but being explicit
      autoIndex: true,
    });

    console.log(`📦 MongoDB connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    // In development, continue without DB
    if (config.nodeEnv === 'development') {
      console.warn('⚠️  Running without database connection');
      return null;
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
};

