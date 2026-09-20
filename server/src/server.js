import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import certRoutes from './routes/certRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import rulesRoutes from './routes/rulesRoutes.js';
import evalRoutes from './routes/evalRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded files in development
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint with database connection status
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const host = mongoose.connection.host || null;
  const isAtlas = (host && host.includes('mongodb.net')) || (config.mongoUri && config.mongoUri.startsWith('mongodb+srv://'));
  const target = isAtlas ? 'Atlas' : (host === 'localhost' || host === '127.0.0.1' ? 'Local' : 'Remote');

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'KTU Activity Points AI Platform',
    version: '1.0.0',
    database: {
      connected: isConnected,
      state: stateMap[mongoose.connection.readyState] || 'unknown',
      target: isConnected ? target : null,
      host: host,
      database: mongoose.connection.name || null,
      readyState: mongoose.connection.readyState
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', profileRoutes);
app.use('/api/certificates', certRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/evaluation', evalRoutes);

// Centralized error handler
app.use(errorHandler);

// Start server
let serverInstance = null;
const startServer = async () => {
  try {
    await connectDB();

    // Verify database connection state strictly before binding port
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Mongoose connection is not ready (readyState !== 1). Server start aborted.');
      process.exit(1);
    }

    const PORT = config.port || 5000;
    serverInstance = app.listen(PORT, () => {
      console.log(`🚀 KTU Activity Points API running on http://localhost:${PORT}`);
      console.log(`📚 Environment: ${config.nodeEnv}`);
    });
  } catch (err) {
    console.error(`❌ Fatal server startup failure: ${err.message}`);
    process.exit(1);
  }
};

const handleShutdown = async () => {
  if (serverInstance) {
    serverInstance.close();
  }
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

