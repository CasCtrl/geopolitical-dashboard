/**
 * Historical Snapshot Manager
 * Stores and retrieves historical risk snapshots for trend analysis
 * Supports querying trends by country, date range, and sector
 */

import { Asset, PortfolioExposure } from "./portfolioData";
import { CountryRisk } from "./countryRiskData";

export interface RiskSnapshot {
  timestamp: string; // ISO date string
  date: Date; // Parsed date
  countryRisks: { [country: string]: CountryRisk };
  portfolioRisk: number; // 0-100
  averageCountryRisk: number; // 0-100
  exposureByRegion: { [region: string]: number };
  topRiskCountries: { country: string; risk: number }[];
}

export interface TrendDataPoint {
  timestamp: string;
  value: number;
  change?: number; // Change from previous point
}

export interface CountryTrend {
  country: string;
  dataPoints: TrendDataPoint[];
  averageRisk: number;
  highestRisk: number;
  lowestRisk: number;
  trend: "improving" | "declining" | "stable";
}

const STORAGE_KEY = "geopolitical_risk_snapshots";
const MAX_SNAPSHOTS = 365; // Keep 1 year of daily snapshots

/**
 * Store a new risk snapshot
 */
export function recordSnapshot(
  countryRisks: { [country: string]: CountryRisk },
  portfolioRisk: number,
  exposureByRegion: { [region: string]: number },
  topRiskCountries: { country: string; risk: number }[]
): RiskSnapshot {
  const timestamp = new Date().toISOString();
  const snapshots = getAllSnapshots();

  // Calculate average country risk
  const allRisks = Object.values(countryRisks).map((cr) => {
    return (cr.political + cr.economic + cr.conflict + cr.corruption + cr.terrorism) / 5;
  });
  const averageCountryRisk =
    allRisks.length > 0 ? allRisks.reduce((a, b) => a + b) / allRisks.length : 0;

  const snapshot: RiskSnapshot = {
    timestamp,
    date: new Date(timestamp),
    countryRisks,
    portfolioRisk,
    averageCountryRisk,
    exposureByRegion,
    topRiskCountries,
  };

  // Add to snapshots and maintain max size
  snapshots.push(snapshot);
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.shift(); // Remove oldest snapshot
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    console.log(`[Snapshot] Recorded risk snapshot at ${timestamp}`);
  } catch (error) {
    console.error("[Snapshot] Failed to save snapshot:", error);
  }

  return snapshot;
}

/**
 * Get all stored snapshots
 */
export function getAllSnapshots(): RiskSnapshot[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const snapshots = JSON.parse(stored);
    // Parse date strings back to Date objects
    return snapshots.map((s: any) => ({
      ...s,
      date: new Date(s.timestamp),
    }));
  } catch (error) {
    console.error("[Snapshot] Failed to load snapshots:", error);
    return [];
  }
}

/**
 * Get snapshots within a date range
 */
export function getSnapshotsByDateRange(
  startDate: Date,
  endDate: Date
): RiskSnapshot[] {
  const snapshots = getAllSnapshots();
  return snapshots.filter(
    (s) => s.date >= startDate && s.date <= endDate
  );
}

/**
 * Get the latest snapshot
 */
