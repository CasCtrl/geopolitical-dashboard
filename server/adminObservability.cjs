const { getActiveAlerts, getSloSnapshot } = require('./observability.cjs');

function buildAdminAlertsPayload({ ready, requestMetrics, thresholds, now = () => new Date().toISOString() }) {
  const slo = getSloSnapshot(requestMetrics, {
    errorRatePct: thresholds.errorRatePct,
    p95LatencyMs: thresholds.p95LatencyMs,
    dbHealthMinPct: thresholds.dbHealthMinPct,
    newsIngestionMinSuccessPct: thresholds.newsIngestionMinSuccessPct,
    frontendCrashMaxPer1kRequests: thresholds.frontendCrashMaxPer1kRequests,
  });

  return {
    alerts: getActiveAlerts({
      ready,
      requestMetrics,
      thresholds,
    }),
    thresholds: {
      minRequests: thresholds.minRequests,
      errorRatePct: thresholds.errorRatePct,
      p95LatencyMs: thresholds.p95LatencyMs,
      dbHealthMinPct: thresholds.dbHealthMinPct,
      newsIngestionMinSuccessPct: thresholds.newsIngestionMinSuccessPct,
      frontendCrashMaxPer1kRequests: thresholds.frontendCrashMaxPer1kRequests,
    },
    slo,
    timestamp: now(),
  };
}

module.exports = {
  buildAdminAlertsPayload,
};
