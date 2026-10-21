import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';

import mysqlService from './utils/mysqlClient.js';
import { initDatabase } from './init_db.js';

import dashboard, { warmDashboardCache } from './routes/dashboard.js';
import performance, { warmPerformanceCache } from './routes/performance.js';
import ai from './routes/ai.js';
import news from './routes/news.js';
import users from './routes/users.js';

const app = express();

// 1. Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 4820;
const basePath = "/fin/api";

// === ROUTES ===
// Dashboard data routes (MySQL backed)
app.use(`${basePath}/dashboard-data`, dashboard);

// Performance views routes (MySQL backed)
app.use(`${basePath}/performance-views`, performance);

// AI Assistant routes (MySQL backed finance service)
app.use(`${basePath}/ai`, ai);

// Live News routes (market intelligence)
app.use(`${basePath}/news`, news);

// User routes (MySQL backed user authentication & scoping)
app.use(`${basePath}/user`, users);

// Health check route
app.get(`${basePath}/health`, async (req, res) => {
  const dbStatus = await mysqlService.testConnection();
  res.json({
    status: dbStatus ? 'OK' : 'DEGRADED',
    database: 'MySQL',
    connected: dbStatus,
    message: 'Server is running'
  });
});

// Root health check fallback
app.get('/health', async (req, res) => {
  const dbStatus = await mysqlService.testConnection();
  res.json({
    status: dbStatus ? 'OK' : 'DEGRADED',
    database: 'MySQL',
    connected: dbStatus,
    message: 'Server is running'
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Internal Error]', err.message);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'An internal server error occurred.' : (err.message || 'Internal error'),
  });
});

// Startup: Verify MySQL connectivity and initialize tables (local development only)
async function startServer() {
  try {
    const isConnected = await mysqlService.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to MySQL database.');
    }
    console.log('[Server] Connected to MySQL database successfully.');

    // Initialize database tables if needed
    await initDatabase();

    app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] Running on port ${port} (MySQL mode)`);
      // Pre-warm dashboard and performance caches in background so user logins are instant
      setTimeout(() => {
        Promise.all([warmDashboardCache(), warmPerformanceCache()]).catch((err) => {
          console.warn('[Cache Warmup] Notice:', err.message);
        });
      }, 500);
    });
  } catch (error) {
    console.error('[Server Startup Error]:', error.message);
    process.exit(1);
  }
}

// In Vercel serverless environments, VERCEL is '1', so we export app directly
// In local development, startServer() runs the HTTP listener and cache warmup
if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
