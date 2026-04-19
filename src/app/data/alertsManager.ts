/**
 * Alerts Manager
 * Manages user-defined alerts and thresholds
 * Tracks risk threshold breaches and notifies users
 */

import { putWorkspaceState } from './workspaceStateApi';

export interface AlertThreshold {
  id: string;
  name: string;
  type: "country" | "portfolio" | "sector"; // Type of alert
  target: string; // Country name, "portfolio", or sector name
  threshold: number; // Risk score threshold (0-100)
  enabled: boolean;
  createdAt: string;
  triggered?: boolean; // Whether threshold has been breached
  lastTriggeredAt?: string;
}

export interface AlertEvent {
  id: string;
  thresholdId: string;
  timestamp: string;
  type: "breach" | "recovery"; // Breach when going above, recovery when going below
  currentValue: number;
  threshold: number;
  message: string;
  read: boolean;
}

const THRESHOLDS_KEY = "geopolitical_alert_thresholds";
const EVENTS_KEY = "geopolitical_alert_events";
const THRESHOLDS_VERSION_KEY = "geopolitical_alert_thresholds_version";
const EVENTS_VERSION_KEY = "geopolitical_alert_events_version";
const MAX_EVENTS = 100;

function getVersion(key: string): number | undefined {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function setVersion(key: string, version: number | null): void {
  if (typeof version !== 'number') {
    return;
  }
  try {
    localStorage.setItem(key, String(version));
  } catch {
    // Ignore local version cache failures.
  }
}

/**
 * Create a new alert threshold
 */
export function createThreshold(
  name: string,
  type: "country" | "portfolio" | "sector",
  target: string,
  threshold: number
): AlertThreshold {
  const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newThreshold: AlertThreshold = {
    id,
    name,
    type,
    target,
    threshold,
    enabled: true,
    createdAt: new Date().toISOString(),
    triggered: false,
  };

  const thresholds = getAllThresholds();
  thresholds.push(newThreshold);

  try {
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds));
    void putWorkspaceState("customThresholds", "risk-thresholds", { thresholds }, getVersion(THRESHOLDS_VERSION_KEY))
      .then((version) => setVersion(THRESHOLDS_VERSION_KEY, version));
    console.log(`[Alert] Created threshold: ${name} (${id})`);
  } catch (error) {
    console.error("[Alert] Failed to save threshold:", error);
  }

  return newThreshold;
}

/**
 * Get all alert thresholds
 */
export function getAllThresholds(): AlertThreshold[] {
  try {
    const stored = localStorage.getItem(THRESHOLDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("[Alert] Failed to load thresholds:", error);
    return [];
  }
}

/**
 * Get threshold by ID
 */
export function getThreshold(id: string): AlertThreshold | null {
  const thresholds = getAllThresholds();
  return thresholds.find((t) => t.id === id) || null;
}

/**
 * Update a threshold
 */
export function updateThreshold(
  id: string,
  updates: Partial<AlertThreshold>
): AlertThreshold | null {
  const thresholds = getAllThresholds();
  const index = thresholds.findIndex((t) => t.id === id);

  if (index === -1) return null;

  const updated = { ...thresholds[index], ...updates };
  thresholds[index] = updated;

  try {
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds));
    void putWorkspaceState("customThresholds", "risk-thresholds", { thresholds }, getVersion(THRESHOLDS_VERSION_KEY))
      .then((version) => setVersion(THRESHOLDS_VERSION_KEY, version));
    console.log(`[Alert] Updated threshold: ${id}`);
  } catch (error) {
    console.error("[Alert] Failed to update threshold:", error);
  }

  return updated;
}

/**
 * Delete a threshold
 */
export function deleteThreshold(id: string): boolean {
  const thresholds = getAllThresholds();
  const filtered = thresholds.filter((t) => t.id !== id);

  if (filtered.length === thresholds.length) return false;

  try {
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(filtered));
    void putWorkspaceState("customThresholds", "risk-thresholds", { thresholds: filtered }, getVersion(THRESHOLDS_VERSION_KEY))
      .then((version) => setVersion(THRESHOLDS_VERSION_KEY, version));
    console.log(`[Alert] Deleted threshold: ${id}`);
  } catch (error) {
    console.error("[Alert] Failed to delete threshold:", error);
  }

  return true;
}

/**
 * Toggle threshold enabled/disabled
 */
export function toggleThreshold(id: string): AlertThreshold | null {
  const threshold = getThreshold(id);
  if (!threshold) return null;
  return updateThreshold(id, { enabled: !threshold.enabled });
}

/**
 * Check if a risk value triggers any thresholds
 * Returns triggered thresholds and creates alert events
 */
