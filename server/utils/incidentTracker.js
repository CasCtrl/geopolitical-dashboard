function safeSerializeError(value) {
  if (!value) return null;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  return value;
}

export function createIncidentTracker({
  maxEntries = 500,
  webhookUrl,
  persistIncident,
}) {
  const incidents = [];

  async function notifyWebhook(incident) {
    if (!webhookUrl) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident),
      });
    } catch {
      // Non-blocking: webhook failures should never break request flow.
    }
  }

  async function capture(incident) {
    const normalized = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      severity: incident.severity || 'high',
      category: incident.category || 'application_error',
      message: incident.message || 'Unknown incident',
      requestId: incident.requestId || null,
      traceId: incident.traceId || null,
      context: safeSerializeError(incident.context) || null,
      occurredAt: new Date().toISOString(),
    };

    incidents.push(normalized);
    if (incidents.length > maxEntries) {
      incidents.shift();
    }

    await Promise.allSettled([
      notifyWebhook(normalized),
      persistIncident ? persistIncident(normalized) : Promise.resolve(),
    ]);

    return normalized;
  }

  function list({ limit = 100 } = {}) {
    const safeLimit = Math.min(Math.max(1, limit), maxEntries);
    return incidents.slice(-safeLimit).reverse();
  }

  function summary() {
    const bySeverity = incidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {});

    const byCategory = incidents.reduce((acc, incident) => {
      acc[incident.category] = (acc[incident.category] || 0) + 1;
      return acc;
    }, {});

    return {
      total: incidents.length,
      bySeverity,
      byCategory,
      latestAt: incidents.length > 0 ? incidents[incidents.length - 1].occurredAt : null,
    };
  }

  return {
    capture,
    list,
    summary,
  };
}
