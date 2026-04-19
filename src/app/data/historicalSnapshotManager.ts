/**
 * Historical Snapshot Manager
 * Stores and retrieves historical risk snapshots for trend analysis
 * Supports querying trends by country, date range, and sector
 */

import { CountryRisk } from "./countryRiskData";

export interface RiskSnapshot {
  datasetId?: string; // Dataset identifier for dataset-scoped trends
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

export interface SeedHistoryPoint {
  date: string; // YYYY-MM-DD
  portfolioRisk: number;
  averageCountryRisk?: number;
  riskOffset?: number;
}

const STORAGE_KEY = "geopolitical_risk_snapshots";
const MAX_SNAPSHOTS = 5000; // Keep enough history for multiple datasets

/**
 * Store a new risk snapshot
 */
export function recordSnapshot(
  countryRisks: { [country: string]: CountryRisk },
  portfolioRisk: number,
  exposureByRegion: { [region: string]: number },
  topRiskCountries: { country: string; risk: number }[],
  datasetId: string = "default"
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
    datasetId,
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
    console.log(`[Snapshot] Recorded risk snapshot at ${timestamp} for dataset ${datasetId}`);
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
    const snapshots = JSON.parse(stored) as Array<Omit<RiskSnapshot, 'date'>>;
    // Parse date strings back to Date objects
    return snapshots.map((s) => ({
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
  endDate: Date,
  datasetId?: string
): RiskSnapshot[] {
  const snapshots = getAllSnapshots().filter((s) => (datasetId ? s.datasetId === datasetId : true));
  return snapshots.filter(
    (s) => s.date >= startDate && s.date <= endDate
  );
}

/**
 * Get the latest snapshot
 */
export function getLatestSnapshot(datasetId?: string): RiskSnapshot | null {
  const snapshots = getAllSnapshots().filter((s) => (datasetId ? s.datasetId === datasetId : true));
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/**
 * Get the previous snapshot (for comparison)
 */
export function getPreviousSnapshot(
  currentSnapshot?: RiskSnapshot,
  datasetId?: string
): RiskSnapshot | null {
  const snapshots = getAllSnapshots().filter((s) => (datasetId ? s.datasetId === datasetId : true));
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
  days: number = 30,
  datasetId?: string
): CountryTrend | null {
  const snapshots = getAllSnapshots().filter((s) => (datasetId ? s.datasetId === datasetId : true));
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
export function getPortfolioRiskTrend(days: number = 30, datasetId?: string): TrendDataPoint[] {
  const snapshots = getAllSnapshots().filter((s) => (datasetId ? s.datasetId === datasetId : true));
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
 * Ensures each dataset has at least targetDays of historical snapshots
 */
export function initializeHistoricalData(
  baseCountries: string[],
  baseRiskData: { [country: string]: number },
  datasetId: string = "default",
  targetDays: number = 90,
  basePortfolioRisk?: number,
  baseExposureByRegion?: { [region: string]: number },
  baseTopRiskCountries?: { country: string; risk: number }[],
  seedPoints?: SeedHistoryPoint[]
): void {
  try {
    const allSnapshots = getAllSnapshots();
    const datasetSnapshots = allSnapshots
      .filter((snapshot) => snapshot.datasetId === datasetId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (datasetSnapshots.length >= targetDays) {
      console.log(`[Snapshot] Dataset ${datasetId} already has ${datasetSnapshots.length} snapshots`);
      return;
    }

    console.log(`[Snapshot] Initializing historical snapshot data for dataset ${datasetId}...`);
    const seededSnapshots: RiskSnapshot[] = [];
    const existingDateKeys = new Set(datasetSnapshots.map((snapshot) => snapshot.timestamp.slice(0, 10)));

    const normalizedSeedPoints = (seedPoints || [])
      .filter((point) => point && typeof point.date === "string")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-targetDays);

    normalizedSeedPoints.forEach((point) => {
      const dateKey = point.date;
      if (!dateKey || existingDateKeys.has(dateKey)) {
        return;
      }

      const riskOffset = Number.isFinite(point.riskOffset) ? Number(point.riskOffset) : 0;
      const countryRisks: { [country: string]: CountryRisk } = {};

      baseCountries.forEach((country) => {
        const baseRisk = baseRiskData[country] || 50;
        const adjustedRisk = Math.max(0, Math.min(100, baseRisk + riskOffset + (Math.random() - 0.5) * 4));
        countryRisks[country] = {
          political: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 1.5)),
          economic: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 1.5)),
          conflict: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 1.5)),
          corruption: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 1.5)),
          terrorism: Math.max(0, Math.min(10, (adjustedRisk / 100) * 10 + (Math.random() - 0.5) * 1.5)),
        };
      });

      const allRisks = Object.values(countryRisks).map((cr) => {
        return (cr.political + cr.economic + cr.conflict + cr.corruption + cr.terrorism) / 5;
      });
      const calculatedAverageCountryRisk =
        allRisks.length > 0 ? allRisks.reduce((a, b) => a + b) / allRisks.length : 0;

      const snapshotDate = new Date(`${dateKey}T12:00:00.000Z`);
      const portfolioRisk = Math.max(0, Math.min(100, Number(point.portfolioRisk) || (basePortfolioRisk || 50)));
      const averageCountryRisk =
        typeof point.averageCountryRisk === "number"
          ? Math.max(0, Math.min(100, point.averageCountryRisk))
          : calculatedAverageCountryRisk;

      const exposureByRegion: { [region: string]: number } =
        baseExposureByRegion && Object.keys(baseExposureByRegion).length > 0
          ? Object.fromEntries(
              Object.entries(baseExposureByRegion).map(([region, value]) => [
                region,
                Math.max(0, Number((value * (0.9 + Math.random() * 0.2)).toFixed(2))),
              ])
            )
          : {
              Americas: Math.random() * 30,
              Europe: Math.random() * 25,
              Asia: Math.random() * 30,
              "Middle East": Math.random() * 20,
              Africa: Math.random() * 15,
            };

      seededSnapshots.push({
        datasetId,
        timestamp: snapshotDate.toISOString(),
        date: snapshotDate,
        countryRisks,
        portfolioRisk,
        averageCountryRisk,
        exposureByRegion,
        topRiskCountries:
          baseTopRiskCountries && baseTopRiskCountries.length > 0
            ? baseTopRiskCountries
                .map((entry) => ({
                  country: entry.country,
                  risk: Math.max(0, Math.min(100, Math.round(entry.risk + riskOffset))),
                }))
                .sort((a, b) => b.risk - a.risk)
                .slice(0, 5)
            : baseCountries
                .map((country) => ({
                  country,
                  risk: Math.max(0, Math.min(100, Math.round((baseRiskData[country] || 50) + riskOffset))),
                }))
                .sort((a, b) => b.risk - a.risk)
                .slice(0, 5),
      });

      existingDateKeys.add(dateKey);
    });

