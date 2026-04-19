/**
 * Correlation Analysis Engine
 * Analyzes which countries' risk factors move together
 */

export interface CorrelationMatrix {
  countries: string[];
  matrix: number[][];
  pairs: Array<{
    country1: string;
    country2: string;
    correlation: number;
    strength: 'very strong' | 'strong' | 'moderate' | 'weak' | 'none';
  }>;
}

export interface RegionCorrelations {
  region: string;
  internalCorrelation: number; // Avg correlation within region
  toOtherRegions: { region: string; correlation: number }[];
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculatePearsonCorrelation(series1: number[], series2: number[]): number {
  if (series1.length !== series2.length || series1.length < 2) return 0;

  const mean1 = series1.reduce((a, b) => a + b) / series1.length;
  const mean2 = series2.reduce((a, b) => a + b) / series2.length;

  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;

  for (let i = 0; i < series1.length; i++) {
    const diff1 = series1[i] - mean1;
    const diff2 = series2[i] - mean2;

    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }

  const stdDev1 = Math.sqrt(variance1);
  const stdDev2 = Math.sqrt(variance2);

  if (stdDev1 === 0 || stdDev2 === 0) return 0;

  return covariance / (stdDev1 * stdDev2);
}

/**
 * Get strength descriptor for correlation value
 */
function getCorrelationStrength(
  value: number
): 'very strong' | 'strong' | 'moderate' | 'weak' | 'none' {
  const abs = Math.abs(value);
  if (abs >= 0.8) return 'very strong';
  if (abs >= 0.6) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'none';
}

/**
 * Build correlation matrix from country risk time series
 */
export function buildCorrelationMatrix(
  countryData: { [country: string]: number[] }
): CorrelationMatrix {
  const countries = Object.keys(countryData).sort();
  const n = countries.length;

  // Initialize matrix
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  // Calculate correlations
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const corr = calculatePearsonCorrelation(countryData[countries[i]], countryData[countries[j]]);
        matrix[i][j] = Math.round(corr * 1000) / 1000;
        matrix[j][i] = matrix[i][j];
      }
    }
  }

  // Build pairs list (only strong correlations)
  const pairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const corr = matrix[i][j];
      if (Math.abs(corr) >= 0.2) {
        pairs.push({
          country1: countries[i],
          country2: countries[j],
          correlation: corr,
          strength: getCorrelationStrength(corr),
        });
      }
    }
  }

  // Sort by strength
  pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return { countries, matrix, pairs };
}

/**
 * Map country to region
 */
function getRegion(country: string): string {
  const regionMap: { [key: string]: string } = {
    'United States': 'Americas',
    Canada: 'Americas',
    Mexico: 'Americas',
    Brazil: 'Americas',
    Argentina: 'Americas',
    Chile: 'Americas',
    China: 'Asia',
    India: 'Asia',
    Japan: 'Asia',
    'South Korea': 'Asia',
    Taiwan: 'Asia',
    Singapore: 'Asia',
    Vietnam: 'Asia',
    Thailand: 'Asia',
    Indonesia: 'Asia',
    Malaysia: 'Asia',
    Philippines: 'Asia',
    Germany: 'Europe',
    France: 'Europe',
    'United Kingdom': 'Europe',
    Italy: 'Europe',
    Spain: 'Europe',
    Netherlands: 'Europe',
    Belgium: 'Europe',
    Poland: 'Europe',
    Russia: 'Europe',
    'Saudi Arabia': 'Middle East',
    'United Arab Emirates': 'Middle East',
    Israel: 'Middle East',
    Iran: 'Middle East',
    Iraq: 'Middle East',
    'South Africa': 'Africa',
    Nigeria: 'Africa',
    Kenya: 'Africa',
    Egypt: 'Africa',
    Morocco: 'Africa',
    Ethiopia: 'Africa',
    Australia: 'Oceania',
    'New Zealand': 'Oceania',
  };

  return regionMap[country] || 'Other';
}

/**
 * Analyze correlations by region
 */
export function analyzeRegionalCorrelations(
  correlationMatrix: CorrelationMatrix
): RegionCorrelations[] {
  const regionMap: { [region: string]: number[] } = {};
  const regionCountries: { [region: string]: string[] } = {};

  // Group countries by region
  correlationMatrix.countries.forEach((country, idx) => {
    const region = getRegion(country);
    if (!regionMap[region]) {
      regionMap[region] = [];
      regionCountries[region] = [];
    }
    regionMap[region].push(idx);
    regionCountries[region].push(country);
  });

  const results: RegionCorrelations[] = [];

  // Calculate internal correlations
  for (const region in regionMap) {
    const indices = regionMap[region];

    // Internal correlation (average within region)
    let internalSum = 0;
    let internalCount = 0;

    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        internalSum += Math.abs(correlationMatrix.matrix[indices[i]][indices[j]]);
        internalCount++;
      }
    }

    const internalCorrelation = internalCount > 0 ? internalSum / internalCount : 0;

    // Cross-region correlations
    const toOtherRegions: { region: string; correlation: number }[] = [];

    for (const otherRegion in regionMap) {
      if (otherRegion !== region) {
        const otherIndices = regionMap[otherRegion];
        let crossSum = 0;
        let crossCount = 0;

        for (const i of indices) {
          for (const j of otherIndices) {
            crossSum += Math.abs(correlationMatrix.matrix[i][j]);
            crossCount++;
          }
        }

        toOtherRegions.push({
          region: otherRegion,
          correlation: Math.round((crossSum / crossCount) * 1000) / 1000,
        });
      }
    }

    toOtherRegions.sort((a, b) => b.correlation - a.correlation);

    results.push({
      region,
      internalCorrelation: Math.round(internalCorrelation * 1000) / 1000,
      toOtherRegions,
    });
  }

  results.sort((a, b) => b.internalCorrelation - a.internalCorrelation);
  return results;
}

