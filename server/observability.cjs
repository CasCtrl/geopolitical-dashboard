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
    uptimeSeconds: Math.round((Date.now() - requestMetrics.startedAt) / 1000),
  };
}

function getActiveAlerts({ ready, requestMetrics, thresholds }) {
  const snapshot = getObservabilitySnapshot(requestMetrics);
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

  return alerts;
}

module.exports = {
  DEFAULT_MAX_LATENCY_SAMPLES,
  initializeRequestMetrics,
  classifyStatus,
  pushLatencySample,
  percentile,
  recordRequestCompletion,
  getObservabilitySnapshot,
  getActiveAlerts,
};
