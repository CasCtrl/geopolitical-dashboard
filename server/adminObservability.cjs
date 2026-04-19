const { getActiveAlerts } = require('./observability.cjs');

function buildAdminAlertsPayload({ ready, requestMetrics, thresholds, now = () => new Date().toISOString() }) {
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
    },
    timestamp: now(),
  };
}

module.exports = {
  buildAdminAlertsPayload,
};
