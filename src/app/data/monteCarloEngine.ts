/**
 * Monte Carlo Simulation Engine
 * Generates thousands of possible portfolio risk scenarios based on historical volatility
 */

import { TrendDataPoint } from './historicalSnapshotManager';

export interface MonteCarloPath {
  pathId: number;
  steps: number[];
  endingRisk: number;
  percentile: number;
}

export interface MonteCarloResults {
  numPaths: number;
  currentRisk: number;
  meanEndingRisk: number;
  medianEndingRisk: number;
  stdDeviation: number;
  var95: number;
  cvar95: number;
  minRisk: number;
  maxRisk: number;
  worstCase: number;
  bestCase: number;
  riskIncreaseProbability: number; // % of paths where risk increases
  criticalRiskProbability: number; // % of paths where risk > 70
  paths?: MonteCarloPath[];
}

/**
 * Calculate volatility from trend data
 */
function calculateVolatilityFromTrends(trendData: TrendDataPoint[]): number {
  if (trendData.length < 2) return 2.0; // Default volatility

  const returns: number[] = [];
  for (let i = 1; i < trendData.length; i++) {
    const change = trendData[i].value - trendData[i - 1].value;
    const returnPct = (change / Math.max(1, trendData[i - 1].value)) * 100;
    returns.push(returnPct);
  }

  if (returns.length === 0) return 2.0;

  const mean = returns.reduce((a, b) => a + b) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2)) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize if using daily data (assume 252 trading days)
  return stdDev * Math.sqrt(252);
}

/**
 * Generate a single Monte Carlo path (daily steps)
 */
function generateMonteCarloPath(
  currentRisk: number,
  annualVolatility: number,
  days: number = 30
): number[] {
  const path: number[] = [currentRisk];
  const dailyVolatility = annualVolatility / Math.sqrt(252);
  const driftRate = 0.0001; // Small positive drift

  for (let i = 1; i < days; i++) {
    // Random normal variable (Box-Muller transform for better distribution)
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Log-normal process: dR = drift*R*dt + volatility*R*dW
    const previousRisk = path[i - 1];
    const change = driftRate * previousRisk + dailyVolatility * previousRisk * z;
    let newRisk = previousRisk + change;

    // Constrain risk between 0 and 100
    newRisk = Math.max(0, Math.min(100, newRisk));

    path.push(newRisk);
  }

  return path;
}

/**
 * Run Monte Carlo simulation
 */
export function runMonteCarloSimulation(
  currentRisk: number,
  trendData: TrendDataPoint[],
  numPaths: number = 10000,
  days: number = 30,
  includePaths: boolean = false
): MonteCarloResults {
  const volatility = calculateVolatilityFromTrends(trendData);
  
  // Generate all paths
  const paths: MonteCarloPath[] = [];
  const endingRisks: number[] = [];

  for (let i = 0; i < numPaths; i++) {
    const path = generateMonteCarloPath(currentRisk, volatility, days);
    const endingRisk = path[path.length - 1];
    endingRisks.push(endingRisk);

    if (includePaths) {
      // Calculate percentile for this path's ending risk
      const percentile = (endingRisks.filter((r) => r <= endingRisk).length / endingRisks.length) * 100;

      paths.push({
        pathId: i,
        steps: path,
        endingRisk,
        percentile,
      });
    }
  }

  // Calculate statistics
  endingRisks.sort((a, b) => a - b);

  const meanEndingRisk = endingRisks.reduce((a, b) => a + b) / numPaths;
  const medianEndingRisk = endingRisks[Math.floor(numPaths * 0.5)];
  const variance = endingRisks.reduce((sum, risk) => sum + Math.pow(risk - meanEndingRisk, 2)) / numPaths;
  const stdDeviation = Math.sqrt(variance);

  // VaR and CVaR
  const var95Index = Math.floor(numPaths * 0.95);
  const var95 = endingRisks[var95Index];
  const cvar95 = endingRisks.slice(var95Index).reduce((a, b) => a + b) / (numPaths - var95Index);

  // Probabilities
  const riskIncreaseProbability = (endingRisks.filter((r) => r > currentRisk).length / numPaths) * 100;
  const criticalRiskProbability = (endingRisks.filter((r) => r > 70).length / numPaths) * 100;

  return {
    numPaths,
    currentRisk: Math.round(currentRisk * 10) / 10,
    meanEndingRisk: Math.round(meanEndingRisk * 10) / 10,
    medianEndingRisk: Math.round(medianEndingRisk * 10) / 10,
    stdDeviation: Math.round(stdDeviation * 10) / 10,
    var95: Math.round(var95 * 10) / 10,
    cvar95: Math.round(cvar95 * 10) / 10,
    minRisk: Math.round(endingRisks[0] * 10) / 10,
    maxRisk: Math.round(endingRisks[numPaths - 1] * 10) / 10,
    worstCase: Math.round(endingRisks[numPaths - 1] * 10) / 10,
    bestCase: Math.round(endingRisks[0] * 10) / 10,
    riskIncreaseProbability: Math.round(riskIncreaseProbability * 10) / 10,
    criticalRiskProbability: Math.round(criticalRiskProbability * 10) / 10,
    paths: includePaths ? paths : undefined,
  };
}

