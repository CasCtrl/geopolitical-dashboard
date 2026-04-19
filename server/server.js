import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './db/config.js';
import { initializeDatabase } from './db/init.js';
import assetsRoutes from './routes/assets.js';
import reportsRoutes from './routes/reports.js';
import newsRoutes from './routes/news.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.SERVER_PORT || 5001;
const APP_VERSION = process.env.APP_VERSION || '1.1';
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true';
const API_TOKEN = process.env.API_TOKEN;
const ADMIN_ROLE = process.env.ADMIN_ROLE || 'admin';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function logEvent(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const serialized = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

function getRequestRole(req) {
  const roleHeader = req.headers['x-user-role'];
  if (typeof roleHeader === 'string' && roleHeader.trim()) {
    return roleHeader.trim().toLowerCase();
  }

  return 'viewer';
}

function authMiddleware(req, res, next) {
  if (!AUTH_REQUIRED) {
    req.user = { role: getRequestRole(req), authMode: 'open' };
    return next();
  }

  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  const apiKey = req.headers['x-api-key'];
  const providedToken = bearerToken || (typeof apiKey === 'string' ? apiKey.trim() : '');

  if (!API_TOKEN || providedToken !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = { role: getRequestRole(req), authMode: 'token' };
  return next();
}

function requireRoles(allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role || 'viewer';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

// Middleware
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: false,
}));

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number.parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    logEvent('info', 'request.completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      role: req.user?.role,
    });
  });

  next();
});

app.use('/api', authMiddleware);

// Routes
app.use('/api', assetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api', newsRoutes);

app.get('/api/admin/metrics', requireRoles([ADMIN_ROLE]), async (req, res) => {
  const memory = process.memoryUsage();
  const dbPool = await getPool();

  res.json({
    uptimeSeconds: process.uptime(),
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
    databaseConnected: Boolean(dbPool?.connected),
    nodeVersion: process.version,
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: APP_VERSION, timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  const dbPool = await getPool();
  const ready = Boolean(dbPool?.connected);

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'degraded',
    databaseConnected: ready,
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  logEvent('error', 'request.failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId,
  });
});

process.on('unhandledRejection', reason => {
  logEvent('error', 'process.unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', error => {
  logEvent('error', 'process.uncaughtException', {
    message: error.message,
    stack: error.stack,
  });
});

// Initialize database and start server
async function start() {
  try {
    logEvent('info', 'server.starting', { port: PORT, authRequired: AUTH_REQUIRED });
    
    // Initialize database (non-blocking)
    initializeDatabase().catch(err => {
      logEvent('error', 'database.init.failed', { message: err.message });
    });

    // Start server
    app.listen(PORT, () => {
      logEvent('info', 'server.started', {
        baseUrl: `http://localhost:${PORT}`,
        apiUrl: `http://localhost:${PORT}/api`,
      });
    });
  } catch (err) {
    logEvent('error', 'server.failed', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  }
}

start();

export default app;
