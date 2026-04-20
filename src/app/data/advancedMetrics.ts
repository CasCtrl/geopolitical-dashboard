/**
 * Advanced Risk Metrics Module
 * Calculates institutional-grade risk metrics: Sharpe, VaR, Drawdown, Sortino
 */

import { TrendDataPoint } from "./historicalSnapshotManager";

export interface RiskMetrics {
  sharpeRatio: number;
  valueAtRisk95: number; // 95% VaR (1-day)
  conditionalVaR95: number; // CVaR (Expected Shortfall)
  maxDrawdown: number; // Maximum drawdown %
  sortinoRatio: number; // Risk-adjusted return (downside deviation)
  volatility: number; // Standard deviation
  downsideDeviation: number; // Downside deviation
  skewness: number; // Distribution skewness
  kurtosis: number; // Distribution kurtosis (tail risk)
}

export interface AttributionAnalysis {
  byRiskFactor: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  };
  byCountry: Array<{
    country: string;
    contribution: number;
    percentOfTotal: number;
  }>;
  topContributors: Array<{
    name: string;
    contribution: number;
    type: "country" | "factor";
  }>;
}

export interface BenchmarkComparison {
  portfolioRisk: number;
  benchmarkRisk: number;
  percentile: number; // 0-100, where 50 = median
  riskDeviation: number; // Absolute difference
  percentileDescription: string; // "Top 10%", "Below Average", etc.
  recommendation: string;
}

/**
 * Calculate Sharpe Ratio
 * Formula: (Portfolio Return - Risk-Free Rate) / Portfolio Volatility
 * Using risk scores as proxy for returns; risk-free rate = 2%
 */
export function calculateSharpeRatio(
  trendData: TrendDataPoint[],
  riskFreeRate: number = 2.0
): number {
  if (trendData.length < 2) return 0;

  // Calculate average "return" (inverse of risk score)
  // Lower risk score = "better return"
  const values = trendData.map((d) => 100 - d.value); // Invert: lower risk = higher "return"
  const avgReturn = values.reduce((a, b) => a + b) / values.length;

  // Calculate volatility (standard deviation)
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) /
    values.length;
  const volatility = Math.sqrt(variance);

  if (volatility === 0) return 0;

  return (avgReturn - riskFreeRate) / volatility;
}

/**
 * Calculate Value at Risk (VaR) at 95% confidence level
 * Using historical simulation method
 */