/**
 * Get risk distribution histogram data
 */
export function getRiskDistribution(
  results: MonteCarloResults,
  bins: number = 20
): Array<{ range: string; count: number; percentage: number }> {
  if (!results.paths || results.paths.length === 0) {
    return [];
  }

  const min = Math.floor(results.minRisk / 5) * 5;
  const max = Math.ceil(results.maxRisk / 5) * 5;
  const binSize = (max - min) / bins;

  const histogram: number[] = new Array(bins).fill(0);

  results.paths.forEach((path) => {
    const binIndex = Math.floor((path.endingRisk - min) / binSize);
    if (binIndex >= 0 && binIndex < bins) {
      histogram[binIndex]++;
    }
  });

  return histogram.map((count, idx) => ({
    range: `${Math.round(min + idx * binSize)}-${Math.round(min + (idx + 1) * binSize)}`,
    count,
    percentage: Math.round((count / results.paths!.length) * 100 * 10) / 10,
  }));
}

/**
 * Get percentile distribution
 */
export function getPercentileDistribution(results: MonteCarloResults): {
  percentile: number;
  risk: number;
}[] {
  if (!results.paths || results.paths.length === 0) {
    return [];
  }

  const sorted = results.paths.map((p) => p.endingRisk).sort((a, b) => a - b);
  const percentiles = [5, 10, 25, 50, 75, 90, 95, 99];

  return percentiles.map((p) => ({
    percentile: p,
    risk: Math.round(sorted[Math.floor((p / 100) * sorted.length)] * 10) / 10,
  }));
}

/**
 * Compare two simulations (e.g., before and after portfolio adjustment)
 */
export function compareSimulations(
  baseline: MonteCarloResults,
  adjusted: MonteCarloResults
): {
  riskReduction: number;
  volatilityChange: number;
  var95Improvement: number;
  criticalRiskReduction: number;
  recommendation: string;
} {
  const riskReduction = baseline.meanEndingRisk - adjusted.meanEndingRisk;
  const volatilityChange = adjusted.stdDeviation - baseline.stdDeviation;
  const var95Improvement = baseline.var95 - adjusted.var95;
  const criticalRiskReduction = baseline.criticalRiskProbability - adjusted.criticalRiskProbability;

  let recommendation = 'No significant change detected.';

  if (riskReduction > 5) {
    recommendation = `✓ Excellent improvement: Mean risk reduced by ${riskReduction.toFixed(1)} points.`;
  } else if (riskReduction > 2) {
    recommendation = `Good improvement: Mean risk reduced by ${riskReduction.toFixed(1)} points.`;
  } else if (riskReduction < -2) {
    recommendation = `⚠ Warning: Mean risk increased by ${Math.abs(riskReduction).toFixed(1)} points.`;
  }

  if (criticalRiskReduction > 5) {
    recommendation += ` Critical risk probability reduced by ${criticalRiskReduction.toFixed(1)}%.`;
  }

  return {
    riskReduction: Math.round(riskReduction * 10) / 10,
    volatilityChange: Math.round(volatilityChange * 10) / 10,
    var95Improvement: Math.round(var95Improvement * 10) / 10,
    criticalRiskReduction: Math.round(criticalRiskReduction * 10) / 10,
    recommendation,
  };
}
