const {
  initializeRequestMetrics,
  recordRequestCompletion,
  getObservabilitySnapshot,
  getActiveAlerts,
} = require('../observability.cjs');
const { buildAdminAlertsPayload } = require('../adminObservability.cjs');

describe('server observability alerts', () => {
  test('raises readiness alert when service is degraded', () => {
    const metrics = initializeRequestMetrics();

    const alerts = getActiveAlerts({
      ready: false,
      requestMetrics: metrics,
      thresholds: {
        minRequests: 20,
        errorRatePct: 5,
        p95LatencyMs: 800,
      },
    });

    expect(alerts.some((alert) => alert.id === 'readiness_degraded')).toBe(true);
  });

  test('does not raise rate/latency alerts below minimum request threshold', () => {
    const metrics = initializeRequestMetrics();

    for (let i = 0; i < 10; i += 1) {
      recordRequestCompletion(metrics, {
        method: 'GET',
        path: '/api/news',
        statusCode: i < 4 ? 500 : 200,
        durationMs: 1200,
      });
    }

    const alerts = getActiveAlerts({
      ready: true,
      requestMetrics: metrics,
      thresholds: {
        minRequests: 20,
        errorRatePct: 5,
        p95LatencyMs: 800,
      },
    });

    expect(alerts.some((alert) => alert.id === 'error_rate_high')).toBe(false);
    expect(alerts.some((alert) => alert.id === 'latency_p95_high')).toBe(false);
  });

  test('raises error-rate alert when threshold is breached', () => {
    const metrics = initializeRequestMetrics();

    for (let i = 0; i < 20; i += 1) {
      recordRequestCompletion(metrics, {
        method: 'GET',
        path: '/api/assets/default',
        statusCode: i < 3 ? 500 : 200,
        durationMs: 120,
      });
    }

    const snapshot = getObservabilitySnapshot(metrics);
    expect(snapshot.requests.errorRatePct).toBe(15);

    const alerts = getActiveAlerts({
      ready: true,
      requestMetrics: metrics,
      thresholds: {
        minRequests: 20,
        errorRatePct: 5,
        p95LatencyMs: 800,
      },
    });

    expect(alerts.some((alert) => alert.id === 'error_rate_high')).toBe(true);
  });

  test('raises p95 latency alert when threshold is breached', () => {
    const metrics = initializeRequestMetrics();

    for (let i = 0; i < 20; i += 1) {
      recordRequestCompletion(metrics, {
        method: 'GET',
        path: '/api/datasets',
        statusCode: 200,
        durationMs: 1400,
      });
    }

    const snapshot = getObservabilitySnapshot(metrics);
    expect(snapshot.latency.p95Ms).toBe(1400);

    const alerts = getActiveAlerts({
      ready: true,
      requestMetrics: metrics,
      thresholds: {
        minRequests: 20,
        errorRatePct: 5,
        p95LatencyMs: 800,
      },
    });

    expect(alerts.some((alert) => alert.id === 'latency_p95_high')).toBe(true);
  });

  test('builds admin alerts endpoint payload with thresholds and timestamp', () => {
    const metrics = initializeRequestMetrics();

    for (let i = 0; i < 25; i += 1) {
      recordRequestCompletion(metrics, {
        method: 'GET',
        path: '/api/news',
        statusCode: i < 3 ? 500 : 200,
        durationMs: 950,
      });
    }

    const payload = buildAdminAlertsPayload({
      ready: false,
      requestMetrics: metrics,
      thresholds: {
        minRequests: 20,
        errorRatePct: 5,
        p95LatencyMs: 800,
      },
      now: () => '2026-04-19T00:00:00.000Z',
    });

    expect(payload.thresholds).toEqual({
      minRequests: 20,
      errorRatePct: 5,
      p95LatencyMs: 800,
    });
    expect(payload.timestamp).toBe('2026-04-19T00:00:00.000Z');
    expect(payload.alerts.some((alert) => alert.id === 'readiness_degraded')).toBe(true);
    expect(payload.alerts.some((alert) => alert.id === 'error_rate_high')).toBe(true);
    expect(payload.alerts.some((alert) => alert.id === 'latency_p95_high')).toBe(true);
  });
});