export function calculateValueAtRisk(
  trendData: TrendDataPoint[],
  confidenceLevel: number = 0.95
): number {
  if (trendData.length < 2) return 0;

  // Get daily changes in risk score
  const changes: number[] = [];
  for (let i = 1; i < trendData.length; i++) {
    changes.push(trendData[i].value - trendData[i - 1].value);
  }

  // Sort changes (worst first)
  changes.sort((a, b) => a - b);

  // VaR at confidence level = worst case at (1-confidence) percentile
  const index = Math.ceil((1 - confidenceLevel) * changes.length) - 1;
  const var95 = Math.abs(changes[Math.max(0, index)]);

  return Math.round(var95 * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate Conditional Value at Risk (CVaR / Expected Shortfall)
 * Average of worst (1-confidence) scenarios
 */
export function calculateConditionalValueAtRisk(
  trendData: TrendDataPoint[],
  confidenceLevel: number = 0.95
): number {
  if (trendData.length < 2) return 0;

  const changes: number[] = [];
  for (let i = 1; i < trendData.length; i++) {
    changes.push(trendData[i].value - trendData[i - 1].value);
  }

  changes.sort((a, b) => a - b);

  const tailSize = Math.ceil((1 - confidenceLevel) * changes.length);
  const worstCases = changes.slice(0, tailSize);

  const cvar =
    worstCases.reduce((sum, val) => sum + Math.abs(val), 0) / worstCases.length;
  return Math.round(cvar * 100) / 100;
}

/**
 * Calculate Maximum Drawdown
 * Largest peak-to-trough decline
 */
export function calculateMaxDrawdown(trendData: TrendDataPoint[]): number {
  if (trendData.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = trendData[0].value;

  for (let i = 1; i < trendData.length; i++) {
    const currentValue = trendData[i].value;

    if (currentValue > peak) {
      peak = currentValue;
    }

    const drawdown = ((peak - currentValue) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return Math.round(maxDrawdown * 100) / 100;
}

/**
 * Calculate Volatility (Standard Deviation)
 */
export function calculateVolatility(trendData: TrendDataPoint[]): number {
  if (trendData.length < 2) return 0;

  const values = trendData.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b) / values.length;

  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  return Math.round(stdDev * 100) / 100;
}

/**
 * Calculate Downside Deviation (for Sortino Ratio)
 * Only considers downside volatility (when return < target)
 */
export function calculateDownsideDeviation(
  trendData: TrendDataPoint[],
  targetReturn: number = 0
): number {
  if (trendData.length < 2) return 0;

  const values = trendData.map((d) => 100 - d.value); // Invert for "returns"
  const downsideValues = values
    .filter((val) => val < targetReturn)
    .map((val) => Math.pow(val - targetReturn, 2));

  if (downsideValues.length === 0) return 0;

  const variance = downsideValues.reduce((a, b) => a + b) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate Sortino Ratio
 * Like Sharpe but only penalizes downside volatility
 */
export function calculateSortinoRatio(
  trendData: TrendDataPoint[],
  riskFreeRate: number = 2.0,
  targetReturn: number = 0
): number {
  if (trendData.length < 2) return 0;

  const values = trendData.map((d) => 100 - d.value);
  const avgReturn = values.reduce((a, b) => a + b) / values.length;
  const downsideDeviation = calculateDownsideDeviation(trendData, targetReturn);

  if (downsideDeviation === 0) return 0;

  return (avgReturn - riskFreeRate) / downsideDeviation;
}

/**
 * Calculate Skewness (distribution asymmetry)
 */
export function calculateSkewness(trendData: TrendDataPoint[]): number {
  if (trendData.length < 3) return 0;

  const values = trendData.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b) / values.length;
  const n = values.length;

  const sumCubed = values.reduce((sum, val) => sum + Math.pow(val - mean, 3), 0);
  const sumSquared = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);

  const stdDev = Math.sqrt(sumSquared / n);

  if (stdDev === 0) return 0;

  return (sumCubed / n) / Math.pow(stdDev, 3);
}

/**
 * Calculate Kurtosis (tail risk / extreme events)
 */
export function calculateKurtosis(trendData: TrendDataPoint[]): number {
  if (trendData.length < 4) return 0;

  const values = trendData.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b) / values.length;
  const n = values.length;

  const sumFourth = values.reduce((sum, val) => sum + Math.pow(val - mean, 4), 0);
  const sumSquared = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);

  const variance = sumSquared / n;

  if (variance === 0) return 0;

  const kurtosis = (sumFourth / n) / Math.pow(variance, 2) - 3; // Excess kurtosis

  return Math.round(kurtosis * 100) / 100;
}

/**
 * Calculate all risk metrics at once
 */
export function calculateAllMetrics(trendData: TrendDataPoint[]): RiskMetrics {
  return {
    sharpeRatio: Math.round(calculateSharpeRatio(trendData) * 100) / 100,
    valueAtRisk95: calculateValueAtRisk(trendData, 0.95),
    conditionalVaR95: calculateConditionalValueAtRisk(trendData, 0.95),
    maxDrawdown: calculateMaxDrawdown(trendData),
    sortinoRatio: Math.round(calculateSortinoRatio(trendData) * 100) / 100,
    volatility: calculateVolatility(trendData),
    downsideDeviation: Math.round(calculateDownsideDeviation(trendData) * 100) / 100,
    skewness: Math.round(calculateSkewness(trendData) * 100) / 100,
    kurtosis: calculateKurtosis(trendData),
  };
}

/**
 * Analyze risk attribution by factor and country
 */
export function analyzeRiskAttribution(
  countryRisks: {
    [country: string]: {
      political?: number;
      economic?: number;
      conflict?: number;
      corruption?: number;
      terrorism?: number;
    };
  },
  weights: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  },
  portfolioExposures: Array<{ country: string; riskContribution: number }>
): AttributionAnalysis {
  const safeNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  // Calculate exposure-weighted factor contributions for the current portfolio.
  // This ensures attribution reflects what the user currently holds.
  let totalPolitical = 0,
    totalEconomic = 0,
    totalConflict = 0,
    totalCorruption = 0,
    totalTerrorism = 0;

  for (const exposure of portfolioExposures) {
    const country = exposure.country;
    const risk = countryRisks[country] || {};
    const exposureWeight = Math.max(0, safeNumber(exposure.riskContribution));

    totalPolitical += exposureWeight * safeNumber(risk.political) * safeNumber(weights.political);
    totalEconomic += exposureWeight * safeNumber(risk.economic) * safeNumber(weights.economic);
    totalConflict += exposureWeight * safeNumber(risk.conflict) * safeNumber(weights.conflict);
    totalCorruption += exposureWeight * safeNumber(risk.corruption) * safeNumber(weights.corruption);
    totalTerrorism += exposureWeight * safeNumber(risk.terrorism) * safeNumber(weights.terrorism);
  }

  const totalRiskRaw =
    totalPolitical +
    totalEconomic +
    totalConflict +
    totalCorruption +
    totalTerrorism;
  const totalRisk = totalRiskRaw > 0 ? totalRiskRaw : 0;

  const toPercent = (part: number, total: number): number => {
    if (total <= 0) return 0;
    return Math.round((part / total) * 100);
  };

  const byRiskFactor = {
    political: toPercent(totalPolitical, totalRisk),
    economic: toPercent(totalEconomic, totalRisk),
    conflict: toPercent(totalConflict, totalRisk),
    corruption: toPercent(totalCorruption, totalRisk),
    terrorism: toPercent(totalTerrorism, totalRisk),
  };

  // Calculate country contributions
  const totalCountryContribution = portfolioExposures.reduce(
    (sum, exposure) => sum + Math.max(0, safeNumber(exposure.riskContribution)),
    0
  );

  const byCountry = portfolioExposures
    .map((exposure) => ({
      country: exposure.country,
      contribution: Math.round(safeNumber(exposure.riskContribution) * 100) / 100,
      percentOfTotal: toPercent(safeNumber(exposure.riskContribution), totalCountryContribution),
    }))
    .sort((a, b) => b.contribution - a.contribution);

  // Top contributors overall
  const topContributors = [
    { name: "Political Risk", contribution: totalPolitical, type: "factor" as const },
    { name: "Economic Risk", contribution: totalEconomic, type: "factor" as const },
    { name: "Conflict Risk", contribution: totalConflict, type: "factor" as const },
    { name: "Corruption Risk", contribution: totalCorruption, type: "factor" as const },
    { name: "Terrorism Risk", contribution: totalTerrorism, type: "factor" as const },
    ...byCountry
      .slice(0, 5)
      .map((c) => ({ name: c.country, contribution: c.contribution, type: "country" as const })),
  ]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 10);

  return {
    byRiskFactor,
    byCountry,
    topContributors,
  };
}

