import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import { getPool } from './db/config.js';
import { initializeDatabase } from './db/init.js';
import { ApiError, sendApiError } from './middleware/apiError.js';
import assetsRoutes from './routes/assets.js';
import reportsRoutes from './routes/reports.js';
import newsRoutes from './routes/news.js';
import observability from './observability.cjs';

const app = express();
const PORT = env.SERVER_PORT;
const APP_VERSION = env.APP_VERSION;
const AUTH_REQUIRED = env.AUTH_REQUIRED;
const API_TOKEN = env.API_TOKEN;
const ADMIN_ROLE = env.ADMIN_ROLE;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openApiPath = path.join(__dirname, 'openapi.yaml');
const {
  DEFAULT_MAX_LATENCY_SAMPLES,
  initializeRequestMetrics,
  recordRequestCompletion,
  getObservabilitySnapshot,
  getActiveAlerts,
} = observability;

const requestMetrics = initializeRequestMetrics();

const allowedOrigins = env.ALLOWED_ORIGINS
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
    return sendApiError(res, {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      requestId: req.requestId,
    });
  }

  req.user = { role: getRequestRole(req), authMode: 'token' };
  return next();
}

function requireRoles(allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role || 'viewer';
    if (!allowedRoles.includes(role)) {
      return sendApiError(res, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
        requestId: req.requestId,
      });
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

    callback(new ApiError(403, 'CORS_ORIGIN_DENIED', 'Not allowed by CORS'));
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
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    sendApiError(res, {
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      requestId: req.requestId,
    });
  },
});

app.use('/api', apiLimiter);
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    recordRequestCompletion(requestMetrics, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      maxLatencySamples: DEFAULT_MAX_LATENCY_SAMPLES,
    });

    logEvent('info', 'request.completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
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

app.get('/api/admin/observability', requireRoles([ADMIN_ROLE]), async (req, res) => {
  res.json({
    ...getObservabilitySnapshot(requestMetrics),
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/admin/alerts', requireRoles([ADMIN_ROLE]), async (req, res) => {
  const dbPool = await getPool();
  const ready = Boolean(dbPool?.connected);

  res.json({
    alerts: getActiveAlerts({
      ready,
      requestMetrics,
      thresholds: {
        minRequests: env.OBS_MIN_REQUESTS,
        errorRatePct: env.OBS_ERROR_RATE_THRESHOLD_PCT,
        p95LatencyMs: env.OBS_P95_LATENCY_THRESHOLD_MS,
      },
    }),
    thresholds: {
      minRequests: env.OBS_MIN_REQUESTS,
      errorRatePct: env.OBS_ERROR_RATE_THRESHOLD_PCT,
      p95LatencyMs: env.OBS_P95_LATENCY_THRESHOLD_MS,
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: APP_VERSION, timestamp: new Date().toISOString() });
});

// Backward-compatible health endpoint used by the frontend settings panel.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: APP_VERSION, timestamp: new Date().toISOString() });
});

app.get('/api/meta', (req, res) => {
  res.json({
    name: 'geopolitical-dashboard-api',
    version: APP_VERSION,
    openApiPath: '/api/openapi.yaml',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/openapi.yaml', async (req, res, next) => {
  try {
    const spec = await readFile(openApiPath, 'utf8');
    res.type('application/yaml').send(spec);
  } catch {
    next(new ApiError(404, 'OPENAPI_NOT_FOUND', 'OpenAPI specification not found'));
  }
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
  void next;
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';
  const message = isApiError ? err.message : 'Internal server error';

  logEvent('error', 'request.failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    code,
    message,
    details: isApiError ? err.details : undefined,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  return sendApiError(res, {
    statusCode,
    code,
    message,
    details: isApiError ? err.details : undefined,
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
    logEvent('info', 'server.starting', {
      port: PORT,
      authRequired: AUTH_REQUIRED,
      nodeEnv: env.NODE_ENV,
      dbConnectStrict: env.DB_CONNECT_STRICT,
      dbInitEnabled: env.DB_INIT_ENABLED,
    });

    // Try a warm DB connection at startup and continue in degraded mode when unavailable.
    try {
      await getPool();
    } catch (dbErr) {
      logEvent('error', 'database.connect.failed', {
        message: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });

      if (env.DB_CONNECT_STRICT) {
        throw dbErr;
      }
    }
    
    // Initialize database schema/data in the background when enabled.
    if (env.DB_INIT_ENABLED) {
      initializeDatabase().catch(err => {
        logEvent('error', 'database.init.failed', { message: err.message });
      });
    }

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