export function getLatestSnapshot(): RiskSnapshot | null {
  const snapshots = getAllSnapshots();
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/**
 * Get the previous snapshot (for comparison)
 */
export function getPreviousSnapshot(
  currentSnapshot?: RiskSnapshot
): RiskSnapshot | null {
  const snapshots = getAllSnapshots();
  if (snapshots.length < 2) return null;

  if (!currentSnapshot) {
    return snapshots[snapshots.length - 2];
  }

  const currentIndex = snapshots.findIndex(
    (s) => s.timestamp === currentSnapshot.timestamp
  );
  return currentIndex > 0 ? snapshots[currentIndex - 1] : null;
}

/**
 * Calculate trend for a specific country
 */
export function getCountryTrend(
  country: string,
  days: number = 30
): CountryTrend | null {
  const snapshots = getAllSnapshots();
  if (snapshots.length === 0) return null;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const relevantSnapshots = snapshots.filter(
    (s) => s.date >= startDate && s.countryRisks[country]
  );

  if (relevantSnapshots.length === 0) return null;

  const dataPoints: TrendDataPoint[] = relevantSnapshots.map((snapshot, idx) => {
    const countryRisk = snapshot.countryRisks[country];
    const value =
      (countryRisk.political +
        countryRisk.economic +
        countryRisk.conflict +
        countryRisk.corruption +
        countryRisk.terrorism) /
      5;

    let change: number | undefined;
    if (idx > 0) {
      const prevCountryRisk = relevantSnapshots[idx - 1].countryRisks[country];
      const prevValue =
        (prevCountryRisk.political +
          prevCountryRisk.economic +
          prevCountryRisk.conflict +
          prevCountryRisk.corruption +
          prevCountryRisk.terrorism) /
        5;
      change = value - prevValue;
    }

    return {
      timestamp: snapshot.timestamp,
      value: Math.round(value),
      change,
    };
  });

  const values = dataPoints.map((dp) => dp.value);
  const averageRisk = Math.round(values.reduce((a, b) => a + b) / values.length);
  const highestRisk = Math.max(...values);
  const lowestRisk = Math.min(...values);

  // Determine trend
  let trend: "improving" | "declining" | "stable" = "stable";
  if (dataPoints.length >= 3) {
    const recentChanges = dataPoints.slice(-3).map((dp) => dp.change || 0);
    const avgChange = recentChanges.reduce((a, b) => a + b) / recentChanges.length;
    if (avgChange > 2) trend = "declining";
    else if (avgChange < -2) trend = "improving";
  }

  return {
    country,
    dataPoints,
    averageRisk,
    highestRisk,
    lowestRisk,
    trend,
  };
}

/**
 * Get portfolio risk trend
 */
export function getPortfolioRiskTrend(days: number = 30): TrendDataPoint[] {
  const snapshots = getAllSnapshots();
  if (snapshots.length === 0) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return snapshots
    .filter((s) => s.date >= startDate)
    .map((snapshot, idx) => {
      let change: number | undefined;
      if (idx > 0) {
        const prevSnapshot = snapshots.filter((s) => s.date >= startDate)[idx - 1];
        change = snapshot.portfolioRisk - prevSnapshot.portfolioRisk;
      }

      return {
        timestamp: snapshot.timestamp,
        value: Math.round(snapshot.portfolioRisk),
        change,
      };
    });
}

/**
 * Compare two snapshots
 */
export function compareSnapshots(
  snapshot1: RiskSnapshot,
  snapshot2: RiskSnapshot
): {
  countries: {
    country: string;
    change: number;
    direction: "up" | "down" | "stable";
  }[];
  portfolioRiskChange: number;
  date1: string;
  date2: string;
} {
  const countries: {
    country: string;
    change: number;
    direction: "up" | "down" | "stable";
  }[] = [];

  for (const country in snapshot1.countryRisks) {
    if (snapshot2.countryRisks[country]) {
      const risk1 = snapshot1.countryRisks[country];
      const risk2 = snapshot2.countryRisks[country];

      const avg1 =
        (risk1.political +
          risk1.economic +
          risk1.conflict +
          risk1.corruption +
          risk1.terrorism) /
        5;
      const avg2 =
        (risk2.political +
          risk2.economic +
          risk2.conflict +
          risk2.corruption +
          risk2.terrorism) /
        5;

      const change = avg2 - avg1;
      let direction: "up" | "down" | "stable" = "stable";
      if (change > 2) direction = "up";
      else if (change < -2) direction = "down";

      if (Math.abs(change) > 0.5) {
        countries.push({
          country,
          change: Math.round(change * 10) / 10,
          direction,
        });
      }
    }
  }

  // Sort by magnitude of change
  countries.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return {
    countries,
    portfolioRiskChange: Math.round((snapshot2.portfolioRisk - snapshot1.portfolioRisk) * 10) / 10,
    date1: snapshot1.timestamp,
    date2: snapshot2.timestamp,
  };
}

/**
 * Clear all stored snapshots (for testing)
 */
export function clearAllSnapshots(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log("[Snapshot] Cleared all historical snapshots");
}

/**
 * Initialize historical snapshot data for trends
 * Generates 7-9 days of sample data with realistic variations
 * Only creates data if there are fewer than 3 snapshots
 */
export function initializeHistoricalData(
  baseCountries: string[],
  baseRiskData: { [country: string]: number }
): void {
  try {
    const existingSnapshots = getAllSnapshots();
    
    // Only initialize if we have very few or no snapshots
    if (existingSnapshots.length > 2) {
      console.log("[Snapshot] Historical data already exists, skipping initialization");
      return;
    }

    console.log("[Snapshot] Initializing historical snapshot data...");

    // Generate 7-9 days of data
    const numDays = 8; // Generate 8 days of data
    const now = new Date();

    for (let i = numDays - 1; i >= 0; i--) {
      const snapshotDate = new Date(now);
      snapshotDate.setDate(snapshotDate.getDate() - i);
      snapshotDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      // Create country risks with natural variations from base data
      const countryRisks: { [country: string]: any } = {};
      let totalRisk = 0;

      baseCountries.forEach((country) => {
        const baseRisk = baseRiskData[country] || 50;
        // Add day-to-day variation (±10%) and random fluctuations in subcategories
        const variation = (Math.random() - 0.5) * 20;
        const adjustedRisk = Math.max(0, Math.min(100, baseRisk + variation));

        countryRisks[country] = {
          political: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 2)),
          economic: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 2)),
          conflict: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 2)),
          corruption: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 2)),
          terrorism: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 2)),
        };
        totalRisk += adjustedRisk;
      });

      const portfolioRisk = Math.round(totalRisk / baseCountries.length);

      // Calculate average country risk
      const allRisks = Object.values(countryRisks).map((cr) => {
        return (cr.political + cr.economic + cr.conflict + cr.corruption + cr.terrorism) / 5;
      });
      const averageCountryRisk =
        allRisks.length > 0 ? allRisks.reduce((a, b) => a + b) / allRisks.length : 0;

      // Generate region exposures
      const exposureByRegion: { [region: string]: number } = {
        Americas: Math.random() * 30,
        Europe: Math.random() * 25,
        Asia: Math.random() * 30,
        "Middle East": Math.random() * 20,
        Africa: Math.random() * 15,
      };

      // Create the snapshot
      const snapshot: RiskSnapshot = {
        timestamp: snapshotDate.toISOString(),
        date: snapshotDate,
        countryRisks,
        portfolioRisk,
        averageCountryRisk,
        exposureByRegion,
        topRiskCountries: baseCountries
          .map((country) => ({
            country,
            risk: baseRiskData[country] || 50,
          }))
          .sort((a, b) => b.risk - a.risk)
          .slice(0, 5),
      };

      // Store in localStorage
      const allSnapshots = getAllSnapshots();
      allSnapshots.push(snapshot);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSnapshots));
    }

    console.log(`[Snapshot] Initialized historical data with ${numDays} days of snapshots`);
  } catch (error) {
    console.error("[Snapshot] Failed to initialize historical data:", error);
  }
}