/**
 * Compare portfolio risk to benchmark
 * Benchmark = average risk of S&P 500 equivalent
 */
export function compareToBenchmark(
  portfolioRisk: number,
  benchmarkRisk: number = 35 // S&P 500 average geopolitical risk (assumed)
): BenchmarkComparison {
  const riskDifference = portfolioRisk - benchmarkRisk;
  const percentile = Math.min(100, Math.max(0, 50 + riskDifference));

  let percentileDescription = "Average";
  if (percentile > 75) percentileDescription = "Top 25% (High Risk)";
  else if (percentile > 60) percentileDescription = "Above Average";
  else if (percentile < 25) percentileDescription = "Bottom 25% (Low Risk)";
  else if (percentile < 40) percentileDescription = "Below Average";

  let recommendation = "Portfolio risk is well-managed.";
  if (portfolioRisk > benchmarkRisk * 1.2) {
    recommendation =
      "Portfolio risk exceeds benchmark by 20%+. Consider rebalancing to reduce exposure.";
  } else if (portfolioRisk < benchmarkRisk * 0.8) {
    recommendation = "Portfolio risk is significantly below benchmark. Opportunity for higher returns.";
  }

  return {
    portfolioRisk: Math.round(portfolioRisk),
    benchmarkRisk,
    percentile,
    riskDeviation: Math.round((riskDifference + Number.EPSILON) * 100) / 100,
    percentileDescription,
    recommendation,
  };
}
