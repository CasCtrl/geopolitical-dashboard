const { createAuditTrail, sanitizeAuditDetails } = require('../auditTrail.cjs');

describe('auditTrail', () => {
  test('sanitizes sensitive keys in nested objects', () => {
    const sanitized = sanitizeAuditDetails({
      token: 'abc123',
      nested: {
        password: 'secret-password',
        safe: 'ok',
      },
    });

    expect(sanitized).toEqual({
      token: '[redacted]',
      nested: {
        password: '[redacted]',
        safe: 'ok',
      },
    });
  });

  test('enforces max entry retention and returns most recent first', () => {
    const trail = createAuditTrail({ maxEntries: 2 });

    trail.record({ action: 'a', target: 'x', details: {} });
    trail.record({ action: 'b', target: 'y', details: {} });
    trail.record({ action: 'c', target: 'z', details: {} });

    expect(trail.size()).toBe(2);

    const recent = trail.listRecent({ limit: 10 });
    expect(recent).toHaveLength(2);
    expect(recent[0].action).toBe('c');
    expect(recent[1].action).toBe('b');
  });
});