/**
 * Identify diversification opportunities
 */
export function findDiversificationOpportunities(
  correlationMatrix: CorrelationMatrix,
  currentHoldings: string[]
): Array<{
  country: string;
  avgCorrelation: number;
  benefit: string;
}> {
  const opportunities: Array<{
    country: string;
    avgCorrelation: number;
    benefit: string;
  }> = [];

  for (const candidate of correlationMatrix.countries) {
    if (currentHoldings.includes(candidate)) continue;

    let totalCorr = 0;
    for (const holding of currentHoldings) {
      const holdingIdx = correlationMatrix.countries.indexOf(holding);
      const candidateIdx = correlationMatrix.countries.indexOf(candidate);
      totalCorr += Math.abs(correlationMatrix.matrix[holdingIdx][candidateIdx]);
    }

    const avgCorr = totalCorr / currentHoldings.length;

    let benefit = 'Low correlation - Excellent diversifier';
    if (avgCorr > 0.4) benefit = 'Moderate correlation - Good diversifier';
    if (avgCorr > 0.6) benefit = 'High correlation - Limited diversification benefit';

    opportunities.push({
      country: candidate,
      avgCorrelation: Math.round(avgCorr * 1000) / 1000,
      benefit,
    });
  }

  opportunities.sort((a, b) => a.avgCorrelation - b.avgCorrelation);
  return opportunities.slice(0, 10);
}

/**
 * Risk contribution analysis considering correlations
 */
export function analyzeRiskWithCorrelations(
  countryRisks: { [country: string]: number },
  weights: { [country: string]: number },
  correlationMatrix: CorrelationMatrix
): {
  diversificationRatio: number;
  effectiveDiversification: number;
  riskConcentration: number;
  recommendation: string;
} {
  const countries = correlationMatrix.countries.filter((c) => c in weights);

  if (countries.length === 0) {
    return {
      diversificationRatio: 0,
      effectiveDiversification: 0,
      riskConcentration: 0,
      recommendation: 'No data available',
    };
  }

  // Calculate weighted average risk (without correlation)
  let weightedRisk = 0;
  let totalWeight = 0;
  for (const country of countries) {
    const risk = countryRisks[country] || 50;
    const weight = weights[country] || 0;
    weightedRisk += risk * weight;
    totalWeight += weight;
  }
  const simpleWeightedRisk = totalWeight > 0 ? weightedRisk / totalWeight : 50;

  // Calculate portfolio variance considering correlations
  let portfolioVariance = 0;
  for (let i = 0; i < countries.length; i++) {
    for (let j = 0; j < countries.length; j++) {
      const risk_i = countryRisks[countries[i]] || 50;
      const risk_j = countryRisks[countries[j]] || 50;
      const weight_i = weights[countries[i]] || 0;
      const weight_j = weights[countries[j]] || 0;

      const iIdx = correlationMatrix.countries.indexOf(countries[i]);
      const jIdx = correlationMatrix.countries.indexOf(countries[j]);
      const corr = iIdx >= 0 && jIdx >= 0 ? correlationMatrix.matrix[iIdx][jIdx] : 1;

      portfolioVariance += weight_i * weight_j * risk_i * risk_j * corr;
    }
  }

  const portfolioRisk = Math.sqrt(Math.abs(portfolioVariance));
  const diversificationRatio = simpleWeightedRisk / Math.max(0.1, portfolioRisk);
  const effectiveDiversification = ((diversificationRatio - 1) / diversificationRatio) * 100;

  // Calculate concentration
  const concentration = Math.max(...countries.map((c) => weights[c] || 0)) * 100;

  let recommendation = 'Portfolio is well-diversified.';
  if (diversificationRatio < 1.2) {
    recommendation = '⚠ Low diversification benefit. Consider adding uncorrelated assets.';
  } else if (diversificationRatio > 1.5) {
    recommendation = '✓ Excellent diversification. Correlations are working in your favor.';
  }

  if (concentration > 40) {
    recommendation += ' ⚠ High concentration risk detected.';
  }

  return {
    diversificationRatio: Math.round(diversificationRatio * 100) / 100,
    effectiveDiversification: Math.round(effectiveDiversification * 10) / 10,
    riskConcentration: Math.round(concentration * 10) / 10,
    recommendation,
  };
}
