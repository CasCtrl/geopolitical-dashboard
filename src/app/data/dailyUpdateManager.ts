/**
 * Daily Update Manager
 * Handles daily updates to risk snapshot scores
 * Stores last update timestamp and manages update logic
 */

export interface UpdateStatus {
  lastUpdated: string; // ISO timestamp
  needsUpdate: boolean;
  updatedAt: Date;
}

const STORAGE_KEY = 'geopolitical_risk_last_update';
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if daily update is needed based on last update timestamp
 */
export function checkIfUpdateNeeded(): boolean {
  const lastUpdateStr = localStorage.getItem(STORAGE_KEY);
  
  if (!lastUpdateStr) {
    // First time ever - needs update
    return true;
  }

  try {
    const lastUpdate = new Date(lastUpdateStr);
    const now = new Date();
    const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
    
    // Update needed if more than 24 hours have passed
    return timeSinceUpdate >= UPDATE_INTERVAL_MS;
  } catch {
    // If stored value is invalid, force update
    return true;
  }
}

/**
 * Get the current update status
 */
export function getUpdateStatus(): UpdateStatus {
  const lastUpdateStr = localStorage.getItem(STORAGE_KEY);
  const needsUpdate = checkIfUpdateNeeded();
  
  return {
    lastUpdated: lastUpdateStr || 'Never',
    needsUpdate,
    updatedAt: lastUpdateStr ? new Date(lastUpdateStr) : new Date(0),
  };
}

/**
 * Record that an update has been performed
 * Call this after successfully updating risk snapshot data
 */
export function recordUpdate(): void {
  const now = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, now);
  console.log(`[Daily Update] Risk snapshot updated at ${now}`);
}

/**
 * Simulate risk snapshot update
 * In a real application, this would fetch fresh data from an API
 * and update the baseRiskData with current geopolitical conditions
 */
export function simulateRiskSnapshotUpdate(): {
  success: boolean;
  message: string;
  timestamp: string;
} {
  try {
    // In production, this would:
    // 1. Fetch latest risk data from external APIs
    // 2. Update baseRiskData with fresh scores
    // 3. Recalculate all portfolio risks
    
    // For now, we simulate with console logging
    const timestamp = new Date().toISOString();
    console.log(`[Daily Update Simulation] Fetching latest geopolitical risk data...`);
    console.log(`[Daily Update Simulation] Updated risk scores for all countries`);
    console.log(`[Daily Update Simulation] Refresh timestamp: ${timestamp}`);
    
    // Record the update
    recordUpdate();
    
    return {
      success: true,
      message: 'Risk snapshot successfully updated with latest data',
      timestamp,
    };
  } catch (error) {
    console.error('[Daily Update] Failed to update risk snapshot:', error);
    return {
      success: false,
      message: `Failed to update risk snapshot: ${error}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Initialize daily update check on app startup
 * Returns true if update was performed, false otherwise
 */
export async function initializeDailyUpdate(): Promise<boolean> {
  try {
    const needsUpdate = checkIfUpdateNeeded();
    
    if (needsUpdate) {
      console.log('[Daily Update] Starting daily update of risk scores...');
      const result = simulateRiskSnapshotUpdate();
      console.log('[Daily Update] Result:', result);
      return result.success;
    } else {
      const status = getUpdateStatus();
      console.log(`[Daily Update] No update needed. Last updated: ${status.lastUpdated}`);
      return false;
    }
  } catch (error) {
    console.error('[Daily Update] Initialization failed:', error);
    return false;
  }
}

/**
 * Force immediate update (for manual refresh or testing)
 */
export async function forceUpdate(): Promise<boolean> {
  console.log('[Daily Update] Force update requested');
  const result = simulateRiskSnapshotUpdate();
  return result.success;
}

/**
 * Reset update timestamp (for testing)
 */
export function resetUpdateTimestamp(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('[Daily Update] Update timestamp reset');
}

/**
 * Get formatted string of time until next update
 */
export function getTimeUntilNextUpdate(): string {
  const status = getUpdateStatus();
  
  if (status.needsUpdate) {
    return 'Update available now';
  }
  
  const now = new Date();
  const nextUpdate = new Date(status.updatedAt.getTime() + UPDATE_INTERVAL_MS);
  const timeRemaining = nextUpdate.getTime() - now.getTime();
  
  const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
  
  return `Next update in ${hours}h ${minutes}m`;
}
