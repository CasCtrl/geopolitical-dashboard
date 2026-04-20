const DEFAULT_MAX_LATENCY_SAMPLES = 500;

function initializeRequestMetrics() {
  return {
    startedAt: Date.now(),
    total: 0,
    errors: 0,
    statusBuckets: {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    },
    latenciesMs: [],
    routeStats: new Map(),
    domainStats: {
      dbHealth: {
        checks: 0,
        healthy: 0,
        unhealthy: 0,
        lastCheckedAt: null,
      },
      newsIngestion: {
        attempts: 0,
        success: 0,
        failure: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastLatencyMs: null,
      },
      frontendCrashes: {
        total: 0,
        lastOccurredAt: null,
        byRelease: {},
      },
    },
  };
}

function classifyStatus(statusCode) {
  if (statusCode >= 500) return '5xx';
  if (statusCode >= 400) return '4xx';
  if (statusCode >= 300) return '3xx';
  return '2xx';
}

function pushLatencySample(requestMetrics, durationMs, maxLatencySamples = DEFAULT_MAX_LATENCY_SAMPLES) {
  requestMetrics.latenciesMs.push(durationMs);
  if (requestMetrics.latenciesMs.length > maxLatencySamples) {
    requestMetrics.latenciesMs.shift();
  }
}

function percentile(values, p) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function recordRequestCompletion(requestMetrics, {
  method,
  path,
  statusCode,
  durationMs,
  maxLatencySamples = DEFAULT_MAX_LATENCY_SAMPLES,
}) {
  const statusBucket = classifyStatus(statusCode);

  requestMetrics.total += 1;
  requestMetrics.statusBuckets[statusBucket] += 1;

  if (statusCode >= 400) {
    requestMetrics.errors += 1;
  }

  pushLatencySample(requestMetrics, durationMs, maxLatencySamples);

  const routeKey = `${method} ${path}`;
  const currentRoute = requestMetrics.routeStats.get(routeKey) || {
    count: 0,
    totalMs: 0,
    errorCount: 0,
  };

  currentRoute.count += 1;
  currentRoute.totalMs += durationMs;

  if (statusCode >= 400) {
    currentRoute.errorCount += 1;
  }

  requestMetrics.routeStats.set(routeKey, currentRoute);
}

