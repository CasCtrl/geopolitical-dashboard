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
import workspaceArtifactsRoutes from './routes/workspaceArtifacts.js';
import observability from './observability.cjs';
import adminObservability from './adminObservability.cjs';
import auditTrailModule from './auditTrail.cjs';
import persistentAuditSinkModule from './persistentAuditSink.cjs';
import { createIncidentTracker } from './utils/incidentTracker.js';
import sql from 'mssql';

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
  recordDbHealth,
  recordFrontendCrash,
  getObservabilitySnapshot,
} = observability;
const { buildAdminAlertsPayload } = adminObservability;
const { createAuditTrail } = auditTrailModule;
const { createPersistentAuditSink } = persistentAuditSinkModule;

const requestMetrics = initializeRequestMetrics();
const incidentTracker = createIncidentTracker({
  maxEntries: env.INCIDENT_MAX_ENTRIES,
  webhookUrl: env.INCIDENT_WEBHOOK_URL || undefined,
  persistIncident: async (incident) => {
    const pool = await getPool();
    if (!pool) {
      return;
    }

    const request = pool.request();
    request.input('severity', sql.NVarChar(20), incident.severity);
    request.input('category', sql.NVarChar(64), incident.category);
    request.input('message', sql.NVarChar(400), incident.message.slice(0, 400));
    request.input('requestId', sql.NVarChar(120), incident.requestId || null);
    request.input('traceId', sql.NVarChar(120), incident.traceId || null);
    request.input('context', sql.NVarChar(sql.MAX), JSON.stringify(incident.context || null));
    await request.query(`
      INSERT INTO ObservabilityIncidents (severity, category, message, requestId, traceId, context)
      VALUES (@severity, @category, @message, @requestId, @traceId, @context)
    `);
  },
});
const auditTrail = createAuditTrail({ maxEntries: env.AUDIT_TRAIL_MAX_ENTRIES });
const persistentAuditSink = createPersistentAuditSink({
  enabled: env.AUDIT_SINK_ENABLED,
  directory: env.AUDIT_SINK_DIR,
  maxFiles: env.AUDIT_SINK_MAX_FILES,
  logger: ({ message, error }) => {
    logEvent('error', message, { error });
  },
});

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

function maskEmail(value) {
  if (typeof value !== 'string' || !value.includes('@')) {
    return value;
  }

  const [local, domain] = value.split('@');
  if (!local || !domain) {
    return value;
  }

  const visiblePrefix = local.slice(0, 2);
  return `${visiblePrefix}${'*'.repeat(Math.max(local.length - 2, 0))}@${domain}`;
}

function classifyAuditableAction(req) {
  const method = req.method.toUpperCase();

  if (method === 'GET' && req.path === '/api/admin/metrics') {
    return { action: 'admin.metrics.read', target: 'runtime-metrics', details: {} };
  }

  if (method === 'GET' && req.path === '/api/admin/observability') {
    return { action: 'admin.observability.read', target: 'request-observability', details: {} };
  }

  if (method === 'GET' && req.path === '/api/admin/alerts') {
    return { action: 'admin.alerts.read', target: 'active-alerts', details: {} };
  }

  if (method === 'GET' && req.path === '/api/admin/audit-trail') {
    return {
      action: 'admin.audit-trail.read',
      target: 'audit-trail',
      details: { limit: req.query?.limit ?? undefined },
    };
  }

  if (method === 'POST' && req.path === '/api/reports/generate') {
    return {
      action: 'release.report.generate',
      target: 'reporting',
      details: {
        format: req.body?.format,
        includeCharts: req.body?.includeCharts,
      },
    };
  }

  if (method === 'POST' && req.path === '/api/reports/email') {
    return {
      action: 'release.report.email',
      target: 'reporting',
      details: {
        recipientEmail: maskEmail(req.body?.recipientEmail),
      },
    };
  }

  if (method === 'POST' && req.path === '/api/reports/schedule') {
    return {
      action: 'release.report.schedule',
      target: 'reporting',
      details: {
        format: req.body?.format,
        frequency: req.body?.frequency,
        recipientEmail: maskEmail(req.body?.recipientEmail),
      },
    };
  }

  return null;
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
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", ...allowedOrigins],
    },
  },
  referrerPolicy: {
    policy: 'no-referrer',
  },
  hsts: env.NODE_ENV === 'production'
    ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    }
    : false,
  crossOriginResourcePolicy: {
    policy: 'same-site',
  },
}));
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
  req.traceId = req.headers['x-trace-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Trace-Id', req.traceId);
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

const expensiveReadLimiter = rateLimit({
  windowMs: env.EXPENSIVE_READ_WINDOW_MS,
  limit: env.EXPENSIVE_READ_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    sendApiError(res, {
      statusCode: 429,
      code: 'ABUSE_PROTECTION_TRIGGERED',
      message: 'Too many expensive read requests',
      requestId: req.requestId,
    });
  },
});

const expensiveWriteLimiter = rateLimit({
  windowMs: env.EXPENSIVE_WRITE_WINDOW_MS,
  limit: env.EXPENSIVE_WRITE_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    sendApiError(res, {
      statusCode: 429,
      code: 'ABUSE_PROTECTION_TRIGGERED',
      message: 'Too many expensive write requests',
      requestId: req.requestId,
    });
  },
});

