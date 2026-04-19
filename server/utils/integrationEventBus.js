export function createIntegrationEventBus({ webhookUrl } = {}) {
  async function emit(eventType, payload) {
    const event = {
      eventType,
      payload,
      occurredAt: new Date().toISOString(),
    };

    if (!webhookUrl) {
      return { delivered: false, reason: 'webhook_not_configured', event };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      return {
        delivered: response.ok,
        statusCode: response.status,
        event,
      };
    } catch (error) {
      return {
        delivered: false,
        reason: 'webhook_delivery_failed',
        error: error instanceof Error ? error.message : String(error),
        event,
      };
    }
  }

  return {
    emit,
  };
}