    const snapshotsNeeded = Math.max(0, targetDays - (datasetSnapshots.length + seededSnapshots.length));
    const now = new Date();
    const earliestSeedDate = seededSnapshots.length > 0 ? seededSnapshots[0].date : null;
    const anchorDate = datasetSnapshots.length > 0 ? datasetSnapshots[0].date : earliestSeedDate || now;

    for (let i = snapshotsNeeded; i >= 1; i--) {
      const snapshotDate = new Date(anchorDate);
      snapshotDate.setDate(snapshotDate.getDate() - i);
      snapshotDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      // Create country risks with natural variations from base data
      const countryRisks: { [country: string]: CountryRisk } = {};
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

      const baselinePortfolioRisk =
        typeof basePortfolioRisk === "number"
          ? basePortfolioRisk
          : Math.round(totalRisk / Math.max(1, baseCountries.length));
      const portfolioRisk = Math.max(
        0,
        Math.min(100, Math.round(baselinePortfolioRisk + (Math.random() - 0.5) * 10))
      );

      // Calculate average country risk
      const allRisks = Object.values(countryRisks).map((cr) => {
        return (cr.political + cr.economic + cr.conflict + cr.corruption + cr.terrorism) / 5;
      });
      const averageCountryRisk =
        allRisks.length > 0 ? allRisks.reduce((a, b) => a + b) / allRisks.length : 0;

      const exposureByRegion: { [region: string]: number } =
        baseExposureByRegion && Object.keys(baseExposureByRegion).length > 0
          ? Object.fromEntries(
              Object.entries(baseExposureByRegion).map(([region, value]) => [
                region,
                Math.max(0, Number((value * (0.85 + Math.random() * 0.3)).toFixed(2))),
              ])
            )
          : {
              Americas: Math.random() * 30,
              Europe: Math.random() * 25,
              Asia: Math.random() * 30,
              "Middle East": Math.random() * 20,
              Africa: Math.random() * 15,
            };

      // Create the snapshot
      const snapshot: RiskSnapshot = {
        datasetId,
        timestamp: snapshotDate.toISOString(),
        date: snapshotDate,
        countryRisks,
        portfolioRisk,
        averageCountryRisk,
        exposureByRegion,
        topRiskCountries:
          baseTopRiskCountries && baseTopRiskCountries.length > 0
            ? baseTopRiskCountries
                .map((entry) => ({
                  country: entry.country,
                  risk: Math.max(0, Math.min(100, Math.round(entry.risk + (Math.random() - 0.5) * 6))),
                }))
                .sort((a, b) => b.risk - a.risk)
                .slice(0, 5)
            : baseCountries
                .map((country) => ({
                  country,
                  risk: baseRiskData[country] || 50,
                }))
                .sort((a, b) => b.risk - a.risk)
                .slice(0, 5),
      };

      seededSnapshots.push(snapshot);
    }

    const mergedSnapshots = [...allSnapshots, ...seededSnapshots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const trimmedSnapshots =
      mergedSnapshots.length > MAX_SNAPSHOTS
        ? mergedSnapshots.slice(mergedSnapshots.length - MAX_SNAPSHOTS)
        : mergedSnapshots;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSnapshots));

    console.log(
      `[Snapshot] Initialized historical data for dataset ${datasetId} with ${snapshotsNeeded} seeded days (target ${targetDays})`
    );
  } catch (error) {
    console.error("[Snapshot] Failed to initialize historical data:", error);
  }
}