export function checkThresholds(
  target: string,
  currentRisk: number,
  type: "country" | "portfolio" | "sector"
): AlertThreshold[] {
  const thresholds = getAllThresholds().filter(
    (t) => t.enabled && t.target === target && t.type === type
  );

  const triggered: AlertThreshold[] = [];

  for (const threshold of thresholds) {
    const wasTriggered = threshold.triggered || false;
    const isNowTriggered = currentRisk >= threshold.threshold;

    // Create event if state changed
    if (isNowTriggered && !wasTriggered) {
      // Threshold breached
      createAlertEvent(
        threshold.id,
        "breach",
        currentRisk,
        threshold.threshold,
        `${target} risk (${Math.round(currentRisk)}) exceeded threshold (${threshold.threshold})`
      );
      updateThreshold(threshold.id, { triggered: true, lastTriggeredAt: new Date().toISOString() });
      triggered.push(threshold);
    } else if (!isNowTriggered && wasTriggered) {
      // Threshold recovered
      createAlertEvent(
        threshold.id,
        "recovery",
        currentRisk,
        threshold.threshold,
        `${target} risk (${Math.round(currentRisk)}) recovered below threshold (${threshold.threshold})`
      );
      updateThreshold(threshold.id, { triggered: false });
    }
  }

  return triggered;
}

/**
 * Create an alert event
 */
export function createAlertEvent(
  thresholdId: string,
  type: "breach" | "recovery",
  currentValue: number,
  threshold: number,
  message: string
): AlertEvent {
  const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const event: AlertEvent = {
    id,
    thresholdId,
    timestamp: new Date().toISOString(),
    type,
    currentValue: Math.round(currentValue * 10) / 10,
    threshold,
    message,
    read: false,
  };

  const events = getAllAlertEvents();
  events.push(event);

  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    void putWorkspaceState("alertConfigs", "alert-events", { events }, getVersion(EVENTS_VERSION_KEY))
      .then((version) => setVersion(EVENTS_VERSION_KEY, version));
    console.log(`[Alert Event] ${type.toUpperCase()}: ${message}`);
  } catch (error) {
    console.error("[Alert Event] Failed to save event:", error);
  }

  return event;
}

/**
 * Get all alert events
 */
export function getAllAlertEvents(): AlertEvent[] {
  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("[Alert Event] Failed to load events:", error);
    return [];
  }
}

/**
 * Get unread alert events
 */
export function getUnreadAlertEvents(): AlertEvent[] {
  return getAllAlertEvents().filter((e) => !e.read);
}

/**
 * Mark alert event as read
 */
export function markAlertEventAsRead(id: string): AlertEvent | null {
  const events = getAllAlertEvents();
  const event = events.find((e) => e.id === id);

  if (!event) return null;

  event.read = true;

  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    void putWorkspaceState("alertConfigs", "alert-events", { events }, getVersion(EVENTS_VERSION_KEY))
      .then((version) => setVersion(EVENTS_VERSION_KEY, version));
  } catch (error) {
    console.error("[Alert Event] Failed to update event:", error);
  }

  return event;
}

/**
 * Mark all alert events as read
 */
export function markAllAlertEventsAsRead(): void {
  const events = getAllAlertEvents();
  events.forEach((e) => (e.read = true));

  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    void putWorkspaceState("alertConfigs", "alert-events", { events }, getVersion(EVENTS_VERSION_KEY))
      .then((version) => setVersion(EVENTS_VERSION_KEY, version));
    console.log("[Alert Event] Marked all events as read");
  } catch (error) {
    console.error("[Alert Event] Failed to update events:", error);
  }
}

/**
 * Get alert events for a specific threshold
 */
export function getAlertEventsForThreshold(thresholdId: string): AlertEvent[] {
  return getAllAlertEvents().filter((e) => e.thresholdId === thresholdId);
}

/**
 * Get alert events within a date range
 */
export function getAlertEventsByDateRange(startDate: Date, endDate: Date): AlertEvent[] {
  return getAllAlertEvents().filter((e) => {
    const eventDate = new Date(e.timestamp);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

/**
 * Delete an alert event
 */
export function deleteAlertEvent(id: string): boolean {
  const events = getAllAlertEvents();
  const filtered = events.filter((e) => e.id !== id);

  if (filtered.length === events.length) return false;

  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("[Alert Event] Failed to delete event:", error);
  }

  return true;
}

/**
 * Clear all alert events (for testing)
 */
export function clearAllAlertEvents(): void {
  localStorage.removeItem(EVENTS_KEY);
  console.log("[Alert Event] Cleared all alert events");
}

/**
 * Clear all thresholds (for testing)
 */
export function clearAllThresholds(): void {
  localStorage.removeItem(THRESHOLDS_KEY);
  console.log("[Alert] Cleared all thresholds");
}
