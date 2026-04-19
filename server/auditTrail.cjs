const { randomUUID } = require('crypto');

const DEFAULT_MAX_AUDIT_EVENTS = 500;
const SENSITIVE_DETAIL_KEYS = new Set([
  'authorization',
  'token',
  'apiToken',
  'apiKey',
  'password',
  'secret',
  'dbPassword',
]);

function sanitizeAuditDetails(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > 3) {
    return '[truncated]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => sanitizeAuditDetails(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (SENSITIVE_DETAIL_KEYS.has(key)) {
        sanitized[key] = '[redacted]';
        continue;
      }

      sanitized[key] = sanitizeAuditDetails(nestedValue, depth + 1);
    }

    return sanitized;
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}...[truncated]`;
  }

  return value;
}

function createAuditTrail({ maxEntries = DEFAULT_MAX_AUDIT_EVENTS } = {}) {
  const events = [];
  const normalizedMaxEntries = Number.isFinite(maxEntries) && maxEntries > 0
    ? Math.floor(maxEntries)
    : DEFAULT_MAX_AUDIT_EVENTS;

  function record(event) {
    const entry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
      details: sanitizeAuditDetails(event?.details ?? {}),
    };

    events.push(entry);
    if (events.length > normalizedMaxEntries) {
      events.shift();
    }

    return entry;
  }

  function listRecent({ limit = 100 } = {}) {
    const normalizedLimit = Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), normalizedMaxEntries)
      : 100;

    return events.slice(-normalizedLimit).reverse();
  }

  function size() {
    return events.length;
  }

  return {
    record,
    listRecent,
    size,
  };
}

module.exports = {
  DEFAULT_MAX_AUDIT_EVENTS,
  createAuditTrail,
  sanitizeAuditDetails,
};