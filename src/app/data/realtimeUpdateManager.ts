/**
 * Real-Time Update Manager
 * Handles intraday updates and event-driven risk recalculation
 */

export interface RealTimeUpdate {
  timestamp: string;
  updateType: 'scheduled' | 'event-driven';
  eventDescription?: string;
  affectedCountries?: string[];
  riskAdjustment?: number; // Change in risk score
}

const STORAGE_KEY_REALTIME = 'geopolitical_realtime_updates';
const UPDATE_INTERVAL_HOURS = 1; // Update every hour
const EVENT_COOLDOWN_MINUTES = 15; // Don't fire events more than every 15 minutes

let updateIntervalId: NodeJS.Timeout | null = null;
let lastEventTime = 0;

/**
 * Initialize real-time update system
 * Sets up hourly scheduler and event listener
 */
export function initializeRealtimeUpdates(callback?: (update: RealTimeUpdate) => void): void {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
  }

  // Scheduled hourly updates
  updateIntervalId = setInterval(() => {
    const update: RealTimeUpdate = {
      timestamp: new Date().toISOString(),
      updateType: 'scheduled',
      eventDescription: 'Hourly risk recalculation',
    };

    if (callback) callback(update);
    logUpdate(update);
  }, UPDATE_INTERVAL_HOURS * 60 * 60 * 1000);

  console.log('[RealTime] Initialized real-time update system (hourly + event-driven)');
}

/**
 * Stop real-time updates
 */
export function stopRealtimeUpdates(): void {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
    console.log('[RealTime] Stopped real-time updates');
  }
}

/**
 * Fire event-driven update (called when significant geopolitical events occur)
 */
export function fireEventDrivenUpdate(
  eventDescription: string,
  affectedCountries: string[],
  riskAdjustment: number,
  callback?: (update: RealTimeUpdate) => void
): void {
  const now = Date.now();

  // Cooldown check - prevent event spam
  if (now - lastEventTime < EVENT_COOLDOWN_MINUTES * 60 * 1000) {
    console.log('[RealTime] Event-driven update throttled (cooldown active)');
    return;
  }

  lastEventTime = now;

  const update: RealTimeUpdate = {
    timestamp: new Date().toISOString(),
    updateType: 'event-driven',
    eventDescription,
    affectedCountries,
    riskAdjustment,
  };

  if (callback) callback(update);
  logUpdate(update);

  console.log(`[RealTime] Event-driven update: ${eventDescription}`);
}

/**
 * Log updates to local storage
 */
function logUpdate(update: RealTimeUpdate): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_REALTIME);
    const updates = stored ? JSON.parse(stored) : [];

    // Keep last 100 updates
    updates.push(update);
    if (updates.length > 100) {
      updates.shift();
    }

    localStorage.setItem(STORAGE_KEY_REALTIME, JSON.stringify(updates));
  } catch (error) {
    console.error('[RealTime] Failed to log update:', error);
  }
}

/**
 * Get recent real-time updates
 */
export function getRecentUpdates(limit: number = 20): RealTimeUpdate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_REALTIME);
    if (!stored) return [];

    const updates = JSON.parse(stored);
    return updates.slice(-limit).reverse();
  } catch (error) {
    console.error('[RealTime] Failed to retrieve updates:', error);
    return [];
  }
}

/**
 * Get update statistics
 */
export function getUpdateStats(): {
  totalUpdates: number;
  scheduledUpdates: number;
  eventDrivenUpdates: number;
  lastUpdateTime: string | null;
  nextScheduledUpdate: string;
} {
  const updates = getRecentUpdates(100);
  const scheduledCount = updates.filter((u) => u.updateType === 'scheduled').length;
  const eventCount = updates.filter((u) => u.updateType === 'event-driven').length;
  const lastUpdate = updates[0];

  const now = new Date();
  const nextUpdate = new Date(now.getTime() + UPDATE_INTERVAL_HOURS * 60 * 60 * 1000);

  return {
    totalUpdates: updates.length,
    scheduledUpdates: scheduledCount,
    eventDrivenUpdates: eventCount,
    lastUpdateTime: lastUpdate?.timestamp || null,
    nextScheduledUpdate: nextUpdate.toLocaleTimeString(),
  };
}

/**
 * Simulate event-driven updates (for testing)
 * In production, these would come from news feeds, APIs, etc.
 */
export function simulateGeopoliticalEvents(callback?: (update: RealTimeUpdate) => void): void {
  const events = [
    {
      description: 'Breaking: Military tensions escalate in Taiwan Strait',
      countries: ['China', 'Taiwan', 'United States'],
      adjustment: 8,
    },
    {
      description: 'News: Major sanctions announced on Russian energy',
      countries: ['Russia', 'Europe'],
      adjustment: 6,
    },
    {
      description: 'Alert: Supply chain disruption in Middle East',
      countries: ['Saudi Arabia', 'Iran', 'Iraq'],
      adjustment: 5,
    },
    {
      description: 'Update: Central bank policy shift affecting markets',
      countries: ['United States', 'Japan', 'Europe'],
      adjustment: 3,
    },
    {
      description: 'Report: Political instability increases in emerging markets',
      countries: ['Brazil', 'India', 'Mexico'],
      adjustment: 4,
    },
  ];

  // Pick random event
  const event = events[Math.floor(Math.random() * events.length)];

  fireEventDrivenUpdate(event.description, event.countries, event.adjustment, callback);
}

/**
 * Get time until next scheduled update
 */
export function getTimeUntilNextUpdate(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_REALTIME);
    if (!stored) {
      return `~${UPDATE_INTERVAL_HOURS} hour(s)`;
    }

    const updates = JSON.parse(stored);
    if (updates.length === 0) {
      return `~${UPDATE_INTERVAL_HOURS} hour(s)`;
    }

    const lastScheduled = updates
      .filter((u: RealTimeUpdate) => u.updateType === 'scheduled')
      .sort(
        (a: RealTimeUpdate, b: RealTimeUpdate) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

    if (!lastScheduled) {
      return `~${UPDATE_INTERVAL_HOURS} hour(s)`;
    }

    const lastTime = new Date(lastScheduled.timestamp).getTime();
    const nextTime = lastTime + UPDATE_INTERVAL_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    const minutesUntil = Math.ceil((nextTime - now) / (60 * 1000));

    if (minutesUntil <= 0) {
      return 'Due now';
    } else if (minutesUntil < 60) {
      return `~${minutesUntil} minute(s)`;
    } else {
      const hoursUntil = Math.ceil(minutesUntil / 60);
      return `~${hoursUntil} hour(s)`;
    }
  } catch {
    return 'Unknown';
  }
}

/**
 * Clear all real-time update logs
 */
export function clearUpdateLogs(): void {
  localStorage.removeItem(STORAGE_KEY_REALTIME);
  console.log('[RealTime] Cleared all update logs');
}
