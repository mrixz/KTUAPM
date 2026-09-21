import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
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
    'https://ktuapm.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:5000'
  ]);

  const frontendEnv = process.env.FRONTEND_URL || config.frontendUrl;
  if (frontendEnv) {
    frontendEnv.split(',').forEach((url) => {
      const clean = url.trim().replace(/\/+$/, '');
      if (clean) origins.add(clean);
    });
  }

  const allowedEnv = process.env.ALLOWED_ORIGINS || config.allowedOrigins;
  if (allowedEnv) {
    allowedEnv.split(',').forEach((url) => {
      const clean = url.trim().replace(/\/+$/, '');
      if (clean) origins.add(clean);
    });
  }

  return Array.from(origins);
};

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, health probes)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      const dynamicOrigins = buildAllowedOrigins();

      if (
        dynamicOrigins.includes(normalizedOrigin) ||
        (process.env.NODE_ENV || config.nodeEnv) !== 'production'
      ) {
        return callback(null, true);
      }

      // Check if matches Render frontend pattern
      if (
        normalizedOrigin === 'https://ktuapm.onrender.com' ||
        (normalizedOrigin.startsWith('https://') && normalizedOrigin.endsWith('.onrender.com'))
      ) {
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
  res.setHeader('X-XSS-Protection', '1; mode=block');
  const isProd = (process.env.NODE_ENV || config.nodeEnv) === 'production';
  if (isProd) {
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

// ── Root Endpoint & SPA Fallback ──────────────────────────────────────────────
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const hasClientBuild = fs.existsSync(path.join(clientDistPath, 'index.html'));

if (hasClientBuild) {
  // Serve static assets when frontend build is present
  app.use(express.static(clientDistPath));

  // Single-Page Application rewrite fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // API-only mode (e.g. Render backend web service): provide friendly root response
  app.get('/', (req, res) => {
    const isRender =
      process.env.RENDER === 'true' ||
      (req.hostname && req.hostname.includes('onrender.com'));

    const frontendUrl =
      (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost'))
        ? process.env.FRONTEND_URL
        : (isRender ? 'https://ktuapm.onrender.com' : 'http://localhost:5173');

    const portalUrl = isRender ? `${frontendUrl}/#/` : frontendUrl;
    const acceptsHtml = req.accepts(['json', 'html']) === 'html';

    if (acceptsHtml) {
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="2;url=${portalUrl}">
  <title>KTU Activity Points Platform API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
    .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); text-align: center; max-width: 480px; border: 1px solid #334155; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .status { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(34, 197, 94, 0.1); color: #4ade80; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 500; margin-bottom: 1.5rem; }
    .status::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
    .btn { display: inline-block; background: #3b82f6; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: background 0.2s; }
    .btn:hover { background: #2563eb; }
    .subtext { margin-top: 1rem; font-size: 0.8rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">API Service Online</div>
    <h1>KTU Activity Points Platform</h1>
    <p>This is the backend API service. Launch the student portal below or wait to be redirected.</p>
    <a href="${portalUrl}" class="btn">Launch Student Portal &rarr;</a>
    <div class="subtext">Redirecting automatically in 2 seconds...</div>
  </div>
</body>
</html>`);
    }

    res.status(200).json({
      service: 'KTU Activity Points Management API',
      status: 'online',
      version: '1.0.0',
      health: '/health',
      frontend: portalUrl
    });
  });
}

// Unmatched API routes return clean JSON 404 instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

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
      console.log(`📚 Environment: ${process.env.NODE_ENV || config.nodeEnv}`);
      console.log(`🌐 Allowed CORS Origins: ${buildAllowedOrigins().join(', ')}`);
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

