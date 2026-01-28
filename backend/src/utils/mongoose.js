import mongoose from "mongoose";

import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI } = process.env;

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });

    console.log(`📦 MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

export {
  connectToMongoDB,
};