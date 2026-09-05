import express from 'express';
import dns from 'dns/promises';
import net from 'net';
import { ApiError } from '../middleware/apiError.js';
import { z, validateBody } from '../middleware/validate.js';
import { buildMetadata, sendDataWithMeta } from '../utils/responseMetadata.js';
import env from '../config/env.js';
import { getPool } from '../db/config.js';
import {
  getLatestArtifact,
  putArtifactVersion,
  resolveActorContext,
} from '../utils/workspaceArtifactsStore.js';

const router = express.Router();
const IMPORT_ARTIFACT_TYPE = 'portfolio_imports';
const PIPELINE_ARTIFACT_TYPE = 'pipeline_runs';
const OUTBOUND_USER_AGENT = 'GeopoliticalDashboard-Integration/1.0';

const importPortfolioSchema = z.object({
  provider: z.enum(['bloomberg', 'csv', 'manual']),
  payload: z
    .object({
      positions: z.array(z.any()).optional(),
    })
    .passthrough()
    .optional(),
  artifactKey: z.string().min(1).max(128).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

const runPipelineSchema = z.object({
  sources: z.array(z.string().url()).optional(),
  artifactKey: z.string().min(1).max(128).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

function parsePipelineSources() {
  return String(env.PIPELINE_SOURCE_URLS || '')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);
}

function parseAllowedHosts() {
  return String(env.PIPELINE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isBlockedIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  return false;
}

function isBlockedIpv6(ip) {
  const addr = ip.toLowerCase();
  if (addr === '::1' || addr === '::') return true; // loopback / unspecified
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // fc00::/7 unique-local
  if (addr.startsWith('fe80')) return true; // link-local

  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isBlockedIpv4(mapped[1]);
  }

  return false;
}

function isBlockedAddress(ip) {
  return net.isIPv4(ip) ? isBlockedIpv4(ip) : isBlockedIpv6(ip);
}

function pipelineSourceBlocked(reason) {
  const error = new Error(reason);
  error.code = 'PIPELINE_SOURCE_BLOCKED';
  return error;
}

// SSRF guard: only allow http(s) URLs whose hostname is explicitly allowlisted and whose
// resolved address is not in a private/loopback/link-local range. An empty allowlist denies
// all external hosts (safe default).
async function assertAllowedPipelineSource(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw pipelineSourceBlocked('invalid_source_url');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw pipelineSourceBlocked('unsupported_scheme');
  }

  const host = parsed.hostname.toLowerCase();
  if (!parseAllowedHosts().includes(host)) {
    throw pipelineSourceBlocked('host_not_allowlisted');
  }

  let candidates;
  if (net.isIP(host)) {
    candidates = [host];
  } else {
    const resolved = await dns.lookup(host, { all: true });
    candidates = resolved.map((entry) => entry.address);
  }

  if (candidates.length === 0 || candidates.some((ip) => isBlockedAddress(ip))) {
    throw pipelineSourceBlocked('blocked_network_target');
  }
}

function normalizePosition(position, index) {
  return {
    id: position?.id || `position-${index + 1}`,
    ticker: String(position?.ticker || position?.symbol || 'UNKNOWN').toUpperCase(),
    name: String(position?.name || position?.assetName || 'Unknown Asset'),
    quantity: Number(position?.quantity ?? position?.units ?? 0),
    marketValue: Number(position?.marketValue ?? position?.value ?? 0),
    currency: String(position?.currency || 'USD'),
    source: String(position?.source || 'integration').toLowerCase(),
  };
}

async function fetchJson(url, { token, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'User-Agent': OUTBOUND_USER_AGENT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadBloombergPortfolio() {
  if (!env.BLOOMBERG_PORTFOLIO_API_URL) {
    return {
      positions: [],
      fallbackUsed: true,
      fallbackReason: 'bloomberg_api_not_configured',
      integrationSource: 'bloomberg',
    };
  }

  const payload = await fetchJson(env.BLOOMBERG_PORTFOLIO_API_URL, {
    token: env.BLOOMBERG_API_TOKEN || undefined,
    timeoutMs: env.PORTFOLIO_INTEGRATION_TIMEOUT_MS,
  });

  const positions = Array.isArray(payload?.positions) ? payload.positions : [];
  return {
    positions: positions.map(normalizePosition),
    fallbackUsed: false,
    fallbackReason: null,
    integrationSource: 'bloomberg',
  };
}

async function persistArtifact({ req, artifactType, artifactKey, payload, expectedVersion }) {
  let pool;
  try {
    pool = await getPool();
  } catch {
    return { persisted: false, version: null };
  }

  if (!pool) {
    return { persisted: false, version: null };
  }

  try {
    const context = resolveActorContext(req);
    const persisted = await putArtifactVersion(pool, {
      context,
      artifactType,
      artifactKey,
      payload,
      expectedVersion,
      traceId: req.traceId,
    });

    return {
      persisted: true,
      version: persisted.version,
    };
  } catch (error) {
    if (error?.code === 'ARTIFACT_VERSION_CONFLICT') {
      throw error;
    }

    // Degrade gracefully when persistence backing is unavailable (missing table/DB issues).
    return { persisted: false, version: null };
  }
}

router.get('/providers', (_req, res) => {
  const providers = [
    {
      id: 'bloomberg',
      type: 'portfolio-management-system',
      configured: Boolean(env.BLOOMBERG_PORTFOLIO_API_URL),
      mode: env.BLOOMBERG_PORTFOLIO_API_URL ? 'live' : 'disabled',
    },
    {
      id: 'csv',
      type: 'file-import',
      configured: true,
      mode: 'manual-upload',
    },
    {
      id: 'manual',
      type: 'manual-entry',
      configured: true,
      mode: 'inline-payload',
    },
  ];

  sendDataWithMeta(
    res,
    {
      providers,
      webhookSinkConfigured: Boolean(env.INTEGRATION_WEBHOOK_URL),
      pipelineSourcesConfigured: parsePipelineSources().length,
      timestamp: new Date().toISOString(),
    },
    buildMetadata({
      source: 'integration.provider-catalog',
      sourceType: 'generated',
      reliability: { score: 0.92, methodologyVersion: 'provider-catalog-v1' },
    })
  );
});

router.post('/portfolio/import', validateBody(importPortfolioSchema), async (req, res, next) => {
  try {
    const { provider, payload, artifactKey, expectedVersion } = req.body;

    let importResult;
    if (provider === 'bloomberg') {
      importResult = await loadBloombergPortfolio();
    } else {
      const rawPositions = Array.isArray(payload?.positions) ? payload.positions : [];
      importResult = {
        positions: rawPositions.map(normalizePosition),
        fallbackUsed: false,
        fallbackReason: null,
        integrationSource: provider,
      };
    }

    const importPayload = {
      provider,
      integrationSource: importResult.integrationSource,
      importedAt: new Date().toISOString(),
      positionCount: importResult.positions.length,
      fallbackUsed: importResult.fallbackUsed,
      fallbackReason: importResult.fallbackReason,
      positions: importResult.positions,
    };

    const persistence = await persistArtifact({
      req,
      artifactType: IMPORT_ARTIFACT_TYPE,
      artifactKey: artifactKey || provider,
      payload: importPayload,
      expectedVersion,
    });

    if (req.app?.locals?.integrationEvents?.emit) {
      void req.app.locals.integrationEvents.emit('portfolio.import.completed', {
        provider,
        positionCount: importPayload.positionCount,
        fallbackUsed: importPayload.fallbackUsed,
        requestId: req.requestId,
        traceId: req.traceId,
      });
    }

    sendDataWithMeta(
      res,
      {
        ...importPayload,
        persisted: persistence.persisted,
        version: persistence.version,
      },
      buildMetadata({
        source: `${provider}.portfolio-import`,
        sourceType: importResult.fallbackUsed ? 'fallback' : 'api',
        fallback: {
          used: importResult.fallbackUsed,
          reason: importResult.fallbackReason,
        },
        reliability: {
          score: importResult.fallbackUsed ? 0.5 : 0.86,
          methodologyVersion: 'portfolio-import-v1',
        },
      }),
      202
    );
  } catch (error) {
    if (error?.code === 'ARTIFACT_VERSION_CONFLICT') {
      return next(new ApiError(409, 'ARTIFACT_VERSION_CONFLICT', 'Artifact version mismatch', error.details));
    }
    if (error?.code === 'ARTIFACT_FORBIDDEN') {
      return next(new ApiError(403, 'ARTIFACT_FORBIDDEN', 'You do not have access to this artifact'));
    }
    console.error(JSON.stringify({
      level: 'error',
      message: 'portfolio_import_failed',
      reason: error instanceof Error ? error.message : String(error),
      requestId: req.requestId,
      traceId: req.traceId,
    }));
    return next(new ApiError(502, 'PORTFOLIO_IMPORT_FAILED', 'Portfolio integration import failed'));
  }
});

router.get('/pipelines/status', async (req, res, next) => {
  try {
    let pool = null;
    try {
      pool = await getPool();
    } catch {
      pool = null;
    }
    const context = resolveActorContext(req);
    const configuredSources = parsePipelineSources();

    let latestRun = null;
    if (pool) {
      try {
        latestRun = await getLatestArtifact(pool, {
          userId: context.userId,
          workspaceId: context.workspaceId,
          artifactType: PIPELINE_ARTIFACT_TYPE,
          artifactKey: 'latest',
        });
      } catch {
        latestRun = null;
      }
    }

    sendDataWithMeta(
      res,
      {
        configuredSources,
        latestRun: latestRun?.payload || null,
        timestamp: new Date().toISOString(),
      },
      buildMetadata({
        source: 'pipeline.status',
        sourceType: latestRun ? 'database' : 'generated',
        reliability: { score: latestRun ? 0.9 : 0.8, methodologyVersion: 'pipeline-status-v1' },
      })
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'pipeline_status_failed',
      reason: error instanceof Error ? error.message : String(error),
      requestId: req.requestId,
      traceId: req.traceId,
    }));
    next(new ApiError(500, 'PIPELINE_STATUS_FAILED', 'Failed to fetch pipeline status'));
  }
});

router.post('/pipelines/run', validateBody(runPipelineSchema), async (req, res, next) => {
  try {
    const role = String(req.user?.role || 'viewer').toLowerCase();
    if (role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Only admin can trigger integration pipelines');
    }

    const sources = req.body.sources && req.body.sources.length > 0
      ? req.body.sources
      : parsePipelineSources();

    if (sources.length === 0) {
      return sendDataWithMeta(
        res,
        {
          ran: false,
          reason: 'no_pipeline_sources_configured',
          timestamp: new Date().toISOString(),
        },
        buildMetadata({
          source: 'pipeline.runner',
          sourceType: 'fallback',
          fallback: { used: true, reason: 'no_pipeline_sources_configured' },
          reliability: { score: 0.5, methodologyVersion: 'pipeline-runner-v1' },
        })
      );
    }

    const results = await Promise.allSettled(sources.map(async (source) => {
      // Validate against the SSRF allowlist BEFORE attaching the bearer token or fetching.
      await assertAllowedPipelineSource(source);
      return fetchJson(source, {
        token: env.PIPELINE_SOURCE_AUTH_TOKEN || undefined,
        timeoutMs: env.PORTFOLIO_INTEGRATION_TIMEOUT_MS,
      });
    }));

    const runSummary = {
      startedAt: new Date().toISOString(),
      totalSources: sources.length,
      successCount: results.filter((result) => result.status === 'fulfilled').length,
      failureCount: results.filter((result) => result.status === 'rejected').length,
      sources: results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return { source: sources[index], status: result.status, error: null };
        }

        // Log the real reason server-side; never echo raw upstream error text to clients.
        console.error(JSON.stringify({
          level: 'error',
          message: 'pipeline_source_failed',
          source: sources[index],
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
          requestId: req.requestId,
          traceId: req.traceId,
        }));

        return {
          source: sources[index],
          status: result.status,
          error: result.reason?.code === 'PIPELINE_SOURCE_BLOCKED' ? 'source_blocked' : 'source_fetch_failed',
        };
      }),
    };

    const persistence = await persistArtifact({
      req,
      artifactType: PIPELINE_ARTIFACT_TYPE,
      artifactKey: req.body.artifactKey || 'latest',
      payload: runSummary,
      expectedVersion: req.body.expectedVersion,
    });

    if (req.app?.locals?.integrationEvents?.emit) {
      void req.app.locals.integrationEvents.emit('pipeline.run.completed', {
        ...runSummary,
        requestId: req.requestId,
        traceId: req.traceId,
      });
    }

    sendDataWithMeta(
      res,
      {
        ...runSummary,
        persisted: persistence.persisted,
        version: persistence.version,
      },
      buildMetadata({
        source: 'pipeline.runner',
        sourceType: runSummary.failureCount > 0 ? 'fallback' : 'api',
        fallback: {
          used: runSummary.failureCount > 0,
          reason: runSummary.failureCount > 0 ? 'partial_or_full_source_failures' : null,
        },
        reliability: {
          score: runSummary.failureCount > 0 ? 0.65 : 0.9,
          methodologyVersion: 'pipeline-runner-v1',
        },
      }),
      202
    );
  } catch (error) {
    if (error?.code === 'ARTIFACT_VERSION_CONFLICT') {
      return next(new ApiError(409, 'ARTIFACT_VERSION_CONFLICT', 'Artifact version mismatch', error.details));
    }
    if (error?.code === 'ARTIFACT_FORBIDDEN') {
      return next(new ApiError(403, 'ARTIFACT_FORBIDDEN', 'You do not have access to this artifact'));
    }
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error(JSON.stringify({
      level: 'error',
      message: 'pipeline_run_failed',
      reason: error instanceof Error ? error.message : String(error),
      requestId: req.requestId,
      traceId: req.traceId,
    }));
    next(new ApiError(500, 'PIPELINE_RUN_FAILED', 'Pipeline execution failed'));
  }
});

export default router;