function getObservabilitySnapshot(requestMetrics) {
  const totalRequests = requestMetrics.total;
  const errorRatePct = totalRequests > 0 ? (requestMetrics.errors / totalRequests) * 100 : 0;
  const p95Ms = percentile(requestMetrics.latenciesMs, 95);
  const routeBreakdown = Array.from(requestMetrics.routeStats.entries())
    .map(([route, data]) => ({
      route,
      count: data.count,
      avgMs: data.count > 0 ? Number((data.totalMs / data.count).toFixed(1)) : 0,
      errorCount: data.errorCount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    requests: {
      total: totalRequests,
      errors: requestMetrics.errors,
      errorRatePct: Number(errorRatePct.toFixed(2)),
      byStatus: requestMetrics.statusBuckets,
      windowSampleSize: requestMetrics.latenciesMs.length,
    },
    latency: {
      p95Ms: p95Ms === null ? null : Number(p95Ms.toFixed(1)),
    },
    topRoutes: routeBreakdown,
    domain: {
      dbHealth: {
        checks: requestMetrics.domainStats.dbHealth.checks,
        healthy: requestMetrics.domainStats.dbHealth.healthy,
        unhealthy: requestMetrics.domainStats.dbHealth.unhealthy,
        lastCheckedAt: requestMetrics.domainStats.dbHealth.lastCheckedAt,
      },
      newsIngestion: {
        attempts: requestMetrics.domainStats.newsIngestion.attempts,
        success: requestMetrics.domainStats.newsIngestion.success,
        failure: requestMetrics.domainStats.newsIngestion.failure,
        lastSuccessAt: requestMetrics.domainStats.newsIngestion.lastSuccessAt,
        lastFailureAt: requestMetrics.domainStats.newsIngestion.lastFailureAt,
        lastLatencyMs: requestMetrics.domainStats.newsIngestion.lastLatencyMs,
      },
      frontendCrashes: {
        total: requestMetrics.domainStats.frontendCrashes.total,
        lastOccurredAt: requestMetrics.domainStats.frontendCrashes.lastOccurredAt,
        byRelease: requestMetrics.domainStats.frontendCrashes.byRelease,
      },
    },
    uptimeSeconds: Math.round((Date.now() - requestMetrics.startedAt) / 1000),
  };
}

function recordDbHealth(requestMetrics, { healthy, at = new Date().toISOString() }) {
  requestMetrics.domainStats.dbHealth.checks += 1;
  if (healthy) {
    requestMetrics.domainStats.dbHealth.healthy += 1;
  } else {
    requestMetrics.domainStats.dbHealth.unhealthy += 1;
  }
  requestMetrics.domainStats.dbHealth.lastCheckedAt = at;
}

function recordNewsIngestion(requestMetrics, {
  success,
  latencyMs,
  at = new Date().toISOString(),
}) {
  requestMetrics.domainStats.newsIngestion.attempts += 1;
  requestMetrics.domainStats.newsIngestion.lastLatencyMs = typeof latencyMs === 'number'
    ? Number(latencyMs.toFixed(1))
    : null;

  if (success) {
    requestMetrics.domainStats.newsIngestion.success += 1;
    requestMetrics.domainStats.newsIngestion.lastSuccessAt = at;
  } else {
    requestMetrics.domainStats.newsIngestion.failure += 1;
    requestMetrics.domainStats.newsIngestion.lastFailureAt = at;
  }
}

function recordFrontendCrash(requestMetrics, {
  release = 'unknown',
  at = new Date().toISOString(),
}) {
  requestMetrics.domainStats.frontendCrashes.total += 1;
  requestMetrics.domainStats.frontendCrashes.lastOccurredAt = at;
  requestMetrics.domainStats.frontendCrashes.byRelease[release] =
    (requestMetrics.domainStats.frontendCrashes.byRelease[release] || 0) + 1;
}

function percent(numerator, denominator) {
  if (!denominator || denominator <= 0) {
    return 100;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function getSloSnapshot(requestMetrics, thresholds) {
  const snapshot = getObservabilitySnapshot(requestMetrics);
  const dbChecks = snapshot.domain.dbHealth.checks;
  const dbHealthyPct = percent(snapshot.domain.dbHealth.healthy, dbChecks);
  const newsAttempts = snapshot.domain.newsIngestion.attempts;
  const newsSuccessPct = percent(snapshot.domain.newsIngestion.success, newsAttempts);
  const frontendCrashRatePer1k = snapshot.requests.total > 0
    ? Number(((snapshot.domain.frontendCrashes.total / snapshot.requests.total) * 1000).toFixed(3))
    : 0;

  const objectives = {
    apiErrorRateMaxPct: thresholds.errorRatePct,
    apiP95LatencyMaxMs: thresholds.p95LatencyMs,
    dbHealthMinPct: thresholds.dbHealthMinPct,
    newsIngestionMinSuccessPct: thresholds.newsIngestionMinSuccessPct,
    frontendCrashMaxPer1kRequests: thresholds.frontendCrashMaxPer1kRequests,
  };

  const indicators = {
    apiErrorRatePct: snapshot.requests.errorRatePct,
    requestP95LatencyMs: snapshot.latency.p95Ms,
    dbHealthPct: dbHealthyPct,
    newsIngestionSuccessPct: newsSuccessPct,
    frontendCrashPer1kRequests: frontendCrashRatePer1k,
  };

  return {
    objectives,
    indicators,
    status: {
      apiErrorRateOk: indicators.apiErrorRatePct <= objectives.apiErrorRateMaxPct,
      requestP95LatencyOk: indicators.requestP95LatencyMs === null
        ? true
        : indicators.requestP95LatencyMs <= objectives.apiP95LatencyMaxMs,
      dbHealthOk: indicators.dbHealthPct >= objectives.dbHealthMinPct,
      newsIngestionOk: indicators.newsIngestionSuccessPct >= objectives.newsIngestionMinSuccessPct,
      frontendCrashRateOk: indicators.frontendCrashPer1kRequests <= objectives.frontendCrashMaxPer1kRequests,
    },
    timestamp: new Date().toISOString(),
  };
}

function getActiveAlerts({ ready, requestMetrics, thresholds }) {
  const snapshot = getObservabilitySnapshot(requestMetrics);
  const sloSnapshot = getSloSnapshot(requestMetrics, {
    errorRatePct: thresholds.errorRatePct,
    p95LatencyMs: thresholds.p95LatencyMs,
    dbHealthMinPct: thresholds.dbHealthMinPct ?? 99,
    newsIngestionMinSuccessPct: thresholds.newsIngestionMinSuccessPct ?? 95,
    frontendCrashMaxPer1kRequests: thresholds.frontendCrashMaxPer1kRequests ?? 2,
  });
  const alerts = [];

  if (!ready) {
    alerts.push({
      id: 'readiness_degraded',
      severity: 'critical',
      active: true,
      message: 'Readiness check is degraded (database unavailable).',
    });
  }

  if (snapshot.requests.total >= thresholds.minRequests && snapshot.requests.errorRatePct >= thresholds.errorRatePct) {
    alerts.push({
      id: 'error_rate_high',
      severity: 'high',
      active: true,
      message: `Error rate ${snapshot.requests.errorRatePct}% exceeds ${thresholds.errorRatePct}%.`,
    });
  }

  if (snapshot.requests.total >= thresholds.minRequests && snapshot.latency.p95Ms !== null && snapshot.latency.p95Ms >= thresholds.p95LatencyMs) {
    alerts.push({
      id: 'latency_p95_high',
      severity: 'medium',
      active: true,
      message: `P95 latency ${snapshot.latency.p95Ms}ms exceeds ${thresholds.p95LatencyMs}ms.`,
    });
  }

  if (!sloSnapshot.status.dbHealthOk) {
    alerts.push({
      id: 'db_health_low',
      severity: 'high',
      active: true,
      message: `DB health ${sloSnapshot.indicators.dbHealthPct}% is below ${sloSnapshot.objectives.dbHealthMinPct}%.`,
    });
  }

  if (!sloSnapshot.status.newsIngestionOk) {
    alerts.push({
      id: 'news_ingestion_unhealthy',
      severity: 'medium',
      active: true,
      message: `News ingestion success ${sloSnapshot.indicators.newsIngestionSuccessPct}% is below ${sloSnapshot.objectives.newsIngestionMinSuccessPct}%.`,
    });
  }

  if (!sloSnapshot.status.frontendCrashRateOk) {
    alerts.push({
      id: 'frontend_crash_rate_high',
      severity: 'high',
      active: true,
      message: `Frontend crash rate ${sloSnapshot.indicators.frontendCrashPer1kRequests}/1k exceeds ${sloSnapshot.objectives.frontendCrashMaxPer1kRequests}/1k.`,
    });
  }

  return alerts;
}

module.exports = {
  DEFAULT_MAX_LATENCY_SAMPLES,
  initializeRequestMetrics,
  classifyStatus,
  pushLatencySample,
  percentile,
  recordRequestCompletion,
  recordDbHealth,
  recordNewsIngestion,
  recordFrontendCrash,
  getObservabilitySnapshot,
  getSloSnapshot,
  getActiveAlerts,
};