const adminLimiter = rateLimit({
  windowMs: env.ADMIN_RATE_LIMIT_WINDOW_MS,
  limit: env.ADMIN_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    sendApiError(res, {
      statusCode: 429,
      code: 'ADMIN_RATE_LIMITED',
      message: 'Too many admin requests',
      requestId: req.requestId,
    });
  },
});

app.use('/api', apiLimiter);
app.use(express.json({ limit: '1mb' }));
app.use('/api/news', expensiveReadLimiter);
app.use('/api/reports/generate', expensiveWriteLimiter);
app.use('/api/reports/email', expensiveWriteLimiter);
app.use('/api/reports/schedule', expensiveWriteLimiter);

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
      traceId: req.traceId,
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
app.use('/api/admin', adminLimiter);

app.locals.observability = {
  requestMetrics,
  incidentTracker,
  recordNewsIngestion: (payload) => observability.recordNewsIngestion(requestMetrics, payload),
};

app.use((req, res, next) => {
  const action = classifyAuditableAction(req);
  if (!action) {
    return next();
  }

  res.on('finish', () => {
    const outcome = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure';
    const auditEntry = auditTrail.record({
      requestId: req.requestId,
      actorRole: req.user?.role || 'viewer',
      actorAuthMode: req.user?.authMode || 'unknown',
      actorIp: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
      action: action.action,
      target: action.target,
      statusCode: res.statusCode,
      outcome,
      details: action.details,
    });

    logEvent('info', 'audit.action', {
      requestId: auditEntry.requestId,
      action: auditEntry.action,
      target: auditEntry.target,
      actorRole: auditEntry.actorRole,
      outcome: auditEntry.outcome,
      statusCode: auditEntry.statusCode,
    });

    void persistentAuditSink.write(auditEntry);
  });

  return next();
});

// Routes
app.use('/api', assetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api', newsRoutes);
app.use('/api', workspaceArtifactsRoutes);

app.post('/api/telemetry/frontend-crash', async (req, res, next) => {
  try {
    const release = typeof req.body?.release === 'string' && req.body.release.trim()
      ? req.body.release.trim()
      : APP_VERSION;
    const message = typeof req.body?.message === 'string' && req.body.message.trim()
      ? req.body.message.trim()
      : 'frontend crash reported';

    recordFrontendCrash(requestMetrics, { release });

    await incidentTracker.capture({
      severity: 'high',
      category: 'frontend_crash',
      message,
      requestId: req.requestId,
      traceId: req.traceId,
      context: {
        release,
        route: req.body?.route || null,
        stack: req.body?.stack || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(202).json({
      accepted: true,
      requestId: req.requestId,
      traceId: req.traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

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

  const thresholds = {
    minRequests: env.OBS_MIN_REQUESTS,
    errorRatePct: env.OBS_ERROR_RATE_THRESHOLD_PCT,
    p95LatencyMs: env.OBS_P95_LATENCY_THRESHOLD_MS,
    dbHealthMinPct: env.OBS_DB_HEALTH_MIN_PCT,
    newsIngestionMinSuccessPct: env.OBS_NEWS_INGESTION_MIN_SUCCESS_PCT,
    frontendCrashMaxPer1kRequests: env.OBS_FRONTEND_CRASH_MAX_PER_1K,
  };

  res.json(buildAdminAlertsPayload({ ready, requestMetrics, thresholds }));
});

app.get('/api/admin/audit-trail', requireRoles([ADMIN_ROLE]), async (req, res) => {
  const rawLimit = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 100;

  res.json({
    entries: auditTrail.listRecent({ limit }),
    totalEntries: auditTrail.size(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/admin/incidents', requireRoles([ADMIN_ROLE]), async (req, res) => {
  const rawLimit = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 100;

  res.json({
    incidents: incidentTracker.list({ limit }),
    summary: incidentTracker.summary(),
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
  recordDbHealth(requestMetrics, { healthy: ready });

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
    traceId: req.traceId,
    method: req.method,
    path: req.originalUrl,
    code,
    message,
    details: isApiError ? err.details : undefined,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  void incidentTracker.capture({
    severity: statusCode >= 500 ? 'critical' : 'medium',
    category: 'request_failure',
    message: `${code}: ${message}`,
    requestId: req.requestId,
    traceId: req.traceId,
    context: {
      method: req.method,
      path: req.originalUrl,
      details: isApiError ? err.details : undefined,
    },
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
  void incidentTracker.capture({
    severity: 'critical',
    category: 'unhandled_rejection',
    message: reason instanceof Error ? reason.message : String(reason),
    context: reason instanceof Error ? { stack: reason.stack } : { reason: String(reason) },
  });
});

process.on('uncaughtException', error => {
  logEvent('error', 'process.uncaughtException', {
    message: error.message,
    stack: error.stack,
  });
  void incidentTracker.capture({
    severity: 'critical',
    category: 'uncaught_exception',
    message: error.message,
    context: { stack: error.stack },
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
      incidentWebhookConfigured: Boolean(env.INCIDENT_WEBHOOK_URL),
    });

    // Try a warm DB connection at startup and continue in degraded mode when unavailable.
    try {
      await getPool();
      recordDbHealth(requestMetrics, { healthy: true });
    } catch (dbErr) {
      logEvent('error', 'database.connect.failed', {
        message: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
      recordDbHealth(requestMetrics, { healthy: false });
      void incidentTracker.capture({
        severity: 'critical',
        category: 'database_connect_failed',
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
