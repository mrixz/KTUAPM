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

// Build list of allowed origins from environment and local defaults
const buildAllowedOrigins = () => {
  const origins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:5000'
  ]);

  if (config.frontendUrl) {
    config.frontendUrl.split(',').forEach((url) => {
      const clean = url.trim().replace(/\/+$/, '');
      if (clean) origins.add(clean);
    });
  }

  if (config.allowedOrigins) {
    config.allowedOrigins.split(',').forEach((url) => {
      const clean = url.trim().replace(/\/+$/, '');
      if (clean) origins.add(clean);
    });
  }

  return Array.from(origins);
};

const allowedOriginsList = buildAllowedOrigins();

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, health probes)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOriginsList.includes(normalizedOrigin) ||
        config.nodeEnv !== 'production'
      ) {
        return callback(null, true);
      }

      // Check if matches Render subdomain pattern if configured
      if (config.frontendUrl && origin.startsWith('https://') && origin.includes('.onrender.com')) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection: 1', 'mode=block');
  if (config.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded files in development (when using local storage)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check handler function
const healthCheckHandler = (req, res) => {
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
    environment: config.nodeEnv,
    storageProvider: config.storageProvider,
    database: {
      connected: isConnected,
      state: stateMap[mongoose.connection.readyState] || 'unknown',
      target: isConnected ? target : null,
      host: host,
      database: mongoose.connection.name || null,
      readyState: mongoose.connection.readyState
    }
  });
};

// Health check endpoints (both /health for Render probes and /api/health for frontend)
app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

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

    const PORT = parseInt(process.env.PORT || config.port || '5000', 10);
    const HOST = '0.0.0.0';
    serverInstance = app.listen(PORT, HOST, () => {
      console.log(`🚀 KTU Activity Points API running on http://${HOST}:${PORT}`);
      console.log(`📚 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Allowed CORS Origins: ${allowedOriginsList.join(', ')}`);
      console.log(`📦 Storage Provider: ${config.storageProvider}`);
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

